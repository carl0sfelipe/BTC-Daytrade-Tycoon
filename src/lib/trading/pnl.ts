/**
 * Calculates the liquidation price for a position.
 *
 * Cross-margin model: the entire wallet balance acts as additional margin.
 * Liquidation occurs when the unrealized loss exceeds the position margin
 * plus the free wallet balance.
 *
 * @example
 * calcLiquidationPrice(50000, 10, "long", 1000, 0)     // isolated => 45000
 * calcLiquidationPrice(50000, 10, "long", 1000, 500)   // cross    => 40000
 * calcLiquidationPrice(50000, 10, "short", 1000, 0)    // isolated => 55000
 */
export function calcLiquidationPrice(
  entry: number,
  leverage: number,
  side: "long" | "short",
  size?: number,
  wallet?: number
): number {
  if (leverage <= 0) {
    throw new Error(
      `Invalid leverage: received ${leverage}, expected positive number`
    );
  }

  // Cross margin: total available margin = position margin + free wallet balance
  if (size !== undefined && wallet !== undefined) {
    const positionMargin = size / leverage;
    const totalMargin = positionMargin + wallet;
    const ratio = totalMargin / size;

    if (side === "long") {
      return Math.max(0, entry * (1 - ratio));
    }
    return entry * (1 + ratio);
  }

  // Isolated margin fallback (legacy)
  const multiplier = side === "long" ? 1 - 1 / leverage : 1 + 1 / leverage;
  return entry * multiplier;
}

/**
 * Calculates the trailing stop price based on current position direction.
 *
 * For longs, the stop trails below the price. For shorts, above.
 *
 * @example
 * calcTrailingStopPrice("long", 50000, 2) // => 49000
 * calcTrailingStopPrice("short", 50000, 2) // => 51000
 */
export function calcTrailingStopPrice(
  side: "long" | "short",
  currentPrice: number,
  percent: number
): number {
  const multiplier = side === "long" ? 1 - percent / 100 : 1 + percent / 100;

  return currentPrice * multiplier;
}

/**
 * Calculates the realized PnL for a position being closed.
 *
 * @example
 * calcPositionPnL("long", 50000, 51000, 1000) // => 200
 * calcPositionPnL("short", 50000, 49000, 1000) // => 200
 */
export function calcPositionPnL(
  side: "long" | "short",
  entry: number,
  exit: number,
  size: number
): number {
  if (entry <= 0) {
    throw new Error(
      `Invalid entry: received ${entry}, expected positive number`
    );
  }

  const priceDiff = side === "long" ? exit - entry : entry - exit;

  return (priceDiff / entry) * size;
}

/**
 * Calculates the unrealized PnL for an open position at current price.
 *
 * @example
 * calcUnrealizedPnL("long", 50000, 51000, 1000) // => 200
 */
export function calcUnrealizedPnL(
  side: "long" | "short",
  entry: number,
  currentPrice: number,
  size: number
): number {
  if (entry <= 0) {
    throw new Error(
      `Invalid entry: received ${entry}, expected positive number`
    );
  }

  const priceDiff =
    side === "long" ? currentPrice - entry : entry - currentPrice;

  return (priceDiff / entry) * size;
}
