import type {
  Trade,
  Position,
  OrderHistoryItem,
  PendingOrder,
} from "@/store/tradingStore";
import { calcLiquidationPrice } from "./pnl";
import { generateId, formatTimestamp } from "./utils";

export interface BuildTradeParams {
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  margin: number;
  pnl: number;
  reason: Trade["reason"];
  entryTime: string;
  durationSeconds: number;
}

/**
 * Builds a Trade record for a closed position.
 *
 * @example
 * buildTrade({ side: "long", entryPrice: 50000, exitPrice: 51000, size: 1000, leverage: 10, margin: 100, pnl: 200, reason: "manual", entryTime: "...", durationSeconds: 60 })
 */
export function buildTrade(params: BuildTradeParams): Trade {
  const now = formatTimestamp();

  return {
    pnl: params.pnl,
    side: params.side,
    reason: params.reason,
    entryPrice: params.entryPrice,
    exitPrice: params.exitPrice,
    size: params.size,
    leverage: params.leverage,
    margin: params.margin,
    entryTime: params.entryTime || now,
    exitTime: now,
    durationSeconds: params.durationSeconds,
  };
}

export interface BuildNewPositionParams {
  side: "long" | "short";
  entryPrice: number;
  size: number;
  leverage: number;
  tpPrice: number | null;
  slPrice: number | null;
}

/**
 * Builds a new Position object with calculated liquidation price.
 *
 * @example
 * buildNewPosition({ side: "long", entryPrice: 50000, size: 1000, leverage: 10, tpPrice: 55000, slPrice: 48000 })
 */
export function buildNewPosition(
  params: BuildNewPositionParams
): Position {
  const now = formatTimestamp();

  return {
    side: params.side,
    entry: params.entryPrice,
    size: params.size,
    leverage: params.leverage,
    tpPrice: params.tpPrice,
    slPrice: params.slPrice,
    trailingStopPercent: null,
    trailingStopPrice: null,
    liquidationPrice: calcLiquidationPrice(
      params.entryPrice,
      params.leverage,
      params.side
    ),
    entryTime: now,
    entryTimestamp: Date.now(),
    realizedPnL: 0,
  };
}

export interface BuildOrderHistoryItemParams {
  side: "long" | "short";
  type: OrderHistoryItem["type"];
  status: OrderHistoryItem["status"];
  leverage: number;
  size: number;
  price: number;
  tpPrice?: number | null;
  slPrice?: number | null;
  executionPrice?: number | null;
}

/**
 * Builds an OrderHistoryItem with consistent defaults.
 *
 * @example
 * buildOrderHistoryItem({ side: "long", type: "market", status: "filled", leverage: 10, size: 1000, price: 50000 })
 */
export function buildOrderHistoryItem(
  params: BuildOrderHistoryItemParams
): OrderHistoryItem {
  const now = formatTimestamp();

  return {
    id: generateId(),
    side: params.side,
    type: params.type,
    status: params.status,
    leverage: params.leverage,
    size: params.size,
    price: params.price,
    tpPrice: params.tpPrice ?? null,
    slPrice: params.slPrice ?? null,
    createdAt: now,
    executionPrice: params.executionPrice ?? null,
    updatedAt: params.status === "filled" || params.status === "canceled" ? now : null,
  };
}

export interface BuildPendingOrderParams {
  side: "long" | "short";
  orderType: PendingOrder["orderType"];
  leverage: number;
  size: number;
  limitPrice: number;
  tpPrice?: number | null;
  slPrice?: number | null;
}

/**
 * Builds a PendingOrder with generated ID and timestamp.
 */
export function buildPendingOrder(
  params: BuildPendingOrderParams
): PendingOrder {
  return {
    id: generateId(),
    side: params.side,
    orderType: params.orderType,
    leverage: params.leverage,
    size: params.size,
    tpPrice: params.tpPrice ?? null,
    slPrice: params.slPrice ?? null,
    limitPrice: params.limitPrice,
    orderPrice: null,
    createdAt: formatTimestamp(),
  };
}
