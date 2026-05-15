import { NextRequest } from "next/server";

export const runtime = "nodejs";

const BINANCE_BASE = "https://api.binance.com";
const BINANCE_US_BASE = "https://api.binance.us";

const RAW_RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function buildBinanceUrl(base: string, endpoint: string, search: string): string {
  // Strip the client-side _t cache-buster — Binance rejects unknown query params with 400.
  // The _t was only ever needed to bust Vercel's route-level cache (browser → proxy hop),
  // not the proxy → Binance hop.
  const cleanSearch = search.replace(/[?&]_t=[^&]*/g, "").replace(/^&/, "?");
  return `${base}/${endpoint}${cleanSearch}`;
}

async function fetchFromBinance(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      // Disable compression — gzip/brotli decompression bugs on Vercel can flatten OHLC values
      "Accept-Encoding": "identity",
    },
    cache: "no-store",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = path.join("/");
  const search = request.nextUrl.search;
  const ts = Date.now();

  const globalUrl = buildBinanceUrl(BINANCE_BASE, endpoint, search);
  try {
    const res = await fetchFromBinance(globalUrl);

    if (res.ok) {
      // Return raw bytes directly — no JSON parse/re-serialize avoids any numeric corruption
      const rawText = await res.text();
      console.log(
        `[diag][proxy] OK ${res.status} ${endpoint} → ${rawText.length} bytes (${Date.now() - ts}ms) preview=${rawText.slice(0, 120)}`
      );
      return new Response(rawText, { status: 200, headers: RAW_RESPONSE_HEADERS });
    }

    // Geo-blocked — try Binance US
    if (res.status === 451) {
      console.warn(`[diag][proxy] 451 geo-blocked, trying Binance US for ${endpoint}`);
      const usUrl = buildBinanceUrl(BINANCE_US_BASE, endpoint, search);
      const usRes = await fetchFromBinance(usUrl);

      if (usRes.ok) {
        const rawText = await usRes.text();
        console.log(`[diag][proxy] US OK ${usRes.status} ${endpoint} → ${rawText.length} bytes (${Date.now() - ts}ms)`);
        return new Response(rawText, { status: 200, headers: RAW_RESPONSE_HEADERS });
      }

      console.error(`[diag][proxy] US also failed for ${endpoint}: ${usRes.status}`);
      return new Response(
        JSON.stringify({ error: "Binance API unavailable (geo-blocked). Both global and US endpoints returned errors.", status: 451 }),
        { status: 503, headers: RAW_RESPONSE_HEADERS }
      );
    }

    console.warn(`[diag][proxy] ${res.status} for ${endpoint} (${Date.now() - ts}ms)`);
    return new Response(
      JSON.stringify({ error: `Binance returned ${res.status}` }),
      { status: res.status, headers: RAW_RESPONSE_HEADERS }
    );
  } catch (err) {
    console.error(`[diag][proxy] EXCEPTION ${endpoint}: ${String(err)} (${Date.now() - ts}ms)`);
    return new Response(
      JSON.stringify({ error: "Proxy fetch failed", detail: String(err) }),
      { status: 502, headers: RAW_RESPONSE_HEADERS }
    );
  }
}
