import { describe, it, expect, vi, afterEach } from "vitest";
import { claimDailyMissionRequest, fetchDailyMissionBoard } from "./missions-client";
import { DAILY_MISSIONS, buildMissionStatus } from "@/lib/missions/daily-missions";

const board = {
  day: "2026-08-12",
  missions: DAILY_MISSIONS.map((definition) => buildMissionStatus(definition, 0, false)),
};

function stubFetchWith(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDailyMissionBoard", () => {
  it("resolves the board on success", async () => {
    stubFetchWith(200, board);
    await expect(fetchDailyMissionBoard()).resolves.toEqual({ kind: "board", ...board });
  });

  it("resolves guest on 401 — signup CTA, not an error state", async () => {
    stubFetchWith(401, { error: "Authentication required" });
    await expect(fetchDailyMissionBoard()).resolves.toEqual({ kind: "guest" });
  });

  it("resolves error on a 500 — logged-in users must see a retry", async () => {
    stubFetchWith(500, { error: "boom" });
    await expect(fetchDailyMissionBoard()).resolves.toEqual({ kind: "error" });
  });

  it("resolves error instead of throwing on network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchDailyMissionBoard()).resolves.toEqual({ kind: "error" });
  });

  it("resolves error on a malformed 200 body", async () => {
    stubFetchWith(200, { unexpected: true });
    await expect(fetchDailyMissionBoard()).resolves.toEqual({ kind: "error" });
  });
});

describe("claimDailyMissionRequest", () => {
  it("resolves the payout on success", async () => {
    stubFetchWith(200, { reward: 10, diamonds: 42 });
    await expect(claimDailyMissionRequest("daily-run")).resolves.toEqual({
      reward: 10,
      diamonds: 42,
    });
  });

  it("resolves null when the server rejects the claim (e.g. 409)", async () => {
    stubFetchWith(409, { error: "already claimed" });
    await expect(claimDailyMissionRequest("daily-run")).resolves.toBeNull();
  });

  it("resolves null instead of throwing on network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(claimDailyMissionRequest("daily-run")).resolves.toBeNull();
  });
});
