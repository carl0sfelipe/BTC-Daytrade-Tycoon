"use client";

import { useTradingStore } from "@/store/tradingStore";
import { computeRunCallStats, type RunCallStats } from "@/lib/calls/run-call-stats";
import type { RunRankAward } from "@/lib/session-record-client";
import { useGameMessages } from "@/hooks/useGameMessages";

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
  const messages = useGameMessages();
  return (
    <p className="text-sm text-crypto-text-muted">{messages.runRecap.emptyInvite}</p>
  );
}

function RunCallStatsRecap({ stats }: { stats: RunCallStats }) {
  const messages = useGameMessages();
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-crypto-text-secondary">{messages.runRecap.diamondsEarned}</span>
        <span className="text-3xl font-bold font-mono text-purple-300">+{stats.diamondsEarned} 💎</span>
      </div>
      <div className="grid grid-cols-4 gap-3 pt-2 border-t border-purple-500/20">
        <RunCallStatCell label={messages.runRecap.hits} value={`${stats.hits}`} valueClass="text-crypto-long" />
        <RunCallStatCell label={messages.runRecap.misses} value={`${stats.misses}`} valueClass="text-crypto-short" />
        <RunCallStatCell label={messages.runRecap.voided} value={`${stats.voided}`} valueClass="text-crypto-text-muted" />
        <RunCallStatCell label={messages.runRecap.hitRate} value={formatRunCallHitRate(stats.hitRate)} valueClass="text-purple-300" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
        <span className="text-[10px] text-crypto-text-muted uppercase">{messages.runRecap.bestStreak}</span>
        <span className="text-sm font-bold font-mono text-purple-300">
          {stats.bestStreak >= 2 ? "🔥 " : ""}{stats.bestStreak}
        </span>
      </div>
    </>
  );
}

/** Daily-ranking standing of the saved run — only rendered for logged-in users. */
function RunRankRecapRow({ award }: { award: RunRankAward }) {
  const messages = useGameMessages();
  return (
    <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
      <span className="text-[10px] text-crypto-text-muted uppercase">{messages.runRecap.runRank}</span>
      <span className="text-sm font-bold font-mono">
        <span className="text-crypto-text-secondary">{messages.runRecap.rankStanding(award.rank, award.totalRuns)}</span>{" "}
        <span className="text-purple-300">+{award.reward} 💎</span>
      </span>
    </div>
  );
}

/**
 * End-of-run "Called Shots" recap: diamonds earned, hit/miss/void counts,
 * hit rate, best streak and daily run rank — the roguelike hook surfaced in
 * EndSimulationModal.
 *
 * @example <RunCallSummary />  // reads runCallLog from the trading store
 */
export default function RunCallSummary() {
  const runCallLog = useTradingStore((s) => s.runCallLog);
  const runRankAward = useTradingStore((s) => s.runRankAward);
  const messages = useGameMessages();
  const stats = computeRunCallStats(runCallLog);
  return (
    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base" role="img" aria-label={messages.runRecap.diamondEmojiAria}>💎</span>
        <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">{messages.runRecap.sectionTitle}</span>
      </div>
      {stats.callsMade === 0 ? <RunCallEmptyInvite /> : <RunCallStatsRecap stats={stats} />}
      {runRankAward !== null && <RunRankRecapRow award={runRankAward} />}
    </div>
  );
}
