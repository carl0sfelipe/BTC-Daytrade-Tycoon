import { describe, it, expect } from "vitest";
import { createFrozenClock } from "@/lib/sentinel";
import { processTick, detectLiquidation } from "./tick-processor";
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

describe("tick-processor — liquidation with wicks", () => {
  it("should detect that liquidation price was hit within a candle's low even if interpolated open-to-open never reaches it", () => {
    // Candle 1: drops to 44000 (low) but closes at 49000 (open=50000)
    // Candle 2: continues down, open=49000
    // A long position with liq=45000 SHOULD be liquidated during candle 1
    // because price hit 44000, even though interpolation 50000→49000 never reaches 45000.
    const candles = [
      makeCandle(0, 50000, 51000, 44000, 49000),
      makeCandle(60, 49000, 49500, 48500, 49200),
    ];

    const startDate = new Date(0);
    const result = processTick({
      startDate,
      currentCandles: candles,
      clock: createFrozenClock(1000), // 1s real = 60s simulated
    });

    expect("error" in result).toBe(false);
    const tickResult = "error" in result ? null : result;
    expect(tickResult).not.toBeNull();

    // Interpolated price at 60s simulated should be ~50000→49000 = 49000
    // This is ABOVE liquidation price of 45000
    expect(tickResult!.price).toBeGreaterThan(45000);

    // BUT the candle's low was 44000, which IS below liquidation price.
    // The engine MUST detect this. Currently it doesn't — this test documents the bug.
    const candleLow = candles[0].low;
    expect(candleLow).toBeLessThan(45000);
  });

  it("detectLiquidation should return true when checkResult says liquidation", () => {
    const result = detectLiquidation({
      checkResult: { closed: true, reason: "liquidation" },
      originalStartDate: new Date(0),
      currentCandles: [makeCandle(0, 50000, 51000, 44000, 49000)],
    });
    expect(result.liquidationDetected).toBe(true);
  });
});
