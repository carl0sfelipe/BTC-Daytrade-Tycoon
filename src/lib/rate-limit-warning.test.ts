import { describe, it, expect, vi, afterEach } from "vitest";
import { warnWhenRateLimitedResponse } from "./rate-limit-warning";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("warnWhenRateLimitedResponse", () => {
  it("logs a structured JSON warning on 429 with the Retry-After value", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "42" },
    });

    warnWhenRateLimitedResponse("/api/calls", response);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string) as Record<string, string>;
    expect(logged).toEqual({
      event: "rate_limited",
      endpoint: "/api/calls",
      retryAfterSeconds: "42",
    });
  });

  it("stays silent for non-429 responses", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnWhenRateLimitedResponse("/api/sessions", new Response(null, { status: 401 }));
    warnWhenRateLimitedResponse("/api/sessions", new Response(null, { status: 500 }));
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
