import { describe, it, expect } from "vitest";
import { processTick } from "./tick-processor";
import { createFrozenClock } from "@/lib/sentinel";

describe("tick-processor integration", () => {
  it("returns candleLow and candleHigh from active candle", () => {
    const startDate = new Date("2026-05-13T00:00:00Z");
    const candles = [
      { time: Math.floor(startDate.getTime() / 1000), open: 50000, high: 52000, low: 48000, close: 51000 },
      { time: Math.floor(startDate.getTime() / 1000) + 60, open: 51000, high: 53000, low: 50000, close: 52000 },
    ];

    const result = processTick({ startDate, currentCandles: candles as import("@/lib/binance-api").SimulatedCandle[], clock: createFrozenClock(0) });

    if ("error" in result) throw new Error(result.error);
    expect(result.candleLow).toBe(48000);
    expect(result.candleHigh).toBe(52000);
    expect(result.price).toBeGreaterThanOrEqual(48000);
    expect(result.price).toBeLessThanOrEqual(52000);
  });

  it("advances to next candle when time exceeds current", () => {
    const startDate = new Date(Date.now() - 90_000); // 90s ago
    const candles = [
      { time: Math.floor(startDate.getTime() / 1000), open: 50000, high: 51000, low: 49000, close: 50500 },
      { time: Math.floor(startDate.getTime() / 1000) + 60, open: 50500, high: 51500, low: 50000, close: 51000 },
      { time: Math.floor(startDate.getTime() / 1000) + 120, open: 51000, high: 52000, low: 50500, close: 51500 },
    ];

    const result = processTick({ startDate, currentCandles: candles as import("@/lib/binance-api").SimulatedCandle[], clock: createFrozenClock(90_000) });

    if ("error" in result) throw new Error(result.error);
    // After 90s simulated at 60x, we're at 90*60 = 5400s = 90min into simulation
    // The candle should be well past the first one
    expect(result.currentTimeSec).toBeGreaterThan(candles[0].time);
  });

  it("handles boundary at exact candle start", () => {
    const now = Date.now();
    const startDate = new Date(now);
    const candles = [
      { time: Math.floor(startDate.getTime() / 1000), open: 50000, high: 51000, low: 49000, close: 50500 },
      { time: Math.floor(startDate.getTime() / 1000) + 60, open: 50500, high: 51500, low: 50000, close: 51000 },
    ];

    const result = processTick({ startDate, currentCandles: candles as import("@/lib/binance-api").SimulatedCandle[], clock: createFrozenClock(0) });

    if ("error" in result) throw new Error(result.error);
    expect(result.candleLow).toBe(49000);
    expect(result.candleHigh).toBe(51000);
  });
});
