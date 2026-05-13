import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "@/store/tradingStore";

describe("Contract: Orders → Position (cross-slice calls)", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      closedTrades: [],
      ordersHistory: [],
      pendingOrders: [],
      realizedPnL: 0,
      currentPrice: 50000,
      reduceOnly: false,
    });
  });

  it("checkPendingOrders never calls openPosition with size <= 0", () => {
    // Setup: open long, place opposite limit at price that will hit
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    useTradingStore.getState().addPendingOrder({
      side: "short",
      orderType: "open",
      leverage: 10,
      size: 500, // less than position.size
      tpPrice: null,
      slPrice: null,
      limitPrice: 51000,
      orderPrice: null,
    });

    // Price hits limit — should reduce, not flip with invalid size
    useTradingStore.getState().checkPendingOrders(51000, 50000, 52000);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(0);
    expect(state.position).not.toBeNull();
    expect(state.position!.size).toBe(500);
  });

  it("after checkPendingOrders, pendingOrders only contains non-executed orders", () => {
    useTradingStore.getState().addPendingOrder({
      side: "long",
      orderType: "open",
      leverage: 10,
      size: 500,
      tpPrice: null,
      slPrice: null,
      limitPrice: 48000,
      orderPrice: null,
    });

    useTradingStore.getState().addPendingOrder({
      side: "short",
      orderType: "open",
      leverage: 10,
      size: 300,
      tpPrice: null,
      slPrice: null,
      limitPrice: 52000,
      orderPrice: null,
    });

    // Price 49000: first order executes (long limit 48000 touched by wick low),
    // second doesn't (short limit 52000, high=51000 < 52000)
    useTradingStore.getState().checkPendingOrders(49000, 48000, 51000);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].size).toBe(300);
  });

  it("TP order execution calls closePosition with reason 'tp'", () => {
    useTradingStore.setState({
      wallet: 9900,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: 55000,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    useTradingStore.getState().addPendingOrder({
      side: "long",
      orderType: "take_profit",
      leverage: 10,
      size: 1000,
      limitPrice: 55000,
      orderPrice: null,
      tpPrice: null,
      slPrice: null,
    });

    useTradingStore.getState().checkPendingOrders(55000, 54000, 56000);

    const state = useTradingStore.getState();
    expect(state.position).toBeNull();
    expect(state.closedTrades).toHaveLength(1);
    expect(state.closedTrades[0].reason).toBe("tp");
  });
});
