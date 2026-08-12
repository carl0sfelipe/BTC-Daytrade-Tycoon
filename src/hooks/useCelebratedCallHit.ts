"use client";

/**
 * Shared "celebration window" for rewarded called-shot hits. DiamondBurst
 * (overlay) and DiamondCounter (header glow) both need the same dedupe +
 * auto-expire behavior, so it lives here once instead of twice.
 */
import { useEffect, useRef, useState } from "react";
import { useTradingStore } from "@/store/tradingStore";
import type { ResolvedCallSnapshot } from "@/store/slices/callsSlice";

/**
 * True only for a hit that actually paid diamonds — misses, voids and
 * zero-reward hits (cooldown / run cap) must not trigger celebration UI.
 *
 * Example: isRewardedCallHit({ outcome: "hit", reward: 25, ... }) // → true
 */
export function isRewardedCallHit(
  snapshot: ResolvedCallSnapshot | null | undefined,
): snapshot is ResolvedCallSnapshot {
  if (!snapshot) return false;
  return snapshot.outcome === "hit" && snapshot.reward > 0;
}

/**
 * Exposes the latest rewarded called-shot hit for `durationMs` after it
 * resolves, then reverts to null. Dedupes by resolvedAt so re-renders and
 * server reconciliation echoes never replay a burst; the expiry timer is
 * cleared on unmount.
 *
 * Example: const hit = useCelebratedCallHit(1400); // render burst while hit !== null
 */
export function useCelebratedCallHit(durationMs: number): ResolvedCallSnapshot | null {
  const lastCallResult = useTradingStore((s) => s.lastCallResult);
  const [celebratedHit, setCelebratedHit] = useState<ResolvedCallSnapshot | null>(null);
  const seenResolvedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRewardedCallHit(lastCallResult)) return;
    if (seenResolvedAtRef.current === lastCallResult.resolvedAt) return;
    seenResolvedAtRef.current = lastCallResult.resolvedAt;
    setCelebratedHit(lastCallResult);
    const expireTimer = setTimeout(() => setCelebratedHit(null), durationMs);
    return () => clearTimeout(expireTimer);
  }, [lastCallResult, durationMs]);

  return celebratedHit;
}
