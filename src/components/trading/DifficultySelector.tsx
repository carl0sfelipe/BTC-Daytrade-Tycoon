"use client";
import { DIFFICULTY_PRESETS, type DifficultyKey } from "@/lib/difficulty";
import { useTradingStore } from "@/store/tradingStore";

interface DifficultySelectorProps {
  onConfirm: () => void;
}

export default function DifficultySelector({ onConfirm }: DifficultySelectorProps) {
  const difficulty = useTradingStore((s) => s.difficulty);
  const setDifficulty = useTradingStore((s) => s.setDifficulty);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="difficulty-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 animate-slide-in">
        <div className="card-surface border border-crypto-border overflow-hidden">
          <div className="px-6 py-5 border-b border-crypto-border">
            <h2 id="difficulty-title" className="text-lg font-bold text-crypto-text">
              Select Difficulty
            </h2>
            <p className="text-xs text-crypto-text-muted mt-1">
              Choose your challenge level — affects starting wallet and max leverage
            </p>
          </div>

          <div className="p-6 space-y-3">
            {(Object.entries(DIFFICULTY_PRESETS) as [DifficultyKey, (typeof DIFFICULTY_PRESETS)[DifficultyKey]][]).map(
              ([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    difficulty === key
                      ? "bg-crypto-surface-elevated border-crypto-accent shadow-glow-accent/20"
                      : "bg-crypto-surface border-crypto-border hover:border-crypto-text-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={preset.label}>
                        {preset.emoji}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-crypto-text">{preset.label}</span>
                          {difficulty === key && (
                            <span className="text-[10px] bg-crypto-accent text-white px-1.5 py-0.5 rounded font-semibold">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-crypto-text-muted">{preset.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-sm font-bold font-mono text-crypto-text">
                        ${preset.wallet.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-crypto-text-muted">max {preset.maxLeverage}x</div>
                    </div>
                  </div>
                </button>
              )
            )}

            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3 rounded-lg bg-crypto-accent text-white font-bold text-sm hover:bg-crypto-accent/90 transition-all shadow-glow-accent mt-2"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
