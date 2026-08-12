/**
 * Validation for POST /api/sessions payloads (a completed simulation run).
 * Mirrors the endStats computed in src/app/trading/page.tsx.
 *
 * Known limitation: stats are client-reported, so a motivated user can forge
 * them. Server-side replay verification is future work (see ROADMAP).
 */
import { z } from "zod";

const finiteNumber = z.number().finite();

export const tradingSessionInputSchema = z.object({
  endReason: z.enum(["manual", "liquidated"]),
  startingWallet: finiteNumber.positive("startingWallet must be > 0"),
  finalWallet: finiteNumber.min(0, "finalWallet must be >= 0"),
  pnl: finiteNumber,
  returnPercent: finiteNumber,
  trades: z.number().int().min(1, "a session record needs at least 1 trade"),
  winRate: finiteNumber.min(0).max(100, "winRate must be between 0 and 100"),
  bestTrade: finiteNumber,
  worstTrade: finiteNumber,
  maxDrawdown: finiteNumber,
  traderScore: z.number().int(),
});

export type TradingSessionInput = z.infer<typeof tradingSessionInputSchema>;

/**
 * Validates a session record payload.
 *
 * @example const error = validateTradingSessionInput(body); // string | null
 */
export function validateTradingSessionInput(input: unknown): string | null {
  const result = tradingSessionInputSchema.safeParse(input);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid session payload";
}
