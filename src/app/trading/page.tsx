"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import MarketStatus from "@/components/layout/MarketStatus";
import TradingChart from "@/components/trading/TradingChart";

import TradeControls from "@/components/trading/TradeControls";
import PositionPanel from "@/components/trading/PositionPanel";
import PnLDisplay from "@/components/trading/PnLDisplay";
import TradeHistory from "@/components/trading/TradeHistory";
import OrdersPanel from "@/components/trading/OrdersPanel";
import SimulationClock from "@/components/trading/SimulationClock";
import SimulationLoader from "@/components/trading/SimulationLoader";
import LiquidationModal from "@/components/trading/LiquidationModal";
import EndSimulationModal from "@/components/trading/EndSimulationModal";
import OnboardingModal from "@/components/trading/OnboardingModal";
import MobileTradingView from "@/components/trading/MobileTradingView";
import { useTimewarpEngine } from "@/hooks/useTimewarpEngine";
import { useTradingStore } from "@/store/tradingStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTradeNotifications } from "@/hooks/useTradeNotifications";

const INITIAL_WALLET = 10000;

export default function TradingPage() {
  const [mounted, setMounted] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [capturedRealDateRange, setCapturedRealDateRange] = useState("");
  const engine = useTimewarpEngine();
  const isMobile = useIsMobile();
  useTradeNotifications();

  const isLiquidated = useTradingStore((s) => s.isLiquidated);
  const simulationRealDate = useTradingStore((s) => s.simulationRealDate);
  const clearLiquidated = useTradingStore((s) => s.clearLiquidated);
  const hasSeenOnboarding = useTradingStore((s) => s.hasSeenOnboarding);
  const setOnboardingSeen = useTradingStore((s) => s.setOnboardingSeen);
  const wallet = useTradingStore((s) => s.wallet);
  const closedTrades = useTradingStore((s) => s.closedTrades);

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [mounted, hasSeenOnboarding]);

  if (!mounted) return null;

  if (engine.isLoading) {
    return (
      <>
        <Header />
        <SimulationLoader message={engine.loadingMessage} />
      </>
    );
  }

  if (engine.error) {
    return (
      <div className="min-h-screen bg-crypto-bg flex flex-col items-center justify-center text-crypto-text">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-crypto-short">Simulation Error</h2>
          <p className="text-crypto-text-secondary">{engine.error}</p>
          <button
            type="button"
            onClick={engine.reset}
            className="bg-crypto-long text-black hover:bg-crypto-long/90 px-4 py-2 rounded-lg font-bold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleNewSession = () => {
    clearLiquidated();
    setShowEndModal(false);
    engine.reset();
  };

  const winningTrades = closedTrades.filter((t) => t.pnl > 0);
  const losingTrades = closedTrades.filter((t) => t.pnl < 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  for (const t of closedTrades) {
    if (t.pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else if (t.pnl < 0) {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }
  }

  const endStats = {
    pnl: wallet - INITIAL_WALLET,
    trades: closedTrades.length,
    winRate: closedTrades.length
      ? (winningTrades.length / closedTrades.length) * 100
      : 0,
    returnPercent: ((wallet - INITIAL_WALLET) / INITIAL_WALLET) * 100,
    bestTrade: winningTrades.length ? Math.max(...winningTrades.map((t) => t.pnl)) : 0,
    worstTrade: losingTrades.length ? Math.min(...losingTrades.map((t) => t.pnl)) : 0,
    avgDurationSeconds: closedTrades.length
      ? Math.floor(closedTrades.reduce((sum, t) => sum + t.durationSeconds, 0) / closedTrades.length)
      : 0,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    longTrades: closedTrades.filter((t) => t.side === "long").length,
    shortTrades: closedTrades.filter((t) => t.side === "short").length,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };

  // Format elapsed time as "5h 30m 15s" from "05:30:15"
  const formatElapsedPretty = (time: string) => {
    const [h, m, s] = time.split(":").map(Number);
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text">
      <Header />

      {isMobile ? (
        <MobileTradingView engine={engine} onEnd={() => {
          engine.pause();
          setCapturedRealDateRange(engine.realDateRange);
          setShowEndModal(true);
        }} />
      ) : (
        <>
          <div className="container mx-auto px-4 py-3">
            <SimulationClock
              elapsedTime={engine.elapsedTime}
              speed={60}
              isPlaying={engine.isPlaying}
              onPause={engine.pause}
              onResume={engine.start}
              onReset={engine.reset}
              onEnd={() => {
                engine.pause();
                setCapturedRealDateRange(engine.realDateRange);
                setShowEndModal(true);
              }}
            />
          </div>

          <div className="container mx-auto px-4 py-3">
            <MarketStatus />
          </div>

          <main className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-12 gap-4">
              {/* Main column — chart + orders + history */}
              <div className="col-span-12 lg:col-span-8 space-y-4">
                <TradingChart
                  candles={engine.candles}
                  currentPrice={engine.currentPrice}
                  currentTimeSec={engine.currentTimeSec}
                />
                <OrdersPanel />
                <TradeHistory />
              </div>

              {/* Side column */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <PositionPanel />
                <TradeControls />
                <PnLDisplay />
              </div>
            </div>
          </main>
        </>
      )}

      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingModal
          onStart={() => {
            setOnboardingSeen();
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Liquidation modal */}
      {isLiquidated && simulationRealDate && (
        <LiquidationModal
          realDate={simulationRealDate}
          elapsedTime={formatElapsedPretty(engine.elapsedTime)}
          simulatedHistoricalTime={engine.simulatedHistoricalTime}
          onNewSession={handleNewSession}
        />
      )}

      {/* Modal de encerramento manual */}
      {showEndModal && (
        <EndSimulationModal
          realDateRange={capturedRealDateRange || engine.realDateRange}
          elapsedTime={formatElapsedPretty(engine.elapsedTime)}
          simulatedHistoricalTime={engine.simulatedHistoricalTime}
          stats={endStats}
          onClose={handleNewSession}
          onNewSession={handleNewSession}
        />
      )}
    </div>
  );
}
