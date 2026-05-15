/**
 * Tick Event Log — structured per-tick event recording for debugging.
 *
 * Records the outcome of every tick so developers can trace exactly why
 * a liquidation, limit fill, TP/SL, or trailing stop fired.
 *
 * Uses a ring buffer (circular array) to bound memory. Zero-allocation
 * after warmup — pre-allocates N slots and overwrites old ones.
 *
 * In development: exposed via window.__tickEvents for console debugging.
 * In production: ring buffer of last 1000 ticks, auto-discards old events.
 */

export interface TickEvent {
  tickId: number;
  simulatedTimeSec: number;
  price: number;
  candleLow: number;
  candleHigh: number;
  checks: TickCheck[];
}

export interface TickCheck {
  type: "liquidation" | "trailing_stop" | "sl" | "tp" | "limit_fill" | "pending_orders";
  triggered: boolean;
  details?: Record<string, unknown>;
}

const RING_BUFFER_SIZE = 1000;

export class TickEventLog {
  private buffer: (TickEvent | null)[];
  private writeIndex = 0;
  private tickId = 0;
  private filled = false;

  constructor(size = RING_BUFFER_SIZE) {
    this.buffer = new Array(size).fill(null);
  }

  /**
   * Record a tick event. Overwrites the oldest event when buffer is full.
   */
  push(event: Omit<TickEvent, "tickId">): TickEvent {
    const fullEvent: TickEvent = { ...event, tickId: this.tickId++ };
    this.buffer[this.writeIndex] = fullEvent;
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    if (this.writeIndex === 0) this.filled = true;
    return fullEvent;
  }

  /**
   * Get all events in chronological order (oldest → newest).
   */
  getEvents(): TickEvent[] {
    const size = this.buffer.length;
    if (!this.filled) {
      return this.buffer.slice(0, this.writeIndex).filter(Boolean) as TickEvent[];
    }
    const ordered: TickEvent[] = [];
    for (let i = 0; i < size; i++) {
      const idx = (this.writeIndex + i) % size;
      const ev = this.buffer[idx];
      if (ev) ordered.push(ev);
    }
    return ordered;
  }

  /**
   * Get the last N events (newest first).
   */
  getLast(n: number): TickEvent[] {
    const all = this.getEvents();
    return all.slice(-n).reverse();
  }

  /**
   * Find events where a specific check type triggered.
   */
  findTriggered(type: TickCheck["type"]): TickEvent[] {
    return this.getEvents().filter((ev) =>
      ev.checks.some((c) => c.type === type && c.triggered)
    );
  }

  clear(): void {
    this.buffer.fill(null);
    this.writeIndex = 0;
    this.tickId = 0;
    this.filled = false;
  }

  get size(): number {
    return this.filled ? this.buffer.length : this.writeIndex;
  }
}

/**
 * Global singleton — one log per browser session.
 * Reset when a new simulation starts.
 */
export const tickEventLog = new TickEventLog();

/**
 * Reset the log. Call when a new simulation starts.
 */
export function resetTickEventLog(size?: number): void {
  tickEventLog.clear();
  if (size && size !== RING_BUFFER_SIZE) {
    // Re-create with custom size if needed
    (tickEventLog as unknown as { buffer: (TickEvent | null)[] }).buffer = new Array(size).fill(null);
  }
}

/**
 * Dev-only: expose tick events on window for console debugging.
 */
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __tickEvents?: TickEventLog }).__tickEvents = tickEventLog;
}
