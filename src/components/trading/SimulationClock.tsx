"use client";

import { Clock, Pause, Play, Square, RefreshCw } from "lucide-react";

interface SimulationClockProps {
  elapsedTime: string;
  speed: number;
  progressPercent: number;
  isPlaying: boolean;
  realDateRange: string;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onEnd: () => void;
}

export default function SimulationClock({
  elapsedTime,
  speed,
  progressPercent,
  isPlaying,
  realDateRange,
  onPause,
  onResume,
  onReset,
  onEnd,
}: SimulationClockProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 card-surface">
      <div className="flex items-center gap-4">
        {/* Clock Icon + Time */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-crypto-accent-dim flex items-center justify-center">
            <Clock className="w-4 h-4 text-crypto-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Simulation Time</span>
            <span className="text-lg font-bold font-mono text-crypto-text tabular-nums leading-none mt-0.5">{elapsedTime}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-crypto-border" />

        {/* Progress */}
        <div className="flex flex-col gap-1 w-48">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Progress</span>
            <span className="text-[10px] font-bold font-mono text-crypto-accent">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-crypto-surface-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-crypto-accent to-crypto-cyan transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed badge */}
        <div className="px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
          <span className="text-xs font-bold font-mono text-crypto-accent">{speed}x</span>
        </div>

        {isPlaying ? (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
          >
            <Pause className="w-4 h-4" />
            <span className="text-xs font-semibold">Pause</span>
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
          >
            <Play className="w-4 h-4" />
            <span className="text-xs font-semibold">Resume</span>
          </button>
        )}

        <button
          onClick={onEnd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-warning-dim border border-crypto-warning/30 text-crypto-warning hover:bg-crypto-warning/20 transition-all"
        >
          <Square className="w-4 h-4" />
          <span className="text-xs font-semibold">End</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-semibold">New</span>
        </button>
      </div>
    </div>
  );
}
