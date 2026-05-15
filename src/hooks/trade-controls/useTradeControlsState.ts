"use client";

import { useState } from "react";

export type TradeControlsMode = "simple" | "advanced";
export type TradeSide = "long" | "short";
export type OrderType = "market" | "limit";

export interface PendingTrade {
  side: TradeSide;
  leverage: number;
  size: number;
  tp: string;
  sl: string;
  limitPrice: string | null;
}

/**
 * Encapsulates all local UI state for the trade controls panel.
 */
export function useTradeControlsState() {
  const [mode, setMode] = useState<TradeControlsMode>("simple");
  const [side, setSide] = useState<TradeSide>("long");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [leverage, setLeverage] = useState(10);
  const [positionSize, setPositionSize] = useState(1000);
  // When set (0..1), positionSize is treated as "user wants X% of current
  // capacity" and is re-derived from sliderMax whenever capacity changes
  // (e.g., unrealized PnL ticks). When null, positionSize is an absolute
  // dollar amount and the slider position drifts as capacity changes.
  // Cleared automatically by manual-input or programmatic absolute setters
  // in TradeControls.
  const [sizeIntentPercent, setSizeIntentPercent] = useState<number | null>(null);
  const [limitPrice, setLimitPrice] = useState("");
  const [limitStep, setLimitStep] = useState(10);
  const [showStepSettings, setShowStepSettings] = useState(false);
  const [customStep, setCustomStep] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [tpOrderPrice, setTpOrderPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [slOrderPrice, setSlOrderPrice] = useState("");
  const [showTp, setShowTp] = useState(false);
  const [showSl, setShowSl] = useState(false);
  const [tpSlStep, setTpSlStep] = useState(100);
  const [showTpSlStep, setShowTpSlStep] = useState(false);
  const [trailingStopInput, setTrailingStopInput] = useState("");
  const [pendingTrade, setPendingTrade] = useState<PendingTrade | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  return {
    mode,
    setMode,
    side,
    setSide,
    orderType,
    setOrderType,
    leverage,
    setLeverage,
    positionSize,
    setPositionSize,
    sizeIntentPercent,
    setSizeIntentPercent,
    limitPrice,
    setLimitPrice,
    limitStep,
    setLimitStep,
    showStepSettings,
    setShowStepSettings,
    customStep,
    setCustomStep,
    tpPrice,
    setTpPrice,
    tpOrderPrice,
    setTpOrderPrice,
    slPrice,
    setSlPrice,
    slOrderPrice,
    setSlOrderPrice,
    showTp,
    setShowTp,
    showSl,
    setShowSl,
    tpSlStep,
    setTpSlStep,
    showTpSlStep,
    setShowTpSlStep,
    trailingStopInput,
    setTrailingStopInput,
    pendingTrade,
    setPendingTrade,
    showCalculator,
    setShowCalculator,
  };
}
