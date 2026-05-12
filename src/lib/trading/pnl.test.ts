import { describe, it, expect } from "vitest";
import {
  calcLiquidationPrice,
  calcTrailingStopPrice,
  calcPositionPnL,
  calcUnrealizedPnL,
} from "./pnl";

describe("calcLiquidationPrice", () => {
  it("calculates long liquidation correctly", () => {
    expect(calcLiquidationPrice(50000, 10, "long")).toBe(45000);
  });

  it("calculates short liquidation correctly", () => {
    expect(calcLiquidationPrice(50000, 10, "short")).toBeCloseTo(55000, 0);
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
