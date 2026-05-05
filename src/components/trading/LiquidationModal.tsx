"use client";

import { Skull, RotateCcw, Home, Calendar, Clock, Timer } from "lucide-react";

interface LiquidationModalProps {
  realDate: string;
  elapsedTime: string;
  simulatedHistoricalTime: string;
  onNewSession: () => void;
}

export default function LiquidationModal({ realDate, elapsedTime, simulatedHistoricalTime, onNewSession }: LiquidationModalProps) {
  // Parse date range into start and end
  const [startDate, endDate] = realDate.split(" → ");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="liquidation-title">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* anim: shake 400ms on modal mount */}
      <div className="relative w-full max-w-md mx-4 animate-shake">
        <div className="card-surface border-2 border-crypto-short overflow-hidden">
          {/* Header - intense red */}
          <div className="px-6 py-5 bg-crypto-short/10 border-b border-crypto-short/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-crypto-short flex items-center justify-center shadow-glow-short">
                <Skull className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="liquidation-title" className="text-lg font-bold text-crypto-short">ACCOUNT LIQUIDATED!</h2>
                <p className="text-xs text-crypto-text-muted">Your margin was completely used up</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Real Historical Period — redesigned */}
            <div className="p-4 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-crypto-accent" />
                <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Real Historical Period</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-crypto-text-muted uppercase">Start</span>
                  <span className="text-sm font-bold font-mono text-crypto-text">{startDate || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-crypto-text-muted uppercase">End</span>
                  <span className="text-sm font-bold font-mono text-crypto-text">{endDate || "—"}</span>
                </div>
              </div>

              {/* Time comparison */}
              <div className="pt-2 border-t border-crypto-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-crypto-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>Your Time</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-crypto-text">{elapsedTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-crypto-text-muted">
                    <Timer className="w-3 h-3" />
                    <span>Historical Time Covered</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-crypto-accent">{simulatedHistoricalTime}</span>
                </div>
              </div>
            </div>

            {/* Quote */}
            <p className="text-center text-sm text-crypto-text-secondary italic">
              "The market always collects its tuition."
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onNewSession}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all text-sm font-semibold"
              >
                <Home className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={onNewSession}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-crypto-short text-white hover:bg-crypto-short/90 transition-all text-sm font-bold shadow-glow-short"
              >
                <RotateCcw className="w-4 h-4" />
                New Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
