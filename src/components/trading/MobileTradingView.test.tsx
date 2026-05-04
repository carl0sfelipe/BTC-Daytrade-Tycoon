import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileTradingView from "./MobileTradingView";
import { useTradingStore } from "@/store/tradingStore";

vi.mock("./TradingChart", () => ({
  default: () => <div data-testid="trading-chart">Chart</div>,
}));

vi.mock("./TradeControls", () => ({
  default: () => <div data-testid="trade-controls">Controls</div>,
}));

vi.mock("./TradeHistory", () => ({
  default: () => <div data-testid="trade-history">History</div>,
}));

vi.mock("./PositionPanel", () => ({
  default: () => <div data-testid="position-panel">Position</div>,
}));

vi.mock("../layout/MarketStatus", () => ({
  default: () => <div data-testid="market-status">Market</div>,
}));

vi.mock("./SimulationClock", () => ({
  default: (props: { onEnd: () => void }) => (
    <button data-testid="sim-end-btn" onClick={props.onEnd}>
      End
    </button>
  ),
}));

const mockEngine = {
  isLoading: false,
  loadingMessage: "",
  isPlaying: true,
  elapsedTime: "00:05:03",
  candles: [],
  currentPrice: 50000,
  currentTimeSec: 0,
  error: null,
  realDateRange: "01/01/2020",
  simulatedHistoricalTime: "5h",
  start: vi.fn(),
  pause: vi.fn(),
  reset: vi.fn(),
} as unknown as import("@/hooks/useTimewarpEngine").ReturnTypeUseTimewarpEngine;

describe("MobileTradingView", () => {
  beforeEach(() => {
    useTradingStore.setState({
      position: null,
      wallet: 10000,
      closedTrades: [],
    });
  });

  it("passes onEnd prop to SimulationClock and calls it on click", () => {
    const onEnd = vi.fn();
    render(<MobileTradingView engine={mockEngine} onEnd={onEnd} />);

    const endBtn = screen.getByTestId("sim-end-btn");
    expect(endBtn).toBeInTheDocument();

    fireEvent.click(endBtn);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
