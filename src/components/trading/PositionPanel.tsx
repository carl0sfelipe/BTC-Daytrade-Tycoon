"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Crosshair, Target, Shield, ChevronUp, ChevronDown, X } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import { useToast } from "@/hooks/use-toast";

export default function PositionPanel() {
  const position = useTradingStore((s) => s.position);
  const currentPrice = useTradingStore((s) => s.currentPrice);
  const closePosition = useTradingStore((s) => s.closePosition);
  const lastCloseReason = useTradingStore((s) => s.lastCloseReason);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const setPositionTpSl = useTradingStore((s) => s.setPositionTpSl);
  const cancelPendingOrder = useTradingStore((s) => s.cancelPendingOrder);
  const lastActionError = useTradingStore((s) => s.lastActionError);
  const clearLastActionError = useTradingStore((s) => s.clearLastActionError);
  const { toast } = useToast();

  useEffect(() => {
    if (lastActionError) {
      toast({ title: "⚠️ Invalid Order", description: lastActionError, variant: "destructive" });
      clearLastActionError();
    }
  }, [lastActionError, toast, clearLastActionError]);

  const [tpInput, setTpInput] = useState("");
  const [tpOrderInput, setTpOrderInput] = useState("");
  const [slInput, setSlInput] = useState("");
  const [slOrderInput, setSlOrderInput] = useState("");
  const [showTp, setShowTp] = useState(false);
  const [showSl, setShowSl] = useState(false);
  const [tpSlStep, setTpSlStep] = useState(100);
  const [showTpSlStep, setShowTpSlStep] = useState(false);

  if (!position) {
    return (
      <div className="card-surface overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b border-crypto-border">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Your Position</h3>
        </div>
        {lastCloseReason && (
          <p data-testid="position-panel-last-close-reason" className="text-center text-crypto-warning text-xs py-2">{lastCloseReason}</p>
        )}

        <div data-testid="position-panel-empty" className="flex items-center justify-center min-h-[120px]">
          <p className="text-sm text-crypto-text-muted">No open position</p>
        </div>
      </div>
    );
  }

  const { side, entry, size, leverage, tpPrice, slPrice, liquidationPrice } = position;

  const safeEntry = entry || 1;
  const safeLeverage = leverage || 1;
  const safeCurrentPrice = currentPrice || 1;

  const priceDiff = side === "long" ? safeCurrentPrice - safeEntry : safeEntry - safeCurrentPrice;
  const pnl = (priceDiff / safeEntry) * size;
  const pnlPercent = (priceDiff / safeEntry) * safeLeverage * 100;
  const margin = size / safeLeverage;

  const distanceToLiq = Math.max(
    0,
    Math.min(100, Math.abs((safeCurrentPrice - liquidationPrice) / safeCurrentPrice) * 100)
  );

  // Normalize bar so it starts empty (0%) at open and fills toward liquidation (100% = critical)
  const maxDistance = 100 / safeLeverage;
  const barPercent = Math.max(0, Math.min(100, 100 - (distanceToLiq / maxDistance) * 100));

  const isLong = side === "long";
  const isCritical = barPercent < 15;
  const isDanger = barPercent < 40;

  const tpPending = pendingOrders.filter((o) => o.side === side && o.orderType === "take_profit");
  const slPending = pendingOrders.filter((o) => o.side === side && o.orderType === "stop_loss");

  const handleSetTpSl = () => {
    setPositionTpSl(tpInput, slInput);
    setTpInput(""); setTpOrderInput(""); setShowTp(false);
    setSlInput(""); setSlOrderInput(""); setShowSl(false);
  };

  const handleCancelTp = (id: string) => {
    cancelPendingOrder(id);
  };

  const handleCancelSl = (id: string) => {
    cancelPendingOrder(id);
  };

  return (
    <div className={`card-surface overflow-hidden ${isCritical ? "animate-pulse-glow border-crypto-short/50" : ""}`}>
      <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Your Position</h3>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${isLong ? "bg-crypto-long-dim" : "bg-crypto-short-dim"}`}>
          {isLong ? (
            <TrendingUp className="w-3.5 h-3.5 text-crypto-long" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-crypto-short" />
          )}
          <span className={`text-xs font-bold uppercase ${isLong ? "text-crypto-long" : "text-crypto-short"}`}>
            {isLong ? "LONG" : "SHORT"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* PnL Big Display */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Unrealized P&L</span>
            <div className="flex items-baseline gap-2">
              <span data-testid="position-panel-pnl" className={`text-2xl font-bold font-mono tabular-nums ${pnl >= 0 ? "text-crypto-long text-glow-long" : "text-crypto-short text-glow-short"}`}>
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
              </span>
              <span data-testid="position-panel-pnl-percent" className={`text-sm font-bold font-mono tabular-nums ${pnl >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
                ({pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
              </span>
            </div>
            {position.realizedPnL !== 0 && (
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Realized P&L</span>
                <span className={`text-xs font-bold font-mono tabular-nums ${position.realizedPnL >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
                  {position.realizedPnL >= 0 ? "+" : ""}${position.realizedPnL.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-crypto-accent" />
          </div>
        </div>

        {/* Position details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Entry Price</span>
            <span className="text-sm font-mono font-semibold text-crypto-text tabular-nums">
              ${entry.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Size</span>
            <span className="text-sm font-mono font-semibold text-crypto-text tabular-nums">${size.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Leverage</span>
            <span className="text-sm font-mono font-semibold text-crypto-accent tabular-nums">{leverage}x</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Margin</span>
            <span className="text-sm font-mono font-semibold text-crypto-text tabular-nums">
              ${margin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Trailing Stop indicator */}
        {position.trailingStopPercent != null && position.trailingStopPrice != null && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-crypto-warning-dim/30 border border-crypto-warning/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-crypto-warning" />
              <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Trailing Stop</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-crypto-warning">
                {position.trailingStopPercent}%
              </span>
              <span className="text-[10px] text-crypto-text-muted">
                @ ${position.trailingStopPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Active TP / SL from position */}
        {(tpPrice || slPrice) && (
          <div className="grid grid-cols-2 gap-2">
            {tpPrice && (
              <div className="flex flex-col p-2 rounded-lg bg-crypto-long-dim border border-crypto-long/20">
                <span className="text-[10px] text-crypto-long uppercase tracking-wider">Take Profit</span>
                <span className="text-sm font-mono font-semibold text-crypto-long">${tpPrice.toFixed(2)}</span>
              </div>
            )}
            {slPrice && (
              <div className="flex flex-col p-2 rounded-lg bg-crypto-short-dim border border-crypto-short/20">
                <span className="text-[10px] text-crypto-short uppercase tracking-wider">Stop Loss</span>
                <span className="text-sm font-mono font-semibold text-crypto-short">${slPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Pending TP / SL Orders */}
        {(tpPending.length > 0 || slPending.length > 0) && (
          <div className="space-y-2">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Pending Orders</span>
            {tpPending.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-crypto-long-dim/30 border border-crypto-long/20">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-crypto-long" />
                  <span className="text-xs font-mono text-crypto-long">TP @ ${order.limitPrice.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancelTp(order.id)}
                  className="text-[10px] text-crypto-text-muted hover:text-crypto-short transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
            {slPending.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-crypto-short-dim/30 border border-crypto-short/20">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-crypto-short" />
                  <span className="text-xs font-mono text-crypto-short">SL @ ${order.limitPrice.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancelSl(order.id)}
                  className="text-[10px] text-crypto-text-muted hover:text-crypto-short transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Set TP / SL on open position */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setShowTp(!showTp); if (!showTp) setShowSl(false); }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${showTp ? "bg-crypto-long-dim border-crypto-long text-crypto-long" : tpInput ? "bg-crypto-long-dim/30 border-crypto-long/30 text-crypto-long" : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-long/50 hover:text-crypto-long"}`}>
              🎯 {tpInput ? `TP $${parseFloat(tpInput).toFixed(0)}` : "Set Take Profit"}
            </button>
            <button type="button" onClick={() => { setShowSl(!showSl); if (!showSl) setShowTp(false); }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${showSl ? "bg-crypto-short-dim border-crypto-short text-crypto-short" : slInput ? "bg-crypto-short-dim/30 border-crypto-short/30 text-crypto-short" : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-short/50 hover:text-crypto-short"}`}>
              🛡️ {slInput ? `SL $${parseFloat(slInput).toFixed(0)}` : "Set Stop Loss"}
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
                <span className="text-[9px] text-crypto-long uppercase tracking-wider">Trigger Price {isLong ? "▲ above" : "▼ below"}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setTpInput(((parseFloat(tpInput) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                  <div className="relative flex-1">
                    <input type="text" placeholder={isLong ? `> ${currentPrice.toFixed(0)}` : `< ${currentPrice.toFixed(0)}`}
                      value={tpInput} onChange={(e) => setTpInput(e.target.value)}
                      className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-long/30 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-long" />
                    {tpInput && <button type="button" onClick={() => setTpInput("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                  </div>
                  <button type="button" onClick={() => setTpInput(((parseFloat(tpInput) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price <span className="normal-case">(empty = market)</span></span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setTpOrderInput(((parseFloat(tpOrderInput) || parseFloat(tpInput) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                  <div className="relative flex-1">
                    <input type="text" placeholder="market" value={tpOrderInput} onChange={(e) => setTpOrderInput(e.target.value)}
                      className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent" />
                    {tpOrderInput && <button type="button" onClick={() => setTpOrderInput("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                  </div>
                  <button type="button" onClick={() => setTpOrderInput(((parseFloat(tpOrderInput) || parseFloat(tpInput) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                </div>
              </div>
              <button type="button" onClick={handleSetTpSl} disabled={!tpInput}
                className="w-full py-1.5 rounded-lg bg-crypto-long-dim border border-crypto-long/30 text-crypto-long text-xs font-semibold hover:bg-crypto-long/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Apply Take Profit
              </button>
            </div>
          )}

          {/* Stop Loss expanded */}
          {showSl && (
            <div className="space-y-1.5 p-2.5 rounded-lg bg-crypto-short-dim/10 border border-crypto-short/20">
              <div className="space-y-1">
                <span className="text-[9px] text-crypto-short uppercase tracking-wider">Trigger Price {isLong ? "▼ below" : "▲ above"}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setSlInput(((parseFloat(slInput) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                  <div className="relative flex-1">
                    <input type="text" placeholder={isLong ? `< ${currentPrice.toFixed(0)}` : `> ${currentPrice.toFixed(0)}`}
                      value={slInput} onChange={(e) => setSlInput(e.target.value)}
                      className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-short/30 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-short" />
                    {slInput && <button type="button" onClick={() => setSlInput("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                  </div>
                  <button type="button" onClick={() => setSlInput(((parseFloat(slInput) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price <span className="normal-case">(empty = market)</span></span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setSlOrderInput(((parseFloat(slOrderInput) || parseFloat(slInput) || currentPrice) - tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronDown className="w-3 h-3" /></button>
                  <div className="relative flex-1">
                    <input type="text" placeholder="market" value={slOrderInput} onChange={(e) => setSlOrderInput(e.target.value)}
                      className="w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent" />
                    {slOrderInput && <button type="button" onClick={() => setSlOrderInput("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"><X className="w-3 h-3" /></button>}
                  </div>
                  <button type="button" onClick={() => setSlOrderInput(((parseFloat(slOrderInput) || parseFloat(slInput) || currentPrice) + tpSlStep).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"><ChevronUp className="w-3 h-3" /></button>
                </div>
              </div>
              <button type="button" onClick={handleSetTpSl} disabled={!slInput}
                className="w-full py-1.5 rounded-lg bg-crypto-short-dim border border-crypto-short/30 text-crypto-short text-xs font-semibold hover:bg-crypto-short/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Apply Stop Loss
              </button>
            </div>
          )}
        </div>

        {/* Liquidation Price */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-crypto-short-dim border border-crypto-short/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-crypto-short" />
            <span className="text-xs font-semibold text-crypto-short">Liquidation Price</span>
          </div>
          <span className="text-sm font-bold font-mono text-crypto-short tabular-nums">
            ${liquidationPrice.toFixed(2)}
          </span>
        </div>

        {/* Risk Gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Distance to Liquidation</span>
            <span className={`text-xs font-bold font-mono tabular-nums ${isCritical ? "text-crypto-short" : isDanger ? "text-crypto-warning" : "text-crypto-long"}`}>
              {distanceToLiq.toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-crypto-surface-elevated overflow-hidden">
            <div data-testid="distance-bar" role="progressbar" aria-valuenow={Math.round(barPercent)} aria-valuemin={0} aria-valuemax={100} className="h-full rounded-full risk-gradient transition-all duration-100" style={{ width: `${barPercent}%`, minWidth: '2px' }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
            <span>Safe</span>
            <span>Dangerous</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          data-testid="position-panel-close-btn"
          onClick={() => closePosition("manual")}
          className="w-full py-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm font-semibold"
        >
          Close Position
        </button>
      </div>
    </div>
  );
}
