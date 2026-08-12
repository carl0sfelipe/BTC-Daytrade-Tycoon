import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildSessionRecordPayload,
  saveTradingSessionRecord,
  type EndSessionStatsSnapshot,
} from "./session-record-client";

const stats: EndSessionStatsSnapshot = {
  pnl: 2500,
  trades: 8,
  winRate: 62.5,
  returnPercent: 25,
  bestTrade: 900,
  worstTrade: -300,
  maxDrawdown: 4.2,
  traderScore: 70.6,
};

describe("buildSessionRecordPayload", () => {
  it("maps endStats and wallet values into the API shape", () => {
    const payload = buildSessionRecordPayload({
      stats,
      startingWallet: 10000,
      finalWallet: 12500,
      endReason: "manual",
    });

    expect(payload).toEqual({
      endReason: "manual",
      startingWallet: 10000,
      finalWallet: 12500,
      pnl: 2500,
      returnPercent: 25,
      trades: 8,
      winRate: 62.5,
      bestTrade: 900,
      worstTrade: -300,
      maxDrawdown: 4.2,
      traderScore: 71,
    });
  });

  it("clamps winRate into the 0–100 range", () => {
    const above = buildSessionRecordPayload({
      stats: { ...stats, winRate: 130 },
      startingWallet: 10000,
      finalWallet: 12500,
      endReason: "manual",
    });
    const below = buildSessionRecordPayload({
      stats: { ...stats, winRate: -5 },
      startingWallet: 10000,
      finalWallet: 12500,
      endReason: "manual",
    });
    expect(above.winRate).toBe(100);
    expect(below.winRate).toBe(0);
  });

  it("rounds traderScore to an integer as the API requires", () => {
    const payload = buildSessionRecordPayload({
      stats: { ...stats, traderScore: 54.4 },
      startingWallet: 10000,
      finalWallet: 12500,
      endReason: "liquidated",
    });
    expect(payload.traderScore).toBe(54);
    expect(payload.endReason).toBe("liquidated");
  });
});

describe("saveTradingSessionRecord", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const payload = buildSessionRecordPayload({
    stats,
    startingWallet: 10000,
    finalWallet: 12500,
    endReason: "manual",
  });

  const runRank = { rank: 2, totalRuns: 7, reward: 20, diamonds: 42 };

  it("resolves the run-rank award when the API accepts the record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session: {}, runRank }) })
    );
    await expect(saveTradingSessionRecord(payload)).resolves.toEqual(runRank);
  });

  it("resolves null when the response carries no award", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(saveTradingSessionRecord(payload)).resolves.toBeNull();
  });

  it("resolves null when the API rejects (e.g. logged out, 401)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(saveTradingSessionRecord(payload)).resolves.toBeNull();
  });

  it("resolves null instead of throwing on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(saveTradingSessionRecord(payload)).resolves.toBeNull();
  });
});
