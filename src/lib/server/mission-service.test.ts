import { describe, it, expect, beforeEach } from "vitest";
import { claimDailyMission, getDailyMissionBoard } from "./mission-service";
import type { MissionRepository, NewMissionClaim } from "./mission-repository";
import type { CallRepository, TradeCallRecord } from "./call-repository";

const NOW = new Date("2026-08-12T15:30:00Z");
const TODAY = "2026-08-12";
const TODAY_START = "2026-08-12T00:00:00.000Z";

/** In-memory MissionRepository — counters seeded per test, claims recorded. */
class FakeMissionRepository implements MissionRepository {
  runsToday = 0;
  profitableRunsToday = 0;
  callHitsToday = 0;
  claims: NewMissionClaim[] = [];
  /** Forces the unique-violation path — the P2002 race backstop. */
  rejectNextClaim = false;
  /** Every `since` received — asserts the UTC day boundary reaches the counts. */
  receivedSinceDates: Date[] = [];

  async countRunsSince(_userId: string, since: Date): Promise<number> {
    this.receivedSinceDates.push(since);
    return this.runsToday;
  }

  async countProfitableRunsSince(_userId: string, since: Date): Promise<number> {
    this.receivedSinceDates.push(since);
    return this.profitableRunsToday;
  }

  async countCallHitsSince(_userId: string, since: Date): Promise<number> {
    this.receivedSinceDates.push(since);
    return this.callHitsToday;
  }

  async listClaimedMissionIds(userId: string, day: string): Promise<string[]> {
    return this.claims
      .filter((claim) => claim.userId === userId && claim.day === day)
      .map((claim) => claim.missionId);
  }

  async createMissionClaim(claim: NewMissionClaim): Promise<boolean> {
    if (this.rejectNextClaim) {
      this.rejectNextClaim = false;
      return false;
    }
    this.claims.push(claim);
    return true;
  }

  async deleteMissionClaim(userId: string, missionId: string, day: string): Promise<void> {
    this.claims = this.claims.filter(
      (claim) =>
        !(claim.userId === userId && claim.missionId === missionId && claim.day === day)
    );
  }
}

/** Diamond-ledger-only CallRepository fake (same shape as run-rank tests). */
class FakeMissionCallRepository implements CallRepository {
  balances = new Map<string, number>();
  addDiamondsCalls: Array<{ userId: string; amount: number }> = [];
  /** Simulates a DB failure between claim insert and diamond credit. */
  failNextAddDiamonds = false;

  async addDiamonds(userId: string, amount: number): Promise<number> {
    if (this.failNextAddDiamonds) {
      this.failNextAddDiamonds = false;
      throw new Error("FakeMissionCallRepository.addDiamonds — simulated credit failure");
    }
    this.addDiamondsCalls.push({ userId, amount });
    const next = (this.balances.get(userId) ?? 0) + amount;
    this.balances.set(userId, next);
    return next;
  }

  async getDiamonds(userId: string): Promise<number> {
    return this.balances.get(userId) ?? 0;
  }

  private failUnusedCallMethod(method: string): never {
    throw new Error(`FakeMissionCallRepository.${method} — not exercised by mission tests`);
  }

  async createCall(): Promise<TradeCallRecord> { return this.failUnusedCallMethod("createCall"); }
  async findCallById(): Promise<TradeCallRecord | null> { return this.failUnusedCallMethod("findCallById"); }
  async resolveCall(): Promise<void> { return this.failUnusedCallMethod("resolveCall"); }
  async listResolvedCalls(): Promise<TradeCallRecord[]> { return this.failUnusedCallMethod("listResolvedCalls"); }
  async listResolvedCallsSince(): Promise<TradeCallRecord[]> { return this.failUnusedCallMethod("listResolvedCallsSince"); }
  async sumRunRewards(): Promise<number> { return this.failUnusedCallMethod("sumRunRewards"); }
  async findLastRewardedCall(): Promise<TradeCallRecord | null> { return this.failUnusedCallMethod("findLastRewardedCall"); }
}

