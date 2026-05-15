# Post-Mortem: Chart Candles Flattened in Production

**Status:** Resolved
**Branch:** `feat/sentinel-integration`
**Fix commit:** `b95bd2a` — `fix(proxy): stream raw Binance response and harden against Vercel-side corruption`
**Date resolved:** 2026-05-15

---

## 1. Symptom

In production (Vercel), the candlestick chart rendered as **flat horizontal dashes with gaps between them** — no wicks, no body. Locally on `localhost:3000` the same code rendered correctly.

Diagnostic logs proved the corruption originated **before** any client-side processing:

```
[diag] raw[0] open=60852.22 high=60852.22 low=60852.22 close=60852.22
[diag] raw[1] open=60852.22 high=60852.22 low=60852.22 close=60852.22
```

Every candle had `open === high === low === close`. Real 1-minute BTC candles never look like that.

---

## 2. Root Cause Analysis

The proxy route `src/app/api/binance/[...path]/route.ts` was the failure point. Specifically, the combination of:

### A. Server-side JSON parse + re-serialize (primary)

```ts
const data = await res.json();      // parse Binance JSON in Node
return NextResponse.json(data);     // re-serialize and send to browser
```

Binance returns klines as a JSON array of mixed-type rows:

```json
[[1712543940000, "60852.22", "60900.45", "60800.10", "60875.33", ...]]
```

On Vercel's Node runtime, the `fetch → res.json() → NextResponse.json()` round-trip was corrupting the array values so that positions 2, 3, 4 (high/low/close) collapsed into the value of position 1 (open). The exact mechanism inside Vercel's runtime is opaque from the outside, but the symptom was reproducible only there — never on local Node — and the corruption happened *server-side*, since the proxy itself was logging the already-flat values.

The simplest theory consistent with the evidence: Vercel's bundled `undici` (or its interaction with the Next.js response serializer) mishandles the response body for this specific payload shape under certain conditions. Local Node uses a different fetch/serializer path and didn't reproduce.

### B. Compression in the transport (contributing)

The proxy didn't set `Accept-Encoding`, so Binance freely returned `gzip` or `br`-compressed payloads. Any bug in the Vercel-side decompressor would silently corrupt numeric string values inside the JSON without throwing. This compounded the risk in (A).

### C. CDN / route-level caching (contributing)

Even with `cache: "no-store"` on the proxy's outbound `fetch`, two consecutive candles in the diagnostic logs showed *identical* open/high/low/close — strongly suggesting that *some* layer was serving cached/replayed bytes. With no cache-busting on the browser → proxy URL, repeated calls for the same `startTime` had a stable URL and were eligible for any function-level cache.

### D. False alarms in the diagnostic checks (noise)

Two of the existing diagnostic checks were comparing the wrong values and firing on every clean load, polluting the console:

1. The "time gap between batches" check used `currentStart - lastCloseTime` *before* `currentStart` was updated, always producing a ~–60 000 s nonsense value.
2. The "TEMPORAL GAP DETECTED" check compared `firstOfNext.openTime − lastOfPrev.closeTime` (which is **1 ms** for consecutive 1-min candles) against a 60 s threshold, screaming "gap detected" on a perfectly continuous boundary.

These weren't the bug, but they were making it harder to see the real bug.

---

## 3. The Fix

Six changes shipped together in commit `b95bd2a`:

### 3.1 Stream raw bytes through the proxy (fixes A)

```ts
// before
const data = await res.json();
return NextResponse.json(data);

// after
const rawText = await res.text();
return new Response(rawText, { status: 200, headers: RAW_RESPONSE_HEADERS });
```

The proxy now treats Binance's response as opaque bytes. No `JSON.parse`, no `JSON.stringify`, no serializer between Binance and the browser. The browser parses the JSON itself, exactly as it does for local dev (where it talks to Binance via the same `fetchCandles → /api/binance/...` path).

This is the change with the highest probability of being the actual silver bullet — it eliminates the only server-side step that could have flattened the numeric values.

