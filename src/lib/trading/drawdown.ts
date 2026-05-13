import type { Position } from "@/store/domain-types";

export function calcUnrealizedPnl(
  position: Pick<Position, "side" | "entry" | "size">,
  currentPrice: number
): number {
  const { side, entry, size } = position;
  const priceDiff = side === "long" ? currentPrice - entry : entry - currentPrice;
  return (priceDiff / entry) * size;
}

export function computeMaxDrawdown(
  position: Pick<Position, "side" | "entry" | "size" | "maxDrawdown" | "peakUnrealizedPnl">,
  currentPrice: number
): { maxDrawdown: number; peakUnrealizedPnl: number } {
  const currentPnl = calcUnrealizedPnl(position, currentPrice);
  const prevPeak = position.peakUnrealizedPnl ?? 0;
  const peak = Math.max(prevPeak, currentPnl);
  const drawdown = peak > 0 ? ((peak - currentPnl) / peak) * 100 : 0;
  const maxDrawdown = Math.max(position.maxDrawdown ?? 0, drawdown);
  return { maxDrawdown, peakUnrealizedPnl: peak };
}
