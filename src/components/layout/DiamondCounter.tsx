"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/store/tradingStore";

/**
 * Header 💎 balance. Re-mounting the span on every balance change gives the
 * "diamonds landing" pulse the celebration needs (party 2026-08-12, Sally).
 */
export default function DiamondCounter() {
  const diamonds = useTradingStore((s) => s.diamonds);
  const callStreak = useTradingStore((s) => s.callStreak);

  return (
    <div
      title="Diamonds — earn them by hitting called shots"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-crypto-accent-dim border border-crypto-accent/20"
    >
      <span className="text-sm leading-none">💎</span>
      <motion.span
        key={diamonds}
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
