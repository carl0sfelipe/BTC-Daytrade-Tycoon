/**
 * Golden scenarios for the called-shot lifecycle wired through the real store:
 * declaration at open, resolution via engine fills (wick-aware TP, SL-wins-tie,
 * liquidation), voiding on manual exit / TP change, streak and cooldown.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";
import { CALL_REWARD_COOLDOWN_MS } from "@/lib/calls/diamond-reward";

const ENTRY = 100_000;

function resetStore(): void {
  useTradingStore.setState({
    wallet: 10_000,
    position: null,
    pendingOrders: [],
    ordersHistory: [],
    closedTrades: [],
    realizedPnL: 0,
    currentPrice: ENTRY,
    price: ENTRY,
    reduceOnly: true,
    activeCall: null,
    diamonds: 0,
    callStreak: 0,
    callRunId: "test-run",
    diamondsThisRun: 0,
    lastRewardedCallAt: null,
    lastCallResult: null,
  });
}

/** Market LONG $1000 @ 10x with a +10% called shot (TP 110k). */
function openCalledShotLong(slPrice = ""): void {
  useTradingStore.getState().openPosition("long", 10, 1000, "110000", slPrice, null);
}

describe("called shot — declaration", () => {
  beforeEach(resetStore);

  it("declares a call when a market position opens with a TP", () => {
    openCalledShotLong();
    const { activeCall } = useTradingStore.getState();
    expect(activeCall).not.toBeNull();
    expect(activeCall!.side).toBe("long");
    expect(activeCall!.targetPrice).toBe(110_000);
    expect(activeCall!.targetPercent).toBeCloseTo(10);
    expect(activeCall!.leverage).toBe(10);
    expect(activeCall!.potentialReward).toBe(25);
    expect(activeCall!.runId).toBe("test-run");
  });

  it("does not declare a call without a TP", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    expect(useTradingStore.getState().position).not.toBeNull();
    expect(useTradingStore.getState().activeCall).toBeNull();
  });

  it("does not declare a call for a noise target (+0.1%)", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "100100", "", null);
    expect(useTradingStore.getState().activeCall).toBeNull();
  });
});

describe("called shot — golden resolutions", () => {
  beforeEach(resetStore);

  it("GOLDEN: target touched by wick pays the reward", () => {
    openCalledShotLong();
    // Interpolated price never reaches 110k, but the candle wick does.
    useTradingStore.setState({ currentPrice: 109_000 });
    const result = useTradingStore.getState().checkPosition(109_000, 108_000, 110_500);

    expect(result).toEqual({ closed: true, reason: "tp" });
    const s = useTradingStore.getState();
    expect(s.activeCall).toBeNull();
    expect(s.diamonds).toBe(25);
    expect(s.callStreak).toBe(1);
    expect(s.lastCallResult).toMatchObject({ outcome: "hit", reward: 25, streak: 1 });
  });

  it("GOLDEN: SL and target in the same candle — SL wins, call missed", () => {
    openCalledShotLong("99000");
    useTradingStore.setState({ currentPrice: 105_000 });
    const result = useTradingStore.getState().checkPosition(105_000, 98_500, 110_500);

    expect(result).toEqual({ closed: true, reason: "sl" });
    const s = useTradingStore.getState();
    expect(s.diamonds).toBe(0);
    expect(s.callStreak).toBe(0);
    expect(s.lastCallResult).toMatchObject({ outcome: "missed", reward: 0 });
  });

  it("GOLDEN: liquidation before the target misses the call and resets the streak", () => {
    useTradingStore.setState({ callStreak: 3 });
    // Big position vs wallet so cross-margin liquidation is reachable:
    // margin 5k + free wallet 5k over 50k size → liq at entry × 0.8 = 80k.
    useTradingStore.getState().openPosition("long", 10, 50_000, "110000", "", null);
    expect(useTradingStore.getState().activeCall).not.toBeNull();
    useTradingStore.setState({ currentPrice: 81_000 });
    const result = useTradingStore.getState().checkPosition(81_000, 79_000, 82_000);

    expect(result.closed).toBe(true);
    expect(result.reason).toBe("liquidation");
    const s = useTradingStore.getState();
    expect(s.diamonds).toBe(0);
    expect(s.callStreak).toBe(0);
    expect(s.lastCallResult).toMatchObject({ outcome: "missed" });
  });

  it("manual close before the target voids the call and preserves the streak", () => {
    useTradingStore.setState({ callStreak: 2 });
    openCalledShotLong();
    useTradingStore.getState().closePosition("manual");

    const s = useTradingStore.getState();
    expect(s.diamonds).toBe(0);
    expect(s.callStreak).toBe(2);
    expect(s.lastCallResult).toMatchObject({ outcome: "voided", reward: 0, streak: 2 });
  });

  it("moving the TP after declaring voids the call", () => {
    openCalledShotLong();
    useTradingStore.getState().setPositionTpSl("115000", "");

    const s = useTradingStore.getState();
    expect(s.activeCall).toBeNull();
    expect(s.lastCallResult).toMatchObject({ outcome: "voided" });
    // Position keeps trading with the new TP — only the call is gone.
    expect(s.position?.tpPrice).toBe(115_000);
  });

  it("updating only the SL keeps the call alive", () => {
    openCalledShotLong();
    useTradingStore.getState().setPositionTpSl("", "98000");
    expect(useTradingStore.getState().activeCall).not.toBeNull();
  });
});

