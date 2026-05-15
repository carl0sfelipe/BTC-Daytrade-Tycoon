# BTC Daytrade Tycoon — Bug Report: Chart Candles Flattened in Production

## Project Overview

**BTC Daytrade Tycoon** is a Bitcoin day-trading simulator game built with:
- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Zustand** (state management)
- **lightweight-charts** (TradingView chart library)
- **Vitest** + React Testing Library (testing)
- Deployed on **Vercel**

The app simulates historical BTC price data by fetching real candles from the Binance API, normalizing them to current price levels, and replaying them tick-by-tick so users can practice trading.

---

## The Bug

**Production (Vercel):** Chart candles appear as flat horizontal dashes with gaps between them. No wicks (high/low shadows). The chart looks broken and unreadable.

**Local (localhost:3000):** Chart renders perfectly with proper candlesticks, wicks, and no gaps.

---

## Root Cause Analysis

### Confirmed: Binance API returns corrupted data on Vercel

Diagnostic logs prove the raw data from Binance is already flat **before** any normalization:

```
[diag] raw[0] open=60852.22 high=60852.22 low=60852.22 close=60852.22
[diag] raw[1] open=60852.22 high=60852.22 low=60852.22 close=60852.22
[diag] raw[2] open=60864.66 high=60864.66 low=60864.66 close=60864.66
```

Every candle has `high === low === open === close`. The Binance API **never** returns data like this — real 1-minute BTC candles always have high/low spread.

Locally, the same proxy code returns correct data with proper high/low spread.

### What was ruled out

| Hypothesis | Status | Evidence |
|---|---|---|
| `buildVisibleCandles` using `c.open` instead of `c.high` | Fixed | Even with correct code, raw data is already flat |
| Next.js edge cache corrupting response | Attempted fix | `cache: "no-store"` + `runtime: "nodejs"` didn't help |
| `normalizeCandlesToBasePrice` destroying wicks | Ruled out | Logs show raw data is flat before normalization |
| Binance US fallback returning bad data | Ruled out | Global Binance returns the same flat data on Vercel |
| `lightweight-charts` rendering bug | Ruled out | Works fine locally with same library version |

---

## Key Files & Architecture

### Data Flow

```
Browser → /api/binance/[...path] (Next.js proxy) → https://api.binance.com/api/v3/klines
         ↓
    fetchCandles() — parses response, batches 2×1000 candles
         ↓
    normalizeCandlesToBasePrice() — scales to current BTC price
         ↓
    useTimewarpEngine — tick-by-tick simulation
         ↓
    buildVisibleCandles / buildCandleUpdate — prepares for chart
         ↓
    lightweight-charts — renders candlestick series
```

### Critical Files

| File | Purpose |
|---|---|
| `src/app/api/binance/[...path]/route.ts` | Next.js API proxy to Binance. **This is where corruption happens on Vercel.** |
| `src/lib/binance-api.ts` | `fetchCandles()`, `normalizeCandlesToBasePrice()`, `normalizeCandlesWithContinuity()` |
| `src/lib/chart/buildVisibleCandles.ts` | Builds visible candle array for chart. Historical candles use original high/low; current candle projects from open→currentPrice. |
| `src/lib/chart/buildCandleUpdate.ts` | Single-candle update for the forming candle. |
| `src/hooks/useTimewarpEngine.ts` | Main simulation hook — loads session, processes ticks, appends more candles. |
| `src/lib/engine/session-loader.ts` | Loads initial 2000 candles, normalizes, resets store. |
| `src/lib/engine/tick-processor.ts` | Pure tick logic — interpolates price, detects liquidation. |
| `src/components/trading/TradingChart.tsx` | Chart component wiring. |
| `src/hooks/chart/useCandleData.ts` | React hook that feeds candles to lightweight-charts. |

---

## What Was Already Tried (All Failed on Vercel)

