import { describe, it, expect } from "vitest";
import { interpolatePrice } from "./binance-api";
import type { SimulatedCandle } from "./binance-api";

const makeCandle = (time: number, open: number, close: number): SimulatedCandle => ({
  time, open, close, high: Math.max(open, close), low: Math.min(open, close), volume: 100,
});

describe("interpolatePrice", () => {
  it("returns 0 for empty candle array", () => {
    expect(interpolatePrice([], 50000)).toBe(0);
  });

  it("returns first candle open when simulatedTime is before first candle", () => {
    const candles = [makeCandle(100, 50000, 51000), makeCandle(160, 51000, 52000)];
    expect(interpolatePrice(candles, 50)).toBe(50000);
    expect(interpolatePrice(candles, 100)).toBe(50000); // exact boundary
  });

  it("returns last candle close when simulatedTime is at or after last candle", () => {
    const candles = [makeCandle(100, 50000, 51000), makeCandle(160, 51000, 52500)];
    expect(interpolatePrice(candles, 200)).toBe(52500);
    expect(interpolatePrice(candles, 160)).toBe(52500); // exact boundary
  });

  it("interpolates linearly between two candle opens at midpoint", () => {
    // candle A at t=0, open=50000; candle B at t=60, open=51000
    // at t=30 (midpoint) → 50000 + (51000-50000)*0.5 = 50500
    const candles = [makeCandle(0, 50000, 50500), makeCandle(60, 51000, 51500)];
    expect(interpolatePrice(candles, 30)).toBe(50500);
  });

  it("interpolates correctly at quarter-point", () => {
    const candles = [makeCandle(0, 40000, 41000), makeCandle(60, 44000, 45000)];
    // at t=15 (25% of 60) → 40000 + (44000-40000)*0.25 = 41000
    expect(interpolatePrice(candles, 15)).toBe(41000);
  });

  it("returns correct open at candle boundary (simulatedTime === candle.time)", () => {
    const candles = [
      makeCandle(0, 50000, 50500),
      makeCandle(60, 51000, 51500),
      makeCandle(120, 52000, 52500),
    ];
    // At exactly t=60, we're at the boundary: curr=candle[0], next=candle[1]
    // progress = (60-0)/(60-0) = 1.0 → 50000 + (51000-50000)*1 = 51000
    expect(interpolatePrice(candles, 60)).toBe(51000);
  });

  it("handles single candle array — returns open before its time, close after", () => {
    const candles = [makeCandle(100, 50000, 51000)];
    expect(interpolatePrice(candles, 50)).toBe(50000);  // before
    expect(interpolatePrice(candles, 100)).toBe(50000); // at time → "before first" branch
    expect(interpolatePrice(candles, 200)).toBe(51000); // after → last close
  });

  it("handles falling price interpolation (open > next open)", () => {
    const candles = [makeCandle(0, 55000, 54000), makeCandle(60, 50000, 49000)];
    // at t=30 → 55000 + (50000-55000)*0.5 = 55000 - 2500 = 52500
    expect(interpolatePrice(candles, 30)).toBe(52500);
  });
});
