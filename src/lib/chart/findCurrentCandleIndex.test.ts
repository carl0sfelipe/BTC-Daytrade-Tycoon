import { describe, it, expect } from "vitest";
import { findCurrentCandleIndex } from "./findCurrentCandleIndex";
import type { SimulatedCandle } from "@/lib/binance-api";

function makeCandle(time: number): SimulatedCandle {
  return {
    time,
    open: 50000,
    high: 51000,
    low: 49000,
    close: 50500,
    volume: 1,
  };
}

describe("findCurrentCandleIndex", () => {
  it("returns 0 when time is inside the first candle", () => {
    const candles = [makeCandle(0), makeCandle(60), makeCandle(120)];
    expect(findCurrentCandleIndex(candles, 30)).toBe(0);
  });

  it("returns last index when time is beyond all candles", () => {
    const candles = [makeCandle(0), makeCandle(60)];
    expect(findCurrentCandleIndex(candles, 200)).toBe(1);
  });

  it("returns correct middle index", () => {
    const candles = [
      makeCandle(0),
      makeCandle(60),
      makeCandle(120),
      makeCandle(180),
    ];
    expect(findCurrentCandleIndex(candles, 90)).toBe(1);
  });

  it("throws for empty array", () => {
    expect(() => findCurrentCandleIndex([], 0)).toThrowError(
      /Invalid candles: received empty array, expected at least one candle/
    );
  });
});
