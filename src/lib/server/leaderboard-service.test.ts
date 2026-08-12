import { describe, it, expect } from "vitest";
import {
  computeLeaderboard,
  computeSessionWinStreak,
  findLeaderboardEntry,
  parseLeaderboardPeriod,
  resolvePeriodStart,
} from "./leaderboard-service";
import type { RankableSessionRow } from "./trading-session-repository";

function buildRow(overrides: Partial<RankableSessionRow> = {}): RankableSessionRow {
  return {
    userId: "u1",
    username: "trader_one",
    pnl: 100,
    returnPercent: 10,
    trades: 5,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("parseLeaderboardPeriod", () => {
  it("accepts the three known periods", () => {
    expect(parseLeaderboardPeriod("week")).toBe("week");
    expect(parseLeaderboardPeriod("month")).toBe("month");
    expect(parseLeaderboardPeriod("all")).toBe("all");
  });

  it("defaults to week for missing or unknown values", () => {
    expect(parseLeaderboardPeriod(null)).toBe("week");
    expect(parseLeaderboardPeriod("year")).toBe("week");
  });
});

describe("resolvePeriodStart", () => {
  const now = new Date("2026-08-12T12:00:00Z");

  it("returns 7 days ago for week", () => {
    expect(resolvePeriodStart("week", now)).toEqual(new Date("2026-08-05T12:00:00Z"));
  });

  it("returns 30 days ago for month", () => {
    expect(resolvePeriodStart("month", now)).toEqual(new Date("2026-07-13T12:00:00Z"));
  });

  it("returns null for all-time", () => {
    expect(resolvePeriodStart("all", now)).toBeNull();
  });
});

describe("computeSessionWinStreak", () => {
  it("counts consecutive profitable sessions from the most recent", () => {
    const rows = [
      buildRow({ pnl: -50 }),
      buildRow({ pnl: 10 }),
      buildRow({ pnl: 20 }),
    ];
    expect(computeSessionWinStreak(rows)).toBe(2);
  });

  it("returns 0 when the latest session lost money", () => {
    const rows = [buildRow({ pnl: 100 }), buildRow({ pnl: -1 })];
    expect(computeSessionWinStreak(rows)).toBe(0);
  });

  it("returns 0 for no sessions", () => {
    expect(computeSessionWinStreak([])).toBe(0);
  });
});

describe("computeLeaderboard", () => {
  it("groups sessions per user and sums returns and trades", () => {
    const rows = [
      buildRow({ userId: "u1", username: "trader_one", returnPercent: 10, trades: 3 }),
      buildRow({ userId: "u1", username: "trader_one", returnPercent: 5, trades: 2 }),
      buildRow({ userId: "u2", username: "trader_two", returnPercent: 40, trades: 1 }),
    ];

    const entries = computeLeaderboard(rows);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      rank: 1,
      userId: "u2",
      returnPercent: 40,
      trades: 1,
      sessions: 1,
    });
    expect(entries[1]).toMatchObject({
      rank: 2,
      userId: "u1",
      returnPercent: 15,
      trades: 5,
      sessions: 2,
    });
  });

  it("computes each user's streak from their own sessions", () => {
    const rows = [
      buildRow({ userId: "u1", pnl: 10 }),
      buildRow({ userId: "u2", username: "trader_two", pnl: -5 }),
      buildRow({ userId: "u1", pnl: 20 }),
    ];

    const entries = computeLeaderboard(rows);
    const first = findLeaderboardEntry(entries, "u1");
    const second = findLeaderboardEntry(entries, "u2");

    expect(first?.streak).toBe(2);
    expect(second?.streak).toBe(0);
  });

  it("returns an empty list for no sessions", () => {
    expect(computeLeaderboard([])).toEqual([]);
  });
});

describe("findLeaderboardEntry", () => {
  it("returns null when the user has no ranked entry", () => {
    const entries = computeLeaderboard([buildRow()]);
    expect(findLeaderboardEntry(entries, "ghost")).toBeNull();
  });
});
