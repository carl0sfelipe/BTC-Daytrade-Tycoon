import type { Trade, OrderHistoryItem } from "@/store/tradingStore";

export interface EventLogItem {
  id: string;
  type:
    | "tp"
    | "sl"
    | "liquidation"
    | "trailing_stop"
    | "manual"
    | "limit_fill"
    | "market_fill"
    | "order_canceled";
  side: "long" | "short";
  label: string;
  price: number;
  pnl?: number;
  time: string;
  size: number;
  leverage: number;
}

/**
 * Maps a Trade closure into an EventLogItem.
 */
export function tradeToEventLogItem(trade: Trade, index: number): EventLogItem {
  const labels: Record<Trade["reason"], string> = {
    manual: "Closed Manually",
    tp: "Take Profit",
    sl: "Stop Loss",
    liquidation: "Liquidated",
    trailing_stop: "Trailing Stop",
  };

  return {
    id: `trade-${index}`,
    type: trade.reason,
    side: trade.side,
    label: labels[trade.reason],
    price: trade.exitPrice,
    pnl: trade.pnl,
    time: trade.exitTime,
    size: trade.size,
    leverage: trade.leverage,
  };
}

/**
 * Maps an OrderHistoryItem into an EventLogItem (filled or canceled only).
 * Returns null for pending orders since they haven't happened yet.
 */
export function orderToEventLogItem(
  order: OrderHistoryItem,
  index: number
): EventLogItem | null {
  if (order.status === "pending") return null;

  if (order.status === "canceled") {
    return {
      id: `order-${index}`,
      type: "order_canceled",
      side: order.side,
      label: "Order Canceled",
      price: order.price,
      time: order.updatedAt ?? order.createdAt,
      size: order.size,
      leverage: order.leverage,
    };
  }

  // filled
  const isLimit = order.type === "limit";
  const isMarket = order.type === "market";

  let type: EventLogItem["type"] = "market_fill";
  let label = "Market Order Filled";

  if (isLimit) {
    type = "limit_fill";
    label = "Limit Order Filled";
  } else if (order.type === "tp") {
    type = "tp";
    label = "Take Profit";
  } else if (order.type === "sl") {
    type = "sl";
    label = "Stop Loss";
  }

  return {
    id: `order-${index}`,
    type,
    side: order.side,
    label,
    price: order.executionPrice ?? order.price,
    time: order.updatedAt ?? order.createdAt,
    size: order.size,
    leverage: order.leverage,
  };
}

/**
 * Builds a unified event log from closed trades and order history.
 * Most recent events first.
 */
export function buildEventLog(
  closedTrades: Trade[],
  ordersHistory: OrderHistoryItem[]
): EventLogItem[] {
  const tradeEvents = closedTrades.map(tradeToEventLogItem);
  const orderEvents = ordersHistory
    .map(orderToEventLogItem)
    .filter((e): e is EventLogItem => e !== null);

  // Interleave by original array order (both arrays grow chronologically).
  // We reverse so most recent comes first.
  const combined: EventLogItem[] = [];
  let t = tradeEvents.length - 1;
  let o = orderEvents.length - 1;

  while (t >= 0 || o >= 0) {
    if (t < 0) {
      combined.push(orderEvents[o--]!);
    } else if (o < 0) {
      combined.push(tradeEvents[t--]!);
    } else {
      // Heuristic: prefer trade events when both at same index depth
      // since trades represent position closures which are "bigger" events.
      combined.push(tradeEvents[t--]!);
      if (o >= 0) combined.push(orderEvents[o--]!);
    }
  }

  return combined;
}
