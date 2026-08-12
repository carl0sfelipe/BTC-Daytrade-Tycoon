/**
 * Browser-side client for POST /api/sessions — persists a finished
 * simulation run for logged-in users.
 */
import type { TradingSessionInput } from "@/lib/server/session-record-validation";

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
 * Sends the record to the backend. Resolves false (never throws) when the
 * user is logged out or the request fails — saving is best-effort.
 *
 * @example void saveTradingSessionRecord(payload);
 */
export async function saveTradingSessionRecord(payload: TradingSessionInput): Promise<boolean> {
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}
