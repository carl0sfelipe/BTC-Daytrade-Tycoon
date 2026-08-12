import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import MobileGameNav from "./MobileGameNav";

describe("MobileGameNav locale", () => {
  beforeEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("renders the English tab labels by default, with zero i18n setup", () => {
    render(<MobileGameNav />);
    for (const label of ["Inventory", "Missions", "Trade", "Ranking", "Shop"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the Portuguese tab labels when gameLocale is pt-BR", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    render(<MobileGameNav />);
    for (const label of ["Inventário", "Missões", "Trade", "Ranking", "Loja"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows the translated coming-soon sheet for the Shop tab in pt-BR", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    render(<MobileGameNav />);

    fireEvent.click(screen.getByText("Loja"));

    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(screen.getByText(/loja de sabotagens/i)).toBeInTheDocument();
  });
});
