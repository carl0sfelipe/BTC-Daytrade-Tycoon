import type { DifficultyKey } from "@/lib/difficulty";

export interface DailyChallengeParams {
  seed: string;
  startDate: Date;
  durationMinutes: number;
  difficulty: DifficultyKey;
}

/**
 * Returns a deterministic seed string based on the current calendar date.
 * Everyone gets the same seed on the same day.
 */
export function getDailyChallengeSeed(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `daily-${y}-${m}-${d}`;
}

/**
 * Returns parameters for today's daily challenge.
 */
export function getDailyChallengeParams(date = new Date()): DailyChallengeParams {
  return {
    seed: getDailyChallengeSeed(date),
    startDate: date,
    durationMinutes: 5,
    difficulty: "normal",
  };
}

/**
 * Computes a pseudo-random number from a string seed.
 * Deterministic — same seed always yields same result.
 */
export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}
