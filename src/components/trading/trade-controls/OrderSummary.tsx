"use client";

import type { Position } from "@/store/tradingStore";
import { calcAvailableAfterTrade } from "@/lib/trading";

interface OrderSummaryProps {
  wallet: number;
  position: Position | null;
  positionSize: number;
  leverage: number;
  isReduceMode: boolean;
  reduceOnly: boolean;
  currentPrice: number;
}

export default function OrderSummary({
  wallet,
  position,
  positionSize,
  leverage,
  isReduceMode,
  reduceOnly,
  currentPrice,
}: OrderSummaryProps) {
  const safeLeverage = leverage || 1;
  const margin = positionSize / safeLeverage;

  const available = calcAvailableAfterTrade({
    wallet,
    margin,
    isReduceMode,
    reduceOnly,
    position,
    positionSize,
    leverage: safeLeverage,
    currentPrice,
  });

  const displayMargin =
    isReduceMode && !reduceOnly && position && positionSize > position.size
      ? (positionSize - position.size) / safeLeverage
      : margin;

  return (
    <div className="space-y-1.5 pt-2 border-t border-crypto-border">
      <SummaryRow label="Notional Value" value={`$${positionSize.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
      <SummaryRow
        label="Required Margin"
        value={`$${displayMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        testId="trade-controls-summary-margin"
      />
      <SummaryRow
        label="Available after"
        value={`$${available.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        testId="trade-controls-summary-available"
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-crypto-text-muted">{label}:</span>
      <span
        data-testid={testId}
        className="font-mono font-semibold text-crypto-text"
      >
        {value}
      </span>
    </div>
  );
}
