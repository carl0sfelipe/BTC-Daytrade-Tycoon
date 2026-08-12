import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { useTradingStore } from "@/store/tradingStore";
import { resetStore } from "@/test/helpers";

/**
 * The slice injects the player's locale into the validators
 * (localeValidationMessages), so validation toasts must follow gameLocale.
 */
describe("positionSlice validation locale wiring", () => {
  beforeEach(() => {
    resetStore();
    useTradingStore.setState({ currentPrice: 50000, skipHighLeverageWarning: true });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("surfaces pt-BR TP validation errors when gameLocale is pt-BR", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    useTradingStore.getState().openPosition("long", 10, 1000, "45000", "", "");

    expect(useTradingStore.getState().lastActionError).toBe(
      "TP inválido: para LONG o Take Profit deve ficar ACIMA da entrada ($50000.00). Informe um valor > $50000.00."
    );
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("surfaces the original English TP error in the default locale", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "45000", "", "");

    expect(useTradingStore.getState().lastActionError).toBe(
      "Invalid TP: for LONG the Take Profit must be ABOVE entry ($50000.00). Enter a value > $50000.00."
    );
  });

  it("localizes the same-side guard message", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", "");
    expect(useTradingStore.getState().position).not.toBeNull();

    useTradingStore.getState().openPosition("long", 10, 1000, "", "", "");
    expect(useTradingStore.getState().lastActionError).toBe(
      "Feche sua posição long existente primeiro"
    );
  });
});
