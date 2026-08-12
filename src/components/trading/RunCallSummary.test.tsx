import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import RunCallSummary from "./RunCallSummary";

function resetSummaryStore(): void {
  useTradingStore.setState({ runCallLog: [], runRankAward: null });
}

describe("RunCallSummary run rank line", () => {
  beforeEach(resetSummaryStore);

  it("shows the standing and reward when the server awarded the run", () => {
    useTradingStore.setState({
      runRankAward: { rank: 2, totalRuns: 9, reward: 20, diamonds: 45 },
    });
    render(<RunCallSummary />);

    expect(screen.getByText("Run Rank")).toBeInTheDocument();
    expect(screen.getByText("#2 of 9 — last 24h")).toBeInTheDocument();
    expect(screen.getByText("+20 💎")).toBeInTheDocument();
  });

  it("hides the rank line for guests (no award recorded)", () => {
    render(<RunCallSummary />);
    expect(screen.queryByText("Run Rank")).not.toBeInTheDocument();
  });
});
