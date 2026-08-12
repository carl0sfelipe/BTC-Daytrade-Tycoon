import { describe, it, expect } from "vitest";
import {
  buildCallFromPosition,
  computeCallResolution,
  computeTargetPercent,
  resolveCallOutcome,
} from "./call-transitions";
import { CALL_REWARD_COOLDOWN_MS, MAX_DIAMONDS_PER_RUN } from "./diamond-reward";

const NOW = 1_700_000_000_000;

function longPosition(overrides: Partial<{ entry: number; tpPrice: number | null; leverage: number }> = {}) {
  return {
    side: "long" as const,
    entry: overrides.entry ?? 100_000,
    tpPrice: overrides.tpPrice === undefined ? 105_000 : overrides.tpPrice,
    leverage: overrides.leverage ?? 10,
  };
}

describe("computeTargetPercent", () => {
  it("measures a long target above entry", () => {
    expect(computeTargetPercent("long", 100_000, 105_000)).toBeCloseTo(5);
  });

  it("measures a short target below entry", () => {
    expect(computeTargetPercent("short", 100_000, 97_000)).toBeCloseTo(3);
  });
});

describe("buildCallFromPosition", () => {
  it("declares a call from a position with a TP", () => {
    const call = buildCallFromPosition(longPosition(), 0, "run-1", "call-1", NOW);
    expect(call).not.toBeNull();
    expect(call!.targetPercent).toBeCloseTo(5);
    expect(call!.leverage).toBe(10);
    expect(call!.potentialReward).toBeGreaterThan(0);
    expect(call!.serverId).toBeNull();
  });

  it("returns null when the position has no TP", () => {
    expect(buildCallFromPosition(longPosition({ tpPrice: null }), 0, "run-1", "c", NOW)).toBeNull();
  });

  it("rejects noise targets below the minimum", () => {
    const call = buildCallFromPosition(longPosition({ tpPrice: 100_100 }), 0, "run-1", "c", NOW);
    expect(call).toBeNull(); // +0.1% is not a prediction
  });

  it("rejects moonshot targets above the maximum", () => {
    const call = buildCallFromPosition(longPosition({ tpPrice: 200_000 }), 0, "run-1", "c", NOW);
    expect(call).toBeNull(); // +100%
  });
});

describe("resolveCallOutcome", () => {
  it("maps close reasons to outcomes", () => {
    expect(resolveCallOutcome("tp")).toBe("hit");
    expect(resolveCallOutcome("sl")).toBe("missed");
    expect(resolveCallOutcome("liquidation")).toBe("missed");
    expect(resolveCallOutcome("manual")).toBe("voided");
    expect(resolveCallOutcome("trailing_stop")).toBe("voided");
    expect(resolveCallOutcome("tp_changed")).toBe("voided");
  });
});

describe("computeCallResolution", () => {
  const call = { targetPercent: 10, leverage: 10 };

  it("pays the reward and advances the streak on a hit", () => {
    const res = computeCallResolution(call, "hit", 0, 0, null, NOW);
    expect(res).toEqual({ outcome: "hit", reward: 25, newStreak: 1 });
  });

  it("applies the streak multiplier on consecutive hits", () => {
    const res = computeCallResolution(call, "hit", 1, 0, null, NOW);
    expect(res.reward).toBe(31); // 25 × 1.25
    expect(res.newStreak).toBe(2);
  });

  it("resets the streak and pays nothing on a miss", () => {
    const res = computeCallResolution(call, "missed", 3, 0, null, NOW);
    expect(res).toEqual({ outcome: "missed", reward: 0, newStreak: 0 });
  });

  it("preserves the streak on a voided call", () => {
    const res = computeCallResolution(call, "voided", 3, 0, null, NOW);
    expect(res).toEqual({ outcome: "voided", reward: 0, newStreak: 3 });
  });

  it("pays 0 inside the reward cooldown but still advances the streak", () => {
    const lastRewardedAt = NOW - CALL_REWARD_COOLDOWN_MS + 1_000;
    const res = computeCallResolution(call, "hit", 1, 0, lastRewardedAt, NOW);
    expect(res).toEqual({ outcome: "hit", reward: 0, newStreak: 2 });
  });

  it("pays again once the cooldown has elapsed", () => {
    const lastRewardedAt = NOW - CALL_REWARD_COOLDOWN_MS - 1;
    const res = computeCallResolution(call, "hit", 0, 0, lastRewardedAt, NOW);
    expect(res.reward).toBe(25);
  });

  it("clamps the reward to the per-run cap", () => {
    const res = computeCallResolution(call, "hit", 0, MAX_DIAMONDS_PER_RUN - 5, null, NOW);
    expect(res.reward).toBe(5);
  });
});
