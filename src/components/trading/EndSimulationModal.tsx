"use client";

import { BarChart3, RotateCcw, Home, Calendar, Clock, Timer, Activity, TrendingDown, Award } from "lucide-react";
import { getTraderTier } from "@/lib/trading/trader-score";

interface EndSimulationModalProps {
  realDateRange: string;
  elapsedTime: string;
  simulatedHistoricalTime: string;
  stats: {
    pnl: number;
    trades: number;
    winRate: number;
    returnPercent: number;
    bestTrade: number;
    worstTrade: number;
    avgDurationSeconds: number;
    profitFactor: number;
    longTrades: number;
    shortTrades: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    currentStreak: number;
    maxDrawdown: number;
    traderScore: number;
  };
  onClose: () => void;
  onNewSession: () => void;
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0 || Number.isNaN(totalSeconds)) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export default function EndSimulationModal({
  realDateRange,
  elapsedTime,
  simulatedHistoricalTime,
  stats,
  onClose,
  onNewSession,
}: EndSimulationModalProps) {
  const isPositive = stats.pnl >= 0;

  // Parse date range into start and end
  const [startDate, endDate] = realDateRange.split(" → ");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="end-session-title">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="card-surface border border-crypto-border overflow-hidden">
          {/* Header - neutral */}
          <div className="px-6 py-5 border-b border-crypto-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-crypto-accent-dim flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-crypto-accent" />
              </div>
              <div>
                <h2 id="end-session-title" className="text-lg font-bold text-crypto-text">Simulation Ended</h2>
                <p className="text-xs text-crypto-text-muted">Session ended by player</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Real Historical Period — redesigned */}
            <div className="p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-crypto-accent" />
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Real Historical Period</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-crypto-text-muted uppercase">Start</span>
                  <span className="text-sm font-bold font-mono text-crypto-text">{startDate || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-crypto-text-muted uppercase">End</span>
                  <span className="text-sm font-bold font-mono text-crypto-text">{endDate || "—"}</span>
                </div>
              </div>

              {/* Time comparison */}
              <div className="pt-2 border-t border-crypto-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-crypto-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>Your Time</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-crypto-text">{elapsedTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-crypto-text-muted">
                    <Timer className="w-3 h-3" />
                    <span>Historical Time Covered</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-crypto-accent">{simulatedHistoricalTime}</span>
                </div>
              </div>
            </div>

            {/* Session stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-center">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider block mb-1">Total P&L</span>
                <span className={`text-lg font-bold font-mono ${isPositive ? "text-crypto-long" : "text-crypto-short"}`}>
                  {isPositive ? "+" : ""}${stats.pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-center">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider block mb-1">Trades</span>
                <span className="text-lg font-bold font-mono text-crypto-text">{stats.trades}</span>
              </div>
              <div className="p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-center">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider block mb-1">Win Rate</span>
                <span className="text-lg font-bold font-mono text-crypto-accent">{stats.winRate.toFixed(0)}%</span>
              </div>
            </div>

            {/* Return percentage */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${isPositive ? "bg-crypto-long-dim border-crypto-long/20" : "bg-crypto-short-dim border-crypto-short/20"}`}>
              <span className="text-sm font-semibold text-crypto-text-secondary">Session Return</span>
              <span className={`text-2xl font-bold font-mono ${isPositive ? "text-crypto-long" : "text-crypto-short"}`}>
                {isPositive ? "+" : ""}{stats.returnPercent.toFixed(1)}%
              </span>
            </div>

            {/* Trader Score */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-crypto-accent" />
                <span className="text-sm font-semibold text-crypto-text-secondary">Trader Score</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-crypto-text">{stats.traderScore}</span>
                <span className={`text-sm font-bold ${getTraderTier(stats.traderScore).color}`}>
                  {getTraderTier(stats.traderScore).emoji} {getTraderTier(stats.traderScore).label}
                </span>
              </div>
            </div>

            {/* Win Streak Badge */}
            {stats.currentStreak >= 2 && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <span className="text-2xl" role="img" aria-label="fire">🔥</span>
                <span className="font-bold text-orange-400">
                  {stats.currentStreak} Win Streak!
                </span>
              </div>
            )}

            {/* Performance Metrics */}
            {stats.trades > 0 && (
              <div className="p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-crypto-accent" />
                  <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Performance Metrics</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Best Trade</span>
                    <span className="text-sm font-bold font-mono text-crypto-long">+${stats.bestTrade.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Worst Trade</span>
                    <span className="text-sm font-bold font-mono text-crypto-short">${stats.worstTrade.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Avg Duration</span>
                    <span className="text-sm font-bold font-mono text-crypto-text">{formatDuration(stats.avgDurationSeconds)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Profit Factor</span>
                    <span className="text-sm font-bold font-mono text-crypto-text">{stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Long / Short</span>
                    <span className="text-sm font-bold font-mono text-crypto-text">{stats.longTrades} / {stats.shortTrades}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Max Streak</span>
                    <span className="text-sm font-bold font-mono text-crypto-text">
                      <span className="text-crypto-long">{stats.maxConsecutiveWins}W</span>
                      {" / "}
                      <span className="text-crypto-short">{stats.maxConsecutiveLosses}L</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-crypto-text-muted uppercase">Max Drawdown</span>
                    <span className={`text-sm font-bold font-mono ${stats.maxDrawdown > 15 ? "text-crypto-short" : stats.maxDrawdown > 5 ? "text-yellow-400" : "text-crypto-long"}`}>
                      <TrendingDown className="w-3 h-3 inline mr-1" />
                      {stats.maxDrawdown.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                <Home className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={onNewSession}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-accent text-white hover:bg-crypto-accent/90 transition-all text-sm font-bold shadow-glow-accent"
              >
                <RotateCcw className="w-4 h-4" />
                New Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
