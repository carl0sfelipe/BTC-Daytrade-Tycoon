"use client";

import { useState } from "react";
import { Clock, EyeOff, Gauge, ChevronRight, ChevronLeft, Zap } from "lucide-react";

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  "crypto-accent": { bg: "bg-crypto-accent-dim", text: "text-crypto-accent", border: "border-crypto-accent/30" },
  "crypto-cyan": { bg: "bg-crypto-cyan/15", text: "text-crypto-cyan", border: "border-crypto-cyan/30" },
  "crypto-warning": { bg: "bg-crypto-warning-dim", text: "text-crypto-warning", border: "border-crypto-warning/30" },
};

const steps = [
  {
    icon: Clock,
    title: "TimeWarp",
    color: "crypto-accent",
    description:
      "You've been dropped on a random day between 2017 and 2020. Time runs 60x faster — 1 real second = 1 market minute.",
  },
  {
    icon: EyeOff,
    title: "Blind Date",
    color: "crypto-cyan",
    description:
      "The date is completely hidden. No time axis on the chart, no calendar. You read the market blindly, without bias.",
  },
  {
    icon: Gauge,
    title: "Leverage",
    color: "crypto-warning",
    description:
      "From 2x to 100x. The higher the leverage, the closer to liquidation. The Risk Gauge shows your distance from danger in real time.",
  },
];

interface OnboardingModalProps {
  onStart: () => void;
}

export default function OnboardingModal({ onStart }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const c = COLOR_MAP[current.color];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="card-surface border border-crypto-border overflow-hidden">
          {/* Header with logo */}
          <div className="px-6 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crypto-accent to-crypto-cyan flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-crypto-text">Welcome to TimeWarp</span>
            </div>
            <button
              onClick={onStart}
              className="text-xs font-semibold text-crypto-text-secondary hover:text-crypto-text transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Step content */}
          <div className="px-6 py-6">
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${c.bg} flex items-center justify-center mx-auto border ${c.border}`}>
                <Icon className={`w-8 h-8 ${c.text}`} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-crypto-text mb-2">{current.title}</h3>
                <p className="text-sm text-crypto-text-secondary leading-relaxed">{current.description}</p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-crypto-accent" : "w-1.5 bg-crypto-border"}`}
                />
              ))}
            </div>
          </div>

          {/* Footer nav */}
          <div className="px-6 py-4 border-t border-crypto-border flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-crypto-accent text-white text-sm font-semibold hover:bg-crypto-accent/90 transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onStart}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-crypto-long text-black text-sm font-bold hover:bg-crypto-long/90 transition-all shadow-glow-long"
              >
                <Zap className="w-4 h-4" />
                Start Simulation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
