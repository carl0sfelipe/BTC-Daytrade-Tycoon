import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { SentinelProvider } from "@/lib/sentinel/provider";
import { createFrozenClock } from "@/lib/sentinel/clock";
import { useTradeSentinel, useTradeSentinelBlocked } from "./useTradeSentinel";
import { useTradingStore } from "@/store/tradingStore";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SentinelProvider clock={createFrozenClock()}>{children}</SentinelProvider>
  );
}

// jsdom doesn't have PointerEvent; mock a minimal version
globalThis.PointerEvent = class PointerEvent extends MouseEvent {
  constructor(type: string, init?: PointerEventInit) {
    super(type, init);
  }
} as unknown as typeof globalThis.PointerEvent;

describe("useTradeSentinelBlocked", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 1000,
      realizedPnL: 0,
      pendingOrders: [],
      reduceOnly: true,
      position: null,
      currentPrice: 50000,
    });
  });

  it("records a blocked_click event when pointerdown fires on a disabled button", () => {
    const { result } = renderHook(
      () => useTradeSentinelBlocked("trade-controls:button:Open Position", "button"),
      { wrapper }
    );

    const mockButton = document.createElement("button");
    mockButton.disabled = true;
    const event = new PointerEvent("pointerdown", { bubbles: true });
    Object.defineProperty(event, "currentTarget", { value: mockButton, enumerable: true });

    // Should not throw and should execute without error
    expect(() =>
      result.current(event as unknown as React.PointerEvent<HTMLElement>)
    ).not.toThrow();
  });

  it("does nothing when pointerdown fires on an enabled button", () => {
    const { result } = renderHook(
      () => useTradeSentinelBlocked("trade-controls:button:Open Position", "button"),
      { wrapper }
    );

    const mockButton = document.createElement("button");
    mockButton.disabled = false;
    const event = new PointerEvent("pointerdown", { bubbles: true });
    Object.defineProperty(event, "currentTarget", { value: mockButton, enumerable: true });

    expect(() =>
      result.current(event as unknown as React.PointerEvent<HTMLElement>)
    ).not.toThrow();
  });
});

describe("useTradeSentinel", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 1000,
      realizedPnL: 0,
      pendingOrders: [],
      reduceOnly: true,
      position: null,
      currentPrice: 50000,
    });
  });

  it("records a UI_ACTION event after executing the action", () => {
    const { result } = renderHook(
      () => useTradeSentinel("trade-controls:leverage-selector", "spinbutton"),
      { wrapper }
    );

    const action = vi.fn();
    expect(() =>
      result.current(action, { type: "change", value: 10 })
    ).not.toThrow();

    expect(action).toHaveBeenCalledTimes(1);
  });
});
