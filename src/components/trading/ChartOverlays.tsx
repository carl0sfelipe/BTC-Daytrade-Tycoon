"use client";

import { calcFloatingPnL } from "@/lib/chart";
import type { Position } from "@/store/tradingStore";
import type { SimulatedCandle } from "@/lib/binance-api";

interface ChartOverlaysProps {
  position: Position | null;
  currentPrice: number;
  candles: SimulatedCandle[];
  currentTimeSec: number;
  measureAnchor: number | null;
  measureCurrent: number | null;
}

export default function ChartOverlays({
  position,
  currentPrice,
  candles,
  currentTimeSec,
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

      <DebugWickBadge candles={candles} currentTimeSec={currentTimeSec} />
    </>
  );
}

/** Dev-only badge showing current candle wick range. */
function DebugWickBadge({
  candles,
  currentTimeSec,
}: {
  candles: SimulatedCandle[];
  currentTimeSec: number;
}) {
  if (process.env.NODE_ENV === "production") return null;

  const candle = candles.find(
    (c) => currentTimeSec >= c.time && currentTimeSec < c.time + 60
  );
  if (!candle) return null;

  return (
    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-blue-950/80 border border-blue-500/30 text-[10px] font-mono text-blue-300 pointer-events-none z-10">
      <span className="text-amber-400">H</span> {candle.high.toFixed(0)}{" "}
      <span className="text-blue-400">L</span> {candle.low.toFixed(0)}{" "}
      <span className="text-crypto-text-muted">
        Δ{candle.high - candle.low > 0 ? "+" : ""}
        {(candle.high - candle.low).toFixed(0)}
      </span>
    </div>
  );
}
