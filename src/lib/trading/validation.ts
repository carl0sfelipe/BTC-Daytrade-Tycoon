import { enGameMessages, type GameMessages } from "@/lib/i18n/messages/en";

/** Locale-resolved copy for order validation errors (Loop B i18n debt). */
export type TradingValidationMessages = GameMessages["tradingValidation"];

/**
 * Validates TP and SL prices relative to the entry price and position side.
 *
 * Returns an error message string if invalid, or null if valid. The messages
 * parameter defaults to English so non-UI callers stay locale-free; the store
 * injects the player's locale catalog.
 *
 * @example
 * validateTpSl("long", 50000, 55000, 48000) // => null
 * validateTpSl("long", 50000, 45000, 48000) // => "Invalid TP: ..."
 */
export function validateTpSl(
  side: "long" | "short",
  entryPrice: number,
  tpPrice: number | null,
  slPrice: number | null,
  messages: TradingValidationMessages = enGameMessages.tradingValidation
): string | null {
  const entry = entryPrice.toFixed(2);
  if (tpPrice && tpPrice > 0) {
    if (side === "long" && entryPrice >= tpPrice) return messages.tpAboveEntry(entry);
    if (side === "short" && entryPrice <= tpPrice) return messages.tpBelowEntry(entry);
  }
  if (slPrice && slPrice > 0) {
    if (side === "long" && entryPrice <= slPrice) return messages.slBelowEntry(entry);
    if (side === "short" && entryPrice >= slPrice) return messages.slAboveEntry(entry);
  }
  return null;
}

/**
 * Validates TP and SL prices against the current market price (used when
 * editing an open position). Returns an error message string or null.
 *
 * @example validateTpSlCurrentPrice("long", 50000, 55000, 48000) // => null
 */
export function validateTpSlCurrentPrice(
  side: "long" | "short",
  currentPrice: number,
  tpPrice: number | null,
  slPrice: number | null,
  messages: TradingValidationMessages = enGameMessages.tradingValidation
): string | null {
  const current = currentPrice.toFixed(2);
  if (tpPrice && tpPrice > 0) {
    if (side === "long" && currentPrice >= tpPrice) return messages.tpAboveCurrent(current);
    if (side === "short" && currentPrice <= tpPrice) return messages.tpBelowCurrent(current);
  }
  if (slPrice && slPrice > 0) {
    if (side === "long" && currentPrice <= slPrice) return messages.slBelowCurrent(current);
    if (side === "short" && currentPrice >= slPrice) return messages.slAboveCurrent(current);
  }
  return null;
}

/**
 * Validates basic open position parameters.
 *
 * Returns an error message string if invalid, or null if valid.
 *
 * @example validateOpenPosition(50000, 1000, 10, 10000, 100) // => null
 */
export function validateOpenPosition(
  entryPrice: number,
  size: number,
  leverage: number,
  wallet: number,
  margin: number,
  messages: TradingValidationMessages = enGameMessages.tradingValidation
): string | null {
  if (!entryPrice || entryPrice <= 0) return messages.invalidEntryPrice;
  if (!size || size <= 0) return messages.sizeMustBePositive;
  if (!leverage || leverage <= 0) return messages.leverageMustBePositive;
  if (wallet < margin) return messages.insufficientBalance;
  return null;
}
