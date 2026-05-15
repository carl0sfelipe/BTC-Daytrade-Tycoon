import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, resetStore, getSlider } from "@/test/helpers";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls — hedge mode and side preservation", () => {
  beforeEach(() => {
    resetStore();
  });

  it("side stays on user-selected opposite side after position updates", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "short", entry: 50000, size: 2000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));

    const longBtn = screen.getAllByText("LONG").find(
      (el) => el.tagName.toLowerCase() === "button"
    )!;
    expect(longBtn.className).toContain("bg-crypto-long");

    // Simulate a position update (e.g. price tick creates new position object)
    const currentPos = useTradingStore.getState().position!;
    useTradingStore.setState({
      position: { ...currentPos, entryTime: "2026-05-04T12:00:01Z" },
    });

    const longBtnAfter = screen.getAllByText("LONG").find(
      (el) => el.tagName.toLowerCase() === "button"
    )!;
    expect(longBtnAfter.className).toContain("bg-crypto-long");

    const actionLabel = screen.getByText(/FLIP TO LONG|REDUCE POSITION/);
    expect(actionLabel).toBeInTheDocument();
  });

  it("hedge mode shows FLIP label and enables button for sizes > position", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "short", entry: 50000, size: 2000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.change(getSlider(), { target: { value: "5000" } });

    const actionBtn = screen.getByText("FLIP TO LONG");
    expect(actionBtn).toBeInTheDocument();
    expect(screen.queryByText("REDUCE POSITION")).not.toBeInTheDocument();
    expect(actionBtn).not.toBeDisabled();

    fireEvent.click(actionBtn);

    const pos = useTradingStore.getState().position;
    expect(pos).not.toBeNull();
    expect(pos!.side).toBe("long");
  });

  it("hedge mode reduce (size < position) still shows REDUCE, not FLIP", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "short", entry: 50000, size: 5000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.change(getSlider(), { target: { value: "2000" } });

    const reduceBtn = screen.getByText("REDUCE POSITION");
    expect(reduceBtn).toBeInTheDocument();
    expect(reduceBtn).not.toBeDisabled();
    expect(screen.queryByText("FLIP TO LONG")).not.toBeInTheDocument();
  });

  it("store allows hedge flip when returned margin + PnL covers excess", () => {
    useTradingStore.setState({
      wallet: 500,
      position: {
        side: "short", entry: 50000, size: 2000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 49000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.change(getSlider(), { target: { value: "3000" } });

    const actionBtn = screen.getByText("FLIP TO LONG");
    expect(actionBtn).not.toBeDisabled();

    fireEvent.click(actionBtn);

    const pos = useTradingStore.getState().position;
    expect(pos).not.toBeNull();
    expect(pos!.side).toBe("long");
    expect(pos!.size).toBe(1000);
  });

  it.skip("canFlip DISABLES flip button when available funds < excess margin", () => {
    useTradingStore.setState({
      wallet: 5,
      position: {
        side: "short", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 60000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));

    const slider = getSlider();
    fireEvent.change(slider, { target: { value: slider.max } });

    const actionBtn = screen.getByText("FLIP TO LONG").closest("button");
    expect(actionBtn).toBeDisabled();
  });

  it("summary shows excess margin only in hedge mode flip", () => {
    useTradingStore.setState({
      wallet: 500,
      position: {
        side: "short", entry: 50000, size: 2000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.change(getSlider(), { target: { value: "3000" } });

    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$600.00")).toBeInTheDocument();
  });

  it("button changes from FLIP to REDUCE when slider drops below position size", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "short", entry: 50000, size: 2000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));

    fireEvent.change(getSlider(), { target: { value: "3000" } });
    expect(screen.getByText("FLIP TO LONG")).toBeInTheDocument();

    fireEvent.change(getSlider(), { target: { value: "1000" } });
    expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();
    expect(screen.queryByText("FLIP TO LONG")).not.toBeInTheDocument();
  });

  it("limit flip creates pending order even when canOpen is false (canFlip true via returned margin + PnL)", () => {
    useTradingStore.setState({
      wallet: 50,
      position: {
        side: "short", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 48000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.click(screen.getByText("Limit"));

    // Set position size to 2000 (> position.size of 1000 → flip mode)
    fireEvent.change(getSlider(), { target: { value: "2000" } });

    // Fill limit price
    fireEvent.change(screen.getByPlaceholderText("48000"), { target: { value: "49000" } });

    const actionBtn = screen.getByText("Place Long Limit");
    expect(actionBtn).not.toBeDisabled();

    fireEvent.click(actionBtn);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("long");
    expect(state.pendingOrders[0].size).toBe(2000);
    expect(state.pendingOrders[0].limitPrice).toBe(49000);
  });

  it("limit reduce creates pending order when canDecrease true but canOpen false", () => {
    useTradingStore.setState({
      wallet: 50,
      position: {
        side: "short", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 48000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));
    fireEvent.click(screen.getByText("Limit"));

    // Set position size to 500 (< position.size of 1000 → reduce mode)
    fireEvent.change(getSlider(), { target: { value: "500" } });

    // Fill limit price
    fireEvent.change(screen.getByPlaceholderText("48000"), { target: { value: "49000" } });

    const actionBtn = screen.getByText("Place Long Limit");
    expect(actionBtn).not.toBeDisabled();

    fireEvent.click(actionBtn);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("long");
    expect(state.pendingOrders[0].size).toBe(500);
  });

  it("open button DISABLED when wallet < required margin", () => {
    useTradingStore.setState({
      wallet: 50,
      position: null,
      currentPrice: 50000,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    const openBtn = screen.getByText("Open Long");
    expect(openBtn).toBeDisabled();

    fireEvent.click(openBtn);
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("side select preserves user choice across multiple position updates", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "short", entry: 50000, size: 2000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("LONG"));

    const currentPos = useTradingStore.getState().position!;
    for (let i = 0; i < 3; i++) {
      useTradingStore.setState({
        position: { ...currentPos, entryTime: `2026-05-04T12:00:0${i}Z` },
      });
    }

    const longBtn = screen.getAllByText("LONG").find(
      (el) => el.tagName.toLowerCase() === "button"
    )!;
    expect(longBtn.className).toContain("bg-crypto-long");
  });
});
