"use client";

/**
 * Keeps the server authoritative over diamonds for logged-in users
 * (Winston's "server from day one" decision, party 2026-08-12):
 * - on mount: pulls the server balance from /api/auth/me;
 * - when a call is declared: registers it (POST /api/calls);
 * - when a call resolves: reports the outcome and reconciles the local
 *   mirror with the server-computed payout.
 * Guests fail every request silently and keep the local-only balance.
 */
import { useEffect, useRef } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { fetchCurrentUser } from "@/lib/auth-client";
import { openCallRequest, resolveCallRequest } from "@/lib/calls-client";

export function useCallServerSync(): void {
  const activeCall = useTradingStore((s) => s.activeCall);
  const lastCallResult = useTradingStore((s) => s.lastCallResult);
  const attachServerCallId = useTradingStore((s) => s.attachServerCallId);
  const reconcile = useTradingStore((s) => s.reconcileCallStateFromServer);

  const openSyncedRef = useRef(new Set<string>());
  const resolveSyncedRef = useRef(new Set<string>());

  // Initial balance pull — server wins over the persisted local mirror.
  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser().then((user) => {
      if (user && !cancelled) {
        reconcile(user.diamonds, useTradingStore.getState().callStreak);
      }
    });
    return () => { cancelled = true; };
  }, [reconcile]);

  useEffect(() => {
    if (!activeCall || activeCall.serverId || openSyncedRef.current.has(activeCall.clientId)) {
      return;
    }
    openSyncedRef.current.add(activeCall.clientId);
    void openCallRequest({
      runId: activeCall.runId,
      side: activeCall.side,
      entryPrice: activeCall.entryPrice,
      targetPrice: activeCall.targetPrice,
      leverage: activeCall.leverage,
    }).then((serverId) => {
      if (serverId) attachServerCallId(activeCall.clientId, serverId);
    });
  }, [activeCall, attachServerCallId]);

  useEffect(() => {
    if (!lastCallResult?.serverId || resolveSyncedRef.current.has(lastCallResult.clientId)) {
      return;
    }
    resolveSyncedRef.current.add(lastCallResult.clientId);
    void resolveCallRequest(lastCallResult.serverId, lastCallResult.outcome).then((result) => {
      if (result) reconcile(result.diamonds, result.streak);
    });
  }, [lastCallResult, reconcile]);
}
