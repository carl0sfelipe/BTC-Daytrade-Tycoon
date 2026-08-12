/**
 * Economy calibration metrics for called shots (party 2026-08-12, Mary):
 * hit rate per difficulty must land in the 30–45% band, otherwise payouts
 * in diamond-reward.ts need retuning. Pure aggregation — no I/O.
 */
import type { TradeCallRecord } from "./call-repository";

export type CallDifficulty = "easy" | "medium" | "hard";

/** Bucket edges follow the UI pills: +3% (easy), +5% (medium), +10% (hard). */
const MEDIUM_MIN_TARGET_PERCENT = 4;
const HARD_MIN_TARGET_PERCENT = 7;

export interface CallDifficultyStats {
  difficulty: CallDifficulty;
  calls: number;
  hits: number;
  misses: number;
  /** hits / (hits + misses); null with no resolved predictions. */
  hitRate: number | null;
}

export interface CalledShotStats {
  totalCalls: number;
  hits: number;
  misses: number;
  voided: number;
  hitRate: number | null;
  totalDiamondsPaid: number;
  avgRewardPerHit: number | null;
  distinctRuns: number;
  callsPerRun: number | null;
  byDifficulty: CallDifficultyStats[];
}

export function classifyCallDifficulty(targetPercent: number): CallDifficulty {
  if (targetPercent >= HARD_MIN_TARGET_PERCENT) return "hard";
  if (targetPercent >= MEDIUM_MIN_TARGET_PERCENT) return "medium";
  return "easy";
}

function rate(hits: number, misses: number): number | null {
  const resolved = hits + misses;
  return resolved === 0 ? null : hits / resolved;
}

function bucketStats(calls: TradeCallRecord[], difficulty: CallDifficulty): CallDifficultyStats {
  const inBucket = calls.filter((c) => classifyCallDifficulty(c.targetPercent) === difficulty);
  const hits = inBucket.filter((c) => c.status === "hit").length;
  const misses = inBucket.filter((c) => c.status === "missed").length;
  return { difficulty, calls: inBucket.length, hits, misses, hitRate: rate(hits, misses) };
}

/**
 * Aggregates resolved calls into calibration stats. Voided calls count as
 * declared but are excluded from hit rate — they were never resolved
 * predictions (early exit / TP moved).
 *
 * @example const stats = computeCalledShotStats(await repo.listResolvedCallsSince(since, 5000));
 */
export function computeCalledShotStats(resolvedCalls: TradeCallRecord[]): CalledShotStats {
  const hits = resolvedCalls.filter((c) => c.status === "hit");
  const misses = resolvedCalls.filter((c) => c.status === "missed").length;
  const voided = resolvedCalls.filter((c) => c.status === "voided").length;
  const totalDiamondsPaid = resolvedCalls.reduce((sum, c) => sum + c.reward, 0);
  const distinctRuns = new Set(resolvedCalls.map((c) => c.runId)).size;

  return {
    totalCalls: resolvedCalls.length,
    hits: hits.length,
    misses,
    voided,
    hitRate: rate(hits.length, misses),
    totalDiamondsPaid,
    avgRewardPerHit: hits.length === 0 ? null : totalDiamondsPaid / hits.length,
    distinctRuns,
    callsPerRun: distinctRuns === 0 ? null : resolvedCalls.length / distinctRuns,
    byDifficulty: (["easy", "medium", "hard"] as const).map((d) => bucketStats(resolvedCalls, d)),
  };
}
