"use client";

/**
 * Turns call resolutions into feedback toasts. The hit celebration is part of
 * the core loop, not polish (party 2026-08-12, Sally) — the diamond counter
 * pulse in the header fires from the same state change.
 */
import { useEffect, useRef } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { useToast } from "@/hooks/use-toast";

export function useCallCelebration(): void {
  const { toast } = useToast();
  const lastCallResult = useTradingStore((s) => s.lastCallResult);
  const seenRef = useRef(0);

  useEffect(() => {
    if (!lastCallResult || lastCallResult.resolvedAt === seenRef.current) return;
    seenRef.current = lastCallResult.resolvedAt;

    if (lastCallResult.outcome === "hit") {
      if (lastCallResult.reward > 0) {
        toast({
          title: `💎 CALLED SHOT! +${lastCallResult.reward}`,
          description:
            lastCallResult.streak > 1
              ? `Streak ×${lastCallResult.streak} — next hit pays more`
              : "Prediction nailed — diamonds banked",
        });
      } else {
        toast({
          title: "🎯 Called shot hit",
          description: "No payout — reward cooldown or run cap reached",
        });
      }
    } else if (lastCallResult.outcome === "missed") {
      toast({
        title: "🎯 Called shot missed",
        description: "Streak reset — call the next one",
        variant: "destructive",
      });
    } else {
      toast({
        title: "🎯 Called shot voided",
        description: "Exited early or moved the TP — no payout, streak kept",
      });
    }
  }, [lastCallResult, toast]);
}
