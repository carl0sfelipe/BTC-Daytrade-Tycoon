"use client";

import { useRef } from "react";
import type { SimulatedCandle } from "@/lib/binance-api";
import { useTradingStore } from "@/store/tradingStore";
import {
  useLightweightChart,
  useCandleData,
  usePositionOverlays,
  useLimitOrderLines,
  useMeasureTool,
  useCurrentPriceLine,
  useDebugOverlay,
} from "@/hooks/chart";
import ChartHeader from "./ChartHeader";
import ChartOverlays from "./ChartOverlays";

interface TradingChartProps {
  candles: SimulatedCandle[];
  currentPrice: number;
  currentTimeSec: number;
}

/**
 * Orchestrates the trading chart: candles, overlays, measure tool.
 *
 * All logic is delegated to specialized hooks and sub-components.
 * This component only wires props and renders the shell.
 */
export default function TradingChart({
  candles,
  currentPrice,
  currentTimeSec,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { chart, series, priceLine } = useLightweightChart(containerRef);
  const position = useTradingStore((s) => s.position);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);

  useCandleData(series, chart, candles, currentPrice, currentTimeSec);
  useCurrentPriceLine(priceLine, currentPrice);
  usePositionOverlays(series, position);
  useLimitOrderLines(series, pendingOrders);
  useDebugOverlay(series, candles, currentTimeSec);

  const { measureMode, setMeasureMode, measureAnchor, measureCurrent } =
    useMeasureTool(chart, series);

  return (
    <div className="card-surface overflow-hidden flex flex-col relative">
      <ChartHeader
        measureMode={measureMode}
        onToggleMeasure={() => setMeasureMode((m) => !m)}
      />

      {measureMode && (
        <div className="px-4 py-1.5 bg-crypto-accent-dim border-b border-crypto-accent/20 text-[10px] text-crypto-accent">
          {measureAnchor === null
            ? "Click on the chart to set the first point"
            : "Click again to reset — move cursor to measure"}
        </div>
      )}

      <div className="relative">
        <div ref={containerRef} style={{ height: "320px" }} />

        <ChartOverlays
          position={position}
          currentPrice={currentPrice}
          candles={candles}
          currentTimeSec={currentTimeSec}
          measureAnchor={measureAnchor}
          measureCurrent={measureCurrent}
        />
      </div>
    </div>
  );
}
