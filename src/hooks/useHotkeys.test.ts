import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHotkeys } from "./useHotkeys";

function pressKey(code: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) {
  const event = new KeyboardEvent("keydown", { code, bubbles: true, ...modifiers });
  window.dispatchEvent(event);
  return event;
}

function pressKeyOnTarget(code: string, tagName: string) {
  const el = document.createElement(tagName as keyof HTMLElementTagNameMap);
  document.body.appendChild(el);
  // Dispatching on the element itself sets event.target correctly; it bubbles to window
  const event = new KeyboardEvent("keydown", { code, bubbles: true });
  el.dispatchEvent(event);
  document.body.removeChild(el);
}

describe("useHotkeys", () => {
  let handlers: {
    onBuy: ReturnType<typeof vi.fn>;
    onSell: ReturnType<typeof vi.fn>;
    onClose: ReturnType<typeof vi.fn>;
    onPlayPause: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers = {
      onBuy: vi.fn(),
      onSell: vi.fn(),
      onClose: vi.fn(),
      onPlayPause: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("B key calls onBuy", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyB");
    expect(handlers.onBuy).toHaveBeenCalledTimes(1);
  });

  it("S key calls onSell", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyS");
    expect(handlers.onSell).toHaveBeenCalledTimes(1);
  });

  it("C key calls onClose", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyC");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onClose", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("Escape");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it("Space calls onPlayPause", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("Space");
    expect(handlers.onPlayPause).toHaveBeenCalledTimes(1);
  });

  it("Space prevents default scroll behavior", () => {
    renderHook(() => useHotkeys(handlers));
    const event = new KeyboardEvent("keydown", { code: "Space", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("B with Ctrl modifier does NOT call onBuy (browser shortcut safety)", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyB", { ctrlKey: true });
    expect(handlers.onBuy).not.toHaveBeenCalled();
  });

  it("S with Meta modifier does NOT call onSell", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyS", { metaKey: true });
    expect(handlers.onSell).not.toHaveBeenCalled();
  });

  it("C with Alt modifier does NOT call onClose", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyC", { altKey: true });
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it("keys inside an <input> element are ignored", () => {
    renderHook(() => useHotkeys(handlers));
    pressKeyOnTarget("KeyB", "input");
    expect(handlers.onBuy).not.toHaveBeenCalled();
  });

  it("keys inside a <textarea> element are ignored", () => {
    renderHook(() => useHotkeys(handlers));
    pressKeyOnTarget("KeyS", "textarea");
    expect(handlers.onSell).not.toHaveBeenCalled();
  });

  it("keys inside a <select> element are ignored", () => {
    renderHook(() => useHotkeys(handlers));
    pressKeyOnTarget("KeyC", "select");
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it("removes keydown listener on unmount (no calls after unmount)", () => {
    const { unmount } = renderHook(() => useHotkeys(handlers));
    unmount();
    pressKey("KeyB");
    expect(handlers.onBuy).not.toHaveBeenCalled();
  });

  it("handlers update without re-subscribing (ref pattern)", () => {
    const onBuyV1 = vi.fn();
    const onBuyV2 = vi.fn();

    const { rerender } = renderHook(
      ({ buy }: { buy: () => void }) => useHotkeys({ ...handlers, onBuy: buy }),
      { initialProps: { buy: onBuyV1 } }
    );

    rerender({ buy: onBuyV2 });
    pressKey("KeyB");

    // Should call the latest handler, not the stale one
    expect(onBuyV2).toHaveBeenCalledTimes(1);
    expect(onBuyV1).not.toHaveBeenCalled();
  });

  it("unrecognised keys do not trigger any handler", () => {
    renderHook(() => useHotkeys(handlers));
    pressKey("KeyQ");
    pressKey("KeyZ");
    pressKey("KeyX");
    expect(handlers.onBuy).not.toHaveBeenCalled();
    expect(handlers.onSell).not.toHaveBeenCalled();
    expect(handlers.onClose).not.toHaveBeenCalled();
    expect(handlers.onPlayPause).not.toHaveBeenCalled();
  });
});
