import type { Page } from "@playwright/test";

export const FLAT_PRICE = 50000;

// ~8.3 hours of 1-minute candles pinned at FLAT_PRICE. The 1-cent high/low
// spread matters: candles with high === low === open trip the degraded-data
// detector in src/lib/binance-api.ts (>50% flat → random-walk fallback), which
// would silently discard this payload. Open/close stay exactly at FLAT_PRICE
// so every tick still lands on it.
const deterministicCandles = Array.from({ length: 500 }, (_, i) => [
  Date.now() - (500 - i) * 60_000, // openTime
  FLAT_PRICE.toString(),            // open
  (FLAT_PRICE + 0.01).toString(),   // high
  (FLAT_PRICE - 0.01).toString(),   // low
  FLAT_PRICE.toString(),            // close
  "100",                            // volume
  Date.now() - (499 - i) * 60_000, // closeTime
  "5000000",                        // quoteAssetVolume
  100,                              // numberOfTrades
  "50",                             // takerBuyBaseAssetVolume
  "2500000",                        // takerBuyQuoteAssetVolume
  "0",                              // ignore
]);

const priceTickerResponse = JSON.stringify({ symbol: "BTCUSDT", price: FLAT_PRICE.toString() });
const candlesResponse = JSON.stringify(deterministicCandles);

export async function mockBinanceCandles(page: Page) {
  // In the browser the app fetches through its own proxy
  // (`${origin}/api/binance/api/v3/...`, see src/lib/binance-api.ts), so the
  // patterns must match the path suffix, not the api.binance.com host.
  await page.route("**/api/v3/klines**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: candlesResponse })
  );
  await page.route("**/api/v3/ticker/price**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: priceTickerResponse })
  );
}
