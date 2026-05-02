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

const SPEED_MULTIPLIER = 60; // 1 min real = 1 hora simulada
const TICK_MS = 100; // atualiza a cada 100ms
const HISTORY_OFFSET_CANDLES = 30; // candles pré-carregados como histórico visível

// Janela de sorteio: 01/12/2017 a 31/12/2020
const MIN_DATE = new Date("2017-12-01T00:00:00Z").getTime();
const MAX_DATE = new Date("2020-12-31T00:00:00Z").getTime();

function randomDate(): Date {
  const ts = MIN_DATE + Math.random() * (MAX_DATE - MIN_DATE);
  return new Date(ts);
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export interface UseTimewarpEngineReturn {
  isLoading: boolean;
  loadingMessage: string;
  isPlaying: boolean;
  elapsedTime: string;
  progressPercent: number;
  candles: SimulatedCandle[];
  currentPrice: number;
  currentTimeSec: number;
  error: string | null;
  realDateRange: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useTimewarpEngine(): UseTimewarpEngineReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [progressPercent, setProgressPercent] = useState(0);
  const [candles, setCandles] = useState<SimulatedCandle[]>([]);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const historicalCandlesRef = useRef<BinanceCandle[]>([]);
  const startDateRef = useRef<Date | null>(null);
  const originalStartDateRef = useRef<Date | null>(null);
  const simulationStartRealTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const candlesRef = useRef<SimulatedCandle[]>([]);
  const isPlayingRef = useRef(false);

  const storeSetPrice = useTradingStore((s) => s.setPrice);
  const storeSetCurrentPrice = useTradingStore((s) => s.setCurrentPrice);
  const storeSetMarketTrend = useTradingStore((s) => s.setMarketTrend);
  const storeSetVolatility = useTradingStore((s) => s.setVolatility);
  const storeAddPriceHistory = useTradingStore((s) => s.addPriceHistory);
  const storeCheckPosition = useTradingStore((s) => s.checkPosition);

  // Mantém ref sincronizado com o state
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
    });
  }, []);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      setLoadingMessage("Buscando preço atual do BTC...");
      const currentPrice = await fetchCurrentPrice();

      setLoadingMessage("Sorteando cenário histórico...");
      const startDate = randomDate();
      startDateRef.current = startDate;
      originalStartDateRef.current = startDate;

      setLoadingMessage("Baixando dados históricos da Binance...");
      const historicalCandles = await fetchCandles(startDate);
      historicalCandlesRef.current = historicalCandles;

      if (historicalCandles.length === 0) {
        throw new Error("Nenhum dado retornado pela Binance");
      }

      setLoadingMessage("Preparando simulação...");
      const simulated = normalizeCandlesToBasePrice(historicalCandles, currentPrice);
      setCandles(simulated);
      candlesRef.current = simulated;

      // Começa a simulação com histórico já visível (offset candles já formados)
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
      setProgressPercent(0);
      setLoadingMessage("");
      setIsLoading(false);

      // Auto-start (com delay para React renderizar o estado inicial)
      setTimeout(() => {
        if (candlesRef.current.length > 0) {
          startSimulation();
        }
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
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
    const totalDuration = lastCandle.time - currentCandles[0].time;
    const elapsedInData = simulatedTimeSec - currentCandles[0].time;
    const progress = Math.min(100, Math.max(0, (elapsedInData / totalDuration) * 100));
    setProgressPercent(progress);

    // Atualiza tempo decorrido
    const totalSeconds = Math.floor(realElapsedMs / 1000);
    setElapsedTime(formatElapsedTime(totalSeconds));
    setCurrentTimeSec(simulatedTimeSec);

    if (simulatedTimeSec >= lastCandle.time) {
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

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

    // Verifica liquidação / SL / TP
    const checkResult = storeCheckPosition(price);
    if (checkResult.closed && checkResult.reason === "liquidation" && originalStartDateRef.current) {
      const endDate = new Date(originalStartDateRef.current.getTime() + (candlesRef.current.length - 1) * 60_000);
      const dateRange = `${originalStartDateRef.current.toLocaleDateString("pt-BR")} → ${endDate.toLocaleDateString("pt-BR")}`;
      useTradingStore.setState({ simulationRealDate: dateRange, isLiquidated: true });
    }
  }, [storeAddPriceHistory, storeCheckPosition]);

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

  const endDate = originalStartDateRef.current
    ? new Date(originalStartDateRef.current.getTime() + (candles.length - 1) * 60_000)
    : null;
  const realDateRange = originalStartDateRef.current && endDate
    ? `${originalStartDateRef.current.toLocaleDateString("pt-BR")} → ${endDate.toLocaleDateString("pt-BR")}`
    : "";

  return {
    isLoading,
    loadingMessage,
    isPlaying,
    elapsedTime,
    progressPercent,
    candles,
    currentPrice,
    currentTimeSec,
    error,
    realDateRange,
    start,
    pause,
    reset,
  };
}

export type ReturnTypeUseTimewarpEngine = ReturnType<typeof useTimewarpEngine>;
