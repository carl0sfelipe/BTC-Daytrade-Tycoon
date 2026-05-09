"use client";

import { useState, useEffect } from "react";
import { ChevronUp, BarChart3, Trophy, Award } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTradingStore } from "@/store/tradingStore";
import type { ReturnTypeUseTimewarpEngine } from "@/hooks/useTimewarpEngine";
import TradingChart from "./TradingChart";
import TradeControls from "./TradeControls";
import TradeHistory from "./TradeHistory";
import PositionPanel from "./PositionPanel";
import MarketStatus from "../layout/MarketStatus";
import SimulationClock from "./SimulationClock";
import OrdersPanel from "./OrdersPanel";

interface MobileTradingViewProps {
  engine: ReturnTypeUseTimewarpEngine;
  onEnd: () => void;
}

export default function MobileTradingView({ engine, onEnd }: MobileTradingViewProps) {
  const position = useTradingStore((s) => s.position);
  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "history">("chart");

  // Auto-open controls when a position is opened
  useEffect(() => {
    if (position) {
      setShowControls(true);
    }
  }, [position]);

  const wallet = useTradingStore((s) => s.wallet);
  const closedTrades = useTradingStore((s) => s.closedTrades);

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

      {/* Orders Panel */}
      <div className="mx-3 mt-2">
        <OrdersPanel />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col mx-3 mt-2 gap-2 overflow-hidden">
        {/* Chart / History tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
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
            type="button"
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

      {/* Open Position FAB */}
      <div className="mx-3 mb-3 mt-2">
        <button
          type="button"
          onClick={() => setShowControls(true)}
          className="w-full py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center gap-2"
        >
          <ChevronUp className="w-4 h-4 text-crypto-text-secondary" />
          <span className="text-sm font-semibold text-crypto-text">
            {position ? "Manage Position" : "Open Position"}
          </span>
        </button>

        {/* Mini PnL always visible */}
        <div className="mt-2 card-surface p-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-crypto-text-muted uppercase">Balance</span>
              <span className="text-sm font-bold font-mono text-crypto-text">
                ${wallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                isPositive ? "bg-crypto-long-dim" : "bg-crypto-short-dim"
              }`}
            >
              <span
                className={`text-xs font-bold font-mono ${
                  isPositive ? "text-crypto-long" : "text-crypto-short"
                }`}
              >
                {isPositive ? "+" : ""}${sessionPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
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

      {/* Bottom Sheet Backdrop */}
      <AnimatePresence>
        {showControls && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowControls(false)}
            />
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80) setShowControls(false);
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-crypto-surface rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-crypto-border"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-crypto-text-muted/40 rounded-full" />
              </div>
              <div className="pb-safe">
                <TradeControls />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
