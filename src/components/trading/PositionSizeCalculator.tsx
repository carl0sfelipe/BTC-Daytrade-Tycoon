"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

interface PositionSizeCalculatorProps {
  leverage: number;
  onApply: (size: number) => void;
  onClose: () => void;
}

const RISK_OPTIONS = ["1", "2", "5", "10"] as const;

export default function PositionSizeCalculator({ leverage, onApply, onClose }: PositionSizeCalculatorProps) {
  const wallet = useTradingStore((s) => s.wallet);
  const currentPrice = useTradingStore((s) => s.currentPrice);

  const [riskPct, setRiskPct] = useState("2");
  const [slPriceInput, setSlPriceInput] = useState("");

  const riskAmount = wallet * (parseFloat(riskPct) / 100) || 0;
  const slPrice = parseFloat(slPriceInput);
  const slDistance =
    slPrice > 0 && currentPrice > 0 ? Math.abs(currentPrice - slPrice) / currentPrice : 0;
  const recommendedSize = slDistance > 0 ? riskAmount / slDistance : 0;
  const cappedSize = Math.min(Math.floor(recommendedSize), Math.floor(wallet * leverage));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm mx-4 animate-slide-in">
        <div className="card-surface border border-crypto-border overflow-hidden">
          <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
            <span className="text-sm font-bold text-crypto-text">Position Size Calculator</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-crypto-text-muted hover:text-crypto-text transition-colors"
              aria-label="Close calculator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
              <div>
                <span className="text-[10px] text-crypto-text-muted uppercase">Balance</span>
                <div className="text-sm font-bold font-mono text-crypto-text mt-0.5">
                  ${wallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-crypto-text-muted uppercase">Entry Price</span>
                <div className="text-sm font-bold font-mono text-crypto-text mt-0.5">
                  ${currentPrice.toLocaleString("en-US")}
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-crypto-text-muted uppercase block mb-1.5">Risk per trade</span>
              <div className="grid grid-cols-4 gap-2">
                {RISK_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRiskPct(v)}
                    className={`py-1.5 rounded-md text-xs font-bold border transition-all ${
                      riskPct === v
                        ? "bg-crypto-accent-dim border-crypto-accent text-crypto-accent"
                        : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-text-muted"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-crypto-text-muted mt-1 text-right">
                Risk: <span className="text-crypto-short font-mono font-bold">${riskAmount.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-crypto-text-muted uppercase block mb-1.5">Stop Loss Price</span>
              <input
                type="number"
                value={slPriceInput}
                onChange={(e) => setSlPriceInput(e.target.value)}
                placeholder={`e.g. ${(currentPrice * 0.98).toFixed(0)}`}
                className="w-full px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
              />
            </div>

            {cappedSize > 0 ? (
              <div className="p-3 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-crypto-text-muted uppercase">Recommended Size</span>
                  <span className="text-base font-bold font-mono text-crypto-text">
                    ${cappedSize.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-crypto-text-muted uppercase">Max Loss</span>
                  <span className="text-sm font-bold font-mono text-crypto-short">
                    −${riskAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-crypto-text-muted uppercase">Margin at {leverage}x</span>
                  <span className="text-[11px] font-mono text-crypto-text-muted">
                    ${(cappedSize / leverage).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onApply(cappedSize);
                    onClose();
                  }}
                  className="w-full py-2 rounded-lg bg-crypto-accent text-white text-xs font-bold hover:bg-crypto-accent/90 transition-all"
                >
                  Use ${cappedSize.toLocaleString()}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-crypto-text-muted text-center py-2">
                Enter a stop loss price to calculate the recommended position size
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
