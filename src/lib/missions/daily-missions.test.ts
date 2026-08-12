import { describe, it, expect } from "vitest";
import {
  DAILY_MISSIONS,
  buildMissionStatus,
  startOfUtcDay,
  utcDayKey,
} from "./daily-missions";

describe("DAILY_MISSIONS", () => {
  it("defines the three v1 missions in display order", () => {
    expect(DAILY_MISSIONS.map((mission) => mission.id)).toEqual([
      "daily-run",
      "daily-called-shots",
      "daily-profit",
    ]);
  });

  it("pays the v1 anchor rewards", () => {
    expect(DAILY_MISSIONS.map((mission) => mission.reward)).toEqual([10, 15, 12]);
  });
});

describe("startOfUtcDay", () => {
  it("truncates a mid-day instant to midnight UTC", () => {
    expect(startOfUtcDay(new Date("2026-08-12T15:47:03.212Z")).toISOString()).toBe(
      "2026-08-12T00:00:00.000Z"
    );
  });

  it("keeps an instant already at midnight UTC on the same day", () => {
    expect(startOfUtcDay(new Date("2026-08-12T00:00:00.000Z")).toISOString()).toBe(
      "2026-08-12T00:00:00.000Z"
    );
  });

  it("stays on the same UTC day at 23:59:59.999", () => {
    expect(startOfUtcDay(new Date("2026-08-12T23:59:59.999Z")).toISOString()).toBe(
      "2026-08-12T00:00:00.000Z"
    );
  });

  it("rolls over exactly at the UTC midnight boundary", () => {
    expect(startOfUtcDay(new Date("2026-08-13T00:00:00.000Z")).toISOString()).toBe(
      "2026-08-13T00:00:00.000Z"
    );
  });
});

describe("utcDayKey", () => {
  it("formats the UTC day as yyyy-mm-dd", () => {
    expect(utcDayKey(new Date("2026-08-12T03:00:00Z"))).toBe("2026-08-12");
  });

  it("uses the UTC date even when local timezones lag behind", () => {
    // 01:30 UTC on the 13th is still the evening of the 12th in UTC-3;
    // the shared reset must ignore the player's wall clock.
    expect(utcDayKey(new Date("2026-08-13T01:30:00Z"))).toBe("2026-08-13");
  });

  it("zero-pads month and day", () => {
    expect(utcDayKey(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });
});

describe("buildMissionStatus", () => {
  const sniper = DAILY_MISSIONS[1]; // target 2, reward 15

  it("caps displayed progress at the target while keeping completed true", () => {
    const status = buildMissionStatus(sniper, 5, false);
    expect(status).toMatchObject({ progress: 2, completed: true, claimed: false });
  });

  it("marks completed exactly at the target", () => {
    expect(buildMissionStatus(sniper, 2, false).completed).toBe(true);
  });

  it("reports progress below the target as incomplete", () => {
    const status = buildMissionStatus(sniper, 1, false);
    expect(status).toMatchObject({ progress: 1, completed: false });
  });

  it("passes the claimed flag through", () => {
    expect(buildMissionStatus(sniper, 2, true).claimed).toBe(true);
  });

  it("keeps the definition fields on the status", () => {
    const status = buildMissionStatus(sniper, 0, false);
    expect(status).toMatchObject({ id: "daily-called-shots", title: "Sniper", reward: 15 });
  });
});
