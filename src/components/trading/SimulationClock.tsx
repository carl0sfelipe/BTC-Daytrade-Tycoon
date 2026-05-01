"use client";

import { Play, Pause, RotateCcw } from "lucide-react";

interface SimulationClockProps {
  elapsedTime: string;
  speed: number;
  progressPercent: number;
  isPlaying: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export default function SimulationClock({
  elapsedTime,
  speed,
  progressPercent,
  isPlaying,
  onPause,
  onResume,
  onReset,
}: SimulationClockProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <div className="text-2xl">⏱</div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Tempo de Simulação</div>
          <div className="text-lg font-mono font-bold text-green-400">
            {elapsedTime}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-gray-400">Velocidade</div>
          <div className="text-sm font-bold">{speed}x</div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-xs text-gray-400">Progresso</div>
          <div className="text-sm font-bold">{progressPercent.toFixed(1)}%</div>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Continuar
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            title="Nova simulação"
          >
            <RotateCcw className="w-4 h-4" />
            Nova
          </button>
        </div>
      </div>

      {/* Barra de progresso mobile */}
      <div className="w-full sm:hidden">
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
