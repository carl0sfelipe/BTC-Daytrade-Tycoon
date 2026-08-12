"use client";

import { Clock, Pause, Play, Square, RefreshCw } from "lucide-react";
import { useGameMessages } from "@/hooks/useGameMessages";

interface SimulationClockProps {
  elapsedTime: string;
  speed: number;
  isPlaying: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onEnd: () => void;
  runCountdown?: { display: string; isCritical: boolean };
}

export default function SimulationClock({
  elapsedTime,
  speed,
  isPlaying,
  onPause,
  onResume,
  onReset,
  onEnd,
  runCountdown,
}: SimulationClockProps) {
  const messages = useGameMessages();
  return (
    <div className="flex flex-wrap items-center justify-between px-4 md:px-5 py-3 card-surface gap-y-3">
      <div className="flex items-center gap-4">
        {/* Clock Icon + Time */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-crypto-accent-dim flex items-center justify-center">
            <Clock className="w-4 h-4 text-crypto-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">{messages.simulationClock.simulationTime}</span>
            <span className="text-base md:text-lg font-bold font-mono text-crypto-text tabular-nums leading-none mt-0.5">{elapsedTime}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-crypto-border" />

        {runCountdown && (
          <div className="flex flex-col">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">{messages.simulationClock.runEndsIn}</span>
            <span
              className={`text-base md:text-lg font-bold font-mono tabular-nums leading-none mt-0.5 ${
                runCountdown.isCritical ? "text-crypto-short animate-pulse" : "text-crypto-warning"
              }`}
            >
              ⏳ {runCountdown.display}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Speed badge */}
        <div className="px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border">
          <span className="text-xs font-bold font-mono text-crypto-accent">{speed}x</span>
        </div>

        {isPlaying ? (
          <button
            type="button"
            onClick={onPause}
            aria-label={messages.simulationClock.pause}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
          >
            <Pause className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">{messages.simulationClock.pause}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            aria-label={messages.simulationClock.resume}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
          >
            <Play className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">{messages.simulationClock.resume}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onEnd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-warning-dim border border-crypto-warning/30 text-crypto-warning hover:bg-crypto-warning/20 transition-all"
        >
          <Square className="w-4 h-4" />
          <span className="text-xs font-semibold">{messages.simulationClock.end}</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-semibold">{messages.simulationClock.newSession}</span>
        </button>
      </div>
    </div>
  );
}
