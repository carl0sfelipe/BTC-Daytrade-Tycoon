/**
 * Sliding-window rate limiting with injectable storage.
 *
 * LIMITATION: InMemoryRateLimitStore keeps hits per process, so on a
 * multi-instance / serverless deploy each instance enforces its own window
 * and the effective limit is best-effort (limit × instances). The
 * RateLimitStore interface exists precisely so a Redis-backed store can be
 * swapped in without touching callers — deploy debt of the same class as
 * the SQLite → Postgres migration.
 */

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  /** Hits for `key` strictly after `since` (a hit exactly windowMs old has expired). */
  listHits(key: string, since: number): number[];
  recordHit(key: string, nowMs: number): void;
}

/**
 * Pure sliding-window decision over the hits already inside the window.
 * `remaining` counts requests still available after this one is consumed.
 *
 * @example computeRateLimitDecision({ limit: 5, windowMs: 60_000 }, [1_000], 2_000)
 */
export function computeRateLimitDecision(
  rule: RateLimitRule,
  timestampsInWindow: number[],
  nowMs: number
): RateLimitDecision {
  const hitCount = timestampsInWindow.length;
  if (hitCount < rule.limit) {
    return { allowed: true, remaining: rule.limit - hitCount - 1, retryAfterSeconds: 0 };
  }
  const oldestHitMs = Math.min(...timestampsInWindow);
  const retryAfterMs = oldestHitMs + rule.windowMs - nowMs;
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

const DEFAULT_MAX_TRACKED_KEYS = 10_000;

/**
 * Per-process hit storage. `retentionMs` should be the longest window the
 * store serves; recordHit prunes anything older so long-lived processes
 * do not accumulate unbounded timestamps. When more than `maxTrackedKeys`
 * keys are tracked, recordHit also sweeps out keys whose newest hit already
 * left the retention window — keys of one-off clients are otherwise never
 * touched again and would grow the Map forever (audit finding).
 *
 * @example const store = new InMemoryRateLimitStore(60 * 60 * 1000);
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly hitsByKey = new Map<string, number[]>();

  constructor(
    private readonly retentionMs: number,
    private readonly maxTrackedKeys: number = DEFAULT_MAX_TRACKED_KEYS
  ) {}

  listHits(key: string, since: number): number[] {
    const hits = this.hitsByKey.get(key) ?? [];
    return hits.filter((timestampMs) => timestampMs > since);
  }

  recordHit(key: string, nowMs: number): void {
    const freshHits = this.listHits(key, nowMs - this.retentionMs);
    freshHits.push(nowMs);
    this.hitsByKey.set(key, freshHits);
    if (this.hitsByKey.size > this.maxTrackedKeys) {
      this.sweepExpiredKeys(nowMs - this.retentionMs);
    }
  }

  /**
   * Number of keys currently held — exposed so tests can observe the sweep.
   *
   * @example expect(store.trackedKeyCount()).toBe(1);
   */
  trackedKeyCount(): number {
    return this.hitsByKey.size;
  }

  private sweepExpiredKeys(cutoffMs: number): void {
    for (const [key, hits] of this.hitsByKey) {
      const newestHitMs = Math.max(...hits);
      if (newestHitMs <= cutoffMs) {
        this.hitsByKey.delete(key);
      }
    }
  }
}

/**
 * Reads the window from the store, decides, and consumes quota.
 *
 * @example const decision = enforceRateLimit(store, { limit: 10, windowMs: 60_000 }, "login:1.2.3.4");
 */
export function enforceRateLimit(
  store: RateLimitStore,
  rule: RateLimitRule,
  key: string,
  nowMs: number = Date.now()
): RateLimitDecision {
  const windowHits = store.listHits(key, nowMs - rule.windowMs);
  const decision = computeRateLimitDecision(rule, windowHits, nowMs);
  // Only allowed requests consume quota — recording blocked retries would
  // keep refreshing the window and lock a retrying client out forever.
  if (decision.allowed) {
    store.recordHit(key, nowMs);
  }
  return decision;
}
