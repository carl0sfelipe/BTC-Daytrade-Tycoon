import { describe, it, expect } from "vitest";
import { calcFloatingPnL } from "./calcFloatingPnL";

describe("calcFloatingPnL", () => {
  it("calculates positive PnL and ROI for long", () => {
    const result = calcFloatingPnL({
      side: "long",
      entry: 50000,
      size: 1000,
      leverage: 10,
      currentPrice: 51000,
    });
    expect(result).not.toBeNull();
    expect(result!.floatingPnL).toBeCloseTo(20, 2);
    expect(result!.floatingRoi).toBeCloseTo(20, 2);
  });

  it("calculates negative PnL and ROI for long", () => {
    const result = calcFloatingPnL({
      side: "long",
      entry: 50000,
      size: 1000,
      leverage: 10,
      currentPrice: 49000,
    });
    expect(result).not.toBeNull();
    expect(result!.floatingPnL).toBeCloseTo(-20, 2);
    expect(result!.floatingRoi).toBeCloseTo(-20, 2);
  });

  it("calculates positive PnL for short when price drops", () => {
    const result = calcFloatingPnL({
      side: "short",
      entry: 50000,
      size: 1000,
      leverage: 10,
      currentPrice: 49000,
    });
    expect(result).not.toBeNull();
    expect(result!.floatingPnL).toBeCloseTo(20, 2);
  });

  it("includes prior realizedPnL", () => {
    const result = calcFloatingPnL({
      side: "long",
      entry: 50000,
      size: 1000,
      leverage: 10,
      currentPrice: 51000,
      realizedPnL: 50,
    });
    expect(result!.floatingPnL).toBeCloseTo(70, 2);
  });

  it("returns null for non-positive currentPrice", () => {
    const result = calcFloatingPnL({
      side: "long",
      entry: 50000,
      size: 1000,
      leverage: 10,
      currentPrice: 0,
    });
    expect(result).toBeNull();
  });

  it("throws for non-positive entry", () => {
    expect(() =>
      calcFloatingPnL({
        side: "long",
        entry: 0,
        size: 1000,
        leverage: 10,
        currentPrice: 50000,
      })
    ).toThrowError(/Invalid entry: received 0, expected positive number/);
  });

  it("throws for non-positive size", () => {
    expect(() =>
      calcFloatingPnL({
        side: "long",
        entry: 50000,
        size: 0,
        leverage: 10,
        currentPrice: 50000,
      })
    ).toThrowError(/Invalid size: received 0, expected positive number/);
  });

  it("throws for non-positive leverage", () => {
    expect(() =>
      calcFloatingPnL({
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 0,
        currentPrice: 50000,
      })
    ).toThrowError(/Invalid leverage: received 0, expected positive number/);
  });
});
