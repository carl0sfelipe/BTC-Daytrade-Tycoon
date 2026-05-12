import type { Position } from "@/store/tradingStore";
import { calcPositionPnL } from "./pnl";

/**
 * Calculates the maximum position size allowed for the slider.
 *
 * Depends on whether there's an open position, the mode (reduce only vs hedge),
 * and the selected side.
 *
 * @example
 * calcSliderMax(null, 10000, 10, "long", true) // => 100000
 * calcSliderMax({ size: 5000 }, 10000, 10, "short", true) // => 5000
 */
export function calcSliderMax(
  position: Position | null,
  wallet: number,
  leverage: number,
  side: "long" | "short",
  reduceOnly: boolean
): number {
  const safeLeverage = leverage || 1;

  if (!position) {
    return Math.max(100, Math.floor(wallet * safeLeverage));
  }

  const isReduceMode = side !== position.side;

  if (isReduceMode && reduceOnly) {
    return Math.max(100, Math.floor(position.size));
  }

  if (isReduceMode && !reduceOnly) {
    return Math.max(
      100,
      Math.floor(position.size + wallet * safeLeverage)
    );
  }

  return Math.max(100, Math.floor(wallet * safeLeverage));
}

/**
 * Calculates the margin required for the excess portion of a hedge flip.
 *
 * When flipping, the existing position is closed and a new one is opened
 * with the excess size.
 *
 * @example
 * calcFlipRequiredMargin(15000, 5000, 10) // => 1000 (excess 10000 / 10)
 */
export function calcFlipRequiredMargin(
  positionSize: number,
  existingSize: number,
  leverage: number
): number {
  const excessSize = positionSize - existingSize;

  return excessSize / leverage;
}

/**
 * Calculates the wallet balance available after a trade.
 *
 * Accounts for hedge mode flips where existing margin + PnL is returned.
 */
export function calcAvailableAfterTrade(params: {
  wallet: number;
  margin: number;
  isReduceMode: boolean;
  reduceOnly: boolean;
  position: Position | null;
  positionSize: number;
  leverage: number;
  currentPrice: number;
}): number {
  const {
    wallet,
    margin,
    isReduceMode,
    reduceOnly,
    position,
    positionSize,
    leverage,
    currentPrice,
  } = params;

  if (!isReduceMode || reduceOnly || !position || positionSize <= position.size) {
    return wallet - margin;
  }

  // Hedge mode flip: existing margin + PnL returned, then excess margin deducted
  const closePnl = calcPositionPnL(
    position.side,
    position.entry,
    currentPrice,
    position.size
  );
  const returnedMargin = position.size / position.leverage;
  const excessMargin = calcFlipRequiredMargin(
    positionSize,
    position.size,
    leverage
  );

  return wallet + returnedMargin + closePnl - excessMargin;
}
