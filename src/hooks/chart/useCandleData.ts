"use client";

import { useEffect, useRef } from "react";
import type { ISeriesApi } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";
import {
  findCurrentCandleIndex,
  buildCandleUpdate,
  buildVisibleCandles,
} from "@/lib/chart";

/**
 * Updates the candlestick series with visible data and auto-scrolls the view.
 *
 * Uses update() when staying inside the same candle for performance,
 * otherwise rebuilds the visible slice with setData().
 */
export function useCandleData(
  series: ISeriesApi<"Candlestick"> | null,
  chart: IChartApi | null,
  candles: SimulatedCandle[],
  currentPrice: number,
  currentTimeSec: number
) {
  const lastIdxRef = useRef(-1);

  // Reset when candles change (new session)
  useEffect(() => {
    if (!series) return;

    series.setData([]);
    lastIdxRef.current = -1;

    if (chart) {
      chart.timeScale().fitContent();
    }
  }, [candles, series, chart]);

  // Render visible candles
  useEffect(() => {
    if (!series || candles.length === 0) return;

    const currentIdx = findCurrentCandleIndex(candles, currentTimeSec);
    const prevIdx = lastIdxRef.current;
    const sameCandle = currentIdx === prevIdx && prevIdx >= 0;

    if (sameCandle) {
      const update = buildCandleUpdate(candles[currentIdx], currentPrice);
      series.update(update);
    } else {
      const visible = buildVisibleCandles(candles, currentIdx, currentPrice);
      series.setData(visible);
    }

    lastIdxRef.current = currentIdx;

    // Auto scroll
    if (!chart) return;
    const ts = chart.timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range) return;

    const bars = range.to - range.from;
    const from = Math.max(0, currentIdx - bars * 0.7);
    ts.setVisibleLogicalRange({ from, to: from + bars });
  }, [candles, currentPrice, currentTimeSec, series, chart]);
}
