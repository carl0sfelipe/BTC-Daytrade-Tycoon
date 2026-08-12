/**
 * Candle fixtures for the "Extreme Volatility" event tests: a calm run with
 * optional volatile clusters at exact indices, so window detection is fully
 * predictable. Synthetic candles are allowed in tests only — production
 * never synthesizes candles (PRD non-goal).
 */

import type { SimulatedCandle } from "@/lib/binance-api";
import { buildSyntheticCandles, type CandleSpec } from "./syntheticEngine";

export const VOLATILITY_FIXTURE_BASE_TIME = 1_600_000_000;

/** Calm-day per-candle range — far below the 0.25% detection floor. */
export const CALM_RANGE_PERCENT = 0.05;

export interface VolatileCluster {
  start: number;
  length: number;
  rangePercent: number;
}

function rangedCandleSpec(rangePercent: number): CandleSpec {
  const price = 50_000;
  const halfRange = (price * rangePercent) / 100 / 2;
  return { open: price, close: price, high: price + halfRange, low: price - halfRange };
}

/**
 * Builds `count` calm candles, overriding the (high−low)/close range inside
 * each cluster. Candle times start at VOLATILITY_FIXTURE_BASE_TIME, 60s apart.
 *
 * @example
 * makeVolatilityRunCandles(700, [{ start: 300, length: 45, rangePercent: 0.8 }])
 */
export function makeVolatilityRunCandles(
  count: number,
  clusters: VolatileCluster[] = []
): SimulatedCandle[] {
  const specs = Array.from({ length: count }, (_, index) => {
    const cluster = clusters.find(
      (c) => index >= c.start && index < c.start + c.length
    );
    return rangedCandleSpec(cluster ? cluster.rangePercent : CALM_RANGE_PERCENT);
  });
  return buildSyntheticCandles(VOLATILITY_FIXTURE_BASE_TIME, specs);
}

/**
 * Simulated unix time (seconds) at which the playhead sits on `candleIndex`.
 *
 * @example volatilityFixtureTimeAt(90) // start of candle 90
 */
export function volatilityFixtureTimeAt(candleIndex: number): number {
  return VOLATILITY_FIXTURE_BASE_TIME + candleIndex * 60;
}
