"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

export default function OrderBook() {
  const currentPrice = useTradingStore((state) => state.currentPrice);

  const { bids, asks, spread } = useMemo(() => {
    const bidsArr: { price: number; size: number; total: number }[] = [];
    const asksArr: { price: number; size: number; total: number }[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 5; i > 0; i--) {
      const size = Math.random() * 0.5 + 0.1;
      bidTotal += size;
      bidsArr.push({ price: currentPrice - i * 2, size, total: bidTotal });
    }

    for (let i = 1; i <= 5; i++) {
      const size = Math.random() * 0.5 + 0.1;
      askTotal += size;
      asksArr.push({ price: currentPrice + i * 2, size, total: askTotal });
    }

    const s = asksArr[0].price - bidsArr[0].price;
    return { bids: bidsArr.reverse(), asks: asksArr, spread: s };
  }, [currentPrice]);

  const maxTotal = Math.max(
    ...bids.map((b) => b.total),
    ...asks.map((a) => a.total)
  );

  return (
    <div className="card-surface flex flex-col">
      <div className="px-4 py-3 border-b border-crypto-border">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Order Book</h3>
      </div>

      <div className="flex-1 flex flex-col min-h-[300px]">
        {/* Asks (sell orders) - red */}
        <div className="flex-1">
          {[...asks].reverse().map((ask, i) => (
            <div key={`ask-${i}`} className="relative flex items-center px-4 py-1.5 hover:bg-crypto-short-dim/30 transition-colors">
              {/* Background bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-crypto-short-dim/40"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <div className="relative flex items-center justify-between w-full text-xs">
                <span className="font-mono text-crypto-short tabular-nums">{ask.price.toFixed(2)}</span>
                <span className="font-mono text-crypto-text-secondary tabular-nums">{ask.size.toFixed(3)} BTC</span>
              </div>
            </div>
          ))}
        </div>

        {/* Current Price / Spread */}
        <div className="flex items-center justify-center gap-2 py-2 border-y border-crypto-border bg-crypto-surface-elevated">
          <ArrowDown className="w-3.5 h-3.5 text-crypto-short" />
          <span className="text-sm font-bold font-mono text-crypto-text tabular-nums">
            {currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <ArrowUp className="w-3.5 h-3.5 text-crypto-long" />
          <span className="text-[10px] text-crypto-text-muted font-mono">Spread: {spread.toFixed(2)}</span>
        </div>

        {/* Bids (buy orders) - green */}
        <div className="flex-1">
          {bids.map((bid, i) => (
            <div key={`bid-${i}`} className="relative flex items-center px-4 py-1.5 hover:bg-crypto-long-dim/30 transition-colors">
              {/* Background bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-crypto-long-dim/40"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <div className="relative flex items-center justify-between w-full text-xs">
                <span className="font-mono text-crypto-long tabular-nums">{bid.price.toFixed(2)}</span>
                <span className="font-mono text-crypto-text-secondary tabular-nums">{bid.size.toFixed(3)} BTC</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