describe("getDailyMissionBoard", () => {
  let missionRepo: FakeMissionRepository;

  beforeEach(() => {
    missionRepo = new FakeMissionRepository();
  });

  it("returns the UTC day key and all three missions for a fresh user", async () => {
    const board = await getDailyMissionBoard(missionRepo, "user-1", NOW);

    expect(board.day).toBe(TODAY);
    expect(board.missions.map((m) => m.id)).toEqual([
      "daily-run",
      "daily-called-shots",
      "daily-profit",
    ]);
    expect(board.missions.every((m) => m.progress === 0 && !m.completed && !m.claimed)).toBe(true);
  });

  it("caps overshooting progress at the target but keeps completed", async () => {
    missionRepo.callHitsToday = 5; // Sniper target is 2

    const board = await getDailyMissionBoard(missionRepo, "user-1", NOW);

    const sniper = board.missions.find((m) => m.id === "daily-called-shots");
    expect(sniper).toMatchObject({ progress: 2, target: 2, completed: true });
  });

  it("maps each mission to its own counter", async () => {
    missionRepo.runsToday = 1;
    missionRepo.profitableRunsToday = 0;
    missionRepo.callHitsToday = 1;

    const board = await getDailyMissionBoard(missionRepo, "user-1", NOW);

    expect(board.missions.map((m) => [m.id, m.progress, m.completed])).toEqual([
      ["daily-run", 1, true],
      ["daily-called-shots", 1, false],
      ["daily-profit", 0, false],
    ]);
  });

  it("flags missions already claimed today", async () => {
    missionRepo.runsToday = 1;
    missionRepo.claims.push({ userId: "user-1", missionId: "daily-run", day: TODAY, reward: 10 });

    const board = await getDailyMissionBoard(missionRepo, "user-1", NOW);

    expect(board.missions.find((m) => m.id === "daily-run")?.claimed).toBe(true);
    expect(board.missions.find((m) => m.id === "daily-profit")?.claimed).toBe(false);
  });

  it("ignores claims recorded on a previous UTC day", async () => {
    missionRepo.claims.push({ userId: "user-1", missionId: "daily-run", day: "2026-08-11", reward: 10 });

    const board = await getDailyMissionBoard(missionRepo, "user-1", NOW);

    expect(board.missions.find((m) => m.id === "daily-run")?.claimed).toBe(false);
  });

  it("queries every counter from midnight UTC of the current day", async () => {
    await getDailyMissionBoard(missionRepo, "user-1", NOW);

    expect(missionRepo.receivedSinceDates).toHaveLength(3);
    for (const since of missionRepo.receivedSinceDates) {
      expect(since.toISOString()).toBe(TODAY_START);
    }
  });
});

describe("claimDailyMission", () => {
  let missionRepo: FakeMissionRepository;
  let callRepo: FakeMissionCallRepository;

  beforeEach(() => {
    missionRepo = new FakeMissionRepository();
    callRepo = new FakeMissionCallRepository();
  });

  it("records the claim and credits the reward on top of the balance", async () => {
    missionRepo.callHitsToday = 2;
    callRepo.balances.set("user-1", 10);

    const result = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-called-shots", NOW);

    expect(result).toEqual({ ok: true, reward: 15, diamonds: 25 });
    expect(missionRepo.claims).toEqual([
      { userId: "user-1", missionId: "daily-called-shots", day: TODAY, reward: 15 },
    ]);
    expect(callRepo.addDiamondsCalls).toEqual([{ userId: "user-1", amount: 15 }]);
  });

  it("rejects an unknown mission id with 400 and lists the valid ids", async () => {
    const result = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-nonsense", NOW);

    expect(result).toMatchObject({ ok: false, status: 400 });
    if (result.ok) return;
    expect(result.error).toContain('"daily-nonsense"');
    expect(result.error).toContain("daily-run, daily-called-shots, daily-profit");
  });

  it("rejects an incomplete mission with 422 and pays nothing", async () => {
    missionRepo.callHitsToday = 1; // Sniper needs 2

    const result = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-called-shots", NOW);

    expect(result).toMatchObject({ ok: false, status: 422 });
    if (result.ok) return;
    expect(result.error).toContain("progress 1 of 2");
    expect(callRepo.addDiamondsCalls).toEqual([]);
  });

  it("rejects a second claim of the same mission today with 409", async () => {
    missionRepo.runsToday = 1;
    await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);

    const again = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);

    expect(again).toMatchObject({ ok: false, status: 409 });
    expect(callRepo.addDiamondsCalls).toHaveLength(1);
  });

  it("answers 409 and pays nothing when the insert loses the race (backstop)", async () => {
    missionRepo.runsToday = 1;
    missionRepo.rejectNextClaim = true; // simulates the concurrent P2002 loser

    const result = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(callRepo.addDiamondsCalls).toEqual([]);
  });

  it("rolls the claim back and answers 500 when the diamond credit fails", async () => {
    missionRepo.runsToday = 1;
    callRepo.failNextAddDiamonds = true;

    const result = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Reward credit failed — mission claim rolled back, try again",
    });
    expect(missionRepo.claims).toEqual([]); // compensated — no orphan claim

    // The compensation makes a retry succeed instead of hitting 409.
    const retry = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);
    expect(retry).toEqual({ ok: true, reward: 10, diamonds: 10 });
  });

  it("allows claiming again on the next UTC day", async () => {
    missionRepo.runsToday = 1;
    await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);

    const nextDay = new Date("2026-08-13T00:00:00Z");
    const result = await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", nextDay);

    expect(result).toEqual({ ok: true, reward: 10, diamonds: 20 });
    expect(missionRepo.claims.map((claim) => claim.day)).toEqual([TODAY, "2026-08-13"]);
  });

  it("recomputes claim progress from midnight UTC of the claim day", async () => {
    missionRepo.runsToday = 1;

    await claimDailyMission(missionRepo, callRepo, "user-1", "daily-run", NOW);

    expect(missionRepo.receivedSinceDates.map((d) => d.toISOString())).toEqual([TODAY_START]);
  });
});
