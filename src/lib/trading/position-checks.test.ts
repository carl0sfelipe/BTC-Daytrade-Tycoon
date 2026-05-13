import { describe, it, expect } from "vitest";
import { computeLiquidationCheck, computeTrailingStopCheck, computeTpSlCheck } from "./position-checks";

describe("computeLiquidationCheck", () => {
  it("triggers for long when effectiveLow <= liqPrice", () => {
    const result = computeLiquidationCheck({ side: "long", liquidationPrice: 45000 }, 44000, 51000);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("liquidation");
  });

  it("does not trigger for long when effectiveLow > liqPrice", () => {
    const result = computeLiquidationCheck({ side: "long", liquidationPrice: 45000 }, 46000, 51000);
    expect(result.triggered).toBe(false);
  });

  it("triggers for short when effectiveHigh >= liqPrice", () => {
    const result = computeLiquidationCheck({ side: "short", liquidationPrice: 55000 }, 49000, 56000);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("liquidation");
  });
});

describe("computeTrailingStopCheck", () => {
  it("triggers for long when effectiveLow <= trailingStopPrice", () => {
    const result = computeTrailingStopCheck({ side: "long", trailingStopPercent: 5, trailingStopPrice: 47500 }, 47000, 51000);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("trailing_stop");
  });

  it("does not trigger when trailing stop is not set", () => {
    const result = computeTrailingStopCheck({ side: "long", trailingStopPercent: null, trailingStopPrice: null }, 47000, 51000);
    expect(result.triggered).toBe(false);
  });
});

describe("computeTpSlCheck", () => {
  it("triggers SL for long when effectiveLow <= slPrice", () => {
    const result = computeTpSlCheck({ side: "long", tpPrice: null, slPrice: 48000 }, 47000, 51000);
    expect(result.sl.triggered).toBe(true);
    expect(result.sl.reason).toBe("sl");
    expect(result.tp.triggered).toBe(false);
  });

  it("triggers TP for long when effectiveHigh >= tpPrice", () => {
    const result = computeTpSlCheck({ side: "long", tpPrice: 55000, slPrice: null }, 49000, 56000);
    expect(result.tp.triggered).toBe(true);
    expect(result.tp.reason).toBe("tp");
    expect(result.sl.triggered).toBe(false);
  });

  it("triggers both SL and TP when both conditions met", () => {
    const result = computeTpSlCheck({ side: "long", tpPrice: 55000, slPrice: 48000 }, 47000, 56000);
    expect(result.sl.triggered).toBe(true);
    expect(result.tp.triggered).toBe(true);
  });
});
