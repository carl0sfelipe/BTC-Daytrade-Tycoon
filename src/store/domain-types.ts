export interface Trade {
  pnl: number;
  side: "long" | "short";
  reason: "manual" | "tp" | "sl" | "liquidation" | "trailing_stop";
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  margin: number;
  entryTime: string;
  exitTime: string;
  durationSeconds: number;
}

export interface PendingOrder {
  id: string;
  side: "long" | "short";
  orderType: "open" | "take_profit" | "stop_loss";
  leverage: number;
  size: number;
  tpPrice: number | null;
  slPrice: number | null;
  limitPrice: number;
  orderPrice: number | null;
  createdAt: string;
}

export interface OrderHistoryItem {
  id: string;
  side: "long" | "short";
  type: "market" | "limit" | "tp" | "sl";
  status: "pending" | "filled" | "canceled";
  leverage: number;
  size: number;
  price: number;
  executionPrice: number | null;
  tpPrice: number | null;
  slPrice: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Position {
  side: "long" | "short";
  entry: number;
  size: number;
  leverage: number;
  tpPrice: number | null;
  slPrice: number | null;
  trailingStopPercent: number | null;
  trailingStopPrice: number | null;
  liquidationPrice: number;
  entryTime: string;
  entryTimestamp: number;
  realizedPnL: number;
  maxDrawdown?: number;
  peakUnrealizedPnl?: number;
}
