import { describe, it, expect } from "vitest";
import { classifyCallDifficulty, computeCalledShotStats } from "./call-stats";
import type { TradeCallRecord, TradeCallStatus } from "./call-repository";

let nextId = 1;

function call(
  status: TradeCallStatus,
  targetPercent: number,
  reward = 0,
  runId = "run-1"
): TradeCallRecord {
  return {
    id: `call-${nextId++}`,
    userId: "user-1",
    runId,
    side: "long",
    entryPrice: 100_000,
    targetPrice: 100_000 * (1 + targetPercent / 100),
    targetPercent,
    leverage: 10,
    status,
    reward,
    createdAt: new Date("2026-08-12T04:00:00Z"),
    resolvedAt: new Date("2026-08-12T04:05:00Z"),
  };
}

describe("classifyCallDifficulty", () => {
  it("maps the UI pills to their buckets", () => {
    expect(classifyCallDifficulty(3)).toBe("easy");
    expect(classifyCallDifficulty(5)).toBe("medium");
    expect(classifyCallDifficulty(10)).toBe("hard");
  });

  it("buckets custom targets by the same edges", () => {
    expect(classifyCallDifficulty(3.9)).toBe("easy");
    expect(classifyCallDifficulty(4)).toBe("medium");
    expect(classifyCallDifficulty(6.9)).toBe("medium");
    expect(classifyCallDifficulty(7)).toBe("hard");
  });
});

describe("computeCalledShotStats", () => {
  it("returns an all-null/zero shape with no calls", () => {
    const stats = computeCalledShotStats([]);
    expect(stats.totalCalls).toBe(0);
    expect(stats.hitRate).toBeNull();
    expect(stats.avgRewardPerHit).toBeNull();
    expect(stats.callsPerRun).toBeNull();
    expect(stats.byDifficulty).toHaveLength(3);
    expect(stats.byDifficulty[0].hitRate).toBeNull();
  });

  it("computes the overall hit rate excluding voided calls", () => {
    const stats = computeCalledShotStats([
      call("hit", 3, 6),
      call("missed", 3),
      call("missed", 3),
      call("voided", 3),
    ]);
    expect(stats.totalCalls).toBe(4);
    expect(stats.voided).toBe(1);
    expect(stats.hitRate).toBeCloseTo(1 / 3); // 1 hit over 3 resolved predictions
  });

  it("splits hit rate per difficulty bucket", () => {
    const stats = computeCalledShotStats([
      call("hit", 3, 6),
      call("hit", 3, 6),
      call("missed", 5),
      call("hit", 10, 25),
      call("missed", 10),
    ]);
    const [easy, medium, hard] = stats.byDifficulty;
    expect(easy).toMatchObject({ calls: 2, hits: 2, hitRate: 1 });
    expect(medium).toMatchObject({ calls: 1, hits: 0, hitRate: 0 });
    expect(hard).toMatchObject({ calls: 2, hits: 1, hitRate: 0.5 });
  });

  it("tracks diamonds paid and average reward per hit", () => {
    const stats = computeCalledShotStats([
      call("hit", 10, 25),
      call("hit", 10, 31),
      call("hit", 10, 0), // hit inside the cooldown — paid nothing
      call("missed", 10),
    ]);
    expect(stats.totalDiamondsPaid).toBe(56);
    expect(stats.avgRewardPerHit).toBeCloseTo(56 / 3);
  });

  it("computes calls per run across distinct runs", () => {
    const stats = computeCalledShotStats([
      call("hit", 3, 6, "run-a"),
      call("missed", 3, 0, "run-a"),
      call("hit", 5, 13, "run-b"),
    ]);
    expect(stats.distinctRuns).toBe(2);
    expect(stats.callsPerRun).toBeCloseTo(1.5);
  });
});
