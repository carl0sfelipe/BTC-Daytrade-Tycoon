import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, resetStore, getSlider } from "@/test/helpers";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls — TP/SL input flows", () => {
  beforeEach(() => {
    resetStore();
    useTradingStore.setState({ currentPrice: 50000, skipHighLeverageWarning: true });
  });

  it("TP and SL typed by user are passed to openPosition", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByRole("button", { name: /Set Take Profit/i }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "55000" } });

    fireEvent.click(screen.getByRole("button", { name: /Set Stop Loss/i }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "48000" } });

    fireEvent.click(screen.getByTestId("trade-controls-action-btn"));

    const pos = useTradingStore.getState().position;
    expect(pos!.tpPrice).toBe(55000);
    expect(pos!.slPrice).toBe(48000);
  });

  it("TP and SL are passed to addPendingOrder in limit mode", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "49000" } });

    fireEvent.click(screen.getByRole("button", { name: /Set Take Profit/i }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "55000" } });

    fireEvent.click(screen.getByRole("button", { name: /Set Stop Loss/i }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "48000" } });

    fireEvent.click(screen.getByTestId("trade-controls-action-btn"));

    const order = useTradingStore.getState().pendingOrders[0];
    expect(order.tpPrice).toBe(55000);
    expect(order.slPrice).toBe(48000);
  });
});

describe.skip("TradeControls — trailing stop input (UI disabled)", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 9900, currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
      reduceOnly: true, skipHighLeverageWarning: true,
    });
  });

  it("Set button is disabled when value > 20 (bug B2 regression)", () => {
    renderWithSentinel(<TradeControls />);
    fireEvent.change(screen.getByPlaceholderText("0.0"), { target: { value: "25" } });
    expect(screen.getByText("Set")).toBeDisabled();
  });

  it("Set button enabled with valid value and updates store", () => {
    renderWithSentinel(<TradeControls />);
    fireEvent.change(screen.getByPlaceholderText("0.0"), { target: { value: "5" } });
    expect(screen.getByText("Set")).not.toBeDisabled();
    fireEvent.click(screen.getByText("Set"));
    expect(useTradingStore.getState().position!.trailingStopPercent).toBe(5);
  });

  it("Remove button clears trailing stop and input", () => {
    useTradingStore.setState({
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: 5, trailingStopPrice: 47500,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });
    renderWithSentinel(<TradeControls />);
    fireEvent.click(screen.getByText("Remove"));
    expect(useTradingStore.getState().position!.trailingStopPercent).toBeNull();
    expect(screen.getByText("Set")).toBeInTheDocument();
  });

  it("limit order in hedge mode disabled when insufficient excess funds (bug B1 regression)", () => {
    useTradingStore.setState({
      wallet: 5,
      position: {
        side: "short", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 60000, reduceOnly: false, skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("60000.00"), { target: { value: "58000" } });

    const slider = getSlider();
    fireEvent.change(slider, { target: { value: slider.getAttribute("max") } });

    expect(screen.getByTestId("trade-controls-action-btn")).toBeDisabled();
  });
});
