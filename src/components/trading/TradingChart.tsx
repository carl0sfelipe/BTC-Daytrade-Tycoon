"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";

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
  const priceLineRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const lastIdxRef = useRef(-1);

  // Inicializa o chart uma vez
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#111827" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: {
        visible: false,
        barSpacing: 6,
      },
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const priceLine = candleSeries.createPriceLine({
      price: 0,
      color: "#10b981",
      lineWidth: 2,
      lineStyle: 2,
      title: "Preço Atual",
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

  // Limpa quando candles mudam (nova sessão)
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData([]);
      lastIdxRef.current = -1;
    }
  }, [candles]);

  // Renderiza candles visíveis
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    // Encontra índice do candle atual
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

    // Constroi dados visíveis: todos até currentIdx, com o último em formação
    const visible = candles.slice(0, currentIdx + 1).map((c, i) => {
      const isLast = i === currentIdx;
      return {
        time: c.time as unknown as Time,
        open: c.open,
        high: isLast ? Math.max(c.open, currentPrice) : c.high,
        low: isLast ? Math.min(c.open, currentPrice) : c.low,
        close: isLast ? currentPrice : c.close,
      };
    });

    seriesRef.current.setData(visible);
    lastIdxRef.current = currentIdx;

    if (priceLineRef.current) {
      priceLineRef.current.applyOptions({ price: currentPrice });
    }

    // Scroll automático
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

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-400">Gráfico BTC/USDT</h2>
        <span className="text-xs text-gray-500">1M • Simulação</span>
      </div>
      <div ref={containerRef} style={{ height: "320px" }} />
    </div>
  );
}
