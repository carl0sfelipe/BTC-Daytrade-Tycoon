"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Minimize2, Maximize2, BarChart3, Trophy, Award, X, Clock } from "lucide-react";
import Link from "next/link";
import { useTradingStore } from "@/store/tradingStore";
import type { ReturnTypeUseTimewarpEngine } from "@/hooks/useTimewarpEngine";
import TradingChart from "./TradingChart";
import TradeControls from "./TradeControls";
import TradeHistory from "./TradeHistory";
import PositionPanel from "./PositionPanel";
import MarketStatus from "../layout/MarketStatus";
import SimulationClock from "./SimulationClock";

interface MobileTradingViewProps {
  engine: ReturnTypeUseTimewarpEngine;
  onEnd: () => void;
}

export default function MobileTradingView({ engine, onEnd }: MobileTradingViewProps) {
  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "history">("chart");

  const position = useTradingStore((s) => s.position);
  const wallet = useTradingStore((s) => s.wallet);
  const closedTrades = useTradingStore((s) => s.closedTrades);

  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const cancelPendingOrder = useTradingStore((s) => s.cancelPendingOrder);

  const sessionPnL = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const isPositive = sessionPnL >= 0;

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text flex flex-col relative">
      {/* Market Status - compact */}
      <div className="px-3 py-2 card-surface mx-3 mt-3">
        <MarketStatus />
      </div>

      {/* Simulation Clock - compact */}
      <div className="px-3 py-2 card-surface mx-3 mt-2">
        <SimulationClock
          elapsedTime={engine.elapsedTime}
          speed={60}
          isPlaying={engine.isPlaying}
          onPause={engine.pause}
          onResume={engine.start}
          onReset={engine.reset}
          onEnd={onEnd}
        />
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="mx-3 mt-2 card-surface p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-crypto-accent" />
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Pending Orders ({pendingOrders.length})</span>
          </div>
          {pendingOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
              <div className="flex flex-col">
                <span className={`text-xs font-bold uppercase ${order.side === "long" ? "text-crypto-long" : "text-crypto-short"}`}>
                  {order.side} {order.leverage}x
                </span>
                <span className="text-[10px] font-mono text-crypto-text-secondary">
                  ${order.size.toLocaleString()} @ ${order.limitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={() => cancelPendingOrder(order.id)}
                className="p-1.5 rounded-md bg-crypto-short-dim text-crypto-short hover:bg-crypto-short/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col mx-3 mt-2 gap-2 overflow-hidden">
        {/* Chart / History tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("chart")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chart"
                ? "bg-crypto-surface-elevated text-crypto-text border border-crypto-border"
                : "text-crypto-text-muted"
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "history"
                ? "bg-crypto-surface-elevated text-crypto-text border border-crypto-border"
                : "text-crypto-text-muted"
            }`}
          >
            History
          </button>
        </div>

        {activeTab === "chart" ? (
          <div className="flex-1 card-surface overflow-hidden relative min-h-[300px]">
            <TradingChart
              candles={engine.candles}
              currentPrice={engine.currentPrice}
              currentTimeSec={engine.currentTimeSec}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <TradeHistory />
          </div>
        )}
      </div>

      {/* Floating Position Panel */}
      {position && (
        <div className="mx-3 mt-2">
          <PositionPanel />
        </div>
      )}

      {/* Bottom sheet for TradeControls */}
      <div className="mx-3 mb-3 mt-2">
        <button
          onClick={() => setShowControls(!showControls)}
          className="w-full py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center gap-2"
        >
          <span className="text-sm font-semibold text-crypto-text">
            {showControls ? "Close Controls" : "Open Position"}
          </span>
          {showControls ? (
            <ChevronDown className="w-4 h-4 text-crypto-text-secondary" />
          ) : (
            <ChevronUp className="w-4 h-4 text-crypto-text-secondary" />
          )}
        </button>

        {showControls && (
          <div className="mt-2 animate-slide-in">
            <TradeControls />
          </div>
        )}

        {/* Mini PnL */}
        {!showControls && (
          <div className="mt-2 card-surface p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-crypto-text-muted uppercase">Balance</span>
                <span className="text-sm font-bold font-mono text-crypto-text">
                  ${wallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isPositive ? "bg-crypto-long-dim" : "bg-crypto-short-dim"}`}>
                <span className={`text-xs font-bold font-mono ${isPositive ? "text-crypto-long" : "text-crypto-short"}`}>
                  {isPositive ? "+" : ""}${sessionPnL.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="px-3 pb-3 pt-1">
        <div className="card-surface border border-crypto-border p-1.5 flex items-center justify-around">
          <Link
            href="/trading"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated"
          >
            <BarChart3 className="w-4 h-4 text-crypto-accent" />
            <span className="text-[9px] text-crypto-text-secondary font-medium">Terminal</span>
          </Link>
          <Link
            href="/leaderboard"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-crypto-surface-elevated"
          >
            <Trophy className="w-4 h-4 text-crypto-text-muted" />
            <span className="text-[9px] text-crypto-text-muted font-medium">Ranking</span>
          </Link>
          <Link
            href="/achievements"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-crypto-surface-elevated"
          >
            <Award className="w-4 h-4 text-crypto-text-muted" />
            <span className="text-[9px] text-crypto-text-muted font-medium">Achievements</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