1. **Fixed `buildVisibleCandles`** — Changed from `Math.max(c.open, currentPrice)` to `Math.max(c.high, currentPrice)` for historical candles. (This was correct but didn't solve the root cause.)

2. **Fixed look-ahead bias** — Ensured current candle only projects from `c.open` to `currentPrice`, not revealing future wicks.

3. **Disabled Next.js caching** — Added `cache: "no-store"`, removed `next: { revalidate: 2 }`, removed `Cache-Control` headers.

4. **Forced Node.js runtime** — Added `export const runtime = "nodejs"` to proxy route to avoid Vercel edge runtime.

5. **Added extensive diagnostic logging** — `diag` logger that works in production, logging raw candles, normalized candles, and render data.

**None of these fixed the issue.** The data is already corrupted when it arrives from `fetch()` on Vercel.

---

## Hypotheses for Remaining Investigation

### H1: Vercel `fetch()` strips or normalizes numeric precision

Vercel's Node.js environment may use a different `fetch()` implementation (undici vs native) that handles large numbers differently. Binance returns prices as **strings** in JSON arrays. The proxy parses them with `parseFloat()`. If Vercel's environment has different float precision or the response is being double-encoded/decoded, high/low could collapse to open.

**Test:** Log the raw JSON string before parsing in the proxy route.

### H2: Vercel response compression corrupts binary-like data

If Vercel applies gzip/brotli compression at the edge and the decompression has a bug with certain payload sizes, numeric fields could be corrupted.

**Test:** Add `Accept-Encoding: identity` header to force no compression.

### H3: Binance API rate-limiting or geo-detection on Vercel IPs

Vercel's serverless functions run from specific IP ranges that Binance may treat differently — possibly returning simplified/placeholder data for detected bot traffic.

**Test:** Call Binance API directly from a Vercel function with a different User-Agent, or use a different data source (CoinGecko, Kraken) as comparison.

### H4: Next.js App Router proxy intercepts and modifies response

The `[...path]/route.ts` pattern may interact with Next.js internals in a way that strips array element precision. The `await res.json()` on Vercel's Node runtime may behave differently than local.

**Test:** Return the raw `Response` directly from the proxy without `await res.json()` — let the browser parse it.

### H5: The `fetch` in the proxy is hitting a CDN-cached version

Even with `cache: "no-store"`, Vercel's edge network may have its own cache layer that's serving stale/corrupted responses.

**Test:** Add a random query parameter (`?_t=${Date.now()}`) to bust all caches, or use `fetch(url, { next: { revalidate: 0 } })`.

---

## Recommended Next Steps for Another AI

1. **Log raw JSON in proxy** — In `src/app/api/binance/[...path]/route.ts`, before `res.json()`, log `await res.text()` to see the exact bytes coming from Binance.

2. **Bypass JSON parsing in proxy** — Change the proxy to `return new Response(res.body, { headers: res.headers })` — stream the raw response directly to the browser without server-side parsing.

3. **Test with `Accept-Encoding: identity`** — Add this header to the proxy fetch to rule out compression issues.

4. **Add cache-busting query param** — Append `&_nocache=${Date.now()}` to the Binance URL in `fetchCandles()`.

5. **Compare with alternative API** — Temporarily swap Binance for Kraken or CoinGecko in the proxy to see if the issue is Binance-specific or affects all APIs on Vercel.

6. **Check Vercel function logs** — The Vercel dashboard shows serverless function logs. Look for any warnings about response size, encoding, or fetch errors.

---

## Repository

- **GitHub:** https://github.com/carl0sfelipe/BTC-Daytrade-Tycoon
- **Branch:** `feat/sentinel-integration`
- **Deploy URL pattern:** `https://btc-daytrade-tycoon-<hash>-carl0sfelipes-projects.vercel.app`

## How to Reproduce

1. Clone repo, `npm install`, `npm run dev` → chart works fine at `localhost:3000/trading`
2. Deploy same code to Vercel → chart shows flat candles with no wicks
3. Open browser console on Vercel, filter `[diag]` → see `raw[0] open=X high=X low=X close=X` proving data is flat at source

## Diagnostic Logs to Look For

```
[diag][proxy] first candle raw: open=... high=... low=... close=...
[diag] raw[0] open=... high=... low=... close=...
[diag] norm[0] open=... high=... low=... wickUp=...% wickDown=...%
[diag] buildVisibleCandles: idx=... lastCandle open=... high=... low=... close=...
```

If `raw[0]` shows `high === open`, the problem is in the proxy/Binance fetch.
If `raw[0]` shows proper spread but `norm[0]` is flat, the problem is in normalization.
If both are fine but chart is flat, the problem is in `buildVisibleCandles` or lightweight-charts.

**Current state:** `raw[0]` is flat on Vercel, correct locally. Problem is in the proxy fetch layer.
