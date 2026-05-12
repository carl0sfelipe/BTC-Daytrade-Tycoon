import type { Trade, Position, OrderHistoryItem, PendingOrder } from "@/store/types";
import { formatTimestamp, generateId, calcLiquidationPrice } from "@/lib/trading";

const MAX_CLOSED_TRADES = 500;
const MAX_ORDERS_HISTORY = 500;

export interface ClosePositionPatch {
  wallet: number;
  position: null;
  closedTrades: Trade[];
  ordersHistory: OrderHistoryItem[];
  realizedPnL: number;
  pendingOrders: PendingOrder[];
  isLiquidated: boolean;
  lastCloseReason: string | null;
}

export function computeClosePosition(
  wallet: number,
  position: Position,
  currentPrice: number,
  reason: Trade["reason"],
  closedTrades: Trade[],
  ordersHistory: OrderHistoryItem[],
  realizedPnL: number,
  pendingOrders: PendingOrder[],
  simulationRealDate: string | null
): ClosePositionPatch {
  const { side, entry, size, leverage } = position;
  const priceDiff = side === "long" ? currentPrice - entry : entry - currentPrice;
  const pnl = (priceDiff / entry) * size;
  const priorRealized = position.realizedPnL || 0;
  const totalPnl = pnl + priorRealized;
  const margin = size / leverage;
  const newWallet = Math.max(0, wallet + margin + pnl);
  const now = formatTimestamp();

  const toCancel = pendingOrders.filter(
    (o) => o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss")
  );

  let newPendingOrders = pendingOrders;
  let newOrdersHistory = ordersHistory;

  if (toCancel.length > 0) {
    newPendingOrders = pendingOrders.filter(
      (o) => !(o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss"))
    );
    newOrdersHistory = ordersHistory.map((o) =>
      toCancel.some((c) => c.id === o.id)
        ? { ...o, status: "canceled" as const, updatedAt: now }
        : o
    );
  }

  const durationSeconds = Math.floor((Date.now() - position.entryTimestamp) / 1000);
  const trade: Trade = {
    pnl: totalPnl,
    side,
    reason,
    entryPrice: entry,
    exitPrice: currentPrice,
    size,
    leverage,
    margin,
    entryTime: position.entryTime || now,
    exitTime: now,
    durationSeconds,
  };

  const closeHistoryItem: OrderHistoryItem = {
    id: generateId(),
    side: side === "long" ? "short" : "long",
    type: "market",
    status: "filled",
    leverage,
    size,
    price: currentPrice,
    tpPrice: null,
    slPrice: null,
    createdAt: now,
    executionPrice: null,
    updatedAt: now,
  };

  const lastCloseReason =
    reason === "tp"
      ? "Take Profit hit!"
      : reason === "sl"
      ? "Stop Loss hit!"
      : reason === "liquidation"
      ? "Position liquidated!"
      : null;

  return {
    wallet: newWallet,
    position: null,
    closedTrades: [...closedTrades, trade].slice(-MAX_CLOSED_TRADES),
    ordersHistory: [...newOrdersHistory, closeHistoryItem].slice(-MAX_ORDERS_HISTORY),
    realizedPnL: realizedPnL + pnl,
    pendingOrders: newPendingOrders,
    isLiquidated: reason === "liquidation" ? !!simulationRealDate : false,
    lastCloseReason,
  };
}

export interface HedgeFlipPatch {
  wallet: number;
  position: Position;
  closedTrades: Trade[];
  realizedPnL: number;
  ordersHistory: OrderHistoryItem[];
  lastCloseReason: null;
}

export function computeHedgeFlip(
  wallet: number,
  existing: Position,
  entryPrice: number,
  newSide: "long" | "short",
  newLeverage: number,
  newSize: number,
  tpPrice: number | null,
  slPrice: number | null,
  closedTrades: Trade[],
  realizedPnL: number,
  ordersHistory: OrderHistoryItem[],
  limitPrice: string | null
): HedgeFlipPatch {
  const priceDiff = existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice;
  const closePnl = (priceDiff / existing.entry) * existing.size;
  const totalRealized = existing.realizedPnL + closePnl;
  const returnedMargin = existing.size / existing.leverage;
  const excessSize = newSize - existing.size;
  const excessMargin = excessSize / newLeverage;
  const now = formatTimestamp();
  const durationSeconds = Math.floor((Date.now() - existing.entryTimestamp) / 1000);

  const trade: Trade = {
    pnl: totalRealized,
    side: existing.side,
    reason: "manual",
    entryPrice: existing.entry,
    exitPrice: entryPrice,
    size: existing.size,
    leverage: existing.leverage,
    margin: returnedMargin,
    entryTime: existing.entryTime || now,
    exitTime: now,
    durationSeconds,
  };

  const newLiqPrice = calcLiquidationPrice(entryPrice, newLeverage, newSide);
  const flippedPosition: Position = {
    side: newSide,
    entry: entryPrice,
    size: excessSize,
    leverage: newLeverage,
    tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
    slPrice: slPrice && slPrice > 0 ? slPrice : null,
    trailingStopPercent: null,
    trailingStopPrice: null,
    liquidationPrice: newLiqPrice,
    entryTime: now,
    entryTimestamp: Date.now(),
    realizedPnL: 0,
  };

  const historyItem: OrderHistoryItem = {
    id: generateId(),
    side: newSide,
    type: limitPrice ? "limit" : "market",
    status: "filled",
    leverage: newLeverage,
    size: newSize,
    price: entryPrice,
    tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
    slPrice: slPrice && slPrice > 0 ? slPrice : null,
    createdAt: now,
    executionPrice: null,
    updatedAt: now,
  };

  return {
    wallet: wallet + returnedMargin + closePnl - excessMargin,
    position: flippedPosition,
    closedTrades: [...closedTrades, trade].slice(-MAX_CLOSED_TRADES),
    realizedPnL: realizedPnL + closePnl,
    ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
    lastCloseReason: null,
  };
}

export interface ReduceOrClosePatch {
  wallet: number;
  position: Position | null;
  ordersHistory: OrderHistoryItem[];
  closedTrades: Trade[];
  realizedPnL: number;
  lastCloseReason: null;
}

export function computeReduceOrClose(
  wallet: number,
  existing: Position,
  entryPrice: number,
  reducedSize: number,
  newSide: "long" | "short",
  newLeverage: number,
  ordersHistory: OrderHistoryItem[],
  closedTrades: Trade[],
  realizedPnL: number,
  limitPrice: string | null
): ReduceOrClosePatch {
  const priceDiff = existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice;
  const pnlPartial = (priceDiff / existing.entry) * reducedSize;
  const marginReturned = reducedSize / existing.leverage;
  const newSize = existing.size - reducedSize;
  const now = formatTimestamp();

  const historyItem: OrderHistoryItem = {
    id: generateId(),
    side: newSide,
    type: limitPrice ? "limit" : "market",
    status: "filled",
    leverage: existing.leverage,
    size: reducedSize,
    price: entryPrice,
    tpPrice: existing.tpPrice,
    slPrice: existing.slPrice,
    createdAt: now,
    executionPrice: null,
    updatedAt: now,
  };

  if (newSize <= 0) {
    const closePnl = (priceDiff / existing.entry) * existing.size;
    const totalRealized = existing.realizedPnL + closePnl;
    const margin = existing.size / existing.leverage;
    const durationSeconds = Math.floor((Date.now() - existing.entryTimestamp) / 1000);
    const trade: Trade = {
      pnl: totalRealized,
      side: existing.side,
      reason: "manual",
      entryPrice: existing.entry,
      exitPrice: entryPrice,
      size: existing.size,
      leverage: existing.leverage,
      margin,
      entryTime: existing.entryTime || now,
      exitTime: now,
      durationSeconds,
    };
    return {
      wallet: wallet + margin + closePnl,
      position: null,
      closedTrades: [...closedTrades, trade].slice(-MAX_CLOSED_TRADES),
      ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
      realizedPnL: realizedPnL + closePnl,
      lastCloseReason: null,
    };
  }

  return {
    wallet: wallet + marginReturned + pnlPartial,
    position: { ...existing, size: newSize, realizedPnL: existing.realizedPnL + pnlPartial },
    ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
    closedTrades,
    realizedPnL: realizedPnL + pnlPartial,
    lastCloseReason: null,
  };
}

export interface FreshOpenPatch {
  position: Position;
  wallet: number;
  ordersHistory: OrderHistoryItem[];
  lastCloseReason: null;
  isLiquidated: false;
}

export function computeFreshOpen(
  wallet: number,
  side: "long" | "short",
  entryPrice: number,
  size: number,
  leverage: number,
  tpPrice: number | null,
  slPrice: number | null,
  ordersHistory: OrderHistoryItem[],
  limitPrice: string | null
): FreshOpenPatch {
  const margin = size / leverage;
  const liqPrice = calcLiquidationPrice(entryPrice, leverage, side);
  const now = formatTimestamp();

  const newPosition: Position = {
    side,
    entry: entryPrice,
    size,
    leverage,
    tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
    slPrice: slPrice && slPrice > 0 ? slPrice : null,
    trailingStopPercent: null,
    trailingStopPrice: null,
    liquidationPrice: liqPrice,
    entryTime: now,
    entryTimestamp: Date.now(),
    realizedPnL: 0,
  };

  if (!limitPrice) {
    const historyItem: OrderHistoryItem = {
      id: generateId(),
      side,
      type: "market",
      status: "filled",
      leverage,
      size,
      price: entryPrice,
      tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
      slPrice: slPrice && slPrice > 0 ? slPrice : null,
      createdAt: now,
      executionPrice: null,
      updatedAt: now,
    };
    return {
      position: newPosition,
      wallet: wallet - margin,
      ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
      lastCloseReason: null,
      isLiquidated: false,
    };
  }

  return {
    position: newPosition,
    wallet: wallet - margin,
    ordersHistory,
    lastCloseReason: null,
    isLiquidated: false,
  };
}
