/**
 * "Extreme Volatility" run events — pure, deterministic detection over the
 * run's already-loaded candle buffer (PRD_ROGUELIKE_PVP.md §3.3).
 *
 * Events HIGHLIGHT real historical high-volatility windows; candles are never
 * synthesized or altered (PRD non-goal), and there is NO reward multiplier —
 * the server cannot verify a client-side event flag, and payout already
 * scales naturally because real volatility makes ±5%/±10% targets reachable.
 *
 * Engine anchors this module is built on (see useTimewarpEngine +
 * tick-processor + session-loader):
 * - candles are real Binance 1-minute klines, `time` in unix seconds;
 * - SPEED_MULTIPLIER = 60 → 1 real second = 60 simulated seconds = exactly
 *   1 candle, so a 45-candle window ≈ 45 real seconds of gameplay;
 * - the playhead starts at buffer index 30 (HISTORY_OFFSET_CANDLES) and a
 *   run lasts RUN_DURATION_SEC (600) real seconds → the playable run spans
 *   buffer indices [30, 630).
 */

import type { SimulatedCandle } from "@/lib/binance-api";
import { RUN_DURATION_SEC } from "./run-config";
import { HISTORY_OFFSET_CANDLES } from "./session-loader";

/**
 * Real seconds of gameplay per candle: 60 simulated seconds per 1m candle ÷
 * SPEED_MULTIPLIER (60, tick-processor.ts). Exported so UI layers convert
 * candle counts to on-screen countdown seconds without re-deriving the rate.
 */
export const REAL_SECONDS_PER_CANDLE = 1;

/** Countdown lead before an event starts: 10 candles ≈ 10 real seconds. */
export const VOLATILITY_EVENT_COUNTDOWN_LEAD_CANDLES = 10;

export interface VolatilityEventWindow {
  startIndex: number;
  endIndex: number;
  /** Max single-candle (high−low)/close inside the window, in percent. */
  peakRangePercent: number;
}

export type VolatilityEventPhase =
  | { kind: "incoming"; candlesToStart: number; window: VolatilityEventWindow }
  | { kind: "active"; candlesRemaining: number; window: VolatilityEventWindow };

export interface VolatilityEventConfig {
  /** Event length in candles; at 1 candle/real-second, 45 ≈ 45s (§3.3). */
  windowCandles: number;
  /** First playable buffer index (session-loader HISTORY_OFFSET_CANDLES). */
  runStartIndex: number;
  /** Playable run length in candles (RUN_DURATION_SEC × 1 candle/second). */
  runLengthCandles: number;
  /** Fraction of the run excluded at each edge — no events at start/end. */
  edgeExclusionRatio: number;
  /** Absolute floor for a window's mean (high−low)/close, in percent. */
  minMeanRangePercent: number;
  /** Relative gate: score must reach this percentile of all candidates. */
  scorePercentile: number;
  /** Max events per run — keeps them rare enough to stay hype. */
  maxWindows: number;
  /** Min candles between one event's end and the next event's start. */
  minGapCandles: number;
}

/**
 * Playtest anchors (Boss decision 2026-08-12). The 0.25% floor sits well
 * above calm BTC 1m ranges (~0.03–0.10%) and below crash/pump clusters
 * (0.5–2%), so a flat day legitimately yields zero events.
 */
export const DEFAULT_VOLATILITY_EVENT_CONFIG: VolatilityEventConfig = {
  windowCandles: 45,
  runStartIndex: HISTORY_OFFSET_CANDLES,
  runLengthCandles: RUN_DURATION_SEC * (1 / REAL_SECONDS_PER_CANDLE),
  edgeExclusionRatio: 0.1,
  minMeanRangePercent: 0.25,
  scorePercentile: 0.9,
  maxWindows: 2,
  minGapCandles: 90,
};

interface CandidateWindow {
  startIndex: number;
  /** Mean (high−low)/close over the window, in percent — the ranking key. */
  score: number;
  peakRangePercent: number;
}

/**
 * Per-candle range as a percentage of close — the raw volatility signal.
 *
 * @example computeCandleRangePercents([{ high: 101, low: 99, close: 100, ... }]) // [2]
 */
export function computeCandleRangePercents(candles: SimulatedCandle[]): number[] {
  return candles.map((candle) =>
    candle.close > 0 ? ((candle.high - candle.low) / candle.close) * 100 : 0
  );
}

/**
 * Buffer length at which the eligible zone is fully covered. Once the buffer
 * reaches this length, further appends can never change the detected windows
 * (candidates are capped at this index) — the anchor for freezing windows
 * per run so an announced event never relocates.
 *
 * @example computeRunBufferReadyLength() // 570 with defaults (30 + 600 − 60)
 */
export function computeRunBufferReadyLength(
  config: VolatilityEventConfig = DEFAULT_VOLATILITY_EVENT_CONFIG
): number {
  return config.runStartIndex + config.runLengthCandles - computeEdgeCandles(config);
}

function computeEdgeCandles(config: VolatilityEventConfig): number {
  return Math.floor(config.runLengthCandles * config.edgeExclusionRatio);
}

/**
 * Detects up to `maxWindows` extreme-volatility windows inside the playable
 * run. Deterministic: same buffer + config always yields the same windows.
 * Refuses synthetic buffers: fallback random-walk candles are not real
 * market history, and events must highlight REAL windows (PRD §3.3).
 *
 * @example
 * const windows = computeVolatilityEventWindows(candles);
 * // e.g. [{ startIndex: 300, endIndex: 344, peakRangePercent: 0.82 }]
 */
