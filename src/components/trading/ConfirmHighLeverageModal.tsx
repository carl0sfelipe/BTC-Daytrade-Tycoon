"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useGameMessages } from "@/hooks/useGameMessages";

interface ConfirmHighLeverageModalProps {
  leverage: number;
  onConfirm: () => void;
  onCancel: () => void;
  onSkipChange?: (skip: boolean) => void;
}

export default function ConfirmHighLeverageModal({
  leverage,
  onConfirm,
  onCancel,
  onSkipChange,
}: ConfirmHighLeverageModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const messages = useGameMessages();

  const handleConfirm = () => {
    if (onSkipChange) {
      onSkipChange(dontShowAgain);
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="high-leverage-title">
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
                <h2 id="high-leverage-title" className="text-lg font-bold text-crypto-warning">{messages.highLeverage.title}</h2>
                <p className="text-xs text-crypto-text-muted">{messages.highLeverage.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Warning message */}
            <div className="p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-crypto-text-secondary">{messages.highLeverage.selectedLeverage}</span>
                <span className="text-2xl font-bold font-mono text-crypto-warning">{leverage}x</span>
              </div>
              <div className="h-px bg-crypto-border" />
              <p className="text-sm text-crypto-text leading-relaxed">
                {messages.highLeverage.warningIntro}
                <span className="text-crypto-warning font-semibold"> {messages.highLeverage.quickLiquidation} </span>
                {messages.highLeverage.movementPrefix} <span data-testid="high-leverage-risk-pct" className="font-mono font-semibold text-crypto-text">{(100 / leverage).toFixed(2)}%</span> {messages.highLeverage.movementSuffix}
              </p>
            </div>

            {/* Risk bullets */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">{messages.highLeverage.bulletAutoLiquidation}</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">{messages.highLeverage.bulletTotalLoss}</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">{messages.highLeverage.bulletVolatility}</span>
              </div>
            </div>

            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                data-testid="high-leverage-skip-checkbox"
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-crypto-border bg-crypto-surface-elevated text-crypto-warning focus:ring-crypto-warning focus:ring-offset-0"
              />
              <span className="text-sm text-crypto-text-secondary">{messages.highLeverage.dontShowAgain}</span>
            </label>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                data-testid="high-leverage-cancel"
                onClick={onCancel}
                className="py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                {messages.highLeverage.cancel}
              </button>
              <button
                type="button"
                data-testid="high-leverage-confirm"
                onClick={handleConfirm}
                className="py-3 rounded-lg bg-crypto-warning text-black hover:bg-crypto-warning/90 transition-all text-sm font-bold shadow-glow-warning"
              >
                {messages.highLeverage.confirm}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
