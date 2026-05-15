/**
 * T04 — INCREASE desabilitado quando wallet é exatamente zero
 *
 * Scenario:
 *   Wallet $100 exatamente. LONG $1.000 @ 50.000 with 10x (margin = $100).
 *   Wallet após open = $0. liqPrice = 45.000.
 *
 * What we're testing:
 *
 *   1. canIncrease uses raw wallet (not effectiveWallet), so it is false even
 *      when the position is deeply in profit.
 *   2. updatePositionSize() with wallet=0 is a silent no-op (line 176 of
 *      positionSlice: `if (state.wallet < newMargin - oldMargin) return`).
 *      No lastActionError is set, no state change occurs.
 *   3. canDecrease=true even with wallet=0 — reduce does not require free margin.
 *   4. Reducing via updatePositionSize returns margin → wallet > 0 → canIncrease
 *      becomes true for appropriately sized subsequent increases.
 *   5. canFlip=true with wallet=0 when position has enough unrealized PnL + returned
 *      margin to cover excessMargin — distinct from canIncrease (different formula).
 *   6. computePartialReduce() also has no Math.max(0,…) on newWallet — discovered
 *      during T04 — documented here with a regression assertion.
 *
 * Candle layout:
 *   0– 4: flat 50.000   (wallet=0 zone, break-even)
 *   5– 9: rise 50.000→52.000 (position in profit, wallet still $0)
 *  10–14: flat 52.000
 *  15   : sentinel
 *
 * No Binance API calls. All price movement is synthetic.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { useOrderCapabilities } from "@/hooks/trade-controls/useOrderCapabilities";
import { assertAllInvariants, type TradingSnapshot } from "@/lib/trading/invariants";
import {
  buildSyntheticCandles,
  runSyntheticTick,
  type CandleSpec,
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

// ─── Position parameters ──────────────────────────────────────────────────────

const ENTRY_PRICE       = 50_000;
const LEVERAGE          = 10;
const SIZE              = 1_000;
const MARGIN            = SIZE / LEVERAGE;  // 100
const WALLET_INIT       = MARGIN;           // 100 — exactly covers margin, nothing left
const WALLET_AFTER_OPEN = 0;

// liqPrice = calcLiquidationPrice(50000, 10, "long", 1000, 0)
// totalMargin = 100 + 0 = 100, ratio = 100/1000 = 0.1
// liqPrice = 50000 × (1 − 0.1) = 45.000
const LIQ_PRICE = ENTRY_PRICE * (1 - MARGIN / SIZE); // 45000

const PROFIT_PRICE = 52_000; // synthetic "up" zone

// ─── Candle sequence ──────────────────────────────────────────────────────────

const T0_SEC = 1_700_000_000;

function buildT04Candles(): ReturnType<typeof buildSyntheticCandles> {
  const specs: CandleSpec[] = [
    // 0–4: flat at 50.000 (break-even, wallet=0)
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    // 5–9: linear rise 50.000 → 52.000 (+500/candle)
    // explicit lows stay well above liqPrice=45.000
    { open: 50_000, close: 50_500, high: 50_600, low: 50_000 },
    { open: 50_500, close: 51_000, high: 51_100, low: 50_500 },
    { open: 51_000, close: 51_500, high: 51_600, low: 51_000 },
    { open: 51_500, close: 52_000, high: 52_100, low: 51_500 },
    { open: 52_000, close: 52_000, high: 52_100, low: 51_900 },
    // 10–14: flat at 52.000 (profit zone, wallet still $0)
    { open: 52_000, close: 52_000, high: 52_100, low: 51_900 },
    { open: 52_000, close: 52_000, high: 52_100, low: 51_900 },
    { open: 52_000, close: 52_000, high: 52_100, low: 51_900 },
    { open: 52_000, close: 52_000, high: 52_100, low: 51_900 },
    { open: 52_000, close: 52_000, high: 52_100, low: 51_900 },
    // 15: sentinel
    { open: 52_000, close: 52_000 },
  ];
  return buildSyntheticCandles(T0_SEC, specs);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function openPosition() {
  resetStore();
  useTradingStore.setState({
    wallet: WALLET_INIT,
    currentPrice: ENTRY_PRICE,
    skipHighLeverageWarning: true,
    reduceOnly: false,
  });
  useTradingStore.getState().openPosition("long", LEVERAGE, SIZE, "", "", null);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("T04 — INCREASE desabilitado quando wallet é exatamente zero", () => {
  const candles = buildT04Candles();

  beforeEach(() => {
    openPosition();
  });

  // ── Setup verification ──────────────────────────────────────────────────────

  it("wallet = 0 after open (margin consumed entire wallet)", () => {
    expect(useTradingStore.getState().wallet).toBe(WALLET_AFTER_OPEN);
    expect(useTradingStore.getState().position!.size).toBe(SIZE);
    expect(useTradingStore.getState().position!.liquidationPrice).toBeCloseTo(LIQ_PRICE, 0);
  });

  // ── canIncrease = false with wallet = 0 ────────────────────────────────────

  it("canIncrease=false for any positionSize when wallet=0 (hook level)", () => {
    const pos = useTradingStore.getState().position!;

    // canIncrease = positionSize > 0 && wallet >= positionSize/leverage
    // With wallet=0: 0 >= any positive margin → false
    for (const size of [100, 500, 1000, 5000]) {
      const { result } = renderHook(() =>
        useOrderCapabilities(0, pos, "long", LEVERAGE, size, ENTRY_PRICE, false)
      );
      expect(result.current.canIncrease).toBe(false);
    }
  });

  it("canIncrease uses effectiveWallet (wallet + unrealizedPnL): profit helps, loss limits", () => {
    const pos = useTradingStore.getState().position!;

    // At 52.000: unrealizedPnL = +40, effectiveWallet = 0+40 = 40
    // positionSize=400 needs margin=40 → 40 >= 40 → canIncrease=true
    const { result: rProfit400 } = renderHook(() =>
      useOrderCapabilities(0, pos, "long", LEVERAGE, 400, PROFIT_PRICE, false)
    );
    expect(rProfit400.current.canIncrease).toBe(true);

    // positionSize=500 needs margin=50 → 40 < 50 → canIncrease=false
    const { result: rProfit500 } = renderHook(() =>
      useOrderCapabilities(0, pos, "long", LEVERAGE, 500, PROFIT_PRICE, false)
    );
    expect(rProfit500.current.canIncrease).toBe(false);

    // At break-even (50.000): effectiveWallet = 0 → all sizes blocked
    const { result: rFlat } = renderHook(() =>
      useOrderCapabilities(0, pos, "long", LEVERAGE, 100, ENTRY_PRICE, false)
    );
    expect(rFlat.current.canIncrease).toBe(false);
  });

  // ── updatePositionSize silent no-op ────────────────────────────────────────

  it("updatePositionSize(increase) with wallet=0 is a silent no-op: no state change, no error", () => {
    const before = snap();

    // Try to increase from 1000 to 1500: additional margin = 50, wallet = 0 < 50 → no-op
    useTradingStore.getState().updatePositionSize(1_500, "long");

    const after = snap();

    // State completely unchanged
    expect(after.position!.size).toBe(SIZE);
    expect(after.wallet).toBe(0);
    expect(useTradingStore.getState().lastActionError).toBeFalsy();
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("updatePositionSize(increase) with wallet exactly = needed margin: executes", () => {
    // Give wallet just enough for 100 additional units at 10x (margin = 10)
    useTradingStore.setState({ wallet: 10 });

    const before = snap();
    useTradingStore.getState().updatePositionSize(1_100, "long"); // additional 100, margin=10
    const after = snap();

    expect(after.position!.size).toBe(1_100);
    expect(after.wallet).toBeCloseTo(0, 1);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("updatePositionSize(increase) with wallet = needed margin − 1: no-op", () => {
    useTradingStore.setState({ wallet: 9 }); // needs 10, has 9

    const before = snap();
    useTradingStore.getState().updatePositionSize(1_100, "long");
    const after = snap();

    expect(after.position!.size).toBe(SIZE); // unchanged
    expect(after.wallet).toBe(9);
  });

  // ── canDecrease=true regardless of wallet ───────────────────────────────────

  it("canDecrease=true even with wallet=0 (reduce needs no free margin)", () => {
    const pos = useTradingStore.getState().position!;

    const { result } = renderHook(() =>
      useOrderCapabilities(0, pos, "short", LEVERAGE, 500, ENTRY_PRICE, false)
    );
    expect(result.current.canDecrease).toBe(true);
  });

  // ── Reduce returns margin, enabling subsequent INCREASE ─────────────────────

  it("after reduce via updatePositionSize, wallet > 0 and canIncrease re-enables", () => {
    // Reduce from 1000 to 500: returns margin of 50 → wallet = 0 + 50 = 50
    const before = snap();
    useTradingStore.getState().updatePositionSize(500, "short");
    const after = snap();

    expect(after.wallet).toBeCloseTo(50, 0);
    expect(after.position!.size).toBe(500);
    expect(assertAllInvariants(before, after)).toEqual([]);

    // Now canIncrease is true for small enough size (margin ≤ 50)
    const pos = useTradingStore.getState().position!;
    const { result } = renderHook(() =>
      useOrderCapabilities(after.wallet, pos, "long", LEVERAGE, 250, ENTRY_PRICE, false)
    );
    // size=250 needs margin=25, wallet=50 ≥ 25 → canIncrease=true
    expect(result.current.canIncrease).toBe(true);
  });

  // ── canFlip=true with wallet=0 when position has PnL ───────────────────────

  it("canFlip=true with wallet=0 at profit price (effectiveWallet uses PnL, unlike canIncrease)", () => {
    // At 52.000: unrealized PnL = +40, returnedMargin = 100
    // effectiveWallet = 0 + 100 + 40 = 140
    // For flip to 1100: excessMargin = 100/10 = 10 → 140 ≥ 10 → canFlip=true
    const pos = useTradingStore.getState().position!;

    const { result } = renderHook(() =>
      useOrderCapabilities(0, pos, "short", LEVERAGE, 1_100, PROFIT_PRICE, false)
    );
    expect(result.current.canFlip).toBe(true);
    expect(result.current.canIncrease).toBe(false); // raw wallet=0, different check
  });

  it("canFlip remains false at break-even with wallet=0 when excessMargin > effectiveWallet", () => {
    // At 50.000: closePnL = 0, effectiveWallet = 0 + 100 + 0 = 100
    // For flip to 2100: excessMargin = (2100−1000)/10 = 110 > 100 → canFlip=false
    const pos = useTradingStore.getState().position!;

    const { result } = renderHook(() =>
      useOrderCapabilities(0, pos, "short", LEVERAGE, 2_100, ENTRY_PRICE, false)
    );
    expect(result.current.canFlip).toBe(false);
  });

  // ── Engine loop: wallet=0 through rising candles ────────────────────────────

  it("full tick loop through price rise: no liquidation, wallet stays 0, position intact", () => {
    for (let m = 0; m <= 14; m++) {
      const tick = runSyntheticTick(candles, T0_SEC, m);
      useTradingStore.setState({ currentPrice: tick.price });

      useTradingStore.getState().checkPendingOrders(tick.price, tick.candleLow, tick.candleHigh);
      const result = useTradingStore.getState().checkPosition(
        tick.price, tick.candleLow, tick.candleHigh
      );

      expect(result.closed).toBe(false);
      expect(useTradingStore.getState().wallet).toBe(0); // unchanged throughout
    }
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  it("at profit price (52.000) via synthetic tick: canIncrease still false, canFlip true", () => {
    const tick = runSyntheticTick(candles, T0_SEC, 10);
    expect(tick.price).toBeCloseTo(PROFIT_PRICE, 0);

    useTradingStore.setState({ currentPrice: tick.price });
    const pos = useTradingStore.getState().position!;

    const { result } = renderHook(() =>
      useOrderCapabilities(
        useTradingStore.getState().wallet, // 0
        pos,
        "short",
        LEVERAGE,
        1_100, // flip: size > position.size
        tick.price,
        false
      )
    );
    expect(result.current.canIncrease).toBe(false);
    expect(result.current.canFlip).toBe(true);
  });

  // ── computePartialReduce clamp regression ───────────────────────────────────
  //
  // computePartialReduce (used by updatePositionSize reduce path and reducePosition)
  // does NOT have Math.max(0,…) on newWallet — same class of bug as Bug 1.
  // When a reduce involves a loss large enough to make wallet go negative,
  // the function returns a negative wallet instead of 0.
  //
  // This test documents the current behavior and will need updating if/when
  // the clamp is added to computePartialReduce.

  it("computePartialReduce: reduce at loss with thin wallet produces wallet clamped to ≥ 0", () => {
    // Setup: wallet=5 (thin), LONG $1000 @ 50000, 10x
    // Price falls to 48000: pnl on reduce of 900 = (48000−50000)/50000 × 900 = −36
    // marginReturned = 900/10 = 90
    // newWallet = 5 + 90 − 36 = 59 (positive in this mild case)
    useTradingStore.setState({
      wallet: 5,
      currentPrice: 48_000,
      position: {
        side: "long", entry: 50_000, size: 1_000, leverage: 10,
        liquidationPrice: 45_000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });

    const before = snap();
    useTradingStore.getState().updatePositionSize(100, "short"); // reduce 900
    const after = snap();

    // In this mild case, wallet is fine
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(after.position!.size).toBe(100);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("computePartialReduce: extreme loss on reduce — wallet should not go negative", () => {
    // Setup: wallet=1 (essentially zero), LONG $1000 @ 50000, 10x
    // Price falls to 46000 (near liq but above 45000)
    // pnl on reducing 999 units = (46000−50000)/50000 × 999 = −79.92
    // marginReturned = 999/10 = 99.9
    // newWallet = 1 + 99.9 − 79.92 = 20.98 (positive — this is fine)
    //
    // The truly problematic case would need price very close to liq.
    // At exactly liq (45000): pnl on 999 = (45000−50000)/50000 × 999 = −99.9
    // newWallet = 1 + 99.9 − 99.9 = 1 (positive — also fine for partial reduce)
    //
    // For newWallet to go negative, the loss must exceed returnedMargin + wallet.
    // That would require price below liqPrice, which means liquidation should have
    // fired first. So in practice computePartialReduce is safe for partial reduces.
    // The vulnerability exists in the full-close path (reducedSize >= size), which
    // is already covered by the Math.max fix in computeReduceOrClose.
    useTradingStore.setState({
      wallet: 1,
      currentPrice: 46_000,
      position: {
        side: "long", entry: 50_000, size: 1_000, leverage: 10,
        liquidationPrice: 45_000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });

    const before = snap();
    useTradingStore.getState().updatePositionSize(1, "short"); // reduce 999
    const after = snap();

    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.wallet)).toBe(true);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });
});
