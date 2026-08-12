import { describe, expect, it } from "vitest";
import {
  clampGuestDiamondMigration,
  GUEST_DIAMOND_MIGRATION_CAP,
} from "./guest-diamond-migration";

describe("clampGuestDiamondMigration", () => {
  it("returns 0 when the client sent nothing", () => {
    expect(clampGuestDiamondMigration(undefined)).toBe(0);
  });

  it("passes an honest guest balance through", () => {
    expect(clampGuestDiamondMigration(87)).toBe(87);
  });

  it("clamps tampered payloads to the one-run cap", () => {
    expect(clampGuestDiamondMigration(9_999_999)).toBe(GUEST_DIAMOND_MIGRATION_CAP);
  });

  it("floors fractional values and zeroes negatives", () => {
    expect(clampGuestDiamondMigration(42.9)).toBe(42);
    expect(clampGuestDiamondMigration(-5)).toBe(0);
  });

  it("zeroes non-finite values", () => {
    expect(clampGuestDiamondMigration(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampGuestDiamondMigration(Number.NaN)).toBe(0);
  });
});
