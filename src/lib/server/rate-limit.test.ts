import { describe, it, expect } from "vitest";
import {
  computeRateLimitDecision,
  enforceRateLimit,
  InMemoryRateLimitStore,
  type RateLimitRule,
} from "./rate-limit";

const RULE: RateLimitRule = { limit: 3, windowMs: 60_000 };

describe("computeRateLimitDecision", () => {
  it("allows when under the limit and reports remaining after this hit", () => {
    const decision = computeRateLimitDecision(RULE, [1_000], 2_000);
    expect(decision).toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });
  });

  it("allows the very first request with limit - 1 remaining", () => {
    const decision = computeRateLimitDecision(RULE, [], 1_000);
    expect(decision).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
  });

  it("blocks at the limit with zero remaining", () => {
    const decision = computeRateLimitDecision(RULE, [1_000, 2_000, 3_000], 4_000);
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
  });

  it("computes retryAfterSeconds from when the oldest hit leaves the window", () => {
    // Oldest hit at 10_000 expires at 70_000; now is 40_500 → 29.5s → ceil 30.
    const decision = computeRateLimitDecision(RULE, [10_000, 20_000, 30_000], 40_500);
    expect(decision.retryAfterSeconds).toBe(30);
  });
});

describe("InMemoryRateLimitStore", () => {
  it("lists only hits strictly after since", () => {
    const store = new InMemoryRateLimitStore(60_000);
    store.recordHit("key", 1_000);
    store.recordHit("key", 2_000);
    expect(store.listHits("key", 1_000)).toEqual([2_000]);
  });

  it("prunes hits older than the retention on recordHit", () => {
    const store = new InMemoryRateLimitStore(60_000);
    store.recordHit("key", 1_000);
    store.recordHit("key", 2_000);
    store.recordHit("key", 70_000);
    // Hits at 1_000 and 2_000 are beyond retention at t=70_000 and must be gone.
    expect(store.listHits("key", 0)).toEqual([70_000]);
  });

  it("isolates hits by key", () => {
    const store = new InMemoryRateLimitStore(60_000);
    store.recordHit("user-a", 1_000);
    expect(store.listHits("user-b", 0)).toEqual([]);
    expect(store.listHits("user-a", 0)).toEqual([1_000]);
  });

  it("sweeps expired keys once the tracked-key cap is exceeded", () => {
    const store = new InMemoryRateLimitStore(60_000, 2);
    store.recordHit("stale-a", 1_000);
    store.recordHit("stale-b", 2_000);
    // Third key pushes the Map past the cap at t=70_000; both stale keys'
    // newest hits are outside the 60s retention and must be dropped.
    store.recordHit("fresh-c", 70_000);
    expect(store.trackedKeyCount()).toBe(1);
    expect(store.listHits("stale-a", 0)).toEqual([]);
    expect(store.listHits("fresh-c", 0)).toEqual([70_000]);
  });

  it("keeps keys with in-window hits during the sweep", () => {
    const store = new InMemoryRateLimitStore(60_000, 2);
    store.recordHit("active-a", 1_000);
    store.recordHit("active-b", 1_100);
    store.recordHit("active-c", 1_200);
    expect(store.trackedKeyCount()).toBe(3);
    expect(store.listHits("active-a", 0)).toEqual([1_000]);
  });
});

describe("enforceRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const store = new InMemoryRateLimitStore(RULE.windowMs);
    expect(enforceRateLimit(store, RULE, "ip", 1_000).allowed).toBe(true);
    expect(enforceRateLimit(store, RULE, "ip", 2_000).allowed).toBe(true);
    expect(enforceRateLimit(store, RULE, "ip", 3_000).allowed).toBe(true);
    expect(enforceRateLimit(store, RULE, "ip", 4_000).allowed).toBe(false);
  });

  it("slides the window: quota frees up as old hits expire", () => {
    const store = new InMemoryRateLimitStore(RULE.windowMs);
    enforceRateLimit(store, RULE, "ip", 1_000);
    enforceRateLimit(store, RULE, "ip", 2_000);
    enforceRateLimit(store, RULE, "ip", 3_000);
    expect(enforceRateLimit(store, RULE, "ip", 4_000).allowed).toBe(false);
    // At 61_500 the hit from 1_000 has left the window — one slot free again.
    expect(enforceRateLimit(store, RULE, "ip", 61_500).allowed).toBe(true);
  });

  it("regression: blocked retries do not extend the window", () => {
    const store = new InMemoryRateLimitStore(RULE.windowMs);
    enforceRateLimit(store, RULE, "ip", 1_000);
    enforceRateLimit(store, RULE, "ip", 1_100);
    enforceRateLimit(store, RULE, "ip", 1_200);
    // A retrying client hammers while blocked; if these were recorded the
    // window would refresh forever and the client would never get back in.
    for (let retryMs = 2_000; retryMs < 61_000; retryMs += 5_000) {
      expect(enforceRateLimit(store, RULE, "ip", retryMs).allowed).toBe(false);
    }
    expect(enforceRateLimit(store, RULE, "ip", 61_300).allowed).toBe(true);
  });
});
