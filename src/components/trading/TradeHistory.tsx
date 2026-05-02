"use client";

import { Target, Shield, Skull, Hand } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

type TradeReason = "manual" | "tp" | "sl" | "liquidation";

function getReasonIcon(reason: TradeReason) {
  switch (reason) {
    case "tp":
      return <Target className="w-3.5 h-3.5 text-crypto-long" />;
    case "sl":
      return <Shield className="w-3.5 h-3.5 text-crypto-warning" />;
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

      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px]">
        <div className="relative pl-6 pr-4 py-3">
          {/* Timeline line */}
          <div className="absolute left-[1.85rem] top-4 bottom-4 w-px bg-crypto-border" />

          {trades.map((trade, idx) => {
            const isProfit = trade.pnl >= 0;
            return (
              <div key={idx} className="relative flex items-start gap-3 mb-4 last:mb-0">
                {/* Timeline dot */}
                <div
                  className={`absolute left-[1.4rem] mt-1.5 w-2.5 h-2.5 rounded-full border-2 z-10 ${
                    trade.reason === "liquidation"
                      ? "bg-crypto-short border-crypto-short"
                      : isProfit
                      ? "bg-crypto-long border-crypto-long"
                      : "bg-crypto-short border-crypto-short"
                  }`}
                />

                {/* Content */}
                <div className="flex-1 ml-4">
                  <div className="flex items-center justify-between mb-1">
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
                      <div className="flex items-center gap-1 text-[10px] text-crypto-text-muted">
                        {getReasonIcon(trade.reason)}
                        <span>{getReasonLabel(trade.reason)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold font-mono tabular-nums ${isProfit ? "text-crypto-long" : "text-crypto-short"}`}
                    >
                      {isProfit ? "+" : ""}${trade.pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
