import type { Trade, Position, OrderHistoryItem } from "@/store/types";
import { formatTimestamp, generateId, calcLiquidationPrice } from "@/lib/trading";

const MAX_CLOSED_TRADES = 500;
const MAX_ORDERS_HISTORY = 500;

export interface PartialReducePatch {
  wallet: number;
  position: Position | null;
  ordersHistory: OrderHistoryItem[];
  closedTrades: Trade[];
  realizedPnL: number;
}

export function computePartialReduce(
  wallet: number,
  position: Position,
  reducedSize: number,
  price: number,
  ordersHistory: OrderHistoryItem[],
  closedTrades: Trade[],
  realizedPnL: number,
  orderSide?: "long" | "short"
): PartialReducePatch {
  const { side, entry, size, leverage } = position;
  const marginPerUnit = 1 / leverage;
  const priceDiff = side === "long" ? price - entry : entry - price;
  const pnlPartial = (priceDiff / entry) * reducedSize;
  const marginReturned = reducedSize * marginPerUnit;
  const now = formatTimestamp();

  const historyItem: OrderHistoryItem = {
    id: generateId(),
    side: orderSide ?? side,
    type: "market",
    status: "filled",
    leverage,
    size: reducedSize,
    price,
    tpPrice: position.tpPrice,
    slPrice: position.slPrice,
    createdAt: now,
    executionPrice: null,
    updatedAt: now,
  };

  if (reducedSize >= size) {
    const totalPnl = (priceDiff / entry) * size;
    const margin = size * marginPerUnit;
    const totalRealized = position.realizedPnL + totalPnl;
    const durationSeconds = Math.floor((Date.now() - position.entryTimestamp) / 1000);
    const trade: Trade = {
      pnl: totalRealized,
      side,
      reason: "manual",
      entryPrice: entry,
      exitPrice: price,
      size,
      leverage,
      margin,
      entryTime: position.entryTime || now,
      exitTime: now,
      durationSeconds,
    };
    return {
      wallet: wallet + margin + totalPnl,
      position: null,
      ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
      closedTrades: [...closedTrades, trade].slice(-MAX_CLOSED_TRADES),
      realizedPnL: realizedPnL + totalPnl,
    };
  }

  return {
    wallet: wallet + marginReturned + pnlPartial,
    position: { ...position, size: size - reducedSize, realizedPnL: position.realizedPnL + pnlPartial },
    ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
    closedTrades,
    realizedPnL: realizedPnL + pnlPartial,
  };
}

export interface AddToPositionPatch {
  wallet: number;
  position: Position;
}

export function computeAddToPosition(
  wallet: number,
  position: Position,
  additionalSize: number,
  price: number,
  tpPrice: number | null,
  slPrice: number | null
): AddToPositionPatch {
  const { side, entry, size, leverage } = position;
  const margin = additionalSize / leverage;
  const newSize = size + additionalSize;
  const newEntry = (size * entry + additionalSize * price) / newSize;
  const newLiqPrice = calcLiquidationPrice(newEntry, leverage, side);

  return {
    wallet: wallet - margin,
    position: {
      ...position,
      entry: newEntry,
      size: newSize,
      tpPrice: tpPrice && tpPrice > 0 ? tpPrice : position.tpPrice,
      slPrice: slPrice && slPrice > 0 ? slPrice : position.slPrice,
      liquidationPrice: newLiqPrice,
      realizedPnL: position.realizedPnL,
    },
  };
}

export interface SizeIncreasePatch {
  wallet: number;
  position: Position;
  ordersHistory: OrderHistoryItem[];
}

export function computeSizeIncrease(
  wallet: number,
  position: Position,
  newSize: number,
  price: number,
  ordersHistory: OrderHistoryItem[],
  orderSide?: "long" | "short"
): SizeIncreasePatch {
  const { side, entry, size, leverage } = position;
  const marginPerUnit = 1 / leverage;
  const oldMargin = size * marginPerUnit;
  const newMargin = newSize * marginPerUnit;
  const additionalSize = newSize - size;
  const newEntry = (size * entry + additionalSize * price) / newSize;
  const newLiqPrice = calcLiquidationPrice(newEntry, leverage, side);
  const now = formatTimestamp();

  const historyItem: OrderHistoryItem = {
    id: generateId(),
    side: orderSide ?? side,
    type: "market",
    status: "filled",
    leverage,
    size: additionalSize,
    price,
    tpPrice: position.tpPrice,
    slPrice: position.slPrice,
    createdAt: now,
    executionPrice: null,
    updatedAt: now,
  };

  return {
    wallet: wallet - (newMargin - oldMargin),
    position: { ...position, entry: newEntry, size: newSize, liquidationPrice: newLiqPrice },
    ordersHistory: [...ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
  };
}
