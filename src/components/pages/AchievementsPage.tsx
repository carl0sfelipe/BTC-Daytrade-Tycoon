"use client";

import { Award, Lock, Zap, TrendingUp, Shield, Skull, Target, Flame, Star, Trophy } from "lucide-react";
import Link from "next/link";

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  rarity: "comum" | "raro" | "epico" | "lendario";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

const achievements: Achievement[] = [
  { id: 1, title: "Primeiros Passos", description: "Complete sua primeira simulação", icon: Zap, rarity: "comum", unlocked: true },
  { id: 2, title: "Sem Liquidar", description: "Complete 10 trades sem ser liquidado", icon: Shield, rarity: "comum", unlocked: true, progress: 10, maxProgress: 10 },
  { id: 3, title: "Lucrativo", description: "Alcance +100% de retorno em uma sessão", icon: TrendingUp, rarity: "raro", unlocked: true },
  { id: 4, title: "On Fire", description: "Acerte 5 trades positivos consecutivos", icon: Flame, rarity: "raro", unlocked: true, progress: 5, maxProgress: 5 },
  { id: 5, title: "Cem Por Cento", description: "Alcance +1000% de retorno em uma sessão", icon: Star, rarity: "epico", unlocked: false, progress: 847, maxProgress: 1000 },
  { id: 6, title: "Sobrevivente", description: "Complete 50 simulações sem liquidação", icon: Target, rarity: "epico", unlocked: false, progress: 23, maxProgress: 50 },
  { id: 7, title: "O Educativo", description: "Seja liquidado pela primeira vez", icon: Skull, rarity: "comum", unlocked: true },
  { id: 8, title: "TimeWarp Master", description: "Complete 100 simulações no total", icon: Trophy, rarity: "lendario", unlocked: false, progress: 67, maxProgress: 100 },
  { id: 9, title: "Day Trader Pro", description: "Mantenha win rate acima de 70% em 20+ trades", icon: Award, rarity: "epico", unlocked: false, progress: 68, maxProgress: 70 },
];

const rarityConfig = {
  comum: { color: "text-gray-400", border: "border-gray-400/30", bg: "bg-gray-400/10", glow: "" },
  raro: { color: "text-crypto-accent", border: "border-crypto-accent/30", bg: "bg-crypto-accent/10", glow: "shadow-[0_0_12px_rgba(124,92,255,0.15)]" },
  epico: { color: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10", glow: "shadow-[0_0_16px_rgba(250,204,21,0.2)]" },
  lendario: { color: "text-crypto-warning", border: "border-crypto-warning/30", bg: "bg-crypto-warning/10", glow: "shadow-[0_0_20px_rgba(255,176,32,0.25)]" },
};

const rarityLabels = {
  comum: "Comum",
  raro: "Raro",
  epico: "Épico",
  lendario: "Lendário",
};

export default function AchievementsPage() {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-crypto-surface/80 border-b border-crypto-border backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crypto-accent to-crypto-cyan flex items-center justify-center shadow-glow-accent">
            <Zap className="w-5 h-5 text-white" />
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
          Voltar ao Terminal
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Title + Progress */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-crypto-text">Conquistas</h1>
          <p className="text-sm text-crypto-text-secondary">Desbloqueie badges provando suas habilidades no mercado</p>

          <div className="max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-crypto-text-muted">Progresso Geral</span>
              <span className="text-xs font-bold font-mono text-crypto-accent">
                {unlockedCount}/{totalCount}
              </span>
            </div>
            <div className="h-2 rounded-full bg-crypto-surface-elevated overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-crypto-accent to-crypto-cyan transition-all" style={{ width: `${(unlockedCount / totalCount) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => {
            const rarity = rarityConfig[ach.rarity];
            const Icon = ach.icon;

            return (
              <div
                key={ach.id}
                className={`relative card-surface border ${ach.unlocked ? rarity.border : "border-crypto-border"} ${ach.unlocked ? rarity.glow : ""} overflow-hidden transition-all hover:border-crypto-text-muted`}
              >
                {!ach.unlocked && (
                  <div className="absolute inset-0 bg-crypto-bg/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-crypto-text-muted" />
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl ${ach.unlocked ? rarity.bg : "bg-crypto-surface-elevated"} flex items-center justify-center border ${ach.unlocked ? rarity.border : "border-crypto-border"}`}>
                      <Icon className={`w-5 h-5 ${ach.unlocked ? rarity.color : "text-crypto-text-muted"}`} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ach.unlocked ? rarity.bg : "bg-crypto-surface-elevated"} ${ach.unlocked ? rarity.color : "text-crypto-text-muted"}`}>
                      {rarityLabels[ach.rarity]}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-sm font-bold ${ach.unlocked ? "text-crypto-text" : "text-crypto-text-secondary"}`}>{ach.title}</h3>
                    <p className="text-xs text-crypto-text-muted mt-1">{ach.description}</p>
                  </div>

                  {ach.maxProgress && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-crypto-text-muted">{ach.unlocked ? "Concluído!" : "Em progresso"}</span>
                        <span className="text-[10px] font-mono text-crypto-text-secondary">
                          {ach.progress}/{ach.maxProgress}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-crypto-surface-elevated overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ach.unlocked ? "bg-gradient-to-r from-crypto-accent to-crypto-cyan" : "bg-crypto-accent/40"}`}
                          style={{ width: `${((ach.progress || 0) / ach.maxProgress) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-surface p-4 text-center">
          <p className="text-sm text-crypto-text-secondary">
            Próxima conquista próxima: <span className="text-crypto-accent font-semibold">TimeWarp Master</span> — faltam 33 simulações
          </p>
        </div>
      </main>
    </div>
  );
}
