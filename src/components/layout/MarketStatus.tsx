"use client";

import { useMemo } from "react";
import { Activity, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

export default function MarketStatus() {
  const currentPrice = useTradingStore((s) => s.currentPrice);
  const volatility = useTradingStore((s) => s.volatility);
  const marketTrend = useTradingStore((s) => s.marketTrend);
  const priceHistory = useTradingStore((s) => s.priceHistory);

  const isHighVol = volatility > 3;

  const trendLabel =
    marketTrend === "bull" ? "UP" : marketTrend === "bear" ? "DOWN" : "NEUTRAL";

  const change = useMemo(() => {
    if (priceHistory.length < 2) return 0;
    return priceHistory[priceHistory.length - 1] - priceHistory[0];
  }, [priceHistory]);

  const changePercent = useMemo(() => {
    if (priceHistory.length < 2 || priceHistory[0] === 0) return 0;
    return (change / priceHistory[0]) * 100;
  }, [priceHistory, change]);

  const isUp = change >= 0;

  const sparklinePoints = useMemo(() => {
    return priceHistory.slice(-50);
  }, [priceHistory]);

  const min = Math.min(...sparklinePoints);
  const max = Math.max(...sparklinePoints);
  const range = max - min || 1;
  const width = 140;
  const height = 40;
  const points = sparklinePoints
    .map((p, i) => {
      const x = (i / (sparklinePoints.length - 1 || 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex items-center justify-between px-5 py-3 card-surface">
      <div className="flex items-center gap-6">
        {/* Badge + Price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
            <div className="w-2 h-2 rounded-full bg-crypto-long animate-pulse" />
            <span className="text-xs font-semibold text-crypto-text-secondary tracking-wider">BTC/USDT</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono text-crypto-text tabular-nums tracking-tight">
              ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Change */}
        {priceHistory.length >= 2 && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${isUp ? "bg-crypto-long-dim" : "bg-crypto-short-dim"}`}>
              <ArrowUpRight className={`w-3.5 h-3.5 ${isUp ? "text-crypto-long" : "text-crypto-short rotate-90"}`} />
              <span className={`text-sm font-bold font-mono tabular-nums ${isUp ? "text-crypto-long" : "text-crypto-short"}`}>
                {isUp ? "+" : ""}${change.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className={`text-sm font-bold font-mono tabular-nums ${isUp ? "text-crypto-long" : "text-crypto-short"}`}>
              {isUp ? "+" : ""}{changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* Sparkline */}
        {sparklinePoints.length >= 2 && (
          <svg width={width} height={height} className="opacity-80">
            <polyline
              fill="none"
              stroke={isUp ? "#00d4a8" : "#ff4757"}
              strokeWidth="2"
              points={points}
            />
          </svg>
        )}

        {/* Volatility Badge */}
        {isHighVol && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crypto-warning-dim border border-crypto-warning/20">
            <AlertTriangle className="w-3.5 h-3.5 text-crypto-warning" />
            <span className="text-xs font-bold text-crypto-warning uppercase tracking-wider">High Volatility</span>
          </div>
        )}

        {/* Market Trend */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
          <Activity className="w-3.5 h-3.5 text-crypto-text-muted" />
          <span className="text-xs font-semibold text-crypto-text-secondary uppercase tracking-wider">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}
