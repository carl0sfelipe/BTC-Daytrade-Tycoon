"use client";

import { useTradingStore } from "@/store/tradingStore";

export default function MarketStatus() {
  const { currentPrice, volatility, marketTrend } = useTradingStore();

  return (
    <div className={`p-3 ${marketTrend === "bull" ? "bg-green-900/20" : marketTrend === "bear" ? "bg-red-900/20" : "bg-gray-800/50"}`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">BTC/USDT:</span>
          <span className={`text-lg font-bold ${marketTrend === "bull" ? "text-green-400" : marketTrend === "bear" ? "text-red-400" : "text-gray-300"}`}>
            ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center space-x-6 text-sm">
          <div className="hidden md:block">
            <span className="text-gray-400">Volatilidade:</span>{" "}
            <span className={volatility > 5 ? "text-yellow-400" : "text-green-400"}>
              {volatility.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                marketTrend === "bull" ? "bg-green-500" : marketTrend === "bear" ? "bg-red-500" : "bg-gray-500"
              }`}
            />
            <span className="uppercase text-xs font-medium">{marketTrend}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
