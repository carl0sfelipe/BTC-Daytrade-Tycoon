"use client";

import { useTradingStore } from "@/store/tradingStore";
import { computeRunCallStats, type RunCallStats } from "@/lib/calls/run-call-stats";

function formatRunCallHitRate(hitRate: number | null): string {
  if (hitRate === null) return "—";
  return `${Math.round(hitRate * 100)}%`;
}

function RunCallStatCell({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex flex-col text-center">
      <span className="text-[10px] text-crypto-text-muted uppercase">{label}</span>
      <span className={`text-sm font-bold font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

function RunCallEmptyInvite() {
  return (
    <p className="text-sm text-crypto-text-muted">
      No called shots this run — declare a target next run to earn 💎
    </p>
  );
}

function RunCallStatsRecap({ stats }: { stats: RunCallStats }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-crypto-text-secondary">Diamonds Earned</span>
        <span className="text-3xl font-bold font-mono text-purple-300">+{stats.diamondsEarned} 💎</span>
      </div>
      <div className="grid grid-cols-4 gap-3 pt-2 border-t border-purple-500/20">
        <RunCallStatCell label="Hits" value={`${stats.hits}`} valueClass="text-crypto-long" />
        <RunCallStatCell label="Misses" value={`${stats.misses}`} valueClass="text-crypto-short" />
        <RunCallStatCell label="Voided" value={`${stats.voided}`} valueClass="text-crypto-text-muted" />
        <RunCallStatCell label="Hit Rate" value={formatRunCallHitRate(stats.hitRate)} valueClass="text-purple-300" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
        <span className="text-[10px] text-crypto-text-muted uppercase">Best Streak</span>
        <span className="text-sm font-bold font-mono text-purple-300">
          {stats.bestStreak >= 2 ? "🔥 " : ""}{stats.bestStreak}
        </span>
      </div>
    </>
  );
}

/**
 * End-of-run "Called Shots" recap: diamonds earned, hit/miss/void counts,
 * hit rate and best streak — the roguelike hook surfaced in EndSimulationModal.
 *
 * @example <RunCallSummary />  // reads runCallLog from the trading store
 */
export default function RunCallSummary() {
  const runCallLog = useTradingStore((s) => s.runCallLog);
  const stats = computeRunCallStats(runCallLog);
  return (
    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base" role="img" aria-label="diamond">💎</span>
        <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">Called Shots</span>
      </div>
      {stats.callsMade === 0 ? <RunCallEmptyInvite /> : <RunCallStatsRecap stats={stats} />}
    </div>
  );
}
