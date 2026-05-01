"use client";

import { useMemo } from "react";
import { useTradingStore } from "@/store/tradingStore";

export default function OrderBook() {
  const currentPrice = useTradingStore((state) => state.currentPrice);

  const { bids, asks } = useMemo(() => {
    const bids: number[][] = [];
    const asks: number[][] = [];

    for (let i = 5; i > 0; i--) {
      bids.push([currentPrice - i * 2, Math.random() * 0.5 + 0.1]);
    }

    for (let i = 1; i <= 5; i++) {
      asks.push([currentPrice + i * 2, Math.random() * 0.5 + 0.1]);
    }

    return { bids, asks };
  }, [currentPrice]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">Book de Ofertas</h3>

      {/* Bids (Compra) */}
      <div className="space-y-1 mb-3">
        {bids.map((bid, idx) => (
          <div key={`bid-${idx}`} className="flex justify-between text-xs">
            <span className="text-green-400">{bid[0].toFixed(2)}</span>
            <span className="text-gray-400 w-16 text-right">{bid[1].toFixed(3)} BTC</span>
          </div>
        ))}
      </div>

      {/* Preço atual */}
      <div className="bg-gray-700 rounded py-2 mb-3 text-center">
        <span className="text-lg font-bold">{currentPrice.toFixed(2)}</span>
      </div>

      {/* Asks (Venda) */}
      <div className="space-y-1">
        {asks.map((ask, idx) => (
          <div key={`ask-${idx}`} className="flex justify-between text-xs">
            <span className="text-red-400">{ask[0].toFixed(2)}</span>
            <span className="text-gray-400 w-16 text-right">{ask[1].toFixed(3)} BTC</span>
          </div>
        ))}
      </div>
    </div>
  );
}
