"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type IPriceLine,
} from "lightweight-charts";
import type { SimulatedCandle } from "@/lib/binance-api";
import { useTradingStore } from "@/store/tradingStore";
import { Maximize2, Ruler } from "lucide-react";

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
  // Position overlay lines
  const entryLineRef = useRef<IPriceLine | null>(null);
  const breakevenLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const liqPriceLineRef = useRef<IPriceLine | null>(null);
  // Limit order lines (array)
  const limitOrderLineRefs = useRef<IPriceLine[]>([]);

  const initializedRef = useRef(false);
  const lastIdxRef = useRef(-1);

  const position = useTradingStore((s) => s.position);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);

  // Measure tool state
  const [measureMode, setMeasureMode] = useState(false);
  const [measureAnchor, setMeasureAnchor] = useState<number | null>(null);
  const [measureCurrent, setMeasureCurrent] = useState<number | null>(null);
  const measureModeRef = useRef(false);
  const measureAnchorRef = useRef<number | null>(null);

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
      lineStyle: LineStyle.Dashed,
      title: "CURRENT",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    priceLineRef.current = priceLine;

    // Crosshair move — update measure current price
    chart.subscribeCrosshairMove((param) => {
      if (!measureModeRef.current || !param.point || !candleSeries) return;
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price !== null) setMeasureCurrent(price);
    });

    // Click — set measure anchor (first click) or reset (second click)
    chart.subscribeClick((param) => {
      if (!measureModeRef.current || !param.point || !candleSeries) return;
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price === null) return;
      if (measureAnchorRef.current === null) {
        measureAnchorRef.current = price;
        setMeasureAnchor(price);
      } else {
        // Second click: reset
        measureAnchorRef.current = null;
        setMeasureAnchor(null);
        setMeasureCurrent(null);
      }
    });

    return () => {
      chart.remove();
      initializedRef.current = false;
      lastIdxRef.current = -1;
    };
  }, []);

  // Keep measure refs in sync with state
  useEffect(() => {
    measureModeRef.current = measureMode;
    if (!measureMode) {
      measureAnchorRef.current = null;
      setMeasureAnchor(null);
      setMeasureCurrent(null);
    }
  }, [measureMode]);

  // Clear when candles change (new session)
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData([]);
      lastIdxRef.current = -1;
    }
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // Render visible candles
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
      const c = candles[currentIdx];
      seriesRef.current.update({
        time: c.time as Time,
        open: c.open,
        high: Math.max(c.open, currentPrice),
        low: Math.min(c.open, currentPrice),
        close: currentPrice,
      });
    } else {
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

  // Manage all position overlay lines in one effect
  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove all existing position lines
    for (const ref of [entryLineRef, breakevenLineRef, tpLineRef, slLineRef, liqPriceLineRef]) {
      if (ref.current) {
        seriesRef.current.removePriceLine(ref.current);
        ref.current = null;
      }
    }

    if (!position) return;

    // Entry line — white solid
    entryLineRef.current = seriesRef.current.createPriceLine({
      price: position.entry,
      color: "#e0e0e0",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "Entry",
    });

    // Breakeven (entry ± 0.06% taker fee round-trip)
    const feePct = 0.0006;
    const breakevenPrice =
      position.side === "long"
        ? position.entry * (1 + feePct)
        : position.entry * (1 - feePct);
    breakevenLineRef.current = seriesRef.current.createPriceLine({
      price: breakevenPrice,
      color: "#555566",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "B/E",
    });

    // Liquidation — bright red dashed
    liqPriceLineRef.current = seriesRef.current.createPriceLine({
      price: position.liquidationPrice,
      color: "#ff4757",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "LIQ",
    });

    // Take Profit — green dashed
    if (position.tpPrice) {
      tpLineRef.current = seriesRef.current.createPriceLine({
        price: position.tpPrice,
        color: "#00d4a8",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    // Stop Loss — orange-red dashed
    if (position.slPrice) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: position.slPrice,
        color: "#ff6b35",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    }
  }, [position]);

  // Manage pending limit order lines
  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove old limit lines
    for (const line of limitOrderLineRefs.current) {
      seriesRef.current.removePriceLine(line);
    }
    limitOrderLineRefs.current = [];

    // Create lines for "open" limit orders only
    const openOrders = pendingOrders.filter((o) => o.orderType === "open");
    limitOrderLineRefs.current = openOrders.map((order) => {
      return seriesRef.current!.createPriceLine({
        price: order.limitPrice,
        color: "#ffd700",
        lineWidth: 1,
        lineStyle: LineStyle.LargeDashed,
        axisLabelVisible: true,
        title: `LIMIT ${order.side.toUpperCase()}`,
      });
    });
  }, [pendingOrders]);

  // Compute floating PnL
  let floatingPnL: number | null = null;
  let floatingRoi: number | null = null;
  if (position && currentPrice > 0) {
    const priceDiff =
      position.side === "long"
        ? currentPrice - position.entry
        : position.entry - currentPrice;
    const unrealized = (priceDiff / position.entry) * position.size;
    floatingPnL = unrealized + (position.realizedPnL || 0);
    const margin = position.size / position.leverage;
    floatingRoi = margin > 0 ? (unrealized / margin) * 100 : 0;
  }

  // Measure display values
  const measureDelta =
    measureAnchor !== null && measureCurrent !== null
      ? Math.abs(measureCurrent - measureAnchor)
      : null;
  const measurePct =
    measureAnchor !== null && measureDelta !== null && measureAnchor > 0
      ? (measureDelta / measureAnchor) * 100
      : null;

  return (
    <div className="card-surface overflow-hidden flex flex-col relative">
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-crypto-text-secondary">
            BTC/USDT — 1M Simulation
          </span>
          {/* Hotkeys hint */}
          <span className="hidden md:inline text-[10px] text-crypto-text-muted">
            <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">B</kbd> Long{" "}
            <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">S</kbd> Short{" "}
            <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">C</kbd> Close{" "}
            <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">Space</kbd> Play/Pause
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Measure tool toggle */}
          <button
            type="button"
            onClick={() => setMeasureMode((m) => !m)}
            title="Measure tool (click two points on chart)"
            className={`p-1.5 rounded hover:bg-crypto-surface-elevated transition-colors ${
              measureMode
                ? "text-crypto-accent bg-crypto-accent-dim"
                : "text-crypto-text-muted hover:text-crypto-text"
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-crypto-surface-elevated text-crypto-text-muted hover:text-crypto-text"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Measure mode hint */}
      {measureMode && (
        <div className="px-4 py-1.5 bg-crypto-accent-dim border-b border-crypto-accent/20 text-[10px] text-crypto-accent">
          {measureAnchor === null
            ? "Click on the chart to set the first point"
            : "Click again to reset — move cursor to measure"}
        </div>
      )}

      <div className="relative">
        <div ref={containerRef} style={{ height: "320px" }} />

        {/* Floating PnL overlay */}
        {floatingPnL !== null && floatingRoi !== null && (
          <div
            className={`absolute top-2 left-3 px-2 py-1 rounded text-xs font-bold font-mono pointer-events-none z-10 ${
              floatingPnL >= 0
                ? "bg-crypto-long/20 text-crypto-long border border-crypto-long/20"
                : "bg-crypto-short/20 text-crypto-short border border-crypto-short/20"
            }`}
          >
            {floatingPnL >= 0 ? "+" : ""}
            {floatingPnL.toFixed(2)} ({floatingRoi >= 0 ? "+" : ""}
            {floatingRoi.toFixed(1)}%)
          </div>
        )}

        {/* Measure overlay */}
        {measureDelta !== null && measurePct !== null && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text pointer-events-none z-10 flex items-center gap-3">
            <span>Δ ${measureDelta.toFixed(2)}</span>
            <span className="text-crypto-text-muted">|</span>
            <span>Δ {measurePct.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
