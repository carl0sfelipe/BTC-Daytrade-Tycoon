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
    ? "/api/binance/api/v3"
    : "https://api.binance.com/api/v3";

export async function fetchCurrentPrice(symbol = "BTCUSDT"): Promise<number> {
  const url = `${BINANCE_API}/ticker/price?symbol=${symbol}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
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
