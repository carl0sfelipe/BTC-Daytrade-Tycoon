"use client";

import { Maximize2, Ruler } from "lucide-react";

interface ChartHeaderProps {
  measureMode: boolean;
  onToggleMeasure: () => void;
}

export default function ChartHeader({
  measureMode,
  onToggleMeasure,
}: ChartHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-crypto-text-secondary">
          BTC/USDT — 1M Simulation
        </span>

        <span className="hidden md:inline text-[10px] text-crypto-text-muted">
          <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">
            B
          </kbd>{" "}
          Long{" "}
          <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">
            S
          </kbd>{" "}
          Short{" "}
          <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">
            C
          </kbd>{" "}
          Close{" "}
          <kbd className="px-1 py-0.5 rounded bg-crypto-surface-elevated border border-crypto-border font-mono">
            Space
          </kbd>{" "}
          Play/Pause
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMeasure}
          title="Measure tool (click two points on chart)"
          className={`p-1.5 rounded hover:bg-crypto-surface-elevated transition-colors ${
            measureMode
              ? "text-crypto-accent bg-crypto-accent-dim"
              : "text-crypto-text-muted hover:text-crypto-text"
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          className="p-1.5 rounded hover:bg-crypto-surface-elevated text-crypto-text-muted hover:text-crypto-text"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
