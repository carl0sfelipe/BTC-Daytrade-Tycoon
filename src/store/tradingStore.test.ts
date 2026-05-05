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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
      currentPrice: 52000,
    });

    useTradingStore.getState().reducePosition(1000, 52000);

    const state = useTradingStore.getState();
    expect(state.position).toBeNull();
    // wallet = 10000 + margin(100) + pnl(40)
    expect(state.wallet).toBeCloseTo(10140, 0);
  });
});

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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
    });

    useTradingStore.getState().updatePositionSize(2000, "long");

    const state = useTradingStore.getState();
    expect(state.ordersHistory).toHaveLength(1);
    expect(state.ordersHistory[0].side).toBe("long");
    expect(state.ordersHistory[0].size).toBe(1000);
  });

  it("updatePositionSize reduce logs history with opposite orderSide (short reducing long)", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "short", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 55000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "short", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 55000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 150 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
    });

    useTradingStore.getState().openPosition("short", 10, 300, "", "", null);

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("long");
    expect(state.position!.size).toBe(700);
  });

  it("reduceOnly=false: opposite market order larger than position flips side", () => {
    useTradingStore.setState({
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 25 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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
      position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, trailingStopPercent: null, trailingStopPrice: null, entryTime: "now", realizedPnL: 0 },
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

describe("TradingStore — checkPosition", () => {
  it("liquidation long triggers when price hits liquidationPrice", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 45000,
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
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(45000);

    expect(result).toEqual({ closed: true, reason: "liquidation" });
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].reason).toBe("liquidation");
    expect(useTradingStore.getState().isLiquidated).toBe(false); // no real date set
  });

  it("liquidation long with simulationRealDate sets isLiquidated true", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 45000,
      simulationRealDate: "2020-03-12 → 2020-03-15",
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
        realizedPnL: 0,
      },
    });

    useTradingStore.getState().checkPosition(45000);

    expect(useTradingStore.getState().isLiquidated).toBe(true);
  });

  it("liquidation short triggers when price rises to liquidationPrice", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 55000,
      position: {
        side: "short",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 55000,
        tpPrice: null,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(55000);

    expect(result).toEqual({ closed: true, reason: "liquidation" });
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("SL hit long closes with reason 'sl'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 48000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 48000,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(48000);

    expect(result).toEqual({ closed: true, reason: "sl" });
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].pnl).toBeLessThan(0);
  });

  it("SL hit short closes with reason 'sl'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 52000,
      position: {
        side: "short",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 55000,
        tpPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 52000,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(52000);

    expect(result).toEqual({ closed: true, reason: "sl" });
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("TP hit long closes with reason 'tp'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 55000,
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
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(55000);

    expect(result).toEqual({ closed: true, reason: "tp" });
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].pnl).toBeGreaterThan(0);
  });

  it("TP hit short closes with reason 'tp'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 45000,
      position: {
        side: "short",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 55000,
        tpPrice: 45000,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(45000);

    expect(result).toEqual({ closed: true, reason: "tp" });
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("no trigger between liq/sl/tp returns {closed:false}", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50500,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: 55000,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 48000,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(50500);

    expect(result).toEqual({ closed: false });
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  it("liquidation precedence over SL when both would trigger", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 44900,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 46000,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(44900);

    expect(result.reason).toBe("liquidation");
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
        realizedPnL: 0,
      },
    });

    useTradingStore.getState().updateLeverage(20);

    const pos = useTradingStore.getState().position;
    expect(pos!.leverage).toBe(20);
    expect(pos!.liquidationPrice).toBe(47500); // 50000 * (1 - 1/20)
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

describe("TradingStore — setLiquidated / clearLiquidated / openPosition early-returns", () => {
  it("setLiquidated stores flag and date", () => {
    useTradingStore.getState().setLiquidated("2020-03-12 → 2020-03-15");

    const state = useTradingStore.getState();
    expect(state.isLiquidated).toBe(true);
    expect(state.simulationRealDate).toBe("2020-03-12 → 2020-03-15");
  });

  it("clearLiquidated resets both", () => {
    useTradingStore.getState().setLiquidated("2020-03-12 → 2020-03-15");
    useTradingStore.getState().clearLiquidated();

    const state = useTradingStore.getState();
    expect(state.isLiquidated).toBe(false);
    expect(state.simulationRealDate).toBeNull();
  });

  it("openPosition early-returns when entryPrice <= 0", () => {
    useTradingStore.setState({ currentPrice: 0, wallet: 10000, position: null });

    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);

    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().wallet).toBe(10000);
  });

  it("openPosition early-returns when wallet < margin (no flip path)", () => {
    useTradingStore.setState({ currentPrice: 50000, wallet: 50, position: null });

    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);

    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().wallet).toBe(50);
  });
});
