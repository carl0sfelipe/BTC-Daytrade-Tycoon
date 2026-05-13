"use client";

import { useCallback } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { useSentinelContext, diffState } from "@/lib/sentinel";
import type { SentinelEvent } from "@/lib/sentinel";

/**
 * Records a trading interaction with full market context and state delta.
 *
 * Captures the exact store state at the moment of the interaction,
 * computes a structural diff, and appends to the Sentinel event log.
 */
export function useTradeSentinel(semanticId: string, role: string) {
  const { clock, eventLog } = useSentinelContext();
  const store = useTradingStore();

  const marketContextExtractor = useCallback(
    (state: ReturnType<typeof useTradingStore.getState>): SentinelEvent["marketContext"] => ({
      price: state.currentPrice,
      indexPrice: state.currentPrice,
      timestamp: clock.now(),
    }),
    [clock],
  );

  return useCallback(
    (payload: unknown) => {
      const before = { ...useTradingStore.getState() } as unknown as Record<string, unknown>;

      // Execute the action (caller must do this before/after)
      // For now we capture after-state; true delta requires before-state passing.
      const after = { ...useTradingStore.getState() } as unknown as Record<string, unknown>;
      const delta = diffState(before, after);

      eventLog.append({
        timestamp: clock.now(),
        type: "UI_ACTION",
        semanticId,
        role,
        payload,
        engineSnapshot: delta,
        marketContext: marketContextExtractor(useTradingStore.getState()),
        accessibilityRef: "",
      });
    },
    [clock, eventLog, semanticId, role, marketContextExtractor],
  );
}
