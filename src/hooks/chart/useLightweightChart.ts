"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
} from "lightweight-charts";

export interface LightweightChartRefs {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  priceLine: IPriceLine | null;
}

/**
 * Initializes a lightweight-charts instance once per component lifetime.
 *
 * Returns imperative refs. The caller is responsible for cleanup timing.
 */
export function useLightweightChart(
  containerRef: React.RefObject<HTMLDivElement | null>
): LightweightChartRefs {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#15151f" },
        textColor: "#9999b3",
      },
      grid: {
        vertLines: { color: "#1e1e2d" },
        horzLines: { color: "#1e1e2d" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#26263a" },
      timeScale: {
        visible: false,
        barSpacing: 6,
      },
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00d4a8",
      downColor: "#ff4757",
      borderUpColor: "#00d4a8",
      borderDownColor: "#ff4757",
      wickUpColor: "#00d4a8",
      wickDownColor: "#ff4757",
    });

    const priceLine = candleSeries.createPriceLine({
      price: 0,
      color: "#7c5cff",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "CURRENT",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    priceLineRef.current = priceLine;

    return () => {
      chart.remove();
      initializedRef.current = false;
    };
  }, [containerRef]);

  return {
    chart: chartRef.current,
    series: seriesRef.current,
    priceLine: priceLineRef.current,
  };
}
