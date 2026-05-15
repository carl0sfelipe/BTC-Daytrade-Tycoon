import { describe, it, expect } from "vitest";
import {
  getDailyChallengeSeed,
  getDailyChallengeParams,
  seededRandom,
} from "./daily-challenge";

describe("getDailyChallengeSeed", () => {
  it("returns consistent seed for same date", () => {
    const d = new Date(2026, 4, 13); // May 13
    const seed1 = getDailyChallengeSeed(d);
    const seed2 = getDailyChallengeSeed(d);
    expect(seed1).toBe(seed2);
    expect(seed1).toBe("daily-2026-05-13");
  });

  it("returns different seeds for different dates", () => {
    const s1 = getDailyChallengeSeed(new Date(2026, 4, 13));
    const s2 = getDailyChallengeSeed(new Date(2026, 4, 14));
    expect(s1).not.toBe(s2);
  });
});

describe("getDailyChallengeParams", () => {
  it("returns params with correct shape", () => {
    const params = getDailyChallengeParams(new Date(2026, 4, 13));
    expect(params.seed).toBe("daily-2026-05-13");
    expect(params.durationMinutes).toBe(5);
    expect(params.difficulty).toBe("normal");
  });
});

describe("seededRandom", () => {
  it("returns deterministic values for same seed", () => {
    const r1 = seededRandom("test-seed");
    const r2 = seededRandom("test-seed");
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThanOrEqual(0);
    expect(r1).toBeLessThan(1);
  });

  it("returns different values for different seeds", () => {
    const r1 = seededRandom("seed-a");
    const r2 = seededRandom("seed-b");
    expect(r1).not.toBe(r2);
  });
});
