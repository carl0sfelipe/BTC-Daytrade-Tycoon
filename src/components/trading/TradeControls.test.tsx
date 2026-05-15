import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, resetStore } from "@/test/helpers";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls", () => {
  beforeEach(() => {
    resetStore();
    useTradingStore.setState({ currentPrice: 50000, skipHighLeverageWarning: true });
  });

  it("shows Limit Price input in simple mode when limit is selected", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));

    expect(screen.getByText("Limit Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("50000")).toBeInTheDocument();
  });

  it("shows TP and SL inputs in simple mode when no position", () => {
    renderWithSentinel(<TradeControls />);

    expect(screen.getByRole("button", { name: /Set Take Profit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set Stop Loss/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Set Take Profit/i }));
    expect(screen.getByText("Trigger Price")).toBeInTheDocument();
    expect(screen.getByText("Order Price")).toBeInTheDocument();
  });

  it("creates a pending limit order instead of opening position immediately", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "48000" } });
    fireEvent.click(screen.getByRole("button", { name: /Set Take Profit/i }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "55000" } });
    fireEvent.click(screen.getByText("Place Long Limit"));

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].limitPrice).toBe(48000);
    expect(state.pendingOrders[0].tpPrice).toBe(55000);
    expect(state.position).toBeNull();
    expect(state.wallet).toBe(10000);
  });

  it("opens market position immediately when market is selected", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Open Long"));

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.pendingOrders).toHaveLength(0);
  });

  it("fills limit price with current price on click when empty", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000") as HTMLInputElement;

    expect(limitInput.value).toBe("");
    fireEvent.click(limitInput);
    expect(limitInput.value).toBe("50000");
  });

  it("adjusts limit price up and down with step buttons", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000") as HTMLInputElement;
    fireEvent.click(limitInput);
    expect(limitInput.value).toBe("50000");

    fireEvent.click(screen.getByTestId("limit-price-down"));
    expect(limitInput.value).toBe("49990.00");

    fireEvent.click(screen.getByTestId("limit-price-up"));
    fireEvent.click(screen.getByTestId("limit-price-up"));
    expect(limitInput.value).toBe("50010.00");
  });

  it("shows step settings on gear icon click and hides by default", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    expect(screen.queryByText("$1")).not.toBeInTheDocument();
    expect(screen.queryByText("$5")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Step settings"));
    expect(screen.getByText("$1")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
  });

  it("changes step size via hidden step selector buttons", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000") as HTMLInputElement;
    fireEvent.click(limitInput);

    fireEvent.click(screen.getByLabelText("Step settings"));
    fireEvent.click(screen.getByText("$1"));

    fireEvent.click(screen.getByTestId("limit-price-down"));
    expect(limitInput.value).toBe("49999.00");
  });

  it("allows custom step value", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000") as HTMLInputElement;
    fireEvent.click(limitInput);

    fireEvent.click(screen.getByLabelText("Step settings"));
    fireEvent.change(screen.getByPlaceholderText("e.g. 25"), { target: { value: "25" } });

    fireEvent.click(screen.getByTestId("limit-price-down"));
    expect(limitInput.value).toBe("49975.00");
  });
});
