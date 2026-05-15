import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeClosePosition,
  computeHedgeFlip,
  computeFreshOpen,
  computeReduceOrClose,
} from "./transitions";
import type { TradingSnapshot } from "./invariants";
import {
  assertWalletNonNegative,
  assertPositionConsistency,
  assertLiquidationFormula,
  assertPendingOrdersValid,
  assertNoOrphanPosition,
  assertHistoryMonotonic,
  assertAllInvariants,
} from "./invariants";

const baseSnapshot = (): TradingSnapshot => ({
  wallet: 10000,
  position: null,
  pendingOrders: [],
  closedTrades: [],
  ordersHistory: [],
});

const longPosition = () =>
  ({
    side: "long" as const,
    entry: 50000,
    size: 1000,
    leverage: 10,
    liquidationPrice: 45000,
    tpPrice: null,
    slPrice: null,
    trailingStopPercent: null,
    trailingStopPrice: null,
    entryTime: "now",
    entryTimestamp: 0,
    realizedPnL: 0,
  });

describe("assertWalletNonNegative", () => {
  it("returns null for positive wallet", () => {
    expect(assertWalletNonNegative(baseSnapshot())).toBeNull();
  });

  it("returns null for zero wallet", () => {
    expect(assertWalletNonNegative({ ...baseSnapshot(), wallet: 0 })).toBeNull();
  });

  it("returns error string for negative wallet", () => {
    const result = assertWalletNonNegative({ ...baseSnapshot(), wallet: -1 });
    expect(result).toContain("wallet must be >= 0");
  });

  it("returns error for NaN wallet", () => {
    expect(assertWalletNonNegative({ ...baseSnapshot(), wallet: NaN })).not.toBeNull();
  });
});

describe("assertPositionConsistency", () => {
  it("returns null when no position", () => {
    expect(assertPositionConsistency(baseSnapshot())).toBeNull();
  });

  it("returns null for valid long position", () => {
    const s = { ...baseSnapshot(), position: longPosition() };
    expect(assertPositionConsistency(s)).toBeNull();
  });

  it("catches size <= 0", () => {
    const s = { ...baseSnapshot(), position: { ...longPosition(), size: 0 } };
    expect(assertPositionConsistency(s)).toContain("size must be > 0");
  });

  it("catches leverage < 1", () => {
    const s = { ...baseSnapshot(), position: { ...longPosition(), leverage: 0.5 } };
    expect(assertPositionConsistency(s)).toContain("leverage must be >= 1");
  });

  it("catches negative liquidationPrice", () => {
    const s = { ...baseSnapshot(), position: { ...longPosition(), liquidationPrice: -100 } };
    expect(assertPositionConsistency(s)).toContain("liquidationPrice must be finite");
  });

  it("catches NaN liquidationPrice", () => {
    const s = { ...baseSnapshot(), position: { ...longPosition(), liquidationPrice: NaN } };
    expect(assertPositionConsistency(s)).not.toBeNull();
  });

  it("catches zero entry", () => {
    const s = { ...baseSnapshot(), position: { ...longPosition(), entry: 0 } };
    expect(assertPositionConsistency(s)).toContain("entry must be > 0");
  });
});

describe("assertLiquidationFormula", () => {
  it("returns null when no position", () => {
    expect(assertLiquidationFormula(baseSnapshot())).toBeNull();
  });

  it("long: liqPrice < entry passes", () => {
    const s = { ...baseSnapshot(), position: longPosition() };
    expect(assertLiquidationFormula(s)).toBeNull();
  });

  it("short: liqPrice > entry passes", () => {
    const s = {
      ...baseSnapshot(),
      position: { ...longPosition(), side: "short" as const, liquidationPrice: 55000 },
    };
    expect(assertLiquidationFormula(s)).toBeNull();
  });

  it("long: liqPrice >= entry fails", () => {
    const s = {
      ...baseSnapshot(),
      position: { ...longPosition(), liquidationPrice: 50001 },
    };
    expect(assertLiquidationFormula(s)).toContain("long liqPrice");
  });

  it("short: liqPrice <= entry fails", () => {
    const s = {
      ...baseSnapshot(),
      position: { ...longPosition(), side: "short" as const, liquidationPrice: 49999 },
    };
    expect(assertLiquidationFormula(s)).toContain("short liqPrice");
  });
});

