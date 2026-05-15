/**
 * Helpers for building synthetic candle sequences and running deterministic
 * engine ticks without any Binance API calls.
 *
 * Design constraints:
 * - interpolatePrice() goes from candles[i].open → candles[i+1].open
 *   (NOT open→close within the same candle). So the "price path" is
 *   determined by the sequence of .open values.
 * - getCurrentCandle() returns candle[i] for times in [candle[i].time, candle[i+1].time)
 *   and its .high/.low drive wick-based liquidation / TP / SL checks.
 * - SPEED_MULTIPLIER=60: advancing the frozen clock by N*1000ms → N simulated minutes.
 *
 * Usage example (advance to minute 20.5):
 *   const clock = createFrozenClock();
 *   clock.advance(minutesToRealMs(20.5));
 *   const result = processTick({ startDate, currentCandles: candles, clock });
 */

import type { SimulatedCandle } from "@/lib/binance-api";
import { createFrozenClock } from "@/lib/sentinel/clock";
import { processTick, type TickResult } from "@/lib/engine/tick-processor";

const SPEED_MULTIPLIER = 60;
const CANDLE_DURATION_SEC = 60;

/**
 * Converts N simulated minutes into the real-clock milliseconds needed
 * to reach that point (given SPEED_MULTIPLIER=60).
 *
 * @example minutesToRealMs(20) → 20000ms of real clock = 20 simulated minutes
 */
export function minutesToRealMs(simulatedMinutes: number): number {
  return (simulatedMinutes * CANDLE_DURATION_SEC * 1000) / SPEED_MULTIPLIER;
}

export interface CandleSpec {
  /** Open price of this candle — ALSO controls interpolated price at this candle's start. */
  open: number;
  /**
   * Close price. Does not affect interpolation (which uses next candle's open),
   * but is used by chart rendering and continuity helpers.
   * Defaults to open (flat candle).
   */
  close?: number;
  /** Highest wick. Defaults to open * 1.002 (0.2% above open). */
  high?: number;
  /** Lowest wick. Defaults to open * 0.998 (0.2% below open). */
  low?: number;
  volume?: number;
}

/**
 * Builds a SimulatedCandle[] from a list of specs.
 *
 * @param t0Sec Unix timestamp (seconds) of the first candle's start
 * @param specs One spec per candle; each candle is CANDLE_DURATION_SEC wide
 *
 * @example
 * buildSyntheticCandles(t0, [
 *   { open: 50000 },           // flat candle at 50k
 *   { open: 49700 },           // price falls to 49.7k
 *   { open: 47000, low: 44000 },  // candle with aggressive wick down
 * ])
 */
export function buildSyntheticCandles(
  t0Sec: number,
  specs: CandleSpec[]
): SimulatedCandle[] {
  return specs.map((spec, i) => {
    const open = spec.open;
    const close = spec.close ?? open;
    const high = spec.high ?? Math.max(open, close) * 1.002;
    const low = spec.low ?? Math.min(open, close) * 0.998;
    return {
      time: t0Sec + i * CANDLE_DURATION_SEC,
      open,
      high,
      low,
      close,
      volume: spec.volume ?? 100,
    };
  });
}

/**
 * Shorthand: builds N flat candles all at the same price.
 */
export function flatCandles(
  t0Sec: number,
  n: number,
  price: number,
  overrides?: Partial<CandleSpec>
): SimulatedCandle[] {
  return buildSyntheticCandles(
    t0Sec,
    Array.from({ length: n }, () => ({ open: price, close: price, ...overrides }))
  );
}

/**
 * Shorthand: builds candles whose open price declines linearly from
 * startPrice to endPrice over n steps.
 */
export function decliningCandles(
  t0Sec: number,
  n: number,
  startPrice: number,
  endPrice: number,
  overrides?: Partial<CandleSpec>
): SimulatedCandle[] {
  const step = (endPrice - startPrice) / n;
  return buildSyntheticCandles(
    t0Sec,
    Array.from({ length: n }, (_, i) => {
      const open = startPrice + step * i;
      return { open, close: open + step, ...overrides };
    })
  );
}

/**
 * Runs a single synthetic tick at the given simulated minute (fractional supported).
 *
 * Returns the TickResult or throws if processTick returns an error.
 *
 * @param candles SimulatedCandle[] built via buildSyntheticCandles
 * @param t0Sec  First candle's Unix timestamp in seconds — used as startDate
 * @param atMinute  Which simulated minute to land on (e.g., 20.5 = mid-candle 20)
 */
export function runSyntheticTick(
  candles: SimulatedCandle[],
  t0Sec: number,
  atMinute: number
): TickResult {
  const clock = createFrozenClock();
  clock.advance(minutesToRealMs(atMinute));

  const startDate = new Date(t0Sec * 1000);
  const result = processTick({ startDate, currentCandles: candles, clock });

  if ("error" in result) {
    throw new Error(`processTick error at minute ${atMinute}: ${result.error}`);
  }
  return result;
}
