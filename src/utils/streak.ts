import type { Trade } from "@/store/tradingStore";

export function getCurrentStreak(closedTrades: Trade[]): number {
  let streak = 0;
  for (let i = closedTrades.length - 1; i >= 0; i--) {
    if (closedTrades[i].pnl > 0) streak++;
    else break;
  }
  return streak;
}
