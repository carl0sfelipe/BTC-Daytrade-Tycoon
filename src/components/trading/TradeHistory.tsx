"use client";

import { Target, Shield, Skull, Hand, ArrowRight, Clock, TrendingDown } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

type TradeReason = "manual" | "tp" | "sl" | "liquidation" | "trailing_stop";

function getReasonIcon(reason: TradeReason) {
  switch (reason) {
    case "tp":
      return <Target className="w-3.5 h-3.5 text-crypto-long" />;
    case "sl":
      return <Shield className="w-3.5 h-3.5 text-crypto-warning" />;
    case "trailing_stop":
      return <TrendingDown className="w-3.5 h-3.5 text-crypto-warning" />;
    case "liquidation":
      return <Skull className="w-3.5 h-3.5 text-crypto-short" />;
    case "manual":
      return <Hand className="w-3.5 h-3.5 text-crypto-accent" />;
  }
}

function getReasonLabel(reason: TradeReason) {
  switch (reason) {
    case "tp":
      return "Take Profit";
    case "sl":
      return "Stop Loss";
    case "trailing_stop":
      return "Trailing Stop";
    case "liquidation":
      return "Liquidated";
    case "manual":
      return "Manual";
  }
}

export default function TradeHistory() {
  const closedTrades = useTradingStore((s) => s.closedTrades);

  if (closedTrades.length === 0) {
    return (
      <div className="card-surface overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Trade History</h3>
          <span className="text-[10px] text-crypto-text-muted font-mono">0 trades</span>
        </div>
        <div className="flex-1 min-h-[120px] flex items-center justify-center">
          <p className="text-sm text-crypto-text-muted">No trades yet</p>
        </div>
      </div>
    );
  }

  const trades = [...closedTrades].reverse();

  return (
    <div className="card-surface overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Trade History</h3>
        <span className="text-[10px] text-crypto-text-muted font-mono">{closedTrades.length} trades</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
        <div className="divide-y divide-crypto-border/50">
          {trades.map((trade) => {
            const isProfit = trade.pnl >= 0;
            const pnlPercent = trade.margin ? (trade.pnl / trade.margin) * 100 : 0;
            const priceChange = trade.entryPrice
              ? (trade.side === "long"
                ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100
                : ((trade.entryPrice - trade.exitPrice) / trade.entryPrice) * 100)
              : 0;

            return (
              <div key={trade.entryTime + trade.exitTime + trade.pnl + trade.side} className="px-4 py-3 hover:bg-crypto-surface-elevated/30 transition-colors">
                {/* Row 1: Side + Leverage | Reason | P&L */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        trade.side === "long"
                          ? "bg-crypto-long-dim text-crypto-long"
                          : "bg-crypto-short-dim text-crypto-short"
                      }`}
                    >
                      {trade.side === "long" ? "LONG" : "SHORT"}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-crypto-accent">{trade.leverage}x</span>
                    <div className="flex items-center gap-1 text-[10px] text-crypto-text-muted">
                      {getReasonIcon(trade.reason)}
                      <span>{getReasonLabel(trade.reason)}</span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold font-mono tabular-nums ${isProfit ? "text-crypto-long" : "text-crypto-short"}`}
                  >
                    {isProfit ? "+" : ""}${trade.pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Row 2: Entry Price → Exit Price | Price change % */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-crypto-text tabular-nums">
                    <span>${trade.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <ArrowRight className="w-3 h-3 text-crypto-text-muted" />
                    <span>${trade.exitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <span className={`text-[10px] font-bold font-mono ${isProfit ? "text-crypto-long" : "text-crypto-short"}`}>
                    {isProfit ? "+" : ""}{priceChange.toFixed(2)}%
                  </span>
                </div>

                {/* Row 3: Times | Size | Margin | P&L% */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-crypto-text-muted">
                      <Clock className="w-3 h-3" />
                      <span>{trade.entryTime}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-crypto-border" />
                      <span>{trade.exitTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-crypto-text-muted">
                    <span>Size: ${trade.size.toLocaleString()}</span>
                    <span className="text-crypto-border">|</span>
                    <span>Margin: ${trade.margin.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <span className="text-crypto-border">|</span>
                    <span className={isProfit ? "text-crypto-long" : "text-crypto-short"}>
                      {isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
