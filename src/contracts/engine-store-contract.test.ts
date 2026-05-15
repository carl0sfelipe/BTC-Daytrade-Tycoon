import { describe, it, expect } from "vitest";
import { createFrozenClock } from "@/lib/sentinel";
import { processTick } from "@/lib/engine/tick-processor";
import type { SimulatedCandle } from "@/lib/binance-api";

function makeCandle(
  time: number,
  open: number,
  high: number,
  low: number,
  close: number
): SimulatedCandle {
  return { time, open, high, low, close, volume: 100 };
}

describe("Contract: Engine → Store (TickResult)", () => {
  const startDate = new Date(0);

  it("TickResult contains price, candleLow, and candleHigh", () => {
    const candles = [makeCandle(0, 50000, 51000, 49000, 50500)];
    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick).toHaveProperty("price");
    expect(tick).toHaveProperty("candleLow");
    expect(tick).toHaveProperty("candleHigh");
  });

  it("candleLow <= price <= candleHigh", () => {
    const candles = [makeCandle(0, 50000, 52000, 48000, 51000)];
    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.candleLow).toBeLessThanOrEqual(tick.price);
    expect(tick.candleHigh).toBeGreaterThanOrEqual(tick.price);
  });

  it("candleLow and candleHigh come from the active candle", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 49000, 50500),
      makeCandle(60, 51000, 53000, 50000, 52000),
    ];
    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    // At time=0, the active candle is the first one
    expect(tick.candleLow).toBe(49000);
    expect(tick.candleHigh).toBe(51000);
  });

  it("returns last candle close when time is beyond last candle", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 49000, 50500),
      makeCandle(60, 51000, 52000, 50000, 51500),
    ];
    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(100000), // far in the past
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.candleLow).toBe(50000);
    expect(tick.candleHigh).toBe(52000);
  });

  it("returns first candle open when time is before first candle", () => {
    const candles = [makeCandle(100, 50000, 51000, 49000, 50500)];
    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.candleLow).toBe(49000);
    expect(tick.candleHigh).toBe(51000);
  });
});
