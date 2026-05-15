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

  it("preserves original high/low for current candle when price is within range", () => {
    const candles = [
      makeCandle(0, 50000),
      makeCandle(60, 50500),
    ];

    // currentPrice 51000 is between low (49500) and high (51500) of candle 1
    const result = buildVisibleCandles(candles, 1, 51000);

    expect(result[1].high).toBe(51500); // original high preserved
    expect(result[1].low).toBe(49500);  // original low preserved
    expect(result[1].close).toBe(51000);
  });

  it("extends high when current price exceeds original high", () => {
    const candles = [
      makeCandle(0, 50000),
      makeCandle(60, 50500),
    ];

    const result = buildVisibleCandles(candles, 1, 53000);

    expect(result[1].high).toBe(53000); // currentPrice > original high
    expect(result[1].low).toBe(49500);  // original low preserved
  });
});
