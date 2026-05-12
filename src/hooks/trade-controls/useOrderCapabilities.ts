"use client";

import { useMemo } from "react";
import type { Position } from "@/store/tradingStore";
import { calcSliderMax } from "@/lib/trading";

export interface OrderCapabilities {
  safeLeverage: number;
  margin: number;
  canOpen: boolean;
  isReduceMode: boolean;
  sliderMax: number;
  canIncrease: boolean;
  canDecrease: boolean;
  canFlip: boolean;
}

/**
 * Derives order capabilities from current state.
 *
 * These are pure computations used to determine which actions are available
 * and what UI labels to show.
 */
export function useOrderCapabilities(
  wallet: number,
  position: Position | null,
  side: "long" | "short",
  leverage: number,
  positionSize: number,
  currentPrice: number,
  reduceOnly: boolean
): OrderCapabilities {
  return useMemo(() => {
    const safeLeverage = leverage || 1;
    const margin = positionSize / safeLeverage;
    const canOpen = wallet >= margin;
    const isReduceMode = !!(position && side !== position.side);

    const sliderMax = calcSliderMax(
      position,
      wallet,
      leverage,
      side,
      reduceOnly
    );

    const canIncrease =
      positionSize > 0 && wallet >= positionSize / safeLeverage;
    const canDecrease = !!(
      position &&
      positionSize > 0 &&
      positionSize <= position.size
    );

    const canFlip = (() => {
      if (!position || positionSize <= 0 || reduceOnly || !isReduceMode) {
        return false;
      }
      if (positionSize <= position.size) return true;

      const priceDiff =
        position.side === "long"
          ? currentPrice - position.entry
          : position.entry - currentPrice;
      const closePnl = (priceDiff / position.entry) * position.size;
      const returnedMargin = position.size / position.leverage;
      const excessSize = positionSize - position.size;
      const excessMargin = excessSize / leverage;

      return wallet + returnedMargin + closePnl >= excessMargin;
    })();

    return {
      safeLeverage,
      margin,
      canOpen,
      isReduceMode,
      sliderMax,
      canIncrease,
      canDecrease,
      canFlip,
    };
  }, [wallet, position, side, leverage, positionSize, currentPrice, reduceOnly]);
}
