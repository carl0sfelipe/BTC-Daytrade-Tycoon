/**
 * Pure tick processing logic for the timewarp game loop.
 */

import {
  interpolatePrice,
  getCurrentCandle,
  calculateTrend,
  calculateVolatility,
  type SimulatedCandle,
} from "@/lib/binance-api";
import { formatElapsedTime, formatDuration } from "./time-formatters";
import type { VirtualClock } from "@/lib/sentinel";

const SPEED_MULTIPLIER = 60;
const FETCH_AHEAD_MINUTES = 300;

export interface TickInput {
  startDate: Date | null;
  currentCandles: SimulatedCandle[];
  clock: VirtualClock;
}

export interface TickResult {
  price: number;
  candleLow: number;
  candleHigh: number;
  elapsedTime: string;
  simulatedHistoricalTime: string;
  currentTimeSec: number;
  marketTrend: "bull" | "bear" | "neutral";
  volatility: number;
  shouldFetchMore: boolean;
}

export interface TickErrorResult {
  error: string;
}

export type TickOutput = TickResult | TickErrorResult;

/**
 * Processes a single simulation tick.
 *
 * Computes time advancement, price interpolation, trend/volatility,
 * and flags when more data needs to be fetched.
 *
 * @example
 * const result = processTick({ startDate, currentCandles: candles, simulationStartRealTime: Date.now() });
 * if ("error" in result) { handleError(result.error); }
 */
export function processTick(input: TickInput): TickOutput {
  const { startDate, currentCandles, clock } = input;

  if (!currentCandles.length || !startDate) {
    return { error: "No candles or start date" };
  }

  const realElapsedMs = clock.now();
  const simulatedElapsedMs = realElapsedMs * SPEED_MULTIPLIER;
  const simulatedTimeMs = startDate.getTime() + simulatedElapsedMs;
  const simulatedTimeSec = Math.floor(simulatedTimeMs / 1000);

  const lastCandle = currentCandles[currentCandles.length - 1];
  const minutesRemaining = (lastCandle.time - simulatedTimeSec) / 60;
  const shouldFetchMore =
    minutesRemaining < FETCH_AHEAD_MINUTES / SPEED_MULTIPLIER;

  const totalSeconds = Math.floor(realElapsedMs / 1000);
  const elapsedTime = formatElapsedTime(totalSeconds);

  const historicalSeconds = simulatedTimeSec - Math.floor(startDate.getTime() / 1000);
  const simulatedHistoricalTime = formatDuration(Math.max(0, historicalSeconds / 60));

  const price = interpolatePrice(currentCandles, simulatedTimeSec);
  const currentCandle = getCurrentCandle(currentCandles, simulatedTimeSec);
  const candleLow = currentCandle?.low ?? price;
  const candleHigh = currentCandle?.high ?? price;
  const marketTrend = calculateTrend(currentCandles, price);
  const volatility = calculateVolatility(currentCandles);

  return {
    price,
    candleLow,
    candleHigh,
    elapsedTime,
    simulatedHistoricalTime,
    currentTimeSec: simulatedTimeSec,
    marketTrend,
    volatility,
    shouldFetchMore,
  };
}

export interface LiquidationCheckInput {
  checkResult: { closed: boolean; reason?: string };
  originalStartDate: Date | null;
  currentCandles: SimulatedCandle[];
}

export interface LiquidationCheckResult {
  liquidationDetected: boolean;
  simulationRealDate: string | null;
}

/**
 * Detects if a liquidation occurred during this tick.
 *
 * @example
 * const liq = detectLiquidation({ checkResult: { closed: true, reason: "liquidation" }, originalStartDate, currentCandles });
 */
export function detectLiquidation(
  input: LiquidationCheckInput
): LiquidationCheckResult {
  const { checkResult, originalStartDate, currentCandles } = input;

  if (checkResult.closed && checkResult.reason === "liquidation" && originalStartDate) {
    const endDate = new Date(
      originalStartDate.getTime() + (currentCandles.length - 1) * 60_000
    );
    const dateRange = `${formatRealDate(originalStartDate)} → ${formatRealDate(endDate)}`;
    return { liquidationDetected: true, simulationRealDate: dateRange };
  }
  return { liquidationDetected: false, simulationRealDate: null };
}

function formatRealDate(d: Date): string {
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
