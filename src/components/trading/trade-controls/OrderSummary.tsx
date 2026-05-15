"use client";

import type { Position } from "@/store/tradingStore";
import { calcAvailableAfterTrade, calcLiquidationPrice } from "@/lib/trading";

interface OrderSummaryProps {
  wallet: number;
  position: Position | null;
  positionSize: number;
  leverage: number;
  isReduceMode: boolean;
  reduceOnly: boolean;
  currentPrice: number;
  side: "long" | "short";
}

export default function OrderSummary({
  wallet,
  position,
  positionSize,
  leverage,
  isReduceMode,
  reduceOnly,
  currentPrice,
  side,
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

  // Preview liquidation price based on the selected leverage AND order size.
  // When a position is open and we are increasing it, the entry price averages
  // with the current market price, which moves the liquidation price.
  const liqPreview = (() => {
    if (!position) {
      const price = calcLiquidationPrice(currentPrice, safeLeverage, side, positionSize, wallet);
      const distancePercent =
        price <= 0
          ? 100
          : side === "long"
            ? ((currentPrice - price) / currentPrice) * 100
            : ((price - currentPrice) / currentPrice) * 100;
      return { price, distancePercent };
    }
    const isClosing = positionSize >= position.size && isReduceMode;
    if (isClosing) {
      return null;
    }
    if (isReduceMode) {
      const price = calcLiquidationPrice(position.entry, safeLeverage, position.side, position.size, wallet);
      const distancePercent =
        position.side === "long"
          ? ((position.entry - price) / position.entry) * 100
          : ((price - position.entry) / position.entry) * 100;
      return { price, distancePercent };
    }
    // Increasing position — compute new average entry.
    const newTotalSize = position.size + positionSize;
    const newEntry = (position.size * position.entry + positionSize * currentPrice) / newTotalSize;
    const price = calcLiquidationPrice(newEntry, safeLeverage, position.side, newTotalSize, wallet);
    const distancePercent =
      position.side === "long"
        ? ((newEntry - price) / newEntry) * 100
        : ((price - newEntry) / newEntry) * 100;
    return { price, distancePercent };
  })();

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
      {liqPreview !== null && (
        <>
          <SummaryRow
            label="Est. Liq Price"
            value={`$${liqPreview.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            testId="trade-controls-summary-liq-preview"
          />
          <SummaryRow
            label="Distance to Liq"
            value={`${liqPreview.distancePercent.toFixed(1)}%`}
            testId="trade-controls-summary-liq-distance"
          />
        </>
      )}
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
