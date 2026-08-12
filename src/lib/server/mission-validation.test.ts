import { describe, it, expect } from "vitest";
import { validateMissionClaimInput } from "./mission-validation";

describe("validateMissionClaimInput", () => {
  it("accepts a payload with a mission id string", () => {
    expect(validateMissionClaimInput({ missionId: "daily-run" })).toBeNull();
  });

  it("names the missing field for an empty object", () => {
    const error = validateMissionClaimInput({});
    expect(error).toContain("missionId");
  });

  it("rejects a null body (unparseable JSON)", () => {
    expect(validateMissionClaimInput(null)).not.toBeNull();
  });

  it("rejects a non-string mission id", () => {
    const error = validateMissionClaimInput({ missionId: 42 });
    expect(error).toContain("missionId");
  });

  it("rejects an empty mission id", () => {
    expect(validateMissionClaimInput({ missionId: "" })).not.toBeNull();
  });

  it("rejects an oversized mission id", () => {
    expect(validateMissionClaimInput({ missionId: "x".repeat(65) })).not.toBeNull();
  });
});
