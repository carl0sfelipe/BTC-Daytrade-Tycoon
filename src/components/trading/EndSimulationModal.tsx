"use client";

import { BarChart3, RotateCcw, Home } from "lucide-react";

interface EndSimulationModalProps {
  realDateRange: string;
  stats: { pnl: number; trades: number; winRate: number; returnPercent: number };
  onClose: () => void;
  onNewSession: () => void;
}

export default function EndSimulationModal({
  realDateRange,
  stats,
  onClose,
  onNewSession,
}: EndSimulationModalProps) {
  const isPositive = stats.pnl >= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg mx-4 animate-slide-in">
        <div className="card-surface border border-crypto-border overflow-hidden">
          {/* Header - neutral */}
          <div className="px-6 py-5 border-b border-crypto-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-crypto-accent-dim flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-crypto-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-crypto-text">Simulação Encerrada</h2>
                <p className="text-xs text-crypto-text-muted">Sessão finalizada pelo jogador</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Date reveal */}
            <div className="text-center p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border">
              <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider block mb-1">Período Histórico Real</span>
              <div className="text-xl font-bold font-mono text-crypto-text">{realDateRange}</div>
            </div>

            {/* Session stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-center">
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider block mb-1">P&L Total</span>
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
              <span className="text-sm font-semibold text-crypto-text-secondary">Retorno da Sessão</span>
              <span className={`text-2xl font-bold font-mono ${isPositive ? "text-crypto-long" : "text-crypto-short"}`}>
                {isPositive ? "+" : ""}{stats.returnPercent.toFixed(1)}%
              </span>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                <Home className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={onNewSession}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-accent text-white hover:bg-crypto-accent/90 transition-all text-sm font-bold shadow-glow-accent"
              >
                <RotateCcw className="w-4 h-4" />
                Nova Sessão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
