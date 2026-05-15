/**
 * Public API for the telemetry system.
 *
 * Usage:
 * ```ts
 * import { telemetry } from "@/lib/telemetry";
 * telemetry.track("trade_opened", { side: "long", leverage: 10, size: 1000 });
 * ```
 *
 * Events are anonymized, batched, and sent to `/api/telemetry`.
 * In development, events are logged to console instead.
 */

import { TelemetryQueue } from "./queue";
import { hashId, obfuscateWallet, truncateTimestamp } from "./anonymizer";
import type { TelemetryEvent } from "./events";

const queue = new TelemetryQueue();

let sessionId = generateSessionId();

function generateSessionId(): string {
  return "s" + Math.random().toString(36).slice(2, 10);
}

function getUserId(): string {
  // In a real app, this would come from auth context
  // For now, we use a random ID per session
  return hashId(sessionId + navigator.userAgent);
}

/**
 * Tracks a telemetry event.
 *
 * @param eventName — one of the defined TelemetryEvent types
 * @param payload — event-specific data (merged with base metadata)
 *
 * @example
 * telemetry.track("trade_opened", { side: "long", leverage: 10, size: 1000, entryPrice: 50000 });
 */
export function track<T extends TelemetryEvent>(
  eventName: T["event"],
  payload: Omit<T, "event" | "ts" | "sessionId" | "userId">
): void {
  const event = {
    event: eventName,
    ts: truncateTimestamp(Date.now()),
    sessionId: hashId(sessionId),
    userId: getUserId(),
    ...payload,
  } as T;

  queue.push(event);
}

/**
 * Resets the session ID. Call this when a new simulation starts.
 */
export function resetSession(): void {
  sessionId = generateSessionId();
}

/**
 * Forces an immediate flush of the telemetry queue.
 * Useful before page unload or critical events.
 */
export function flush(): Promise<void> {
  return queue.flush();
}

/**
 * Destroys the telemetry queue. Call on app unmount.
 */
export function destroy(): void {
  queue.destroy();
}

export type { TelemetryEvent } from "./events";
export { hashId, obfuscateWallet } from "./anonymizer";
