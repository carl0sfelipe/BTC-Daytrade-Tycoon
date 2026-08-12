"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/store/tradingStore";
import { useCelebratedCallHit } from "@/hooks/useCelebratedCallHit";

// Glow window tracks the DiamondBurst banner (~1.2s) so header and overlay
// peak together instead of flashing out of sync.
const HIT_GLOW_DURATION_MS = 1200;

/**
 * Pill classes for the diamond counter; a rewarded called-shot hit gets an
 * accent glow for the celebration window, then falls back to the quiet border.
 *
 * Example: computeDiamondPillClass(true) // → "... border-crypto-accent"
 */
export function computeDiamondPillClass(isGlowing: boolean): string {
  const basePillClass =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-crypto-accent-dim border transition-shadow duration-300";
  if (isGlowing) return `${basePillClass} shadow-[0_0_18px] shadow-crypto-accent/60 border-crypto-accent`;
  return `${basePillClass} border-crypto-accent/20`;
}

/**
 * Header 💎 balance. Re-mounting the span on every balance change gives the
 * "diamonds landing" pulse the celebration needs (party 2026-08-12, Sally).
 */
export default function DiamondCounter() {
  const diamonds = useTradingStore((s) => s.diamonds);
  const callStreak = useTradingStore((s) => s.callStreak);
  const rewardedHit = useCelebratedCallHit(HIT_GLOW_DURATION_MS);

  return (
    <div
      title="Diamonds — earn them by hitting called shots"
      data-testid="diamond-counter"
      className={computeDiamondPillClass(rewardedHit !== null)}
    >
      <span className="text-sm leading-none">💎</span>
      <motion.span
        key={diamonds}
        data-testid="diamond-counter-value"
        initial={{ scale: 1.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className="text-sm font-bold font-mono text-crypto-accent tabular-nums"
      >
        {diamonds}
      </motion.span>
      {callStreak > 1 && (
        <span className="text-[10px] font-bold text-crypto-warning" title={`Called-shot streak ×${callStreak}`}>
          🎯×{callStreak}
        </span>
      )}
    </div>
  );
}
