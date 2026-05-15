/**
 * Calculates breakeven price including the taker fee round-trip.
 *
 * The breakeven is the price at which closing the position covers
 * both the opening and closing taker fees (0.06% each way by default).
 *
 * @example
 * calcBreakevenPrice({ side: "long", entry: 50000, feePct: 0.0006 })
 * // => 50030
 */
export interface BreakevenPriceInput {
  side: "long" | "short";
  entry: number;
  feePct?: number;
}

export function calcBreakevenPrice(input: BreakevenPriceInput): number {
  const { side, entry, feePct = 0.0006 } = input;

  if (entry <= 0) {
    throw new Error(
      `Invalid entry: received ${entry}, expected positive number`
    );
  }
  if (feePct < 0) {
    throw new Error(
      `Invalid feePct: received ${feePct}, expected non-negative number`
    );
  }

  const multiplier = side === "long" ? 1 + feePct : 1 - feePct;

  return entry * multiplier;
}
