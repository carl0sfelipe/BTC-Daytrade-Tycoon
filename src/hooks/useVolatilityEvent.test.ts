import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SimulatedCandle } from "@/lib/binance-api";
import {
  makeVolatilityRunCandles,
  volatilityFixtureTimeAt,
} from "@/test/helpers";
import { useVolatilityEvent } from "./useVolatilityEvent";

// One 45-candle cluster → one deterministic window at indices 300..344
// (verified in volatility-events.test.ts). 1 candle = 1 real second.
const CANDLES = makeVolatilityRunCandles(700, [
  { start: 300, length: 45, rangePercent: 0.8 },
]);

interface HookProps {
  candles: SimulatedCandle[];
  timeSec: number;
}

function renderVolatilityHook(initial: HookProps) {
  return renderHook(
    ({ candles, timeSec }: HookProps) => useVolatilityEvent(candles, timeSec),
    { initialProps: initial }
  );
}

function renderAtIndex(candleIndex: number) {
  return renderVolatilityHook({
    candles: CANDLES,
    timeSec: volatilityFixtureTimeAt(candleIndex),
  });
}

describe("useVolatilityEvent", () => {
  it("returns null with an empty buffer", () => {
    const { result } = renderVolatilityHook({ candles: [], timeSec: 0 });
    expect(result.current).toBeNull();
  });

  it("returns null before the countdown lead", () => {
    const { result } = renderAtIndex(280);
    expect(result.current).toBeNull();
  });

  it("reports incoming with real seconds to start", () => {
    const { result } = renderAtIndex(293);
    expect(result.current).toEqual({ kind: "incoming", seconds: 7 });
  });

  it("reports active with real seconds remaining", () => {
    const { result } = renderAtIndex(315);
    expect(result.current).toEqual({ kind: "active", seconds: 30 });
  });

  it("counts down across re-renders as the playhead advances", () => {
    const { result, rerender } = renderAtIndex(300);
    expect(result.current).toEqual({ kind: "active", seconds: 45 });

    rerender({ candles: CANDLES, timeSec: volatilityFixtureTimeAt(344) });
    expect(result.current).toEqual({ kind: "active", seconds: 1 });

    rerender({ candles: CANDLES, timeSec: volatilityFixtureTimeAt(345) });
    expect(result.current).toBeNull();
  });

  it("waits for the run buffer, then keeps windows identical as it extends", () => {
    // Same run: the short buffer is a prefix of the full one (append-only).
    const shortBuffer = CANDLES.slice(0, 400);
    const { result, rerender } = renderVolatilityHook({
      candles: shortBuffer,
      timeSec: volatilityFixtureTimeAt(315),
    });
    expect(result.current).toBeNull();

    rerender({ candles: CANDLES, timeSec: volatilityFixtureTimeAt(315) });
    expect(result.current).toEqual({ kind: "active", seconds: 30 });

    // Tail slice keeps candle times contiguous, like a real append.
    const extendedBuffer = [...CANDLES, ...makeVolatilityRunCandles(800).slice(700)];
    rerender({ candles: extendedBuffer, timeSec: volatilityFixtureTimeAt(315) });
    expect(result.current).toEqual({ kind: "active", seconds: 30 });
  });

  it("recomputes windows and resets the playhead for a new run", () => {
    const { result, rerender } = renderAtIndex(500);
    expect(result.current).toBeNull();

    // New run: different first-candle time, cluster at 200..244. Index 210
    // is below the previous run's max index (500) — only a per-run reset
    // of the monotonic playhead can resolve it as active.
    const runShiftSec = 999_000;
    const newRunCandles = makeVolatilityRunCandles(700, [
      { start: 200, length: 45, rangePercent: 0.8 },
    ]).map((candle) => ({ ...candle, time: candle.time + runShiftSec }));
    rerender({
      candles: newRunCandles,
      timeSec: volatilityFixtureTimeAt(210) + runShiftSec,
    });
    expect(result.current).toEqual({ kind: "active", seconds: 35 });
  });

  it("holds the phase when pause/resume jitters the playhead back one candle", () => {
    const activeBoundary = renderAtIndex(300);
    expect(activeBoundary.result.current).toEqual({ kind: "active", seconds: 45 });
    activeBoundary.rerender({ candles: CANDLES, timeSec: volatilityFixtureTimeAt(299) });
    expect(activeBoundary.result.current).toEqual({ kind: "active", seconds: 45 });

    const incomingBoundary = renderAtIndex(290);
    expect(incomingBoundary.result.current).toEqual({ kind: "incoming", seconds: 10 });
    incomingBoundary.rerender({ candles: CANDLES, timeSec: volatilityFixtureTimeAt(289) });
    expect(incomingBoundary.result.current).toEqual({ kind: "incoming", seconds: 10 });
  });

  it("ends the event cleanly when the playhead outruns the buffer", () => {
    // Buffer ends exactly where the last eligible window ends (index 569),
    // so the clamped last index would otherwise freeze the banner at "1s".
    const truncatedRun = makeVolatilityRunCandles(570, [
      { start: 525, length: 45, rangePercent: 0.8 },
    ]);
    const { result, rerender } = renderVolatilityHook({
      candles: truncatedRun,
      timeSec: volatilityFixtureTimeAt(569) + 30,
    });
    expect(result.current).toEqual({ kind: "active", seconds: 1 });

    rerender({ candles: truncatedRun, timeSec: volatilityFixtureTimeAt(569) + 60 });
    expect(result.current).toBeNull();
  });
});
