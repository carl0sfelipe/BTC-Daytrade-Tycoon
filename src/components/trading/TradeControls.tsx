"use client";

import { useState, useEffect, useRef } from "react";
import { Settings2, ChevronUp, ChevronDown, X, Calculator } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import { useToast } from "@/hooks/use-toast";
import ConfirmHighLeverageModal from "./ConfirmHighLeverageModal";
import PositionSizeCalculator from "./PositionSizeCalculator";

export default function TradeControls() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [leverage, setLeverage] = useState(10);
  const [positionSize, setPositionSize] = useState(1000);
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
  const [pendingTrade, setPendingTrade] = useState<{
    side: "long" | "short";
    leverage: number;
    size: number;
    tp: string;
    sl: string;
    limitPrice: string | null;
  } | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const wallet = useTradingStore((s) => s.wallet);
  const position = useTradingStore((s) => s.position);
  const currentPrice = useTradingStore((s) => s.currentPrice);
  const openPosition = useTradingStore((s) => s.openPosition);
  const addPendingOrder = useTradingStore((s) => s.addPendingOrder);
  const closePosition = useTradingStore((s) => s.closePosition);
  const updatePositionSize = useTradingStore((s) => s.updatePositionSize);
  const updateLeverage = useTradingStore((s) => s.updateLeverage);
  const skipHighLeverageWarning = useTradingStore((s) => s.skipHighLeverageWarning);
  const setSkipHighLeverageWarning = useTradingStore((s) => s.setSkipHighLeverageWarning);
  const reduceOnly = useTradingStore((s) => s.reduceOnly);
  const setTrailingStop = useTradingStore((s) => s.setTrailingStop);
  const lastActionError = useTradingStore((s) => s.lastActionError);
  const clearLastActionError = useTradingStore((s) => s.clearLastActionError);
  const maxLeverage = useTradingStore((s) => s.maxLeverage);
  const { toast } = useToast();

  // Show action errors as toast notifications
  useEffect(() => {
    if (lastActionError) {
      toast({ title: "⚠️ Action Failed", description: lastActionError, variant: "destructive" });
      clearLastActionError();
    }
  }, [lastActionError, toast, clearLastActionError]);

  // Track whether we have already synced controls to the current position.
  // Only sync when a position first appears (null -> not-null), not on every update.
  const prevHadPosition = useRef(false);
  useEffect(() => {
    const hasPosition = !!position;
    if (hasPosition && !prevHadPosition.current) {
      // Position just opened — sync controls to it
      setLeverage(position.leverage);
      setSide(position.side);
      const max = Math.max(100, Math.floor(position.size));
      setPositionSize(Math.min(1000, max));
    }
    prevHadPosition.current = hasPosition;
  }, [position]);

  const safeLeverage = leverage || 1;
  const margin = positionSize / safeLeverage;
  const canOpen = wallet >= margin;

  const isReduceMode = !!(position && side !== position.side);
  const sliderMax = !position
    ? Math.max(100, Math.floor(wallet * leverage))
    : isReduceMode && reduceOnly
      ? Math.max(100, Math.floor(position.size))
      : isReduceMode && !reduceOnly
        ? // Hedge mode: allow closing existing + opening new with full wallet
          Math.max(100, Math.floor(position.size + wallet * leverage))
        : Math.max(100, Math.floor(wallet * leverage));

  const handleOpen = () => {
    if (!canOpen) {
      return;
    }
    if (leverage >= 50 && !skipHighLeverageWarning && mode === "simple") {
      setPendingTrade({
        side,
        leverage,
        size: positionSize,
        tp: tpPrice,
        sl: slPrice,
        limitPrice: orderType === "limit" ? limitPrice : null,
      });
      return;
    }
    if (orderType === "limit") {
      const li = parseFloat(limitPrice);
      if (!li || li <= 0) return;
      addPendingOrder({
        side,
        orderType: "open",
        leverage,
        size: positionSize,
        tpPrice: tpPrice ? parseFloat(tpPrice) : null,
        slPrice: slPrice ? parseFloat(slPrice) : null,
        limitPrice: li,
        orderPrice: null,
      });
      setLimitPrice("");
      setTpPrice(""); setTpOrderPrice("");
      setSlPrice(""); setSlOrderPrice("");
      setShowTp(false); setShowSl(false);
      setPositionSize(position ? 1000 : positionSize);
    } else {
      openPosition(side, leverage, positionSize, tpPrice, slPrice, null);
      setTpPrice(""); setTpOrderPrice("");
      setSlPrice(""); setSlOrderPrice("");
      setShowTp(false); setShowSl(false);
    }
  };

  const handleConfirmHighLeverage = () => {
    if (!pendingTrade) return;
    const li = pendingTrade.limitPrice ? parseFloat(pendingTrade.limitPrice) : null;
    if (li && li > 0) {
      addPendingOrder({
        side: pendingTrade.side,
        orderType: "open",
        leverage: pendingTrade.leverage,
        size: pendingTrade.size,
        tpPrice: pendingTrade.tp ? parseFloat(pendingTrade.tp) : null,
        slPrice: pendingTrade.sl ? parseFloat(pendingTrade.sl) : null,
        limitPrice: li,
        orderPrice: null,
      });
      setLimitPrice("");
      setTpPrice(""); setTpOrderPrice("");
      setSlPrice(""); setSlOrderPrice("");
      setShowTp(false); setShowSl(false);
      setPositionSize(position ? 1000 : positionSize);
    } else if (!pendingTrade.limitPrice) {
      openPosition(
        pendingTrade.side,
        pendingTrade.leverage,
        pendingTrade.size,
        pendingTrade.tp,
        pendingTrade.sl,
        pendingTrade.limitPrice
      );
      setTpPrice("");
      setSlPrice("");
    } else {
      setPendingTrade(null);
      return;
    }
    setPendingTrade(null);
  };

  const handleUpdate = () => {
    if (!position) return;

    // Hedge mode: opposite-side orders can flip the position if size exceeds current
    if (isReduceMode && !reduceOnly) {
      openPosition(side, leverage, positionSize, tpPrice, slPrice, null);
      return;
    }

    const targetSize = isReduceMode
      ? position.size - positionSize
      : position.size + positionSize;
    if (targetSize <= 0) {
      closePosition("manual");
    } else {
      updatePositionSize(targetSize, side);
    }
  };

  const handleLeverageChange = (newLeverage: number) => {
    setLeverage(newLeverage);
    if (position) {
      updateLeverage(newLeverage);
    }
  };

  const canIncrease = positionSize > 0 && wallet >= positionSize / safeLeverage;
  const canDecrease = !!(position && positionSize > 0 && positionSize <= position.size);
  // In Hedge Mode, opposite-side orders can flip (size > position.size) or reduce (size <= position.size).
  // For flips, we need enough funds for the excess after returning existing margin + PnL.
  const canFlip = (() => {
    if (!position || positionSize <= 0 || reduceOnly || !isReduceMode) return false;
    if (positionSize <= position.size) return true; // Just a reduce
    // Flip with excess: calculate if wallet + returned margin + PnL covers excess margin
    const priceDiff = position.side === "long" ? currentPrice - position.entry : position.entry - currentPrice;
    const closePnl = (priceDiff / position.entry) * position.size;
    const returnedMargin = position.size / position.leverage;
    const excessSize = positionSize - position.size;
    const excessMargin = excessSize / leverage;
    return wallet + returnedMargin + closePnl >= excessMargin;
  })();

  const leverageOptions = [2, 5, 10, 25, 50, 100, 125].filter((o) => o <= maxLeverage);
  const sizeOptions = [10, 25, 50, 100];
  const isLong = side === "long";

  return (
    <>
      <div className="card-surface overflow-hidden">
        {/* Header with mode toggle */}
        <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Order Controls</h3>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => setShowCalculator(true)}
              title="Position Size Calculator"
              className="p-1.5 rounded hover:bg-crypto-surface-elevated text-crypto-text-muted hover:text-crypto-text transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
            </button>
            <button type="button"
              onClick={() => setMode(mode === "simple" ? "advanced" : "simple")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-crypto-surface-elevated border border-crypto-border text-[10px] font-semibold text-crypto-text-secondary hover:text-crypto-text transition-colors"
            >
              <Settings2 className="w-3 h-3" />
              {mode === "simple" ? "Advanced Mode" : "Simple Mode"}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Side Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              data-testid="trade-controls-side-long"
              onClick={() => {
                setSide("long");
                if (position && orderType === "market") {
                  const goingOpposite = position.side !== "long";
                  const newMax = goingOpposite && !reduceOnly
                    ? // Hedge mode: allow closing existing + opening new
                      Math.max(100, Math.floor(position.size + wallet * leverage))
                    : goingOpposite
                      ? // Reduce Only: max = position size
                        Math.max(100, Math.floor(position.size))
                      : // Same side: max = wallet * leverage
                        Math.max(100, Math.floor(wallet * leverage));
                  setPositionSize(Math.min(1000, newMax));
                }
              }}
              className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border ${
                isLong
                  ? "bg-crypto-long text-black border-crypto-long shadow-glow-long"
                  : "bg-crypto-surface-elevated text-crypto-long border-crypto-border hover:border-crypto-long/50"
              }`}
            >
              LONG
              {position && orderType === "limit" && position.side === "long" && (
                <span className="block text-[8px] font-normal normal-case opacity-70">Increase</span>
              )}
              {position && orderType === "limit" && position.side !== "long" && (
                <span className="block text-[8px] font-normal normal-case opacity-70">Reduce</span>
              )}
            </button>
            <button type="button"
              data-testid="trade-controls-side-short"
              onClick={() => {
                setSide("short");
                if (position && orderType === "market") {
                  const goingOpposite = position.side !== "short";
                  const newMax = goingOpposite && !reduceOnly
                    ? // Hedge mode: allow closing existing + opening new
                      Math.max(100, Math.floor(position.size + wallet * leverage))
                    : goingOpposite
                      ? // Reduce Only: max = position size
                        Math.max(100, Math.floor(position.size))
                      : // Same side: max = wallet * leverage
                        Math.max(100, Math.floor(wallet * leverage));
                  setPositionSize(Math.min(1000, newMax));
                }
              }}
              className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border ${
                !isLong
                  ? "bg-crypto-short text-white border-crypto-short shadow-glow-short"
                  : "bg-crypto-surface-elevated text-crypto-short border-crypto-border hover:border-crypto-short/50"
              }`}
            >
              SHORT
              {position && orderType === "limit" && position.side === "short" && (
                <span className="block text-[8px] font-normal normal-case opacity-70">Increase</span>
              )}
              {position && orderType === "limit" && position.side !== "short" && (
                <span className="block text-[8px] font-normal normal-case opacity-70">Reduce</span>
              )}
            </button>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => setOrderType("market")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                orderType === "market"
                  ? "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
                  : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border"
              }`}
            >
              Market
            </button>
            <button type="button"
              onClick={() => setOrderType("limit")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                orderType === "limit"
                  ? "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
                  : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border"
              }`}
            >
              Limit
            </button>
          </div>

          {/* Reduce Only / Hedge Mode Toggle */}
          {position && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Position Mode</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${reduceOnly ? "bg-crypto-accent-dim text-crypto-accent" : "bg-crypto-warning-dim text-crypto-warning"}`}>
                  {reduceOnly ? "Reduce Only" : "Hedge Mode"}
                </span>
              </div>
              <button type="button"
                data-testid="trade-controls-reduce-only-toggle"
                onClick={() => {
                  const store = useTradingStore.getState();
                  store.setReduceOnly(!reduceOnly);
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  reduceOnly ? "bg-crypto-accent" : "bg-crypto-warning"
                }`}
                aria-label={reduceOnly ? "Enable hedge mode" : "Enable reduce only"}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    reduceOnly ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {mode === "simple" ? (
            <>
              {/* Leverage Pills */}
              <div className="space-y-2">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Leverage</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {leverageOptions.map((opt) => (
                    <button type="button"
                      key={opt}
                      onClick={() => handleLeverageChange(opt)}
                      className={`py-1.5 rounded-md text-xs font-bold font-mono transition-all ${
                        leverage === opt
                          ? opt >= 50
                            ? "bg-crypto-warning-dim text-crypto-warning border border-crypto-warning/30"
                            : "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
                          : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
                      }`}
                    >
                      {opt}x
                    </button>
                  ))}
                </div>
                {leverage >= 50 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-crypto-warning-dim border border-crypto-warning/20">
                    <span className="text-[10px] text-crypto-warning font-semibold">⚠️ High risk of quick liquidation</span>
                  </div>
                )}
              </div>

              {/* TP / SL Inputs — always visible when no position */}
              {(!position || orderType === "limit") && (
                <div className="space-y-2">
                  {/* TP / SL — collapsed by default */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setShowTp(!showTp); if (!showTp) setShowSl(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${showTp ? "bg-crypto-long-dim border-crypto-long text-crypto-long" : tpPrice ? "bg-crypto-long-dim/30 border-crypto-long/30 text-crypto-long" : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-long/50 hover:text-crypto-long"}`}>
                      🎯 {tpPrice ? `TP $${parseFloat(tpPrice).toFixed(0)}` : "Set Take Profit"}
                    </button>
                    <button type="button" onClick={() => { setShowSl(!showSl); if (!showSl) setShowTp(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${showSl ? "bg-crypto-short-dim border-crypto-short text-crypto-short" : slPrice ? "bg-crypto-short-dim/30 border-crypto-short/30 text-crypto-short" : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-short/50 hover:text-crypto-short"}`}>
                      🛡️ {slPrice ? `SL $${parseFloat(slPrice).toFixed(0)}` : "Set Stop Loss"}
                    </button>
                  </div>
                  {/* step selector */}
                  {(showTp || showSl) && (
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => setShowTpSlStep(!showTpSlStep)}
                        className="text-[10px] font-mono text-crypto-text-secondary hover:text-crypto-text transition-colors">
                        step ${tpSlStep}
                      </button>
                      {showTpSlStep && [10, 50, 100, 250].map((s) => (
                        <button type="button" key={s} onClick={() => { setTpSlStep(s); setShowTpSlStep(false); }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${tpSlStep === s ? "bg-crypto-accent text-white" : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"}`}>
                          ${s}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Take Profit expanded */}
                  {showTp && (
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-crypto-long-dim/10 border border-crypto-long/20">
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-long uppercase tracking-wider">Trigger Price</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setTpPrice(((parseFloat(tpPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="0.00" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-long/30 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-long" />
                            {tpPrice && <button type="button" onClick={() => setTpPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setTpPrice(((parseFloat(tpPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price <span className="normal-case">(empty = market)</span></span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setTpOrderPrice(((parseFloat(tpOrderPrice) || parseFloat(tpPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="market" value={tpOrderPrice} onChange={(e) => setTpOrderPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent" />
                            {tpOrderPrice && <button type="button" onClick={() => setTpOrderPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setTpOrderPrice(((parseFloat(tpOrderPrice) || parseFloat(tpPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Stop Loss expanded */}
                  {showSl && (
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-crypto-short-dim/10 border border-crypto-short/20">
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-short uppercase tracking-wider">Trigger Price</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setSlPrice(((parseFloat(slPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="0.00" value={slPrice} onChange={(e) => setSlPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-short/30 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-short" />
                            {slPrice && <button type="button" onClick={() => setSlPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setSlPrice(((parseFloat(slPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price <span className="normal-case">(empty = market)</span></span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setSlOrderPrice(((parseFloat(slOrderPrice) || parseFloat(slPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="market" value={slOrderPrice} onChange={(e) => setSlOrderPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent" />
                            {slOrderPrice && <button type="button" onClick={() => setSlOrderPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setSlOrderPrice(((parseFloat(slOrderPrice) || parseFloat(slPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Size Pills or Slider when position open */}
              {position ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
                      {isReduceMode ? "Reduce Size" : "Increase Size"}
                    </span>
                    <span className="text-[10px] font-mono text-crypto-text-secondary">Current: ${Math.floor(position.size).toLocaleString()}</span>
                  </div>
                  <input
                    data-testid="trade-controls-size-slider"
                    type="range"
                    min={100}
                    max={Math.max(100, sliderMax)}
                    step={100}
                    value={positionSize}
                    onChange={(e) => setPositionSize(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-crypto-surface-elevated accent-crypto-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
                    <span>$100</span>
                    <span>${Math.floor(sliderMax / 2).toLocaleString()}</span>
                    <span>${Math.floor(sliderMax).toLocaleString()}</span>
                  </div>

                  {/* Trailing Stop UI removed — logic kept in store */}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">{position && orderType === "limit" ? "Additional Size" : "Position Size"}</span>
                    <span className="text-[10px] font-mono text-crypto-text-secondary">Max: ${Math.floor(wallet * leverage).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {sizeOptions.map((pct) => {
                      const targetSize = Math.floor(wallet * leverage * (pct / 100));
                      return (
                        <button type="button"
                          key={pct}
                          onClick={() => setPositionSize(targetSize)}
                          className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                            Math.abs(positionSize - targetSize) < 1
                              ? "bg-crypto-surface-elevated text-crypto-text border border-crypto-accent"
                              : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
                          }`}
                        >
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Advanced: Leverage Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Leverage</span>
                  <span className="text-sm font-bold font-mono text-crypto-accent">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={100}
                  value={leverage}
                  onChange={(e) => handleLeverageChange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-crypto-surface-elevated accent-crypto-accent cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
                  <span>2x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>100x</span>
                </div>
              </div>

              {/* Advanced: Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Size</span>
                  <span className="text-sm font-bold font-mono text-crypto-text">${positionSize.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={Math.max(100, sliderMax)}
                  step={100}
                  value={positionSize}
                  onChange={(e) => setPositionSize(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-crypto-surface-elevated accent-crypto-accent cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
                  <span>$100</span>
                  <span>${Math.floor(sliderMax / 2).toLocaleString()}</span>
                  <span>${Math.floor(sliderMax).toLocaleString()}</span>
                </div>
              </div>

              {/* TP / SL Inputs */}
              {(!position || orderType === "limit") && (
                <div className="space-y-2">
                  {/* TP / SL — collapsed by default */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setShowTp(!showTp); if (!showTp) setShowSl(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${showTp ? "bg-crypto-long-dim border-crypto-long text-crypto-long" : tpPrice ? "bg-crypto-long-dim/30 border-crypto-long/30 text-crypto-long" : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-long/50 hover:text-crypto-long"}`}>
                      🎯 {tpPrice ? `TP $${parseFloat(tpPrice).toFixed(0)}` : "Set Take Profit"}
                    </button>
                    <button type="button" onClick={() => { setShowSl(!showSl); if (!showSl) setShowTp(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${showSl ? "bg-crypto-short-dim border-crypto-short text-crypto-short" : slPrice ? "bg-crypto-short-dim/30 border-crypto-short/30 text-crypto-short" : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-short/50 hover:text-crypto-short"}`}>
                      🛡️ {slPrice ? `SL $${parseFloat(slPrice).toFixed(0)}` : "Set Stop Loss"}
                    </button>
                  </div>
                  {/* step selector */}
                  {(showTp || showSl) && (
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => setShowTpSlStep(!showTpSlStep)}
                        className="text-[10px] font-mono text-crypto-text-secondary hover:text-crypto-text transition-colors">
                        step ${tpSlStep}
                      </button>
                      {showTpSlStep && [10, 50, 100, 250].map((s) => (
                        <button type="button" key={s} onClick={() => { setTpSlStep(s); setShowTpSlStep(false); }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${tpSlStep === s ? "bg-crypto-accent text-white" : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"}`}>
                          ${s}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Take Profit expanded */}
                  {showTp && (
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-crypto-long-dim/10 border border-crypto-long/20">
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-long uppercase tracking-wider">Trigger Price</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setTpPrice(((parseFloat(tpPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="0.00" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-long/30 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-long" />
                            {tpPrice && <button type="button" onClick={() => setTpPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setTpPrice(((parseFloat(tpPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price <span className="normal-case">(empty = market)</span></span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setTpOrderPrice(((parseFloat(tpOrderPrice) || parseFloat(tpPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="market" value={tpOrderPrice} onChange={(e) => setTpOrderPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent" />
                            {tpOrderPrice && <button type="button" onClick={() => setTpOrderPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setTpOrderPrice(((parseFloat(tpOrderPrice) || parseFloat(tpPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Stop Loss expanded */}
                  {showSl && (
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-crypto-short-dim/10 border border-crypto-short/20">
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-short uppercase tracking-wider">Trigger Price</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setSlPrice(((parseFloat(slPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="0.00" value={slPrice} onChange={(e) => setSlPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-short/30 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-short" />
                            {slPrice && <button type="button" onClick={() => setSlPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setSlPrice(((parseFloat(slPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price <span className="normal-case">(empty = market)</span></span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setSlOrderPrice(((parseFloat(slOrderPrice) || parseFloat(slPrice) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                          <div className="relative flex-1">
                            <input type="text" placeholder="market" value={slOrderPrice} onChange={(e) => setSlOrderPrice(e.target.value)}
                              className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent" />
                            {slOrderPrice && <button type="button" onClick={() => setSlOrderPrice("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                          </div>
                          <button type="button" onClick={() => setSlOrderPrice(((parseFloat(slOrderPrice) || parseFloat(slPrice) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </>
          )}

          {/* Limit Price — visible in both simple and advanced when limit is selected */}
          {orderType === "limit" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Limit Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-crypto-text-secondary">step ${limitStep}</span>
                  <button type="button"
                    aria-label="Step settings"
                    onClick={() => setShowStepSettings(!showStepSettings)}
                    className={`p-1 rounded transition-all ${showStepSettings ? "bg-crypto-accent text-white" : "text-crypto-text-secondary hover:text-crypto-text"}`}
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step settings dropdown */}
              {showStepSettings && (
                <div className="p-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border space-y-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {[1, 5, 10, 50, 100].map((step) => (
                      <button
                        type="button"
                        key={step}
                        onClick={() => { setLimitStep(step); setCustomStep(""); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                          limitStep === step && !customStep
                            ? "bg-crypto-accent text-white"
                            : "bg-crypto-surface text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
                        }`}
                      >
                        ${step}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-crypto-text-muted">Custom:</span>
                    <input
                      type="text"
                      placeholder="e.g. 25"
                      value={customStep}
                      onChange={(e) => {
                        setCustomStep(e.target.value);
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) setLimitStep(val);
                      }}
                      className="flex-1 px-2 py-1 rounded bg-crypto-surface border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="button"
                  data-testid="limit-price-down"
                  onClick={() => {
                    const val = parseFloat(limitPrice || currentPrice.toFixed(0));
                    if (!isNaN(val)) setLimitPrice((val - limitStep).toFixed(2));
                  }}
                  className="flex-shrink-0 p-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={currentPrice.toFixed(0)}
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    onClick={(e) => {
                      if (!limitPrice) {
                        setLimitPrice(currentPrice.toFixed(0));
                        (e.target as HTMLInputElement).select();
                      }
                    }}
                    className="w-full px-3 py-2 pr-[72px] rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent cursor-pointer"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted pointer-events-none">USDT</span>
                  {limitPrice && (
                    <button type="button"
                      onClick={() => setLimitPrice("")}
                      className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded text-crypto-text-muted hover:text-crypto-short hover:bg-crypto-short-dim transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button type="button"
                  data-testid="limit-price-up"
                  onClick={() => {
                    const val = parseFloat(limitPrice || currentPrice.toFixed(0));
                    if (!isNaN(val)) setLimitPrice((val + limitStep).toFixed(2));
                  }}
                  className="flex-shrink-0 p-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-1.5 pt-2 border-t border-crypto-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-crypto-text-muted">Notional Value:</span>
              <span className="font-mono font-semibold text-crypto-text">${positionSize.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-crypto-text-muted">Required Margin:</span>
              <span data-testid="trade-controls-summary-margin" className="font-mono font-semibold text-crypto-text">
                ${(() => {
                  // In Hedge Mode flip, only the excess needs new margin
                  if (isReduceMode && !reduceOnly && position && positionSize > position.size) {
                    const excessSize = positionSize - position.size;
                    return (excessSize / safeLeverage).toLocaleString("en-US", { minimumFractionDigits: 2 });
                  }
                  return margin.toLocaleString("en-US", { minimumFractionDigits: 2 });
                })()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-crypto-text-muted">Available after:</span>
              <span data-testid="trade-controls-summary-available" className="font-mono font-semibold text-crypto-text">
                ${(() => {
                  if (isReduceMode && !reduceOnly && position && positionSize > position.size) {
                    const safePosEntry = position.entry || 1;
                    const safePosLeverage = position.leverage || 1;
                    const priceDiff = position.side === "long" ? currentPrice - safePosEntry : safePosEntry - currentPrice;
                    const closePnl = (priceDiff / safePosEntry) * position.size;
                    const returnedMargin = position.size / safePosLeverage;
                    const excessSize = positionSize - position.size;
                    const excessMargin = excessSize / safeLeverage;
                    return (wallet + returnedMargin + closePnl - excessMargin).toLocaleString("en-US", { minimumFractionDigits: 2 });
                  }
                  return (wallet - margin).toLocaleString("en-US", { minimumFractionDigits: 2 });
                })()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {position && orderType === "market" ? (
            <div className="space-y-2">
              {side === position.side ? (
                <button type="button"
                  data-testid="trade-controls-action-btn"
                  onClick={handleUpdate}
                  disabled={!canIncrease}
                  className={`w-full font-bold py-2.5 px-4 rounded-lg transition-colors text-sm ${
                    canIncrease
                      ? position.side === "long"
                        ? "bg-crypto-long text-black hover:shadow-glow-long"
                        : "bg-crypto-short text-white hover:shadow-glow-short"
                      : "bg-crypto-surface-elevated text-crypto-text-muted cursor-not-allowed"
                  }`}
                >
                  INCREASE POSITION
                </button>
              ) : reduceOnly ? (
                <button type="button"
                  data-testid="trade-controls-action-btn"
                  onClick={handleUpdate}
                  disabled={!canDecrease}
                  className={`w-full font-bold py-2.5 px-4 rounded-lg transition-colors text-sm ${
                    canDecrease
                      ? "bg-crypto-warning text-black hover:bg-crypto-warning/90"
                      : "bg-crypto-surface-elevated text-crypto-text-muted cursor-not-allowed"
                  }`}
                >
                  REDUCE POSITION
                </button>
              ) : (
                <button type="button"
                  data-testid="trade-controls-action-btn"
                  onClick={handleUpdate}
                  disabled={!canFlip}
                  className={`w-full font-bold py-2.5 px-4 rounded-lg transition-colors text-sm ${
                    canFlip
                      ? isLong
                        ? "bg-crypto-long text-black hover:shadow-glow-long"
                        : "bg-crypto-short text-white hover:shadow-glow-short"
                      : "bg-crypto-surface-elevated text-crypto-text-muted cursor-not-allowed"
                  }`}
                >
                  {positionSize >= position.size
                    ? `FLIP TO ${side.toUpperCase()}`
                    : "REDUCE POSITION"}
                </button>
              )}
              <button type="button"
                data-testid="trade-controls-close-btn"
                onClick={() => closePosition("manual")}
                className="w-full font-bold py-2.5 px-4 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm"
              >
                CLOSE POSITION
              </button>
            </div>
          ) : position && orderType === "limit" ? (
            <div className="space-y-2">
              <button type="button"
                data-testid="trade-controls-action-btn"
                onClick={handleOpen}
                disabled={isReduceMode ? (!reduceOnly ? !canFlip : !canDecrease) : !canOpen}
                className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                  (isReduceMode && !reduceOnly ? canFlip : canOpen)
                    ? isLong
                      ? "btn-long shadow-glow-long"
                      : "btn-short shadow-glow-short"
                    : "bg-crypto-surface-elevated text-crypto-text-muted cursor-not-allowed"
                }`}
              >
                {`Place ${isLong ? "Long" : "Short"} Limit`}
              </button>
              <button type="button"
                data-testid="trade-controls-close-btn"
                onClick={() => closePosition("manual")}
                className="w-full font-bold py-2.5 px-4 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm"
              >
                CLOSE POSITION
              </button>
            </div>
          ) : (
            <button type="button"
              data-testid="trade-controls-action-btn"
              onClick={handleOpen}
              disabled={!canOpen}
              className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                canOpen
                  ? isLong
                    ? "btn-long shadow-glow-long"
                    : "btn-short shadow-glow-short"
                  : "bg-crypto-surface-elevated text-crypto-text-muted cursor-not-allowed"
              }`}
            >
              {orderType === "limit"
                ? `Place ${isLong ? "Long" : "Short"} Limit`
                : mode === "simple"
                ? `Open ${isLong ? "Long" : "Short"}`
                : `Open ${isLong ? "Long" : "Short"} Market`}
            </button>
          )}
        </div>
      </div>

      {/* High leverage confirmation modal */}
      {pendingTrade && (
        <ConfirmHighLeverageModal
          leverage={pendingTrade.leverage}
          onConfirm={handleConfirmHighLeverage}
          onCancel={() => setPendingTrade(null)}
          onSkipChange={(skip) => setSkipHighLeverageWarning(skip)}
        />
      )}

      {/* Position Size Calculator */}
      {showCalculator && (
        <PositionSizeCalculator
          leverage={leverage}
          onApply={(size) => setPositionSize(size)}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </>
  );
}
