"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  buildSessionRecordPayload,
  saveTradingSessionRecord,
  type EndSessionStatsSnapshot,
} from "@/lib/session-record-client";

export type SessionEndReason = "manual" | "liquidated";

export interface SessionRecordSaverArgs {
  isLiquidated: boolean;
  stats: EndSessionStatsSnapshot;
  startingWallet: number;
  finalWallet: number;
}

/**
 * Persists each finished session to the backend exactly once — on manual end
 * (call saveSessionRecord) or liquidation (automatic via effect). Sessions
 * without trades are skipped: there is nothing to rank. Saving is best-effort;
 * logged-out users get a silent 401.
 *
 * @example
 * const { saveSessionRecord, resetSessionSaver } = useSessionRecordSaver({
 *   isLiquidated, stats: endStats, startingWallet, finalWallet: wallet,
 * });
 */
export function useSessionRecordSaver(args: SessionRecordSaverArgs): {
  saveSessionRecord: (endReason: SessionEndReason) => void;
  resetSessionSaver: () => void;
} {
  const savedRef = useRef(false);
  // Ref keeps the callback stable while always reading fresh stats at call time.
  const argsRef = useRef(args);
  argsRef.current = args;

  const saveSessionRecord = useCallback((endReason: SessionEndReason) => {
    const current = argsRef.current;
    if (savedRef.current || current.stats.trades === 0) return;
    savedRef.current = true;
    void saveTradingSessionRecord(
      buildSessionRecordPayload({
        stats: current.stats,
        startingWallet: current.startingWallet,
        finalWallet: current.finalWallet,
        endReason,
      })
    );
  }, []);

  useEffect(() => {
    if (args.isLiquidated) saveSessionRecord("liquidated");
  }, [args.isLiquidated, saveSessionRecord]);

  const resetSessionSaver = useCallback(() => {
    savedRef.current = false;
  }, []);

  return { saveSessionRecord, resetSessionSaver };
}
