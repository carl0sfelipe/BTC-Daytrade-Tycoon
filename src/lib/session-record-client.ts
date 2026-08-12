/**
 * Browser-side client for POST /api/sessions — persists a finished
 * simulation run for logged-in users.
 */
import type { TradingSessionInput } from "@/lib/server/session-record-validation";
// Type-only import: erased at compile time, so no server code leaks into the bundle.
import type { RunRankAward } from "@/lib/server/run-rank-service";
import { warnWhenRateLimitedResponse } from "@/lib/rate-limit-warning";

export type { RunRankAward };

export interface EndSessionStatsSnapshot {
  pnl: number;
  trades: number;
  winRate: number;
  returnPercent: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  traderScore: number;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Maps the trading page endStats into the API payload shape.
 *
 * @example const payload = buildSessionRecordPayload({ stats, startingWallet, finalWallet, endReason: "manual" });
 */
export function buildSessionRecordPayload(args: {
  stats: EndSessionStatsSnapshot;
  startingWallet: number;
  finalWallet: number;
  endReason: "manual" | "liquidated";
}): TradingSessionInput {
  const { stats } = args;
  return {
    endReason: args.endReason,
    startingWallet: args.startingWallet,
    finalWallet: args.finalWallet,
    pnl: stats.pnl,
    returnPercent: stats.returnPercent,
    trades: stats.trades,
    winRate: clampPercent(stats.winRate),
    bestTrade: stats.bestTrade,
    worstTrade: stats.worstTrade,
    maxDrawdown: stats.maxDrawdown,
    traderScore: Math.round(stats.traderScore),
  };
}

/**
 * Sends the record to the backend and returns the server-computed run-rank
 * award. Resolves null (never throws) when the user is logged out or the
 * request fails — saving is best-effort.
 *
 * @example const award = await saveTradingSessionRecord(payload);
 */
export async function saveTradingSessionRecord(
  payload: TradingSessionInput
): Promise<RunRankAward | null> {
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    warnWhenRateLimitedResponse("/api/sessions", response);
    if (!response.ok) return null;
    const responseBody = (await response.json()) as { runRank?: RunRankAward };
    return responseBody.runRank ?? null;
  } catch {
    return null;
  }
}
