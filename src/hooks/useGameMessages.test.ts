import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { enGameMessages } from "@/lib/i18n/messages/en";
import { ptBrGameMessages } from "@/lib/i18n/messages/pt-br";
import { useGameMessages } from "./useGameMessages";

describe("useGameMessages", () => {
  beforeEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("defaults to the English catalog without any provider or setup", () => {
    const { result } = renderHook(() => useGameMessages());
    expect(result.current).toBe(enGameMessages);
  });

  it("re-renders with the Portuguese catalog after setGameLocale", () => {
    const { result } = renderHook(() => useGameMessages());

    act(() => {
      useTradingStore.getState().setGameLocale("pt-BR");
    });

    expect(useTradingStore.getState().gameLocale).toBe("pt-BR");
    expect(result.current).toBe(ptBrGameMessages);
  });
});
