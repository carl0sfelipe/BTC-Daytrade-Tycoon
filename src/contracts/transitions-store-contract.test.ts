import { describe, it, expect } from "vitest";
import {
  computeClosePosition,
  computeHedgeFlip,
  computeFreshOpen,
} from "@/lib/trading/transitions";
import type { Position, Trade, OrderHistoryItem, PendingOrder } from "@/store/types";

describe("Contract: Transitions → Store (patch shape)", () => {
  const mockPosition: Position = {
    side: "long",
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
  };

  it("computeClosePosition patch contains only valid TradingStore keys", () => {
    const patch = computeClosePosition(
      10000,
      mockPosition,
      52000,
      "manual",
      [],
      [],
      0,
      [],
      null
    );

    const allowedKeys = new Set([
      "wallet",
      "position",
      "closedTrades",
      "ordersHistory",
      "realizedPnL",
      "pendingOrders",
      "isLiquidated",
      "lastCloseReason",
    ]);

    for (const key of Object.keys(patch)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });

  it("patch wallet is never NaN or Infinity", () => {
    const patch = computeClosePosition(
      10000,
      mockPosition,
      52000,
      "manual",
      [],
      [],
      0,
      [],
      null
    );

    expect(Number.isFinite(patch.wallet)).toBe(true);
    expect(Number.isNaN(patch.wallet)).toBe(false);
  });

  it("computeHedgeFlip patch contains valid keys", () => {
    const patch = computeHedgeFlip(
      10000,
      mockPosition,
      52000,
      "short",
      10,
      2000,
      null,
      null,
      [],
      0,
      [],
      null
    );

    expect(patch).toHaveProperty("wallet");
    expect(patch).toHaveProperty("position");
    expect(patch).toHaveProperty("closedTrades");
    expect(Number.isFinite(patch.wallet)).toBe(true);
  });

  it("computeFreshOpen patch contains valid keys", () => {
    const patch = computeFreshOpen(
      10000,
      "long",
      50000,
      1000,
      10,
      null,
      null,
      [],
      null
    );

    expect(patch).toHaveProperty("position");
    expect(patch).toHaveProperty("wallet");
    expect(patch).toHaveProperty("ordersHistory");
    expect(Number.isFinite(patch.wallet)).toBe(true);
  });
});
