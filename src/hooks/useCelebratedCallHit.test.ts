import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { makeResolvedCallHit } from "@/test/helpers";
import { isRewardedCallHit, useCelebratedCallHit } from "./useCelebratedCallHit";

const WINDOW_MS = 1400;

describe("isRewardedCallHit", () => {
  it("accepts a hit with a positive reward", () => {
    expect(isRewardedCallHit(makeResolvedCallHit())).toBe(true);
  });

  it("rejects null, undefined, misses, voids and zero-reward hits", () => {
    expect(isRewardedCallHit(null)).toBe(false);
    expect(isRewardedCallHit(undefined)).toBe(false);
    expect(isRewardedCallHit(makeResolvedCallHit({ outcome: "missed", reward: 0 }))).toBe(false);
    expect(isRewardedCallHit(makeResolvedCallHit({ outcome: "voided", reward: 0 }))).toBe(false);
    expect(isRewardedCallHit(makeResolvedCallHit({ reward: 0 }))).toBe(false);
  });
});

describe("useCelebratedCallHit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTradingStore.setState({ lastCallResult: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no celebration", () => {
    const { result } = renderHook(() => useCelebratedCallHit(WINDOW_MS));
    expect(result.current).toBeNull();
  });

  it("exposes a rewarded hit, then auto-clears after durationMs", () => {
    const { result } = renderHook(() => useCelebratedCallHit(WINDOW_MS));
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 25, streak: 2 }) });
    });
    expect(result.current).toMatchObject({ reward: 25, streak: 2 });

    act(() => {
      vi.advanceTimersByTime(WINDOW_MS);
    });
    expect(result.current).toBeNull();
  });

  it("ignores misses, voids and zero-reward hits", () => {
    const { result } = renderHook(() => useCelebratedCallHit(WINDOW_MS));
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ outcome: "missed", reward: 0 }) });
    });
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ outcome: "hit", reward: 0 }) });
    });
    expect(result.current).toBeNull();
  });

  it("dedupes by resolvedAt: a store echo of the same hit never replays", () => {
    const { result } = renderHook(() => useCelebratedCallHit(WINDOW_MS));
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ resolvedAt: 111 }) });
    });
    act(() => {
      vi.advanceTimersByTime(WINDOW_MS);
    });

    // e.g. attachServerCallId replaces the snapshot object but keeps resolvedAt
    act(() => {
      useTradingStore.setState({
        lastCallResult: makeResolvedCallHit({ resolvedAt: 111, serverId: "srv-9" }),
      });
    });
    expect(result.current).toBeNull();
  });

  it("celebrates again for a new resolvedAt", () => {
    const { result } = renderHook(() => useCelebratedCallHit(WINDOW_MS));
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ resolvedAt: 111 }) });
    });
    act(() => {
      vi.advanceTimersByTime(WINDOW_MS);
    });
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ resolvedAt: 222, reward: 31 }) });
    });
    expect(result.current).toMatchObject({ reward: 31, resolvedAt: 222 });
  });

  it("clears its expiry timer on unmount", () => {
    const { unmount } = renderHook(() => useCelebratedCallHit(WINDOW_MS));
    act(() => {
      useTradingStore.setState({ lastCallResult: makeResolvedCallHit() });
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
