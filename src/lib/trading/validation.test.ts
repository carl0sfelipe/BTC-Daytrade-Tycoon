import { describe, it, expect } from "vitest";
import { validateTpSl, validateOpenPosition } from "./validation";

describe("validateTpSl", () => {
  it("returns null for valid long TP/SL", () => {
    expect(validateTpSl("long", 50000, 55000, 48000)).toBeNull();
  });

  it("returns error when long TP is below entry", () => {
    const err = validateTpSl("long", 50000, 45000, null);
    expect(err).toContain("Invalid TP");
    expect(err).toContain("ABOVE entry");
  });

  it("returns error when short TP is above entry", () => {
    const err = validateTpSl("short", 50000, 55000, null);
    expect(err).toContain("Invalid TP");
    expect(err).toContain("BELOW entry");
  });

  it("returns error when long SL is above entry", () => {
    const err = validateTpSl("long", 50000, null, 51000);
    expect(err).toContain("Invalid SL");
    expect(err).toContain("BELOW entry");
  });

  it("returns null when both are null", () => {
    expect(validateTpSl("long", 50000, null, null)).toBeNull();
  });
});

describe("validateOpenPosition", () => {
  it("returns null for valid params", () => {
    expect(validateOpenPosition(50000, 1000, 10, 10000, 100)).toBeNull();
  });

  it("returns error for invalid entry price", () => {
    expect(validateOpenPosition(0, 1000, 10, 10000, 100)).toBe(
      "Invalid entry price"
    );
  });

  it("returns error for zero size", () => {
    expect(validateOpenPosition(50000, 0, 10, 10000, 100)).toBe(
      "Position size must be greater than 0"
    );
  });

  it("returns error for zero leverage", () => {
    expect(validateOpenPosition(50000, 1000, 0, 10000, 100)).toBe(
      "Leverage must be greater than 0"
    );
  });

  it("returns error for insufficient wallet", () => {
    expect(validateOpenPosition(50000, 1000, 10, 50, 100)).toBe(
      "Insufficient wallet balance"
    );
  });
});
