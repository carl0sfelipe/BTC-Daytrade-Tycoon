/**
 * Validates TP and SL prices relative to the entry price and position side.
 *
 * Returns an error message string if invalid, or null if valid.
 *
 * @example
 * validateTpSl("long", 50000, 55000, 48000) // => null
 * validateTpSl("long", 50000, 45000, 48000) // => "Invalid TP: ..."
 */
export function validateTpSl(
  side: "long" | "short",
  entryPrice: number,
  tpPrice: number | null,
  slPrice: number | null
): string | null {
  if (tpPrice && tpPrice > 0) {
    if (side === "long" && entryPrice >= tpPrice) {
      return `Invalid TP: for LONG the Take Profit must be ABOVE entry ($${entryPrice.toFixed(2)}). Enter a value > $${entryPrice.toFixed(2)}.`;
    }
    if (side === "short" && entryPrice <= tpPrice) {
      return `Invalid TP: for SHORT the Take Profit must be BELOW entry ($${entryPrice.toFixed(2)}). Enter a value < $${entryPrice.toFixed(2)}.`;
    }
  }

  if (slPrice && slPrice > 0) {
    if (side === "long" && entryPrice <= slPrice) {
      return `Invalid SL: for LONG the Stop Loss must be BELOW entry ($${entryPrice.toFixed(2)}). Enter a value < $${entryPrice.toFixed(2)}.`;
    }
    if (side === "short" && entryPrice >= slPrice) {
      return `Invalid SL: for SHORT the Stop Loss must be ABOVE entry ($${entryPrice.toFixed(2)}). Enter a value > $${entryPrice.toFixed(2)}.`;
    }
  }

  return null;
}

/**
 * Validates basic open position parameters.
 *
 * Returns an error message string if invalid, or null if valid.
 */
export function validateTpSlCurrentPrice(
  side: "long" | "short",
  currentPrice: number,
  tpPrice: number | null,
  slPrice: number | null
): string | null {
  if (tpPrice && tpPrice > 0) {
    if (side === "long" && currentPrice >= tpPrice) {
      return `Invalid TP: for LONG the Take Profit must be ABOVE the current price ($${currentPrice.toFixed(2)}). Enter a value > $${currentPrice.toFixed(2)}.`;
    }
    if (side === "short" && currentPrice <= tpPrice) {
      return `Invalid TP: for SHORT the Take Profit must be BELOW the current price ($${currentPrice.toFixed(2)}). Enter a value < $${currentPrice.toFixed(2)}.`;
    }
  }

  if (slPrice && slPrice > 0) {
    if (side === "long" && currentPrice <= slPrice) {
      return `Invalid SL: for LONG the Stop Loss must be BELOW the current price ($${currentPrice.toFixed(2)}). Enter a value < $${currentPrice.toFixed(2)}.`;
    }
    if (side === "short" && currentPrice >= slPrice) {
      return `Invalid SL: for SHORT the Stop Loss must be ABOVE the current price ($${currentPrice.toFixed(2)}). Enter a value > $${currentPrice.toFixed(2)}.`;
    }
  }

  return null;
}

export function validateOpenPosition(
  entryPrice: number,
  size: number,
  leverage: number,
  wallet: number,
  margin: number
): string | null {
  if (!entryPrice || entryPrice <= 0) {
    return "Invalid entry price";
  }
  if (!size || size <= 0) {
    return "Position size must be greater than 0";
  }
  if (!leverage || leverage <= 0) {
    return "Leverage must be greater than 0";
  }
  if (wallet < margin) {
    return "Insufficient wallet balance";
  }

  return null;
}
