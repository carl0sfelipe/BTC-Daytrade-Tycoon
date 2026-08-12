import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";
import type { Trade } from "../domain-types";
import {
  buildCallFromPosition,
  computeCallResolution,
  resolveCallOutcome,
  type ActiveCall,
  type CallOutcome,
} from "@/lib/calls/call-transitions";
import { generateId } from "@/lib/trading";
import { logger } from "@/lib/logger";
import type { RunRankAward } from "@/lib/session-record-client";

export interface ResolvedCallSnapshot {
  clientId: string;
  serverId: string | null;
  outcome: CallOutcome;
  reward: number;
  streak: number;
  targetPercent: number;
  leverage: number;
  resolvedAt: number;
}

/**
 * Called-shot state (see PRD_ROGUELIKE_PVP.md). `diamonds`/`callStreak` are a
 * local mirror: authoritative for guests, reconciled from the server response
 * for logged-in users (useCallServerSync).
 */
export interface CallsSlice {
  activeCall: ActiveCall | null;
  diamonds: number;
  callStreak: number;
  callRunId: string;
  diamondsThisRun: number;
  lastRewardedCallAt: number | null;
  lastCallResult: ResolvedCallSnapshot | null;
  /** Every call resolved this run, in order — feeds the end-of-run recap. */
  runCallLog: ResolvedCallSnapshot[];
  /** Server-computed daily-ranking award for the run just saved (null for guests). */
  runRankAward: RunRankAward | null;
  declareCallFromPosition: () => void;
  resolveActiveCall: (reason: Trade["reason"] | "tp_changed") => void;
  voidActiveCallOnTpChange: (newTpPrice: number | null) => void;
  attachServerCallId: (clientId: string, serverId: string) => void;
  reconcileCallStateFromServer: (diamonds: number, streak: number) => void;
  recordRunRankAward: (award: RunRankAward) => void;
  resetCallRun: () => void;
  clearLastCallResult: () => void;
}

export const createCallsSlice: StateCreator<TradingStore, [], [], CallsSlice> = (set, get) => ({
  activeCall: null,
  diamonds: 0,
  callStreak: 0,
  callRunId: generateId(),
  diamondsThisRun: 0,
  lastRewardedCallAt: null,
  lastCallResult: null,
  runCallLog: [],
  runRankAward: null,

  declareCallFromPosition: () => {
    const { position, activeCall, callStreak, callRunId } = get();
    if (!position || activeCall) return;
    const call = buildCallFromPosition(position, callStreak, callRunId, generateId(), Date.now());
    if (!call) return;
    logger.log(`[declareCall] 🎯 ${call.side} +${call.targetPercent.toFixed(2)}% @ ${call.leverage}x → ${call.potentialReward}💎`);
    set({ activeCall: call });
  },

  resolveActiveCall: (reason) => {
    const { activeCall, callStreak, diamondsThisRun, lastRewardedCallAt, diamonds, runCallLog } = get();
    if (!activeCall) return;
    const outcome = resolveCallOutcome(reason);
    const now = Date.now();
    const res = computeCallResolution(
      activeCall, outcome, callStreak, diamondsThisRun, lastRewardedCallAt, now
    );
    logger.log(`[resolveCall] ${outcome} reward=${res.reward}💎 streak=${res.newStreak}`);
    const snapshot: ResolvedCallSnapshot = {
      clientId: activeCall.clientId,
      serverId: activeCall.serverId,
      outcome,
      reward: res.reward,
      streak: res.newStreak,
      targetPercent: activeCall.targetPercent,
      leverage: activeCall.leverage,
      resolvedAt: now,
    };
    set({
      activeCall: null,
      diamonds: diamonds + res.reward,
      callStreak: res.newStreak,
      diamondsThisRun: diamondsThisRun + res.reward,
      lastRewardedCallAt: res.reward > 0 ? now : lastRewardedCallAt,
      lastCallResult: snapshot,
      runCallLog: [...runCallLog, snapshot],
    });
  },

  voidActiveCallOnTpChange: (newTpPrice) => {
    const { activeCall } = get();
    if (!activeCall || newTpPrice === null) return;
    if (newTpPrice === activeCall.targetPrice) return;
    get().resolveActiveCall("tp_changed");
  },

  attachServerCallId: (clientId, serverId) => {
    const { activeCall, lastCallResult } = get();
    if (activeCall?.clientId === clientId) {
      set({ activeCall: { ...activeCall, serverId } });
    } else if (lastCallResult?.clientId === clientId && lastCallResult.serverId === null) {
      // Call resolved before the server acknowledged it (fast TP fill).
      set({ lastCallResult: { ...lastCallResult, serverId } });
    }
  },

  reconcileCallStateFromServer: (diamonds, streak) =>
    set({ diamonds, callStreak: streak }),

  // Same server-mirror contract as reconcileCallStateFromServer, but guarded
  // with max(): within a run the balance only grows, so a call resolve in
  // flight (useCallServerSync) carrying a pre-award balance must not downgrade
  // the mirror. The /api/auth/me fetch on next mount corrects any residue.
  recordRunRankAward: (award) =>
    set({ runRankAward: award, diamonds: Math.max(get().diamonds, award.diamonds) }),

  resetCallRun: () =>
    set({
      activeCall: null,
      callRunId: generateId(),
      diamondsThisRun: 0,
      lastCallResult: null,
      runCallLog: [],
      runRankAward: null,
    }),

  clearLastCallResult: () => set({ lastCallResult: null }),
});
