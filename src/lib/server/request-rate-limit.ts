/**
 * Bridge between the pure rate-limit core and Next.js route handlers:
 * per-route-class rules, client IP resolution, and the 429 response shape.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  enforceRateLimit,
  InMemoryRateLimitStore,
  type RateLimitRule,
  type RateLimitStore,
} from "./rate-limit";

/**
 * Anchor values per abuse class flagged in the security audits (login brute
 * force, forged-session diamond faucet, leaderboard spam). Tunable — adjust
 * with real traffic data, none is a product requirement.
 */
export const RATE_LIMIT_RULES = {
  authSignup: { limit: 5, windowMs: 60 * 60 * 1000 },
  authLogin: { limit: 10, windowMs: 15 * 60 * 1000 },
  // 60, not 30: open + resolve consume 2 hits per called shot and a hedge
  // flip chains them — 30/min silently cost fast legit players their payout.
  callMutations: { limit: 60, windowMs: 60 * 1000 },
  sessionSave: { limit: 6, windowMs: 10 * 60 * 1000 },
  missionClaim: { limit: 10, windowMs: 60 * 1000 },
  // Coarse per-IP pre-filter on per-user routes, checked BEFORE auth so
  // unauthenticated spam is rejected without the session lookup hitting the DB.
  mutationBurst: { limit: 60, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitRuleName = keyof typeof RATE_LIMIT_RULES;

const longestWindowMs = Math.max(
  ...Object.values(RATE_LIMIT_RULES).map((rule) => rule.windowMs)
);

/** One store per process — see rate-limit.ts for the multi-instance caveat. */
const processRateLimitStore = new InMemoryRateLimitStore(longestWindowMs);

/**
 * Client IP for per-IP limiting.
 *
 * Threat model: clients can send x-forwarded-for themselves, and each trusted
 * proxy APPENDS the address it saw — so the left side of the list is
 * attacker-controlled and only the LAST hop was written by our own proxy.
 * Taking the first hop would let an attacker rotate fake IPs in the header
 * and reset per-IP auth limits at will (audit finding).
 *
 * Fallbacks: x-real-ip (single-value proxy convention), then request.ip
 * (runtimes with a direct connection populate it). "unknown" remains only
 * for local dev, where all traffic shares one bucket — residual risk: a
 * proxyless deploy without request.ip would let one abuser exhaust the
 * shared bucket for everyone. Deploy behind a proxy that sets these headers.
 *
 * @example const ip = resolveClientIp(request);
 */
export function resolveClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const proxyAppendedHop = forwardedFor?.split(",").pop()?.trim();
  if (proxyAppendedHop) {
    return proxyAppendedHop;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return request.ip ?? "unknown";
}

function describeRuleWindow(windowMs: number): string {
  const minutes = windowMs / 60_000;
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = minutes / 60;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Early-return guard for route handlers: null when the request may proceed,
 * otherwise a ready 429 response with a Retry-After header.
 *
 * The store is injectable for tests but defaults to the process singleton.
 *
 * @example
 * const limited = rejectWhenRateLimited("authLogin", resolveClientIp(request));
 * if (limited) return limited;
 */
export function rejectWhenRateLimited(
  ruleName: RateLimitRuleName,
  clientKey: string,
  store: RateLimitStore = processRateLimitStore,
  nowMs: number = Date.now()
): NextResponse | null {
  const rule = RATE_LIMIT_RULES[ruleName];
  // Rule name in the key keeps buckets apart when the same clientKey (an IP
  // or userId) is limited by more than one rule.
  const decision = enforceRateLimit(store, rule, `${ruleName}:${clientKey}`, nowMs);
  if (decision.allowed) {
    return null;
  }
  const message =
    `Rate limit exceeded for ${ruleName}: got more than ${rule.limit} requests ` +
    `in ${describeRuleWindow(rule.windowMs)}. Retry in ${decision.retryAfterSeconds}s.`;
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } }
  );
}
