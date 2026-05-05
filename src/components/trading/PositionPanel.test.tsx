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
        trailingStopPercent: null,
        trailingStopPrice: null,
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
        trailingStopPercent: null,
        trailingStopPrice: null,
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

  it("shows Realized P&L row when realizedPnL is non-zero", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", realizedPnL: 150,
      },
    });
    render(<PositionPanel />);

    expect(screen.getByText("Realized P&L")).toBeInTheDocument();
    expect(screen.getByText("+$150.00")).toBeInTheDocument();
  });

  it("hides Realized P&L row when realizedPnL is 0", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    expect(screen.queryByText("Realized P&L")).not.toBeInTheDocument();
  });

  it("shows trailing stop indicator with correct percent and price", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: 5, trailingStopPrice: 47500,
        entryTime: "now", realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    expect(screen.getByText("Trailing Stop")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText(/47,500/)).toBeInTheDocument();
  });

  it("hides trailing stop row when trailingStopPercent is null", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    expect(screen.queryByText("Trailing Stop")).not.toBeInTheDocument();
  });

  it("shows Take Profit tag when tpPrice is set, not SL", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: 55000, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    expect(screen.getByText("Take Profit")).toBeInTheDocument();
    expect(screen.getByText("$55000.00")).toBeInTheDocument();
    expect(screen.queryByText("Stop Loss")).not.toBeInTheDocument();
  });

  it("shows Stop Loss tag when slPrice is set, not TP", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: 48000,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    expect(screen.getByText("Stop Loss")).toBeInTheDocument();
    expect(screen.getByText("$48000.00")).toBeInTheDocument();
    expect(screen.queryByText("Take Profit")).not.toBeInTheDocument();
  });

  it("shows both TP and SL tags when both are set", () => {
    useTradingStore.setState({
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: 55000, slPrice: 48000,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", realizedPnL: 0,
      },
    });
    render(<PositionPanel />);

    expect(screen.getByText("Take Profit")).toBeInTheDocument();
    expect(screen.getByText("Stop Loss")).toBeInTheDocument();
  });
});
