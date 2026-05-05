import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";

// No mock of ConfirmHighLeverageModal — tests the full integration flow

describe("TradeControls — high leverage modal full flow", () => {
  const baseState = {
    wallet: 10000, position: null, currentPrice: 50000,
    pendingOrders: [], closedTrades: [], reduceOnly: true,
    skipHighLeverageWarning: false,
  };

  it("modal intercepts open when leverage >= 50 and skipHighLeverageWarning is false", () => {
    useTradingStore.setState(baseState);
    render(<TradeControls />);

    // Select 50x leverage
    fireEvent.click(screen.getByText("50x"));
    // Click Open Long
    fireEvent.click(screen.getByText("Open Long"));

    // Modal should be visible — position NOT opened yet
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("confirming modal without checkbox opens position and does not set skip flag", () => {
    useTradingStore.setState(baseState);
    render(<TradeControls />);

    fireEvent.click(screen.getByText("50x"));
    fireEvent.click(screen.getByText("Open Long"));

    // Confirm without checking "don't show again"
    fireEvent.click(screen.getByTestId("high-leverage-confirm"));

    expect(useTradingStore.getState().position).not.toBeNull();
    expect(useTradingStore.getState().skipHighLeverageWarning).toBe(false);
  });

  it("confirming with 'don't show again' sets skipHighLeverageWarning to true", () => {
    useTradingStore.setState(baseState);
    render(<TradeControls />);

    fireEvent.click(screen.getByText("50x"));
    fireEvent.click(screen.getByText("Open Long"));

    // Check "don't show again" then confirm
    fireEvent.click(screen.getByTestId("high-leverage-skip-checkbox"));
    fireEvent.click(screen.getByTestId("high-leverage-confirm"));

    expect(useTradingStore.getState().skipHighLeverageWarning).toBe(true);
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  it("second open with 50x skips modal when skipHighLeverageWarning is true", () => {
    useTradingStore.setState({ ...baseState, skipHighLeverageWarning: true });
    render(<TradeControls />);

    fireEvent.click(screen.getByText("50x"));
    fireEvent.click(screen.getByText("Open Long"));

    // No modal, position opens directly
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  it("Cancel button closes modal without opening position", () => {
    useTradingStore.setState(baseState);
    render(<TradeControls />);

    fireEvent.click(screen.getByText("50x"));
    fireEvent.click(screen.getByText("Open Long"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("high-leverage-cancel"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useTradingStore.getState().position).toBeNull();
  });
});
