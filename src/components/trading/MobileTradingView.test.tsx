import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileTradingView from "./MobileTradingView";
import { useTradingStore } from "@/store/tradingStore";
import { makePosition } from "@/test/factories";

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

vi.mock("./OrdersPanel", () => ({
  default: () => <div data-testid="orders-panel">Orders</div>,
}));

vi.mock("../layout/MarketStatus", () => ({
  default: () => <div data-testid="market-status">Market</div>,
}));

vi.mock("./SimulationClock", () => ({
  default: (props: { onEnd: () => void; onPause: () => void; onResume: () => void }) => (
    <div data-testid="sim-clock">
      <button data-testid="sim-end-btn" onClick={props.onEnd}>End</button>
      <button data-testid="sim-pause-btn" onClick={props.onPause}>Pause</button>
      <button data-testid="sim-resume-btn" onClick={props.onResume}>Resume</button>
    </div>
  ),
}));

// framer-motion: render children synchronously without animation
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    // Strip all framer-motion-specific props so React doesn't warn about unknown DOM attrs
    div: ({ children, drag, dragConstraints, dragElastic, onDragEnd, initial, animate, exit, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
  },
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
    vi.clearAllMocks();
  });

  it("renders chart tab by default", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByTestId("trading-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("trade-history")).not.toBeInTheDocument();
  });

  it("switches to history tab on click", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByText("History"));
    expect(screen.getByTestId("trade-history")).toBeInTheDocument();
    expect(screen.queryByTestId("trading-chart")).not.toBeInTheDocument();
  });

  it("switches back to chart tab", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByText("History"));
    fireEvent.click(screen.getByText("Chart"));
    expect(screen.getByTestId("trading-chart")).toBeInTheDocument();
  });

  it("passes onEnd to SimulationClock and calls it on click", () => {
    const onEnd = vi.fn();
    render(<MobileTradingView engine={mockEngine} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId("sim-end-btn"));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("shows 'Open Position' button when no position", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByText("Open Position")).toBeInTheDocument();
  });

  it("shows 'Manage Position' button when position is open", () => {
    useTradingStore.setState({ position: makePosition({ side: "long" }) });
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByText("Manage Position")).toBeInTheDocument();
  });

  it("bottom sheet is hidden by default (trade-controls not visible)", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.queryByTestId("trade-controls")).not.toBeInTheDocument();
  });

  it("clicking 'Open Position' opens the bottom sheet", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByText("Open Position"));
    expect(screen.getByTestId("trade-controls")).toBeInTheDocument();
  });

  it("bottom sheet auto-opens when a position is set in store", () => {
    const { rerender } = render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.queryByTestId("trade-controls")).not.toBeInTheDocument();

    useTradingStore.setState({ position: makePosition({ side: "long" }) });
    rerender(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByTestId("trade-controls")).toBeInTheDocument();
  });

  it("shows position panel when position is open", () => {
    useTradingStore.setState({ position: makePosition({ side: "short" }) });
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByTestId("position-panel")).toBeInTheDocument();
  });

  it("hides position panel when no position", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.queryByTestId("position-panel")).not.toBeInTheDocument();
  });

  it("shows wallet balance", () => {
    useTradingStore.setState({ wallet: 12345.67 });
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByText("$12,345.67")).toBeInTheDocument();
  });

  it("shows positive session PnL in green", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: 150, side: "long", reason: "manual", entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, entryTime: "", exitTime: "", durationSeconds: 60 },
      ],
    });
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    const pnlEl = screen.getByText("+$150.00");
    expect(pnlEl).toBeInTheDocument();
    expect(pnlEl.closest("div")?.className).toContain("crypto-long");
  });

  it("shows negative session PnL in red", () => {
    useTradingStore.setState({
      closedTrades: [
        { pnl: -75, side: "short", reason: "sl", entryPrice: 50000, exitPrice: 49000, size: 1000, leverage: 10, margin: 100, entryTime: "", exitTime: "", durationSeconds: 30 },
      ],
    });
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    const pnlEl = screen.getByText("$-75.00");
    expect(pnlEl).toBeInTheDocument();
    expect(pnlEl.closest("div")?.className).toContain("crypto-short");
  });

  it("renders market status, orders panel, and simulation clock", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByTestId("market-status")).toBeInTheDocument();
    expect(screen.getByTestId("orders-panel")).toBeInTheDocument();
    expect(screen.getByTestId("sim-clock")).toBeInTheDocument();
  });

  it("renders navigation links to leaderboard and achievements", () => {
    render(<MobileTradingView engine={mockEngine} onEnd={vi.fn()} />);
    expect(screen.getByText("Ranking")).toBeInTheDocument();
    expect(screen.getByText("Achievements")).toBeInTheDocument();
    expect(screen.getByText("Terminal")).toBeInTheDocument();
  });
});
