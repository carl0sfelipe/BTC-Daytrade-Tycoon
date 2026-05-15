import { describe, it, expect } from "vitest";
import { createFrozenClock } from "@/lib/sentinel";
import { processTick } from "./tick-processor";
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

/**
 * Deterministic scenario table for wick-based liquidation and limit order execution.
 *
 * Each row represents a candle shape and the expected behavior when the engine
 * processes a tick during that candle.
 */
describe("wick scenarios — deterministic table", () => {
  const startDate = new Date(0);

  it("LONG liq via low: candle dips below liquidation price", () => {
    // Scenario: Long position liq=45000. Candle low=44000.
    const candles = [
      makeCandle(0, 50000, 51000, 44000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    // Interpolated price is above liq, but candleLow is below
    expect(tick.price).toBeGreaterThan(45000);
    expect(tick.candleLow).toBe(44000);
    expect(tick.candleLow).toBeLessThan(45000);
  });

  it("LONG safe despite low: candle low is above liquidation", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 46000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.candleLow).toBe(46000);
    expect(tick.candleLow).toBeGreaterThan(45000);
  });

  it("SHORT liq via high: candle spikes above liquidation", () => {
    const candles = [
      makeCandle(0, 50000, 56000, 49000, 51000),
      makeCandle(60, 51000, 51500, 50500, 51200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.price).toBeLessThan(55000);
    expect(tick.candleHigh).toBe(56000);
    expect(tick.candleHigh).toBeGreaterThan(55000);
  });

  it("SHORT safe despite high: candle high is below liquidation", () => {
    const candles = [
      makeCandle(0, 50000, 54000, 49000, 51000),
      makeCandle(60, 51000, 51500, 50500, 51200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.candleHigh).toBe(54000);
    expect(tick.candleHigh).toBeLessThan(55000);
  });

  it("LIMIT FILL via high: short limit touched by candle wick", () => {
    // Short limit at 51000. Candle high=52000, interpolated only reaches ~50500.
    const candles = [
      makeCandle(0, 50000, 52000, 49000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.price).toBeLessThan(51000);
    expect(tick.candleHigh).toBe(52000);
    expect(tick.candleHigh).toBeGreaterThanOrEqual(51000);
  });

  it("LIMIT NO FILL: candle high is below short limit", () => {
    const candles = [
      makeCandle(0, 50000, 50500, 49500, 50000),
      makeCandle(60, 50000, 50200, 49800, 50100),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.candleHigh).toBe(50500);
    expect(tick.candleHigh).toBeLessThan(51000);
  });

  it("LIMIT FILL via low: long limit touched by candle wick", () => {
    // Long limit at 48000. Candle low=47000, interpolated only reaches ~50250.
    const candles = [
      makeCandle(0, 50000, 51000, 47000, 50500),
      makeCandle(60, 50500, 51000, 50000, 50800),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.price).toBeGreaterThan(48000);
    expect(tick.candleLow).toBe(47000);
    expect(tick.candleLow).toBeLessThanOrEqual(48000);
  });

  it("TP hit via high: long take-profit touched by candle wick", () => {
    const candles = [
      makeCandle(0, 50000, 55000, 49000, 51000),
      makeCandle(60, 51000, 51500, 50500, 51200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.price).toBeLessThan(55000);
    expect(tick.candleHigh).toBe(55000);
    expect(tick.candleHigh).toBeGreaterThanOrEqual(55000);
  });

  it("SL hit via low: long stop-loss touched by candle wick", () => {
    const candles = [
      makeCandle(0, 50000, 51000, 46000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.price).toBeGreaterThan(46000);
    expect(tick.candleLow).toBe(46000);
    expect(tick.candleLow).toBeLessThanOrEqual(48000);
  });

  it("TRAILING STOP hit via low: long trailing stop touched by candle wick", () => {
    // Price is 51500 (above trailing stop at 50400), but candle low=50000 (below trailing stop)
    const candles = [
      makeCandle(0, 52000, 52500, 50000, 51500),
      makeCandle(60, 51500, 51800, 51200, 51600),
    ];

    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(0),
    });

    expect("error" in result).toBe(false);
    const tick = result as Extract<typeof result, { price: number }>;

    expect(tick.price).toBeGreaterThan(50400);
    expect(tick.candleLow).toBe(50000);
    expect(tick.candleLow).toBeLessThanOrEqual(50400);
  });
});
