/**
 * Browser-side observability for rate limiting. The API clients stay
 * best-effort and silent for the player (guests keep playing on the local
 * mirror), but a 429 must be visible in the console so a fast legit player
 * losing a payout to the limiter is diagnosable instead of a mystery.
 */

/**
 * Emits a structured warning when a mutation endpoint answered 429.
 * No-op for every other status — callers keep their silent-failure contract.
 *
 * @example warnWhenRateLimitedResponse("/api/calls", response);
 */
export function warnWhenRateLimitedResponse(endpoint: string, response: Response): void {
  if (response.status !== 429) {
    return;
  }
  console.warn(
    JSON.stringify({
      event: "rate_limited",
      endpoint,
      retryAfterSeconds: response.headers.get("Retry-After"),
    })
  );
}
