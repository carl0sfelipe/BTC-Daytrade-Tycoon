"use client";

import { useState, useEffect } from "react";
import { Trophy, Calendar, TrendingUp, Flame, Award } from "lucide-react";
import { getDailyChallengeSeed } from "@/lib/engine/daily-challenge";
import { getDailyLeaderboard, type DailyChallengeScore } from "@/lib/engine/daily-challenge-leaderboard";

export default function DailyChallengeLeaderboard() {
  const [scores, setScores] = useState<DailyChallengeScore[]>([]);
  const [seed, setSeed] = useState("");

  useEffect(() => {
    const today = new Date();
    setSeed(getDailyChallengeSeed(today));
    setScores(getDailyLeaderboard(today, 10));
  }, []);

  if (scores.length === 0) {
    return (
      <div className="card-surface overflow-hidden">
        <div className="px-4 py-8 text-center space-y-3">
          <Calendar className="w-8 h-8 text-crypto-accent mx-auto" />
          <h3 className="text-sm font-bold text-crypto-text">Daily Challenge</h3>
          <p className="text-xs text-crypto-text-secondary max-w-xs mx-auto">
            No scores yet for today. Complete the daily challenge to see your name here!
          </p>
          <p className="text-[10px] font-mono text-crypto-text-muted">Seed: {seed}</p>
        </div>
      </div>
    );
  }

  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-crypto-accent" />
          <h2 className="text-lg font-bold text-crypto-text">Daily Challenge</h2>
        </div>
        <p className="text-xs text-crypto-text-secondary">Same candles. Same seed. Fair fight.</p>
        <p className="text-[10px] font-mono text-crypto-text-muted">{seed}</p>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 pt-2">
          {top3[1] && <PodiumItem score={top3[1]} rank={2} />}
          {top3[0] && <PodiumItem score={top3[0]} rank={1} tall />}
          {top3[2] && <PodiumItem score={top3[2]} rank={3} />}
        </div>
      )}

      {/* List */}
      <div className="card-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Rankings</h3>
          <span className="text-[10px] text-crypto-text-muted">{scores.length} entries</span>
        </div>
        <div className="divide-y divide-crypto-border">
          {rest.map((score, idx) => (
            <div key={idx} className="flex items-center gap-4 px-4 py-3 hover:bg-crypto-surface-elevated/50 transition-colors">
              <span className="w-6 text-center text-sm font-bold font-mono text-crypto-text-muted">{idx + 4}</span>
              <div className="w-8 h-8 rounded-full bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center text-[10px] font-bold text-crypto-text-secondary">
                {score.playerName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-crypto-text truncate">{score.playerName}</p>
                <p className="text-[10px] text-crypto-text-muted">{score.trades} trades · {score.winRate.toFixed(0)}% WR</p>
              </div>
              <span className={`text-sm font-bold font-mono tabular-nums ${score.returnPercent >= 0 ? "text-crypto-long" : "text-crypto-short"}`}>
                {score.returnPercent >= 0 ? "+" : ""}{score.returnPercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PodiumItem({ score, rank, tall }: { score: DailyChallengeScore; rank: number; tall?: boolean }) {
  const isFirst = rank === 1;
  const colors =
    rank === 1
      ? { border: "border-yellow-400", text: "text-yellow-400", bg: "bg-yellow-400/20" }
      : rank === 2
      ? { border: "border-gray-400", text: "text-gray-400", bg: "bg-gray-400/20" }
      : { border: "border-amber-700", text: "text-amber-600", bg: "bg-amber-700/20" };

  return (
    <div className={`flex flex-col items-center ${tall ? "-mt-6" : ""}`}>
      {isFirst && <Trophy className="w-5 h-5 text-yellow-400 mb-1" />}
      <div
        className={`w-12 h-12 rounded-full bg-crypto-surface-elevated border-2 ${colors.border} flex items-center justify-center text-sm font-bold ${colors.text} mb-2 ${tall ? "shadow-[0_0_20px_rgba(250,204,21,0.3)]" : ""}`}
      >
        {score.playerName.slice(0, 2).toUpperCase()}
      </div>
      <div className={`${tall ? "w-32" : "w-24"} card-surface ${colors.border}/30 p-2 text-center`}>
        <p className="text-[10px] font-bold text-crypto-text truncate">{score.playerName}</p>
        <p className={`${tall ? "text-base" : "text-sm"} font-bold font-mono text-crypto-long mt-0.5`}>
          +{score.returnPercent.toFixed(2)}%
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <Flame className="w-3 h-3 text-crypto-warning" />
          <span className="text-[9px] text-crypto-warning font-bold">{score.trades}T</span>
        </div>
      </div>
      <div className={`${tall ? "w-20 h-5" : "w-16 h-3"} ${colors.bg} rounded-b-lg mt-0.5`} />
    </div>
  );
}
