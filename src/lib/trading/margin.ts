import type { Position } from "@/store/tradingStore";
import { calcPositionPnL } from "./pnl";

/**
 * Calculates the maximum position size allowed for the slider.
 *
 * Depends on whether there's an open position, the mode (reduce only vs hedge),
 * the selected side, and the current market price (to account for unrealized PnL
 * when flipping).
 *
 * @example
 * calcSliderMax(null, 10000, 10, "long", true, 50000) // => 100000
 * calcSliderMax({ size: 5000, side: "long", entry: 50000, leverage: 10 }, 9500, 10, "short", false, 48000)
 * // effectiveWallet = 9500 + 500 + (-200) = 9800 → 98000
 */
export function calcSliderMax(
  position: Position | null,
  wallet: number,
  leverage: number,
  side: "long" | "short",
  reduceOnly: boolean,
  currentPrice: number
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
    const priceDiff =
      position.side === "long"
        ? currentPrice - position.entry
        : position.entry - currentPrice;
    const closePnl = (priceDiff / position.entry) * position.size;
    const returnedMargin = position.size / position.leverage;
    const effectiveWallet = wallet + returnedMargin + closePnl;
    // Slider represents total order: close (position.size) + open new position
    return Math.max(100, Math.floor(position.size + effectiveWallet * safeLeverage));
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
