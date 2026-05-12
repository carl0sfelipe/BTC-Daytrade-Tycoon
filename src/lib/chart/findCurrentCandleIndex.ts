import type { SimulatedCandle } from "@/lib/binance-api";

/**
 * Finds the index of the candle that contains the given simulation time.
 *
 * Candles are contiguous in time. The current candle is the last one
 * whose start time is <= currentTimeSec.
 *
 * @example
 * findCurrentCandleIndex(candles, 1715424000)
 * // => 42
 */
export function findCurrentCandleIndex(
  candles: SimulatedCandle[],
  currentTimeSec: number
): number {
  if (candles.length === 0) {
    throw new Error(
      `Invalid candles: received empty array, expected at least one candle`
    );
  }

  for (let i = 0; i < candles.length - 1; i++) {
    if (
      currentTimeSec >= candles[i].time &&
      currentTimeSec < candles[i + 1].time
    ) {
      return i;
    }
  }

  return candles.length - 1;
}
