import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";
import { assertAllInvariants, type TradingSnapshot } from "@/lib/trading/invariants";

function snap(): TradingSnapshot {
  const s = useTradingStore.getState();
  return { wallet: s.wallet, position: s.position, pendingOrders: s.pendingOrders, closedTrades: s.closedTrades, ordersHistory: s.ordersHistory };
}

describe("TradingStore Integration — Bugs Reproduction", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      pendingOrders: [],
      ordersHistory: [],
      closedTrades: [],
      realizedPnL: 0,
      currentPrice: 50000,
      reduceOnly: true,
    });
  });

  it("limit order on opposite side reduces position when price hits limit", () => {
    // Setup: LONG $5000 @ 50000 with 10x leverage
    useTradingStore.setState({
      position: {
        side: "long",
        entry: 50000,
        size: 5000,
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

    // Place SHORT limit order at 51000 to reduce the long
    useTradingStore.getState().addPendingOrder({
      side: "short",
      orderType: "open",
      leverage: 10,
      size: 2000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 51000,
      orderPrice: null,
    });

    // Price rises to 51000 — should execute the reduce order
    const before1 = snap();
    useTradingStore.getState().checkPendingOrders(51000);
    const after1 = snap();

    // The order should have been executed
    expect(after1.pendingOrders).toHaveLength(0);

    // Position should still exist but reduced by $2000
    expect(after1.position).not.toBeNull();
    expect(after1.position!.side).toBe("long");
    expect(after1.position!.size).toBe(3000);

    // Wallet should reflect returned margin + PnL
    // PnL on reduced $2000 at 51000: (1000/50000)*2000 = 40
    // Margin returned: 2000/10 = 200
    // New wallet = 10000 + 200 + 40 = 10240
    expect(after1.wallet).toBeCloseTo(10240, 0);
    expect(assertAllInvariants(before1, after1)).toEqual([]);
  });

  it("limit order executes via candle wick even if interpolated price never reaches limit", () => {
    // Setup: LONG $5000 @ 50000 with 10x leverage
    useTradingStore.setState({
      position: {
        side: "long",
        entry: 50000,
        size: 5000,
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

    // Place SHORT limit order at 51000
    useTradingStore.getState().addPendingOrder({
      side: "short",
      orderType: "open",
      leverage: 10,
      size: 2000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 51000,
      orderPrice: null,
    });

    // Interpolated price is 50500 (never reaches 51000), but candle high was 52000
    // With candleHigh=52000, the order SHOULD execute because price touched 51000 during the candle
    const before2 = snap();
    useTradingStore.getState().checkPendingOrders(50500, 50000, 52000);
    const after2 = snap();

    expect(after2.pendingOrders).toHaveLength(0);
    expect(after2.position).not.toBeNull();
    expect(after2.position!.size).toBe(3000);
    expect(assertAllInvariants(before2, after2)).toEqual([]);
  });

  it("flip is blocked when unrealized loss makes effective wallet insufficient", () => {
    // LONG $1000 @ 50000 10x, wallet=100 (exactly the margin), currentPrice=48000 (loss)
    // returnedMargin = 1000/10 = 100
    // closePnl = (48000-50000)/50000 * 1000 = -40
    // effectiveWallet = 100 + 100 - 40 = 160
    // Try flip to SHORT $2610: excessSize=1610, excessMargin=1610/10=161 > 160 → BLOCKED
    useTradingStore.setState({
      wallet: 100,
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
      reduceOnly: false,
      currentPrice: 48000,
    });

    const before = snap();
    useTradingStore.getState().openPosition("short", 10, 2610, "", "", null);
    const after = snap();

    expect(after.position!.side).toBe("long");
    expect(useTradingStore.getState().lastActionError).toContain("Insufficient funds");
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("calcSliderMax must account for unrealized loss to prevent slider from exceeding effective wallet", () => {
    // This is a conceptual test documenting the UX bug.
    // The UI calcSliderMax returns position.size + wallet * leverage
    // without accounting for closePnl if the position is in loss.
    // A proper test for calcSliderMax belongs in margin.test.ts
    // but we document the integration consequence here.

    // Setup: LONG $5000 @ 50000, wallet=10000-500=9500, currentPrice=48000 (loss)
    // closePnl = (48000-50000)/50000 * 5000 = -200
    // returnedMargin = 500
    // effectiveWallet = 9500 + 500 - 200 = 9800
    // Max flip size at 10x = 9800 * 10 = 98000
    // But calcSliderMax returns 5000 + 10000*10 = 105000
    // So slider allows 105000 but flip fails at > 98000

    // We verify the store behavior directly:
    useTradingStore.setState({
      wallet: 9500,
      position: {
        side: "long",
        entry: 50000,
        size: 5000,
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
      reduceOnly: false,
      currentPrice: 48000,
    });

    // Try flip at exactly what calcSliderMax would allow: 105000
    const before3 = snap();
    useTradingStore.getState().openPosition("short", 10, 105000, "", "", null);
    const after3 = snap();

    // Should be blocked because effectiveWallet < newMargin
    expect(after3.position!.side).toBe("long");
    expect(useTradingStore.getState().lastActionError).toContain("Insufficient funds");
    expect(assertAllInvariants(before3, after3)).toEqual([]);
  });

  it("checkPosition detects liquidation via candle wick when interpolated price is above liq", () => {
    // Setup: LONG $1000 @ 50000 with 10x leverage, liq=45000
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

    // Interpolated price is 46000 (above liq), but candle low was 44000 (below liq)
    const interpolatedPrice = 46000;
    const candleLow = 44000;

    // Without candleLow — should NOT liquidate (old behavior)
    const before4 = snap();
    const resultWithoutWick = useTradingStore.getState().checkPosition(interpolatedPrice);
    expect(resultWithoutWick.closed).toBe(false);
    expect(assertAllInvariants(before4, snap())).toEqual([]);

    // With candleLow — MUST liquidate because the wick went below liq
    const before4b = snap();
    const resultWithWick = useTradingStore.getState().checkPosition(interpolatedPrice, candleLow);
    expect(resultWithWick.closed).toBe(true);
    expect(resultWithWick.reason).toBe("liquidation");
    expect(assertAllInvariants(before4b, snap())).toEqual([]);
  });

  it("checkPosition detects short liquidation via candle high", () => {
    useTradingStore.setState({
      wallet: 9900,
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
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const interpolatedPrice = 54000; // below liq
    const candleHigh = 56000; // above liq

    const before5 = snap();
    const resultWithoutWick = useTradingStore.getState().checkPosition(interpolatedPrice);
    expect(resultWithoutWick.closed).toBe(false);
    expect(assertAllInvariants(before5, snap())).toEqual([]);

    const before5b = snap();
    const resultWithWick = useTradingStore.getState().checkPosition(interpolatedPrice, undefined, candleHigh);
    expect(resultWithWick.closed).toBe(true);
    expect(assertAllInvariants(before5b, snap())).toEqual([]);
    expect(resultWithWick.reason).toBe("liquidation");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-order checkPendingOrders scenarios
// ─────────────────────────────────────────────────────────────────────────────
describe("TradingStore Integration — Multi-Order checkPendingOrders", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      pendingOrders: [],
      ordersHistory: [],
      closedTrades: [],
      realizedPnL: 0,
      currentPrice: 50000,
      reduceOnly: false,
    });
  });

  it("M1 — two open long limits fire in same tick: both execute, second adds to position", () => {
    // Two long limit orders at different prices; tick price falls below both
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "open", leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 49000, orderPrice: null });
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "open", leverage: 10, size: 500, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null });

    const before = snap();
    useTradingStore.getState().checkPendingOrders(47500);
    const after = snap();

    expect(after.pendingOrders).toHaveLength(0);
    expect(after.position).not.toBeNull();
    expect(after.position!.side).toBe("long");
    expect(after.position!.size).toBe(1500); // 1000 + 500
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("M2 — TP and SL triggered by same candle: exactly one close happens", () => {
    useTradingStore.setState({
      wallet: 9900,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: 55000, slPrice: 45000,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "take_profit", leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 55000, orderPrice: null });
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "stop_loss", leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 45000, orderPrice: null });

    const before = snap();
    // Candle wicks hit both TP and SL
    useTradingStore.getState().checkPendingOrders(50000, 44000, 56000);
    const after = snap();

    // Position should be closed (exactly once)
    expect(after.position).toBeNull();
    expect(after.closedTrades).toHaveLength(1);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("M3 — cancel pending order before tick: only uncancelled order fires", () => {
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "open", leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 49000, orderPrice: null });
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "open", leverage: 10, size: 500, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null });

    const orders = useTradingStore.getState().pendingOrders;
    expect(orders).toHaveLength(2);

    // Cancel the first order before tick
    useTradingStore.getState().cancelPendingOrder(orders[0].id);
    expect(useTradingStore.getState().pendingOrders).toHaveLength(1);

    const before = snap();
    useTradingStore.getState().checkPendingOrders(47500);
    const after = snap();

    // Only the second order (size=500) should have fired
    expect(after.pendingOrders).toHaveLength(0);
    expect(after.position).not.toBeNull();
    expect(after.position!.size).toBe(500);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("M4 — limit order with embedded TP/SL: position opens and TP/SL are registered as pending orders", () => {
    // openPosition → setPositionTpSl creates TP and SL pending orders automatically
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "open", leverage: 10, size: 1000, tpPrice: 55000, slPrice: 45000, limitPrice: 48000, orderPrice: null });

    const before = snap();
    useTradingStore.getState().checkPendingOrders(48000);
    const after = snap();

    // Original limit "open" order is consumed; TP and SL orders are auto-created
    expect(after.position).not.toBeNull();
    expect(after.position!.tpPrice).toBe(55000);
    expect(after.position!.slPrice).toBe(45000);
    // TP + SL pending orders should now exist
    const types = after.pendingOrders.map((o) => o.orderType).sort();
    expect(types).toEqual(["stop_loss", "take_profit"]);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("M5 — position-side open limit fires after existing position: adds to position", () => {
    useTradingStore.setState({
      wallet: 9900,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });
    // Add a long limit to increase position at a lower price
    useTradingStore.getState().addPendingOrder({ side: "long", orderType: "open", leverage: 10, size: 500, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null });

    const before = snap();
    useTradingStore.getState().checkPendingOrders(48000);
    const after = snap();

    expect(after.pendingOrders).toHaveLength(0);
    expect(after.position!.size).toBe(1500); // 1000 + 500 added
    expect(assertAllInvariants(before, after)).toEqual([]);
  });
});
