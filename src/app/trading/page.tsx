"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import MarketStatus from "@/components/layout/MarketStatus";
import TradingChart from "@/components/trading/TradingChart";
import OrderBook from "@/components/trading/OrderBook";
import TradeControls from "@/components/trading/TradeControls";
import PositionPanel from "@/components/trading/PositionPanel";
import PnLDisplay from "@/components/trading/PnLDisplay";
import TradeHistory from "@/components/trading/TradeHistory";
import SimulationClock from "@/components/trading/SimulationClock";
import SimulationLoader from "@/components/trading/SimulationLoader";
import LiquidationModal from "@/components/trading/LiquidationModal";
import EndSimulationModal from "@/components/trading/EndSimulationModal";
import OnboardingModal from "@/components/trading/OnboardingModal";
import MobileTradingView from "@/components/trading/MobileTradingView";
import { useTimewarpEngine } from "@/hooks/useTimewarpEngine";
import { useTradingStore } from "@/store/tradingStore";
import { useIsMobile } from "@/hooks/use-mobile";

const INITIAL_WALLET = 10000;

export default function TradingPage() {
  const [mounted, setMounted] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const engine = useTimewarpEngine();
  const isMobile = useIsMobile();

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

  const endStats = {
    pnl: wallet - INITIAL_WALLET,
    trades: closedTrades.length,
    winRate: closedTrades.length
      ? (closedTrades.filter((t) => t.pnl > 0).length / closedTrades.length) * 100
      : 0,
    returnPercent: ((wallet - INITIAL_WALLET) / INITIAL_WALLET) * 100,
  };

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text">
      <Header />

      {isMobile ? (
        <MobileTradingView engine={engine} />
      ) : (
        <>
          <div className="container mx-auto px-4 py-3">
            <SimulationClock
              elapsedTime={engine.elapsedTime}
              speed={60}
              progressPercent={engine.progressPercent}
              isPlaying={engine.isPlaying}
              realDateRange={engine.realDateRange}
              onPause={engine.pause}
              onResume={engine.start}
              onReset={engine.reset}
              onEnd={() => setShowEndModal(true)}
            />
          </div>

          <MarketStatus />

          <main className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-12 gap-4">
              {/* Main column — chart + bottom cards */}
              <div className="col-span-12 lg:col-span-8 space-y-4">
                <TradingChart
                  candles={engine.candles}
                  currentPrice={engine.currentPrice}
                  currentTimeSec={engine.currentTimeSec}
                />
                <TradeHistory />
              </div>

              {/* Side column */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <OrderBook />
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
        <LiquidationModal realDate={simulationRealDate} onNewSession={handleNewSession} />
      )}

      {/* Modal de encerramento manual */}
      {showEndModal && (
        <EndSimulationModal
          realDateRange={engine.realDateRange}
          stats={endStats}
          onClose={() => setShowEndModal(false)}
          onNewSession={handleNewSession}
        />
      )}
    </div>
  );
}
