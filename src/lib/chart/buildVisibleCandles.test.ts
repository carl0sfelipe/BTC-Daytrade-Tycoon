import { describe, it, expect } from "vitest";
import { buildVisibleCandles } from "./buildVisibleCandles";
import type { SimulatedCandle } from "@/lib/binance-api";

function makeCandle(time: number, open: number): SimulatedCandle {
  return {
    time,
    open,
    high: open + 1000,
    low: open - 1000,
    close: open + 500,
    volume: 1,
  };
}

describe("buildVisibleCandles", () => {
  it("builds visible candles with last one projected", () => {
    const candles = [
      makeCandle(0, 50000),
      makeCandle(60, 50500),
      makeCandle(120, 51000),
    ];

    const result = buildVisibleCandles(candles, 1, 52000);

    expect(result).toHaveLength(2);
    expect(result[0].close).toBe(50500); // historical
    expect(result[1].close).toBe(52000); // projected
    expect(result[1].high).toBe(52000);
  });

  it("returns single candle when currentIdx is 0", () => {
    const candles = [makeCandle(0, 50000), makeCandle(60, 50500)];

    const result = buildVisibleCandles(candles, 0, 51000);

    expect(result).toHaveLength(1);
    expect(result[0].close).toBe(51000);
  });

  it("current candle projects high/low from open only (no look-ahead)", () => {
    const candles = [
      makeCandle(0, 50000),
      makeCandle(60, 50500),
    ];

    // currentPrice 51000 is above open (50500) but below historical high (51500)
    const result = buildVisibleCandles(candles, 1, 51000);

    expect(result[1].high).toBe(51000); // projected from open, NOT historical high
    expect(result[1].low).toBe(50500);  // open is the floor
    expect(result[1].close).toBe(51000);
  });

  it("historical candles preserve original high/low", () => {
    const candles = [
      makeCandle(0, 50000),
      makeCandle(60, 50500),
      makeCandle(120, 51000),
    ];

    const result = buildVisibleCandles(candles, 2, 51200);

    // Candle 0 and 1 are historical — preserve original high/low
    expect(result[0].high).toBe(51000);
    expect(result[0].low).toBe(49000);
    expect(result[1].high).toBe(51500);
    expect(result[1].low).toBe(49500);
    // Candle 2 is current — projected from open
    expect(result[2].high).toBe(51200);
    expect(result[2].low).toBe(51000);
  });
});