describe("assertPendingOrdersValid", () => {
  it("returns null for empty pending orders", () => {
    expect(assertPendingOrdersValid(baseSnapshot())).toBeNull();
  });

  it("returns null for valid order", () => {
    const s = {
      ...baseSnapshot(),
      pendingOrders: [
        { id: "1", side: "long" as const, orderType: "open" as const, leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null, createdAt: "now" },
      ],
    };
    expect(assertPendingOrdersValid(s)).toBeNull();
  });

  it("catches size <= 0", () => {
    const s = {
      ...baseSnapshot(),
      pendingOrders: [
        { id: "1", side: "long" as const, orderType: "open" as const, leverage: 10, size: 0, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null, createdAt: "now" },
      ],
    };
    expect(assertPendingOrdersValid(s)).toContain("size must be > 0");
  });

  it("catches invalid orderType", () => {
    const s = {
      ...baseSnapshot(),
      pendingOrders: [
        { id: "1", side: "long" as const, orderType: "bad" as "open", leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null, createdAt: "now" },
      ],
    };
    expect(assertPendingOrdersValid(s)).toContain("orderType invalid");
  });

  it("catches limitPrice <= 0", () => {
    const s = {
      ...baseSnapshot(),
      pendingOrders: [
        { id: "1", side: "long" as const, orderType: "open" as const, leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 0, orderPrice: null, createdAt: "now" },
      ],
    };
    expect(assertPendingOrdersValid(s)).toContain("limitPrice must be > 0");
  });
});

describe("assertNoOrphanPosition", () => {
  it("returns null when position is null", () => {
    expect(assertNoOrphanPosition(baseSnapshot())).toBeNull();
  });

  it("returns null when position has size > 0", () => {
    expect(assertNoOrphanPosition({ ...baseSnapshot(), position: longPosition() })).toBeNull();
  });

  it("catches position with size 0", () => {
    const s = { ...baseSnapshot(), position: { ...longPosition(), size: 0 } };
    expect(assertNoOrphanPosition(s)).toContain("orphan position");
  });
});

describe("assertHistoryMonotonic", () => {
  it("returns null when histories grow", () => {
    const before = baseSnapshot();
    const after = { ...baseSnapshot(), closedTrades: [{}], ordersHistory: [{}] };
    expect(assertHistoryMonotonic(before, after)).toBeNull();
  });

  it("returns null when histories stay same", () => {
    expect(assertHistoryMonotonic(baseSnapshot(), baseSnapshot())).toBeNull();
  });

  it("catches closedTrades shrinking", () => {
    const before = { ...baseSnapshot(), closedTrades: [{}, {}] };
    const after = { ...baseSnapshot(), closedTrades: [{}] };
    expect(assertHistoryMonotonic(before, after)).toContain("closedTrades.length decreased");
  });

  it("catches ordersHistory shrinking", () => {
    const before = { ...baseSnapshot(), ordersHistory: [{}] };
    const after = baseSnapshot();
    expect(assertHistoryMonotonic(before, after)).toContain("ordersHistory.length decreased");
  });
});

