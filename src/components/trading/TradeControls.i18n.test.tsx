import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, resetStore } from "@/test/helpers";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls pt-BR", () => {
  beforeEach(() => {
    resetStore();
    useTradingStore.setState({
      currentPrice: 50000,
      skipHighLeverageWarning: true,
      gameLocale: "pt-BR",
    });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("renders the order form in Portuguese", () => {
    renderWithSentinel(<TradeControls />);

    expect(screen.getByText("Alavancagem")).toBeInTheDocument();
    expect(screen.getByText("Tamanho da Posição")).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getByText("Abrir Long")).toBeInTheDocument();
  });

  it("shows the Portuguese limit price input when limit is selected", () => {
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limite"));

    expect(screen.getByText("Preço Limite")).toBeInTheDocument();
    expect(screen.getByText("Criar Limite Long")).toBeInTheDocument();
  });
});
