import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";
import type { Trade } from "../types";

const MAX_CLOSED_TRADES = 500;

export interface HistorySlice {
  closedTrades: Trade[];
  realizedPnL: number;
  addClosedTrade: (trade: Trade) => void;
}

export const createHistorySlice: StateCreator<TradingStore, [], [], HistorySlice> =
  (set) => ({
    closedTrades: [],
    realizedPnL: 0,
    addClosedTrade: (trade) =>
      set((state) => ({
        closedTrades: [...state.closedTrades, trade].slice(-MAX_CLOSED_TRADES),
      })),
  });
