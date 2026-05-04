import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import MarketStatus from "./MarketStatus";

vi.mock("@/store/tradingStore", () => ({
  useTradingStore: (selector: (s: {
    currentPrice: number;
    volatility: number;
    marketTrend: string;
    priceHistory: number[];
  }) => unknown) =>
    selector({
      currentPrice: 77789.57,
      volatility: 1.2,
      marketTrend: "neutral",
      priceHistory: [77000, 77500, 77200, 77789.57],
    }),
}));

describe("MarketStatus responsive layout", () => {
  it("has flex-wrap on root container", () => {
    const { container } = render(<MarketStatus />);
    const root = container.firstElementChild;
    expect(root).toHaveClass("flex-wrap");
  });

  it("has responsive font size for price", () => {
    const { container } = render(<MarketStatus />);
    const price = container.querySelector("span.text-xl.md\\:text-2xl");
    expect(price).toBeInTheDocument();
  });

  it("hides sparkline on small screens", () => {
    const { container } = render(<MarketStatus />);
    const sparkline = container.querySelector("svg.hidden.sm\\:block");
    expect(sparkline).toBeInTheDocument();
  });
});
