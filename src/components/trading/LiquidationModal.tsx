"use client";

import { Skull } from "lucide-react";

interface LiquidationModalProps {
  realDate: string;
  onNewSession: () => void;
}

export default function LiquidationModal({ realDate, onNewSession }: LiquidationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border-2 border-red-600 rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl shadow-red-900/50">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
            <Skull className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-red-500 mb-2">
          CONTA LIQUIDADA!
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Sua posição foi liquidada. O mercado se moveu contra você com força suficiente para zerar a margem.
        </p>

        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Período Histórico Real
          </div>
          <div className="text-lg font-mono font-bold text-yellow-400">
            {realDate}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Dados reais da Binance que você estava tradando
          </div>
        </div>

        <button
          onClick={onNewSession}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Nova Sessão
        </button>
      </div>
    </div>
  );
}
