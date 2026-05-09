import { NextRequest, NextResponse } from "next/server";

const BINANCE_BASE = "https://api.binance.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = path.join("/");
  const search = request.nextUrl.search;
  const url = `${BINANCE_BASE}/${endpoint}${search}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 2 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=10" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Proxy fetch failed", detail: String(err) },
      { status: 502 }
    );
  }
}
