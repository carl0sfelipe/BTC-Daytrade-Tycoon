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
        { pnl: 40, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "t1", exitTime: "t2", durationSeconds: 0 },
        { pnl: -20, side: "short", reason: "sl", entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, entryTime: "t3", exitTime: "t4", durationSeconds: 0 },
      ],
    });
    render(<TradeHistory />);

    expect(screen.getByText("2 trades")).toBeInTheDocument();
  });

  it("profitable trade renders with '+' sign and long color class", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: 40, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "t1", exitTime: "t2", durationSeconds: 0 },
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
        { pnl: 40, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "t1", exitTime: "t2", durationSeconds: 0 },
        // SHORT: exit < entry → positive (for short)
        { pnl: 40, side: "short", reason: "manual", entryPrice: 52000, exitPrice: 50000, size: 1000, leverage: 10, margin: 100, entryTime: "t3", exitTime: "t4", durationSeconds: 0 },
      ],
    });
    render(<TradeHistory />);

    // Both should show positive priceChange
    expect(screen.getByText("+4.00%")).toBeInTheDocument();
  });

  it("renders trades in reverse-chronological order (last added appears first)", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: 10, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, entryTime: "A", exitTime: "A", durationSeconds: 0 },
        { pnl: 20, side: "long", reason: "tp",     entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: "B", exitTime: "B", durationSeconds: 0 },
        { pnl: 30, side: "long", reason: "sl",     entryPrice: 50000, exitPrice: 53000, size: 1000, leverage: 10, margin: 100, entryTime: "C", exitTime: "C", durationSeconds: 0 },
      ],
    });
    render(<TradeHistory />);

    const pnlEls = screen.getAllByText(/^\+\$[0-9]+\.00$/);
    // Reversed: C ($30) first, then B ($20), then A ($10)
    expect(pnlEls[0].textContent).toBe("+$30.00");
    expect(pnlEls[1].textContent).toBe("+$20.00");
    expect(pnlEls[2].textContent).toBe("+$10.00");
  });

  it("renders correct reason label for each trade reason", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: 10, side: "long", reason: "manual",        entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, entryTime: "t", exitTime: "t", durationSeconds: 0 },
        { pnl: 10, side: "long", reason: "tp",            entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, entryTime: "t", exitTime: "t", durationSeconds: 0 },
        { pnl: -5, side: "long", reason: "sl",            entryPrice: 50000, exitPrice: 49000, size: 1000, leverage: 10, margin: 100, entryTime: "t", exitTime: "t", durationSeconds: 0 },
        { pnl: -5, side: "long", reason: "trailing_stop", entryPrice: 50000, exitPrice: 49000, size: 1000, leverage: 10, margin: 100, entryTime: "t", exitTime: "t", durationSeconds: 0 },
        { pnl: -10, side: "long", reason: "liquidation",  entryPrice: 50000, exitPrice: 45000, size: 1000, leverage: 10, margin: 100, entryTime: "t", exitTime: "t", durationSeconds: 0 },
      ],
    });
    render(<TradeHistory />);

    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("Take Profit")).toBeInTheDocument();
    expect(screen.getByText("Stop Loss")).toBeInTheDocument();
    expect(screen.getByText("Trailing Stop")).toBeInTheDocument();
    expect(screen.getByText("Liquidated")).toBeInTheDocument();
  });
});
