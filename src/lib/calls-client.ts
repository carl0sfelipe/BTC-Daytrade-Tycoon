/**
 * Browser-side client for the called-shot API (/api/calls/*).
 * Best-effort: guests and offline players keep playing with the local
 * mirror in callsSlice; every helper swallows failures and returns null.
 */
import type { CallOutcome } from "@/lib/calls/call-transitions";
import { warnWhenRateLimitedResponse } from "@/lib/rate-limit-warning";

export interface OpenCallPayload {
  runId: string;
  side: "long" | "short";
  entryPrice: number;
  targetPrice: number;
  leverage: number;
}

export interface ServerCallResolution {
  outcome: CallOutcome;
  reward: number;
  streak: number;
  diamonds: number;
}

/**
 * Registers a declared call on the server. Returns the server call id,
 * or null for guests / network failures.
 *
 * @example const serverId = await openCallRequest({ runId, side, entryPrice, targetPrice, leverage });
 */
export async function openCallRequest(payload: OpenCallPayload): Promise<string | null> {
  try {
    const response = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    warnWhenRateLimitedResponse("/api/calls", response);
    if (!response.ok) return null;
    const data = (await response.json()) as { call?: { id: string } };
    return data.call?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Reports the outcome of a call. The server computes the authoritative
 * payout (streak, cooldown, per-run cap) and returns the new balance.
 *
 * @example const result = await resolveCallRequest(serverId, "hit");
 */
export async function resolveCallRequest(
  serverId: string,
  outcome: CallOutcome
): Promise<ServerCallResolution | null> {
  try {
    const response = await fetch(`/api/calls/${serverId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    warnWhenRateLimitedResponse(`/api/calls/${serverId}/resolve`, response);
    if (!response.ok) return null;
    const data = (await response.json()) as { result?: ServerCallResolution };
    return data.result ?? null;
  } catch {
    return null;
  }
}
