import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTimewarpEngine } from "./useTimewarpEngine";
import { useTradingStore } from "@/store/tradingStore";

vi.mock("@/lib/binance-api", () => ({
  fetchCurrentPrice: vi.fn(() => Promise.resolve(50000)),
  fetchCandles: vi.fn(() =>
    Promise.resolve([
      {
        time: 1609459200,
        open: 49000,
        high: 51000,
        low: 48000,
        close: 50000,
        volume: 100,
        openTime: 1609459200000,
        closeTime: 1609462800000,
      },
      {
        time: 1609459260,
        open: 50000,
        high: 52000,
        low: 49000,
        close: 51000,
        volume: 100,
        openTime: 1609462800000,
        closeTime: 1609466400000,
      },
    ])
  ),
  interpolatePrice: vi.fn(() => 50000),
  getCurrentCandle: vi.fn(() => ({
    time: 1609459200,
    open: 50000,
    high: 51000,
    low: 49000,
    close: 50000,
    volume: 100,
  })),
  calculateTrend: vi.fn(() => "neutral" as const),
  calculateVolatility: vi.fn(() => 1.5),
  normalizeCandlesToBasePrice: vi.fn((candles) =>
    candles.map((c: unknown) => ({
      ...(c as Record<string, unknown>),
      open: 50000,
      high: 51000,
      low: 49000,
      close: 50000,
    }))
  ),
  normalizeCandlesWithContinuity: vi.fn((candles) =>
    candles.map((c: unknown) => ({
      ...(c as Record<string, unknown>),
      open: 50000,
      high: 51000,
      low: 49000,
      close: 50000,
    }))
  ),
}));

describe("useTimewarpEngine", () => {
  beforeEach(() => {
    useTradingStore.setState({
      lastCloseReason: "Position liquidated!",
      isLiquidated: true,
      simulationRealDate: "01/01/2020 → 02/01/2020",
      wallet: 5000,
      closedTrades: [{ pnl: -5000 } as unknown as import("@/store/tradingStore").Trade],
      position: { side: "long", entry: 50000, size: 1000, leverage: 10 } as unknown as import("@/store/tradingStore").Position,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reset() clears lastCloseReason, isLiquidated, and simulationRealDate from store", async () => {
    const { result } = renderHook(() => useTimewarpEngine());

    // Wait for initial load to complete (this already calls resetStore once)
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate dirty state after liquidation during gameplay
    useTradingStore.setState({
      lastCloseReason: "Position liquidated!",
      isLiquidated: true,
      simulationRealDate: "01/01/2020 → 02/01/2020",
      wallet: 5000,
      closedTrades: [{ pnl: -5000 } as unknown as import("@/store/tradingStore").Trade],
      position: { side: "long", entry: 50000, size: 1000, leverage: 10 } as unknown as import("@/store/tradingStore").Position,
    });

    expect(useTradingStore.getState().lastCloseReason).toBe("Position liquidated!");
    expect(useTradingStore.getState().isLiquidated).toBe(true);

    // Call reset
    result.current.reset();

    // Wait for async loadSession inside reset
    await waitFor(() => expect(useTradingStore.getState().lastCloseReason).toBeNull());

    expect(useTradingStore.getState().isLiquidated).toBe(false);
    expect(useTradingStore.getState().simulationRealDate).toBeNull();
    expect(useTradingStore.getState().wallet).toBe(10000);
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades).toEqual([]);
  });

  describe("pause / continue mechanism", () => {
    it("auto-starts after load, then pause flips isPlaying false and start flips it back true", async () => {
      const { result } = renderHook(() => useTimewarpEngine());

      // The hook auto-starts ~500ms after load finishes.
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);

      act(() => result.current.start());
      expect(result.current.isPlaying).toBe(true);
    });

    it("pause clears the tick interval; start re-creates it", async () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const { result } = renderHook(() => useTimewarpEngine());
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      const setCallsAfterAutoStart = setIntervalSpy.mock.calls.length;
      const clearCallsBeforePause = clearIntervalSpy.mock.calls.length;

      // Pause should clear the running interval.
      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCallsBeforePause);

      // Resume should create a new interval.
      act(() => result.current.start());
      expect(result.current.isPlaying).toBe(true);
      expect(setIntervalSpy.mock.calls.length).toBeGreaterThan(setCallsAfterAutoStart);

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it("paused engine does not write to the store between pause and the next resume", async () => {
      const { result } = renderHook(() => useTimewarpEngine());
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      const setStateSpy = vi.spyOn(useTradingStore, "setState");

      // Pause; from this point no tick should touch the store.
      act(() => result.current.pause());
      const callsAfterPause = setStateSpy.mock.calls.length;

      // Wait several tick intervals worth of wall time (TICK_MS = 100ms).
      await new Promise((r) => setTimeout(r, 350));
      expect(setStateSpy.mock.calls.length).toBe(callsAfterPause);

      setStateSpy.mockRestore();
    });

    it("start() is a no-op when already playing (no extra interval, no state churn)", async () => {
      const { result } = renderHook(() => useTimewarpEngine());
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      const beforeCalls = setIntervalSpy.mock.calls.length;

      act(() => result.current.start());

      expect(result.current.isPlaying).toBe(true);
      expect(setIntervalSpy.mock.calls.length).toBe(beforeCalls);

      setIntervalSpy.mockRestore();
    });

    it("pause() is idempotent", async () => {
      const { result } = renderHook(() => useTimewarpEngine());
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);

      // Second pause should not throw and should leave state untouched.
      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);
    });

    it("does not rewind the simulation clock when resuming", async () => {
      // Regression test for an inverted-sign bug in start():
      //   clockRef.current.advance(-elapsedSec * 1000)  // BUG: drives clock backwards
      // The fix is to advance by the POSITIVE elapsed time so the clock
      // resumes from where it paused.

      // Real timers — this test depends on actual wall-clock progression so
      // the engine's setInterval(tick, 100) actually fires and elapsedTime
      // advances past "00:00:00".
      vi.useRealTimers();

      const { result } = renderHook(() => useTimewarpEngine());
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      // Let enough real time pass that elapsedTime has ticked past "00:00:00",
      // because the buggy code path only fires when elapsedTime !== "00:00:00".
      await waitFor(
        () => expect(result.current.elapsedTime).not.toBe("00:00:00"),
        { timeout: 3000 }
      );

      const timeBeforePause = result.current.currentTimeSec;
      expect(timeBeforePause).toBeGreaterThan(0);

      act(() => result.current.pause());
      await new Promise((r) => setTimeout(r, 200));

      act(() => result.current.start());
      // Wait long enough for at least a few ticks to fire after resume.
      await new Promise((r) => setTimeout(r, 400));

      // Hard invariant: simulated time can only move forward across a
      // pause/resume cycle, never backward. The inverted-sign bug makes
      // clock.now() go negative on resume, which drives currentTimeSec
      // far below timeBeforePause.
      expect(result.current.currentTimeSec).toBeGreaterThanOrEqual(timeBeforePause);
    });

    it("survives multiple pause/resume cycles without losing the playing flag", async () => {
      const { result } = renderHook(() => useTimewarpEngine());
      await waitFor(() => expect(result.current.isPlaying).toBe(true), { timeout: 2000 });

      for (let i = 0; i < 3; i++) {
        act(() => result.current.pause());
        expect(result.current.isPlaying).toBe(false);

        act(() => result.current.start());
        expect(result.current.isPlaying).toBe(true);
      }
    });
  });
});
