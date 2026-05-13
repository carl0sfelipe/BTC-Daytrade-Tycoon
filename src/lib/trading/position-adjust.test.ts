import { describe, it, expect } from "vitest";
import { computeSizeIncrease, computeAddToPosition, computePartialReduce } from "./position-adjust";
import type { Position } from "@/store/domain-types";

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    side: "long",
    entry: 80000,
    size: 1000,
    leverage: 10,
    tpPrice: null,
    slPrice: null,
    trailingStopPercent: null,
    trailingStopPrice: null,
    liquidationPrice: 72000, // 80000 * (1 - 1/10)
    entryTime: "2024-01-01T00:00:00Z",
    entryTimestamp: Date.now(),
    realizedPnL: 0,
    maxDrawdown: 0,
    peakUnrealizedPnl: 0,
    ...overrides,
  };
}

// ─── computeSizeIncrease ─────────────────────────────────────────────────────

describe("computeSizeIncrease", () => {
  it("recalculates liqPrice when averaging UP on long", () => {
    const pos = makePosition({ entry: 80000, liquidationPrice: 72000, leverage: 10 });
    const result = computeSizeIncrease(10000, pos, 2000, 90000, []);
    // newEntry = (1000*80000 + 1000*90000) / 2000 = 85000
    // rawLiqPrice = 85000 * (1 - 1/10) = 76500
    expect(result.position.entry).toBeCloseTo(85000, 0);
    expect(result.position.liquidationPrice).toBeCloseTo(76500, 0);
  });

  it("recalculates liqPrice when averaging DOWN on long — bug: Math.max frozen liqPrice", () => {
    // Reproduces the reported bug:
    // Position opened at 80500 with x125 → liqPrice = 79856
    // Market drops to 79778 (below liqPrice!), user doubles position
    // Math.max was freezing liqPrice at 79856 instead of recomputing from new entry
    const pos = makePosition({
      side: "long",
      entry: 80500,
      size: 72783,
      leverage: 125,
      liquidationPrice: 80500 * (1 - 1 / 125), // ~79856
    });
    const addPrice = 79778;
    const result = computeSizeIncrease(10000, pos, 145483, addPrice, []);

    const additionalSize = 145483 - 72783;
    const expectedNewEntry = (72783 * 80500 + additionalSize * addPrice) / 145483;
    const expectedLiqPrice = expectedNewEntry * (1 - 1 / 125);

    expect(result.position.entry).toBeCloseTo(expectedNewEntry, 0);
    // Must use rawLiqPrice from new entry, NOT the frozen old value
    expect(result.position.liquidationPrice).toBeCloseTo(expectedLiqPrice, 0);
  });

  it("recalculates liqPrice when averaging DOWN on short — bug: Math.min frozen liqPrice", () => {
    const pos = makePosition({
      side: "short",
      entry: 50000,
      size: 1000,
      leverage: 10,
      liquidationPrice: 55000,
    });
    // Adding at 60000 (above short entry = averaging against position)
    const result = computeSizeIncrease(10000, pos, 2000, 60000, []);
    // newEntry = (1000*50000 + 1000*60000) / 2000 = 55000
    // rawLiqPrice = 55000 * (1 + 1/10) = 60500
    expect(result.position.entry).toBeCloseTo(55000, 0);
    expect(result.position.liquidationPrice).toBeCloseTo(60500, 0);
  });

  it("recalculates liqPrice when averaging UP on short", () => {
    const pos = makePosition({
      side: "short",
      entry: 50000,
      size: 1000,
      leverage: 10,
      liquidationPrice: 55000,
    });
    // Adding at 40000 (below short entry = averaging with position)
    const result = computeSizeIncrease(10000, pos, 2000, 40000, []);
    // newEntry = 45000, rawLiqPrice = 45000 * 1.1 = 49500
    expect(result.position.entry).toBeCloseTo(45000, 0);
    expect(result.position.liquidationPrice).toBeCloseTo(49500, 0);
  });

  it("deducts correct margin from wallet", () => {
    const pos = makePosition({ size: 1000, leverage: 10 });
    const result = computeSizeIncrease(5000, pos, 2000, 80000, []);
    const additionalMargin = (2000 - 1000) / 10;
    expect(result.wallet).toBe(5000 - additionalMargin);
  });

  it("appends order to history", () => {
    const pos = makePosition();
    const result = computeSizeIncrease(5000, pos, 2000, 80000, []);
    expect(result.ordersHistory).toHaveLength(1);
    expect(result.ordersHistory[0].size).toBe(1000); // additionalSize
    expect(result.ordersHistory[0].price).toBe(80000);
  });
});

// ─── computeAddToPosition ────────────────────────────────────────────────────

describe("computeAddToPosition", () => {
  it("recalculates liqPrice when adding at lower price on long — bug case", () => {
    const pos = makePosition({
      side: "long",
      entry: 80000,
      size: 1000,
      leverage: 10,
      liquidationPrice: 72000,
    });
    const result = computeAddToPosition(5000, pos, 1000, 70000, null, null);
    // newEntry = (1000*80000 + 1000*70000) / 2000 = 75000
    // rawLiqPrice = 75000 * (1 - 1/10) = 67500
    expect(result.position.entry).toBeCloseTo(75000, 0);
    expect(result.position.liquidationPrice).toBeCloseTo(67500, 0);
  });

  it("recalculates liqPrice when adding at higher price on long", () => {
    const pos = makePosition({
      side: "long",
      entry: 80000,
      size: 1000,
      leverage: 10,
      liquidationPrice: 72000,
    });
    const result = computeAddToPosition(5000, pos, 1000, 90000, null, null);
    // newEntry = 85000, rawLiqPrice = 76500
    expect(result.position.entry).toBeCloseTo(85000, 0);
    expect(result.position.liquidationPrice).toBeCloseTo(76500, 0);
  });

  it("deducts margin from wallet", () => {
    const pos = makePosition({ leverage: 10 });
    const result = computeAddToPosition(5000, pos, 500, 80000, null, null);
    expect(result.wallet).toBe(5000 - 500 / 10);
  });
});

// ─── computePartialReduce ────────────────────────────────────────────────────

describe("computePartialReduce", () => {
  it("returns null position when reducing entire size", () => {
    const pos = makePosition({ size: 1000, entry: 80000 });
    const result = computePartialReduce(5000, pos, 1000, 82000, [], [], 0);
    expect(result.position).toBeNull();
  });

  it("reduces position size correctly", () => {
    const pos = makePosition({ size: 1000, entry: 80000 });
    const result = computePartialReduce(5000, pos, 400, 82000, [], [], 0);
    expect(result.position?.size).toBe(600);
  });

  it("returns profit to wallet for long when price rose", () => {
    const pos = makePosition({ size: 1000, entry: 80000, leverage: 10 });
    const result = computePartialReduce(0, pos, 1000, 82000, [], [], 0);
    // pnl = (82000-80000)/80000 * 1000 = 25
    // margin returned = 1000/10 = 100
    expect(result.wallet).toBeCloseTo(0 + 100 + 25, 0);
  });

  it("creates a trade record when closing full position", () => {
    const pos = makePosition({ size: 1000, side: "long" });
    const result = computePartialReduce(5000, pos, 1000, 82000, [], [], 0);
    expect(result.closedTrades).toHaveLength(1);
    expect(result.closedTrades[0].reason).toBe("manual");
  });
});
