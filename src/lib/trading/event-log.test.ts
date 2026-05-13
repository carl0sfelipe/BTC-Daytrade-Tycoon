import { describe, it, expect } from "vitest";
import {
  tradeToEventLogItem,
  orderToEventLogItem,
  buildEventLog,
} from "./event-log";
import { makeTrade, makeOrderHistoryItem } from "@/test/factories";

describe("tradeToEventLogItem", () => {
  it("maps manual close", () => {
    const trade = makeTrade({ reason: "manual", exitPrice: 51000, pnl: 100 });
    const event = tradeToEventLogItem(trade, 0);

    expect(event.type).toBe("manual");
    expect(event.label).toBe("Closed Manually");
    expect(event.price).toBe(51000);
    expect(event.pnl).toBe(100);
  });

  it("maps liquidation", () => {
    const trade = makeTrade({ reason: "liquidation", exitPrice: 45000, pnl: -500 });
    const event = tradeToEventLogItem(trade, 1);

    expect(event.type).toBe("liquidation");
    expect(event.label).toBe("Liquidated");
    expect(event.pnl).toBe(-500);
  });

  it("maps trailing stop", () => {
    const trade = makeTrade({ reason: "trailing_stop", exitPrice: 49000, pnl: -50 });
    const event = tradeToEventLogItem(trade, 2);

    expect(event.type).toBe("trailing_stop");
    expect(event.label).toBe("Trailing Stop");
  });
});

describe("orderToEventLogItem", () => {
  it("returns null for pending orders", () => {
    const order = makeOrderHistoryItem({ status: "pending" });
    expect(orderToEventLogItem(order, 0)).toBeNull();
  });

  it("maps canceled order", () => {
    const order = makeOrderHistoryItem({ status: "canceled", price: 48000 });
    const event = orderToEventLogItem(order, 0);

    expect(event?.type).toBe("order_canceled");
    expect(event?.label).toBe("Order Canceled");
    expect(event?.price).toBe(48000);
  });

  it("maps filled market order", () => {
    const order = makeOrderHistoryItem({ type: "market", status: "filled", executionPrice: 50050 });
    const event = orderToEventLogItem(order, 0);

    expect(event?.type).toBe("market_fill");
    expect(event?.label).toBe("Market Order Filled");
    expect(event?.price).toBe(50050);
  });

  it("maps filled limit order", () => {
    const order = makeOrderHistoryItem({ type: "limit", status: "filled", executionPrice: 49000 });
    const event = orderToEventLogItem(order, 0);

    expect(event?.type).toBe("limit_fill");
    expect(event?.label).toBe("Limit Order Filled");
  });

  it("maps filled tp order", () => {
    const order = makeOrderHistoryItem({ type: "tp", status: "filled", price: 55000 });
    const event = orderToEventLogItem(order, 0);

    expect(event?.type).toBe("tp");
    expect(event?.label).toBe("Take Profit");
  });

  it("maps filled sl order", () => {
    const order = makeOrderHistoryItem({ type: "sl", status: "filled", price: 48000 });
    const event = orderToEventLogItem(order, 0);

    expect(event?.type).toBe("sl");
    expect(event?.label).toBe("Stop Loss");
  });
});

describe("buildEventLog", () => {
  it("returns empty when no data", () => {
    expect(buildEventLog([], [])).toEqual([]);
  });

  it("includes only closed trades and non-pending orders", () => {
    const trades = [
      makeTrade({ reason: "tp", exitPrice: 55000, pnl: 500 }),
    ];
    const orders = [
      makeOrderHistoryItem({ status: "pending" }),
      makeOrderHistoryItem({ status: "canceled" }),
    ];

    const log = buildEventLog(trades, orders);
    expect(log).toHaveLength(2);
    expect(log.map((e) => e.type)).toContain("tp");
    expect(log.map((e) => e.type)).toContain("order_canceled");
  });

  it("reverses so most recent come first", () => {
    const trades = [
      makeTrade({ reason: "manual", exitPrice: 51000 }),
      makeTrade({ reason: "tp", exitPrice: 55000 }),
    ];

    const log = buildEventLog(trades, []);
    expect(log[0]?.type).toBe("tp");
    expect(log[1]?.type).toBe("manual");
  });
});
