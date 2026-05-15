import { getDailyChallengeSeed } from "./daily-challenge";

export interface DailyChallengeScore {
  playerName: string;
  wallet: number;
  startingWallet: number;
  returnPercent: number;
  trades: number;
  winRate: number;
  timestamp: number;
}

const STORAGE_KEY = "btc-daytrade-tycoon-daily-leaderboard";

interface LeaderboardStore {
  version: 1;
  entries: Record<string, DailyChallengeScore[]>; // key = daily seed
}

function getStore(): LeaderboardStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, entries: {} };
    const parsed = JSON.parse(raw) as LeaderboardStore;
    if (parsed.version !== 1) return { version: 1, entries: {} };
    return parsed;
  } catch {
    return { version: 1, entries: {} };
  }
}

function setStore(store: LeaderboardStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // noop — storage may be full
  }
}

/**
 * Submits a score for today's daily challenge.
 * Keeps only the top 50 scores per day.
 */
export function submitDailyScore(
  score: Omit<DailyChallengeScore, "timestamp">,
  date = new Date()
): void {
  const seed = getDailyChallengeSeed(date);
  const store = getStore();
  const dayScores = store.entries[seed] ?? [];

  const newEntry: DailyChallengeScore = {
    ...score,
    timestamp: Date.now(),
  };

  dayScores.push(newEntry);
  dayScores.sort((a, b) => b.returnPercent - a.returnPercent);

  store.entries[seed] = dayScores.slice(0, 50);
  setStore(store);
}

/**
 * Returns the top N scores for today's challenge.
 */
export function getDailyLeaderboard(date = new Date(), topN = 10): DailyChallengeScore[] {
  const seed = getDailyChallengeSeed(date);
  const store = getStore();
  return (store.entries[seed] ?? []).slice(0, topN);
}

/**
 * Returns the player's best score for today.
 */
export function getPlayerDailyBest(
  playerName: string,
  date = new Date()
): DailyChallengeScore | null {
  const seed = getDailyChallengeSeed(date);
  const store = getStore();
  const dayScores = store.entries[seed] ?? [];
  return dayScores.find((s) => s.playerName === playerName) ?? null;
}

/**
 * Clears all daily challenge scores (dev utility).
 */
export function clearAllDailyScores(): void {
  setStore({ version: 1, entries: {} });
}
