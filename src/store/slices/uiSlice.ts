import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";
import type { GameLocale } from "@/lib/i18n/game-locale";

export interface UISlice {
  isLoading: boolean;
  lastCloseReason: string | null;
  isLiquidated: boolean;
  simulationRealDate: string | null;
  lastActionError: string | null;
  /** UI language for game surfaces — EN default (Boss decision 2026-08-12). */
  gameLocale: GameLocale;
  setLiquidated: (date: string) => void;
  clearLiquidated: () => void;
  clearLastActionError: () => void;
  setGameLocale: (locale: GameLocale) => void;
}

export const createUISlice: StateCreator<TradingStore, [], [], UISlice> = (set) => ({
  isLoading: false,
  lastCloseReason: null,
  isLiquidated: false,
  simulationRealDate: null,
  lastActionError: null,
  gameLocale: "en",
  setLiquidated: (date) => set({ isLiquidated: true, simulationRealDate: date }),
  clearLiquidated: () =>
    set({ isLiquidated: false, simulationRealDate: null }),
  clearLastActionError: () => set({ lastActionError: null }),
  setGameLocale: (locale) => set({ gameLocale: locale }),
});
