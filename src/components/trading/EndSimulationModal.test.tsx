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
        stats={{ pnl: 100, trades: 5, winRate: 60, returnPercent: 1.0 }}
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
        stats={{ pnl: 100, trades: 5, winRate: 60, returnPercent: 1.0 }}
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
        stats={{ pnl: -50, trades: 3, winRate: 33, returnPercent: -0.5 }}
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
        stats={{ pnl: 0, trades: 0, winRate: 0, returnPercent: 0 }}
        onClose={onClose}
        onNewSession={onNewSession}
      />
    );

    fireEvent.click(screen.getByText("Back"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("New Session"));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });
});
