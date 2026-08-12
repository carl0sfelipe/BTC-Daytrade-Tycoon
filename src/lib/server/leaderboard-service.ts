/**
 * Pure aggregation of saved sessions into the global leaderboard.
 * No I/O here — rows come from TradingSessionRepository, which keeps every
 * function unit-testable without a database.
 */
import type { RankableSessionRow } from "./trading-session-repository";

export type LeaderboardPeriod = "week" | "month" | "all";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  /** Cumulative session return, additive across sessions (e.g. +120.5 = %). */
  returnPercent: number;
  trades: number;
  sessions: number;
  /** Consecutive profitable sessions counted from the most recent one. */
  streak: number;
}

/**
 * Parses the ?period= query param, defaulting to "week".
 *
 * @example parseLeaderboardPeriod("month") // "month"
 */
export function parseLeaderboardPeriod(raw: string | null): LeaderboardPeriod {
  if (raw === "week" || raw === "month" || raw === "all") return raw;
  return "week";
}

/**
 * Returns the cutoff date for a period, or null for all-time.
 *
 * @example resolvePeriodStart("week", new Date("2026-08-12")) // 2026-08-05
 */
export function resolvePeriodStart(period: LeaderboardPeriod, now: Date = new Date()): Date | null {
  if (period === "all") return null;
  const days = period === "week" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Counts consecutive pnl-positive sessions from the most recent backwards.
 * Rows must be in chronological (oldest → newest) order.
 *
 * @example computeSessionWinStreak(rows) // 3
 */
export function computeSessionWinStreak(sessions: RankableSessionRow[]): number {
  let streak = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].pnl <= 0) break;
    streak++;
  }
  return streak;
}

function buildUnrankedEntry(sessions: RankableSessionRow[]): Omit<LeaderboardEntry, "rank"> {
  const { userId, username } = sessions[0];
  return {
    userId,
    username,
    returnPercent: sessions.reduce((sum, s) => sum + s.returnPercent, 0),
    trades: sessions.reduce((sum, s) => sum + s.trades, 0),
    sessions: sessions.length,
    streak: computeSessionWinStreak(sessions),
  };
}

function groupSessionsByUser(rows: RankableSessionRow[]): Map<string, RankableSessionRow[]> {
  const byUser = new Map<string, RankableSessionRow[]>();
  for (const row of rows) {
    const bucket = byUser.get(row.userId);
    if (bucket) bucket.push(row);
    else byUser.set(row.userId, [row]);
  }
  return byUser;
}

/**
 * Aggregates chronological session rows into entries ranked by cumulative
 * session return (descending).
 *
 * @example const entries = computeLeaderboard(await repo.listRankableSessions(since));
 */
export function computeLeaderboard(rows: RankableSessionRow[]): LeaderboardEntry[] {
  const grouped = groupSessionsByUser(rows);
  const entries = Array.from(grouped.values()).map(buildUnrankedEntry);
  entries.sort((a, b) => b.returnPercent - a.returnPercent);
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * Finds a user's ranked entry, or null when they have no sessions in range.
 *
 * @example const me = user ? findLeaderboardEntry(entries, user.id) : null;
 */
export function findLeaderboardEntry(
  entries: LeaderboardEntry[],
  userId: string
): LeaderboardEntry | null {
  return entries.find((entry) => entry.userId === userId) ?? null;
}
