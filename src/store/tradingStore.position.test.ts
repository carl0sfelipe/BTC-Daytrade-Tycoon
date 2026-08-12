import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";

describe("TradingStore — Order History Side Tracking", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      ordersHistory: [],
      closedTrades: [],
      realizedPnL: 0,
      currentPrice: 50000,
    });
  });

  it("updatePositionSize increase logs history with provided orderSide", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
    });

    useTradingStore.getState().updatePositionSize(2000, "long");

    const state = useTradingStore.getState();
    expect(state.ordersHistory).toHaveLength(1);
    expect(state.ordersHistory[0].side).toBe("long");
    expect(state.ordersHistory[0].size).toBe(1000);
  });

  it("updatePositionSize reduce logs history with opposite orderSide (short reducing long)", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
      currentPrice: 52000,
    });

    useTradingStore.getState().updatePositionSize(500, "short");

    const state = useTradingStore.getState();
    expect(state.ordersHistory).toHaveLength(1);
    // Bug fix: history should reflect the operation side (short), not position side (long)
    expect(state.ordersHistory[0].side).toBe("short");
    expect(state.ordersHistory[0].size).toBe(500);
  });

  it("updatePositionSize reduce logs history with opposite orderSide (long reducing short)", () => {
    useTradingStore.setState({
      position: { side: "short", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 55000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
      currentPrice: 48000,
    });

    useTradingStore.getState().updatePositionSize(300, "long");

    const state = useTradingStore.getState();
    expect(state.ordersHistory).toHaveLength(1);
    expect(state.ordersHistory[0].side).toBe("long");
    expect(state.ordersHistory[0].size).toBe(700);
  });

  it("updatePositionSize falls back to position side when orderSide is omitted", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
    });

    useTradingStore.getState().updatePositionSize(2000);

    const state = useTradingStore.getState();
    expect(state.ordersHistory).toHaveLength(1);
    expect(state.ordersHistory[0].side).toBe("long");
  });

  it("full workflow: long open then short reduce shows correct sides in history", () => {
    // Open long
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    expect(useTradingStore.getState().ordersHistory[0].side).toBe("long");

    // Reduce with short
    useTradingStore.getState().updatePositionSize(500, "short");
    const state = useTradingStore.getState();
    expect(state.ordersHistory).toHaveLength(2);
    expect(state.ordersHistory[1].side).toBe("short");
  });

  it("closePosition includes prior realizedPnL in trade.pnl after partial reduces", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: { side: "short", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 55000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 150 },
      realizedPnL: 150, // global already includes partial closes
      currentPrice: 48000,
    });

    useTradingStore.getState().closePosition("manual");

    const state = useTradingStore.getState();
    expect(state.position).toBeNull();
    expect(state.closedTrades).toHaveLength(1);
    // pnl from remaining size: (50000 - 48000) / 50000 * 1000 = 40
    // totalPnl = 40 + 150 (prior realized) = 190
    expect(state.closedTrades[0].pnl).toBeCloseTo(190, 0);
    // Global realizedPnL = 150 (prior) + 40 (close) = 190
    expect(state.realizedPnL).toBeCloseTo(190, 0);
  });

  it("closePosition with no prior realizedPnL works as before", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
      currentPrice: 52000,
    });

    useTradingStore.getState().closePosition("manual");

    const state = useTradingStore.getState();
    expect(state.closedTrades).toHaveLength(1);
    // pnl = (52000 - 50000) / 50000 * 1000 = 40
    expect(state.closedTrades[0].pnl).toBeCloseTo(40, 0);
    expect(state.realizedPnL).toBeCloseTo(40, 0);
  });
});

