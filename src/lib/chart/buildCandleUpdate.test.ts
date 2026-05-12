import { describe, it, expect } from "vitest";
import { buildCandleUpdate } from "./buildCandleUpdate";
import type { SimulatedCandle } from "@/lib/binance-api";

describe("buildCandleUpdate", () => {
  it("builds update with current price as close", () => {
    const candle: SimulatedCandle = {
      time: 1000,
      open: 50000,
      high: 51000,
      low: 49000,
      close: 50500,
      volume: 1,
    };

    const result = buildCandleUpdate(candle, 52000);

    expect(result.time).toBe(1000);
    expect(result.open).toBe(50000);
    expect(result.close).toBe(52000);
    expect(result.high).toBe(52000);
    expect(result.low).toBe(50000);
  });

  it("uses open as low when current price is below open", () => {
    const candle: SimulatedCandle = {
      time: 1000,
      open: 50000,
      high: 51000,
      low: 49000,
      close: 50500,
      volume: 1,
    };

    const result = buildCandleUpdate(candle, 48000);

    expect(result.high).toBe(50000);
    expect(result.low).toBe(48000);
  });
});
