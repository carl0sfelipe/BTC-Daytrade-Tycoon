"use client";

import { Trophy, Medal, Crown, Flame, TrendingDown, Award, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const topPlayers = [
  { rank: 1, name: "SatoshiNakamoto", return: 2847.5, trades: 45, streak: 12, avatar: "SN" },
  { rank: 2, name: "HODLer2024", return: 1923.2, trades: 38, streak: 8, avatar: "HD" },
  { rank: 3, name: "MoonWalker", return: 1456.8, trades: 52, streak: 6, avatar: "MW" },
];

const leaderboard = [
  { rank: 4, name: "CryptoWhale", return: 892.4, trades: 28, streak: 5, change: "+2" },
  { rank: 5, name: "BearSlayer", return: 734.1, trades: 33, streak: 4, change: "-1" },
  { rank: 6, name: "BullRunner", return: 621.5, trades: 41, streak: 3, change: "+5" },
  { rank: 7, name: "LiquidatedAgain", return: 445.2, trades: 19, streak: 2, change: "-2" },
  { rank: 8, name: "ChartMaster", return: 312.7, trades: 25, streak: 1, change: "0" },
  { rank: 9, name: "FomoKing", return: 198.3, trades: 31, streak: 0, change: "+3" },
  { rank: 10, name: "DegenTrader", return: 87.5, trades: 22, streak: 0, change: "-1" },
];

const filters = ["This Week", "This Month", "All Time"];

export default function RankingPage() {
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
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-crypto-text">Global Rankings</h1>
          <p className="text-sm text-crypto-text-secondary">The best TimeWarp traders</p>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-center gap-2">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                i === 0
                  ? "bg-crypto-accent text-white shadow-glow-accent"
                  : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:text-crypto-text"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 pt-4">
          {/* 2nd place */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-crypto-surface-elevated border-2 border-gray-400 flex items-center justify-center text-lg font-bold text-gray-300 mb-3">
              {topPlayers[1].avatar}
            </div>
            <div className="w-28 card-surface border-gray-400/30 p-3 text-center">
              <Medal className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-crypto-text truncate">{topPlayers[1].name}</p>
              <p className="text-sm font-bold font-mono text-crypto-long mt-1">+{topPlayers[1].return}%</p>
            </div>
            <div className="w-20 h-4 bg-gray-400/20 rounded-b-lg mt-0.5" />
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center -mt-8">
            <Crown className="w-6 h-6 text-yellow-400 mb-1" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-400 flex items-center justify-center text-xl font-bold text-yellow-400 mb-3 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
              {topPlayers[0].avatar}
            </div>
            <div className="w-32 card-surface border-yellow-400/30 p-3 text-center">
              <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-crypto-text truncate">{topPlayers[0].name}</p>
              <p className="text-lg font-bold font-mono text-crypto-long mt-1">+{topPlayers[0].return}%</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Flame className="w-3 h-3 text-crypto-warning" />
                <span className="text-[10px] text-crypto-warning font-bold">{topPlayers[0].streak}W</span>
              </div>
            </div>
            <div className="w-24 h-6 bg-yellow-400/20 rounded-b-lg mt-0.5" />
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-crypto-surface-elevated border-2 border-amber-700 flex items-center justify-center text-lg font-bold text-amber-600 mb-3">
              {topPlayers[2].avatar}
            </div>
            <div className="w-28 card-surface border-amber-700/30 p-3 text-center">
              <Award className="w-5 h-5 text-amber-700 mx-auto mb-1" />
              <p className="text-xs font-bold text-crypto-text truncate">{topPlayers[2].name}</p>
              <p className="text-sm font-bold font-mono text-crypto-long mt-1">+{topPlayers[2].return}%</p>
            </div>
            <div className="w-20 h-4 bg-amber-700/20 rounded-b-lg mt-0.5" />
          </div>
        </div>

        {/* Leaderboard list */}
        <div className="card-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-crypto-border">
            <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Rankings</h3>
          </div>
          <div className="divide-y divide-crypto-border">
            {leaderboard.map((player) => (
              <div key={player.rank} className="flex items-center gap-4 px-4 py-3 hover:bg-crypto-surface-elevated/50 transition-colors">
                <span className="w-6 text-center text-sm font-bold font-mono text-crypto-text-muted">{player.rank}</span>
                <div className="w-9 h-9 rounded-full bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center text-xs font-bold text-crypto-text-secondary">
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-crypto-text truncate">{player.name}</p>
                  <div className="flex items-center gap-3 text-[10px] text-crypto-text-muted">
                    <span>{player.trades} trades</span>
                    {player.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-crypto-warning">
                        <Flame className="w-3 h-3" />
                        {player.streak}W
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {player.change.startsWith("+") ? (
                    <ArrowUpRight className="w-3 h-3 text-crypto-long" />
                  ) : player.change.startsWith("-") ? (
                    <TrendingDown className="w-3 h-3 text-crypto-short" />
                  ) : null}
                  <span className={`text-[10px] font-mono ${player.change.startsWith("+") ? "text-crypto-long" : player.change.startsWith("-") ? "text-crypto-short" : "text-crypto-text-muted"}`}>
                    {player.change}
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-crypto-long tabular-nums">+{player.return}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your position */}
        <div className="card-surface border border-crypto-accent/30 overflow-hidden">
          <div className="px-4 py-3 bg-crypto-accent-dim flex items-center justify-between">
            <span className="text-xs font-bold text-crypto-accent uppercase tracking-wider">Your Position</span>
            <span className="text-xs font-bold text-crypto-accent">#43</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-crypto-accent/20 flex items-center justify-center text-xs font-bold text-crypto-accent">EU</div>
              <div>
                <p className="text-sm font-semibold text-crypto-text">You</p>
                <p className="text-[10px] text-crypto-text-muted">12 trades · 🔥 5W</p>
              </div>
            </div>
            <span className="text-sm font-bold font-mono text-crypto-short">-5.65%</span>
          </div>
        </div>
      </main>
    </div>
  );
}
