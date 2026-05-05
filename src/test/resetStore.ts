import { useTradingStore } from "@/store/tradingStore";

export const initialStoreState = {
  price: 45000,
  currentPrice: 45000,
  volatility: 1.5,
  marketTrend: "bull" as const,
  priceHistory: Array.from({ length: 50 }, () => 45000),
  wallet: 10000,
  closedTrades: [],
  realizedPnL: 0,
  position: null,
  pendingOrders: [],
  ordersHistory: [],
  isLoading: false,
  lastCloseReason: null,
  isLiquidated: false,
  simulationRealDate: null,
  hasSeenOnboarding: false,
  skipHighLeverageWarning: false,
  reduceOnly: true,
};

export function resetStore() {
  const actions = useTradingStore.getState();
  const fullState = { ...initialStoreState } as Record<string, unknown>;
  for (const k of Object.keys(actions)) {
    if (typeof (actions as Record<string, unknown>)[k] === "function") {
      fullState[k] = (actions as Record<string, unknown>)[k];
    }
  }
  useTradingStore.setState(fullState, true);
}
