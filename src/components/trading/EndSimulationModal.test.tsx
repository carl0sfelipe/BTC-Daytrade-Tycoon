import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EndSimulationModal from "./EndSimulationModal";

describe("EndSimulationModal", () => {
  it("splits realDateRange into Start and End dates", () => {
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: 100, trades: 5, winRate: 60, returnPercent: 1.0, bestTrade: 50, worstTrade: -10, avgDurationSeconds: 120, profitFactor: 2.5, longTrades: 3, shortTrades: 2, maxConsecutiveWins: 2, maxConsecutiveLosses: 1 }}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("01/01/2020")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByText("01/06/2020")).toBeInTheDocument();
  });

  it("positive P&L renders with '+' and crypto-long class", () => {
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: 100, trades: 5, winRate: 60, returnPercent: 1.0, bestTrade: 50, worstTrade: -10, avgDurationSeconds: 120, profitFactor: 2.5, longTrades: 3, shortTrades: 2, maxConsecutiveWins: 2, maxConsecutiveLosses: 1 }}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    const pnlEl = screen.getByText("+$100.00");
    expect(pnlEl).toBeInTheDocument();
    expect(pnlEl.className).toContain("text-crypto-long");
  });

  it("negative P&L renders without '+' and with crypto-short class", () => {
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: -50, trades: 3, winRate: 33, returnPercent: -0.5, bestTrade: 20, worstTrade: -30, avgDurationSeconds: 90, profitFactor: 0.5, longTrades: 2, shortTrades: 1, maxConsecutiveWins: 1, maxConsecutiveLosses: 2 }}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    // Negative P&L renders as "$-50.00" (no leading +, $ prefix before negative number)
    const pnlEl = screen.getByText("$-50.00");
    expect(pnlEl).toBeInTheDocument();
    expect(pnlEl.className).toContain("text-crypto-short");
  });

  it("Back calls onClose, New Session calls onNewSession", () => {
    const onClose = vi.fn();
    const onNewSession = vi.fn();
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: 0, trades: 0, winRate: 0, returnPercent: 0, bestTrade: 0, worstTrade: 0, avgDurationSeconds: 0, profitFactor: 0, longTrades: 0, shortTrades: 0, maxConsecutiveWins: 0, maxConsecutiveLosses: 0 }}
        onClose={onClose}
        onNewSession={onNewSession}
      />
    );

    fireEvent.click(screen.getByText("Back"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("New Session"));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("renders performance metrics when trades > 0", () => {
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: 100, trades: 5, winRate: 60, returnPercent: 1.0, bestTrade: 50, worstTrade: -10, avgDurationSeconds: 125, profitFactor: 2.5, longTrades: 3, shortTrades: 2, maxConsecutiveWins: 2, maxConsecutiveLosses: 1 }}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
    expect(screen.getByText("Best Trade")).toBeInTheDocument();
    expect(screen.getByText("Worst Trade")).toBeInTheDocument();
    expect(screen.getByText("Avg Duration")).toBeInTheDocument();
    expect(screen.getByText("Profit Factor")).toBeInTheDocument();
    expect(screen.getByText("Long / Short")).toBeInTheDocument();
    expect(screen.getByText("Max Streak")).toBeInTheDocument();
    expect(screen.getByText("+$50.00")).toBeInTheDocument();
    expect(screen.getByText("$-10.00")).toBeInTheDocument();
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
    expect(screen.getByText("2.50")).toBeInTheDocument();
    expect(screen.getByText("3 / 2")).toBeInTheDocument();
    expect(screen.getByText("2W")).toBeInTheDocument();
    expect(screen.getByText("1L")).toBeInTheDocument();
  });

  it("hides performance metrics when trades = 0", () => {
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: 0, trades: 0, winRate: 0, returnPercent: 0, bestTrade: 0, worstTrade: 0, avgDurationSeconds: 0, profitFactor: 0, longTrades: 0, shortTrades: 0, maxConsecutiveWins: 0, maxConsecutiveLosses: 0 }}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    expect(screen.queryByText("Performance Metrics")).not.toBeInTheDocument();
  });

  it("renders infinity symbol for infinite profit factor", () => {
    render(
      <EndSimulationModal
        realDateRange="01/01/2020 → 01/06/2020"
        elapsedTime="00:05:03"
        simulatedHistoricalTime="5h"
        stats={{ pnl: 100, trades: 2, winRate: 100, returnPercent: 1.0, bestTrade: 50, worstTrade: 0, avgDurationSeconds: 60, profitFactor: Infinity, longTrades: 2, shortTrades: 0, maxConsecutiveWins: 2, maxConsecutiveLosses: 0 }}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText("∞")).toBeInTheDocument();
  });
});
