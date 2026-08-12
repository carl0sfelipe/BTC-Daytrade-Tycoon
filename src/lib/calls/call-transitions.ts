// Pure transitions for the called-shot lifecycle on the client.
// The slice (src/store/slices/callsSlice.ts) only wires these to Zustand.

import type { Position, Trade } from "@/store/domain-types";
import {
  CALL_REWARD_COOLDOWN_MS,
  MAX_CALL_TARGET_PERCENT,
  MIN_CALL_TARGET_PERCENT,
  clampRewardToRunCap,
  computeDiamondReward,
} from "./diamond-reward";

export type CallOutcome = "hit" | "missed" | "voided";

export interface ActiveCall {
  clientId: string;
  /** Filled in once the server acknowledges the call (logged-in users). */
  serverId: string | null;
  runId: string;
  side: "long" | "short";
  entryPrice: number;
  targetPrice: number;
  targetPercent: number;
  leverage: number;
  /** Preview at declaration time; the server recomputes the real payout. */
  potentialReward: number;
  declaredAt: number;
}

export interface CallResolution {
  outcome: CallOutcome;
  reward: number;
  newStreak: number;
}

export function computeTargetPercent(
  side: "long" | "short",
  entryPrice: number,
  targetPrice: number
): number {
  if (entryPrice <= 0) return 0;
  const move = side === "long" ? targetPrice - entryPrice : entryPrice - targetPrice;
  return (move / entryPrice) * 100;
}

/**
 * Declare a called shot from a freshly opened position with a TP.
 * Returns null when the position carries no TP or the target is outside the
 * valid prediction range (noise or moonshot).
 */
export function buildCallFromPosition(
  position: Pick<Position, "side" | "entry" | "tpPrice" | "leverage">,
  streak: number,
  runId: string,
  clientId: string,
  now: number
): ActiveCall | null {
  if (!position.tpPrice || position.tpPrice <= 0) return null;
  const targetPercent = computeTargetPercent(position.side, position.entry, position.tpPrice);
  if (targetPercent < MIN_CALL_TARGET_PERCENT || targetPercent > MAX_CALL_TARGET_PERCENT) {
    return null;
  }
  return {
    clientId,
    serverId: null,
    runId,
    side: position.side,
    entryPrice: position.entry,
    targetPrice: position.tpPrice,
    targetPercent,
    leverage: position.leverage,
    potentialReward: computeDiamondReward(targetPercent, position.leverage, streak),
    declaredAt: now,
  };
}

/**
 * Map how the position closed to the call outcome.
 * - "tp": the declared target filled → hit.
 * - "sl"/"liquidation": the thesis failed → missed (streak resets).
 * - "manual"/"trailing_stop": protective exit before the target → voided
 *   (no reward, streak preserved — we don't punish good risk management).
 * - "tp_changed": moving the TP after declaring breaks the commitment → voided.
 */
export function resolveCallOutcome(reason: Trade["reason"] | "tp_changed"): CallOutcome {
  if (reason === "tp") return "hit";
  if (reason === "sl" || reason === "liquidation") return "missed";
  return "voided";
}

/**
 * Local (guest / optimistic) resolution. Applies the same anti-farm guards
 * the server enforces: per-run cap and cooldown between rewarded calls.
 * A hit inside the cooldown still advances the streak — it just pays 0.
 */
export function computeCallResolution(
  call: Pick<ActiveCall, "targetPercent" | "leverage">,
  outcome: CallOutcome,
  streak: number,
  diamondsThisRun: number,
  lastRewardedAt: number | null,
  now: number
): CallResolution {
  if (outcome === "missed") return { outcome, reward: 0, newStreak: 0 };
  if (outcome === "voided") return { outcome, reward: 0, newStreak: streak };

  const inCooldown = lastRewardedAt !== null && now - lastRewardedAt < CALL_REWARD_COOLDOWN_MS;
  const reward = inCooldown
    ? 0
    : clampRewardToRunCap(
        computeDiamondReward(call.targetPercent, call.leverage, streak),
        diamondsThisRun
      );
  return { outcome, reward, newStreak: streak + 1 };
}
