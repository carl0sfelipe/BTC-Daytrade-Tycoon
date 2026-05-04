"use client";

import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import ConfirmHighLeverageModal from "./ConfirmHighLeverageModal";

export default function TradeControls() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [leverage, setLeverage] = useState(10);
  const [positionSize, setPositionSize] = useState(1000);
  const [limitPrice, setLimitPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [pendingTrade, setPendingTrade] = useState<{
    side: "long" | "short";
    leverage: number;
    size: number;
    tp: string;
    sl: string;
    limitPrice: string | null;
  } | null>(null);

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

  // Sync slider with open position size
  useEffect(() => {
    if (position) {
      setPositionSize(position.size);
      setLeverage(position.leverage);
      setSide(position.side);
    }
  }, [position]);

  const margin = positionSize / leverage;
  const canOpen = wallet >= margin;

  const sliderMax = position
    ? position.size + Math.floor(wallet * leverage)
    : Math.max(100, Math.floor(wallet * leverage));

  const handleOpen = () => {
    if (!canOpen) return;
    if (leverage >= 50 && !skipHighLeverageWarning) {
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
        leverage,
        size: positionSize,
        tpPrice: tpPrice ? parseFloat(tpPrice) : null,
        slPrice: slPrice ? parseFloat(slPrice) : null,
        limitPrice: li,
      });
    } else {
      openPosition(side, leverage, positionSize, tpPrice, slPrice, null);
    }
  };

  const handleConfirmHighLeverage = () => {
    if (!pendingTrade) return;
    openPosition(
      pendingTrade.side,
      pendingTrade.leverage,
      pendingTrade.size,
      pendingTrade.tp,
      pendingTrade.sl,
      pendingTrade.limitPrice
    );
    setPendingTrade(null);
  };

  const handleUpdate = () => {
    if (!position) return;
    updatePositionSize(positionSize);
  };

  const handleLeverageChange = (newLeverage: number) => {
    setLeverage(newLeverage);
    if (position) {
      updateLeverage(newLeverage);
    }
  };

  const sizeDiff = position ? positionSize - position.size : 0;
  const canIncrease = sizeDiff > 0 && wallet >= sizeDiff / leverage;
  const canDecrease = sizeDiff < 0;

  const leverageOptions = [2, 5, 10, 25, 50, 100];
  const sizeOptions = [10, 25, 50, 100];
  const isLong = side === "long";

  return (
    <>
      <div className="card-surface overflow-hidden">
        {/* Header with mode toggle */}
        <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Order Controls</h3>
          <button
            onClick={() => setMode(mode === "simple" ? "advanced" : "simple")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-crypto-surface-elevated border border-crypto-border text-[10px] font-semibold text-crypto-text-secondary hover:text-crypto-text transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            {mode === "simple" ? "Advanced Mode" : "Simple Mode"}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Side Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => !position && setSide("long")}
              disabled={!!position}
              className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border ${
                isLong
                  ? "bg-crypto-long text-black border-crypto-long shadow-glow-long"
                  : "bg-crypto-surface-elevated text-crypto-long border-crypto-border hover:border-crypto-long/50"
              } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              LONG
            </button>
            <button
              onClick={() => !position && setSide("short")}
              disabled={!!position}
              className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border ${
                !isLong
                  ? "bg-crypto-short text-white border-crypto-short shadow-glow-short"
                  : "bg-crypto-surface-elevated text-crypto-short border-crypto-border hover:border-crypto-short/50"
              } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              SHORT
            </button>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => !position && setOrderType("market")}
              disabled={!!position}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                orderType === "market"
                  ? "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
                  : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border"
              } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Market
            </button>
            <button
              onClick={() => !position && setOrderType("limit")}
              disabled={!!position}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                orderType === "limit"
                  ? "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
                  : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border"
              } ${position ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Limit
            </button>
          </div>

          {mode === "simple" ? (
            <>
              {/* Leverage Pills */}
              <div className="space-y-2">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Leverage</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {leverageOptions.map((opt) => (
                    <button
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
              {!position && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Take Profit</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={tpPrice}
                        onChange={(e) => setTpPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted">USDT</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Stop Loss</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={slPrice}
                        onChange={(e) => setSlPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted">USDT</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Size Pills or Slider when position open */}
              {position ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Adjust Size</span>
                    <span className="text-[10px] font-mono text-crypto-text-secondary">Current: ${Math.floor(position.size).toLocaleString()}</span>
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
                  {sizeDiff !== 0 && (
                    <div className={`text-[10px] font-mono text-center ${sizeDiff > 0 ? 'text-crypto-long' : 'text-crypto-short'}`}>
                      {sizeDiff > 0 ? '+' : ''}${sizeDiff.toLocaleString()} vs current
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Position Size</span>
                    <span className="text-[10px] font-mono text-crypto-text-secondary">Max: ${Math.floor(wallet * leverage).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {sizeOptions.map((pct) => {
                      const targetSize = Math.floor(wallet * leverage * (pct / 100));
                      return (
                        <button
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
              {!position && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Take Profit</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={tpPrice}
                        onChange={(e) => setTpPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted">USDT</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Stop Loss</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={slPrice}
                        onChange={(e) => setSlPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted">USDT</span>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

          {/* Limit Price — visible in both simple and advanced when limit is selected */}
          {!position && orderType === "limit" && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Limit Price</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder={currentPrice.toFixed(2)}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted">USDT</span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-1.5 pt-2 border-t border-crypto-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-crypto-text-muted">Required Margin:</span>
              <span className="font-mono font-semibold text-crypto-text">${margin.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-crypto-text-muted">Available after:</span>
              <span className="font-mono font-semibold text-crypto-text">
                ${(wallet - margin).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {position ? (
            <div className="space-y-2">
              {sizeDiff > 0 && (
                <button
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
              )}
              {sizeDiff < 0 && (
                <button
                  onClick={handleUpdate}
                  className="w-full font-bold py-2.5 px-4 rounded-lg bg-crypto-warning text-black hover:bg-crypto-warning/90 transition-colors text-sm"
                >
                  DECREASE POSITION
                </button>
              )}
              <button
                onClick={() => closePosition("manual")}
                className="w-full font-bold py-2.5 px-4 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm"
              >
                CLOSE POSITION
              </button>
            </div>
          ) : (
            <button
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
    </>
  );
}