describe("assertAllInvariants", () => {
  it("returns empty array for fully valid transition", () => {
    const before = baseSnapshot();
    const after = { ...baseSnapshot(), position: longPosition() };
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("returns all violations for a broken state", () => {
    const before = baseSnapshot();
    const after: TradingSnapshot = {
      wallet: -100,
      position: { ...longPosition(), size: 0, leverage: 0 },
      pendingOrders: [],
      closedTrades: [{}],
      ordersHistory: [],
    };
    const violations = assertAllInvariants(before, after);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.includes("wallet"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-based tests (fast-check) — Fase 2c
// ─────────────────────────────────────────────────────────────────────────────

const priceArb = fc.float({ min: 1000, max: 200000, noNaN: true, noDefaultInfinity: true });
const leverageArb = fc.integer({ min: 1, max: 50 });
const sizeArb = fc.float({ min: 100, max: 10000, noNaN: true, noDefaultInfinity: true });
const walletArb = fc.float({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true });
const sideArb = fc.constantFrom("long" as const, "short" as const);

function validPositionArb() {
  return fc.record({
    side: sideArb,
    entry: priceArb,
    leverage: leverageArb,
    size: sizeArb,
  }).map(({ side, entry, leverage, size }) => ({
    side,
    entry,
    size,
    leverage,
    liquidationPrice: side === "long" ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage),
    tpPrice: null,
    slPrice: null,
    trailingStopPercent: null,
    trailingStopPrice: null,
    entryTime: "now",
    entryTimestamp: 0,
    realizedPnL: 0,
    maxDrawdown: 0,
    peakUnrealizedPnl: 0,
  }));
}

describe("property-based: computeClosePosition", () => {
  it("wallet in result is always >= 0 (Math.max clamp)", () => {
    fc.assert(fc.property(
      walletArb, validPositionArb(), priceArb,
      (wallet, position, currentPrice) => {
        const patch = computeClosePosition(wallet, position, currentPrice, "manual", [], [], 0, [], null);
        expect(patch.wallet).toBeGreaterThanOrEqual(0);
        expect(patch.position).toBeNull();
        expect(patch.closedTrades).toHaveLength(1);
      }
    ));
  });

  it("assertAllInvariants passes: histories grow, wallet non-negative", () => {
    fc.assert(fc.property(
      walletArb, validPositionArb(), priceArb,
      (wallet, position, currentPrice) => {
        const before: TradingSnapshot = { wallet, position, pendingOrders: [], closedTrades: [], ordersHistory: [] };
        const patch = computeClosePosition(wallet, position, currentPrice, "manual", [], [], 0, [], null);
        const after: TradingSnapshot = { wallet: patch.wallet, position: patch.position, pendingOrders: patch.pendingOrders, closedTrades: patch.closedTrades, ordersHistory: patch.ordersHistory };
        expect(assertAllInvariants(before, after)).toEqual([]);
      }
    ));
  });
});

describe("property-based: computeFreshOpen", () => {
  it("resulting position has valid liqPrice direction", () => {
    fc.assert(fc.property(
      walletArb, sideArb, priceArb, sizeArb, leverageArb,
      (wallet, side, entryPrice, size, leverage) => {
        // Skip if wallet can't cover margin
        const margin = size / leverage;
        if (wallet < margin) return;

        const patch = computeFreshOpen(wallet, side, entryPrice, size, leverage, null, null, [], null);

        // Direction invariant
        if (side === "long") {
          expect(patch.position.liquidationPrice).toBeLessThan(entryPrice);
        } else {
          expect(patch.position.liquidationPrice).toBeGreaterThan(entryPrice);
        }
        // Structural validity
        expect(patch.position.size).toBe(size);
        expect(patch.position.leverage).toBe(leverage);
        expect(patch.wallet).toBeGreaterThanOrEqual(0);
      }
    ));
  });
});

describe("property-based: computeHedgeFlip", () => {
  it("flipped position has valid liqPrice direction and size is excessSize", () => {
    const flipInputArb = fc.record({
      wallet: walletArb,
      position: validPositionArb(),
      entryPrice: priceArb,
      newLeverage: leverageArb,
      extraSize: fc.float({ min: 1, max: 5000, noNaN: true, noDefaultInfinity: true }),
    }).filter(({ wallet, position, entryPrice, newLeverage, extraSize }) => {
      // Only generate inputs where canFlip would be true (effectiveWallet >= excessMargin)
      const priceDiff = position.side === "long" ? entryPrice - position.entry : position.entry - entryPrice;
      const closePnl = (priceDiff / position.entry) * position.size;
      const returnedMargin = position.size / position.leverage;
      const effectiveWallet = wallet + returnedMargin + closePnl;
      const excessMargin = extraSize / newLeverage;
      return effectiveWallet >= excessMargin && effectiveWallet >= 0;
    });

    fc.assert(fc.property(flipInputArb, ({ wallet, position, entryPrice, newLeverage, extraSize }) => {
      const newSide = position.side === "long" ? "short" : "long";
      const newSize = position.size + extraSize;

      const patch = computeHedgeFlip(wallet, position, entryPrice, newSide, newLeverage, newSize, null, null, [], 0, [], null);

      expect(patch.position.size).toBeCloseTo(extraSize, 0);
      expect(patch.position.side).toBe(newSide);
      if (newSide === "long") {
        expect(patch.position.liquidationPrice).toBeLessThan(entryPrice);
      } else {
        expect(patch.position.liquidationPrice).toBeGreaterThan(entryPrice);
      }
    }), { numRuns: 100 });
  });
});

describe("property-based: computeReduceOrClose", () => {
  it("if position remains after reduce, it is structurally consistent", () => {
    // Filter only requires reducedSize < position.size (partial reduce).
    // newWallet negative edge case is now handled by Math.max(0,...) in computeReduceOrClose.
    const reduceInputArb = fc.record({
      wallet: walletArb,
      position: validPositionArb(),
      entryPrice: priceArb,
      reducedSize: fc.float({ min: 1, max: 100, noNaN: true, noDefaultInfinity: true }),
      newLeverage: leverageArb,
    }).filter(({ position, reducedSize }) => reducedSize < position.size);

    fc.assert(fc.property(reduceInputArb, ({ wallet, position, entryPrice, reducedSize, newLeverage }) => {
      const newSide = position.side === "long" ? "short" : "long";
      const patch = computeReduceOrClose(wallet, position, entryPrice, reducedSize, newSide, newLeverage, [], [], 0, null);

      if (patch.position !== null) {
        expect(patch.position.size).toBeGreaterThan(0);
        expect(patch.position.leverage).toBe(position.leverage);
        // liqPrice direction should match original side
        if (position.side === "long") {
          expect(patch.position.liquidationPrice).toBeLessThan(position.entry);
        } else {
          expect(patch.position.liquidationPrice).toBeGreaterThan(position.entry);
        }
      }
    }), { numRuns: 100 });
  });
});
