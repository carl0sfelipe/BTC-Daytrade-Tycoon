import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import EndSimulationModal from "./EndSimulationModal";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, resetStore } from "@/test/helpers";

const neutralStats = {
  pnl: 250,
  trades: 4,
  winRate: 50,
  returnPercent: 2.5,
  bestTrade: 300,
  worstTrade: -120,
  avgDurationSeconds: 90,
  profitFactor: 1.8,
  longTrades: 3,
  shortTrades: 1,
  maxConsecutiveWins: 2,
  maxConsecutiveLosses: 1,
  currentStreak: 1,
  maxDrawdown: 5,
  traderScore: 61,
};

describe("EndSimulationModal pt-BR", () => {
  beforeEach(() => {
    resetStore();
    useTradingStore.setState({ gameLocale: "pt-BR" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("renders the session summary in Portuguese", () => {
    renderWithSentinel(
      <EndSimulationModal
        realDateRange="2024-01-01 → 2024-01-02"
        elapsedTime="10m"
        simulatedHistoricalTime="1d"
        stats={neutralStats}
        onClose={vi.fn()}
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText("Simulação Encerrada")).toBeInTheDocument();
    expect(screen.getByText("Métricas de Performance")).toBeInTheDocument();
    expect(screen.getByText("Período Histórico Real")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova Sessão" })).toBeInTheDocument();
  });
});
