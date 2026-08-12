/**
 * Server-authoritative daily mission board and claims (PRD_ROGUELIKE_PVP.md
 * §6, R1). Progress is recomputed from persisted runs/calls on every request —
 * the client never reports mission progress. Depends on repository interfaces
 * so tests inject in-memory fakes (same pattern as call-service).
 */
import type { CallRepository } from "./call-repository";
import type { MissionRepository } from "./mission-repository";
import {
  DAILY_MISSIONS,
  buildMissionStatus,
  startOfUtcDay,
  utcDayKey,
  type DailyMissionDefinition,
  type DailyMissionStatus,
} from "@/lib/missions/daily-missions";

export interface DailyMissionBoard {
  day: string;
  missions: DailyMissionStatus[];
}

export type MissionClaimResult =
  | { ok: true; reward: number; diamonds: number }
  | { ok: false; error: string; status: number };

function knownMissionIds(): string {
  return DAILY_MISSIONS.map((mission) => mission.id).join(", ");
}

// Maps a mission id to the counter that derives its progress. New missions
// must register here — an unknown id at this layer is a programming error
// (user input is filtered against DAILY_MISSIONS before reaching it).
function countMissionProgress(
  missionRepo: MissionRepository,
  userId: string,
  missionId: string,
  since: Date
): Promise<number> {
  if (missionId === "daily-run") return missionRepo.countRunsSince(userId, since);
  if (missionId === "daily-called-shots") return missionRepo.countCallHitsSince(userId, since);
  if (missionId === "daily-profit") return missionRepo.countProfitableRunsSince(userId, since);
  throw new Error(
    `No progress counter for mission id "${missionId}" — expected one of: ${knownMissionIds()}`
  );
}

/**
 * Builds the user's mission board for the UTC day containing `now`.
 *
 * @example const board = await getDailyMissionBoard(missionRepo, user.id, new Date());
 */
export async function getDailyMissionBoard(
  missionRepo: MissionRepository,
  userId: string,
  now: Date
): Promise<DailyMissionBoard> {
  const since = startOfUtcDay(now);
  const day = utcDayKey(now);
  const claimedIds = await missionRepo.listClaimedMissionIds(userId, day);
  const missions = await Promise.all(
    DAILY_MISSIONS.map(async (definition) =>
      buildMissionStatus(
        definition,
        await countMissionProgress(missionRepo, userId, definition.id, since),
        claimedIds.includes(definition.id)
      )
    )
  );
  return { day, missions };
}

function unknownMissionResult(missionId: string): MissionClaimResult {
  return {
    ok: false,
    status: 400,
    error: `Unknown mission id "${missionId}" — expected one of: ${knownMissionIds()}`,
  };
}

function alreadyClaimedResult(missionId: string, day: string): MissionClaimResult {
  return {
    ok: false,
    status: 409,
    error: `Mission "${missionId}" was already claimed on ${day}`,
  };
}

function incompleteMissionResult(
  definition: DailyMissionDefinition,
  rawProgress: number
): MissionClaimResult {
  return {
    ok: false,
    status: 422,
    error: `Mission "${definition.id}" is incomplete — progress ${rawProgress} of ${definition.target} required`,
  };
}

// Claim insert and diamond credit are separate writes across two
// repositories — no shared transaction. If the credit fails we compensate by
// deleting the claim; otherwise every retry answers 409 with zero diamonds
// paid, a permanent loss for the player.
async function creditClaimedMissionReward(
  missionRepo: MissionRepository,
  callRepo: CallRepository,
  userId: string,
  definition: DailyMissionDefinition,
  day: string
): Promise<MissionClaimResult> {
  try {
    const diamonds = await callRepo.addDiamonds(userId, definition.reward);
    return { ok: true, reward: definition.reward, diamonds };
  } catch {
    await missionRepo.deleteMissionClaim(userId, definition.id, day);
    return {
      ok: false,
      status: 500,
      error: "Reward credit failed — mission claim rolled back, try again",
    };
  }
}

/**
 * Claims a completed mission: recomputes progress server-side, records the
 * claim (unique per user/mission/UTC day) and credits the diamond reward.
 * The createMissionClaim false branch is the race backstop — two concurrent
 * claims both pass the list check, but only one insert survives the unique.
 *
 * Known limitation (accepted for R1): the run counters derive from
 * TradingSessionRecord rows whose stats are client-reported, so a forged
 * POST /api/sessions can complete "daily-run"/"daily-profit" without playing
 * (~22💎/day ceiling, bounded by the one-claim-per-mission-per-day unique).
 * Deterministic replay verification closes this in R2 (PRD_ROGUELIKE_PVP.md
 * §9.2) — same debt already documented in run-rank-service.
 *
 * @example const result = await claimDailyMission(missionRepo, callRepo, user.id, "daily-run", new Date());
 */
export async function claimDailyMission(
  missionRepo: MissionRepository,
  callRepo: CallRepository,
  userId: string,
  missionId: string,
  now: Date
): Promise<MissionClaimResult> {
  const definition = DAILY_MISSIONS.find((mission) => mission.id === missionId);
  if (!definition) return unknownMissionResult(missionId);

  const day = utcDayKey(now);
  const claimedIds = await missionRepo.listClaimedMissionIds(userId, day);
  if (claimedIds.includes(missionId)) return alreadyClaimedResult(missionId, day);

  const rawProgress = await countMissionProgress(missionRepo, userId, missionId, startOfUtcDay(now));
  if (rawProgress < definition.target) return incompleteMissionResult(definition, rawProgress);

  const created = await missionRepo.createMissionClaim({
    userId,
    missionId,
    day,
    reward: definition.reward,
  });
  if (!created) return alreadyClaimedResult(missionId, day);

  return creditClaimedMissionReward(missionRepo, callRepo, userId, definition, day);
}
