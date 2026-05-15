import { describe, it, expect } from "vitest";
import { interpolatePrice, getCurrentCandle } from "./binance-api";
import type { SimulatedCandle } from "./binance-api";

function makeCandle(
  time: number,
  open: number,
  high: number,
  low: number,
  close: number
): SimulatedCandle {
  return { time, open, high, low, close, volume: 100 };
}

describe("interpolatePrice — wick awareness documentation", () => {
  it("short limit order at 51000 would NOT execute on interpolated price alone (open-to-open)", () => {
    const candles = [
      makeCandle(0, 50000, 52000, 49000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const priceAt30s = interpolatePrice(candles, 30);
    expect(priceAt30s).toBe(49500);
    expect(priceAt30s).toBeLessThan(51000);
  });

  it("long limit order at 48000 would NOT execute on interpolated price alone", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 47000, 50500),
      makeCandle(60, 50500, 51000, 50000, 50800),
    ];

    const priceAt30s = interpolatePrice(candles, 30);
    expect(priceAt30s).toBe(50250);
    expect(priceAt30s).toBeGreaterThan(48000);
  });

  it("liquidation at 45000 is missed by interpolation but caught by candle low", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 44000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const priceAt30s = interpolatePrice(candles, 30);
    expect(priceAt30s).toBe(49500);
    expect(priceAt30s).toBeGreaterThan(45000);

    const candle = getCurrentCandle(candles, 30);
    expect(candle).not.toBeNull();
    expect(candle!.low).toBe(44000);
    expect(candle!.low).toBeLessThan(45000);
  });
});

describe("getCurrentCandle", () => {
  it("returns the candle that contains the given simulated time", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 49000, 50500),
      makeCandle(60, 51000, 52000, 50000, 51500),
    ];

    expect(getCurrentCandle(candles, 30)).toBe(candles[0]);
    expect(getCurrentCandle(candles, 60)).toBe(candles[1]);
    expect(getCurrentCandle(candles, 90)).toBe(candles[1]);
  });

  it("returns first candle when time is before first candle", () => {
    const candles = [makeCandle(100, 50000, 51000, 49000, 50500)];
    expect(getCurrentCandle(candles, 50)).toBe(candles[0]);
  });

  it("returns last candle when time is at or after last candle", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 49000, 50500),
      makeCandle(60, 51000, 52000, 50000, 51500),
    ];
    expect(getCurrentCandle(candles, 120)).toBe(candles[1]);
  });

  it("returns null for empty array", () => {
    expect(getCurrentCandle([], 30)).toBeNull();
  });
});
