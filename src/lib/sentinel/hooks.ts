import { useCallback, useSyncExternalStore } from "react";
import type { SentinelEvent, VirtualClock } from "./types";
import type { EventLog } from "./log";

/**
 * Minimal contract for any store that Sentinel can observe.
 * Zustand satisfies this shape via subscribe + getState.
 */
export type ObservableStore<State> = {
  subscribe(listener: () => void): () => void;
  getState(): State;
};

export type UseSentinelParams<State> = {
  readonly store: ObservableStore<State>;
  readonly eventLog: EventLog;
  readonly clock: VirtualClock;
  readonly semanticId: string;
  readonly role: string;
  readonly marketContextExtractor: (state: State) => SentinelEvent["marketContext"];
};

export type RecordInteraction = (payload: unknown) => void;

/**
 * Captures a synchronous snapshot of store state at the exact moment
 * of a UI interaction, preventing "tearing" during React 18 concurrent
 * rendering via useSyncExternalStore.
 */
export function useSentinel<State>(
  params: UseSentinelParams<State>,
): RecordInteraction {
  const { store, eventLog, clock, semanticId, role, marketContextExtractor } =
    params;

  // Subscribe to ensure synchronous snapshot consistency.
  useSyncExternalStore(store.subscribe, store.getState, store.getState);

  return useCallback(
    (payload: unknown) => {
      const snapshot = store.getState();
      const marketContext = marketContextExtractor(snapshot);

      eventLog.append({
        timestamp: clock.now(),
        type: "UI_ACTION",
        semanticId,
        role,
        payload,
        engineSnapshot: undefined,
        marketContext,
        accessibilityRef: "",
      });
    },
    [store, eventLog, clock, semanticId, role, marketContextExtractor],
  );
}
