"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";

export interface MeasureToolState {
  measureMode: boolean;
  setMeasureMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  measureAnchor: number | null;
  measureCurrent: number | null;
}

/**
 * Manages the chart measure tool state and listeners.
 *
 * First click sets the anchor, second click resets.
 * Crosshair move updates the current price while in measure mode.
 */
export function useMeasureTool(
  chart: IChartApi | null,
  series: ISeriesApi<"Candlestick"> | null
): MeasureToolState {
  const [measureMode, setMeasureMode] = useState(false);
  const [measureAnchor, setMeasureAnchor] = useState<number | null>(null);
  const [measureCurrent, setMeasureCurrent] = useState<number | null>(null);

  const measureModeRef = useRef(false);
  const measureAnchorRef = useRef<number | null>(null);

  // Keep refs in sync with state so chart listeners see latest values
  useEffect(() => {
    measureModeRef.current = measureMode;

    if (!measureMode) {
      measureAnchorRef.current = null;
      setMeasureAnchor(null);
      setMeasureCurrent(null);
    }
  }, [measureMode]);

  // Subscribe to chart interactions for measure tool
  useEffect(() => {
    if (!chart || !series) return;

    const handleCrosshairMove = (param: {
      point?: { y: number } | null;
    }) => {
      if (!measureModeRef.current || !param.point) return;

      const price = series.coordinateToPrice(param.point.y);
      if (price !== null) setMeasureCurrent(price);
    };

    const handleClick = (param: { point?: { y: number } | null }) => {
      if (!measureModeRef.current || !param.point) return;

      const price = series.coordinateToPrice(param.point.y);
      if (price === null) return;

      if (measureAnchorRef.current === null) {
        measureAnchorRef.current = price;
        setMeasureAnchor(price);
        return;
      }

      // Second click: reset
      measureAnchorRef.current = null;
      setMeasureAnchor(null);
      setMeasureCurrent(null);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
    };
  }, [chart, series]);

  return { measureMode, setMeasureMode, measureAnchor, measureCurrent };
}
