import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOrderCapabilities } from "./useOrderCapabilities";
import type { Position } from "@/store/domain-types";

describe("useOrderCapabilities — flip bug reproduction", () => {
  it("canFlip is false when position is in loss and size exceeds effective wallet capacity", () => {
    const position: Position = {
      side: "long",
      entry: 50000,
      size: 5000,
      leverage: 10,
      liquidationPrice: 45000,
      tpPrice: null,
      slPrice: null,
      trailingStopPercent: null,
      trailingStopPrice: null,
      entryTime: "now",
      entryTimestamp: 0,
      realizedPnL: 0,
    maxDrawdown: 0,
    peakUnrealizedPnl: 0,
    };

    // Wallet after opening $5000 @ 10x = 10000 - 500 = 9500
    // Current price dropped to 48000
    // closePnl = (48000-50000)/50000 * 5000 = -200
    // returnedMargin = 5000/10 = 500
    // effectiveWallet = 9500 + 500 - 200 = 9800
    // newMargin for 105000 @ 10x = 10500
    // 9800 < 10500 → should NOT be able to flip

    const { result } = renderHook(() =>
      useOrderCapabilities(
        9500, // wallet
        position,
        "short", // opposite side
        10,
        105000, // size = what calcSliderMax returns (5000 + 10000*10)
        48000, // currentPrice — position is losing
        false // reduceOnly = false (hedge mode)
      )
    );

    expect(result.current.canFlip).toBe(false);
  });

  it("canFlip is true when position is in profit and size is within capacity", () => {
    const position: Position = {
      side: "long",
      entry: 50000,
      size: 5000,
      leverage: 10,
      liquidationPrice: 45000,
      tpPrice: null,
      slPrice: null,
      trailingStopPercent: null,
      trailingStopPrice: null,
      entryTime: "now",
      entryTimestamp: 0,
      realizedPnL: 0,
    maxDrawdown: 0,
    peakUnrealizedPnl: 0,
    };

    // Current price rose to 52000
    // closePnl = (52000-50000)/50000 * 5000 = 200
    // returnedMargin = 500
    // effectiveWallet = 9500 + 500 + 200 = 10200
    // sliderMax = 5000 + 10200*10 = 107000
    // At 105000: excessMargin = (105000-5000)/10 = 10000 ≤ 10200 → true
    const { result } = renderHook(() =>
      useOrderCapabilities(
        9500,
        position,
        "short",
        10,
        105000,
        52000,
        false
      )
    );

    expect(result.current.canFlip).toBe(true);

    // At sliderMax (107000): excessMargin = (107000-5000)/10 = 10200 = effectiveWallet → true
    const { result: result2 } = renderHook(() =>
      useOrderCapabilities(
        9500,
        position,
        "short",
        10,
        107000,
        52000,
        false
      )
    );

    expect(result2.current.canFlip).toBe(true);

    // Above sliderMax (107001): excessMargin = 10200.1 > 10200 → false
    const { result: result3 } = renderHook(() =>
      useOrderCapabilities(
        9500,
        position,
        "short",
        10,
        107001,
        52000,
        false
      )
    );

    expect(result3.current.canFlip).toBe(false);
  });

  it("canFlip is false when positionSize does not exceed existing position (reduce mode)", () => {
    const position: Position = {
      side: "long",
      entry: 50000,
      size: 5000,
      leverage: 10,
      liquidationPrice: 45000,
      tpPrice: null,
      slPrice: null,
      trailingStopPercent: null,
      trailingStopPrice: null,
      entryTime: "now",
      entryTimestamp: 0,
      realizedPnL: 0,
      maxDrawdown: 0,
      peakUnrealizedPnl: 0,
    };

    // positionSize = 3000 ≤ position.size = 5000 → reduce, not flip
    const { result } = renderHook(() =>
      useOrderCapabilities(9500, position, "short", 10, 3000, 50000, false)
    );

    expect(result.current.canFlip).toBe(false);
  });
});
