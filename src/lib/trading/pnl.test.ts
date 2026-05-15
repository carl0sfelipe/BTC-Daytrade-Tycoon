import { describe, it, expect } from "vitest";
import {
  calcLiquidationPrice,
  calcTrailingStopPrice,
  calcPositionPnL,
  calcUnrealizedPnL,
} from "./pnl";

describe("calcLiquidationPrice", () => {
  it("calculates long liquidation correctly (isolated)", () => {
    expect(calcLiquidationPrice(50000, 10, "long")).toBe(45000);
  });

  it("calculates short liquidation correctly (isolated)", () => {
    expect(calcLiquidationPrice(50000, 10, "short")).toBeCloseTo(55000, 0);
  });

  it("cross margin: large wallet pushes liq far away", () => {
    // size=1000, leverage=125, wallet=992
    // totalMargin = 8 + 992 = 1000 => ratio = 1 => liq = 0
    expect(calcLiquidationPrice(50000, 125, "long", 1000, 992)).toBe(0);
  });

  it("cross margin: partial wallet gives intermediate liq", () => {
    // size=1000, leverage=10, wallet=450
    // totalMargin = 100 + 450 = 550 => ratio = 0.55 => liq = 22500
    expect(calcLiquidationPrice(50000, 10, "long", 1000, 450)).toBeCloseTo(22500, 0);
  });

  it("cross margin: short uses wallet as buffer", () => {
    // size=1000, leverage=10, wallet=450
    // totalMargin = 100 + 450 = 550 => ratio = 0.55 => liq = 77500
    expect(calcLiquidationPrice(50000, 10, "short", 1000, 450)).toBe(77500);
  });

  it("throws for non-positive leverage", () => {
    expect(() => calcLiquidationPrice(50000, 0, "long")).toThrow(
      /Invalid leverage: received 0, expected positive number/
    );
  });
});

describe("calcTrailingStopPrice", () => {
  it("trails below for long", () => {
    expect(calcTrailingStopPrice("long", 50000, 2)).toBe(49000);
  });

  it("trails above for short", () => {
    expect(calcTrailingStopPrice("short", 50000, 2)).toBe(51000);
  });
});

describe("calcPositionPnL", () => {
  it("returns positive for long when price rises", () => {
    expect(calcPositionPnL("long", 50000, 51000, 1000)).toBe(20);
  });

  it("returns negative for long when price drops", () => {
    expect(calcPositionPnL("long", 50000, 49000, 1000)).toBe(-20);
  });

  it("returns positive for short when price drops", () => {
    expect(calcPositionPnL("short", 50000, 49000, 1000)).toBe(20);
  });

  it("throws for non-positive entry", () => {
    expect(() => calcPositionPnL("long", 0, 50000, 1000)).toThrow(
      /Invalid entry: received 0, expected positive number/
    );
  });
});

describe("calcUnrealizedPnL", () => {
  it("matches calcPositionPnL with current price as exit", () => {
    const entry = 50000;
    const current = 51000;
    const size = 1000;

    expect(calcUnrealizedPnL("long", entry, current, size)).toBe(
      calcPositionPnL("long", entry, current, size)
    );
  });
});
