"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";

interface TpSlPanelProps {
  tpPrice: string;
  slPrice: string;
  tpOrderPrice: string;
  slOrderPrice: string;
  currentPrice: number;
  onTpChange: (v: string) => void;
  onSlChange: (v: string) => void;
  onTpOrderPriceChange: (v: string) => void;
  onSlOrderPriceChange: (v: string) => void;
}

const STEP_OPTIONS = [10, 50, 100, 250];

export default function TpSlPanel({
  tpPrice,
  slPrice,
  tpOrderPrice,
  slOrderPrice,
  currentPrice,
  onTpChange,
  onSlChange,
  onTpOrderPriceChange,
  onSlOrderPriceChange,
}: TpSlPanelProps) {
  const [showTp, setShowTp] = useState(false);
  const [showSl, setShowSl] = useState(false);
  const [step, setStep] = useState(100);
  const [showStepSelector, setShowStepSelector] = useState(false);

  const hasAnyOpen = showTp || showSl;

  return (
    <div className="space-y-2">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2">
        <ToggleButton
          label="TP"
          value={tpPrice}
          isOpen={showTp}
          colorClass="crypto-long"
          onClick={() => {
            setShowTp(!showTp);
            if (!showTp) setShowSl(false);
          }}
        />
        <ToggleButton
          label="SL"
          value={slPrice}
          isOpen={showSl}
          colorClass="crypto-short"
          onClick={() => {
            setShowSl(!showSl);
            if (!showSl) setShowTp(false);
          }}
        />
      </div>

      {/* Step selector */}
      {hasAnyOpen && (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setShowStepSelector(!showStepSelector)}
            className="text-[10px] font-mono text-crypto-text-secondary hover:text-crypto-text transition-colors"
          >
            step ${step}
          </button>
          {showStepSelector &&
            STEP_OPTIONS.map((s) => (
              <StepButton
                key={s}
                step={s}
                isActive={step === s}
                onClick={() => {
                  setStep(s);
                  setShowStepSelector(false);
                }}
              />
            ))}
        </div>
      )}

      {/* TP expanded */}
      {showTp && (
        <TpSlInputGroup
          label="Trigger Price"
          colorClass="crypto-long"
          value={tpPrice}
          orderValue={tpOrderPrice}
          currentPrice={currentPrice}
          step={step}
          onValueChange={onTpChange}
          onOrderValueChange={onTpOrderPriceChange}
        />
      )}

      {/* SL expanded */}
      {showSl && (
        <TpSlInputGroup
          label="Trigger Price"
          colorClass="crypto-short"
          value={slPrice}
          orderValue={slOrderPrice}
          currentPrice={currentPrice}
          step={step}
          onValueChange={onSlChange}
          onOrderValueChange={onSlOrderPriceChange}
        />
      )}
    </div>
  );
}

function ToggleButton({
  label,
  value,
  isOpen,
  colorClass,
  onClick,
}: {
  label: string;
  value: string;
  isOpen: boolean;
  colorClass: string;
  onClick: () => void;
}) {
  const activeBg = isOpen ? `bg-${colorClass}-dim` : value ? `bg-${colorClass}-dim/30` : "bg-crypto-surface-elevated";
  const activeBorder = isOpen ? `border-${colorClass}` : value ? `border-${colorClass}/30` : "border-crypto-border";
  const activeText = isOpen || value ? `text-${colorClass}` : "text-crypto-text-secondary";
  const hoverBorder = `hover:border-${colorClass}/50`;
  const hoverText = `hover:text-${colorClass}`;

  // Tailwind doesn't parse dynamic class names; use inline styles as fallback
  const colorMap: Record<string, string> = {
    "crypto-long": "#00d4a8",
    "crypto-short": "#ff4757",
  };
  const baseColor = colorMap[colorClass] || "#9999b3";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all"
      style={{
        backgroundColor: isOpen
          ? `${baseColor}20`
          : value
          ? `${baseColor}10`
          : "#1e1e2d",
        borderColor: isOpen
          ? baseColor
          : value
          ? `${baseColor}50`
          : "#26263a",
        color: isOpen || value ? baseColor : "#9999b3",
      }}
    >
      {label === "TP" ? "🎯" : "🛡️"}{" "}
      {value ? `${label} $${parseFloat(value).toFixed(0)}` : `Set ${label === "TP" ? "Take Profit" : "Stop Loss"}`}
    </button>
  );
}

function StepButton({
  step,
  isActive,
  onClick,
}: {
  step: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
        isActive
          ? "bg-crypto-accent text-white"
          : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
      }`}
    >
      ${step}
    </button>
  );
}

function TpSlInputGroup({
  label,
  colorClass,
  value,
  orderValue,
  currentPrice,
  step,
  onValueChange,
  onOrderValueChange,
}: {
  label: string;
  colorClass: string;
  value: string;
  orderValue: string;
  currentPrice: number;
  step: number;
  onValueChange: (v: string) => void;
  onOrderValueChange: (v: string) => void;
}) {
  const borderColor = colorClass === "crypto-long" ? "border-crypto-long/30" : "border-crypto-short/30";
  const focusBorder = colorClass === "crypto-long" ? "focus:border-crypto-long" : "focus:border-crypto-short";

  return (
    <div className="space-y-1.5 p-2.5 rounded-lg bg-crypto-surface-elevated/50 border border-crypto-border">
      <PriceInputRow
        label={label}
        value={value}
        placeholder="0.00"
        currentPrice={currentPrice}
        step={step}
        borderColor={borderColor}
        focusBorder={focusBorder}
        onChange={onValueChange}
      />
      <PriceInputRow
        label="Order Price"
        subLabel="(empty = market)"
        value={orderValue}
        placeholder="market"
        currentPrice={currentPrice}
        step={step}
        borderColor="border-crypto-border"
        focusBorder="focus:border-crypto-accent"
        onChange={onOrderValueChange}
      />
    </div>
  );
}

function PriceInputRow({
  label,
  subLabel,
  value,
  placeholder,
  currentPrice,
  step,
  borderColor,
  focusBorder,
  onChange,
}: {
  label: string;
  subLabel?: string;
  value: string;
  placeholder: string;
  currentPrice: number;
  step: number;
  borderColor: string;
  focusBorder: string;
  onChange: (v: string) => void;
}) {
  const parsed = parseFloat(value) || currentPrice;

  return (
    <div className="space-y-1">
      <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">
        {label}{" "}
        {subLabel && <span className="normal-case">{subLabel}</span>}
      </span>
      <div className="flex items-center gap-1">
        <StepChevron direction="down" onClick={() => onChange((parsed - step).toFixed(2))} />
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border ${borderColor} text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none ${focusBorder}`}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <StepChevron direction="up" onClick={() => onChange((parsed + step).toFixed(2))} />
      </div>
    </div>
  );
}

function StepChevron({
  direction,
  onClick,
}: {
  direction: "up" | "down";
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all"
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}
