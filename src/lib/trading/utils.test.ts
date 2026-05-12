import { describe, it, expect } from "vitest";
import { generateId, formatTimestamp } from "./utils";

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique values on consecutive calls", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe("formatTimestamp", () => {
  it("returns a string containing date components", () => {
    const ts = formatTimestamp();
    expect(typeof ts).toBe("string");
    expect(ts.length).toBeGreaterThan(10);
  });
});
