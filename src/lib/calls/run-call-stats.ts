import type { ResolvedCallSnapshot } from "@/store/slices/callsSlice";
import type { CallOutcome } from "./call-transitions";

export interface RunCallStats {
  callsMade: number;
  hits: number;
  misses: number;
  voided: number;
  /** hits / (hits + misses); null when no call resolved as a real prediction. */
  hitRate: number | null;
  diamondsEarned: number;
  bestStreak: number;
}

function countCallsByOutcome(log: ResolvedCallSnapshot[], outcome: CallOutcome): number {
  return log.filter((snapshot) => snapshot.outcome === outcome).length;
}

function sumCallRewards(log: ResolvedCallSnapshot[]): number {
  return log.reduce((total, snapshot) => total + snapshot.reward, 0);
}

function maxCallStreak(log: ResolvedCallSnapshot[]): number {
  return log.reduce((best, snapshot) => Math.max(best, snapshot.streak), 0);
}

/**
 * Aggregates a run's resolved called shots into the end-of-run recap shown in
 * EndSimulationModal. Voided calls count as attempts but are excluded from the
 * hit rate — they never were a settled prediction.
 *
 * @example
 * computeRunCallStats([{ outcome: "hit", reward: 25, streak: 1, ... }])
 * // → { callsMade: 1, hits: 1, misses: 0, voided: 0, hitRate: 1,
 * //     diamondsEarned: 25, bestStreak: 1 }
 */
export function computeRunCallStats(log: ResolvedCallSnapshot[]): RunCallStats {
  const hits = countCallsByOutcome(log, "hit");
  const misses = countCallsByOutcome(log, "missed");
  const decided = hits + misses;
  return {
    callsMade: log.length,
    hits,
    misses,
    voided: countCallsByOutcome(log, "voided"),
    hitRate: decided > 0 ? hits / decided : null,
    diamondsEarned: sumCallRewards(log),
    bestStreak: maxCallStreak(log),
  };
}
