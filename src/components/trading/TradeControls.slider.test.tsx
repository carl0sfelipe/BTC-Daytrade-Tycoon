import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, openLong5k, resetStore, getSlider } from "@/test/helpers";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls — slider and position labels", () => {
  beforeEach(() => {
    resetStore();
  });

  it("INCREASE label shows whenever side === position.side", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
  });

  it("REDUCE label shows whenever side !== position.side", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();
    expect(screen.queryByText("INCREASE POSITION")).not.toBeInTheDocument();
  });

  it("toggles INCREASE/REDUCE when clicking LONG → SHORT → LONG", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();

    fireEvent.click(screen.getByText("SHORT"));
    expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();

    fireEvent.click(screen.getByText("LONG"));
    expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
  });

  it("allows INCREASE order smaller than current position size (the reported bug)", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const slider = getSlider();
    fireEvent.change(slider, { target: { value: "200" } });

    const increaseBtn = screen.getByText("INCREASE POSITION");
    expect(increaseBtn).not.toBeDisabled();
    fireEvent.click(increaseBtn);

    expect(useTradingStore.getState().position?.size).toBe(5200);
  });

  it("REDUCE applies the order size as a delta from position.size", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.change(getSlider(), { target: { value: "300" } });
    fireEvent.click(screen.getByText("REDUCE POSITION"));

    expect(useTradingStore.getState().position?.size).toBe(4700);
  });

  it("REDUCE slider max is capped at position.size in reduce only mode", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    expect(getSlider().max).toBe("5000");
  });

  it("hedge mode: slider max allows orders larger than position.size", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));

    // Hedge mode: position.size (1000) + effectiveWallet * leverage
    // effectiveWallet = wallet (10000) + returnedMargin (100) + closePnl (0) = 10100
    // result = 1000 + 10100 * 10 = 102000
    expect(getSlider().max).toBe("102000");
  });

  it("INCREASE slider max scales with wallet and leverage", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    expect(getSlider().max).toBe("100000");
  });

  it("snaps to default $1000 order size on side click", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const slider = getSlider();
    fireEvent.change(slider, { target: { value: "3000" } });
    expect(slider.value).toBe("3000");

    fireEvent.click(screen.getByText("SHORT"));
    expect(slider.value).toBe("1000");

    fireEvent.click(screen.getByText("LONG"));
    expect(slider.value).toBe("1000");
  });

  it("REDUCE equal to full position size closes the position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.change(getSlider(), { target: { value: "5000" } });
    fireEvent.click(screen.getByText("REDUCE POSITION"));

    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades).toHaveLength(1);
  });

  it("REDUCE with max slider value closes the position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    const slider = getSlider();
    fireEvent.change(slider, { target: { value: slider.max } });
    fireEvent.click(screen.getByText("REDUCE POSITION"));

    expect(useTradingStore.getState().position).toBeNull();
  });

  it("caps initial slider to position size when position is smaller than $1000", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "long", entry: 50000, size: 500, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    expect(getSlider().value).toBe("500");
  });

  it("shows CLOSE POSITION button in limit mode with open position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    expect(screen.getByText("CLOSE POSITION")).toBeInTheDocument();
  });

  it("limit order with open position creates pending order instead of market reduce", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "48000" } });
    fireEvent.click(screen.getByText("Place Short Limit"));

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("short");
    expect(state.pendingOrders[0].limitPrice).toBe(48000);
    expect(state.position).not.toBeNull();
    expect(state.position!.size).toBe(5000);
  });

  it("limit order with open position (same side) creates pending increase order", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "52000" } });
    fireEvent.click(screen.getByText("Place Long Limit"));

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("long");
    expect(state.pendingOrders[0].limitPrice).toBe(52000);
    expect(state.position).not.toBeNull();
    expect(state.position!.size).toBe(5000);
  });

  it("limit reduce in hedge mode enables button when size < position", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "long", entry: 50000, size: 5000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(getSlider(), { target: { value: "2000" } });
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "48000" } });

    const limitBtn = screen.getByText("Place Short Limit");
    expect(limitBtn).not.toBeDisabled();

    fireEvent.click(limitBtn);
    expect(useTradingStore.getState().pendingOrders).toHaveLength(1);
    expect(useTradingStore.getState().pendingOrders[0].size).toBe(2000);
  });

  it("shows TP/SL inputs in advanced mode with open position + limit selected", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Advanced Mode"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.click(screen.getByRole("button", { name: /Set Take Profit/i }));

    expect(screen.getByText("Trigger Price")).toBeInTheDocument();
    expect(screen.getByText("Order Price")).toBeInTheDocument();
  });

  it("INCREASE recalculates liquidation price after adding to position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.change(getSlider(), { target: { value: "5000" } });
    fireEvent.click(screen.getByText("INCREASE POSITION"));

    const pos = useTradingStore.getState().position;
    expect(pos).not.toBeNull();
    expect(pos!.liquidationPrice).not.toBeNull();
  });

  it("manual size input updates position size and slider", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2500" } });

    expect(getSlider().value).toBe("2500");
    expect(useTradingStore.getState().position?.size).toBe(5000); // store only updates on button click
  });

  it("manual size input clamps to min 100", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "50" } });

    expect(getSlider().value).toBe("100");
  });

  it("manual size input clamps to max slider value", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "999999" } });

    expect(getSlider().value).toBe(getSlider().max);
  });
});
