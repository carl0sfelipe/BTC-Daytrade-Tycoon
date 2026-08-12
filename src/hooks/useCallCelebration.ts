"use client";

/**
 * Turns call resolutions into feedback toasts. The hit celebration is part of
 * the core loop, not polish (party 2026-08-12, Sally) — the diamond counter
 * pulse in the header fires from the same state change.
 */
import { useEffect, useRef } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { useToast } from "@/hooks/use-toast";
import { useGameMessages } from "@/hooks/useGameMessages";
import type { GameMessages } from "@/lib/i18n/game-locale";
import type { ResolvedCallSnapshot } from "@/store/slices/callsSlice";

interface CallResolutionToast {
  title: string;
  description: string;
  variant?: "destructive";
}

/**
 * Pure toast content for a resolved call — extracted from the effect so the
 * copy is locale-testable without rendering.
 *
 * @example buildCallResolutionToast(hit, enGameMessages).title // "💎 CALLED SHOT! +14"
 */
export function buildCallResolutionToast(
  result: ResolvedCallSnapshot,
  messages: GameMessages
): CallResolutionToast {
  const copy = messages.calledShot;
  if (result.outcome === "hit" && result.reward > 0) {
    return {
      title: copy.hitTitle(result.reward),
      description:
        result.streak > 1
          ? copy.hitStreakDescription(result.streak)
          : copy.hitFirstDescription,
    };
  }
  if (result.outcome === "hit") {
    return { title: copy.hitNoPayoutTitle, description: copy.hitNoPayoutDescription };
  }
  if (result.outcome === "missed") {
    return { title: copy.missedTitle, description: copy.missedDescription, variant: "destructive" };
  }
  return { title: copy.voidedTitle, description: copy.voidedDescription };
}

export function useCallCelebration(): void {
  const { toast } = useToast();
  const messages = useGameMessages();
  const lastCallResult = useTradingStore((s) => s.lastCallResult);
  const seenRef = useRef(0);

  useEffect(() => {
    if (!lastCallResult || lastCallResult.resolvedAt === seenRef.current) return;
    seenRef.current = lastCallResult.resolvedAt;
    toast(buildCallResolutionToast(lastCallResult, messages));
  }, [lastCallResult, toast, messages]);
}
