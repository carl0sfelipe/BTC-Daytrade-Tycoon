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
import { useTimewarpEngine } from "@/hooks/useTimewarpEngine";
import { useTradingStore } from "@/store/tradingStore";

export default function TradingPage() {
  const [mounted, setMounted] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const engine = useTimewarpEngine();
  const isLiquidated = useTradingStore((s) => s.isLiquidated);
  const simulationRealDate = useTradingStore((s) => s.simulationRealDate);
  const clearLiquidated = useTradingStore((s) => s.clearLiquidated);

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

  const handleNewSession = () => {
    clearLiquidated();
    setShowEndModal(false);
    engine.reset();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

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
          {/* Coluna principal — gráfico + cards de baixo */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <TradingChart
              candles={engine.candles}
              currentPrice={engine.currentPrice}
              currentTimeSec={engine.currentTimeSec}
            />

            <TradeHistory />
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

      {/* Modal de liquidação */}
      {isLiquidated && simulationRealDate && (
        <LiquidationModal
          realDate={simulationRealDate}
          onNewSession={handleNewSession}
        />
      )}

      {/* Modal de encerramento manual */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              Simulação Encerrada
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Você encerrou a sessão antes do fim. Aqui está o período histórico que você estava tradando:
            </p>

            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Período Histórico Real
              </div>
              <div className="text-lg font-mono font-bold text-yellow-400">
                {engine.realDateRange}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Dados reais da Binance que você estava tradando
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleNewSession}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Nova Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
