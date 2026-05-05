"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type IPriceLine,
} from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";
import { useTradingStore } from "@/store/tradingStore";
import { Maximize2 } from "lucide-react";

interface TradingChartProps {
  candles: SimulatedCandle[];
  currentPrice: number;
  currentTimeSec: number;
}

export default function TradingChart({
  candles,
  currentPrice,
  currentTimeSec,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const liqPriceLineRef = useRef<IPriceLine | null>(null);
  const initializedRef = useRef(false);
  const lastIdxRef = useRef(-1);

  const position = useTradingStore((s) => s.position);

  // Initialize chart once
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
      lineStyle: 2,
      title: "CURRENT",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    priceLineRef.current = priceLine;

    return () => {
      chart.remove();
      initializedRef.current = false;
      lastIdxRef.current = -1;
    };
  }, []);

  // Clear when candles change (new session)
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData([]);
      lastIdxRef.current = -1;
    }
    // Reset time scale to prevent huge gap from previous session's range
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // Render visible candles — optimized: setData only on new candle, update() for price changes
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    let currentIdx = 0;
    for (let i = 0; i < candles.length - 1; i++) {
      if (currentTimeSec >= candles[i].time && currentTimeSec < candles[i + 1].time) {
        currentIdx = i;
        break;
      }
    }
    if (currentTimeSec >= candles[candles.length - 1].time) {
      currentIdx = candles.length - 1;
    }

    const prevIdx = lastIdxRef.current;
    const sameCandle = currentIdx === prevIdx && prevIdx >= 0;

    if (sameCandle) {
      // Only current price changed — update last candle in-place
      const c = candles[currentIdx];
      seriesRef.current.update({
        time: c.time as Time,
        open: c.open,
        high: Math.max(c.open, currentPrice),
        low: Math.min(c.open, currentPrice),
        close: currentPrice,
      });
    } else {
      // New candle reached (or reset) — rebuild visible slice
      const visible = candles.slice(0, currentIdx + 1).map((c, i) => {
        const isLast = i === currentIdx;
        return {
          time: c.time as Time,
          open: c.open,
          high: isLast ? Math.max(c.open, currentPrice) : c.high,
          low: isLast ? Math.min(c.open, currentPrice) : c.low,
          close: isLast ? currentPrice : c.close,
        };
      });
      seriesRef.current.setData(visible);
    }

    lastIdxRef.current = currentIdx;

    if (priceLineRef.current) {
      priceLineRef.current.applyOptions({ price: currentPrice });
    }

    // Auto scroll
    if (chartRef.current) {
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (range) {
        const bars = range.to - range.from;
        const from = Math.max(0, currentIdx - bars * 0.7);
        ts.setVisibleLogicalRange({ from, to: from + bars });
      }
    }
  }, [currentPrice, currentTimeSec, candles]);

  // liquidation priceLine
  useEffect(() => {
    if (!seriesRef.current) return;
    if (liqPriceLineRef.current) {
      seriesRef.current.removePriceLine(liqPriceLineRef.current);
      liqPriceLineRef.current = null;
    }
    if (position) {
      liqPriceLineRef.current = seriesRef.current.createPriceLine({
        price: position.liquidationPrice,
        color: "#ff4757",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "LIQ",
      });
    }
  }, [position?.liquidationPrice, position?.side]);

  return (
    <div className="card-surface overflow-hidden flex flex-col">
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-crypto-text-secondary">BTC/USDT — 1M Simulation</span>
        </div>
        <button type="button" className="p-1.5 rounded hover:bg-crypto-surface-elevated text-crypto-text-muted hover:text-crypto-text">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={containerRef} style={{ height: "320px" }} />
    </div>
  );
}
