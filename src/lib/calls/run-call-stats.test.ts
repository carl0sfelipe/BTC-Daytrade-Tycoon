import { describe, it, expect } from "vitest";
import { computeRunCallStats } from "./run-call-stats";
import type { ResolvedCallSnapshot } from "@/store/slices/callsSlice";

function buildResolvedCall(overrides: Partial<ResolvedCallSnapshot>): ResolvedCallSnapshot {
  return {
    clientId: "call-1",
    serverId: null,
    outcome: "hit",
    reward: 0,
    streak: 0,
    targetPercent: 10,
    leverage: 10,
    resolvedAt: 0,
    ...overrides,
  };
}

describe("computeRunCallStats", () => {
  it("returns zeros and a null hit rate for an empty log", () => {
    expect(computeRunCallStats([])).toEqual({
      callsMade: 0,
      hits: 0,
      misses: 0,
      voided: 0,
      hitRate: null,
      diamondsEarned: 0,
      bestStreak: 0,
    });
  });

  it("keeps the hit rate null when every call was voided", () => {
    const log = [
      buildResolvedCall({ outcome: "voided" }),
      buildResolvedCall({ outcome: "voided" }),
    ];
    const stats = computeRunCallStats(log);
    expect(stats.callsMade).toBe(2);
    expect(stats.voided).toBe(2);
    expect(stats.hitRate).toBeNull();
    expect(stats.diamondsEarned).toBe(0);
  });

  it("counts a mixed log and rates only settled predictions", () => {
    const log = [
      buildResolvedCall({ outcome: "hit", reward: 25, streak: 1 }),
      buildResolvedCall({ outcome: "hit", reward: 31, streak: 2 }),
      buildResolvedCall({ outcome: "missed", reward: 0, streak: 0 }),
      buildResolvedCall({ outcome: "voided", reward: 0, streak: 0 }),
    ];
    expect(computeRunCallStats(log)).toEqual({
      callsMade: 4,
      hits: 2,
      misses: 1,
      voided: 1,
      hitRate: 2 / 3,
      diamondsEarned: 56,
      bestStreak: 2,
    });
  });

  it("tracks the best streak even after it later resets", () => {
    const log = [
      buildResolvedCall({ outcome: "hit", reward: 25, streak: 3 }),
      buildResolvedCall({ outcome: "missed", reward: 0, streak: 0 }),
      buildResolvedCall({ outcome: "hit", reward: 25, streak: 1 }),
    ];
    expect(computeRunCallStats(log).bestStreak).toBe(3);
  });

  it("sums rewards including cooldown hits that paid 0", () => {
    const log = [
      buildResolvedCall({ outcome: "hit", reward: 25, streak: 1 }),
      buildResolvedCall({ outcome: "hit", reward: 0, streak: 2 }),
    ];
    const stats = computeRunCallStats(log);
    expect(stats.diamondsEarned).toBe(25);
    expect(stats.hitRate).toBe(1);
  });
});
