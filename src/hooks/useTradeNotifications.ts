"use client";

import { useEffect, useRef } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { useToast } from "@/hooks/use-toast";

export function useTradeNotifications() {
  const { toast } = useToast();
  const prevPositionRef = useRef<boolean>(false);
  const prevClosedCountRef = useRef<number>(0);
  const prevLiquidatedRef = useRef<boolean>(false);

  const position = useTradingStore((s) => s.position);
  const closedTrades = useTradingStore((s) => s.closedTrades);
  const isLiquidated = useTradingStore((s) => s.isLiquidated);

  // Position opened
  useEffect(() => {
    const hasPosition = !!position;
    if (hasPosition && !prevPositionRef.current && position) {
      toast({
        title: `📈 ${position.side.toUpperCase()} Position Opened`,
        description: `Size: $${position.size.toLocaleString()} @ ${position.leverage}x`,
      });
    }
    prevPositionRef.current = hasPosition;
  }, [position, toast]);

  // Position closed (manual, TP, SL, trailing stop)
  useEffect(() => {
    if (closedTrades.length > prevClosedCountRef.current) {
      const trade = closedTrades[closedTrades.length - 1];
      const isProfit = trade.pnl >= 0;
      const emoji = isProfit ? "🟢" : "🔴";
      const titleMap: Record<string, string> = {
        manual: `${emoji} Position Closed`,
        tp: "🎯 Take Profit Hit",
        sl: "🛡️ Stop Loss Hit",
        trailing_stop: "📉 Trailing Stop Hit",
        liquidation: "💀 Liquidated",
      };
      toast({
        title: titleMap[trade.reason] || titleMap.manual,
        description: `P&L: ${isProfit ? "+" : ""}$${trade.pnl.toFixed(2)}`,
        variant: trade.reason === "liquidation" ? "destructive" : isProfit ? "default" : "destructive",
      });
    }
    prevClosedCountRef.current = closedTrades.length;
  }, [closedTrades, toast]);

  // Liquidation modal state
  useEffect(() => {
    if (isLiquidated && !prevLiquidatedRef.current) {
      toast({
        title: "💀 Liquidated",
        description: "Your position was liquidated. Start a new session to continue.",
        variant: "destructive",
      });
    }
    prevLiquidatedRef.current = isLiquidated;
  }, [isLiquidated, toast]);
}
