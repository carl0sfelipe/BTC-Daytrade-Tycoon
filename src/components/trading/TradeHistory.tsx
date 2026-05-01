"use client";

import { useTradingStore } from "@/store/tradingStore";

export default function TradeHistory() {
  const { closedTrades, currentPrice } = useTradingStore();

  if (closedTrades.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Histórico de Trades</h3>
        <p className="text-center text-gray-500 py-6 text-sm">Nenhum trade realizado ainda</p>
      </div>
    );
  }

  const reasonLabel = (reason: string) => {
    switch (reason) {
      case "tp":
        return <span className="text-green-400 text-xs">Take Profit</span>;
      case "sl":
        return <span className="text-red-400 text-xs">Stop Loss</span>;
      case "liquidation":
        return <span className="text-orange-400 text-xs font-bold">Liquidada</span>;
      default:
        return <span className="text-gray-400 text-xs">Manual</span>;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">Histórico de Trades</h3>
        <span className="text-xs text-gray-500">{closedTrades.length} trade(s)</span>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {[...closedTrades].reverse().map((trade, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2.5 rounded text-sm ${
              trade.pnl >= 0 ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  trade.side === "long"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {trade.side.toUpperCase()}
              </span>
              {reasonLabel(trade.reason)}
            </div>
            <div className="text-right">
              <div
                className={`font-bold text-sm ${
                  trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
