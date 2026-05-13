"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCandles,
  normalizeCandlesToBasePrice,
  type SimulatedCandle,
} from "@/lib/binance-api";
import { useTradingStore } from "@/store/tradingStore";
import {
  formatRealDate,
} from "@/lib/engine/time-formatters";
import { loadSession } from "@/lib/engine/session-loader";
import { processTick, detectLiquidation } from "@/lib/engine/tick-processor";
import { tickEventLog, resetTickEventLog } from "@/lib/engine/tick-events";
import { useE2EHelpers } from "@/hooks/engine/useE2EHelpers";
import { logger } from "@/lib/logger";
import type { BinanceCandle } from "@/lib/binance-api";
import { createWallClock } from "@/lib/sentinel";
import type { VirtualClock } from "@/lib/sentinel";

const TICK_MS = 100;

export interface UseTimewarpEngineReturn {
  isLoading: boolean;
  loadingMessage: string;
  isPlaying: boolean;
  elapsedTime: string;
  candles: SimulatedCandle[];
  currentPrice: number;
  currentTimeSec: number;
  error: string | null;
  realDateRange: string;
  simulatedHistoricalTime: string;
  clock: VirtualClock;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useTimewarpEngine(): UseTimewarpEngineReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [candles, setCandles] = useState<SimulatedCandle[]>([]);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [simulatedHistoricalTime, setSimulatedHistoricalTime] = useState("0m");
  const [error, setError] = useState<string | null>(null);

  const historicalCandlesRef = useRef<BinanceCandle[]>([]);
  const startDateRef = useRef<Date | null>(null);
  const originalStartDateRef = useRef<Date | null>(null);
  const clockRef = useRef<VirtualClock>(createWallClock());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const candlesRef = useRef<SimulatedCandle[]>([]);
  const isPlayingRef = useRef(false);
  const isFetchingMoreRef = useRef(false);
  const hasLiquidatedRef = useRef(false);
  const mountedRef = useRef(true);
  const startSimulationRef = useRef<(() => void) | null>(null);

  const storeAddPriceHistory = useTradingStore((s) => s.addPriceHistory);
  const storeCheckPosition = useTradingStore((s) => s.checkPosition);
  const storeCheckPendingOrders = useTradingStore((s) => s.checkPendingOrders);

  useEffect(() => { candlesRef.current = candles; }, [candles]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const clearTickInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const appendMoreCandles = useCallback(async () => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;

    try {
      const lastHist = historicalCandlesRef.current[historicalCandlesRef.current.length - 1];
      if (!lastHist) return;

      const nextStart = new Date(lastHist.closeTime + 1);
      const newHistorical = await fetchCandles(nextStart);

      if (newHistorical.length === 0) {
        logger.log("[useTimewarpEngine] appendMoreCandles — no more data");
        setIsPlaying(false);
        clearTickInterval();
        setError("No more historical data available for this period.");
        return;
      }

      logger.log(`[useTimewarpEngine] appendMoreCandles — +${newHistorical.length} candles`);

      historicalCandlesRef.current = [...historicalCandlesRef.current, ...newHistorical];
      const basePrice = candlesRef.current[0]?.open ?? 0;
      const newSimulated = normalizeCandlesToBasePrice(newHistorical, basePrice);
      const updated = [...candlesRef.current, ...newSimulated];
      setCandles(updated);
      candlesRef.current = updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch more data");
    } finally {
      isFetchingMoreRef.current = false;
    }
  }, [clearTickInterval]);

