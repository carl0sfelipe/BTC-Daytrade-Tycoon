"use client";

import { TrendingUp, TrendingDown, AlertTriangle, Crosshair } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

export default function PositionPanel() {
  const position = useTradingStore((s) => s.position);
  const currentPrice = useTradingStore((s) => s.currentPrice);
  const closePosition = useTradingStore((s) => s.closePosition);
  const lastCloseReason = useTradingStore((s) => s.lastCloseReason);

  if (!position) {
    return (
      <div className="card-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-crypto-border">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Your Position</h3>
        </div>
        {lastCloseReason && (
          <p className="text-center text-crypto-warning text-xs py-2">{lastCloseReason}</p>
        )}
        <div className="flex items-center justify-center min-h-[120px]">
          <p className="text-sm text-crypto-text-muted">No open position</p>
        </div>
      </div>
    );
  }

  const { side, entry, size, leverage, tpPrice, slPrice, liquidationPrice } = position;

  const priceDiff = side === "long" ? currentPrice - entry : entry - currentPrice;
  const pnl = (priceDiff / entry) * size;
  const pnlPercent = (priceDiff / entry) * leverage * 100;
  const margin = size / leverage;

  const distanceToLiq = Math.max(
    0,
    Math.min(100, Math.abs((currentPrice - liquidationPrice) / currentPrice) * 100)
  );

  // Normalize bar so it always starts full (100%) at open and shrinks toward liquidation
  const maxDistance = 100 / leverage;
  const barPercent = Math.max(0, Math.min(100, (distanceToLiq / maxDistance) * 100));

  const isLong = side === "long";
  const isCritical = barPercent < 15;
  const isDanger = barPercent < 40;

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
              <span className={`text-2xl font-bold font-mono tabular-nums ${pnl >= 0 ? "text-crypto-long text-glow-long" : "text-crypto-short text-glow-short"}`}>
                {pnl >= 0 ? "+" : ""}${pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-bold font-mono tabular-nums ${pnl >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
                ({pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
              </span>
            </div>
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
              ${entry.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
              ${margin.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* TP / SL */}
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

        {/* Liquidation Price */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-crypto-short-dim border border-crypto-short/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-crypto-short" />
            <span className="text-xs font-semibold text-crypto-short">Liquidation Price</span>
          </div>
          <span className="text-sm font-bold font-mono text-crypto-short tabular-nums">
            ${liquidationPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
            <div data-testid="distance-bar" className="h-full rounded-full risk-gradient transition-all duration-100" style={{ width: `${barPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
            <span>Safe</span>
            <span>Dangerous</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => closePosition("manual")}
          className="w-full py-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm font-semibold"
        >
          Close Position
        </button>
      </div>
    </div>
  );
}
