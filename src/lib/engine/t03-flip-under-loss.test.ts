/**
 * T03 — Flip com posição em prejuízo: wallet não fica negativo
 *
 * Scenario:
 *   LONG $2.000 @ 50.000 with 10x. Wallet inicial $210 → após open wallet=$10.
 *   liqPrice ≈ 44.750 (cross-margin com wallet=$10).
 *   Price declines to 46.000 then to 45.000 via synthetic candles.
 *   User flips to SHORT $2.100 (excess=$100, excessMargin=$10).
 *
 * What we're testing:
 *   computeHedgeFlip() still has no Math.max(0,…) on newWallet.
 *   The store validates before calling it, but floating-point arithmetic
 *   at the exact boundary (effectiveWallet = excessMargin) can produce newWallet = −ε.
 *
 *   1. Normal flip at 46.000: correct wallet, correct new position (SHORT $100).
 *   2. Boundary flip at 45.000: effectiveWallet = excessMargin exactly → newWallet = 0.
 *   3. Blocked flip when effectiveWallet < excessMargin (flip size too large).
 *   4. New position liqPrice direction: SHORT liqPrice must be > entry.
 *   5. Flip via limit order (checkPendingOrders drives the execution).
 *   6. After flip, engine loop doesn't immediately re-trigger liq on new SHORT.
 *
 * Candle layout (each candle = 1 simulated minute):
 *   0– 4 : flat 50.000
 *   5– 8 : linear decline 50.000 → 46.000 (4 steps × −1.000)
 *   9–13 : flat 46.000   high=46.100 low=45.900  (flip zone A)
 *  14    : transition 46.000 → 45.000             explicit low=45.000
 *  15–19 : flat 45.000   high=45.100 low=45.000  (flip zone B — exact boundary)
 *  20    : sentinel candle
 *
 * Key constraint: all candle lows must stay above liqPrice (≈44.750) so that
 * checkPosition never fires during the price decline.
 *
 * No Binance API calls — price path is fully synthetic.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "@/store/tradingStore";
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
const SIZE              = 2_000;
const MARGIN            = SIZE / LEVERAGE;      // 200
const WALLET_INIT       = 210;
const WALLET_AFTER_OPEN = WALLET_INIT - MARGIN; // 10

// liqPrice = calcLiquidationPrice(50000, 10, "long", 2000, walletAfterOpen=10)
// totalMargin = 200 + 10 = 210, ratio = 210/2000 = 0.105
// liqPrice = 50000 × (1 − 0.105) = 44.750
const LIQ_PRICE = ENTRY_PRICE * (1 - (MARGIN + WALLET_AFTER_OPEN) / SIZE); // 44750

// Flip parameters for "normal" test at 46.000
const FLIP_PRICE_A      = 46_000;
const FLIP_SIZE         = 2_100;               // excess = 100, excessMargin = 10
const EXCESS_MARGIN     = (FLIP_SIZE - SIZE) / LEVERAGE; // 10

// Boundary: at 45.000, effectiveWallet = excessMargin exactly (= 10)
const FLIP_PRICE_B = ENTRY_PRICE + (-(MARGIN + WALLET_AFTER_OPEN) / SIZE) * ENTRY_PRICE;
// = 50000 + (-0.105 × 50000) = 50000 - 5250... wait let me compute directly:
// effectiveWallet = wallet + returnedMargin + closePnL = excessMargin
// 10 + 200 + (price-50000)/50000 × 2000 = 10
// 200 = -(price-50000)/50000 × 2000
// (price-50000) = -5000 → price = 45.000
const BOUNDARY_PRICE = 45_000;

// ─── Candle sequence ──────────────────────────────────────────────────────────

const T0_SEC = 1_700_000_000;

function buildT03Candles(): ReturnType<typeof buildSyntheticCandles> {
  const specs: CandleSpec[] = [
    // 0–4: flat at entry (lows stay way above liqPrice=44750)
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    { open: 50_000, close: 50_000, high: 50_100, low: 49_900 },
    // 5–8: decline 50.000 → 46.000 in 4 steps (−1.000/candle)
    // explicit lows to prevent accidental wick below liq (44.750)
    { open: 50_000, close: 49_000, high: 50_100, low: 49_000 },
    { open: 49_000, close: 48_000, high: 49_100, low: 48_000 },
    { open: 48_000, close: 47_000, high: 48_100, low: 47_000 },
    { open: 47_000, close: 46_000, high: 47_100, low: 46_000 },
    // 9–13: flat at 46.000 — flip zone A (well above liq=44.750)
    { open: 46_000, close: 46_000, high: 46_100, low: 45_900 },
    { open: 46_000, close: 46_000, high: 46_100, low: 45_900 },
    { open: 46_000, close: 46_000, high: 46_100, low: 45_900 },
    { open: 46_000, close: 46_000, high: 46_100, low: 45_900 },
    { open: 46_000, close: 46_000, high: 46_100, low: 45_900 },
    // 14: transition 46.000 → 45.000 — explicit low to avoid wick near liq
    { open: 46_000, close: BOUNDARY_PRICE, high: 46_000, low: BOUNDARY_PRICE },
    // 15–19: flat at 45.000 — flip zone B (exact boundary, low=45.000 > liq=44.750)
    { open: BOUNDARY_PRICE, close: BOUNDARY_PRICE, high: 45_100, low: BOUNDARY_PRICE },
    { open: BOUNDARY_PRICE, close: BOUNDARY_PRICE, high: 45_100, low: BOUNDARY_PRICE },
    { open: BOUNDARY_PRICE, close: BOUNDARY_PRICE, high: 45_100, low: BOUNDARY_PRICE },
    { open: BOUNDARY_PRICE, close: BOUNDARY_PRICE, high: 45_100, low: BOUNDARY_PRICE },
    { open: BOUNDARY_PRICE, close: BOUNDARY_PRICE, high: 45_100, low: BOUNDARY_PRICE },
    // 20: sentinel (so interpolation at minute 19 works)
    { open: BOUNDARY_PRICE, close: BOUNDARY_PRICE },
  ];
  return buildSyntheticCandles(T0_SEC, specs);
}

// ─── Shared setup ─────────────────────────────────────────────────────────────

function openLongPosition() {
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

describe("T03 — Flip com posição em prejuízo: wallet não fica negativo", () => {
  const candles = buildT03Candles();

  beforeEach(() => {
    openLongPosition();
  });

  // ── Setup verification ──────────────────────────────────────────────────────

  it("position opens correctly: wallet=$10, liqPrice≈44.750", () => {
    const state = useTradingStore.getState();
    expect(state.wallet).toBe(WALLET_AFTER_OPEN); // 10
    expect(state.position!.liquidationPrice).toBeCloseTo(LIQ_PRICE, 0);
    expect(state.position!.side).toBe("long");
    expect(state.position!.size).toBe(SIZE);
  });

  it("price path is correct: flat→decline→flat at 46.000→flat at 45.000", () => {
    expect(runSyntheticTick(candles, T0_SEC,  0).price).toBeCloseTo(50_000, 0);
    expect(runSyntheticTick(candles, T0_SEC,  9).price).toBeCloseTo(46_000, 0);
    expect(runSyntheticTick(candles, T0_SEC, 15).price).toBeCloseTo(45_000, 0);
  });

  it("no liquidation during decline (all candle lows above liqPrice=44.750)", () => {
    for (let m = 0; m <= 19; m++) {
      const tick = runSyntheticTick(candles, T0_SEC, m);
      expect(tick.candleLow).toBeGreaterThan(LIQ_PRICE);
      const result = useTradingStore.getState().checkPosition(
        tick.price, tick.candleLow, tick.candleHigh
      );
      expect(result.closed).toBe(false);
    }
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  // ── Normal flip at 46.000 ───────────────────────────────────────────────────

  it("flip to SHORT $2.100 at 46.000: wallet correct, new position valid", () => {
    useTradingStore.setState({ currentPrice: FLIP_PRICE_A });

    // effectiveWallet = 10 + 200 − 160 = 50, excessMargin = 10 → canFlip=true
    const closePnL    = ((FLIP_PRICE_A - ENTRY_PRICE) / ENTRY_PRICE) * SIZE; // −160
    const returned    = MARGIN;                                               //  200
    const effectiveW  = WALLET_AFTER_OPEN + returned + closePnL;             //   50
    expect(effectiveW).toBeCloseTo(50, 1);
    expect(effectiveW).toBeGreaterThanOrEqual(EXCESS_MARGIN);                // 50 ≥ 10 ✓

    const before = snap();
    useTradingStore.getState().openPosition("short", LEVERAGE, FLIP_SIZE, "", "", null);
    const after = snap();

    // Wallet accounting: newWallet = 10 + 200 − 160 − 10 = 40
    const expectedWallet = WALLET_AFTER_OPEN + returned + closePnL - EXCESS_MARGIN; // 40
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(after.wallet).toBeCloseTo(expectedWallet, 0);

    // Old LONG closed → one trade recorded
    expect(after.closedTrades).toHaveLength(1);
    expect(after.closedTrades[0]).toMatchObject({ side: "long", reason: "manual" });

    // New position: SHORT of excess size only
    expect(after.position!.side).toBe("short");
    expect(after.position!.size).toBe(FLIP_SIZE - SIZE); // 100
    expect(after.position!.entry).toBe(FLIP_PRICE_A);

    // SHORT liqPrice must be ABOVE entry
    expect(after.position!.liquidationPrice).toBeGreaterThan(FLIP_PRICE_A);

    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  // ── Boundary flip at 45.000 ─────────────────────────────────────────────────

  it("flip at exact boundary (45.000): effectiveWallet = excessMargin = 10, wallet = 0", () => {
    // At 45.000: closePnL = (45000−50000)/50000 × 2000 = −200
    // effectiveWallet = 10 + 200 − 200 = 10 = excessMargin → borderline allowed
    useTradingStore.setState({ currentPrice: BOUNDARY_PRICE });

    const before = snap();
    useTradingStore.getState().openPosition("short", LEVERAGE, FLIP_SIZE, "", "", null);
    const after = snap();

    // Store must NOT have returned an error
    expect(useTradingStore.getState().lastActionError).toBeFalsy();

    // newWallet = 10 + 200 − 200 − 10 = 0  (or −ε due to float, clamped to 0)
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.wallet)).toBe(true);
    expect(after.wallet).toBeCloseTo(0, 3);

    // New SHORT position opened
    expect(after.position!.side).toBe("short");
    expect(after.position!.size).toBe(FLIP_SIZE - SIZE); // 100

    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("flip with float boundary driven by synthetic candle (minute 15)", () => {
    // Price from tick at minute 15 (=45.000 from candle[15].open)
    const tick = runSyntheticTick(candles, T0_SEC, 15);
    expect(tick.price).toBeCloseTo(BOUNDARY_PRICE, 0);

    useTradingStore.setState({ currentPrice: tick.price });

    const before = snap();
    useTradingStore.getState().openPosition("short", LEVERAGE, FLIP_SIZE, "", "", null);
    const after = snap();

    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.wallet)).toBe(true);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  // ── Blocked flip ────────────────────────────────────────────────────────────

  it("flip blocked when effectiveWallet < excessMargin (flip size too large)", () => {
    // At 46.000: effectiveWallet = 50
    // flipSize = 2.600 → excess = 600, excessMargin = 60 > 50 → BLOCKED
    useTradingStore.setState({ currentPrice: FLIP_PRICE_A });

    const blockedFlipSize = 2_600;
    const blockedExcessMargin = (blockedFlipSize - SIZE) / LEVERAGE; // 60
    const closePnL = ((FLIP_PRICE_A - ENTRY_PRICE) / ENTRY_PRICE) * SIZE; // −160
    expect(WALLET_AFTER_OPEN + MARGIN + closePnL).toBeLessThan(blockedExcessMargin); // 50 < 60

    const before = snap();
    useTradingStore.getState().openPosition("short", LEVERAGE, blockedFlipSize, "", "", null);
    const after = snap();

    // Position unchanged — flip was blocked
    expect(after.position!.side).toBe("long");
    expect(after.position!.size).toBe(SIZE);
    expect(useTradingStore.getState().lastActionError).toContain("Insufficient funds");

    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  // ── Flip via limit order ─────────────────────────────────────────────────────

  it("flip via limit order: SHORT $2.100 @ 46.000 fires when tick price reaches limit", () => {
    // Place SHORT limit: side=short, size=2100 > position.size=2000 → flip when triggered
    useTradingStore.getState().addPendingOrder({
      side: "short",
      orderType: "open",
      leverage: LEVERAGE,
      size: FLIP_SIZE,
      tpPrice: null,
      slPrice: null,
      limitPrice: FLIP_PRICE_A,
      orderPrice: null,
    });

    // Advance to minute 9: price = 46.000, candleHigh = 46.100 ≥ limitPrice=46.000 for short
    const tick = runSyntheticTick(candles, T0_SEC, 9);
    expect(tick.price).toBeCloseTo(FLIP_PRICE_A, 0);

    const before = snap();
    useTradingStore.getState().checkPendingOrders(tick.price, tick.candleLow, tick.candleHigh);
    const after = snap();

    // Limit fired
    expect(after.pendingOrders).toHaveLength(0);

    // New SHORT position opened
    expect(after.position!.side).toBe("short");
    expect(after.position!.size).toBe(FLIP_SIZE - SIZE); // 100

    // Wallet must be non-negative
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.wallet)).toBe(true);

    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  // ── New position after flip ──────────────────────────────────────────────────

  it("after flip, new SHORT position does not immediately liquidate (liqPrice >> entry)", () => {
    useTradingStore.setState({ currentPrice: FLIP_PRICE_A });
    useTradingStore.getState().openPosition("short", LEVERAGE, FLIP_SIZE, "", "", null);

    const newPos = useTradingStore.getState().position!;
    expect(newPos.side).toBe("short");

    // SHORT liqPrice = entry × (1 + totalMargin/size) must be strictly above entry
    // With wallet=40, size=100: ratio=50/100=0.5 → liqPrice = 46000 × 1.5 = 69.000
    expect(newPos.liquidationPrice).toBeGreaterThan(FLIP_PRICE_A);
    expect(newPos.liquidationPrice).toBeCloseTo(FLIP_PRICE_A * 1.5, 0); // 69.000

    // Running ticks through the remaining synthetic candles should NOT trigger liq on new SHORT
    for (let m = 10; m <= 19; m++) {
      const tick = runSyntheticTick(candles, T0_SEC, m);
      const result = useTradingStore.getState().checkPosition(
        tick.price, tick.candleLow, tick.candleHigh
      );
      expect(result.closed).toBe(false);
    }
  });
});
