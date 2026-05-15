"use client";

import { useEffect, useRef } from "react";
import { LineStyle, type ISeriesApi, type IPriceLine } from "lightweight-charts";
import type { Position } from "@/store/tradingStore";
import { calcBreakevenPrice } from "@/lib/chart";

const POSITION_LINE_COLORS = {
  entry: "#e0e0e0",
  breakeven: "#555566",
  liquidation: "#ff4757",
  takeProfit: "#00d4a8",
  stopLoss: "#ff6b35",
} as const;

/**
 * Creates and removes price-line overlays for an open position.
 *
 * Lines: Entry, Breakeven, Liquidation, TP (optional), SL (optional).
 */
export function usePositionOverlays(
  series: ISeriesApi<"Candlestick"> | null,
  position: Position | null
) {
  const entryLineRef = useRef<IPriceLine | null>(null);
  const breakevenLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const liqPriceLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!series) return;

    // Remove all existing position lines
    for (const ref of [
      entryLineRef,
      breakevenLineRef,
      tpLineRef,
      slLineRef,
      liqPriceLineRef,
    ]) {
      if (ref.current) {
        series.removePriceLine(ref.current);
        ref.current = null;
      }
    }

    if (!position) return;

    entryLineRef.current = series.createPriceLine({
      price: position.entry,
      color: POSITION_LINE_COLORS.entry,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "Entry",
    });

    const breakevenPrice = calcBreakevenPrice({
      side: position.side,
      entry: position.entry,
    });

    breakevenLineRef.current = series.createPriceLine({
      price: breakevenPrice,
      color: POSITION_LINE_COLORS.breakeven,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "B/E",
    });

    liqPriceLineRef.current = series.createPriceLine({
      price: position.liquidationPrice,
      color: POSITION_LINE_COLORS.liquidation,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "LIQ",
    });

    if (position.tpPrice) {
      tpLineRef.current = series.createPriceLine({
        price: position.tpPrice,
        color: POSITION_LINE_COLORS.takeProfit,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    if (position.slPrice) {
      slLineRef.current = series.createPriceLine({
        price: position.slPrice,
        color: POSITION_LINE_COLORS.stopLoss,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    }
  }, [series, position]);
}
