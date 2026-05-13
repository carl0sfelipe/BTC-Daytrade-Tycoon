/**
 * Core types for Sentinel integration in BTC-Daytrade-Tycoon.
 *
 * Minimal subset of the full Sentinel framework, adapted for
 * direct use without external dependencies.
 */

export type EventCategory = "UI_ACTION" | "ENGINE_CHANGE" | "MARKET_TICK";

export type MarketContext = {
  readonly price: number;
  readonly indexPrice: number;
  readonly timestamp: number;
};

export type EngineStateDelta = {
  readonly changedPaths: ReadonlyArray<{
    readonly path: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
  }>;
  readonly isCheckpoint: boolean;
};

export type SentinelEvent = {
  readonly id: string;
  readonly sequenceId: number;
  readonly timestamp: number;
  readonly type: EventCategory;
  readonly semanticId: string;
  readonly role: string;
  readonly payload: unknown;
  readonly engineSnapshot: EngineStateDelta | undefined;
  readonly marketContext: MarketContext;
  readonly accessibilityRef: string;
};

export type ObservableStore<State> = {
  subscribe(listener: () => void): () => void;
  getState(): State;
};

export type VirtualClock = {
  now(): number;
  advance(ms: number): void;
  setTime(ts: number): void;
  getElapsed(): number;
};
