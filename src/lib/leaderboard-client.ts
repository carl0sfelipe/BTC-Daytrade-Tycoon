/**
 * Browser-side client for GET /api/leaderboard.
 */
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/server/leaderboard-service";

export interface LeaderboardSnapshot {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  /** The logged-in user's own ranked entry, when they have sessions in range. */
  me: LeaderboardEntry | null;
}

/**
 * Fetches the global leaderboard for a period. Returns null on network error.
 *
 * @example const snapshot = await fetchLeaderboard("week");
 */
export async function fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardSnapshot | null> {
  try {
    const response = await fetch(`/api/leaderboard?period=${period}`);
    if (!response.ok) return null;
    return (await response.json()) as LeaderboardSnapshot;
  } catch {
    return null;
  }
}
