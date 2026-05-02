"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmHighLeverageModalProps {
  leverage: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmHighLeverageModal({
  leverage,
  onConfirm,
  onCancel,
}: ConfirmHighLeverageModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-md mx-4 animate-slide-in">
        <div className="card-surface border-2 border-crypto-warning overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 bg-crypto-warning-dim border-b border-crypto-warning/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-crypto-warning flex items-center justify-center shadow-glow-warning">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-crypto-warning">Alto Risco Detectado</h2>
                <p className="text-xs text-crypto-text-muted">Confirmação necessária</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Warning message */}
            <div className="p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-crypto-text-secondary">Alavancagem selecionada</span>
                <span className="text-2xl font-bold font-mono text-crypto-warning">{leverage}x</span>
              </div>
              <div className="h-px bg-crypto-border" />
              <p className="text-sm text-crypto-text leading-relaxed">
                Você está prestes a abrir uma posição com alavancagem extrema.
                <span className="text-crypto-warning font-semibold"> Potencial de liquidação rápida. </span>
                Uma movimentação de <span className="font-mono font-semibold text-crypto-text">{(100 / leverage).toFixed(2)}%</span> contra sua posição resultará em perda total da margem.
              </p>
            </div>

            {/* Risk bullets */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">Liquidação automática sem aviso prévio</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">Perda potencial de 100% da margem alocada</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">Volatilidade do BTC pode liquidar em segundos</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onCancel}
                className="py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="py-3 rounded-lg bg-crypto-warning text-black hover:bg-crypto-warning/90 transition-all text-sm font-bold shadow-glow-warning"
              >
                Sim, entendo o risco
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
