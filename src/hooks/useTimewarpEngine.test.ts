import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
});
