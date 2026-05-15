/**
 * T02 — Fechar posição com prejuízo extremo (quase liquidação)
 *
 * Scenario:
 *   LONG $10.000 @ 50.000 with 50x (margin=$200). Wallet inicial $210 → após open wallet=$10.
 *   liqPrice = calcLiquidationPrice(50000, 50, "long", 10000, wallet=10) = 48.950.
 *   Price falls to 49.100 (~98% das perdas possíveis antes do liq).
 *   User closes manually at 49.100.
 *
 * What we're testing:
 *   1. liqPrice is computed correctly (cross-margin formula).
 *   2. checkPosition does NOT liquidate when candleLow is strictly above liqPrice.
 *   3. checkPosition DOES liquidate when candleLow drops below liqPrice.
 *   4. Manual close at near-liq price: wallet ≥ 0, no NaN, trade recorded correctly.
 *   5. Close at exact liqPrice: wallet = 0 exactly (clamped by Math.max).
 *   6. computeClosePosition clamps wallet to 0 even when loss exceeds margin + wallet.
 *
 * Candle layout:
 *   0–4   : flat 50.000                    (entry region, position already open)
 *   5–13  : linear decline 50.000→49.100   (−100/candle × 9 candles)
 *   14–18 : flat 49.100 (high=49.200 low=49.000) — safe close zone, liq=48.950 not reached
 *   19    : transition candle 49.100→48.960
 *   20    : near-liq candle: open=48.960, low=48.960 (> liq=48.950) — no liquidation
 *   21    : liq-trigger candle: open=48.960, low=liqPrice−10 — triggers liquidation
 *   22    : sentinel (needed so interpolation works at minute 21 start)
 *
 * Price derived entirely from synthetic candles — no Binance API calls.
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

const ENTRY_PRICE = 50_000;
const LEVERAGE    = 50;
const SIZE        = 10_000;
const MARGIN      = SIZE / LEVERAGE; // 200
const WALLET_INIT = 210;
const WALLET_AFTER_OPEN = WALLET_INIT - MARGIN; // 10

// liqPrice = calcLiquidationPrice(50000, 50, "long", 10000, walletAfterOpen=10)
// totalMargin = 200 + 10 = 210, ratio = 210/10000 = 0.021
// liqPrice = 50000 * (1 − 0.021) = 48.950
const EXPECTED_LIQ_PRICE = ENTRY_PRICE * (1 - (MARGIN + WALLET_AFTER_OPEN) / SIZE); // 48.950

const CLOSE_PRICE      = 49_100;  // manual close price
const NEAR_LIQ_LOW     = EXPECTED_LIQ_PRICE + 10; // 48.960 — above liq, no liquidation
const LIQ_TRIGGER_LOW  = EXPECTED_LIQ_PRICE - 10; // 48.940 — below liq, triggers liquidation

// ─── Candle sequence ──────────────────────────────────────────────────────────

const T0_SEC = 1_700_000_000;

function buildT02Candles(): ReturnType<typeof buildSyntheticCandles> {
  const specs: CandleSpec[] = [
    // 0–4: flat at entry price
    { open: 50_000, close: 50_000 },
    { open: 50_000, close: 50_000 },
    { open: 50_000, close: 50_000 },
    { open: 50_000, close: 50_000 },
    { open: 50_000, close: 50_000 },
    // 5–13: linear decline 50.000 → 49.100 (9 steps × −100)
    { open: 50_000, close: 49_900 },
    { open: 49_900, close: 49_800 },
    { open: 49_800, close: 49_700 },
    { open: 49_700, close: 49_600 },
    { open: 49_600, close: 49_500 },
    { open: 49_500, close: 49_400 },
    { open: 49_400, close: 49_300 },
    { open: 49_300, close: 49_200 },
    { open: 49_200, close: CLOSE_PRICE },
    // 14–18: flat at 49.100 — candleLow=49.000 stays above liq=48.950
    { open: CLOSE_PRICE, close: CLOSE_PRICE, high: 49_200, low: 49_000 },
    { open: CLOSE_PRICE, close: CLOSE_PRICE, high: 49_200, low: 49_000 },
    { open: CLOSE_PRICE, close: CLOSE_PRICE, high: 49_200, low: 49_000 },
    { open: CLOSE_PRICE, close: CLOSE_PRICE, high: 49_200, low: 49_000 },
    { open: CLOSE_PRICE, close: CLOSE_PRICE, high: 49_200, low: 49_000 },
    // 19: transition down toward liq — explicit low to avoid wick crossing liqPrice
    // (default low = min(open,close)*0.998 = 48960*0.998 = 48879 < liqPrice=48950 → wrong)
    { open: CLOSE_PRICE, close: NEAR_LIQ_LOW, high: CLOSE_PRICE, low: NEAR_LIQ_LOW },
    // 20: near-liq — low=48.960 > liq=48.950 → no liquidation
    { open: NEAR_LIQ_LOW, close: NEAR_LIQ_LOW, high: 49_100, low: NEAR_LIQ_LOW },
    // 21: liq trigger — low=48.940 < liq=48.950 → liquidation
    { open: NEAR_LIQ_LOW, close: NEAR_LIQ_LOW, high: 49_100, low: LIQ_TRIGGER_LOW },
    // 22: sentinel candle so interpolation works at minute 21
    { open: NEAR_LIQ_LOW, close: NEAR_LIQ_LOW },
  ];
  return buildSyntheticCandles(T0_SEC, specs);
}

// ─── Shared setup ─────────────────────────────────────────────────────────────

function openPosition() {
  resetStore();
  useTradingStore.setState({
    wallet: WALLET_INIT,
    currentPrice: ENTRY_PRICE,
    skipHighLeverageWarning: true,
    reduceOnly: false,
  });
  // Open via store so liqPrice is computed by calcLiquidationPrice (not hardcoded)
  useTradingStore.getState().openPosition("long", LEVERAGE, SIZE, "", "", null);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("T02 — Fechar posição com prejuízo extremo / quase liquidação", () => {
  const candles = buildT02Candles();

  beforeEach(() => {
    openPosition();
  });

  // ── Candle path & liqPrice ──────────────────────────────────────────────────

  it("liqPrice is computed correctly after opening with thin wallet", () => {
    const pos = useTradingStore.getState().position!;

    // Wallet after open must be $10
    expect(useTradingStore.getState().wallet).toBe(WALLET_AFTER_OPEN);

    // liqPrice = entry × (1 − totalMargin/size)
    expect(pos.liquidationPrice).toBeCloseTo(EXPECTED_LIQ_PRICE, 0);

    // Direction: long liqPrice must be below entry
    expect(pos.liquidationPrice).toBeLessThan(ENTRY_PRICE);
  });

  it("synthetic price path: flat → decline → near-liq", () => {
    // Minute 0: price = 50.000
    expect(runSyntheticTick(candles, T0_SEC, 0).price).toBeCloseTo(50_000, 0);

    // Minute 9: price = 49.100 (start of flat close zone — actually minute 14)
    // Minute 14 = first candle of flat zone at 49100
    expect(runSyntheticTick(candles, T0_SEC, 14).price).toBeCloseTo(CLOSE_PRICE, 0);

    // Minute 20: price = 48.960 (near-liq zone)
    const tick20 = runSyntheticTick(candles, T0_SEC, 20);
    expect(tick20.price).toBeCloseTo(NEAR_LIQ_LOW, 0);
    expect(tick20.candleLow).toBe(NEAR_LIQ_LOW);   // 48.960 — above liq
    expect(tick20.candleHigh).toBe(49_100);
  });

  // ── checkPosition: no liq above liqPrice ────────────────────────────────────

  it("no liquidation while candleLow stays above liqPrice (minutes 0–20)", () => {
    const pos = useTradingStore.getState().position!;

    for (let m = 0; m <= 20; m++) {
      const tick = runSyntheticTick(candles, T0_SEC, m);
      const result = useTradingStore.getState().checkPosition(
        tick.price,
        tick.candleLow,
        tick.candleHigh
      );
      expect(result.closed).toBe(false);

      if (result.closed) {
        // Diagnostic output if test fails
        throw new Error(
          `Unexpected liquidation at minute ${m}: price=${tick.price} ` +
          `candleLow=${tick.candleLow} liqPrice=${pos.liquidationPrice}`
        );
      }
    }
    // Position still alive
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  // ── checkPosition: liq triggers at wick below liqPrice ──────────────────────

  it("liquidation triggers at minute 21 (candleLow=48.940 < liqPrice=48.950)", () => {
    const tick21 = runSyntheticTick(candles, T0_SEC, 21);

    expect(tick21.candleLow).toBe(LIQ_TRIGGER_LOW); // 48.940

    const before = snap();
    const result = useTradingStore.getState().checkPosition(
      tick21.price,
      tick21.candleLow,
      tick21.candleHigh
    );
    const after = snap();

    expect(result.closed).toBe(true);
    expect(result.reason).toBe("liquidation");
    expect(after.position).toBeNull();
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  // ── Manual close at near-liq price ──────────────────────────────────────────

  it("manual close at 49.100: wallet ≥ 0, no NaN, PnL correct", () => {
    useTradingStore.setState({ currentPrice: CLOSE_PRICE });

    const before = snap();
    useTradingStore.getState().closePosition("manual");
    const after = snap();

    // No position left
    expect(after.position).toBeNull();

    // Wallet must be ≥ 0 (not negative)
    expect(after.wallet).toBeGreaterThanOrEqual(0);

    // Wallet must be a finite number — no NaN
    expect(Number.isFinite(after.wallet)).toBe(true);

    // Arithmetic: pnl = (49100−50000)/50000 × 10000 = −180
    //             margin returned = 200
    //             new wallet = 10 + 200 − 180 = 30
    const expectedPnL = ((CLOSE_PRICE - ENTRY_PRICE) / ENTRY_PRICE) * SIZE; // −180
    const expectedWallet = WALLET_AFTER_OPEN + MARGIN + expectedPnL;         //   30
    expect(after.wallet).toBeCloseTo(expectedWallet, 0);

    // Trade recorded with correct PnL
    expect(after.closedTrades).toHaveLength(1);
    const trade = after.closedTrades[0] as { pnl: number; reason: string; exitPrice: number };
    expect(Number.isFinite(trade.pnl)).toBe(true);
    expect(trade.pnl).toBeCloseTo(expectedPnL, 0);
    expect(trade.reason).toBe("manual");
    expect(trade.exitPrice).toBe(CLOSE_PRICE);

    // realizedPnL in store is also finite
    expect(Number.isFinite(useTradingStore.getState().realizedPnL)).toBe(true);

    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("manual close at exact liqPrice (48.950): wallet = 0 exactly (Math.max clamp)", () => {
    useTradingStore.setState({ currentPrice: EXPECTED_LIQ_PRICE });

    const before = snap();
    useTradingStore.getState().closePosition("manual");
    const after = snap();

    // pnl = (48950−50000)/50000 × 10000 = −210
    // new wallet = 10 + 200 − 210 = 0 → Math.max(0, 0) = 0
    const expectedPnL = ((EXPECTED_LIQ_PRICE - ENTRY_PRICE) / ENTRY_PRICE) * SIZE; // −210
    const rawWallet = WALLET_AFTER_OPEN + MARGIN + expectedPnL; // 0
    expect(rawWallet).toBeCloseTo(0, 1); // sanity-check the test math

    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(after.wallet).toBeCloseTo(Math.max(0, rawWallet), 1);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  it("manual close below liqPrice (48.940): wallet clamped to 0 by Math.max", () => {
    // Price overshoots liq (e.g., gap open) but user closes manually before engine ticks
    useTradingStore.setState({ currentPrice: LIQ_TRIGGER_LOW });

    const before = snap();
    useTradingStore.getState().closePosition("manual");
    const after = snap();

    // pnl = (48940−50000)/50000 × 10000 = −212
    // raw wallet = 10 + 200 − 212 = −2 → clamped to 0
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.wallet)).toBe(true);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });

  // ── Wick does NOT reach liqPrice ─────────────────────────────────────────────

  it("candle with low=48.960 (one tick above liqPrice) does not liquidate", () => {
    const tick20 = runSyntheticTick(candles, T0_SEC, 20);
    expect(tick20.candleLow).toBe(NEAR_LIQ_LOW); // 48.960 > liqPrice=48.950

    const result = useTradingStore.getState().checkPosition(
      tick20.price,
      tick20.candleLow,
      tick20.candleHigh
    );
    expect(result.closed).toBe(false);

    // Position still alive; user can still manually close
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  // ── Engine loop simulation through decline ───────────────────────────────────

  it("simulates full tick loop through decline: checkPendingOrders + checkPosition each minute", () => {
    // This mirrors what useTimewarpEngine does on each tick
    for (let m = 0; m <= 19; m++) {
      const tick = runSyntheticTick(candles, T0_SEC, m);

      useTradingStore.setState({ currentPrice: tick.price });
      useTradingStore.getState().checkPendingOrders(tick.price, tick.candleLow, tick.candleHigh);
      const result = useTradingStore.getState().checkPosition(tick.price, tick.candleLow, tick.candleHigh);

      // No liquidation expected in minutes 0–19
      expect(result.closed).toBe(false);
    }

    // After 20 minutes, close manually at current price (≈49.100 at minute 19)
    const finalTick = runSyntheticTick(candles, T0_SEC, 19);
    useTradingStore.setState({ currentPrice: finalTick.price });

    const before = snap();
    useTradingStore.getState().closePosition("manual");
    const after = snap();

    expect(after.position).toBeNull();
    expect(after.wallet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.wallet)).toBe(true);
    expect(assertAllInvariants(before, after)).toEqual([]);
  });
});
