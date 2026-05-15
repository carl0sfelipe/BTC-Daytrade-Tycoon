import { diag } from "@/lib/logger";

export interface BinanceCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface SimulatedCandle {
  time: number; // timestamp em segundos (Unix) para o lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BINANCE_API =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/binance/api/v3`
    : "https://api.binance.com/api/v3";

export async function fetchCurrentPrice(symbol = "BTCUSDT"): Promise<number> {
  const url = `${BINANCE_API}/ticker/price?symbol=${symbol}`;
  const response = await fetch(url);
  if (!response.ok) {
    // Fallback: return a realistic BTC price when API is unavailable
    console.warn(`[fetchCurrentPrice] Binance API error: ${response.status}. Using fallback price.`);
    return 65000 + Math.random() * 10000;
  }
  const data = await response.json();
  if (typeof data?.price !== "string") {
    throw new Error(`Invalid price data from Binance: ${JSON.stringify(data)}`);
  }
  const price = parseFloat(data.price);
  if (Number.isNaN(price) || price <= 0) {
    throw new Error(`Invalid price value from Binance: ${data.price}`);
  }
  return price;
}

export async function fetchCandles(
  startTime: Date,
  symbol = "BTCUSDT",
  interval = "1m",
  limit = 1000
): Promise<BinanceCandle[]> {
  const ts = Date.now();
  diag.log(`fetchCandles start: ${startTime.toISOString()} symbol=${symbol}`);

  // Fetch 2 batches of 1000 1min candles = ~2000 candles (~33h of data)
  const allCandles: BinanceCandle[] = [];
  let currentStart = startTime.getTime();

  for (let batch = 0; batch < 2; batch++) {
    const url = new URL(`${BINANCE_API}/klines`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("startTime", currentStart.toString());
    url.searchParams.set("limit", limit.toString());

    diag.log(`fetchCandles batch ${batch}: ${url.toString().slice(0, 120)}...`);
    const response = await fetch(url.toString());

    if (!response.ok) {
      diag.warn(`fetchCandles batch ${batch}: HTTP ${response.status} ${response.statusText}`);
      if (response.status === 451 || response.status === 503) {
        console.warn(`[fetchCandles] Binance API unavailable (${response.status}). Using generated fallback data.`);
        diag.warn(`Using fallback candles for batch ${batch}`);
        return generateFallbackCandles(new Date(currentStart), limit);
      }
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }

    const data: Array<(string | number)[]> = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      diag.log(`fetchCandles batch ${batch}: empty response, stopping`);
      break;
    }

    const batchCandles = data.map((c) => ({
      openTime: Number(c[0]),
      open: parseFloat(String(c[1])),
      high: parseFloat(String(c[2])),
      low: parseFloat(String(c[3])),
      close: parseFloat(String(c[4])),
      volume: parseFloat(String(c[5])),
      closeTime: Number(c[6]),
    }));

    allCandles.push(...batchCandles);
    const firstT = new Date(batchCandles[0].openTime).toISOString();
    const lastT = new Date(batchCandles[batchCandles.length - 1].closeTime).toISOString();
    diag.log(`fetchCandles batch ${batch}: ${batchCandles.length} candles, time ${firstT}→${lastT}, price ${batchCandles[0].open}-${batchCandles[batchCandles.length - 1].close}`);

    if (batchCandles.length < limit) {
      break; // No more data
    }

    // Next batch starts after the last candle
    const gapSec = (currentStart - batchCandles[batchCandles.length - 1].closeTime) / 1000;
    if (gapSec !== 1) {
      diag.warn(`fetchCandles: time gap between batches: ${gapSec}s (expected 1s)`);
    }
    currentStart = batchCandles[batchCandles.length - 1].closeTime + 1;
  }

  // Validate temporal continuity between batch 0 and batch 1
  if (allCandles.length >= 2) {
    const lastOfPrev = allCandles[Math.min(999, allCandles.length - 2)];
    const firstOfNext = allCandles[Math.min(1000, allCandles.length - 1)];
    const timeGapSec = (firstOfNext.openTime - lastOfPrev.closeTime) / 1000;
    const priceGap = firstOfNext.open - lastOfPrev.close;
    const priceGapPct = (priceGap / lastOfPrev.close * 100).toFixed(2);
    diag.log(`fetchCandles continuity check: timeGap=${timeGapSec}s, priceGap=${priceGap} (${priceGapPct}%)`);
    if (Math.abs(timeGapSec - 60) > 5) {
      diag.error(`fetchCandles: TEMPORAL GAP DETECTED between candles 999→1000: ${timeGapSec}s gap (expected ~60s)`);
    }
  }

  if (allCandles.length === 0) {
    diag.error("fetchCandles: no data returned, throwing");
    throw new Error("No candle data returned from Binance");
  }

  diag.log(`fetchCandles done: ${allCandles.length} total candles in ${Date.now() - ts}ms`);
  return allCandles;
}

/**
 * Converts historical candles into simulated candles with current base price.
 * Preserves percentage variations (returns) but adjusts price scale.
 */
export function normalizeCandlesToBasePrice(
  historicalCandles: BinanceCandle[],
  basePrice: number
): SimulatedCandle[] {
  if (historicalCandles.length === 0) return [];

  const firstOpen = historicalCandles[0].open;
  const firstTime = historicalCandles[0].openTime;
  const lastTime = historicalCandles[historicalCandles.length - 1].closeTime;
  const timeSpanMin = ((lastTime - firstTime) / 60000).toFixed(0);

  diag.log(
    `normalizeCandlesToBasePrice: ${historicalCandles.length} candles, basePrice=${basePrice}, firstOpen=${firstOpen}, timeSpan=${timeSpanMin}min`
  );

  const result = historicalCandles.map((c) => {
    // Escala proporcional ao primeiro candle
    const openPct = c.open / firstOpen;
    const highPct = c.high / firstOpen;
    const lowPct = c.low / firstOpen;
    const closePct = c.close / firstOpen;

    return {
      time: Math.floor(c.openTime / 1000),
      open: basePrice * openPct,
      high: basePrice * highPct,
      low: basePrice * lowPct,
      close: basePrice * closePct,
      volume: c.volume,
    };
  });

  diag.log(
    `normalizeCandlesToBasePrice: normalized range ${result[0].open.toFixed(2)}-${result[result.length - 1].close.toFixed(2)}, times ${result[0].time}-${result[result.length - 1].time}`
  );

  return result;
}

/**
 * Maximum acceptable gap between last existing candle and first new candle,
 * as a fraction of the last close price. Gaps larger than this trigger a
 * validation error (indicates corrupt/mismatched API data).
 */
export const MAX_CANDLE_GAP_RATIO = 0.15; // 15%

/**
 * Normalizes new historical candles to seamlessly continue from the last
 * existing simulated candle. Preserves percentage variations within the
 * new batch, but scales so that the first new open equals the last existing
 * close.
 *
 * @param newHistorical - Raw candles fetched from the API
 * @param lastExistingClose - Close price of the last candle already in simulation
 * @throws If the raw data gap exceeds MAX_CANDLE_GAP_RATIO
 */
export function normalizeCandlesWithContinuity(
  newHistorical: BinanceCandle[],
  lastExistingClose: number
): SimulatedCandle[] {
  if (newHistorical.length === 0) return [];
  if (lastExistingClose <= 0) {
    throw new Error(
      `Invalid lastExistingClose for continuity: ${lastExistingClose}`
    );
  }

  const firstOpen = newHistorical[0].open;
  const firstClose = newHistorical[0].close;
  const scale = lastExistingClose / firstOpen;

  diag.log(
    `normalizeCandlesWithContinuity: lastClose=${lastExistingClose}, firstNewOpen=${firstOpen}, firstNewClose=${firstClose}, scale=${scale.toFixed(6)}, count=${newHistorical.length}`
  );

  // Validate that the raw data isn't wildly different (corrupt/mismatched batch)
  const rawGapRatio = Math.abs(firstOpen - firstClose) / firstOpen;
  if (rawGapRatio > MAX_CANDLE_GAP_RATIO) {
    diag.error(
      `normalizeCandlesWithContinuity: gap too large ${(rawGapRatio * 100).toFixed(1)}%`
    );
    throw new Error(
      `Candle gap too large: raw first candle open=${firstOpen} close=${firstClose} ` +
        `(gap ${(rawGapRatio * 100).toFixed(1)}% > max ${(MAX_CANDLE_GAP_RATIO * 100).toFixed(0)}%). ` +
        `Possible corrupt API data or mismatched timeframe.`
    );
  }

  const result = newHistorical.map((c) => ({
    time: Math.floor(c.openTime / 1000),
    open: c.open * scale,
    high: c.high * scale,
    low: c.low * scale,
    close: c.close * scale,
    volume: c.volume,
  }));

  diag.log(
    `normalizeCandlesWithContinuity: scaled range ${result[0].open.toFixed(2)}-${result[result.length - 1].close.toFixed(2)}, times ${result[0].time}-${result[result.length - 1].time}`
  );

  return result;
}

export function interpolatePrice(
  candles: SimulatedCandle[],
  simulatedTimeSec: number
): number {
  if (candles.length === 0) return 0;
  if (simulatedTimeSec <= candles[0].time) return candles[0].open;
  if (simulatedTimeSec >= candles[candles.length - 1].time) {
    return candles[candles.length - 1].close;
  }

  for (let i = 0; i < candles.length - 1; i++) {
    const curr = candles[i];
    const next = candles[i + 1];

    if (simulatedTimeSec >= curr.time && simulatedTimeSec < next.time) {
      const duration = next.time - curr.time;
      const progress = (simulatedTimeSec - curr.time) / duration;
      return curr.open + (next.open - curr.open) * progress;
    }
  }

  return candles[candles.length - 1].close;
}

/**
 * Returns the candle that is active at the given simulated time.
 * This is the candle whose time interval contains simulatedTimeSec.
 */
export function getCurrentCandle(
  candles: SimulatedCandle[],
  simulatedTimeSec: number
): SimulatedCandle | null {
  if (candles.length === 0) return null;
  if (simulatedTimeSec <= candles[0].time) return candles[0];
  if (simulatedTimeSec >= candles[candles.length - 1].time) {
    return candles[candles.length - 1];
  }
  for (let i = 0; i < candles.length - 1; i++) {
    const curr = candles[i];
    const next = candles[i + 1];
    if (simulatedTimeSec >= curr.time && simulatedTimeSec < next.time) {
      return curr;
    }
  }
  return candles[candles.length - 1];
}

export function calculateTrend(
  candles: SimulatedCandle[],
  currentPrice: number,
  lookback = 20
): "bull" | "bear" | "neutral" {
  if (candles.length < lookback) return "neutral";

  const closes = candles.slice(-lookback).map((c) => c.close);
  const sma = closes.reduce((a, b) => a + b, 0) / closes.length;

  if (currentPrice > sma * 1.01) return "bull";
  if (currentPrice < sma * 0.99) return "bear";
  return "neutral";
}

export function calculateVolatility(
  candles: SimulatedCandle[],
  lookback = 24
): number {
  if (candles.length < lookback) return 1.5;

  const recent = candles.slice(-lookback);
  const max = Math.max(...recent.map((c) => c.high));
  const min = Math.min(...recent.map((c) => c.low));
  const avg = recent.reduce((a, c) => a + c.close, 0) / recent.length;

  if (avg === 0) return 1.5;
  return ((max - min) / avg) * 100;
}

/**
 * Generates synthetic fallback candles when Binance API is unavailable
 * (e.g., geo-blocked with HTTP 451). Uses a random walk with realistic
 * Bitcoin volatility to produce playable simulation data.
 */
export function generateFallbackCandles(
  startTime: Date,
  count: number,
  basePrice = 65000
): BinanceCandle[] {
  const candles: BinanceCandle[] = [];
  let price = basePrice;
  const intervalMs = 60_000; // 1 minute

  for (let i = 0; i < count; i++) {
    const openTime = startTime.getTime() + i * intervalMs;
    const closeTime = openTime + intervalMs - 1;

    // Random walk with 0.15% average volatility per minute
    const change = (Math.random() - 0.48) * price * 0.003;
    const open = price;
    const close = Math.max(1000, price + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.002);
    const volume = Math.random() * 100 + 10;

    candles.push({
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
    });

    price = close;
  }

  return candles;
}
