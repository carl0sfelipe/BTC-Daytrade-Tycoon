import type { Time } from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";
import { diag } from "@/lib/logger";

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
  const last = candles[currentIdx];
  if (last) {
    diag.log(`buildVisibleCandles: idx=${currentIdx} total=${candles.length} lastCandle open=${last.open} high=${last.high} low=${last.low} close=${last.close} currentPrice=${currentPrice}`);
  }

  return candles.slice(0, currentIdx + 1).map((c, i) => {
    const isLast = i === currentIdx;

    return {
      time: c.time as Time,
      open: c.open,
      high: isLast ? Math.max(c.high, currentPrice) : c.high,
      low: isLast ? Math.min(c.low, currentPrice) : c.low,
      close: isLast ? currentPrice : c.close,
    };
  });
}
