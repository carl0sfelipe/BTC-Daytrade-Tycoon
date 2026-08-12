import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { makeResolvedCallHit } from "@/test/helpers";
import DiamondCounter, { computeDiamondPillClass } from "./DiamondCounter";

const GLOW_CLASS = "border-crypto-accent";
const QUIET_CLASS = "border-crypto-accent/20";

function renderCounterPill(): Element {
  const { container } = render(<DiamondCounter />);
  const pill = container.firstElementChild;
  if (!pill) throw new Error("DiamondCounter rendered nothing — expected the pill <div>");
  return pill;
}

describe("computeDiamondPillClass", () => {
  it("adds the glow classes only while celebrating", () => {
    expect(computeDiamondPillClass(true)).toContain("shadow-[0_0_18px]");
    expect(computeDiamondPillClass(true)).toContain(GLOW_CLASS);
    expect(computeDiamondPillClass(false)).toContain(QUIET_CLASS);
    expect(computeDiamondPillClass(false)).not.toContain("shadow-[0_0_18px]");
  });
});

describe("DiamondCounter hit glow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTradingStore.setState({ diamonds: 5, callStreak: 0, lastCallResult: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays quiet without a rewarded hit", () => {
    expect(renderCounterPill()).toHaveClass(QUIET_CLASS);
  });

  it("glows on a rewarded hit, then reverts after the celebration window", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 25 }) });
    const pill = renderCounterPill();
    expect(pill).toHaveClass(GLOW_CLASS);

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(pill).toHaveClass(QUIET_CLASS);
  });

  it("does not glow for a zero-reward hit", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 0 }) });
    expect(renderCounterPill()).toHaveClass(QUIET_CLASS);
  });
});
