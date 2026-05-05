import type { Page } from "@playwright/test";

const FLAT_PRICE = 50000;

// One week of 1-minute candles at a flat price — deterministic, no movement
const deterministicCandles = Array.from({ length: 500 }, (_, i) => [
  Date.now() - (500 - i) * 60_000, // openTime
  FLAT_PRICE.toString(),            // open
  FLAT_PRICE.toString(),            // high
  FLAT_PRICE.toString(),            // low
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
  await page.route("**/api.binance.com/api/v3/klines**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: candlesResponse })
  );
  await page.route("**/api.binance.com/api/v3/ticker/price**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: priceTickerResponse })
  );
}
