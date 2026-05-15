"use client";

import { useEffect, useRef } from "react";
import type { Position } from "@/store/tradingStore";

/**
 * Syncs control values when a position is first opened.
 *
 * Only triggers on null → position transition, not on every position update.
 */
export function usePositionSync(
  position: Position | null,
  setLeverage: (v: number) => void,
  setSide: (v: "long" | "short") => void,
  setPositionSize: (v: number | ((prev: number) => number)) => void
) {
  const prevHadPosition = useRef(false);

  useEffect(() => {
    const hasPosition = !!position;

    if (hasPosition && !prevHadPosition.current) {
      setLeverage(position.leverage);
      setSide(position.side);
      const max = Math.max(100, Math.floor(position.size));
      setPositionSize(Math.min(1000, max));
    }

    prevHadPosition.current = hasPosition;
  }, [position, setLeverage, setSide, setPositionSize]);
}
