"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

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
                <h2 id="high-leverage-title" className="text-lg font-bold text-crypto-warning">High Risk Detected</h2>
                <p className="text-xs text-crypto-text-muted">Confirmation required</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Warning message */}
            <div className="p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-crypto-text-secondary">Selected Leverage</span>
                <span className="text-2xl font-bold font-mono text-crypto-warning">{leverage}x</span>
              </div>
              <div className="h-px bg-crypto-border" />
              <p className="text-sm text-crypto-text leading-relaxed">
                You are about to open a position with extreme leverage.
                <span className="text-crypto-warning font-semibold"> Potential for quick liquidation. </span>
                A movement of <span className="font-mono font-semibold text-crypto-text">{(100 / leverage).toFixed(2)}%</span> against your position will result in total margin loss.
              </p>
            </div>

            {/* Risk bullets */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">Automatic liquidation without prior warning</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">Potential loss of 100% of allocated margin</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crypto-warning mt-2 shrink-0" />
                <span className="text-xs text-crypto-text-secondary">BTC volatility can liquidate in seconds</span>
              </div>
            </div>

            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-crypto-border bg-crypto-surface-elevated text-crypto-warning focus:ring-crypto-warning focus:ring-offset-0"
              />
              <span className="text-sm text-crypto-text-secondary">Don't show this warning again</span>
            </label>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onCancel}
                className="py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="py-3 rounded-lg bg-crypto-warning text-black hover:bg-crypto-warning/90 transition-all text-sm font-bold shadow-glow-warning"
              >
                I understand the risks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
