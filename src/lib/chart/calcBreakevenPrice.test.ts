import { describe, it, expect } from "vitest";
import { calcBreakevenPrice } from "./calcBreakevenPrice";

describe("calcBreakevenPrice", () => {
  it("returns entry * (1 + feePct) for long", () => {
    const result = calcBreakevenPrice({ side: "long", entry: 50000 });
    expect(result).toBeCloseTo(50030, 2);
  });

  it("returns entry * (1 - feePct) for short", () => {
    const result = calcBreakevenPrice({ side: "short", entry: 50000 });
    expect(result).toBeCloseTo(49970, 2);
  });

  it("uses custom feePct when provided", () => {
    const result = calcBreakevenPrice({
      side: "long",
      entry: 50000,
      feePct: 0.001,
    });
    expect(result).toBeCloseTo(50050, 2);
  });

  it("throws for non-positive entry", () => {
    expect(() =>
      calcBreakevenPrice({ side: "long", entry: 0 })
    ).toThrowError(/Invalid entry: received 0, expected positive number/);
  });

  it("throws for negative feePct", () => {
    expect(() =>
      calcBreakevenPrice({ side: "long", entry: 50000, feePct: -0.001 })
    ).toThrowError(
      /Invalid feePct: received -0.001, expected non-negative number/
    );
  });
});
