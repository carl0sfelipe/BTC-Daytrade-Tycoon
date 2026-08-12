import { describe, it, expect, beforeEach } from "vitest";
import { computeServerStreak, openTradeCall, resolveTradeCall } from "./call-service";
import type {
  CallRepository,
  NewTradeCallData,
  TradeCallRecord,
  TradeCallStatus,
} from "./call-repository";
import { CALL_REWARD_COOLDOWN_MS, MAX_DIAMONDS_PER_RUN } from "@/lib/calls/diamond-reward";

const T0 = new Date("2026-08-12T04:00:00Z");

function at(offsetMs: number): Date {
  return new Date(T0.getTime() + offsetMs);
}

/** In-memory CallRepository for service tests — no database involved. */
class FakeCallRepository implements CallRepository {
  calls: TradeCallRecord[] = [];
  diamonds = new Map<string, number>();
  private nextId = 1;

  async createCall(data: NewTradeCallData): Promise<TradeCallRecord> {
    const call: TradeCallRecord = {
      id: `call-${this.nextId++}`,
      status: "pending",
      reward: 0,
      createdAt: new Date(),
      resolvedAt: null,
      ...data,
    };
    this.calls.push(call);
    return call;
  }

  async findCallById(id: string): Promise<TradeCallRecord | null> {
    return this.calls.find((c) => c.id === id) ?? null;
  }

  async resolveCall(id: string, status: TradeCallStatus, reward: number, resolvedAt: Date): Promise<void> {
    const call = this.calls.find((c) => c.id === id);
    if (call) Object.assign(call, { status, reward, resolvedAt });
  }

  async listResolvedCalls(userId: string, limit: number): Promise<TradeCallRecord[]> {
    return this.calls
      .filter((c) => c.userId === userId && c.status !== "pending")
      .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0))
      .slice(0, limit);
  }

  async sumRunRewards(userId: string, runId: string): Promise<number> {
    return this.calls
      .filter((c) => c.userId === userId && c.runId === runId)
      .reduce((sum, c) => sum + c.reward, 0);
  }

  async findLastRewardedCall(userId: string): Promise<TradeCallRecord | null> {
    const rewarded = this.calls
      .filter((c) => c.userId === userId && c.reward > 0)
      .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0));
    return rewarded[0] ?? null;
  }

  async addDiamonds(userId: string, amount: number): Promise<number> {
    const next = (this.diamonds.get(userId) ?? 0) + amount;
    this.diamonds.set(userId, next);
    return next;
  }

  async getDiamonds(userId: string): Promise<number> {
    return this.diamonds.get(userId) ?? 0;
  }
}

const openInput = {
  runId: "run-1",
  side: "long" as const,
  entryPrice: 100_000,
  targetPrice: 110_000, // +10%
  leverage: 10,
};

describe("openTradeCall", () => {
  let repo: FakeCallRepository;

  beforeEach(() => {
    repo = new FakeCallRepository();
  });

  it("creates a pending call and recomputes targetPercent server-side", async () => {
    const result = await openTradeCall(repo, "user-1", openInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.call.status).toBe("pending");
    expect(result.call.targetPercent).toBeCloseTo(10);
  });

  it("rejects a target in the loss direction", async () => {
    const result = await openTradeCall(repo, "user-1", { ...openInput, targetPrice: 95_000 });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects noise targets below the minimum distance", async () => {
    const result = await openTradeCall(repo, "user-1", { ...openInput, targetPrice: 100_100 });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});

describe("resolveTradeCall", () => {
  let repo: FakeCallRepository;
  let callId: string;

  beforeEach(async () => {
    repo = new FakeCallRepository();
    const opened = await openTradeCall(repo, "user-1", openInput);
    callId = opened.ok ? opened.call.id : "";
  });

  it("pays the reward and credits diamonds on a hit", async () => {
    const result = await resolveTradeCall(repo, "user-1", callId, "hit", T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result).toEqual({ outcome: "hit", reward: 25, streak: 1, diamonds: 25 });
    expect(await repo.getDiamonds("user-1")).toBe(25);
  });

  it("resets the streak and pays nothing on a miss", async () => {
    const result = await resolveTradeCall(repo, "user-1", callId, "missed", T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result).toEqual({ outcome: "missed", reward: 0, streak: 0, diamonds: 0 });
  });

  it("preserves the streak on a voided call", async () => {
    // Build a streak of 1, then void a second call.
    await resolveTradeCall(repo, "user-1", callId, "hit", T0);
    const second = await openTradeCall(repo, "user-1", openInput);
    const result = await resolveTradeCall(
      repo, "user-1", second.ok ? second.call.id : "", "voided", at(CALL_REWARD_COOLDOWN_MS + 1)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.streak).toBe(1);
    expect(result.result.reward).toBe(0);
  });

  it("applies the streak multiplier derived from server history", async () => {
    await resolveTradeCall(repo, "user-1", callId, "hit", T0);
    const second = await openTradeCall(repo, "user-1", openInput);
    const result = await resolveTradeCall(
      repo, "user-1", second.ok ? second.call.id : "", "hit", at(CALL_REWARD_COOLDOWN_MS + 1)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.reward).toBe(31); // 25 × 1.25
    expect(result.result.streak).toBe(2);
  });

  it("pays 0 inside the cooldown but still advances the streak", async () => {
    await resolveTradeCall(repo, "user-1", callId, "hit", T0);
    const second = await openTradeCall(repo, "user-1", openInput);
    const result = await resolveTradeCall(
      repo, "user-1", second.ok ? second.call.id : "", "hit", at(1_000)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.reward).toBe(0);
    expect(result.result.streak).toBe(2);
    expect(await repo.getDiamonds("user-1")).toBe(25); // only the first payout
  });

  it("clamps payouts to the per-run cap", async () => {
    // Exhaust the run budget with a synthetic resolved call.
    const filler = await openTradeCall(repo, "user-1", openInput);
    await repo.resolveCall(filler.ok ? filler.call.id : "", "hit", MAX_DIAMONDS_PER_RUN - 10, at(-60_000));

    const result = await resolveTradeCall(repo, "user-1", callId, "hit", T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.reward).toBe(10);
  });

  it("rejects resolving someone else's call with 404", async () => {
    const result = await resolveTradeCall(repo, "user-2", callId, "hit", T0);
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("rejects double resolution with 409", async () => {
    await resolveTradeCall(repo, "user-1", callId, "hit", T0);
    const again = await resolveTradeCall(repo, "user-1", callId, "hit", at(60_000));
    expect(again).toMatchObject({ ok: false, status: 409 });
  });
});

describe("computeServerStreak", () => {
  function resolved(status: TradeCallStatus, minutesAgo: number): TradeCallRecord {
    return {
      id: `c-${status}-${minutesAgo}`,
      userId: "user-1",
      runId: "run-1",
      side: "long",
      entryPrice: 100,
      targetPrice: 110,
      targetPercent: 10,
      leverage: 10,
      status,
      reward: 0,
      createdAt: at(-minutesAgo * 60_000),
      resolvedAt: at(-minutesAgo * 60_000),
    };
  }

  it("counts consecutive hits, newest first", () => {
    expect(computeServerStreak([resolved("hit", 1), resolved("hit", 2), resolved("missed", 3)])).toBe(2);
  });

  it("treats voided calls as transparent", () => {
    expect(computeServerStreak([resolved("voided", 1), resolved("hit", 2), resolved("hit", 3)])).toBe(2);
  });

  it("stops at the first miss", () => {
    expect(computeServerStreak([resolved("missed", 1), resolved("hit", 2)])).toBe(0);
  });
});
