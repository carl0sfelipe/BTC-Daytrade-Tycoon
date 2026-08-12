"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTradingStore } from "@/store/tradingStore";
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
  // Staleness token: a slow /api/sessions response must not paint a previous
  // run's rank award onto the run the player already started.
  const runTokenRef = useRef(0);
  // Ref keeps the callback stable while always reading fresh stats at call time.
  const argsRef = useRef(args);
  argsRef.current = args;

  const saveSessionRecord = useCallback((endReason: SessionEndReason) => {
    const current = argsRef.current;
    if (savedRef.current || current.stats.trades === 0) return;
    savedRef.current = true;
    const runToken = runTokenRef.current;
    void saveTradingSessionRecord(
      buildSessionRecordPayload({
        stats: current.stats,
        startingWallet: current.startingWallet,
        finalWallet: current.finalWallet,
        endReason,
      })
    ).then((award) => {
      // Server-authoritative rank reward — feeds the end-of-run recap.
      if (award && runTokenRef.current === runToken) {
        useTradingStore.getState().recordRunRankAward(award);
      }
    });
  }, []);

  useEffect(() => {
    if (args.isLiquidated) saveSessionRecord("liquidated");
  }, [args.isLiquidated, saveSessionRecord]);

  const resetSessionSaver = useCallback(() => {
    savedRef.current = false;
    // Invalidates any in-flight award from the run that just ended.
    runTokenRef.current += 1;
  }, []);

  return { saveSessionRecord, resetSessionSaver };
}
