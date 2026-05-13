"use client";

import type { Position } from "@/store/tradingStore";

interface SizeSelectorProps {
  mode: "simple" | "advanced";
  position: Position | null;
  isReduceMode: boolean;
  wallet: number;
  leverage: number;
  positionSize: number;
  sliderMax: number;
  onChange: (value: number) => void;
}

export default function SizeSelector({
  mode,
  position,
  isReduceMode,
  wallet,
  leverage,
  positionSize,
  sliderMax,
  onChange,
}: SizeSelectorProps) {
  if (position) {
    return (
      <SizeSlider
        label={isReduceMode ? "Reduce Size" : "Increase Size"}
        positionSize={positionSize}
        sliderMax={sliderMax}
        currentSize={position.size}
        onChange={onChange}
      />
    );
  }

  if (mode === "simple") {
    return <SizePills wallet={wallet} leverage={leverage} positionSize={positionSize} onChange={onChange} />;
  }

  return (
    <SizeSlider
      label="Size"
      positionSize={positionSize}
      sliderMax={sliderMax}
      currentSize={null}
      onChange={onChange}
    />
  );
}

function SizePills({
  wallet,
  leverage,
  positionSize,
  onChange,
}: {
  wallet: number;
  leverage: number;
  positionSize: number;
  onChange: (v: number) => void;
}) {
  const options = [10, 25, 50, 100];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
          Position Size
        </span>
        <span className="text-[10px] font-mono text-crypto-text-secondary">
          Max: ${Math.floor(wallet * leverage).toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Position Size">
        {options.map((pct) => {
          const targetSize = Math.floor(wallet * leverage * (pct / 100));
          return (
            <button
              type="button"
              key={pct}
              role="radio"
              aria-checked={Math.abs(positionSize - targetSize) < 1}
              aria-label={`${pct}% position size`}
              onClick={() => onChange(targetSize)}
              className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                Math.abs(positionSize - targetSize) < 1
                  ? "bg-crypto-surface-elevated text-crypto-text border border-crypto-accent"
                  : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
              }`}
            >
              {pct}%
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SizeSlider({
  label,
  positionSize,
  sliderMax,
  currentSize,
  onChange,
}: {
  label: string;
  positionSize: number;
  sliderMax: number;
  currentSize: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
          {label}
        </span>
        {currentSize !== null && (
          <span className="text-[10px] font-mono text-crypto-text-secondary">
            Current: ${Math.floor(currentSize).toLocaleString()}
          </span>
        )}
      </div>
      <input
        data-testid="trade-controls-size-slider"
        type="range"
        min={100}
        max={Math.max(100, sliderMax)}
        step={100}
        value={positionSize}
        aria-label="Position size slider"
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-crypto-surface-elevated accent-crypto-accent cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
        <span>$100</span>
        <span>${Math.floor(sliderMax / 2).toLocaleString()}</span>
        <span>${Math.floor(sliderMax).toLocaleString()}</span>
      </div>
    </div>
  );
}
