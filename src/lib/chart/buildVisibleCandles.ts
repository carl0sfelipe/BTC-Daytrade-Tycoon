import type { Time } from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";

/**
 * Builds the array of visible candles up to (and including) the current one.
 *
 * For the last (current) candle, high/low/close are projected from the
 * simulation price. For historical candles, the original values are kept.
 *
 * @example
 * buildVisibleCandles(candles, 42, 51000)
 * // => [ { time: ..., open: ..., high: ..., low: ..., close: ... }, ... ]
 */
export function buildVisibleCandles(
  candles: SimulatedCandle[],
  currentIdx: number,
  currentPrice: number
) {
  return candles.slice(0, currentIdx + 1).map((c, i) => {
    const isLast = i === currentIdx;

    return {
      time: c.time as Time,
      open: c.open,
      high: isLast ? Math.max(c.open, currentPrice) : c.high,
      low: isLast ? Math.min(c.open, currentPrice) : c.low,
      close: isLast ? currentPrice : c.close,
    };
  });
}
