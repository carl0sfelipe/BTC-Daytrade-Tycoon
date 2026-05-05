"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Flame, Trophy, Award, BarChart3, TrendingUp, Github } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import { getCurrentStreak } from "@/utils/streak";

export default function Header() {
  const pathname = usePathname();
  const wallet = useTradingStore((s) => s.wallet);
  const closedTrades = useTradingStore((s) => s.closedTrades);
  const streak = getCurrentStreak(closedTrades);

  const navItems = [
    { href: "/trading", label: "Trading", icon: BarChart3 },
    { href: "/leaderboard", label: "Rankings", icon: Trophy },
    { href: "/achievements", label: "Achievements", icon: Award },
  ];

  return (
    <header className="flex flex-wrap items-center justify-between px-4 md:px-6 py-3 bg-crypto-surface/80 border-b border-crypto-border backdrop-blur-sm sticky top-0 z-50 gap-y-2">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crypto-accent to-crypto-cyan flex items-center justify-center shadow-glow-accent">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-crypto-text tracking-tight leading-none">BTC Daytrade</span>
          <span className="text-[10px] font-semibold text-crypto-accent tracking-widest uppercase leading-none mt-0.5">Tycoon</span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-1 order-3 w-full justify-center md:order-none md:w-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "text-crypto-text bg-crypto-surface-elevated border border-crypto-border"
                  : "text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-elevated"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-crypto-accent" : ""}`} />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right side: GitHub + Streak + Balance */}
      <div className="flex items-center gap-2 md:gap-4">
        <a
          href="https://github.com/carl0sfelipe/BTC-Daytrade-Tycoon"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contribute on GitHub"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm font-medium"
        >
          <Github className="w-4 h-4" />
          <span className="hidden lg:inline">Contribute</span>
        </a>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-crypto-warning-dim border border-crypto-warning/20">
            <Flame className="w-4 h-4 text-crypto-warning" />
            <span className="text-sm font-bold text-crypto-warning font-mono">{streak}W</span>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Balance</span>
            <span className="text-sm font-bold font-mono text-crypto-text tabular-nums truncate max-w-[100px] md:max-w-none">
              ${wallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-crypto-long/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-crypto-long" />
          </div>
        </div>
      </div>
    </header>
  );
}