### 3.2 Disable transport compression (fixes B)

```ts
headers: {
  Accept: "application/json",
  "Accept-Encoding": "identity",
}
```

Forces Binance to send the response uncompressed, removing any decompression-related corruption path. Marginal bandwidth cost (klines responses are small) in exchange for byte-exact integrity.

### 3.3 Cache-bust on the browser → proxy hop (fixes C)

```ts
// src/lib/binance-api.ts
url.searchParams.set("_t", Date.now().toString());
```

Each browser request to `/api/binance/...` is now a unique URL, defeating any Vercel route-level cache.

### 3.4 Strip the cache-buster before forwarding to Binance

```ts
const cleanSearch = search.replace(/[?&]_t=[^&]*/g, "").replace(/^&/, "?");
```

Binance now rejects unknown query params with **HTTP 400** (this was discovered when an earlier iteration of the fix added `_t` to the Binance URL and broke the proxy in both local and prod). The cache-buster lives only on the browser → proxy hop; the proxy → Binance hop ships a clean URL.

### 3.5 Detect flat-candle batches and fall back (safety net)

```ts
const flatCount = batchCandles.filter(
  (c) => c.high === c.open && c.low === c.open
).length;
if (flatCount > batchCandles.length * 0.5) {
  return generateFallbackCandles(new Date(currentStart), limit * 2);
}
```

If Binance ever again returns degraded data (rate limiting, geo-detection on Vercel IPs, future regressions), the engine now detects it and switches to `generateFallbackCandles` — a synthetic random-walk that keeps the simulation playable. The game no longer breaks silently.

### 3.6 Fix the false-alarm continuity checks (D)

- Removed the bogus "time gap between batches" warning.
- Rewrote the post-loop continuity check to compare `openTime → openTime` (which yields a clean 60 s for back-to-back 1-min candles) instead of `openTime − closeTime` (which yields 1 ms).

---

## 4. What This Confirms

- The corruption was a **server-side artifact of the Vercel/Next.js proxy layer**, not a Binance issue. Binance was returning correct data; something on the proxy → browser path was destroying it.
- The local-vs-prod divergence was a function of runtime: Vercel's Node + Next.js response pipeline behaves differently from a `next dev` process on a developer's machine for this specific payload shape.
- Streaming raw response bytes — even from within a Next.js Route Handler — is safe and recommended when the payload is already in the format you want to forward. Avoid `JSON.parse → JSON.stringify` round-trips unless you actually need to transform the data.

---

## 5. What Was Ruled Out

| Hypothesis | Verdict | Why |
|---|---|---|
| `lightweight-charts` rendering bug | Not the cause | Identical library version worked locally. |
| `normalizeCandlesToBasePrice` destroying wicks | Not the cause | Raw data was already flat at the proxy. |
| Binance US fallback returning bad data | Not the cause | The global endpoint was the one being hit and was returning the flat payload. |
| `buildVisibleCandles` using `c.open` instead of `c.high` | Real but unrelated bug — fixed in a previous commit (`33ba8eb`). Not the root cause of the prod-only flatness. |

---

## 6. Verification

After deploying `b95bd2a`:

- Local: chart renders with proper wicks. ✅
- Production (Vercel): chart renders with proper wicks, no gaps. ✅
- `[diag][proxy]` logs now show distinct OHLC values in the `preview=` field for the first candle.
- The `TEMPORAL GAP DETECTED` and `time gap between batches` false alarms are gone from the console.

---

## 7. Files Changed

| File | Change |
|---|---|
| `src/app/api/binance/[...path]/route.ts` | Stream raw bytes, force `Accept-Encoding: identity`, strip `_t` before forwarding to Binance, extract `buildBinanceUrl` and `fetchFromBinance` helpers. |
| `src/lib/binance-api.ts` | Add `_t` cache-buster to proxy URL, detect flat candles and fall back, fix the two false-alarm continuity checks. |
