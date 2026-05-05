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
  realizedPnL: 0,
  ...overrides,
});

export const makePendingOrder = (overrides: Partial<PendingOrder> = {}): PendingOrder => ({
  id: "order-1",
  side: "long",
  leverage: 10,
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
  tpPrice: null,
  slPrice: null,
  createdAt: "01/01/2024 00:00:00",
  updatedAt: "01/01/2024 00:00:00",
  ...overrides,
});
