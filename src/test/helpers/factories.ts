import type { Position, PendingOrder, Trade, OrderHistoryItem } from "@/store/tradingStore";

export const makePosition = (overrides: Partial<Position> = {}): Position => ({
  side: "long",
  entry: 50000,
  size: 1000,
  leverage: 10,
  tpPrice: null,
  slPrice: null,
  trailingStopPercent: null,
  trailingStopPrice: null,
  liquidationPrice: 45000,
  entryTime: "01/01/2024 00:00:00",
  entryTimestamp: Date.now(),
  realizedPnL: 0,
  maxDrawdown: 0,
  peakUnrealizedPnl: 0,
  ...overrides,
});

export const makePendingOrder = (overrides: Partial<PendingOrder> = {}): PendingOrder => ({
  id: "order-1",
  side: "long",
  orderType: "open",
  leverage: 10,
  orderPrice: null,
  size: 1000,
  tpPrice: null,
  slPrice: null,
  limitPrice: 48000,
  createdAt: "01/01/2024 00:00:00",
  ...overrides,
});

export const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  pnl: 0,
  side: "long",
  reason: "manual",
  entryPrice: 50000,
  exitPrice: 50000,
  size: 1000,
  leverage: 10,
  margin: 100,
  entryTime: "01/01/2024 00:00:00",
  exitTime: "01/01/2024 01:00:00",
  durationSeconds: 3600,
  ...overrides,
});

export const makeOrderHistoryItem = (overrides: Partial<OrderHistoryItem> = {}): OrderHistoryItem => ({
  id: "hist-1",
  side: "long",
  type: "market",
  status: "filled",
  leverage: 10,
  size: 1000,
  price: 50000,
  executionPrice: null,
  tpPrice: null,
  slPrice: null,
  createdAt: "01/01/2024 00:00:00",
  updatedAt: "01/01/2024 00:00:00",
  ...overrides,
});

// liquidationPrice for cross-margin: entry ± entry/leverage (simplified)
const calcLiq = (side: "long" | "short", entry: number, leverage: number) =>
  side === "long" ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage);

export const makePositionInProfit = (
  side: "long" | "short",
  size: number,
  entry: number,
  leverage = 10
): Position =>
  makePosition({ side, entry, size, leverage, liquidationPrice: calcLiq(side, entry, leverage) });

export const makePositionInLoss = (
  side: "long" | "short",
  size: number,
  entry: number,
  leverage = 10
): Position =>
  makePosition({ side, entry, size, leverage, liquidationPrice: calcLiq(side, entry, leverage) });

type StorePositionOpts = {
  side: "long" | "short";
  entry: number;
  size: number;
  leverage: number;
  currentPrice: number;
  wallet?: number;
  skipHighLeverageWarning?: boolean;
};

export const makeStoreWithPosition = (opts: StorePositionOpts) => ({
  wallet: opts.wallet ?? opts.size / opts.leverage,
  currentPrice: opts.currentPrice,
  skipHighLeverageWarning: opts.skipHighLeverageWarning ?? true,
  position: makePosition({
    side: opts.side,
    entry: opts.entry,
    size: opts.size,
    leverage: opts.leverage,
    liquidationPrice: calcLiq(opts.side, opts.entry, opts.leverage),
  }),
});
