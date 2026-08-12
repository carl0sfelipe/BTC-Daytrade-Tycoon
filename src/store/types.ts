import type { MarketSlice } from "./slices/marketSlice";
import type { SessionSlice } from "./slices/sessionSlice";
import type { HistorySlice } from "./slices/historySlice";
import type { UISlice } from "./slices/uiSlice";
import type { OrdersSlice } from "./slices/ordersSlice";
import type { PositionSlice } from "./slices/positionSlice";
import type { CallsSlice } from "./slices/callsSlice";

export type TradingStore =
  MarketSlice &
  SessionSlice &
  HistorySlice &
  UISlice &
  OrdersSlice &
  PositionSlice &
  CallsSlice;

export type {
  Trade,
  Position,
  PendingOrder,
  OrderHistoryItem,
} from "./domain-types";
