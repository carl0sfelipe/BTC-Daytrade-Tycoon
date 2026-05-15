import { describe, it, expect } from "vitest";
import { computeTraderScore, getTraderTier } from "./trader-score";

describe("computeTraderScore", () => {
  it("returns 100 for perfect session", () => {
    expect(computeTraderScore({ winRate: 100, returnPercent: 50, profitFactor: 5, maxDrawdown: 0 })).toBe(100);
  });

  it("returns 0 for terrible session", () => {
    expect(computeTraderScore({ winRate: 0, returnPercent: -50, profitFactor: 0, maxDrawdown: 100 })).toBe(0);
  });

  it("weights drawdown heavily", () => {
    const highDrawdown = computeTraderScore({ winRate: 80, returnPercent: 20, profitFactor: 2, maxDrawdown: 40 });
    const lowDrawdown = computeTraderScore({ winRate: 80, returnPercent: 20, profitFactor: 2, maxDrawdown: 5 });
    expect(lowDrawdown).toBeGreaterThan(highDrawdown);
  });

  it("caps at 100", () => {
    expect(computeTraderScore({ winRate: 100, returnPercent: 100, profitFactor: 10, maxDrawdown: 0 })).toBe(100);
  });
});

describe("getTraderTier", () => {
  it("returns Diamond for 90+", () => {
    expect(getTraderTier(95).label).toBe("Diamond");
  });
  it("returns Gold for 75–89", () => {
    expect(getTraderTier(80).label).toBe("Gold");
  });
  it("returns Silver for 50–74", () => {
    expect(getTraderTier(60).label).toBe("Silver");
  });
  it("returns Bronze for < 50", () => {
    expect(getTraderTier(30).label).toBe("Bronze");
  });
});
