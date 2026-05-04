import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      currentPrice: 50000,
      skipHighLeverageWarning: true,
      pendingOrders: [],
      closedTrades: [],
    });
  });

  it("shows Limit Price input in simple mode when limit is selected", () => {
    render(<TradeControls />);

    // Switch to limit order
    const limitBtn = screen.getByText("Limit");
    fireEvent.click(limitBtn);

    // Should show Limit Price label and input
    expect(screen.getByText("Limit Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("50000.00")).toBeInTheDocument();
  });

  it("shows TP and SL inputs in simple mode when no position", () => {
    render(<TradeControls />);

    expect(screen.getByText("Take Profit")).toBeInTheDocument();
    expect(screen.getByText("Stop Loss")).toBeInTheDocument();
  });

  it("creates a pending limit order instead of opening position immediately", () => {
    render(<TradeControls />);

    // Select limit
    fireEvent.click(screen.getByText("Limit"));

    // Fill limit price
    const limitInput = screen.getByPlaceholderText("50000.00");
    fireEvent.change(limitInput, { target: { value: "48000" } });

    // Fill TP
    const tpInput = screen.getAllByPlaceholderText("0.00")[0];
    fireEvent.change(tpInput, { target: { value: "55000" } });

    // Open position button should say "Place Long Limit"
    const openBtn = screen.getByText("Place Long Limit");
    fireEvent.click(openBtn);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].limitPrice).toBe(48000);
    expect(state.pendingOrders[0].tpPrice).toBe(55000);
    expect(state.position).toBeNull(); // Position NOT opened yet
    expect(state.wallet).toBe(10000); // Margin NOT deducted yet
  });

  it("opens market position immediately when market is selected", () => {
    render(<TradeControls />);

    const openBtn = screen.getByText("Open Long");
    fireEvent.click(openBtn);

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.pendingOrders).toHaveLength(0);
  });
});
