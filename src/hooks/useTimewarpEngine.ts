"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCurrentPrice,
  fetchCandles,
  interpolatePrice,
  calculateTrend,
  calculateVolatility,
  normalizeCandlesToBasePrice,
  type BinanceCandle,
  type SimulatedCandle,
} from "@/lib/binance-api";
import { useTradingStore } from "@/store/tradingStore";

const SPEED_MULTIPLIER = 60; // 1 real min = 1 simulated hour
const TICK_MS = 100; // updates every 100ms
const HISTORY_OFFSET_CANDLES = 30; // pre-loaded candles as visible history
const FETCH_AHEAD_MINUTES = 300; // fetch more data when < 5 hours remain

// Draw window: 12/01/2017 to 12/31/2025
const MIN_DATE = new Date("2017-12-01T00:00:00Z").getTime();
const MAX_DATE = new Date("2025-12-31T00:00:00Z").getTime();

function randomDate(): Date {
  const ts = MIN_DATE + Math.random() * (MAX_DATE - MIN_DATE);
  return new Date(ts);
}

function formatRealDate(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

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
  const simulationStartRealTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const candlesRef = useRef<SimulatedCandle[]>([]);
  const isPlayingRef = useRef(false);
  const isFetchingMoreRef = useRef(false);
  const basePriceRef = useRef<number>(0);

  const storeSetPrice = useTradingStore((s) => s.setPrice);
  const storeSetCurrentPrice = useTradingStore((s) => s.setCurrentPrice);
  const storeSetMarketTrend = useTradingStore((s) => s.setMarketTrend);
  const storeSetVolatility = useTradingStore((s) => s.setVolatility);
  const storeAddPriceHistory = useTradingStore((s) => s.addPriceHistory);
  const storeCheckPosition = useTradingStore((s) => s.checkPosition);
  const storeCheckPendingOrders = useTradingStore((s) => s.checkPendingOrders);

  // Keeps ref synchronized with state
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const resetStore = useCallback(() => {
    useTradingStore.setState({
      price: 0,
      currentPrice: 0,
      volatility: 1.5,
      marketTrend: "neutral",
      priceHistory: [],
      wallet: 10000,
      closedTrades: [],
      position: null,
      activePositions: [],
      isLoading: false,
      isLiquidated: false,
      simulationRealDate: null,
      pendingOrders: [],
      ordersHistory: [],
      lastCloseReason: null,
    });
  }, []);

  const appendMoreCandles = useCallback(async () => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;

    try {
      const lastHistCandle = historicalCandlesRef.current[historicalCandlesRef.current.length - 1];
      if (!lastHistCandle) return;

      const nextStart = new Date(lastHistCandle.closeTime + 1);
      const newHistorical = await fetchCandles(nextStart);

      if (newHistorical.length === 0) {
        // No more historical data available — pause and show error
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setError("No more historical data available for this period.");
        return;
      }

      // Append to historical ref
      historicalCandlesRef.current = [...historicalCandlesRef.current, ...newHistorical];

      // Normalize using the SAME base price so the chart stays continuous
      const basePrice = basePriceRef.current;
      const newSimulated = normalizeCandlesToBasePrice(newHistorical, basePrice);

      // Append to simulated candles
      const updated = [...candlesRef.current, ...newSimulated];
      setCandles(updated);
      candlesRef.current = updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch more data";
      setError(msg);
    } finally {
      isFetchingMoreRef.current = false;
    }
  }, []);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      setLoadingMessage("Fetching current BTC price...");
      const currentPrice = await fetchCurrentPrice();
      basePriceRef.current = currentPrice;

      setLoadingMessage("Drawing historical scenario...");
      const startDate = randomDate();
      startDateRef.current = startDate;
      originalStartDateRef.current = startDate;

      setLoadingMessage("Downloading historical data from Binance...");
      const historicalCandles = await fetchCandles(startDate);
      historicalCandlesRef.current = historicalCandles;

      if (historicalCandles.length === 0) {
        throw new Error("No data returned by Binance");
      }

      setLoadingMessage("Preparing simulation...");
      const simulated = normalizeCandlesToBasePrice(historicalCandles, currentPrice);
      setCandles(simulated);
      candlesRef.current = simulated;

      // Starts simulation with history already visible (offset candles already formed)
      const offsetIdx = Math.min(HISTORY_OFFSET_CANDLES, simulated.length - 1);
      const simStartDate = new Date(simulated[offsetIdx].time * 1000);
      startDateRef.current = simStartDate;

      const initialPrice = simulated[offsetIdx].open;
      setCurrentPrice(initialPrice);
      setCurrentTimeSec(simulated[offsetIdx].time);

      resetStore();
      useTradingStore.setState({
        price: initialPrice,
        currentPrice: initialPrice,
        priceHistory: simulated.slice(0, Math.min(50, simulated.length)).map((c) => c.close),
      });

      setElapsedTime("00:00:00");
      setLoadingMessage("");
      setIsLoading(false);

      // Auto-start (with delay for React to render the initial state)
      setTimeout(() => {
        if (candlesRef.current.length > 0) {
          startSimulation();
        }
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setLoadingMessage("");
      setIsLoading(false);
    }
  }, [resetStore]);

  const tick = useCallback(() => {
    const startDate = startDateRef.current;
    const currentCandles = candlesRef.current;
    if (!currentCandles.length || !startDate) return;

    const realElapsedMs = Date.now() - simulationStartRealTimeRef.current;
    const simulatedElapsedMs = realElapsedMs * SPEED_MULTIPLIER;
    const simulatedTimeMs = startDate.getTime() + simulatedElapsedMs;
    const simulatedTimeSec = Math.floor(simulatedTimeMs / 1000);

    const lastCandle = currentCandles[currentCandles.length - 1];

    // Check if we need to fetch more data (< 5 hours remaining)
    const minutesRemaining = (lastCandle.time - simulatedTimeSec) / 60;
    if (minutesRemaining < FETCH_AHEAD_MINUTES / SPEED_MULTIPLIER && !isFetchingMoreRef.current) {
      appendMoreCandles();
    }

    // Updates elapsed time
    const totalSeconds = Math.floor(realElapsedMs / 1000);
    setElapsedTime(formatElapsedTime(totalSeconds));
    setCurrentTimeSec(simulatedTimeSec);

    // Accumulated historical time covered (seconds of historical data simulated)
    const historicalSeconds = simulatedTimeSec - Math.floor(startDate.getTime() / 1000);
    setSimulatedHistoricalTime(formatDuration(Math.max(0, historicalSeconds / 60)));

    const price = interpolatePrice(currentCandles, simulatedTimeSec);
    const trend = calculateTrend(currentCandles, price);
    const volatility = calculateVolatility(currentCandles);
    setCurrentPrice(price);

    useTradingStore.setState({
      price,
      currentPrice: price,
      marketTrend: trend,
      volatility,
    });

    storeAddPriceHistory(price);

    // Checks pending limit orders
    storeCheckPendingOrders(price);

    // Checks liquidation / SL / TP
    const checkResult = storeCheckPosition(price);
    if (checkResult.closed && checkResult.reason === "liquidation" && originalStartDateRef.current) {
      const endDate = new Date(originalStartDateRef.current.getTime() + (candlesRef.current.length - 1) * 60_000);
      const dateRange = `${formatRealDate(originalStartDateRef.current)} → ${formatRealDate(endDate)}`;
      useTradingStore.setState({ simulationRealDate: dateRange, isLiquidated: true });
    }
  }, [storeAddPriceHistory, storeCheckPosition, appendMoreCandles]);

  const startSimulation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    simulationStartRealTimeRef.current = Date.now();
    setIsPlaying(true);
    isPlayingRef.current = true;
    intervalRef.current = setInterval(tick, TICK_MS);
  }, [tick]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!isPlayingRef.current && candlesRef.current.length > 0) {
      // Resume from where we paused
      if (elapsedTime !== "00:00:00") {
        const parts = elapsedTime.split(":").map(Number);
        const elapsedSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        simulationStartRealTimeRef.current = Date.now() - elapsedSec * 1000;
      } else {
        simulationStartRealTimeRef.current = Date.now();
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
      intervalRef.current = setInterval(tick, TICK_MS);
    }
  }, [elapsedTime, tick]);

  const reset = useCallback(() => {
    pause();
    loadSession();
  }, [pause, loadSession]);

  useEffect(() => {
    loadSession();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSession]);

  // Expose engine control for E2E tests
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__timewarpEngine = { pause, start, reset };
    }
  }, [pause, start, reset]);

  // realDateRange shows start → current simulated end date
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
    start,
    pause,
    reset,
  };
}

export type ReturnTypeUseTimewarpEngine = ReturnType<typeof useTimewarpEngine>;
