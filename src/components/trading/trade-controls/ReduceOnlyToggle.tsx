"use client";

import { useTradingStore } from "@/store/tradingStore";

interface ReduceOnlyToggleProps {
  reduceOnly: boolean;
}

export default function ReduceOnlyToggle({ reduceOnly }: ReduceOnlyToggleProps) {
  const setReduceOnly = useTradingStore((s) => s.setReduceOnly);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
          Position Mode
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            reduceOnly
              ? "bg-crypto-accent-dim text-crypto-accent"
              : "bg-crypto-warning-dim text-crypto-warning"
          }`}
        >
          {reduceOnly ? "Reduce Only" : "Hedge Mode"}
        </span>
      </div>
      <button
        type="button"
        data-testid="trade-controls-reduce-only-toggle"
        onClick={() => {
          const store = useTradingStore.getState();
          store.setReduceOnly(!reduceOnly);
        }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          reduceOnly ? "bg-crypto-accent" : "bg-crypto-warning"
        }`}
        aria-label={reduceOnly ? "Enable hedge mode" : "Enable reduce only"}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            reduceOnly ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
