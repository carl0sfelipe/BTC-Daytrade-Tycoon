"use client";

/**
 * Turns the engine's elapsed time into a run countdown and fires onExpire
 * exactly once when the run duration is used up. Re-arms automatically when
 * the engine resets (elapsed time returns to zero).
 */
import { useEffect, useRef } from "react";
import {
  RUN_COUNTDOWN_CRITICAL_SEC,
  RUN_DURATION_SEC,
  formatCountdown,
  parseElapsedToSeconds,
} from "@/lib/engine/run-config";

export interface RunCountdown {
  remainingSec: number;
  display: string;
  isCritical: boolean;
}

export function useRunCountdown(elapsedTime: string, onExpire: () => void): RunCountdown {
  const elapsedSec = parseElapsedToSeconds(elapsedTime);
  const remainingSec = Math.max(0, RUN_DURATION_SEC - elapsedSec);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (elapsedSec === 0) {
      firedRef.current = false;
      return;
    }
    if (remainingSec <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpireRef.current();
    }
  }, [elapsedSec, remainingSec]);

  return {
    remainingSec,
    display: formatCountdown(remainingSec),
    isCritical: remainingSec <= RUN_COUNTDOWN_CRITICAL_SEC,
  };
}
