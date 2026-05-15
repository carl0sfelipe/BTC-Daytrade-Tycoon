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
  /**
   * Called when the user picks a value by VISUAL PROPORTION
   * (dragging the slider or clicking a percentage pill). The argument
   * is a fraction in [0, 1]. The parent locks this percentage and
   * re-derives the dollar value whenever capacity changes.
   */
  onChangePercent: (pct: number) => void;
  /**
   * Called when the user types a specific dollar amount in the
   * numeric input. The parent stores this as an absolute value;
   * the slider visual will drift if capacity changes.
   */
  onChangeAbsolute: (value: number) => void;
}

export default function SizeSelector({
  mode,
  position,
  isReduceMode,
  wallet,
  leverage,
  positionSize,
  sliderMax,
  onChangePercent,
  onChangeAbsolute,
}: SizeSelectorProps) {
  if (position) {
    return (
      <SizeSlider
        label={isReduceMode ? "Reduce Size" : "Increase Size"}
        positionSize={positionSize}
        sliderMax={sliderMax}
        currentSize={position.size}
        onChangePercent={onChangePercent}
        onChangeAbsolute={onChangeAbsolute}
      />
    );
  }

  if (mode === "simple") {
    return (
      <SizePills
        wallet={wallet}
        leverage={leverage}
        positionSize={positionSize}
        onChangePercent={onChangePercent}
      />
    );
  }

  return (
    <SizeSlider
      label="Size"
      positionSize={positionSize}
      sliderMax={sliderMax}
      currentSize={null}
      onChangePercent={onChangePercent}
      onChangeAbsolute={onChangeAbsolute}
    />
  );
}

function SizePills({
  wallet,
  leverage,
  positionSize,
  onChangePercent,
}: {
  wallet: number;
  leverage: number;
  positionSize: number;
  onChangePercent: (pct: number) => void;
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
              onClick={() => onChangePercent(pct / 100)}
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
  onChangePercent,
  onChangeAbsolute,
}: {
  label: string;
  positionSize: number;
  sliderMax: number;
  currentSize: number | null;
  onChangePercent: (pct: number) => void;
  onChangeAbsolute: (v: number) => void;
}) {
  const safeMax = Math.max(100, sliderMax);

  const handleInputChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(num)) {
      onChangeAbsolute(100);
      return;
    }
    onChangeAbsolute(Math.min(safeMax, Math.max(100, num)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {currentSize !== null && (
            <span className="text-[10px] font-mono text-crypto-text-secondary">
              Current: ${Math.floor(currentSize).toLocaleString()}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            data-testid="trade-controls-size-input"
            aria-label="Position size input"
            value={positionSize.toLocaleString()}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-20 text-right text-xs font-mono bg-crypto-surface-elevated border border-crypto-border rounded px-2 py-0.5 text-crypto-text focus:border-crypto-accent focus:outline-none"
          />
        </div>
      </div>
      <input
        data-testid="trade-controls-size-slider"
        type="range"
        min={100}
        max={safeMax}
        step={100}
        value={positionSize}
        aria-label="Position size slider"
        onChange={(e) => onChangePercent(Number(e.target.value) / safeMax)}
        className="w-full h-1.5 rounded-full appearance-none bg-crypto-surface-elevated accent-crypto-accent cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
        <span>$100</span>
        <span>${Math.floor(safeMax / 2).toLocaleString()}</span>
        <span>${Math.floor(safeMax).toLocaleString()}</span>
      </div>
    </div>
  );
}
