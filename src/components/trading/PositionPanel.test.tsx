import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PositionPanel from "./PositionPanel";
import { useTradingStore } from "@/store/tradingStore";

describe("PositionPanel", () => {
  it("renders empty state with 'No open position' when position is null", () => {
    useTradingStore.setState({ position: null, lastCloseReason: null });
    render(<PositionPanel />);

    expect(screen.getByText("Your Position")).toBeInTheDocument();
    expect(screen.getByText("No open position")).toBeInTheDocument();
  });

  it("renders lastCloseReason banner above empty state when set", () => {
    useTradingStore.setState({ position: null, lastCloseReason: "Take Profit hit!" });
    render(<PositionPanel />);

    expect(screen.getByText("Take Profit hit!")).toBeInTheDocument();
    expect(screen.getByText("No open position")).toBeInTheDocument();
  });

  it("renders LONG position P&L correctly", () => {
    useTradingStore.setState({
      currentPrice: 52000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        slPrice: null,
        entryTime: "now",
        realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    // PnL = (52000 - 50000) / 50000 * 1000 = 40
    expect(screen.getByText("+$40.00")).toBeInTheDocument();
    // PnL % = (2000 / 50000) * 10 * 100 = 40.00%
    expect(screen.getByText("(+40.00%)")).toBeInTheDocument();
    expect(screen.getByText("LONG")).toBeInTheDocument();
  });

  it("clicking Close Position calls store.closePosition('manual')", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        slPrice: null,
        entryTime: "now",
        realizedPnL: 0,
      },
    });

    const spy = vi.spyOn(useTradingStore.getState(), "closePosition");
    render(<PositionPanel />);

    fireEvent.click(screen.getByText("Close Position"));
    expect(spy).toHaveBeenCalledWith("manual");

    spy.mockRestore();
  });
});
