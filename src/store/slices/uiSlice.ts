import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";

export interface UISlice {
  isLoading: boolean;
  lastCloseReason: string | null;
  isLiquidated: boolean;
  simulationRealDate: string | null;
  lastActionError: string | null;
  setLiquidated: (date: string) => void;
  clearLiquidated: () => void;
  clearLastActionError: () => void;
}

export const createUISlice: StateCreator<TradingStore, [], [], UISlice> = (set) => ({
  isLoading: false,
  lastCloseReason: null,
  isLiquidated: false,
  simulationRealDate: null,
  lastActionError: null,
  setLiquidated: (date) => set({ isLiquidated: true, simulationRealDate: date }),
  clearLiquidated: () =>
    set({ isLiquidated: false, simulationRealDate: null }),
  clearLastActionError: () => set({ lastActionError: null }),
});
