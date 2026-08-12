/**
 * Server-authoritative diamond payout for a run's position in the daily
 * ranking. Depends on repository interfaces so tests inject in-memory fakes
 * (same pattern as call-service).
 */
import type { CallRepository } from "./call-repository";
import type { TradingSessionRepository } from "./trading-session-repository";
import { computeRunRankReward, RUN_RANK_WINDOW_MS } from "./run-rank-reward";

export interface RunRankAward {
  rank: number;
  totalRuns: number;
  reward: number;
  /** User's new diamond balance after crediting the reward. */
  diamonds: number;
}

/**
 * Minimum gap between rewarded runs per user. Session stats are
 * client-reported, so without this a replayed POST /api/sessions farms
 * diamonds on every request (same anti-farm layer as the call-service
 * cooldown). Deterministic replay verification is R2 debt (PRD §9.2).
 */
export const RUN_REWARD_COOLDOWN_MS = 5 * 60_000;

/**
 * Ranks the just-saved run by returnPercent against every session in the
 * 24h window and credits the tiered reward. Must run AFTER insertSession so
 * the run counts itself in totalRuns (and rank >= 1 holds by construction).
 * The user's own earlier runs in the window count as competitors on purpose:
 * R1 solo is a time-attack against the daily field of runs, not of players —
 * same-seed PvP ranking is R2 (PRD_ROGUELIKE_PVP.md §3.2).
 *
 * Returns null (no diamonds credited) when the user already saved another
 * run inside RUN_REWARD_COOLDOWN_MS — the anti-farm guard above.
 *
 * @example const award = await awardRunRankReward(sessionRepo, callRepo, user.id, 12.5);
 */
export async function awardRunRankReward(
  sessionRepo: TradingSessionRepository,
  callRepo: CallRepository,
  userId: string,
  returnPercent: number
): Promise<RunRankAward | null> {
  const now = Date.now();
  const cooldownStart = new Date(now - RUN_REWARD_COOLDOWN_MS);
  const recentUserRuns = await sessionRepo.countUserSessionsSince(userId, cooldownStart);
  // The just-inserted session counts itself, so > 1 means another recent run.
  if (recentUserRuns > 1) return null;
  const since = new Date(now - RUN_RANK_WINDOW_MS);
  const rank = 1 + (await sessionRepo.countSessionsWithHigherReturnSince(since, returnPercent));
  const totalRuns = await sessionRepo.countSessionsSince(since);
  const reward = computeRunRankReward({ rank, totalRuns });
  const diamonds =
    reward > 0 ? await callRepo.addDiamonds(userId, reward) : await callRepo.getDiamonds(userId);
  return { rank, totalRuns, reward, diamonds };
}
