import { describe, it, expect } from "vitest";
import {
  buildTrade,
  buildNewPosition,
  buildOrderHistoryItem,
  buildPendingOrder,
} from "./position-builders";

describe("buildTrade", () => {
  it("creates a trade with all provided fields", () => {
    const trade = buildTrade({
      side: "long",
      entryPrice: 50000,
      exitPrice: 51000,
      size: 1000,
      leverage: 10,
      margin: 100,
      pnl: 200,
      reason: "manual",
      entryTime: "01/01/2024, 12:00:00 PM",
      durationSeconds: 60,
    });

    expect(trade.side).toBe("long");
    expect(trade.pnl).toBe(200);
    expect(trade.entryPrice).toBe(50000);
    expect(trade.exitPrice).toBe(51000);
    expect(trade.reason).toBe("manual");
    expect(trade.durationSeconds).toBe(60);
  });
});

describe("buildNewPosition", () => {
  it("creates a position with calculated liquidation price", () => {
    const pos = buildNewPosition({
      side: "long",
      entryPrice: 50000,
      size: 1000,
      leverage: 10,
      tpPrice: 55000,
      slPrice: 48000,
    });

    expect(pos.side).toBe("long");
    expect(pos.entry).toBe(50000);
    expect(pos.size).toBe(1000);
    expect(pos.leverage).toBe(10);
    expect(pos.tpPrice).toBe(55000);
    expect(pos.slPrice).toBe(48000);
    expect(pos.liquidationPrice).toBe(45000);
    expect(pos.realizedPnL).toBe(0);
  });
});

describe("buildOrderHistoryItem", () => {
  it("creates a filled market order item", () => {
    const item = buildOrderHistoryItem({
      side: "long",
      type: "market",
      status: "filled",
      leverage: 10,
      size: 1000,
      price: 50000,
    });

    expect(item.side).toBe("long");
    expect(item.type).toBe("market");
    expect(item.status).toBe("filled");
    expect(item.price).toBe(50000);
    expect(item.updatedAt).not.toBeNull();
  });

  it("creates a pending limit order item", () => {
    const item = buildOrderHistoryItem({
      side: "short",
      type: "limit",
      status: "pending",
      leverage: 5,
      size: 500,
      price: 52000,
    });

    expect(item.status).toBe("pending");
    expect(item.updatedAt).toBeNull();
  });
});

describe("buildPendingOrder", () => {
  it("creates a pending order with generated id", () => {
    const order = buildPendingOrder({
      side: "long",
      orderType: "open",
      leverage: 10,
      size: 1000,
      limitPrice: 49000,
      tpPrice: 55000,
      slPrice: 48000,
    });

    expect(order.id).toBeTruthy();
    expect(order.orderType).toBe("open");
    expect(order.limitPrice).toBe(49000);
    expect(order.tpPrice).toBe(55000);
    expect(order.slPrice).toBe(48000);
    expect(order.orderPrice).toBeNull();
  });
});
