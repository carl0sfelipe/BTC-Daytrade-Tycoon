import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { InMemoryRateLimitStore } from "./rate-limit";
import {
  RATE_LIMIT_RULES,
  rejectWhenRateLimited,
  resolveClientIp,
} from "./request-rate-limit";

function buildRequest(init?: {
  headers?: Record<string, string>;
  ip?: string;
}): NextRequest {
  return new NextRequest("http://localhost/api/test", init);
}

describe("resolveClientIp", () => {
  it("takes the last hop of x-forwarded-for (appended by the trusted proxy)", () => {
    const request = buildRequest({ headers: { "x-forwarded-for": "10.0.0.1, 203.0.113.5" } });
    expect(resolveClientIp(request)).toBe("203.0.113.5");
  });

  it("ignores client-spoofed hops on the left of the header", () => {
    // An attacker sends fake hops; the trusted proxy appends the real
    // address last — rotating the fakes must not change the resolved key.
    const spoofed = buildRequest({
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1, 198.51.100.7" },
    });
    const spoofedAgain = buildRequest({
      headers: { "x-forwarded-for": "5.6.7.8, 172.16.0.9, 198.51.100.7" },
    });
    expect(resolveClientIp(spoofed)).toBe("198.51.100.7");
    expect(resolveClientIp(spoofedAgain)).toBe("198.51.100.7");
  });

  it("trims a single-value header", () => {
    const request = buildRequest({ headers: { "x-forwarded-for": " 198.51.100.7 " } });
    expect(resolveClientIp(request)).toBe("198.51.100.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = buildRequest({ headers: { "x-real-ip": "192.0.2.33" } });
    expect(resolveClientIp(request)).toBe("192.0.2.33");
  });

  it("falls back to request.ip when no proxy header exists", () => {
    expect(resolveClientIp(buildRequest({ ip: "192.0.2.99" }))).toBe("192.0.2.99");
  });

  it("prefers proxy headers over request.ip", () => {
    const request = buildRequest({
      headers: { "x-forwarded-for": "10.0.0.1, 203.0.113.5" },
      ip: "192.0.2.99",
    });
    expect(resolveClientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to unknown with no header and no request.ip (local dev)", () => {
    expect(resolveClientIp(buildRequest())).toBe("unknown");
  });

  it("skips an empty x-forwarded-for header", () => {
    const request = buildRequest({ headers: { "x-forwarded-for": "" }, ip: "192.0.2.99" });
    expect(resolveClientIp(request)).toBe("192.0.2.99");
  });
});

describe("rejectWhenRateLimited", () => {
  it("returns null while the client is under the limit", () => {
    const store = new InMemoryRateLimitStore(RATE_LIMIT_RULES.missionClaim.windowMs);
    for (let hit = 0; hit < RATE_LIMIT_RULES.missionClaim.limit; hit += 1) {
      expect(rejectWhenRateLimited("missionClaim", "user-1", store, 1_000 + hit)).toBeNull();
    }
  });

  it("returns 429 with Retry-After and a message naming limit and window", async () => {
    const store = new InMemoryRateLimitStore(RATE_LIMIT_RULES.authLogin.windowMs);
    for (let hit = 0; hit < RATE_LIMIT_RULES.authLogin.limit; hit += 1) {
      rejectWhenRateLimited("authLogin", "1.2.3.4", store, 1_000);
    }
    const response = rejectWhenRateLimited("authLogin", "1.2.3.4", store, 61_000);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    // Oldest hit at 1_000 + 15min window − now 61_000 = 840s.
    expect(response?.headers.get("Retry-After")).toBe("840");
    const body = (await response?.json()) as { error: string };
    expect(body.error).toContain("authLogin");
    expect(body.error).toContain("10 requests");
    expect(body.error).toContain("15 minutes");
    expect(body.error).toContain("840s");
  });

  it("describes hour-long windows in hours", async () => {
    const store = new InMemoryRateLimitStore(RATE_LIMIT_RULES.authSignup.windowMs);
    for (let hit = 0; hit < RATE_LIMIT_RULES.authSignup.limit; hit += 1) {
      rejectWhenRateLimited("authSignup", "1.2.3.4", store, 1_000);
    }
    const response = rejectWhenRateLimited("authSignup", "1.2.3.4", store, 2_000);
    const body = (await response?.json()) as { error: string };
    expect(body.error).toContain("5 requests");
    expect(body.error).toContain("1 hour");
  });

  it("keeps buckets apart when the same clientKey hits different rules", () => {
    const store = new InMemoryRateLimitStore(RATE_LIMIT_RULES.authSignup.windowMs);
    for (let hit = 0; hit < RATE_LIMIT_RULES.sessionSave.limit; hit += 1) {
      rejectWhenRateLimited("sessionSave", "user-1", store, 1_000);
    }
    expect(rejectWhenRateLimited("sessionSave", "user-1", store, 2_000)).not.toBeNull();
    // Exhausting sessionSave must not consume the missionClaim budget.
    expect(rejectWhenRateLimited("missionClaim", "user-1", store, 2_000)).toBeNull();
  });

  it("shares one budget across routes using the same rule name", () => {
    // POST /api/calls and POST /api/calls/[id]/resolve both use callMutations;
    // the combined traffic must drain a single bucket.
    const store = new InMemoryRateLimitStore(RATE_LIMIT_RULES.callMutations.windowMs);
    for (let hit = 0; hit < RATE_LIMIT_RULES.callMutations.limit; hit += 1) {
      expect(rejectWhenRateLimited("callMutations", "user-1", store, 1_000 + hit)).toBeNull();
    }
    expect(rejectWhenRateLimited("callMutations", "user-1", store, 2_000)).not.toBeNull();
  });
});
