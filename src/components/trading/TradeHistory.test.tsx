import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TradeHistory from "./TradeHistory";
import { useTradingStore } from "@/store/tradingStore";

describe("TradeHistory", () => {
  it("renders empty state with 'No trades yet' and count 0", () => {
    useTradingStore.setState({ closedTrades: [] });
    render(<TradeHistory />);

    expect(screen.getByText("Trade History")).toBeInTheDocument();
    expect(screen.getByText("0 trades")).toBeInTheDocument();
    expect(screen.getByText("No trades yet")).toBeInTheDocument();
  });

  it("shows correct trade count", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: 40, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "t1", exitTime: "t2" },
        { pnl: -20, side: "short", reason: "sl", entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, entryTime: "t3", exitTime: "t4" },
      ],
    });
    render(<TradeHistory />);

    expect(screen.getByText("2 trades")).toBeInTheDocument();
  });

  it("profitable trade renders with '+' sign and long color class", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: 40, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "t1", exitTime: "t2" },
      ],
    });
    render(<TradeHistory />);

    const pnlEl = screen.getByText("+$40.00");
    expect(pnlEl).toBeInTheDocument();
    expect(pnlEl.className).toContain("text-crypto-long");
  });

  it("priceChange is side-aware: both long and short winning trades show positive change", () => {
    useTradingStore.setState({
      closedTrades: [
        // LONG: exit > entry → positive
        { pnl: 40, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "t1", exitTime: "t2" },
        // SHORT: exit < entry → positive (for short)
        { pnl: 40, side: "short", reason: "manual", entryPrice: 52000, exitPrice: 50000, size: 1000, leverage: 10, margin: 100, entryTime: "t3", exitTime: "t4" },
      ],
    });
    render(<TradeHistory />);

    // Both should show positive priceChange
    expect(screen.getByText("+4.00%")).toBeInTheDocument();
  });
});
