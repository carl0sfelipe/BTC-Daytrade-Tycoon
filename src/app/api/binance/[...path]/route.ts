import { NextRequest, NextResponse } from "next/server";

const BINANCE_BASE = "https://api.binance.com";
const BINANCE_US_BASE = "https://api.binance.us";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = path.join("/");
  const search = request.nextUrl.search;

  // Try global Binance first
  const globalUrl = `${BINANCE_BASE}/${endpoint}${search}`;
  const ts = Date.now();
  try {
    const res = await fetch(globalUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 2 },
    });

    if (res.ok) {
      const data = await res.json();
      const len = Array.isArray(data) ? data.length : "object";
      console.log(`[diag][proxy] OK ${res.status} ${endpoint} → ${len} items (${Date.now() - ts}ms)`);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=10" },
      });
    }

    // If 451 (geo-blocked), try Binance US as fallback
    if (res.status === 451) {
      console.warn(`[diag][proxy] 451 geo-blocked, trying Binance US for ${endpoint}`);
      const usUrl = `${BINANCE_US_BASE}/${endpoint}${search}`;
      const usRes = await fetch(usUrl, {
        headers: { Accept: "application/json" },
        next: { revalidate: 2 },
      });

      if (usRes.ok) {
        const data = await usRes.json();
        const len = Array.isArray(data) ? data.length : "object";
        console.log(`[diag][proxy] US OK ${usRes.status} ${endpoint} → ${len} items (${Date.now() - ts}ms)`);
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=10" },
        });
      }

      console.error(`[diag][proxy] US also failed for ${endpoint}: ${usRes.status}`);
      return NextResponse.json(
        { error: "Binance API unavailable (geo-blocked). Both global and US endpoints returned errors.", status: 451 },
        { status: 503 }
      );
    }

    console.warn(`[diag][proxy] ${res.status} for ${endpoint} (${Date.now() - ts}ms)`);
    return NextResponse.json(
      { error: `Binance returned ${res.status}` },
      { status: res.status }
    );
  } catch (err) {
    console.error(`[diag][proxy] EXCEPTION ${endpoint}: ${String(err)} (${Date.now() - ts}ms)`);
    return NextResponse.json(
      { error: "Proxy fetch failed", detail: String(err) },
      { status: 502 }
    );
  }
}
