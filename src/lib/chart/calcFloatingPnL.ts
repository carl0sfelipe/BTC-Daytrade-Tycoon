/**
 * Calculates unrealized PnL and ROI for an open position at the current price.
 *
 * @example
 * calcFloatingPnL({ side: "long", entry: 50000, size: 1000, leverage: 10, currentPrice: 51000, realizedPnL: 0 })
 * // => { floatingPnL: 200, floatingRoi: 20 }
 */
export interface FloatingPnLInput {
  side: "long" | "short";
  entry: number;
  size: number;
  leverage: number;
  currentPrice: number;
  realizedPnL?: number;
}

export interface FloatingPnLResult {
  floatingPnL: number;
  floatingRoi: number;
}

export function calcFloatingPnL(
  input: FloatingPnLInput
): FloatingPnLResult | null {
  const { side, entry, size, leverage, currentPrice, realizedPnL = 0 } = input;

  if (entry <= 0) {
    throw new Error(
      `Invalid entry: received ${entry}, expected positive number`
    );
  }
  if (size <= 0) {
    throw new Error(
      `Invalid size: received ${size}, expected positive number`
    );
  }
  if (leverage <= 0) {
    throw new Error(
      `Invalid leverage: received ${leverage}, expected positive number`
    );
  }
  if (currentPrice <= 0) {
    return null;
  }

  const priceDiff =
    side === "long" ? currentPrice - entry : entry - currentPrice;

  const unrealized = (priceDiff / entry) * size;
  const floatingPnL = unrealized + realizedPnL;

  const margin = size / leverage;
  const floatingRoi = margin > 0 ? (unrealized / margin) * 100 : 0;

  return { floatingPnL, floatingRoi };
}
