"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Crown, Flame, Award, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import DailyChallengeLeaderboard from "./DailyChallengeLeaderboard";
import { fetchLeaderboard, type LeaderboardSnapshot } from "@/lib/leaderboard-client";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/server/leaderboard-service";

const globalFilters: Array<{ key: LeaderboardPeriod; label: string }> = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

type TabKey = "global" | "daily";

function formatEntryReturn(returnPercent: number): string {
  const sign = returnPercent >= 0 ? "+" : "";
  return `${sign}${returnPercent.toFixed(1)}%`;
}

export default function RankingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("global");

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-crypto-surface/80 border-b border-crypto-border backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crypto-accent to-crypto-cyan flex items-center justify-center shadow-glow-accent">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-crypto-text tracking-tight leading-none">BTC Daytrade</span>
            <span className="text-[10px] font-semibold text-crypto-accent tracking-widest uppercase leading-none mt-0.5">Tycoon</span>
          </div>
        </div>
        <Link
          href="/trading"
          className="px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm text-crypto-text-secondary hover:text-crypto-text transition-colors"
        >
          Back to Terminal
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex items-center justify-center gap-2">
          <TabButton
            active={activeTab === "global"}
            onClick={() => setActiveTab("global")}
            icon={Trophy}
            label="Global"
          />
          <TabButton
            active={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
            icon={Calendar}
            label="Daily Challenge"
          />
        </div>

        {activeTab === "global" ? <GlobalRankings /> : <DailyChallengeLeaderboard />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
        active
          ? "bg-crypto-accent text-white shadow-glow-accent"
          : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:text-crypto-text"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function GlobalRankings() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchLeaderboard(period).then((data) => {
      if (cancelled) return;
      setSnapshot(data);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const entries = snapshot?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-crypto-text">Global Rankings</h1>
        <p className="text-sm text-crypto-text-secondary">The best TimeWarp traders — real player data</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-center gap-2">
        {globalFilters.map((filter) => (
          <button
            type="button"
            key={filter.key}
            onClick={() => setPeriod(filter.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              period === filter.key
                ? "bg-crypto-accent text-white shadow-glow-accent"
                : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:text-crypto-text"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-crypto-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading rankings…</span>
        </div>
      ) : entries.length === 0 ? (
        <GlobalEmptyState />
      ) : (
        <>
          {/* Podium */}
          <div className="flex items-end justify-center gap-4 pt-4">
            {podium[1] && <GlobalPodiumCard entry={podium[1]} rank={2} />}
            {podium[0] && <GlobalPodiumCard entry={podium[0]} rank={1} tall />}
            {podium[2] && <GlobalPodiumCard entry={podium[2]} rank={3} />}
          </div>

          {/* Leaderboard list */}
          {rest.length > 0 && (
            <div className="card-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-crypto-border">
                <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Rankings</h3>
              </div>
              <div className="divide-y divide-crypto-border">
                {rest.map((entry) => (
                  <GlobalRankingRow key={entry.userId} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Your position */}
      {!isLoading && snapshot?.me && <YourPositionCard entry={snapshot.me} />}
    </>
  );
}

function GlobalEmptyState() {
  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-10 text-center space-y-3">
        <Trophy className="w-8 h-8 text-crypto-accent mx-auto" />
        <h3 className="text-sm font-bold text-crypto-text">No ranked traders yet</h3>
        <p className="text-xs text-crypto-text-secondary max-w-xs mx-auto">
          Log in and finish a simulation session — your result lands here for everyone to beat.
        </p>
        <Link
          href="/auth/signup"
          className="inline-block px-4 py-2 rounded-lg bg-crypto-accent text-white text-xs font-bold shadow-glow-accent"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

function GlobalPodiumCard({ entry, rank, tall }: { entry: LeaderboardEntry; rank: number; tall?: boolean }) {
  const isFirst = rank === 1;
  const colors =
    rank === 1
      ? { border: "border-yellow-400", text: "text-yellow-400", bg: "bg-yellow-400/20", icon: Crown }
      : rank === 2
      ? { border: "border-gray-400", text: "text-gray-300", bg: "bg-gray-400/20", icon: Medal }
      : { border: "border-amber-700", text: "text-amber-600", bg: "bg-amber-700/20", icon: Award };
  const RankIcon = colors.icon;

  return (
    <div className={`flex flex-col items-center ${tall ? "-mt-8" : ""}`}>
      {isFirst && <Crown className="w-6 h-6 text-yellow-400 mb-1" />}
      <div
        className={`${tall ? "w-20 h-20 text-xl" : "w-16 h-16 text-lg"} rounded-full bg-crypto-surface-elevated border-2 ${colors.border} flex items-center justify-center font-bold ${colors.text} mb-3 ${tall ? "shadow-[0_0_20px_rgba(250,204,21,0.3)]" : ""}`}
      >
        {entry.username.slice(0, 2).toUpperCase()}
      </div>
      <div className={`${tall ? "w-32" : "w-28"} card-surface ${colors.border}/30 p-3 text-center`}>
        <RankIcon className={`w-5 h-5 ${colors.text} mx-auto mb-1`} />
        <p className="text-xs font-bold text-crypto-text truncate">{entry.username}</p>
        <p className={`${tall ? "text-lg" : "text-sm"} font-bold font-mono mt-1 ${entry.returnPercent >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
          {formatEntryReturn(entry.returnPercent)}
        </p>
        {entry.streak > 0 && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <Flame className="w-3 h-3 text-crypto-warning" />
            <span className="text-[10px] text-crypto-warning font-bold">{entry.streak}W</span>
          </div>
        )}
      </div>
      <div className={`${tall ? "w-24 h-6" : "w-20 h-4"} ${colors.bg} rounded-b-lg mt-0.5`} />
    </div>
  );
}

function GlobalRankingRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-crypto-surface-elevated/50 transition-colors">
      <span className="w-6 text-center text-sm font-bold font-mono text-crypto-text-muted">{entry.rank}</span>
      <div className="w-9 h-9 rounded-full bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center text-xs font-bold text-crypto-text-secondary">
        {entry.username.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-crypto-text truncate">{entry.username}</p>
        <div className="flex items-center gap-3 text-[10px] text-crypto-text-muted">
          <span>{entry.trades} trades</span>
          <span>{entry.sessions} sessions</span>
          {entry.streak > 0 && (
            <span className="flex items-center gap-0.5 text-crypto-warning">
              <Flame className="w-3 h-3" />
              {entry.streak}W
            </span>
          )}
        </div>
      </div>
      <span className={`text-sm font-bold font-mono tabular-nums ${entry.returnPercent >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
        {formatEntryReturn(entry.returnPercent)}
      </span>
    </div>
  );
}

function YourPositionCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="card-surface border border-crypto-accent/30 overflow-hidden">
      <div className="px-4 py-3 bg-crypto-accent-dim flex items-center justify-between">
        <span className="text-xs font-bold text-crypto-accent uppercase tracking-wider">Your Position</span>
        <span className="text-xs font-bold text-crypto-accent">#{entry.rank}</span>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-crypto-accent/20 flex items-center justify-center text-xs font-bold text-crypto-accent">
            {entry.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-crypto-text">{entry.username}</p>
            <p className="text-[10px] text-crypto-text-muted">
              {entry.trades} trades · {entry.sessions} sessions{entry.streak > 0 ? ` · 🔥 ${entry.streak}W` : ""}
            </p>
          </div>
        </div>
        <span className={`text-sm font-bold font-mono ${entry.returnPercent >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
          {formatEntryReturn(entry.returnPercent)}
        </span>
      </div>
    </div>
  );
}
