"use client";

import { useState } from "react";
import { Settings2, ChevronUp, ChevronDown, X } from "lucide-react";

interface LimitPriceInputProps {
  limitPrice: string;
  limitStep: number;
  currentPrice: number;
  onLimitPriceChange: (v: string) => void;
  onLimitStepChange: (v: number) => void;
}

const STEP_PRESETS = [1, 5, 10, 50, 100];

export default function LimitPriceInput({
  limitPrice,
  limitStep,
  currentPrice,
  onLimitPriceChange,
  onLimitStepChange,
}: LimitPriceInputProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [customStep, setCustomStep] = useState("");

  const handleStepDown = () => {
    const val = parseFloat(limitPrice || currentPrice.toFixed(0));
    if (!isNaN(val)) onLimitPriceChange((val - limitStep).toFixed(2));
  };

  const handleStepUp = () => {
    const val = parseFloat(limitPrice || currentPrice.toFixed(0));
    if (!isNaN(val)) onLimitPriceChange((val + limitStep).toFixed(2));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
          Limit Price
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-crypto-text-secondary">
            step ${limitStep}
          </span>
          <button
            type="button"
            aria-label="Step settings"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded transition-all ${
              showSettings
                ? "bg-crypto-accent text-white"
                : "text-crypto-text-secondary hover:text-crypto-text"
            }`}
          >
            <Settings2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border space-y-2">
          <div className="flex items-center gap-1 flex-wrap">
            {STEP_PRESETS.map((step) => (
              <button
                type="button"
                key={step}
                onClick={() => {
                  onLimitStepChange(step);
                  setCustomStep("");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                  limitStep === step && !customStep
                    ? "bg-crypto-accent text-white"
                    : "bg-crypto-surface text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
                }`}
              >
                ${step}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-crypto-text-muted">Custom:</span>
            <input
              type="text"
              placeholder="e.g. 25"
              value={customStep}
              onChange={(e) => {
                setCustomStep(e.target.value);
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) onLimitStepChange(val);
              }}
              className="flex-1 px-2 py-1 rounded bg-crypto-surface border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="limit-price-down"
          onClick={handleStepDown}
          className="flex-shrink-0 p-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            placeholder={currentPrice.toFixed(0)}
            value={limitPrice}
            onChange={(e) => onLimitPriceChange(e.target.value)}
            onClick={(e) => {
              if (!limitPrice) {
                onLimitPriceChange(currentPrice.toFixed(0));
                (e.target as HTMLInputElement).select();
              }
            }}
            className="w-full px-3 py-2 pr-[72px] rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent cursor-pointer"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted pointer-events-none">
            USDT
          </span>
          {limitPrice && (
            <button
              type="button"
              onClick={() => onLimitPriceChange("")}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded text-crypto-text-muted hover:text-crypto-short hover:bg-crypto-short-dim transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="limit-price-up"
          onClick={handleStepUp}
          className="flex-shrink-0 p-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
