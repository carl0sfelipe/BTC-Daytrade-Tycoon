import { describe, it, expect } from "vitest";
import { computeRunRankReward, RUN_RANK_WINDOW_MS } from "./run-rank-reward";

describe("computeRunRankReward", () => {
  it("pays participation when the window has fewer than 3 runs, even at rank 1", () => {
    expect(computeRunRankReward({ rank: 1, totalRuns: 1 })).toBe(2);
    expect(computeRunRankReward({ rank: 1, totalRuns: 2 })).toBe(2);
  });

  it("pays 30 for rank 1 once the window has 3+ runs", () => {
    expect(computeRunRankReward({ rank: 1, totalRuns: 3 })).toBe(30);
    expect(computeRunRankReward({ rank: 1, totalRuns: 100 })).toBe(30);
  });

  it("pays 20 for the podium (rank <= 3) in a field of 6+", () => {
    expect(computeRunRankReward({ rank: 3, totalRuns: 6 })).toBe(20);
    expect(computeRunRankReward({ rank: 2, totalRuns: 100 })).toBe(20);
  });

  it("skips the podium tier below 6 runs and falls to the half tier", () => {
    // rank 3 of 5: top 10% is ceil(0.5)=1, top half is ceil(2.5)=3 → 8.
    expect(computeRunRankReward({ rank: 3, totalRuns: 5 })).toBe(8);
  });

  it("pays 15 for the top 10% beyond the podium", () => {
    expect(computeRunRankReward({ rank: 4, totalRuns: 40 })).toBe(15);
    expect(computeRunRankReward({ rank: 5, totalRuns: 50 })).toBe(15);
    // Just past the 10% boundary: rank 5 of 40 → half tier.
    expect(computeRunRankReward({ rank: 5, totalRuns: 40 })).toBe(8);
  });

  it("pays 8 down to the top half (ceil boundary inclusive)", () => {
    expect(computeRunRankReward({ rank: 5, totalRuns: 10 })).toBe(8);
    expect(computeRunRankReward({ rank: 6, totalRuns: 11 })).toBe(8); // ceil(5.5) = 6
  });

  it("pays participation for the bottom half and last place", () => {
    expect(computeRunRankReward({ rank: 6, totalRuns: 10 })).toBe(2);
    expect(computeRunRankReward({ rank: 10, totalRuns: 10 })).toBe(2);
  });

  it("rejects ranks below 1 with the offending value in the message", () => {
    expect(() => computeRunRankReward({ rank: 0, totalRuns: 5 })).toThrow(
      "Invalid run rank 0 — expected an integer >= 1"
    );
  });
});

describe("RUN_RANK_WINDOW_MS", () => {
  it("spans exactly one day", () => {
    expect(RUN_RANK_WINDOW_MS).toBe(86_400_000);
  });
});
