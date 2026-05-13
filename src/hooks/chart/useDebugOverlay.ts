"use client";

import { useEffect, useRef } from "react";
import { LineStyle, type ISeriesApi, type IPriceLine } from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";

const DEBUG_COLORS = {
  low: "#3b82f6", // blue
  high: "#f59e0b", // amber
} as const;

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Dev-only overlay showing the current candle's wick range.
 *
 * Adds faint price lines for candle low / high so developers can visually
 * verify why liquidation, TP, SL, or limit orders triggered on a wick.
 *
 * Only renders in development builds.
 */
export function useDebugOverlay(
  series: ISeriesApi<"Candlestick"> | null,
  candles: SimulatedCandle[],
  currentTimeSec: number
) {
  const lowLineRef = useRef<IPriceLine | null>(null);
  const highLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!IS_DEV || !series) return;

    // Clean up previous lines
    if (lowLineRef.current) {
      series.removePriceLine(lowLineRef.current);
      lowLineRef.current = null;
    }
    if (highLineRef.current) {
      series.removePriceLine(highLineRef.current);
      highLineRef.current = null;
    }

    const currentCandle = candles.find(
      (c) => currentTimeSec >= c.time && currentTimeSec < c.time + 60
    );
    if (!currentCandle) return;

    lowLineRef.current = series.createPriceLine({
      price: currentCandle.low,
      color: DEBUG_COLORS.low,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: `WICK LOW`,
    });

    highLineRef.current = series.createPriceLine({
      price: currentCandle.high,
      color: DEBUG_COLORS.high,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: `WICK HIGH`,
    });

    return () => {
      if (lowLineRef.current) {
        series.removePriceLine(lowLineRef.current);
        lowLineRef.current = null;
      }
      if (highLineRef.current) {
        series.removePriceLine(highLineRef.current);
        highLineRef.current = null;
      }
    };
  }, [series, candles, currentTimeSec]);
}
