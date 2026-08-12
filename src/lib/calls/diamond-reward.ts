// Diamond payout for called shots — shared by the client (instant preview /
// guest play) and the server (authoritative payout). Keep this module pure
// and dependency-free so both sides compute identical numbers.
//
// Anchors from PRD_ROGUELIKE_PVP.md ("anchors, not contract"):
//   +3% @ 2x  → ~5 💎   |   +5% @ 5x → ~13 💎   |   +10% @ 10x → 25 💎
// Formula: reward = round(2.5 × √(targetPercent × leverage)) × streakMultiplier

const REWARD_COEFFICIENT = 2.5;

export const CALL_STREAK_MULTIPLIER = 1.25;
export const CALL_STREAK_MULTIPLIER_CAP = 2;

/** Max diamonds a single run can pay out (anti-farm, PRD guard). */
export const MAX_DIAMONDS_PER_RUN = 150;

/** Min wall-clock gap between two rewarded calls (anti-farm, PRD guard). */
export const CALL_REWARD_COOLDOWN_MS = 30_000;

/** Declared target must be a real prediction, not noise or a moonshot. */
export const MIN_CALL_TARGET_PERCENT = 0.5;
export const MAX_CALL_TARGET_PERCENT = 50;

/** Quick-set pills shown in the UI (custom targets are also valid calls). */
export const CALL_TARGET_PILLS = [3, 5, 10] as const;

export function computeCallBaseReward(targetPercent: number, leverage: number): number {
  if (targetPercent <= 0 || leverage <= 0) return 0;
  return Math.round(REWARD_COEFFICIENT * Math.sqrt(targetPercent * leverage));
}

/** streak = consecutive hits BEFORE this call (first hit pays ×1). */
export function computeStreakMultiplier(streak: number): number {
  if (streak <= 0) return 1;
  return Math.min(CALL_STREAK_MULTIPLIER ** streak, CALL_STREAK_MULTIPLIER_CAP);
}

export function computeDiamondReward(
  targetPercent: number,
  leverage: number,
  streak: number
): number {
  const base = computeCallBaseReward(targetPercent, leverage);
  return Math.round(base * computeStreakMultiplier(streak));
}

/** Clamp a reward against the per-run cap given what the run already paid. */
export function clampRewardToRunCap(reward: number, diamondsAlreadyEarnedInRun: number): number {
  const remaining = Math.max(0, MAX_DIAMONDS_PER_RUN - diamondsAlreadyEarnedInRun);
  return Math.min(reward, remaining);
}
