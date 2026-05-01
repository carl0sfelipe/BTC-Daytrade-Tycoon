"use client";

import { useTradingStore } from "@/store/tradingStore";

export default function PositionPanel() {
  const { position, currentPrice, lastCloseReason } = useTradingStore();

  if (!position) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Sua Posição</h3>
        {lastCloseReason && (
          <p className="text-center text-yellow-400 text-xs py-1 mb-2">{lastCloseReason}</p>
        )}
        <p className="text-center text-gray-500 py-4">Sem posição aberta</p>
      </div>
    );
  }

  const { side, entry, size, leverage, tpPrice, slPrice, liquidationPrice } = position;

  // PnL = (priceDiff / entry) * size
  const priceDiff = side === "long" ? currentPrice - entry : entry - currentPrice;
  const unrealizedPnL = (priceDiff / entry) * size;
  const pnlPercent = (priceDiff / entry) * 100 * leverage;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Posição Atual</h3>

      {/* Side badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">Direção:</span>
        <span
          className={`text-sm font-bold px-2 py-0.5 rounded ${
            side === "long"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {side.toUpperCase()} {leverage}x
        </span>
      </div>

      {/* Entry / Current */}
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-400">Entrada:</span>
        <span>${entry.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-400">Atual:</span>
        <span>${currentPrice.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-400">Tamanho:</span>
        <span>${size.toLocaleString()}</span>
      </div>

      {/* TP / SL */}
      {(tpPrice || slPrice) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {tpPrice && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">TP:</span>
              <span className="text-green-400">${tpPrice.toFixed(2)}</span>
            </div>
          )}
          {slPrice && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">SL:</span>
              <span className="text-red-400">${slPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* P&L */}
      <div
        className={`mt-3 pt-3 border-t ${
          unrealizedPnL >= 0 ? "border-green-500/30" : "border-red-500/30"
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">P&L:</span>
          <span
            className={`font-bold text-sm ${
              unrealizedPnL >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {unrealizedPnL >= 0 ? "+" : ""}${unrealizedPnL.toFixed(2)}
            <span className="text-xs ml-1 opacity-70">
              ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Liquidation */}
      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Liquidação:</span>
          <span className="text-orange-400">${liquidationPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