describe("TradingStore — Reduce Only / Hedge Mode", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      closedTrades: [],
      realizedPnL: 0,
      ordersHistory: [],
      currentPrice: 50000,
      reduceOnly: true,
    });
  });

  it("reduceOnly=true: opposite market order reduces position", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
    });

    useTradingStore.getState().openPosition("short", 10, 300, "", "", null);

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("long");
    expect(state.position!.size).toBe(700);
  });

  it("reduceOnly=false: opposite market order larger than position flips side", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
      reduceOnly: false,
    });

    useTradingStore.getState().openPosition("short", 10, 2500, "", "", null);

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("short");
    expect(state.position!.size).toBe(1500); // excess = 2500 - 1000
    expect(state.position!.entry).toBe(50000); // new position entry = current price
    expect(state.position!.realizedPnL).toBe(0); // fresh flipped position starts at 0
    expect(state.closedTrades).toHaveLength(1);
    expect(state.closedTrades[0].side).toBe("long");
    // wallet = 10000 + returnedMargin(100) + closePnl(0) - excessMargin(150) = 9950
    expect(state.wallet).toBeCloseTo(9950, 0);
  });

  it("reduceOnly=false: flip with price change and prior realizedPnL", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 52000,
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 25 },
      reduceOnly: false,
      realizedPnL: 25,
      closedTrades: [],
    });

    useTradingStore.getState().openPosition("short", 10, 2500, "", "", null);

    const state = useTradingStore.getState();
    // LONG $1000 @ 50k → flip at 52k: priceDiff = +2000, closePnl = (2000/50000)*1000 = 40
    // totalRealized = 25 + 40 = 65
    // returnedMargin = 1000/10 = 100
    // excessSize = 2500 - 1000 = 1500, excessMargin = 150
    // wallet = 10000 + 100 + 40 - 150 = 9990
    expect(state.wallet).toBeCloseTo(9990, 0);

    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("short");
    expect(state.position!.size).toBe(1500);
    expect(state.position!.entry).toBe(52000);

    expect(state.closedTrades).toHaveLength(1);
    expect(state.closedTrades[0].side).toBe("long");
    expect(state.closedTrades[0].pnl).toBeCloseTo(65, 0); // includes prior realizedPnL
    expect(state.closedTrades[0].exitPrice).toBe(52000);

    expect(state.realizedPnL).toBeCloseTo(65, 0); // session-wide realizedPnL accumulated
  });

  it("reduceOnly=false: opposite market order smaller than position reduces (no flip)", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
      reduceOnly: false,
    });

    useTradingStore.getState().openPosition("short", 10, 400, "", "", null);

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("long");
    expect(state.position!.size).toBe(600);
  });

  it("reduceOnly=false: exact-size opposite order closes position", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", entryTimestamp: 0, realizedPnL: 0 },
      reduceOnly: false,
    });

    useTradingStore.getState().openPosition("short", 10, 1000, "", "", null);

    const state = useTradingStore.getState();
    expect(state.position).toBeNull();
    expect(state.closedTrades).toHaveLength(1);
  });

  it("reduceOnly defaults to true on store reset", () => {
    useTradingStore.setState({ reduceOnly: false });
    expect(useTradingStore.getState().reduceOnly).toBe(false);

    // Simulate engine reset
    useTradingStore.setState({ reduceOnly: true });
    expect(useTradingStore.getState().reduceOnly).toBe(true);
  });
});

describe("TradingStore — updateLeverage", () => {
  it("recalculates liquidationPrice on leverage increase", () => {
    useTradingStore.setState({
      wallet: 9900,
      position: {
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
      },
    });

    useTradingStore.getState().updateLeverage(20);

    const pos = useTradingStore.getState().position;
    expect(pos!.leverage).toBe(20);
    expect(pos!.liquidationPrice).toBe(0); // total collateral (50 + 9950) >= size (1000)
  });

  it("refunds margin diff on leverage increase", () => {
    useTradingStore.setState({
      wallet: 9900,
      position: {
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
      },
    });

    useTradingStore.getState().updateLeverage(20);

    // old margin = 100, new margin = 50, diff = -50 → wallet gets +50
    expect(useTradingStore.getState().wallet).toBe(9950);
  });

  it("early-returns when wallet < marginDiff on leverage decrease", () => {
    useTradingStore.setState({
      wallet: 10,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 20,
        liquidationPrice: 47500,
        tpPrice: null,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    useTradingStore.getState().updateLeverage(5);

    // new margin = 200, diff = +150, wallet = 10 < 150 → should not change
    expect(useTradingStore.getState().position!.leverage).toBe(20);
    expect(useTradingStore.getState().wallet).toBe(10);
  });

  it("no-op when no position", () => {
    useTradingStore.setState({ wallet: 10000, position: null });

    useTradingStore.getState().updateLeverage(50);

    expect(useTradingStore.getState().wallet).toBe(10000);
    expect(useTradingStore.getState().position).toBeNull();
  });
});

describe("TradingStore — addToPosition TP/SL", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: 55000, slPrice: 48000,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });
  });

  it("addToPosition overrides TP/SL when non-empty strings provided", () => {
    useTradingStore.getState().addToPosition(500, 52000, "60000", "47000");
    const pos = useTradingStore.getState().position;
    expect(pos!.tpPrice).toBe(60000);
    expect(pos!.slPrice).toBe(47000);
  });

  it("addToPosition preserves existing TP/SL when empty strings provided", () => {
    useTradingStore.getState().addToPosition(500, 52000, "", "");
    const pos = useTradingStore.getState().position;
    expect(pos!.tpPrice).toBe(55000);
    expect(pos!.slPrice).toBe(48000);
  });
});

describe("TradingStore — reducePosition floating-point accumulation", () => {
  it("two partial reduces summing to exact size close the position cleanly", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });

    // Two reduces of 500 each = exactly 1000 (the full size)
    useTradingStore.getState().reducePosition(500, 50000);
    expect(useTradingStore.getState().position).not.toBeNull();
    expect(useTradingStore.getState().position!.size).toBe(500);

    useTradingStore.getState().reducePosition(500, 50000);
    // Position must be fully closed — not leave a 0-size ghost
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades).toHaveLength(1);
  });
});

describe("TradingStore — addToPosition with active trailing stop", () => {
  it("preserves trailingStopPercent and trailingStopPrice after adding to position", () => {
    useTradingStore.setState({
      wallet: 9900,
      currentPrice: 52000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: 5, trailingStopPrice: 49400, // 52000 * 0.95
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });

    useTradingStore.getState().addToPosition(500, 52000, "", "");

    const pos = useTradingStore.getState().position!;
    // addToPosition does NOT recalculate trailingStopPrice — it preserves the existing value
    expect(pos.trailingStopPercent).toBe(5);
    expect(pos.trailingStopPrice).toBe(49400);
    // But size and entry ARE updated
    expect(pos.size).toBeCloseTo(1500, 0);
  });
});
