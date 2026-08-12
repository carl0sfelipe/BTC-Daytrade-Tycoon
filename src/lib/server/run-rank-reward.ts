/**
 * Pure diamond-reward tiers for a run's position in the daily ranking
 * (PRD_ROGUELIKE_PVP.md §3.2, phase R1 — solo approximation of the PvP
 * same-seed run ranking, which is R2).
 */

/** Ranking window: a run competes against every session saved in the last 24h. */
export const RUN_RANK_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RunRankStanding {
  rank: number;
  totalRuns: number;
}

/**
 * Maps a run's standing in the daily window to a diamond reward.
 * Tiers are evaluated top-down — the first that matches wins. The anchor
 * values (30/20/15/8/2) are playtest calibration and tunable.
 *
 * @example computeRunRankReward({ rank: 1, totalRuns: 10 }) // → 30
 */
export function computeRunRankReward(standing: RunRankStanding): number {
  const { rank, totalRuns } = standing;
  if (rank < 1) {
    throw new Error(`Invalid run rank ${rank} — expected an integer >= 1`);
  }
  // Fewer than 3 runs in the window: rank carries no signal, pay participation.
  if (totalRuns < 3) return 2;
  if (rank === 1) return 30;
  if (rank <= 3 && totalRuns >= 6) return 20;
  if (rank <= Math.ceil(totalRuns * 0.1)) return 15;
  if (rank <= Math.ceil(totalRuns / 2)) return 8;
  return 2;
}
