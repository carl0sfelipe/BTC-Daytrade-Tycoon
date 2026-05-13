import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";

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
    useTradingStore.getState().checkPendingOrders(51000);

    const state = useTradingStore.getState();

    // The order should have been executed
    expect(state.pendingOrders).toHaveLength(0);

    // Position should still exist but reduced by $2000
    expect(state.position).not.toBeNull();
    expect(state.position!.side).toBe("long");
    expect(state.position!.size).toBe(3000);

    // Wallet should reflect returned margin + PnL
    // PnL on reduced $2000 at 51000: (1000/50000)*2000 = 40
    // Margin returned: 2000/10 = 200
    // New wallet = 10000 + 200 + 40 = 10240
    expect(state.wallet).toBeCloseTo(10240, 0);
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
    useTradingStore.getState().checkPendingOrders(50500, 50000, 52000);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(0);
    expect(state.position).not.toBeNull();
    expect(state.position!.size).toBe(3000);
  });

  it.skip("flip is blocked when unrealized loss makes effective wallet insufficient", () => {
    // Setup: LONG $1000 @ 50000 with 10x leverage
    // Wallet after open = 10000 - 100 = 9900
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
      reduceOnly: false,
      currentPrice: 48000, // price dropped 4% — position is losing
    });

    // Try to flip to SHORT $2000 @ 48000 with 10x
    // closePnl = (48000-50000)/50000 * 1000 = -40
    // returnedMargin = 1000/10 = 100
    // effectiveWallet = 9900 + 100 - 40 = 9960
    // newMargin = 2000/10 = 200
    // Should be allowed since 9960 >= 200

    // But if we tried to flip $100,000:
    // newMargin = 10000
    // effectiveWallet = 9960 < 10000 → should be blocked
    useTradingStore.getState().openPosition("short", 10, 100000, "", "", null);

    const state = useTradingStore.getState();
    // Should NOT have flipped — insufficient funds
    expect(state.position!.side).toBe("long"); // still long
    expect(state.lastActionError).toContain("Insufficient funds");
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
    useTradingStore.getState().openPosition("short", 10, 105000, "", "", null);

    const state = useTradingStore.getState();
    // Should be blocked because effectiveWallet < newMargin
    expect(state.position!.side).toBe("long");
    expect(state.lastActionError).toContain("Insufficient funds");
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
    const resultWithoutWick = useTradingStore.getState().checkPosition(interpolatedPrice);
    expect(resultWithoutWick.closed).toBe(false);

    // With candleLow — MUST liquidate because the wick went below liq
    const resultWithWick = useTradingStore.getState().checkPosition(interpolatedPrice, candleLow);
    expect(resultWithWick.closed).toBe(true);
    expect(resultWithWick.reason).toBe("liquidation");
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

    const resultWithoutWick = useTradingStore.getState().checkPosition(interpolatedPrice);
    expect(resultWithoutWick.closed).toBe(false);

    const resultWithWick = useTradingStore.getState().checkPosition(interpolatedPrice, undefined, candleHigh);
    expect(resultWithWick.closed).toBe(true);
    expect(resultWithWick.reason).toBe("liquidation");
  });
});
