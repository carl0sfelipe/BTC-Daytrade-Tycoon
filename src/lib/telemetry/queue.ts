/**
 * In-memory telemetry queue with batch flushing.
 *
 * Buffers events and flushes them to the backend every 5 seconds
 * or when the buffer reaches 50 events.
 *
 * In production, failed flushes are retried up to 3 times.
 * In development, events are logged to console instead of sent.
 */

import type { TelemetryEvent } from "./events";

const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 50;
const MAX_RETRIES = 3;

export class TelemetryQueue {
  private buffer: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private retryCount = 0;
  private isProd = process.env.NODE_ENV === "production";

  constructor() {
    if (typeof window !== "undefined") {
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  push(event: TelemetryEvent): void {
    if (!this.isProd) {
      logger.log("[telemetry]", event.event, event);
      return;
    }

    this.buffer.push(event);
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const response = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.retryCount = 0;
    } catch (err) {
      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        this.buffer.unshift(...batch);
      } else {
        // Drop after max retries — telemetry is best-effort
        this.retryCount = 0;
      }
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Inline logger to avoid circular dependency
const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.log(...args);
  },
};
