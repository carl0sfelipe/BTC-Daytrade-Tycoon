/**
 * Browser-side client for the daily mission API (/api/missions/*).
 * Never throws (calls-client contract), but the board fetch distinguishes
 * "guest" (401) from "error" (network/5xx) — a logged-in player with a
 * transient failure must see a retry, not the signup CTA.
 */
import type { DailyMissionStatus } from "@/lib/missions/daily-missions";
import { warnWhenRateLimitedResponse } from "@/lib/rate-limit-warning";

export type DailyMissionBoardResult =
  | { kind: "board"; day: string; missions: DailyMissionStatus[] }
  | { kind: "guest" }
  | { kind: "error" };

export interface MissionClaimPayout {
  reward: number;
  diamonds: number;
}

/**
 * Fetches today's mission board: "guest" on 401, "error" on any other
 * failure, "board" with the data on success.
 *
 * @example const result = await fetchDailyMissionBoard(); if (result.kind === "board") ...
 */
export async function fetchDailyMissionBoard(): Promise<DailyMissionBoardResult> {
  try {
    const response = await fetch("/api/missions");
    if (response.status === 401) return { kind: "guest" };
    if (!response.ok) return { kind: "error" };
    const data = (await response.json()) as { day?: string; missions?: DailyMissionStatus[] };
    if (!data.day || !Array.isArray(data.missions)) return { kind: "error" };
    return { kind: "board", day: data.day, missions: data.missions };
  } catch {
    return { kind: "error" };
  }
}

/**
 * Claims a completed mission. The server recomputes progress and pays the
 * reward; returns the payout and new balance, or null on any failure.
 *
 * @example const payout = await claimDailyMissionRequest("daily-run");
 */
export async function claimDailyMissionRequest(missionId: string): Promise<MissionClaimPayout | null> {
  try {
    const response = await fetch("/api/missions/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId }),
    });
    warnWhenRateLimitedResponse("/api/missions/claim", response);
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<MissionClaimPayout>;
    return typeof data.reward === "number" && typeof data.diamonds === "number"
      ? { reward: data.reward, diamonds: data.diamonds }
      : null;
  } catch {
    return null;
  }
}
