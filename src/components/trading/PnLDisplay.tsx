"use client";

import { useTradingStore } from "@/store/tradingStore";

export default function PnLDisplay() {
  const { wallet, closedTrades, currentPrice } = useTradingStore();

  // Calcular P&L total da sessão
  const sessionPnL = closedTrades.reduce((acc, trade) => acc + trade.pnl, 0);
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Carteira & P&L</h3>

      {/* Saldo Atual */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Saldo Disponível:</span>
          <span className="text-xl font-bold">${wallet.toFixed(2)}</span>
        </div>
      </div>

      {/* P&L da Sessão */}
      <div className={`p-3 rounded mb-3 ${sessionPnL >= 0 ? "bg-green-900/20" : "bg-red-900/20"}`}>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">P&L Sessão:</span>
          <span className={`font-bold ${sessionPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
            {sessionPnL >= 0 ? "+" : ""}${sessionPnL.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Trades:</span>
          <span>{closedTrades.length}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Win Rate:</span>
          <span>{closedTrades.length > 0 
            ? `${((closedTrades.filter(t => t.pnl > 0).length / closedTrades.length) * 100).toFixed(0)}%`
            : "0%"
          }</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Média P&L:</span>
          <span>{closedTrades.length > 0 
            ? `$${(sessionPnL / closedTrades.length).toFixed(2)}`
            : "$0.00"
          }</span>
        </div>

        {/* Maior Lucro/Prejuízo */}
        {closedTrades.length > 0 && (
          <>
            <div className="flex justify-between text-green-400">
              <span>Maior Lucro:</span>
              <span>${Math.max(...closedTrades.map(t => t.pnl))}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Maior Prejuízo:</span>
              <span>${Math.min(...closedTrades.map(t => t.pnl))}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
