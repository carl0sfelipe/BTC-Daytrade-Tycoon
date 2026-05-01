"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import MarketStatus from "@/components/layout/MarketStatus";
import TradingChart from "@/components/trading/TradingChart";
import OrderBook from "@/components/trading/OrderBook";
import TradeControls from "@/components/trading/TradeControls";
import PositionPanel from "@/components/trading/PositionPanel";
import PnLDisplay from "@/components/trading/PnLDisplay";
import Leaderboard from "@/components/dashboard/Leaderboard";
import Achievements from "@/components/dashboard/Achievements";
import SimulationClock from "@/components/trading/SimulationClock";
import SimulationLoader from "@/components/trading/SimulationLoader";
import { useTimewarpEngine } from "@/hooks/useTimewarpEngine";

export default function TradingPage() {
  const [mounted, setMounted] = useState(false);
  const engine = useTimewarpEngine();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-red-400">Erro na Simulação</h2>
          <p className="text-gray-400">{engine.error}</p>
          <button
            onClick={engine.reset}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="container mx-auto px-4 py-3">
        <SimulationClock
          elapsedTime={engine.elapsedTime}
          speed={60}
          progressPercent={engine.progressPercent}
          isPlaying={engine.isPlaying}
          onPause={engine.pause}
          onResume={engine.start}
          onReset={engine.reset}
        />
      </div>

      <MarketStatus />

      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Coluna principal — gráfico + cards de baixo */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <TradingChart
              candles={engine.candles}
              currentPrice={engine.currentPrice}
              currentTimeSec={engine.currentTimeSec}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Leaderboard />
              <Achievements />
            </div>
          </div>

          {/* Coluna lateral — sempre visível, tudo empilhado */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <OrderBook />
            <PositionPanel />
            <TradeControls />
            <PnLDisplay />
          </div>
        </div>
      </main>
    </div>
  );
}
