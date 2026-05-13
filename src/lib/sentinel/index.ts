/**
 * Sentinel integration for BTC-Daytrade-Tycoon.
 *
 * Minimal deterministic event-sourcing layer that enables:
 *   - Frozen virtual clock for replay
 *   - Synchronous state capture on UI interactions
 *   - Append-only event log with monotonic sequence IDs
 */

export type { EventCategory, MarketContext, EngineStateDelta, SentinelEvent, VirtualClock } from "./types";
export * from "./clock";
export * from "./diff";
export * from "./log";
export { useSentinel, type UseSentinelParams, type RecordInteraction, type ObservableStore } from "./hooks";
export { SentinelProvider, useSentinelContext } from "./provider";
export type { SentinelProviderProps, SentinelContextValue } from "./provider";
export { exportSentinelSession, downloadSession } from "./session";
export type { SentinelSession } from "./session";
