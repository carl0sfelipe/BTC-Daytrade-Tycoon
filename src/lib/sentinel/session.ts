import type { SentinelEvent, VirtualClock } from "./types";

/**
 * Portable session format for deterministic replay.
 */
export type SentinelSession = {
  readonly header: {
    readonly appVersion: string;
    readonly sentinelVersion: string;
    readonly startTime: number;
    readonly initialClockTime: number;
    readonly rngSeed: string;
  };
  readonly events: ReadonlyArray<SentinelEvent>;
};

/**
 * Consolidate captured events into a downloadable session file.
 */
export function exportSentinelSession(
  events: ReadonlyArray<SentinelEvent>,
  clock: VirtualClock,
): SentinelSession {
  return {
    header: {
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
      sentinelVersion: "0.1.0",
      startTime: clock.now(),
      initialClockTime: clock.now(),
      rngSeed: "", // TODO: capture Math.random seed if used
    },
    events,
  };
}

/**
 * Trigger a browser download of the session JSON.
 */
export function downloadSession(session: SentinelSession, filename?: string): void {
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `sentinel-session-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
