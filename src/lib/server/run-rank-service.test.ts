import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { awardRunRankReward, RUN_REWARD_COOLDOWN_MS } from "./run-rank-service";
import { RUN_RANK_WINDOW_MS } from "./run-rank-reward";
import type {
  RankableSessionRow,
  StoredTradingSession,
  TradingSessionRepository,
} from "./trading-session-repository";
import type { CallRepository, TradeCallRecord } from "./call-repository";

const NOW = new Date("2026-08-12T12:00:00Z");

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

/** In-memory session store — only the count queries matter for run rank. */
class FakeTradingSessionRepository implements TradingSessionRepository {
  private runs: Array<{ userId: string; returnPercent: number; createdAt: Date }> = [];

  seedRun(userId: string, returnPercent: number, createdAt: Date): void {
    this.runs.push({ userId, returnPercent, createdAt });
  }

  async countSessionsSince(since: Date): Promise<number> {
    return this.runs.filter((run) => run.createdAt >= since).length;
  }

  async countSessionsWithHigherReturnSince(since: Date, returnPercent: number): Promise<number> {
    return this.runs.filter(
      (run) => run.createdAt >= since && run.returnPercent > returnPercent
    ).length;
  }

  async countUserSessionsSince(userId: string, since: Date): Promise<number> {
    return this.runs.filter((run) => run.userId === userId && run.createdAt >= since).length;
  }

  async insertSession(): Promise<StoredTradingSession> {
    throw new Error("FakeTradingSessionRepository.insertSession — not exercised by run-rank tests");
  }

  async listSessionsByUser(): Promise<StoredTradingSession[]> {
    throw new Error("FakeTradingSessionRepository.listSessionsByUser — not exercised by run-rank tests");
  }

  async listRankableSessions(): Promise<RankableSessionRow[]> {
    throw new Error("FakeTradingSessionRepository.listRankableSessions — not exercised by run-rank tests");
  }
}

/** Reduced CallRepository fake: only the diamond ledger is exercised here. */
class FakeCallRepository implements CallRepository {
  balances = new Map<string, number>();
  addDiamondsCalls: Array<{ userId: string; amount: number }> = [];

  async addDiamonds(userId: string, amount: number): Promise<number> {
    this.addDiamondsCalls.push({ userId, amount });
    const next = (this.balances.get(userId) ?? 0) + amount;
    this.balances.set(userId, next);
    return next;
  }

  async getDiamonds(userId: string): Promise<number> {
    return this.balances.get(userId) ?? 0;
  }

  private failUnusedCallMethod(method: string): never {
    throw new Error(`FakeCallRepository.${method} — not exercised by run-rank tests`);
  }

  async createCall(): Promise<TradeCallRecord> { return this.failUnusedCallMethod("createCall"); }
  async findCallById(): Promise<TradeCallRecord | null> { return this.failUnusedCallMethod("findCallById"); }
  async resolveCall(): Promise<void> { return this.failUnusedCallMethod("resolveCall"); }
  async listResolvedCalls(): Promise<TradeCallRecord[]> { return this.failUnusedCallMethod("listResolvedCalls"); }
  async listResolvedCallsSince(): Promise<TradeCallRecord[]> { return this.failUnusedCallMethod("listResolvedCallsSince"); }
  async sumRunRewards(): Promise<number> { return this.failUnusedCallMethod("sumRunRewards"); }
  async findLastRewardedCall(): Promise<TradeCallRecord | null> { return this.failUnusedCallMethod("findLastRewardedCall"); }
}

describe("awardRunRankReward", () => {
  let sessionRepo: FakeTradingSessionRepository;
  let callRepo: FakeCallRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    sessionRepo = new FakeTradingSessionRepository();
    callRepo = new FakeCallRepository();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("awards rank 1 of 3 and credits 30 on top of the existing balance", async () => {
    sessionRepo.seedRun("rival", 5, hoursAgo(2));
    sessionRepo.seedRun("rival", 8, hoursAgo(1));
    sessionRepo.seedRun("user-1", 12, hoursAgo(0)); // the just-saved run
    callRepo.balances.set("user-1", 10);

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 12);

    expect(award).toEqual({ rank: 1, totalRuns: 3, reward: 30, diamonds: 40 });
    expect(callRepo.addDiamondsCalls).toEqual([{ userId: "user-1", amount: 30 }]);
  });

  it("ignores sessions older than the 24h window", async () => {
    sessionRepo.seedRun("rival", 99, new Date(NOW.getTime() - RUN_RANK_WINDOW_MS - 1));
    sessionRepo.seedRun("rival", 5, hoursAgo(2));
    sessionRepo.seedRun("rival", 8, hoursAgo(1));
    sessionRepo.seedRun("user-1", 12, hoursAgo(0));

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 12);

    expect(award).toMatchObject({ rank: 1, totalRuns: 3 });
  });

  it("does not count ties as higher returns (strict gt)", async () => {
    sessionRepo.seedRun("rival", 10, hoursAgo(2));
    sessionRepo.seedRun("rival", 5, hoursAgo(1));
    sessionRepo.seedRun("user-1", 10, hoursAgo(0));

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 10);

    expect(award).toMatchObject({ rank: 1, reward: 30 });
  });

  it("pays the participation floor of 2 for a last-place run", async () => {
    sessionRepo.seedRun("rival", 20, hoursAgo(3));
    sessionRepo.seedRun("rival", 15, hoursAgo(2));
    sessionRepo.seedRun("rival", 10, hoursAgo(1));
    sessionRepo.seedRun("user-1", -4, hoursAgo(0));

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", -4);

    // Reward is always > 0 (participation floor), so addDiamonds always runs.
    expect(award).toEqual({ rank: 4, totalRuns: 4, reward: 2, diamonds: 2 });
    expect(callRepo.addDiamondsCalls).toEqual([{ userId: "user-1", amount: 2 }]);
    expect(await callRepo.getDiamonds("user-1")).toBe(2);
  });

  it("pays the podium tier for rank 3 in a field of 6", async () => {
    const rivalReturns = [30, 25, 18, 12, 6];
    rivalReturns.forEach((value, index) => sessionRepo.seedRun("rival", value, hoursAgo(index + 1)));
    sessionRepo.seedRun("user-1", 20, hoursAgo(0)); // beats 18/12/6 → rank 3

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 20);

    expect(award).toEqual({ rank: 3, totalRuns: 6, reward: 20, diamonds: 20 });
  });

  it("returns null and credits nothing when the user replays inside the cooldown", async () => {
    sessionRepo.seedRun("user-1", 40, minutesAgo(2)); // earlier run, inside the 5-min cooldown
    sessionRepo.seedRun("user-1", 45, hoursAgo(0)); // the replayed just-saved run

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 45);

    expect(award).toBeNull();
    expect(callRepo.addDiamondsCalls).toEqual([]);
  });

  it("awards again once the previous run is older than the cooldown", async () => {
    sessionRepo.seedRun("user-1", 40, new Date(NOW.getTime() - RUN_REWARD_COOLDOWN_MS - 1));
    sessionRepo.seedRun("user-1", 45, hoursAgo(0));

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 45);

    expect(award).toMatchObject({ rank: 1, totalRuns: 2, reward: 2 });
  });

  it("a rival's run inside the cooldown does not block the award", async () => {
    sessionRepo.seedRun("rival", 40, minutesAgo(1));
    sessionRepo.seedRun("user-1", 45, hoursAgo(0));

    const award = await awardRunRankReward(sessionRepo, callRepo, "user-1", 45);

    expect(award).not.toBeNull();
    expect(callRepo.addDiamondsCalls).toHaveLength(1);
  });
});
