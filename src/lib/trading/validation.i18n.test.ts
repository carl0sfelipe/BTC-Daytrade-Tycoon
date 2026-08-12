import { describe, expect, it } from "vitest";
import { ptBrGameMessages } from "@/lib/i18n/messages/pt-br";
import { validateOpenPosition, validateTpSl, validateTpSlCurrentPrice } from "./validation";

const ptValidation = ptBrGameMessages.tradingValidation;

describe("trading validation i18n", () => {
  it("emits pt-BR copy when the pt-BR catalog is injected (entry-relative)", () => {
    expect(validateTpSl("long", 50000, 45000, null, ptValidation)).toBe(
      "TP inválido: para LONG o Take Profit deve ficar ACIMA da entrada ($50000.00). Informe um valor > $50000.00."
    );
    expect(validateTpSl("short", 50000, null, 45000, ptValidation)).toBe(
      "SL inválido: para SHORT o Stop Loss deve ficar ACIMA da entrada ($50000.00). Informe um valor > $50000.00."
    );
  });

  it("emits pt-BR copy when the pt-BR catalog is injected (current-price)", () => {
    expect(validateTpSlCurrentPrice("long", 50000, 45000, null, ptValidation)).toBe(
      "TP inválido: para LONG o Take Profit deve ficar ACIMA do preço atual ($50000.00). Informe um valor > $50000.00."
    );
  });

  it("emits pt-BR copy for open-position guards", () => {
    expect(validateOpenPosition(50000, 5000, 10, 100, 500, ptValidation)).toBe(
      "Saldo insuficiente na carteira"
    );
    expect(validateOpenPosition(50000, 0, 10, 10000, 0, ptValidation)).toBe(
      "O tamanho da posição deve ser maior que 0"
    );
  });

  it("keeps the original English strings when no catalog is injected", () => {
    expect(validateTpSl("long", 50000, 45000, null)).toBe(
      "Invalid TP: for LONG the Take Profit must be ABOVE entry ($50000.00). Enter a value > $50000.00."
    );
    expect(validateOpenPosition(50000, 5000, 10, 100, 500)).toBe(
      "Insufficient wallet balance"
    );
  });
});
