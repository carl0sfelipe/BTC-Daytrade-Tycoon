"use client";

import { Skull, RotateCcw, Home } from "lucide-react";

interface LiquidationModalProps {
  realDate: string;
  onNewSession: () => void;
}

export default function LiquidationModal({ realDate, onNewSession }: LiquidationModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* anim: shake 400ms on modal mount */}
      <div className="relative w-full max-w-md mx-4 animate-shake">
        <div className="card-surface border-2 border-crypto-short overflow-hidden">
          {/* Header - intense red */}
          <div className="px-6 py-5 bg-crypto-short/10 border-b border-crypto-short/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-crypto-short flex items-center justify-center shadow-glow-short">
                <Skull className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-crypto-short">CONTA LIQUIDADA!</h2>
                <p className="text-xs text-crypto-text-muted">Sua margem foi completamente utilizada</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Date reveal */}
            <div className="text-center p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border">
              <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider block mb-1">Período Histórico Real</span>
              <div className="text-xl font-bold font-mono text-crypto-text">{realDate}</div>
            </div>

            {/* Quote */}
            <p className="text-center text-sm text-crypto-text-secondary italic">
              "O mercado sempre cobra sua matrícula."
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onNewSession}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                <Home className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={onNewSession}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-short text-white hover:bg-crypto-short/90 transition-all text-sm font-bold shadow-glow-short"
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
