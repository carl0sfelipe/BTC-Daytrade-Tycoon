/**
 * Pure session loading logic for the timewarp engine.
 *
 * Extracted from useTimewarpEngine to keep the hook thin and testable.
 */

import {
  fetchCurrentPrice,
  fetchCandles,
  normalizeCandlesToBasePrice,
  type SimulatedCandle,
  type BinanceCandle,
} from "@/lib/binance-api";
import { useTradingStore } from "@/store/tradingStore";
import { DIFFICULTY_PRESETS } from "@/lib/difficulty";
import { randomDate } from "./time-formatters";

export const HISTORY_OFFSET_CANDLES = 30;

export interface SessionLoadResult {
  basePrice: number;
  startDate: Date;
  originalStartDate: Date;
  historicalCandles: BinanceCandle[];
  simulated: SimulatedCandle[];
  initialPrice: number;
  initialTimeSec: number;
}

export interface LoadSessionCallbacks {
  setLoadingMessage: (msg: string) => void;
  setError: (msg: string | null) => void;
}

/**
 * Loads a new simulation session:
 * 1. Fetches current BTC price (base price)
 * 2. Draws a random historical date
 * 3. Fetches ~2000 1-minute candles from Binance
 * 4. Normalizes candles to the current base price
 * 5. Applies history offset (first 30 candles pre-consumed)
 *
 * @example
 * const result = await loadSession({ setLoadingMessage: console.log, setError: console.error });
 * if (!result) { // error handled by callbacks }
 */
export async function loadSession(
  callbacks: LoadSessionCallbacks
): Promise<SessionLoadResult | null> {
  const { setLoadingMessage, setError } = callbacks;
  setError(null);

  try {
    setLoadingMessage("Fetching current BTC price...");
    const basePrice = await fetchCurrentPrice();

    setLoadingMessage("Drawing historical scenario...");
    const originalStartDate = randomDate();

    setLoadingMessage("Downloading historical data from Binance...");
    const historicalCandles = await fetchCandles(originalStartDate);

    if (historicalCandles.length === 0) {
      throw new Error("No data returned by Binance");
    }

    setLoadingMessage("Preparing simulation...");
    const simulated = normalizeCandlesToBasePrice(historicalCandles, basePrice);

    const offsetIdx = Math.min(HISTORY_OFFSET_CANDLES, simulated.length - 1);
    const startDate = new Date(simulated[offsetIdx].time * 1000);

    const initialPrice = simulated[offsetIdx].open;
    const initialTimeSec = simulated[offsetIdx].time;

    resetStore();
    useTradingStore.setState({
      price: initialPrice,
      currentPrice: initialPrice,
      priceHistory: simulated
        .slice(0, Math.min(50, simulated.length))
        .map((c) => c.close),
    });

    return {
      basePrice,
      startDate,
      originalStartDate,
      historicalCandles,
      simulated,
      initialPrice,
      initialTimeSec,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    setError(msg);
    return null;
  }
}

function resetStore() {
  const { difficulty } = useTradingStore.getState();
  const preset = DIFFICULTY_PRESETS[difficulty];
  useTradingStore.setState({
    price: 0,
    currentPrice: 0,
    volatility: 1.5,
    marketTrend: "neutral",
    priceHistory: [],
    wallet: preset.wallet,
    startingWallet: preset.wallet,
    closedTrades: [],
    realizedPnL: 0,
    reduceOnly: true,
    position: null,
    isLoading: false,
    isLiquidated: false,
    simulationRealDate: null,
    pendingOrders: [],
    ordersHistory: [],
    lastCloseReason: null,
  });
}
