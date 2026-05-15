import { describe, it, expect } from "vitest";
import {
  interpolatePrice,
  normalizeCandlesWithContinuity,
  MAX_CANDLE_GAP_RATIO,
} from "./binance-api";
import type { SimulatedCandle, BinanceCandle } from "./binance-api";

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

const makeBinanceCandle = (
  open: number,
  close: number,
  openTime: number
): BinanceCandle => ({
  open,
  close,
  high: Math.max(open, close) * 1.01,
  low: Math.min(open, close) * 0.99,
  volume: 100,
  openTime,
  closeTime: openTime + 59999,
});

describe("normalizeCandlesWithContinuity", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeCandlesWithContinuity([], 50000)).toEqual([]);
  });

  it("scales first new open to match last existing close", () => {
    const newHistorical = [
      makeBinanceCandle(1000, 1050, 0),
      makeBinanceCandle(1050, 1100, 60_000),
    ];
    const lastClose = 50000;
    const result = normalizeCandlesWithContinuity(newHistorical, lastClose);

    // first new open should equal lastClose
    expect(result[0].open).toBeCloseTo(lastClose, 0);
    // internal proportions preserved: 1050/1000 = 1.05
    expect(result[1].open / result[0].open).toBeCloseTo(1050 / 1000, 5);
  });

  it("preserves percentage variations within the batch", () => {
    const newHistorical = [
      makeBinanceCandle(2000, 2100, 0),
      makeBinanceCandle(2100, 1900, 60_000),
      makeBinanceCandle(1900, 1950, 120_000),
    ];
    const result = normalizeCandlesWithContinuity(newHistorical, 80000);

    // Ratios between open prices should be identical
    expect(result[1].open / result[0].open).toBeCloseTo(2100 / 2000, 5);
    expect(result[2].open / result[1].open).toBeCloseTo(1900 / 2100, 5);

    // high/low scaled consistently
    expect(result[0].high / result[0].open).toBeCloseTo(
      newHistorical[0].high / newHistorical[0].open,
      5
    );
  });

  it("throws on invalid lastExistingClose (zero or negative)", () => {
    expect(() => normalizeCandlesWithContinuity([makeBinanceCandle(100, 110, 0)], 0)).toThrow(
      "Invalid lastExistingClose"
    );
    expect(() =>
      normalizeCandlesWithContinuity([makeBinanceCandle(100, 110, 0)], -5)
    ).toThrow("Invalid lastExistingClose");
  });

  it("throws when raw first candle gap exceeds MAX_CANDLE_GAP_RATIO", () => {
    const hugeGap = makeBinanceCandle(1000, 1000 * (1 + MAX_CANDLE_GAP_RATIO + 0.01), 0);
    expect(() => normalizeCandlesWithContinuity([hugeGap], 50000)).toThrow(
      "Candle gap too large"
    );
  });

  it("does not throw when raw first candle gap is within limit", () => {
    const smallGap = makeBinanceCandle(1000, 1000 * (1 + MAX_CANDLE_GAP_RATIO * 0.5), 0);
    expect(() => normalizeCandlesWithContinuity([smallGap], 50000)).not.toThrow();
  });

  it("handles single-candle new batch correctly", () => {
    const newHistorical = [makeBinanceCandle(500, 520, 0)];
    const lastClose = 25000;
    const result = normalizeCandlesWithContinuity(newHistorical, lastClose);

    expect(result).toHaveLength(1);
    expect(result[0].open).toBeCloseTo(lastClose, 0);
    expect(result[0].close).toBeCloseTo((520 / 500) * lastClose, 0);
  });
});
