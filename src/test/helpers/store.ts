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
  maxDrawdown: 0,
  peakUnrealizedPnl: 0,
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
  difficulty: "normal" as const,
  maxLeverage: 50,
  startingWallet: 10000,
};

export function resetStore() {
  const actions = useTradingStore.getState();
  const fullState = { ...initialStoreState } as Record<string, unknown>;
  const actionsRecord = actions as unknown as Record<string, unknown>;
  for (const k of Object.keys(actionsRecord)) {
    if (typeof actionsRecord[k] === "function") {
      fullState[k] = actionsRecord[k];
    }
  }
  useTradingStore.setState(fullState, true);
}

export function openLong5k() {
  useTradingStore.setState({
    wallet: 10000,
    position: {
      side: "long",
      entry: 50000,
      size: 5000,
      leverage: 10,
      tpPrice: null,
      slPrice: null,
      trailingStopPercent: null,
      trailingStopPrice: null,
      liquidationPrice: 45000,
      entryTime: "2026-05-04T12:00:00Z",
      entryTimestamp: 0,
      realizedPnL: 0,
      maxDrawdown: 0,
      peakUnrealizedPnl: 0,
    },
    currentPrice: 50000,
    skipHighLeverageWarning: true,
    pendingOrders: [],
    closedTrades: [],
  });
}
