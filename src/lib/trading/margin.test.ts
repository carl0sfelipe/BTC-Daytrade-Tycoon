import { describe, it, expect } from "vitest";
import { calcSliderMax, calcFlipRequiredMargin, calcAvailableAfterTrade } from "./margin";

describe("calcSliderMax", () => {
  it("returns wallet * leverage when no position", () => {
    expect(calcSliderMax(null, 10000, 10, "long", true, 50000)).toBe(100000);
  });

  it("returns position size in reduce-only mode with opposite side", () => {
    const position = { size: 5000, side: "short" } as const;
    expect(calcSliderMax(position as any, 10000, 10, "long", true, 50000)).toBe(5000);
  });

  it("returns position.size + effective wallet * leverage in hedge mode considering unrealized loss", () => {
    // LONG $5000 @ 50000, wallet=9500, price dropped to 48000
    // closePnl = (48000-50000)/50000 * 5000 = -200
    // returnedMargin = 500
    // effectiveWallet = 9500 + 500 - 200 = 9800
    // max = 5000 (close) + 9800 * 10 (new short) = 5000 + 98000 = 103000
    const position = {
      size: 5000,
      side: "long" as const,
      entry: 50000,
      leverage: 10,
    };
    expect(calcSliderMax(position as any, 9500, 10, "short", false, 48000)).toBe(103000);
  });

  it("returns position.size + effective wallet * leverage in hedge mode considering unrealized profit", () => {
    // LONG $5000 @ 50000, wallet=9500, price rose to 52000
    // closePnl = (52000-50000)/50000 * 5000 = 200
    // returnedMargin = 500
    // effectiveWallet = 9500 + 500 + 200 = 10200
    // max = 5000 (close) + 10200 * 10 (new short) = 5000 + 102000 = 107000
    const position = {
      size: 5000,
      side: "long" as const,
      entry: 50000,
      leverage: 10,
    };
    expect(calcSliderMax(position as any, 9500, 10, "short", false, 52000)).toBe(107000);
  });

  it("flip max includes existing position size — user-reported bug scenario", () => {
    // LONG $50k @ 50000 (10x), wallet=$1000 remaining, no PnL
    // returnedMargin = 50000/10 = 5000
    // effectiveWallet = 1000 + 5000 + 0 = 6000
    // max = 50000 (close) + 6000 * 10 (new short) = 50000 + 60000 = 110000
    const position = {
      size: 50000,
      side: "long" as const,
      entry: 50000,
      leverage: 10,
    };
    expect(calcSliderMax(position as any, 1000, 10, "short", false, 50000)).toBe(110000);
  });

  it("returns wallet * leverage for same-side increase", () => {
    const position = { size: 3000, side: "long" } as const;
    expect(calcSliderMax(position as any, 10000, 10, "long", true, 50000)).toBe(100000);
  });
});

describe("calcFlipRequiredMargin", () => {
  it("calculates excess margin correctly", () => {
    expect(calcFlipRequiredMargin(15000, 5000, 10)).toBe(1000);
  });

  it("returns zero when sizes are equal", () => {
    expect(calcFlipRequiredMargin(5000, 5000, 10)).toBe(0);
  });
});

describe("calcAvailableAfterTrade", () => {
  it("returns wallet - margin for normal open", () => {
    const result = calcAvailableAfterTrade({
      wallet: 10000,
      margin: 100,
      isReduceMode: false,
      reduceOnly: true,
      position: null,
      positionSize: 1000,
      leverage: 10,
      currentPrice: 50000,
    });
    expect(result).toBe(9900);
  });

  it("accounts for returned margin and PnL in hedge flip", () => {
    const position = {
      side: "long" as const,
      entry: 50000,
      size: 5000,
      leverage: 10,
    };

    const result = calcAvailableAfterTrade({
      wallet: 10000,
      margin: 200,
      isReduceMode: true,
      reduceOnly: false,
      position: position as any,
      positionSize: 15000,
      leverage: 10,
      currentPrice: 51000,
    });

    // wallet 10000 + returned margin 500 + closePnl 100 - excess margin 1000 = 9600
    expect(result).toBeCloseTo(9600, 0);
  });
});
