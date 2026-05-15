import type { Position, PendingOrder } from "@/store/tradingStore";

export interface TradingSnapshot {
  wallet: number;
  position: Position | null;
  pendingOrders: PendingOrder[];
  closedTrades: readonly unknown[];
  ordersHistory: readonly unknown[];
}

export function assertWalletNonNegative(s: TradingSnapshot): string | null {
  if (!isFinite(s.wallet) || s.wallet < 0) {
    return `wallet must be >= 0, got ${s.wallet}`;
  }
  return null;
}

export function assertPositionConsistency(s: TradingSnapshot): string | null {
  if (s.position === null) return null;
  const p = s.position;
  if (p.size <= 0) return `position.size must be > 0, got ${p.size}`;
  if (p.leverage < 1) return `position.leverage must be >= 1, got ${p.leverage}`;
  if (!isFinite(p.liquidationPrice) || p.liquidationPrice < 0) {
    return `position.liquidationPrice must be finite and >= 0, got ${p.liquidationPrice}`;
  }
  if (p.side !== "long" && p.side !== "short") {
    return `position.side must be "long" or "short", got "${p.side}"`;
  }
  if (p.entry <= 0) return `position.entry must be > 0, got ${p.entry}`;
  return null;
}

// Checks directional correctness of liquidation price (independent of margin model).
// For a long: liq must be below entry. For a short: liq must be above entry.
export function assertLiquidationFormula(s: TradingSnapshot): string | null {
  if (!s.position) return null;
  const { side, entry, liquidationPrice } = s.position;
  if (side === "long" && liquidationPrice >= entry) {
    return `long liqPrice (${liquidationPrice}) must be < entry (${entry})`;
  }
  if (side === "short" && liquidationPrice <= entry) {
    return `short liqPrice (${liquidationPrice}) must be > entry (${entry})`;
  }
  return null;
}

export function assertPendingOrdersValid(s: TradingSnapshot): string | null {
  for (const order of s.pendingOrders) {
    if (order.size <= 0) {
      return `pendingOrder.size must be > 0, got ${order.size} (id=${order.id})`;
    }
    if (order.leverage < 1) {
      return `pendingOrder.leverage must be >= 1, got ${order.leverage} (id=${order.id})`;
    }
    if (!["open", "take_profit", "stop_loss"].includes(order.orderType)) {
      return `pendingOrder.orderType invalid: "${order.orderType}" (id=${order.id})`;
    }
    if (order.limitPrice <= 0) {
      return `pendingOrder.limitPrice must be > 0, got ${order.limitPrice} (id=${order.id})`;
    }
  }
  return null;
}

// A position with size === 0 should never exist; closePosition should null it out.
export function assertNoOrphanPosition(s: TradingSnapshot): string | null {
  if (s.position !== null && s.position.size === 0) {
    return `position exists with size=0 (orphan position)`;
  }
  return null;
}

// Histories should only grow or stay the same — never shrink.
export function assertHistoryMonotonic(
  before: TradingSnapshot,
  after: TradingSnapshot
): string | null {
  if (after.closedTrades.length < before.closedTrades.length) {
    return `closedTrades.length decreased from ${before.closedTrades.length} to ${after.closedTrades.length}`;
  }
  if (after.ordersHistory.length < before.ordersHistory.length) {
    return `ordersHistory.length decreased from ${before.ordersHistory.length} to ${after.ordersHistory.length}`;
  }
  return null;
}

export function assertAllInvariants(
  before: TradingSnapshot,
  after: TradingSnapshot
): string[] {
  return [
    assertWalletNonNegative(after),
    assertPositionConsistency(after),
    assertLiquidationFormula(after),
    assertPendingOrdersValid(after),
    assertNoOrphanPosition(after),
    assertHistoryMonotonic(before, after),
  ].filter((e): e is string => e !== null);
}
