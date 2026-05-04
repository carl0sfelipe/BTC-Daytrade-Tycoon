import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PnLDisplay from "./PnLDisplay";
import { useTradingStore } from "@/store/tradingStore";

const baseTrade = {
  pnl: 0,
  side: "long" as const,
  reason: "manual" as const,
  entryPrice: 50000,
  exitPrice: 52000,
  size: 1000,
  leverage: 10,
  margin: 100,
  entryTime: "2026-05-04T12:00:00Z",
  exitTime: "2026-05-04T13:00:00Z",
};

describe("PnLDisplay", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      currentPrice: 50000,
      closedTrades: [],
      realizedPnL: 0,
    });
  });

  it("has responsive font size for hero balance", () => {
    const { container } = render(<PnLDisplay />);
    const hero = container.querySelector("span.text-2xl.md\\:text-3xl");
    expect(hero).toBeInTheDocument();
  });

  it("has responsive font sizes for stat values", () => {
    const { container } = render(<PnLDisplay />);
    const stats = container.querySelectorAll("span.text-base.md\\:text-lg");
    expect(stats.length).toBeGreaterThanOrEqual(3);
  });

  it("hides Worst Trade when only profitable trades exist", () => {
    // Repro of the user's complaint: 1 winning trade should NOT show a
    // "Worst Trade" row, since there's no actual loss to display.
    useTradingStore.setState({
      closedTrades: [{ ...baseTrade, pnl: 2813.79 }],
      realizedPnL: 2813.79,
      wallet: 12813.79,
    });

    render(<PnLDisplay />);

    expect(screen.queryByText("Worst Trade")).not.toBeInTheDocument();
    expect(screen.getByText("Best Trade")).toBeInTheDocument();
    const bestValue = screen.getByText("Best Trade").parentElement?.querySelector("span:last-child");
    expect(bestValue?.textContent).toBe("+$2,813.79");
  });

  it("hides Best Trade when only losing trades exist", () => {
    useTradingStore.setState({
      closedTrades: [{ ...baseTrade, pnl: -500 }],
      realizedPnL: -500,
      wallet: 9500,
    });

    render(<PnLDisplay />);

    expect(screen.queryByText("Best Trade")).not.toBeInTheDocument();
    expect(screen.getByText("Worst Trade")).toBeInTheDocument();
    const worstValue = screen.getByText("Worst Trade").parentElement?.querySelector("span:last-child");
    expect(worstValue?.textContent).toBe("-$500.00");
  });

  it("shows BOTH Best and Worst when there are wins and losses", () => {
    useTradingStore.setState({
      closedTrades: [
        { ...baseTrade, pnl: 500 },
        { ...baseTrade, pnl: -200 },
      ],
      realizedPnL: 300,
      wallet: 10300,
    });

    render(<PnLDisplay />);

    expect(screen.getByText("Best Trade")).toBeInTheDocument();
    expect(screen.getByText("Worst Trade")).toBeInTheDocument();
    const bestValue = screen.getByText("Best Trade").parentElement?.querySelector("span:last-child");
    const worstValue = screen.getByText("Worst Trade").parentElement?.querySelector("span:last-child");
    expect(bestValue?.textContent).toBe("+$500.00");
    expect(worstValue?.textContent).toBe("-$200.00");
  });

  it("hides both Best and Worst when there are no trades", () => {
    render(<PnLDisplay />);
    expect(screen.queryByText("Best Trade")).not.toBeInTheDocument();
    expect(screen.queryByText("Worst Trade")).not.toBeInTheDocument();
  });
});
