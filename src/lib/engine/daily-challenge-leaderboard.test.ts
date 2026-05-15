import { describe, it, expect, beforeEach } from "vitest";
import {
  submitDailyScore,
  getDailyLeaderboard,
  getPlayerDailyBest,
  clearAllDailyScores,
} from "./daily-challenge-leaderboard";

describe("daily-challenge-leaderboard", () => {
  beforeEach(() => {
    clearAllDailyScores();
  });

  it("submits and retrieves scores", () => {
    const date = new Date(2026, 4, 13);
    submitDailyScore(
      { playerName: "Alice", wallet: 15000, startingWallet: 10000, returnPercent: 50, trades: 5, winRate: 80 },
      date
    );

    const board = getDailyLeaderboard(date, 10);
    expect(board).toHaveLength(1);
    expect(board[0].playerName).toBe("Alice");
    expect(board[0].returnPercent).toBe(50);
  });

  it("sorts by returnPercent descending", () => {
    const date = new Date(2026, 4, 13);
    submitDailyScore({ playerName: "Bob", wallet: 12000, startingWallet: 10000, returnPercent: 20, trades: 3, winRate: 60 }, date);
    submitDailyScore({ playerName: "Alice", wallet: 15000, startingWallet: 10000, returnPercent: 50, trades: 5, winRate: 80 }, date);

    const board = getDailyLeaderboard(date, 10);
    expect(board[0].playerName).toBe("Alice");
    expect(board[1].playerName).toBe("Bob");
  });

  it("caps at topN", () => {
    const date = new Date(2026, 4, 13);
    for (let i = 0; i < 5; i++) {
      submitDailyScore({ playerName: `P${i}`, wallet: 10000 + i * 1000, startingWallet: 10000, returnPercent: i * 10, trades: 1, winRate: 50 }, date);
    }

    expect(getDailyLeaderboard(date, 3)).toHaveLength(3);
  });

  it("returns empty array when no scores", () => {
    const board = getDailyLeaderboard(new Date(2026, 4, 13), 10);
    expect(board).toEqual([]);
  });

  it("finds player best score", () => {
    const date = new Date(2026, 4, 13);
    submitDailyScore({ playerName: "Alice", wallet: 15000, startingWallet: 10000, returnPercent: 50, trades: 5, winRate: 80 }, date);

    const best = getPlayerDailyBest("Alice", date);
    expect(best).not.toBeNull();
    expect(best?.playerName).toBe("Alice");

    const none = getPlayerDailyBest("Bob", date);
    expect(none).toBeNull();
  });

  it("isolates different days", () => {
    const day1 = new Date(2026, 4, 13);
    const day2 = new Date(2026, 4, 14);

    submitDailyScore({ playerName: "Alice", wallet: 15000, startingWallet: 10000, returnPercent: 50, trades: 5, winRate: 80 }, day1);

    expect(getDailyLeaderboard(day1)).toHaveLength(1);
    expect(getDailyLeaderboard(day2)).toHaveLength(0);
  });
});
