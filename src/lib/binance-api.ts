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
  // Fetch 2 batches of 1000 1min candles = ~2000 candles (~33h of data)
  const allCandles: BinanceCandle[] = [];
  let currentStart = startTime.getTime();

  for (let batch = 0; batch < 2; batch++) {
    const url = new URL(`${BINANCE_API}/klines`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("startTime", currentStart.toString());
    url.searchParams.set("limit", limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 451 || response.status === 503) {
        console.warn(`[fetchCandles] Binance API unavailable (${response.status}). Using generated fallback data.`);
        return generateFallbackCandles(new Date(currentStart), limit);
      }
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }

    const data: Array<(string | number)[]> = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
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

    if (batchCandles.length < limit) {
      break; // No more data
    }

    // Next batch starts after the last candle
    currentStart = batchCandles[batchCandles.length - 1].closeTime + 1;
  }

  if (allCandles.length === 0) {
    throw new Error("No candle data returned from Binance");
  }

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

  return historicalCandles.map((c) => {
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
