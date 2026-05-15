import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TradingStore } from "./types";
import { createMarketSlice } from "./slices/marketSlice";
import { createSessionSlice } from "./slices/sessionSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createUISlice } from "./slices/uiSlice";
import { createOrdersSlice } from "./slices/ordersSlice";
import { createPositionSlice } from "./slices/positionSlice";

export type {
  Trade,
  Position,
  PendingOrder,
  OrderHistoryItem,
} from "./types";

// Safari iOS private mode throws on localStorage access instead of returning null
const safeLocalStorage = {
  getItem: (name: string) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); } catch { /* noop */ }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch { /* noop */ }
  },
};

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get, store) => ({
      ...createMarketSlice(set, get, store),
      ...createSessionSlice(set, get, store),
      ...createHistorySlice(set, get, store),
      ...createUISlice(set, get, store),
      ...createOrdersSlice(set, get, store),
      ...createPositionSlice(set, get, store),
    }),
    {
      name: "trading-storage",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      migrate: (persistedState: unknown) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return {} as TradingStore;
        }
        const s = persistedState as Partial<TradingStore>;
        // Clear stale transient state that should never persist across sessions
        return {
          ...s,
          position: null,
          pendingOrders: [],
          isLiquidated: false,
          lastCloseReason: null,
          simulationRealDate: null,
          isLoading: false,
          lastActionError: null,
        } as TradingStore;
      },
      partialize: (state) => ({
        wallet: state.wallet,
        hasSeenOnboarding: state.hasSeenOnboarding,
        skipHighLeverageWarning: state.skipHighLeverageWarning,
        reduceOnly: state.reduceOnly,
        closedTrades: state.closedTrades,
        realizedPnL: state.realizedPnL,
        ordersHistory: state.ordersHistory,
        difficulty: state.difficulty,
        maxLeverage: state.maxLeverage,
        startingWallet: state.startingWallet,
      }),
    }
  )
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __tradingStore?: typeof useTradingStore }).__tradingStore = useTradingStore;
}
