import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import PnLDisplay from "./PnLDisplay";

vi.mock("@/store/tradingStore", () => ({
  useTradingStore: (selector: (s: {
    wallet: number;
    position: null;
    currentPrice: number;
    closedTrades: [];
    realizedPnL: number;
  }) => unknown) =>
    selector({
      wallet: 10000,
      position: null,
      currentPrice: 50000,
      closedTrades: [],
      realizedPnL: 0,
    }),
}));

describe("PnLDisplay responsive layout", () => {
  it("has responsive font size for hero balance", () => {
    const { container } = render(<PnLDisplay />);
    const hero = container.querySelector("span.text-2xl.md\\:text-3xl");
    expect(hero).toBeInTheDocument();
  });

  it("has responsive font sizes for stat values", () => {
    const { container } = render(<PnLDisplay />);
    const stats = container.querySelectorAll("span.text-base.md\\:text-lg");
    expect(stats.length).toBeGreaterThanOrEqual(4);
  });
});