export function computeVolatilityEventWindows(
  candles: SimulatedCandle[],
  config: VolatilityEventConfig = DEFAULT_VOLATILITY_EVENT_CONFIG
): VolatilityEventWindow[] {
  if (candles.some((candle) => candle.isSynthetic)) return [];
  const rangePercents = computeCandleRangePercents(candles);
  const candidates = buildCandidateWindows(rangePercents, config);
  if (candidates.length === 0) return [];
  const threshold = computeWindowScoreThreshold(
    candidates.map((candidate) => candidate.score),
    config
  );
  return selectTopVolatilityWindows(candidates, threshold, config);
}

function buildCandidateWindows(
  rangePercents: number[],
  config: VolatilityEventConfig
): CandidateWindow[] {
  const firstStart = config.runStartIndex + computeEdgeCandles(config);
  const runEnd = Math.min(computeRunBufferReadyLength(config), rangePercents.length);
  const lastStart = runEnd - config.windowCandles;
  const candidates: CandidateWindow[] = [];
  for (let start = firstStart; start <= lastStart; start++) {
    candidates.push(scoreCandidateWindow(rangePercents, start, config.windowCandles));
  }
  return candidates;
}

function scoreCandidateWindow(
  rangePercents: number[],
  startIndex: number,
  windowCandles: number
): CandidateWindow {
  let sum = 0;
  let peak = 0;
  for (let i = startIndex; i < startIndex + windowCandles; i++) {
    sum += rangePercents[i];
    peak = Math.max(peak, rangePercents[i]);
  }
  return { startIndex, score: sum / windowCandles, peakRangePercent: peak };
}

// Both gates must pass: the absolute floor kills flat days, the percentile
// keeps events rare relative to the run's own volatility distribution.
function computeWindowScoreThreshold(
  scores: number[],
  config: VolatilityEventConfig
): number {
  const sorted = [...scores].sort((a, b) => a - b);
  const percentileValue = sorted[Math.floor(config.scorePercentile * (sorted.length - 1))];
  return Math.max(config.minMeanRangePercent, percentileValue);
}

function selectTopVolatilityWindows(
  candidates: CandidateWindow[],
  threshold: number,
  config: VolatilityEventConfig
): VolatilityEventWindow[] {
  // Tie-break on startIndex keeps selection deterministic for equal scores.
  const ranked = candidates
    .filter((candidate) => candidate.score >= threshold)
    .sort((a, b) => b.score - a.score || a.startIndex - b.startIndex);
  const chosen: CandidateWindow[] = [];
  for (const candidate of ranked) {
    if (chosen.length >= config.maxWindows) break;
    if (chosen.every((accepted) => hasMinGap(accepted, candidate, config))) {
      chosen.push(candidate);
    }
  }
  return chosen
    .sort((a, b) => a.startIndex - b.startIndex)
    .map((candidate) => toEventWindow(candidate, config.windowCandles));
}

function hasMinGap(
  a: CandidateWindow,
  b: CandidateWindow,
  config: VolatilityEventConfig
): boolean {
  const aEnd = a.startIndex + config.windowCandles - 1;
  const bEnd = b.startIndex + config.windowCandles - 1;
  return (
    b.startIndex - aEnd > config.minGapCandles ||
    a.startIndex - bEnd > config.minGapCandles
  );
}

function toEventWindow(
  candidate: CandidateWindow,
  windowCandles: number
): VolatilityEventWindow {
  return {
    startIndex: candidate.startIndex,
    endIndex: candidate.startIndex + windowCandles - 1,
    peakRangePercent: candidate.peakRangePercent,
  };
}

/** Candle span in simulated seconds — Binance "1m" klines. */
const CANDLE_SPAN_SEC = 60;

/**
 * True once the playhead moved past the last candle's minute — the data is
 * exhausted (fetch failed or no more history), so any running event must end
 * cleanly instead of freezing on the clamped last index ("1s left" forever).
 *
 * @example isPlayheadPastBuffer(candles, lastCandle.time + 60) // true
 */
export function isPlayheadPastBuffer(
  candles: SimulatedCandle[],
  currentTimeSec: number
): boolean {
  if (candles.length === 0) return true;
  return currentTimeSec >= candles[candles.length - 1].time + CANDLE_SPAN_SEC;
}

/**
 * Phase of the event timeline at `currentIndex`: countdown ("incoming"),
 * running ("active"), or null outside both. Windows come pre-sorted and
 * gap-separated from computeVolatilityEventWindows, so first match wins.
 *
 * @example
 * resolveVolatilityEventPhase([{ startIndex: 100, endIndex: 144, peakRangePercent: 1 }], 95, 10)
 * // { kind: "incoming", candlesToStart: 5, window: {...} }
 */
export function resolveVolatilityEventPhase(
  windows: VolatilityEventWindow[],
  currentIndex: number,
  countdownLeadCandles: number
): VolatilityEventPhase | null {
  for (const window of windows) {
    if (currentIndex >= window.startIndex && currentIndex <= window.endIndex) {
      const candlesRemaining = window.endIndex - currentIndex + 1;
      return { kind: "active", candlesRemaining, window };
    }
    if (currentIndex >= window.startIndex - countdownLeadCandles && currentIndex < window.startIndex) {
      return { kind: "incoming", candlesToStart: window.startIndex - currentIndex, window };
    }
  }
  return null;
}
