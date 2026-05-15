"use client";

import { useEffect } from "react";
import type { IPriceLine } from "lightweight-charts";

/**
 * Keeps the "CURRENT" price line synced with the latest simulation price.
 */
export function useCurrentPriceLine(
  priceLine: IPriceLine | null,
  currentPrice: number
) {
  useEffect(() => {
    if (!priceLine) return;

    priceLine.applyOptions({ price: currentPrice });
  }, [priceLine, currentPrice]);
}