describe("called shot — streak and guards", () => {
  beforeEach(resetStore);

  it("GOLDEN: consecutive hits apply the streak multiplier", () => {
    openCalledShotLong();
    useTradingStore.setState({ currentPrice: 110_100 });
    useTradingStore.getState().checkPosition(110_100, 109_000, 110_500);
    expect(useTradingStore.getState().diamonds).toBe(25);

    // Skip past the reward cooldown, then hit a second call.
    useTradingStore.setState({
      lastRewardedCallAt: Date.now() - CALL_REWARD_COOLDOWN_MS - 1,
      currentPrice: ENTRY,
    });
    openCalledShotLong();
    useTradingStore.setState({ currentPrice: 110_100 });
    useTradingStore.getState().checkPosition(110_100, 109_000, 110_500);

    const s = useTradingStore.getState();
    expect(s.callStreak).toBe(2);
    expect(s.diamonds).toBe(25 + 31); // second hit pays 25 × 1.25
  });

  it("a hit inside the cooldown pays 0 but advances the streak", () => {
    openCalledShotLong();
    useTradingStore.setState({ currentPrice: 110_100 });
    useTradingStore.getState().checkPosition(110_100, 109_000, 110_500);

    useTradingStore.setState({ currentPrice: ENTRY });
    openCalledShotLong();
    useTradingStore.setState({ currentPrice: 110_100 });
    useTradingStore.getState().checkPosition(110_100, 109_000, 110_500);

    const s = useTradingStore.getState();
    expect(s.diamonds).toBe(25);
    expect(s.callStreak).toBe(2);
    expect(s.lastCallResult).toMatchObject({ outcome: "hit", reward: 0 });
  });

  it("resetCallRun starts a fresh run budget but keeps diamonds and streak", () => {
    openCalledShotLong();
    useTradingStore.setState({ currentPrice: 110_100 });
    useTradingStore.getState().checkPosition(110_100, 109_000, 110_500);

    useTradingStore.getState().resetCallRun();
    const s = useTradingStore.getState();
    expect(s.diamonds).toBe(25);
    expect(s.callStreak).toBe(1);
    expect(s.diamondsThisRun).toBe(0);
    expect(s.callRunId).not.toBe("test-run");
    expect(s.lastCallResult).toBeNull();
  });
});
