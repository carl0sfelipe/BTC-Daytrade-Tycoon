import type { SentinelEvent } from "./types";

/**
 * Append-only event log with strict monotonic sequence IDs.
 */
export type EventLogConfig = {
  readonly maxSize: number;
  readonly onFlush: (events: ReadonlyArray<SentinelEvent>) => void;
  readonly flushIntervalMs: number;
};

export function createEventLog(config: EventLogConfig) {
  let sequence = 0;
  let buffer: SentinelEvent[] = [];
  let allEvents: SentinelEvent[] = [];
  let sealed = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  function generateUuid(): string {
    return crypto.randomUUID();
  }

  function nextSequenceId(): number {
    sequence += 1;
    return sequence;
  }

  function append(event: Omit<SentinelEvent, "id" | "sequenceId">): void {
    if (sealed) {
      throw new Error("EventLog is sealed; cannot append new events");
    }

    const enriched: SentinelEvent = {
      ...event,
      id: generateUuid(),
      sequenceId: nextSequenceId(),
    };

    buffer.push(enriched);
    allEvents.push(enriched);

    if (buffer.length >= config.maxSize) {
      flush();
    }
  }

  function flush(): void {
    if (buffer.length === 0) return;

    const snapshot = Object.freeze([...buffer]);
    config.onFlush(snapshot);
    buffer = [];
  }

  function seal(): void {
    sealed = true;
    flush();
  }

  function startAutoFlush(): void {
    if (flushTimer) return;

    flushTimer = setInterval(() => {
      flush();
    }, config.flushIntervalMs);
  }

  function stopAutoFlush(): void {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  function getPendingCount(): number {
    return buffer.length;
  }

  function getEvents(): readonly SentinelEvent[] {
    return Object.freeze([...allEvents]);
  }

  return {
    append,
    flush,
    seal,
    startAutoFlush,
    stopAutoFlush,
    getPendingCount,
    getEvents,
  };
}

export type EventLog = ReturnType<typeof createEventLog>;
