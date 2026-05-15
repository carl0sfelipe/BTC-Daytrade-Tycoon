import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebugOverlay } from "./useDebugOverlay";

describe("useDebugOverlay", () => {
  it("does not throw when series is null", () => {
    const candles = [{ time: 0, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }];
    expect(() =>
      renderHook(() => useDebugOverlay(null, candles, 30))
    ).not.toThrow();
  });
});
