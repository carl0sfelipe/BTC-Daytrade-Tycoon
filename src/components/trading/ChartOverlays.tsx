"use client";

import { calcFloatingPnL } from "@/lib/chart";
import type { Position } from "@/store/tradingStore";

interface ChartOverlaysProps {
  position: Position | null;
  currentPrice: number;
  measureAnchor: number | null;
  measureCurrent: number | null;
}

export default function ChartOverlays({
  position,
  currentPrice,
  measureAnchor,
  measureCurrent,
}: ChartOverlaysProps) {
  const pnlResult =
    position && currentPrice > 0
      ? calcFloatingPnL({
          side: position.side,
          entry: position.entry,
          size: position.size,
          leverage: position.leverage,
          currentPrice,
          realizedPnL: position.realizedPnL,
        })
      : null;

  const measureDelta =
    measureAnchor !== null && measureCurrent !== null
      ? Math.abs(measureCurrent - measureAnchor)
      : null;

  const measurePct =
    measureAnchor !== null &&
    measureDelta !== null &&
    measureAnchor > 0
      ? (measureDelta / measureAnchor) * 100
      : null;

  return (
    <>
      {pnlResult && (
        <div
          className={`absolute top-2 left-3 px-2 py-1 rounded text-xs font-bold font-mono pointer-events-none z-10 ${
            pnlResult.floatingPnL >= 0
              ? "bg-crypto-long/20 text-crypto-long border border-crypto-long/20"
              : "bg-crypto-short/20 text-crypto-short border border-crypto-short/20"
          }`}
        >
          {pnlResult.floatingPnL >= 0 ? "+" : ""}
          {pnlResult.floatingPnL.toFixed(2)} (
          {pnlResult.floatingRoi >= 0 ? "+" : ""}
          {pnlResult.floatingRoi.toFixed(1)}%)
        </div>
      )}

      {measureDelta !== null && measurePct !== null && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text pointer-events-none z-10 flex items-center gap-3">
          <span>Δ ${measureDelta.toFixed(2)}</span>
          <span className="text-crypto-text-muted">|</span>
          <span>Δ {measurePct.toFixed(2)}%</span>
        </div>
      )}
    </>
  );
}
