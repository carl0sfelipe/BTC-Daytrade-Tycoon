import { describe, it, expect } from "vitest";
import {
  CALL_STREAK_MULTIPLIER_CAP,
  MAX_DIAMONDS_PER_RUN,
  clampRewardToRunCap,
  computeCallBaseReward,
  computeDiamondReward,
  computeStreakMultiplier,
} from "./diamond-reward";

describe("computeCallBaseReward", () => {
  it("matches the PRD anchor +10% @ 10x → 25 💎", () => {
    expect(computeCallBaseReward(10, 10)).toBe(25);
  });

  it("stays near the PRD anchors for easy and medium calls", () => {
    expect(computeCallBaseReward(3, 2)).toBe(6); // PRD anchor ~5
    expect(computeCallBaseReward(5, 5)).toBe(13); // PRD anchor ~12
  });

  it("pays more for harder predictions", () => {
    const easy = computeCallBaseReward(3, 2);
    const medium = computeCallBaseReward(5, 5);
    const hard = computeCallBaseReward(10, 10);
    expect(medium).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(medium);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(computeCallBaseReward(0, 10)).toBe(0);
    expect(computeCallBaseReward(5, 0)).toBe(0);
    expect(computeCallBaseReward(-3, 5)).toBe(0);
  });
});

describe("computeStreakMultiplier", () => {
  it("pays ×1 on the first hit (streak 0)", () => {
    expect(computeStreakMultiplier(0)).toBe(1);
  });

  it("grows 25% per consecutive hit", () => {
    expect(computeStreakMultiplier(1)).toBe(1.25);
    expect(computeStreakMultiplier(2)).toBeCloseTo(1.5625);
  });

  it("caps at ×2", () => {
    expect(computeStreakMultiplier(4)).toBe(CALL_STREAK_MULTIPLIER_CAP);
    expect(computeStreakMultiplier(100)).toBe(CALL_STREAK_MULTIPLIER_CAP);
  });
});

describe("computeDiamondReward", () => {
  it("applies the streak multiplier to the base reward", () => {
    expect(computeDiamondReward(10, 10, 0)).toBe(25);
    expect(computeDiamondReward(10, 10, 1)).toBe(31); // 25 × 1.25 rounded
    expect(computeDiamondReward(10, 10, 10)).toBe(50); // capped at ×2
  });
});

describe("clampRewardToRunCap", () => {
  it("passes the reward through when the run has budget", () => {
    expect(clampRewardToRunCap(25, 0)).toBe(25);
  });

  it("clamps to the remaining run budget", () => {
    expect(clampRewardToRunCap(25, MAX_DIAMONDS_PER_RUN - 10)).toBe(10);
  });

  it("pays 0 once the run cap is exhausted", () => {
    expect(clampRewardToRunCap(25, MAX_DIAMONDS_PER_RUN)).toBe(0);
    expect(clampRewardToRunCap(25, MAX_DIAMONDS_PER_RUN + 99)).toBe(0);
  });
});
