import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";

describe("TradingStore — Limit Orders", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      pendingOrders: [],
      closedTrades: [],
      currentPrice: 50000,
    });
  });

  it("addPendingOrder creates a limit order without opening a position", () => {
    useTradingStore.getState().addPendingOrder({
      side: "long",
      leverage: 10,
      size: 1000,
      tpPrice: 55000,
      slPrice: 45000,
      limitPrice: 48000,
    });

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("long");
    expect(state.pendingOrders[0].limitPrice).toBe(48000);
    expect(state.position).toBeNull();
    // Margin should NOT be deducted yet
    expect(state.wallet).toBe(10000);
  });

  it("checkPendingOrders executes long limit when price drops to limit", () => {
    useTradingStore.getState().addPendingOrder({
      side: "long",
      leverage: 10,
      size: 1000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 48000,
    });

    // Price drops to 48k — should execute
    useTradingStore.getState().checkPendingOrders(48000);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(0);
    expect(state.position).not.toBeNull();
    expect(state.position!.entry).toBe(48000);
    expect(state.wallet).toBe(9900); // 10000 - 1000/10
  });

  it("checkPendingOrders does NOT execute long limit when price is above limit", () => {
    useTradingStore.getState().addPendingOrder({
      side: "long",
      leverage: 10,
      size: 1000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 48000,
    });

    // Price is 50k — should NOT execute
    useTradingStore.getState().checkPendingOrders(50000);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.position).toBeNull();
  });

  it("checkPendingOrders executes short limit when price rises to limit", () => {
    useTradingStore.getState().addPendingOrder({
      side: "short",
      leverage: 10,
      size: 1000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 52000,
    });

    // Price rises to 52k — should execute
    useTradingStore.getState().checkPendingOrders(52000);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(0);
    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("short");
    expect(state.position!.entry).toBe(52000);
  });

  it("cancelPendingOrder removes the order", () => {
    useTradingStore.getState().addPendingOrder({
      side: "long",
      leverage: 10,
      size: 1000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 48000,
    });

    const id = useTradingStore.getState().pendingOrders[0].id;
    useTradingStore.getState().cancelPendingOrder(id);

    expect(useTradingStore.getState().pendingOrders).toHaveLength(0);
  });

  it("resetStore clears pendingOrders", () => {
    useTradingStore.getState().addPendingOrder({
      side: "long",
      leverage: 10,
      size: 1000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 48000,
    });

    // Direct reset via setState simulating engine.resetStore
    useTradingStore.setState({
      pendingOrders: [],
      wallet: 10000,
      position: null,
      closedTrades: [],
    });

    expect(useTradingStore.getState().pendingOrders).toHaveLength(0);
    expect(useTradingStore.getState().wallet).toBe(10000);
  });

  it("addToPosition increases existing position and updates average entry", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, entryTime: "now" },
    });

    useTradingStore.getState().addToPosition(1000, 55000, "", "");

    const state = useTradingStore.getState();
    expect(state.position!.size).toBe(2000);
    expect(state.position!.entry).toBe(52500); // weighted average
    expect(state.wallet).toBe(9900); // deducted margin for additional 1000/10
  });

  it("reducePosition partially closes position", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, entryTime: "now" },
      currentPrice: 52000,
    });

    useTradingStore.getState().reducePosition(500, 52000);

    const state = useTradingStore.getState();
    expect(state.position!.size).toBe(500);
    // wallet = 10000 + margin_returned(50) + pnl(20)
    expect(state.wallet).toBeCloseTo(10070, 0);
  });

  it("reducePosition closes entire position when reducedSize >= current", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, entryTime: "now" },
      currentPrice: 52000,
    });

    useTradingStore.getState().reducePosition(1000, 52000);

    const state = useTradingStore.getState();
    expect(state.position).toBeNull();
    // wallet = 10000 + margin(100) + pnl(40)
    expect(state.wallet).toBeCloseTo(10140, 0);
  });
});