  const doLoad = useCallback(async () => {
    logger.log("[useTimewarpEngine] loadSession starting...");
    setIsLoading(true);
    const result = await loadSession({
      setLoadingMessage,
      setError,
    });

    if (result) {
      logger.log(`[useTimewarpEngine] loadSession complete — ${result.simulated.length} candles, start=${result.originalStartDate.toISOString()}`);
      historicalCandlesRef.current = result.historicalCandles;
      startDateRef.current = result.startDate;
      originalStartDateRef.current = result.originalStartDate;
      setCandles(result.simulated);
      candlesRef.current = result.simulated;
      setCurrentPrice(result.initialPrice);
      setCurrentTimeSec(result.initialTimeSec);
      setElapsedTime("00:00:00");
      setIsLoading(false);
      setLoadingMessage("");

      autoStartTimeoutRef.current = setTimeout(() => {
        if (candlesRef.current.length > 0 && mountedRef.current) {
          startSimulationRef.current?.();
        }
      }, 500);
    } else {
      logger.log("[useTimewarpEngine] loadSession failed");
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, []);

  const tick = useCallback(() => {
    try {
      const tickResult = processTick({
        startDate: startDateRef.current,
        currentCandles: candlesRef.current,
        clock: clockRef.current,
      });

      if ("error" in tickResult) return;

      if (tickResult.shouldFetchMore && !isFetchingMoreRef.current) {
        appendMoreCandles();
      }

      setElapsedTime(tickResult.elapsedTime);
      setCurrentTimeSec(tickResult.currentTimeSec);
      setSimulatedHistoricalTime(tickResult.simulatedHistoricalTime);
      setCurrentPrice(tickResult.price);

      useTradingStore.setState({
        price: tickResult.price,
        currentPrice: tickResult.price,
        marketTrend: tickResult.marketTrend,
        volatility: tickResult.volatility,
      });

      storeAddPriceHistory(tickResult.price);

      const pendingBefore = useTradingStore.getState().pendingOrders.length;
      storeCheckPendingOrders(tickResult.price, tickResult.candleLow, tickResult.candleHigh);
      const pendingAfter = useTradingStore.getState().pendingOrders.length;

      if (hasLiquidatedRef.current) return;
      const checkResult = storeCheckPosition(tickResult.price, tickResult.candleLow, tickResult.candleHigh);

      const checks: Array<import("@/lib/engine/tick-events").TickCheck> = [];

      if (pendingBefore !== pendingAfter) {
        checks.push({ type: "pending_orders", triggered: true, details: { before: pendingBefore, after: pendingAfter } });
      }

      if (checkResult.closed && checkResult.reason && checkResult.reason !== "manual") {
        checks.push({ type: checkResult.reason, triggered: true });
      }

      tickEventLog.push({
        simulatedTimeSec: tickResult.currentTimeSec,
        price: tickResult.price,
        candleLow: tickResult.candleLow,
        candleHigh: tickResult.candleHigh,
        checks,
      });

      const liq = detectLiquidation({
        checkResult,
        originalStartDate: originalStartDateRef.current,
        currentCandles: candlesRef.current,
      });

      if (liq.liquidationDetected) {
        hasLiquidatedRef.current = true;
        useTradingStore.setState({
          simulationRealDate: liq.simulationRealDate,
          isLiquidated: true,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Simulation error";
      logger.error("[useTimewarpEngine] tick error:", msg);
      setIsPlaying(false);
      isPlayingRef.current = false;
      clearTickInterval();
      setError(msg);
    }
  }, [storeAddPriceHistory, storeCheckPosition, storeCheckPendingOrders, appendMoreCandles, clearTickInterval]);

  const startSimulation = useCallback(() => {
    logger.log("[useTimewarpEngine] startSimulation");
    clearTickInterval();
    clockRef.current = createWallClock();
    setIsPlaying(true);
    isPlayingRef.current = true;
    intervalRef.current = setInterval(tick, TICK_MS);
  }, [tick, clearTickInterval]);

  useEffect(() => {
    startSimulationRef.current = startSimulation;
  }, [startSimulation]);

  const pause = useCallback(() => {
    logger.log("[useTimewarpEngine] pause");
    setIsPlaying(false);
    isPlayingRef.current = false;
    clearTickInterval();
  }, [clearTickInterval]);

  const start = useCallback(() => {
    logger.log("[useTimewarpEngine] resume");
    if (!isPlayingRef.current && candlesRef.current.length > 0) {
      if (elapsedTime !== "00:00:00") {
        const [h, m, s] = elapsedTime.split(":").map(Number);
        const elapsedSec = h * 3600 + m * 60 + s;
        clockRef.current = createWallClock();
        clockRef.current.advance(-elapsedSec * 1000);
      } else {
        clockRef.current = createWallClock();
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
      intervalRef.current = setInterval(tick, TICK_MS);
    }
  }, [tick, elapsedTime]);

  const reset = useCallback(() => {
    logger.log("[useTimewarpEngine] reset");
    hasLiquidatedRef.current = false;
    resetTickEventLog();
    pause();
    doLoad();
  }, [pause, doLoad]);

  useEffect(() => {
    mountedRef.current = true;
    hasLiquidatedRef.current = false;
    doLoad();
    return () => {
      mountedRef.current = false;
      clearTickInterval();
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    };
  }, [doLoad, clearTickInterval]);

  useE2EHelpers({ pause, start, reset });

  const realDateRange = originalStartDateRef.current
    ? `${formatRealDate(originalStartDateRef.current)} → ${formatRealDate(new Date(currentTimeSec * 1000))}`
    : "";

  return {
    isLoading,
    loadingMessage,
    isPlaying,
    elapsedTime,
    candles,
    currentPrice,
    currentTimeSec,
    error,
    realDateRange,
    simulatedHistoricalTime,
    clock: clockRef.current,
    start,
    pause,
    reset,
  };
}

export type ReturnTypeUseTimewarpEngine = ReturnType<typeof useTimewarpEngine>;
