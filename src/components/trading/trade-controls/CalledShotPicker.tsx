"use client";

import { useTradingStore } from "@/store/tradingStore";
import {
  CALL_TARGET_PILLS,
  MAX_CALL_TARGET_PERCENT,
  MIN_CALL_TARGET_PERCENT,
  computeDiamondReward,
} from "@/lib/calls/diamond-reward";
import { computeTargetPercent } from "@/lib/calls/call-transitions";

interface CalledShotPickerProps {
  side: "long" | "short";
  leverage: number;
  currentPrice: number;
  tpPrice: string;
  onTpChange: (v: string) => void;
}

/**
 * Declares the take-profit as an explicit called shot: pick a target, see the
 * diamond payout before committing. Any TP set here (or typed in the TP panel)
 * becomes the declared call when the market order opens.
 */
export default function CalledShotPicker({
  side,
  leverage,
  currentPrice,
  tpPrice,
  onTpChange,
}: CalledShotPickerProps) {
  const callStreak = useTradingStore((s) => s.callStreak);

  const parsedTp = parseFloat(tpPrice);
  const selectedPercent =
    Number.isFinite(parsedTp) && parsedTp > 0 && currentPrice > 0
      ? computeTargetPercent(side, currentPrice, parsedTp)
      : null;
  const isArmed =
    selectedPercent !== null &&
    selectedPercent >= MIN_CALL_TARGET_PERCENT &&
    selectedPercent <= MAX_CALL_TARGET_PERCENT;
  const previewReward = isArmed
    ? computeDiamondReward(selectedPercent, leverage, callStreak)
    : 0;

  const pillTargetPrice = (percent: number): string => {
    const factor = side === "long" ? 1 + percent / 100 : 1 - percent / 100;
    return (currentPrice * factor).toFixed(2);
  };

  const isPillSelected = (percent: number): boolean =>
    selectedPercent !== null && Math.abs(selectedPercent - percent) < 0.15;

  return (
    <div className="space-y-2 p-2.5 rounded-lg bg-crypto-surface-elevated/50 border border-crypto-border">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-crypto-text-secondary uppercase tracking-wider">
          🎯 Called Shot
        </span>
        <span className="text-[9px] text-crypto-text-muted">
          predict the move, earn 💎
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <CallPill label="No call" isSelected={!isArmed} onClick={() => onTpChange("")} />
        {CALL_TARGET_PILLS.map((percent) => (
          <CallPill
            key={percent}
            label={`${side === "long" ? "+" : "−"}${percent}%`}
            isSelected={isPillSelected(percent)}
            onClick={() => onTpChange(pillTargetPrice(percent))}
          />
        ))}
      </div>

      {isArmed && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-crypto-accent-dim border border-crypto-accent/40">
          <span className="text-[11px] font-semibold text-crypto-accent">
            🎯 {side === "long" ? "+" : "−"}{selectedPercent.toFixed(1)}% @ {leverage}x
          </span>
          <span className="text-[11px] font-bold font-mono text-crypto-accent">
            → {previewReward} 💎 if it hits
          </span>
        </div>
      )}
    </div>
  );
}

function CallPill({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
        isSelected
          ? "bg-crypto-accent text-white border-crypto-accent"
          : "bg-crypto-surface-elevated text-crypto-text-secondary border-crypto-border hover:border-crypto-accent/50 hover:text-crypto-text"
      }`}
    >
      {label}
    </button>
  );
}
