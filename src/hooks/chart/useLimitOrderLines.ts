"use client";

import { useEffect, useRef } from "react";
import { LineStyle, type ISeriesApi, type IPriceLine } from "lightweight-charts";
import type { PendingOrder } from "@/store/tradingStore";

const LIMIT_ORDER_LINE_COLOR = "#ffd700";

/**
 * Creates and removes price-line overlays for pending limit orders.
 *
 * Only "open" limit orders get a line. TP/SL orders are handled by
 * usePositionOverlays once the position is open.
 */
export function useLimitOrderLines(
  series: ISeriesApi<"Candlestick"> | null,
  pendingOrders: PendingOrder[]
) {
  const limitOrderLineRefs = useRef<IPriceLine[]>([]);

  useEffect(() => {
    if (!series) return;

    // Remove old limit lines
    for (const line of limitOrderLineRefs.current) {
      series.removePriceLine(line);
    }
    limitOrderLineRefs.current = [];

    const openOrders = pendingOrders.filter((o) => o.orderType === "open");

    limitOrderLineRefs.current = openOrders.map((order) =>
      series.createPriceLine({
        price: order.limitPrice,
        color: LIMIT_ORDER_LINE_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.LargeDashed,
        axisLabelVisible: true,
        title: `LIMIT ${order.side.toUpperCase()}`,
      })
    );
  }, [series, pendingOrders]);
}
