"use client";

import { useRef, type MutableRefObject } from "react";
import type { SimulatedCandle } from "@/lib/binance-api";
import { findCurrentCandleIndex } from "@/lib/chart";
import {
  computeRunBufferReadyLength,
  computeVolatilityEventWindows,
  isPlayheadPastBuffer,
  resolveVolatilityEventPhase,
  REAL_SECONDS_PER_CANDLE,
  VOLATILITY_EVENT_COUNTDOWN_LEAD_CANDLES,
  type VolatilityEventPhase,
  type VolatilityEventWindow,
} from "@/lib/engine/volatility-events";

export interface VolatilityEventView {
  kind: "incoming" | "active";
  /** Real-world seconds to show in the banner countdown (1 candle = 1s). */
  seconds: number;
}

interface RunEventState {
  /** First candle time — the run's identity (see resolveRunEventState). */
  runKey: number;
  /** null until the buffer covers the eligible zone; then frozen for the run. */
  windows: VolatilityEventWindow[] | null;
  /** Highest playhead index seen this run — see the monotonicity note below. */
  maxSeenIndex: number;
}

/**
 * Derives the current "Extreme Volatility" event phase for the banner.
 *
 * Takes candles + currentTimeSec as parameters instead of reading the store:
 * the candle buffer lives in useTimewarpEngine's local state (the store only
 * holds price/trend/volatility scalars), so parameter injection is the only
 * way to reach it without adding new store state — which keeps the store API
 * freeze intact.
 *
 * Windows are computed ONCE per run and frozen (see resolveRunEventState),
 * and the playhead index is monotonic within a run: pause/resume restores
 * the clock from whole seconds, which can step the index back by one and
 * flicker incoming↔active right at a window boundary.
 *
 * @example
 * const event = useVolatilityEvent(engine.candles, engine.currentTimeSec);
 * // { kind: "incoming", seconds: 7 } | { kind: "active", seconds: 30 } | null
 */
export function useVolatilityEvent(
  candles: SimulatedCandle[],
  currentTimeSec: number
): VolatilityEventView | null {
  const runStateRef = useRef<RunEventState | null>(null);
  if (candles.length === 0) return null;
  const runState = resolveRunEventState(runStateRef, candles);
  if (!runState.windows || runState.windows.length === 0) return null;
  // Data exhausted (failed/ended fetch): end the event cleanly instead of
  // letting the clamped last index freeze the banner at "1s left".
  if (isPlayheadPastBuffer(candles, currentTimeSec)) return null;
  runState.maxSeenIndex = Math.max(
    runState.maxSeenIndex,
    findCurrentCandleIndex(candles, currentTimeSec)
  );
  const phase = resolveVolatilityEventPhase(
    runState.windows,
    runState.maxSeenIndex,
    VOLATILITY_EVENT_COUNTDOWN_LEAD_CANDLES
  );
  return phase ? toVolatilityEventView(phase) : null;
}

// The ref is written during render on purpose: it is a per-run derivation
// cache (windows + monotonic index) that must be visible in the SAME render
// that observes a new buffer — an effect would lag one frame and re-render.
function resolveRunEventState(
  runStateRef: MutableRefObject<RunEventState | null>,
  candles: SimulatedCandle[]
): RunEventState {
  // The first candle's time identifies the run: every session draws a random
  // historical date and appends only extend the tail. The store's callRunId
  // is NOT usable here — session-replay loads call engine.reset() without
  // resetCallRun(), so it goes stale across buffers.
  const runKey = candles[0].time;
  if (runStateRef.current?.runKey !== runKey) {
    runStateRef.current = { runKey, windows: null, maxSeenIndex: 0 };
  }
  if (runStateRef.current.windows === null && candles.length >= computeRunBufferReadyLength()) {
    // Frozen once per run: recomputing while the buffer grows could relocate
    // an announced event — a countdown that teleports breaks player trust.
    // (Freezing only after the eligible zone is covered also guarantees the
    // result equals what any later recompute would produce.)
    runStateRef.current.windows = computeVolatilityEventWindows(candles);
  }
  return runStateRef.current;
}

function toVolatilityEventView(phase: VolatilityEventPhase): VolatilityEventView {
  const candleCount =
    phase.kind === "incoming" ? phase.candlesToStart : phase.candlesRemaining;
  return { kind: phase.kind, seconds: candleCount * REAL_SECONDS_PER_CANDLE };
}
