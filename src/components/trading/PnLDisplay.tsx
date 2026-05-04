"use client";

import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

const INITIAL_WALLET = 10000;

export default function PnLDisplay() {
  const wallet = useTradingStore((s) => s.wallet);
  const position = useTradingStore((s) => s.position);
  const currentPrice = useTradingStore((s) => s.currentPrice);
  const closedTrades = useTradingStore((s) => s.closedTrades);

  // Unrealized PnL from open position
  const unrealizedPnL =
    position
      ? ((position.side === "long" ? currentPrice - position.entry : position.entry - currentPrice) /
         position.entry) *
        position.size
      : 0;

  const margin = position ? position.size / position.leverage : 0;
  const totalEquity = wallet + margin + unrealizedPnL;

  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.pnl > 0).length;
  const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;
  const avgPnL = totalTrades ? closedTrades.reduce((s, t) => s + t.pnl, 0) / totalTrades : 0;
  const bestTrade = totalTrades ? Math.max(...closedTrades.map((t) => t.pnl)) : 0;
  const worstTrade = totalTrades ? Math.min(...closedTrades.map((t) => t.pnl)) : 0;
  const sessionPnL = totalEquity - INITIAL_WALLET;
  const sessionPnLPercent = (sessionPnL / INITIAL_WALLET) * 100;
  const isPositive = sessionPnL >= 0;

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-crypto-border">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Wallet & P&L</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero Balance */}
        <div className="text-center py-2">
          <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Current Balance</span>
          <div className="flex items-baseline justify-center gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-bold font-mono text-crypto-text tabular-nums tracking-tight">
              ${totalEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`flex items-center justify-center gap-1.5 mt-1 px-3 py-1 rounded-full ${isPositive ? "bg-crypto-long-dim" : "bg-crypto-short-dim"} w-fit mx-auto`}>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-crypto-long" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-crypto-short" />
            )}
            <span className={`text-sm font-bold font-mono tabular-nums ${isPositive ? "text-crypto-long" : "text-crypto-short"}`}>
              {isPositive ? "+" : ""}
              {sessionPnL.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({isPositive ? "+" : ""}
              {sessionPnLPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3 h-3 text-crypto-text-muted" />
              <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Trades</span>
            </div>
            <span className="text-base md:text-lg font-bold font-mono text-crypto-text tabular-nums">{totalTrades}</span>
          </div>

          <div className="flex flex-col p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-crypto-text-muted" />
              <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Win Rate</span>
            </div>
            <span className="text-base md:text-lg font-bold font-mono text-crypto-long tabular-nums">{winRate.toFixed(0)}%</span>
          </div>

          <div className="flex flex-col p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider mb-1">Avg P&L</span>
            <span className={`text-base md:text-lg font-bold font-mono tabular-nums ${avgPnL >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
              {avgPnL >= 0 ? "+" : ""}${avgPnL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider mb-1">Best Trade</span>
            <span className={`text-base md:text-lg font-bold font-mono tabular-nums ${bestTrade >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
              {bestTrade >= 0 ? "+" : ""}${bestTrade.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Worst trade */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
          <span className="text-xs font-semibold text-crypto-text-secondary">Worst Trade</span>
          <span className="text-sm font-bold font-mono text-crypto-short tabular-nums">
            -${Math.abs(worstTrade).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
