/**
 * Daily mission definitions and pure status helpers, shared client/server.
 * The three missions are identical for every player (PRD_ROGUELIKE_PVP.md §6,
 * fairness pillar) and progress is derived server-side from data the player
 * already generates — runs (TradingSessionRecord) and called shots (TradeCall).
 *
 * The mission day resets at midnight UTC for everyone: a single global reset
 * keeps the field fair regardless of the player's timezone, at the cost of the
 * reset landing mid-evening for the Americas. Playtest anchor, not final.
 */

export interface DailyMissionDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
}

/** v1 playtest anchors — rewards sized below a single call payout (~25💎). */
export const DAILY_MISSIONS: readonly DailyMissionDefinition[] = [
  { id: "daily-run", title: "Close the Day", description: "Complete 1 run today", target: 1, reward: 10 },
  { id: "daily-called-shots", title: "Sniper", description: "Hit 2 called shots today", target: 2, reward: 15 },
  { id: "daily-profit", title: "In the Green", description: "Finish 1 run in profit today", target: 1, reward: 12 },
];

export interface DailyMissionStatus extends DailyMissionDefinition {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

/**
 * Midnight UTC of the given instant — the start of the shared mission day.
 *
 * @example startOfUtcDay(new Date("2026-08-12T23:59:59Z")) // 2026-08-12T00:00:00.000Z
 */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Stable "yyyy-mm-dd" key of the UTC mission day — claim uniqueness scope.
 *
 * @example utcDayKey(new Date("2026-08-12T03:00:00Z")) // "2026-08-12"
 */
export function utcDayKey(now: Date): string {
  return startOfUtcDay(now).toISOString().slice(0, 10);
}

/**
 * Combines a definition with server-derived progress into a UI-ready status.
 * Progress is capped at the target for display; completion uses the raw count.
 *
 * @example buildMissionStatus(DAILY_MISSIONS[0], 3, false) // progress 1, completed true
 */
export function buildMissionStatus(
  definition: DailyMissionDefinition,
  rawProgress: number,
  claimed: boolean
): DailyMissionStatus {
  return {
    ...definition,
    progress: Math.min(rawProgress, definition.target),
    completed: rawProgress >= definition.target,
    claimed,
  };
}
