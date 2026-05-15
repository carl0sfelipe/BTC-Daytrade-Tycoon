import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradeNotifications } from "./useTradeNotifications";
import { useTradingStore } from "@/store/tradingStore";
import { makePosition, makeTrade } from "@/test/helpers";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useTradeNotifications", () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it("fires toast when position opens (null → position)", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    renderHook(() => useTradeNotifications());

    act(() => {
      useTradingStore.setState({ position: makePosition({ side: "long", size: 1000, leverage: 10 }) });
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast.mock.calls[0][0].title).toMatch(/LONG.*Position Opened|Position Opened.*LONG/i);
  });

  it("fires 'Take Profit Hit' toast when trade closes with reason tp", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    renderHook(() => useTradeNotifications());

    act(() => {
      useTradingStore.setState({
        closedTrades: [makeTrade({ reason: "tp", pnl: 50 })],
      });
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    const call = mockToast.mock.calls[0][0];
    expect(call.title).toBe("🎯 Take Profit Hit");
    expect(call.description).toContain("+$50.00");
  });

  it("fires 'Stop Loss Hit' toast with destructive variant on loss", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    renderHook(() => useTradeNotifications());

    act(() => {
      useTradingStore.setState({
        closedTrades: [makeTrade({ reason: "sl", pnl: -30 })],
      });
    });

    const call = mockToast.mock.calls[0][0];
    expect(call.title).toBe("🛡️ Stop Loss Hit");
    expect(call.description).toContain("$-30.00");
    expect(call.variant).toBe("destructive");
  });

  it("fires 'Trailing Stop Hit' toast for reason trailing_stop", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    renderHook(() => useTradeNotifications());

    act(() => {
      useTradingStore.setState({
        closedTrades: [makeTrade({ reason: "trailing_stop", pnl: -10 })],
      });
    });

    expect(mockToast.mock.calls[0][0].title).toBe("📉 Trailing Stop Hit");
  });

  it("fires liquidation toast with destructive variant when isLiquidated turns true", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    renderHook(() => useTradeNotifications());

    act(() => {
      useTradingStore.setState({ isLiquidated: true });
    });

    const call = mockToast.mock.calls[0][0];
    expect(call.title).toBe("💀 Liquidated");
    expect(call.variant).toBe("destructive");
  });

  it("does not fire duplicate toast when store does not change", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    const { rerender } = renderHook(() => useTradeNotifications());

    rerender();
    rerender();

    expect(mockToast).toHaveBeenCalledTimes(0);
  });

  it("fires positive-variant toast for profitable manual close", () => {
    useTradingStore.setState({ position: null, closedTrades: [], isLiquidated: false });
    renderHook(() => useTradeNotifications());

    act(() => {
      useTradingStore.setState({
        closedTrades: [makeTrade({ reason: "manual", pnl: 100 })],
      });
    });

    const call = mockToast.mock.calls[0][0];
    expect(call.title).toMatch(/Position Closed/);
    expect(call.variant).not.toBe("destructive");
  });
});
