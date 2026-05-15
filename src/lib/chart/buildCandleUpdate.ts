import type { Time } from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";

/**
 * Builds a single candle update object for the currently forming candle.
 *
 * The high/low/close are derived from the current simulation price,
 * while open comes from the original candle data.
 *
 * @example
 * buildCandleUpdate(candle, 51000)
 * // => { time: 1715424000, open: 50000, high: 51000, low: 50000, close: 51000 }
 */
export function buildCandleUpdate(
  candle: SimulatedCandle,
  currentPrice: number
) {
  return {
    time: candle.time as Time,
    open: candle.open,
    high: Math.max(candle.high, currentPrice),
    low: Math.min(candle.low, currentPrice),
    close: currentPrice,
  };
}
