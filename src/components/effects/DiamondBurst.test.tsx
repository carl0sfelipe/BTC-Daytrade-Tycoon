import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { makeResolvedCallHit } from "@/test/helpers";
import DiamondBurst from "./DiamondBurst";

function stubPrefersReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches } as MediaQueryList)
  );
}

describe("DiamondBurst", () => {
  beforeEach(() => {
    useTradingStore.setState({ lastCallResult: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an empty overlay when there is no hit", () => {
    render(<DiamondBurst />);
    expect(screen.queryByTestId("diamond-burst-particles")).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ 💎/)).not.toBeInTheDocument();
  });

  it("shows the +N 💎 banner and 14 particles on a rewarded hit", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 25 }) });
    render(<DiamondBurst />);
    expect(screen.getByText("+25 💎")).toBeInTheDocument();
    expect(screen.getByTestId("diamond-burst-particles").children).toHaveLength(14);
  });

  it("shows the streak tag only when streak > 1", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 31, streak: 3 }) });
    render(<DiamondBurst />);
    expect(screen.getByText("×3")).toBeInTheDocument();
  });

  it("hides the streak tag on a streak of 1", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 25, streak: 1 }) });
    render(<DiamondBurst />);
    expect(screen.queryByText(/^×\d+$/)).not.toBeInTheDocument();
  });

  it("does not celebrate misses or zero-reward hits", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ outcome: "missed", reward: 0 }) });
    render(<DiamondBurst />);
    expect(screen.queryByText(/\+\d+ 💎/)).not.toBeInTheDocument();
  });

  it("skips particles under prefers-reduced-motion but keeps the +N 💎 text", () => {
    stubPrefersReducedMotion(true);
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit({ reward: 25 }) });
    render(<DiamondBurst />);
    expect(screen.queryByTestId("diamond-burst-particles")).not.toBeInTheDocument();
    expect(screen.getByText("+25 💎")).toBeInTheDocument();
  });

  it("never intercepts clicks (pointer-events-none overlay)", () => {
    useTradingStore.setState({ lastCallResult: makeResolvedCallHit() });
    const { container } = render(<DiamondBurst />);
    expect(container.firstElementChild).toHaveClass("pointer-events-none", "fixed", "z-[100]");
  });
});
