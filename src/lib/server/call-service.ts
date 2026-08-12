/**
 * Called-shot use-cases: open a call at position entry, resolve it when the
 * position closes. The server is authoritative for payouts — it recomputes
 * the target distance, derives the streak from its own history and enforces
 * the anti-farm guards (cooldown, per-run cap).
 *
 * R2 debt (see PRD_ROGUELIKE_PVP.md): the hit/miss outcome itself is still
 * reported by the client; deterministic candle replay will verify it later.
 */
import {
  CALL_REWARD_COOLDOWN_MS,
  MAX_CALL_TARGET_PERCENT,
  MIN_CALL_TARGET_PERCENT,
  clampRewardToRunCap,
  computeDiamondReward,
} from "@/lib/calls/diamond-reward";
import { computeTargetPercent } from "@/lib/calls/call-transitions";
import type { CallRepository, TradeCallRecord } from "./call-repository";
import type { OpenCallInput, ResolveCallInput } from "./call-validation";

const STREAK_LOOKBACK = 32;

export type OpenCallResult =
  | { ok: true; call: TradeCallRecord }
  | { ok: false; error: string; status: number };

export interface CallResolutionSummary {
  outcome: ResolveCallInput["outcome"];
  reward: number;
  streak: number;
  diamonds: number;
}

export type ResolveCallResult =
  | { ok: true; result: CallResolutionSummary }
  | { ok: false; error: string; status: number };

/** Consecutive hits, newest first; voided calls are transparent, a miss stops the run. */
export function computeServerStreak(resolvedCalls: TradeCallRecord[]): number {
  let streak = 0;
  for (const call of resolvedCalls) {
    if (call.status === "voided") continue;
    if (call.status !== "hit") break;
    streak += 1;
  }
  return streak;
}

export async function openTradeCall(
  repo: CallRepository,
  userId: string,
  input: OpenCallInput
): Promise<OpenCallResult> {
  const targetPercent = computeTargetPercent(input.side, input.entryPrice, input.targetPrice);
  if (targetPercent < MIN_CALL_TARGET_PERCENT || targetPercent > MAX_CALL_TARGET_PERCENT) {
    return {
      ok: false,
      error: `Target must be ${MIN_CALL_TARGET_PERCENT}%–${MAX_CALL_TARGET_PERCENT}% beyond entry in the profit direction`,
      status: 400,
    };
  }
  const call = await repo.createCall({
    userId,
    runId: input.runId,
    side: input.side,
    entryPrice: input.entryPrice,
    targetPrice: input.targetPrice,
    targetPercent,
    leverage: input.leverage,
  });
  return { ok: true, call };
}

async function computeHitReward(
  repo: CallRepository,
  call: TradeCallRecord,
  streak: number,
  now: Date
): Promise<number> {
  const lastRewarded = await repo.findLastRewardedCall(call.userId);
  const lastRewardedAt = lastRewarded?.resolvedAt?.getTime() ?? null;
  if (lastRewardedAt !== null && now.getTime() - lastRewardedAt < CALL_REWARD_COOLDOWN_MS) {
    return 0;
  }
  const alreadyEarned = await repo.sumRunRewards(call.userId, call.runId);
  return clampRewardToRunCap(
    computeDiamondReward(call.targetPercent, call.leverage, streak),
    alreadyEarned
  );
}

export async function resolveTradeCall(
  repo: CallRepository,
  userId: string,
  callId: string,
  outcome: ResolveCallInput["outcome"],
  now: Date = new Date()
): Promise<ResolveCallResult> {
  const call = await repo.findCallById(callId);
  if (!call || call.userId !== userId) {
    return { ok: false, error: "Call not found", status: 404 };
  }
  if (call.status !== "pending") {
    return { ok: false, error: "Call is already resolved", status: 409 };
  }

  const streakBefore = computeServerStreak(await repo.listResolvedCalls(userId, STREAK_LOOKBACK));
  const reward = outcome === "hit" ? await computeHitReward(repo, call, streakBefore, now) : 0;

  await repo.resolveCall(callId, outcome, reward, now);
  const diamonds = reward > 0 ? await repo.addDiamonds(userId, reward) : await repo.getDiamonds(userId);

  const streak = outcome === "hit" ? streakBefore + 1 : outcome === "missed" ? 0 : streakBefore;
  return { ok: true, result: { outcome, reward, streak, diamonds } };
}
