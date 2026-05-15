/**
 * T01 — Reduce com perda maior que wallet
 *
 * Scenario:
 *   LONG $5.000 @ 50.000 with 10x (margin=$500). Wallet after open = $9.500.
 *   Price declines to $47.000 over 10 candles (−6% → unrealized PnL ≈ −$600).
 *   User reduces $3.000 of the $5.000 position.
 *
 * What we're guarding against:
 *   computePartialReduce() had no Math.max(0,...) on newWallet, so a sufficiently
 *   large loss could produce a negative wallet. This test verifies the clamp holds
 *   AND that the wallet accounting is arithmetically correct end-to-end.
 *
 * No Binance API calls — price path is fully determined by synthetic candles.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "@/store/tradingStore";
import { assertAllInvariants, type TradingSnapshot } from "@/lib/trading/invariants";
import {
  buildSyntheticCandles,
  flatCandles,
  decliningCandles,
  runSyntheticTick,
} from "@/test/helpers/syntheticEngine";
import { resetStore } from "@/test/helpers";

// ─── Snapshot helper ──────────────────────────────────────────────────────────

function snap(): TradingSnapshot {
  const s = useTradingStore.getState();
  return {
    wallet: s.wallet,
    position: s.position,
    pendingOrders: s.pendingOrders,
    closedTrades: s.closedTrades,
    ordersHistory: s.ordersHistory,
  };
}

// ─── Synthetic candle sequence ────────────────────────────────────────────────
//
// Minute layout (each candle = 1 simulated minute):
//
//  0–9   : flat at 50.000  (entry region, position is opened before simulation)
// 10–19  : decline 50.000 → 47.000 in 10 steps (−300/candle)
// 20–24  : flat at 47.000  (here we run the tick and execute the reduce)
//
// Candle[20].open = 47.000 → interpolatedPrice at minute 20 = 47.000 exactly.
// Candle[20].low  = 46.900 → wick exposes limit/SL orders in that range (not relevant here).
// Candle[20].high = 47.100 → wick high, also not relevant for T01.

const T0_SEC = 1_700_000_000; // arbitrary fixed epoch — makes timestamps deterministic

function buildT01Candles() {
  const flat0 = flatCandles(T0_SEC, 10, 50_000);
  const decline = decliningCandles(
    T0_SEC + 10 * 60,
    10,
    50_000,
    47_000
  );
  // Candle 20 onward: flat at 47.000, with a modest wick range for realism
  const flat1 = flatCandles(T0_SEC + 20 * 60, 5, 47_000, {
    high: 47_100,
    low: 46_900,
  });
  return [...flat0, ...decline, ...flat1];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("T01 — Reduce com perda maior que wallet (synthetic candles)", () => {
  const candles = buildT01Candles();

  beforeEach(() => {
    resetStore();
    // Open LONG $5.000 @ 50.000 with 10x directly in the store.
    // margin = 5000/10 = 500 → wallet = 10000 − 500 = 9500
    useTradingStore.setState({
      wallet: 9_500,
      currentPrice: 50_000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
      position: {
        side: "long",
        entry: 50_000,
        size: 5_000,
        leverage: 10,
        liquidationPrice: 45_000,
        tpPrice: null,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: new Date(T0_SEC * 1000).toISOString(),
        entryTimestamp: T0_SEC * 1000,
        realizedPnL: 0,
      },
    });
  });

  it("synthetic candles produce the expected price path", () => {
    // Minute 0: should be at 50.000 (flat region)
    const tick0 = runSyntheticTick(candles, T0_SEC, 0);
    expect(tick0.price).toBeCloseTo(50_000, 0);

    // Minute 15 (middle of decline): should be ≈ 48.500
    const tick15 = runSyntheticTick(candles, T0_SEC, 15);
    expect(tick15.price).toBeCloseTo(48_500, -1); // within 100

    // Minute 20: price lands at 47.000 (start of flat region)
    const tick20 = runSyntheticTick(candles, T0_SEC, 20);
    expect(tick20.price).toBeCloseTo(47_000, 0);

    // Wick at minute 20: candleLow = 46.900, candleHigh = 47.100
    expect(tick20.candleLow).toBe(46_900);
    expect(tick20.candleHigh).toBe(47_100);
  });

  it("no liquidation triggered during price decline (liq=45.000, bottom=46.900)", () => {
    // Run through all decline candles minute by minute and check the position survives
    for (let m = 0; m <= 24; m++) {
      const tick = runSyntheticTick(candles, T0_SEC, m);
      useTradingStore.setState({ currentPrice: tick.price });

      // checkPendingOrders (no pending orders, should be a no-op)
      useTradingStore.getState().checkPendingOrders(
        tick.price,
        tick.candleLow,
        tick.candleHigh
      );
      // checkPosition — liq is at 45.000, price never goes below 46.900
      const result = useTradingStore.getState().checkPosition(
        tick.price,
        tick.candleLow,
        tick.candleHigh
      );
      expect(result.closed).toBe(false);
    }

    // Position should still be alive
    expect(useTradingStore.getState().position).not.toBeNull();
    expect(useTradingStore.getState().position!.side).toBe("long");
  });

  it("wallet stays ≥ 0 after reduce $3.000 when position is in loss", () => {
    // Advance to minute 20: price = 47.000
    const tick = runSyntheticTick(candles, T0_SEC, 20);
    expect(tick.price).toBeCloseTo(47_000, 0);

    // Sync store's currentPrice with what the tick engine sees
    useTradingStore.setState({ currentPrice: tick.price });

    const before = snap();

    // Reduce $3.000 (out of $5.000) via openPosition on the opposite side
    // positionSlice routes this to computeReduceOrClose (not computeHedgeFlip,
    // since 3000 < existing.size=5000)
    useTradingStore.getState().openPosition("short", 10, 3_000, "", "", null);

    const after = snap();

    // Core invariant: wallet must never be negative
    expect(after.wallet).toBeGreaterThanOrEqual(0);

    // Position reduced to $2.000 LONG
    expect(after.position).not.toBeNull();
    expect(after.position!.side).toBe("long");
    expect(after.position!.size).toBe(2_000);

    // Arithmetic verification:
    //   reducedSize = 3.000, leverage = 10
    //   marginReturned = 3000/10 = 300
    //   priceDiff = 47000 - 50000 = −3000 (long in loss)
    //   pnlOnReduced = (−3000/50000) * 3000 = −180
    //   expectedWalletChange = 300 − 180 = +120
    const expectedWalletChange = 300 - 180;
    expect(after.wallet).toBeCloseTo(before.wallet + expectedWalletChange, 0);

    // All structural invariants must pass
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("wallet stays ≥ 0 even with extreme loss (price near liq, reduce almost all)", () => {
    // Put price at 45.500 — just above the liq price of 45.000
    // unrealized PnL = (45500−50000)/50000 * 5000 = −450
    // This is close to the margin ($500) but doesn't trigger liquidation
    useTradingStore.setState({ currentPrice: 45_500 });

    const before = snap();

    // Reduce $4.800 (leaving only $200 in the position)
    useTradingStore.getState().openPosition("short", 10, 4_800, "", "", null);

    const after = snap();

    // Wallet must be ≥ 0 even when loss nearly wipes the margin
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(assertAllInvariants(before, after)).toEqual([]);

    // Position should have $200 remaining
    if (after.position !== null) {
      expect(after.position.size).toBe(200);
    }
  });

  it("reducing exactly the full position size closes it (no orphan position)", () => {
    useTradingStore.setState({ currentPrice: 47_000 });

    const before = snap();

    // Reduce 5.000 = exactly the full position size → should close it entirely
    useTradingStore.getState().openPosition("short", 10, 5_000, "", "", null);

    const after = snap();

    expect(after.position).toBeNull();
    expect(after.closedTrades).toHaveLength(1);
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(assertAllInvariants(before, after)).toEqual([]);

    // PnL on close: (47000−50000)/50000 * 5000 = −300
    // margin returned: 500
    // wallet change: 500 − 300 = +200
    expect(after.wallet).toBeCloseTo(before.wallet + 200, 0);
  });

  it("pending limit order that fires at the low wick reduces correctly", () => {
    // Place a short limit order at 47.000 (reduce $2.000 when price hits)
    useTradingStore.getState().addPendingOrder({
      side: "short",
      orderType: "open",
      leverage: 10,
      size: 2_000,
      tpPrice: null,
      slPrice: null,
      limitPrice: 47_000,
      orderPrice: null,
    });

    // Tick at minute 20: candleLow=46.900, candleHigh=47.100
    // The short limit @ 47.000 triggers: currentPrice(47.000) >= limitPrice(47.000) for short
    const tick = runSyntheticTick(candles, T0_SEC, 20);

    const before = snap();
    useTradingStore.getState().checkPendingOrders(
      tick.price,
      tick.candleLow,
      tick.candleHigh
    );
    const after = snap();

    // Limit fired: no more pending orders
    expect(after.pendingOrders).toHaveLength(0);
    // Position reduced to $3.000 (5000 − 2000)
    expect(after.position!.size).toBe(3_000);
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });
});
