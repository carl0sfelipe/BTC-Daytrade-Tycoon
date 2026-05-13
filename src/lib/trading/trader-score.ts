/**
 * Computes a composite trader score (0–100) from session statistics.
 *
 * Components:
 *   - Win Rate (30%): % of profitable trades
 *   - Max Drawdown (30%): 100 - drawdown% (lower drawdown = higher score)
 *   - Profit Factor (20%): wins/losses, scaled (PF 5.0 = 100 pts)
 *   - Return (20%): session return%, centered at 50
 *
 * @returns integer score 0–100 with medal tier:
 *   🥉 < 50 | 🥈 50–74 | 🥇 75–89 | 💎 90–100
 */
export function computeTraderScore(stats: {
  winRate: number;
  returnPercent: number;
  profitFactor: number;
  maxDrawdown: number;
}): number {
  const winRateScore = Math.max(0, Math.min(100, stats.winRate));
  const drawdownScore = Math.max(0, Math.min(100, 100 - stats.maxDrawdown));
  const profitFactorScore = Math.min(100, stats.profitFactor * 20);
  const returnScore = Math.max(0, Math.min(100, 50 + stats.returnPercent));

  const raw =
    winRateScore * 0.30 +
    drawdownScore * 0.30 +
    profitFactorScore * 0.20 +
    returnScore * 0.20;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function getTraderTier(score: number): {
  label: string;
  emoji: string;
  color: string;
} {
  if (score >= 90) return { label: "Diamond", emoji: "💎", color: "text-purple-400" };
  if (score >= 75) return { label: "Gold", emoji: "🥇", color: "text-yellow-400" };
  if (score >= 50) return { label: "Silver", emoji: "🥈", color: "text-gray-300" };
  return { label: "Bronze", emoji: "🥉", color: "text-amber-600" };
}
