import { describe, expect, it } from "vitest";
import { makeVolatilityRunCandles } from "@/test/helpers";
import {
  computeCandleRangePercents,
  computeRunBufferReadyLength,
  computeVolatilityEventWindows,
  isPlayheadPastBuffer,
  resolveVolatilityEventPhase,
  DEFAULT_VOLATILITY_EVENT_CONFIG,
  VOLATILITY_EVENT_COUNTDOWN_LEAD_CANDLES,
  type VolatilityEventWindow,
} from "./volatility-events";

// Buffer larger than the playable run (indices 30..629) like the real
// session load (~2000 candles); 700 keeps the tests fast.
const BUFFER_CANDLES = 700;

function makeWindow(startIndex: number, endIndex: number): VolatilityEventWindow {
  return { startIndex, endIndex, peakRangePercent: 1 };
}

describe("computeCandleRangePercents", () => {
  it("returns (high−low)/close as a percentage per candle", () => {
    const candles = makeVolatilityRunCandles(3, [
      { start: 1, length: 1, rangePercent: 0.8 },
    ]);
    const ranges = computeCandleRangePercents(candles);
    expect(ranges[0]).toBeCloseTo(0.05, 6);
    expect(ranges[1]).toBeCloseTo(0.8, 6);
    expect(ranges[2]).toBeCloseTo(0.05, 6);
  });

  it("yields 0 for a non-positive close instead of dividing by zero", () => {
    const [candle] = makeVolatilityRunCandles(1);
    expect(computeCandleRangePercents([{ ...candle, close: 0 }])).toEqual([0]);
  });
});

describe("computeVolatilityEventWindows", () => {
  it("finds zero events on a flat day", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES);
    expect(computeVolatilityEventWindows(candles)).toEqual([]);
  });

  it("finds exactly one window over a single mid-run volatile cluster", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES, [
      { start: 300, length: 45, rangePercent: 0.8 },
    ]);
    const windows = computeVolatilityEventWindows(candles);
    expect(windows).toHaveLength(1);
    expect(windows[0].startIndex).toBe(300);
    expect(windows[0].endIndex).toBe(344);
    expect(windows[0].peakRangePercent).toBeCloseTo(0.8, 6);
  });

  it("selects both clusters when two exist, sorted and gap-separated", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES, [
      { start: 200, length: 45, rangePercent: 0.8 },
      { start: 450, length: 45, rangePercent: 0.8 },
    ]);
    const windows = computeVolatilityEventWindows(candles);
    expect(windows.map((w) => w.startIndex)).toEqual([200, 450]);
    expect(windows[1].startIndex - windows[0].endIndex).toBeGreaterThan(
      DEFAULT_VOLATILITY_EVENT_CONFIG.minGapCandles
    );
  });

  it("caps at the two most intense clusters when three qualify", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES, [
      { start: 150, length: 45, rangePercent: 0.5 },
      { start: 330, length: 45, rangePercent: 1.0 },
      { start: 480, length: 45, rangePercent: 0.8 },
    ]);
    const windows = computeVolatilityEventWindows(candles);
    expect(windows.map((w) => w.startIndex)).toEqual([330, 480]);
  });

  it("ignores clusters inside the first/last 10% of the run", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES, [
      { start: 35, length: 45, rangePercent: 0.8 },
      { start: 580, length: 45, rangePercent: 0.8 },
    ]);
    expect(computeVolatilityEventWindows(candles)).toEqual([]);
  });

  it("is deterministic — same buffer, same windows", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES, [
      { start: 250, length: 45, rangePercent: 0.9 },
      { start: 460, length: 45, rangePercent: 0.6 },
    ]);
    expect(computeVolatilityEventWindows(candles)).toEqual(
      computeVolatilityEventWindows(candles)
    );
  });

  it("returns nothing when the buffer is shorter than the eligible zone", () => {
    const candles = makeVolatilityRunCandles(100, [
      { start: 50, length: 45, rangePercent: 0.8 },
    ]);
    expect(computeVolatilityEventWindows(candles)).toEqual([]);
  });

  it("refuses synthetic fallback buffers — events highlight real data only", () => {
    const candles = makeVolatilityRunCandles(BUFFER_CANDLES, [
      { start: 300, length: 45, rangePercent: 0.8 },
    ]).map((candle) => ({ ...candle, isSynthetic: true as const }));
    expect(computeVolatilityEventWindows(candles)).toEqual([]);
  });
});

describe("computeRunBufferReadyLength", () => {
  it("covers the eligible zone with defaults: offset 30 + run 600 − edge 60", () => {
    expect(computeRunBufferReadyLength()).toBe(570);
  });

  it("caps buildCandidateWindows — appending past it never moves windows", () => {
    const cluster = [{ start: 300, length: 45, rangePercent: 0.8 }];
    const atReady = makeVolatilityRunCandles(computeRunBufferReadyLength(), cluster);
    const extended = makeVolatilityRunCandles(2000, cluster);
    expect(computeVolatilityEventWindows(atReady)).toEqual(
      computeVolatilityEventWindows(extended)
    );
  });
});

describe("isPlayheadPastBuffer", () => {
  const candles = makeVolatilityRunCandles(10);
  const lastCandleTime = candles[9].time;

  it("treats an empty buffer as exhausted", () => {
    expect(isPlayheadPastBuffer([], 0)).toBe(true);
  });

  it("is false while the playhead is inside the last candle's minute", () => {
    expect(isPlayheadPastBuffer(candles, lastCandleTime + 59)).toBe(false);
  });

  it("is true once the playhead leaves the last candle's minute", () => {
    expect(isPlayheadPastBuffer(candles, lastCandleTime + 60)).toBe(true);
  });
});

describe("resolveVolatilityEventPhase", () => {
  const lead = VOLATILITY_EVENT_COUNTDOWN_LEAD_CANDLES;
  const windows = [makeWindow(100, 144)];

  it("stays null before the countdown lead", () => {
    expect(resolveVolatilityEventPhase(windows, 100 - lead - 1, lead)).toBeNull();
  });

  it("reports incoming with the candles-to-start countdown", () => {
    expect(resolveVolatilityEventPhase(windows, 100 - lead, lead)).toEqual({
      kind: "incoming",
      candlesToStart: lead,
      window: windows[0],
    });
    expect(resolveVolatilityEventPhase(windows, 99, lead)).toMatchObject({
      kind: "incoming",
      candlesToStart: 1,
    });
  });

  it("reports active with the remaining candles, inclusive of the last", () => {
    expect(resolveVolatilityEventPhase(windows, 100, lead)).toMatchObject({
      kind: "active",
      candlesRemaining: 45,
    });
    expect(resolveVolatilityEventPhase(windows, 144, lead)).toMatchObject({
      kind: "active",
      candlesRemaining: 1,
    });
  });

  it("returns to null after the window ends", () => {
    expect(resolveVolatilityEventPhase(windows, 145, lead)).toBeNull();
  });

  it("resolves against the second window once the first is over", () => {
    const twoWindows = [makeWindow(100, 144), makeWindow(300, 344)];
    expect(resolveVolatilityEventPhase(twoWindows, 295, lead)).toMatchObject({
      kind: "incoming",
      candlesToStart: 5,
      window: twoWindows[1],
    });
  });
});