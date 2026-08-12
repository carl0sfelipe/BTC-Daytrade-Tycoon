"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/store/tradingStore";
import { useGameMessages } from "@/hooks/useGameMessages";

/**
 * Persistent chip while a called shot is live — the player must always know
 * they have a declared prediction on the table (party 2026-08-12, Sally).
 */
export default function CalledShotStatus() {
  const activeCall = useTradingStore((s) => s.activeCall);
  const messages = useGameMessages();
  if (!activeCall) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="called-shot-status"
      className="flex items-center justify-between px-3 py-2 rounded-lg bg-crypto-accent-dim border border-crypto-accent/40"
    >
      <span className="text-xs font-semibold text-crypto-accent">
        {messages.calledShot.liveChip(
          `${activeCall.side === "long" ? "+" : "−"}${activeCall.targetPercent.toFixed(1)}%`,
          activeCall.leverage
        )}
      </span>
      <span className="text-xs font-bold font-mono text-crypto-accent">
        {activeCall.potentialReward} 💎
      </span>
    </motion.div>
  );
}
