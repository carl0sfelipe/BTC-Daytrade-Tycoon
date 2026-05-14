"use client";

import { useCallback } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { useSentinelContext, diffState } from "@/lib/sentinel";
import type { SentinelEvent } from "@/lib/sentinel";

/**
 * Records a trading interaction with full market context and state delta.
 *
 * Captures store state before the action, executes the action,
 * captures store state after, computes a structural diff, and appends
 * to the Sentinel event log.
 */
export function useTradeSentinel(semanticId: string, role: string) {
  const { clock, eventLog } = useSentinelContext();

  return useCallback(
    (action: () => void, payload: unknown) => {
      const before = { ...useTradingStore.getState() } as unknown as Record<string, unknown>;

      action();

      const after = { ...useTradingStore.getState() } as unknown as Record<string, unknown>;
      const delta = diffState(before, after);

      const state = useTradingStore.getState();

      eventLog.append({
        timestamp: clock.now(),
        type: "UI_ACTION",
        semanticId,
        role,
        payload,
        engineSnapshot: delta,
        marketContext: {
          price: state.currentPrice,
          indexPrice: state.currentPrice,
          timestamp: clock.now(),
        },
        accessibilityRef: "",
      });
    },
    [clock, eventLog, semanticId, role],
  );
}
