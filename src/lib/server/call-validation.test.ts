import { describe, it, expect } from "vitest";
import { validateOpenCallInput, validateResolveCallInput } from "./call-validation";

const validOpen = {
  runId: "run-abc",
  side: "long",
  entryPrice: 100_000,
  targetPrice: 105_000,
  leverage: 10,
};

describe("validateOpenCallInput", () => {
  it("accepts a valid payload", () => {
    expect(validateOpenCallInput(validOpen)).toBeNull();
  });

  it("rejects an unknown side", () => {
    expect(validateOpenCallInput({ ...validOpen, side: "sideways" })).toContain("side");
  });

  it("rejects non-positive prices", () => {
    expect(validateOpenCallInput({ ...validOpen, entryPrice: 0 })).toContain("entryPrice");
    expect(validateOpenCallInput({ ...validOpen, targetPrice: -5 })).toContain("targetPrice");
  });

  it("rejects leverage outside 1–125", () => {
    expect(validateOpenCallInput({ ...validOpen, leverage: 0 })).toContain("leverage");
    expect(validateOpenCallInput({ ...validOpen, leverage: 200 })).toContain("leverage");
  });

  it("rejects a targetPercent smuggled by the client (unknown field ignored, no crash)", () => {
    // Extra fields are stripped by zod — the service recomputes the distance.
    expect(validateOpenCallInput({ ...validOpen, targetPercent: 50 })).toBeNull();
  });

  it("rejects a missing runId", () => {
    const { runId: _runId, ...withoutRunId } = validOpen;
    expect(validateOpenCallInput(withoutRunId)).toContain("runId");
  });
});

describe("validateResolveCallInput", () => {
  it("accepts the three outcomes", () => {
    expect(validateResolveCallInput({ outcome: "hit" })).toBeNull();
    expect(validateResolveCallInput({ outcome: "missed" })).toBeNull();
    expect(validateResolveCallInput({ outcome: "voided" })).toBeNull();
  });

  it("rejects anything else", () => {
    expect(validateResolveCallInput({ outcome: "jackpot" })).toContain("outcome");
    expect(validateResolveCallInput({})).toContain("outcome");
  });
});
