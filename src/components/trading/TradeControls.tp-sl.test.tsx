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

// Revived with the TrailingStopControl restoration (UI dropped by 3193d78).
describe("TradeControls — trailing stop input", () => {
  beforeEach(() => {
    resetStore();
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
    fireEvent.change(screen.getByTestId("trailing-stop-input"), { target: { value: "25" } });
    expect(screen.getByTestId("trailing-stop-set")).toBeDisabled();
  });

  it("Set button enabled with valid value and updates store", () => {
    renderWithSentinel(<TradeControls />);
    fireEvent.change(screen.getByTestId("trailing-stop-input"), { target: { value: "5" } });
    expect(screen.getByTestId("trailing-stop-set")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("trailing-stop-set"));
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
    fireEvent.click(screen.getByTestId("trailing-stop-remove"));
    expect(useTradingStore.getState().position!.trailingStopPercent).toBeNull();
    expect(screen.getByTestId("trailing-stop-set")).toBeInTheDocument();
    expect(screen.getByTestId("trailing-stop-input")).toHaveValue(null);
  });

  // Bug B1 regression (a5a87eb), re-encoded for the b96bb3b capacity model:
  // the affordability guard moved from the action button into calcSliderMax.
  // With effectiveWallet negative (wallet $5, close PnL −$200) the slider
  // collapses to its $100 floor, so the UI can only arm a partial reduce —
  // an unaffordable hedge flip cannot be placed at all.
  it("limit order in hedge mode cannot arm an unaffordable flip (bug B1 regression)", () => {
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

    fireEvent.click(screen.getByTestId("trade-controls-side-long"));
    fireEvent.click(screen.getByText("Limit"));
    // LimitPriceInput placeholder drifted to toFixed(0) while this test was
    // parked — the testid is the stable selector.
    fireEvent.change(screen.getByTestId("limit-price-input"), { target: { value: "58000" } });

    const slider = getSlider();
    expect(slider.getAttribute("max")).toBe("100");
    fireEvent.change(slider, { target: { value: slider.getAttribute("max") } });
    fireEvent.click(screen.getByTestId("trade-controls-action-btn"));

    const placedOrder = useTradingStore.getState().pendingOrders[0];
    expect(placedOrder.size).toBe(100);
    expect(placedOrder.size).toBeLessThan(1000);
  });
});
