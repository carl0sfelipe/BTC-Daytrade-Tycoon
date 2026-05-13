"use client";

/**
 * Capacity Slider — UX Prototype
 *
 * Visual zones on the position-size slider indicating risk/capacity levels.
 *
 * Zones:
 *   🟢 Safe      — can open/ increase without touching existing position
 *   🟡 Reduce    — will reduce or flip existing position
 *   🔴 Max       — absolute max including unrealized PnL (effective wallet)
 *
 * This is a prototype. To activate, replace SizeSlider in SizeSelector.tsx
 * or add a feature flag.
 */

interface CapacitySliderProps {
  label: string;
  positionSize: number;
  sliderMax: number;
  currentSize: number | null;
  safeMax: number; // max without affecting existing position
  reduceMax: number; // max including reduction/flip
  onChange: (v: number) => void;
}

export default function CapacitySlider({
  label,
  positionSize,
  sliderMax,
  currentSize,
  safeMax,
  reduceMax,
  onChange,
}: CapacitySliderProps) {
  const max = Math.max(100, sliderMax);
  const safePct = Math.min(100, (safeMax / max) * 100);
  const reducePct = Math.min(100, (reduceMax / max) * 100);

  // CSS gradient stops for the track background
  const trackGradient =
    safePct > 0
      ? `linear-gradient(to right, ` +
        `#22c55e 0%, #22c55e ${safePct}%, ` + // green
        `#eab308 ${safePct}%, #eab308 ${reducePct}%, ` + // yellow
        `#ef4444 ${reducePct}%, #ef4444 100%)` // red
      : `linear-gradient(to right, #eab308 0%, #eab308 ${reducePct}%, #ef4444 ${reducePct}%, #ef4444 100%)`;

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

      <div className="relative">
        <input
          data-testid="trade-controls-capacity-slider"
          type="range"
          min={100}
          max={max}
          step={100}
          value={positionSize}
          onChange={(e) => onChange(Number(e.target.value))}
          className="capacity-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: trackGradient } as React.CSSProperties}
        />

        {/* Zone markers */}
        <div className="relative h-3 mt-0.5">
          {safePct > 0 && safePct < 100 && (
            <ZoneMarker left={safePct} label="Safe" color="bg-green-500" />
          )}
          {reducePct > 0 && reducePct < 100 && reducePct !== safePct && (
            <ZoneMarker left={reducePct} label="Flip" color="bg-yellow-500" />
          )}
        </div>
      </div>

      <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
        <span className="text-green-400">${Math.floor(safeMax).toLocaleString()}</span>
        <span className="text-yellow-400">${Math.floor(reduceMax).toLocaleString()}</span>
        <span className="text-red-400">${Math.floor(max).toLocaleString()}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-crypto-text-muted">
        <LegendDot color="bg-green-500" label="Safe" />
        <LegendDot color="bg-yellow-500" label="Flip zone" />
        <LegendDot color="bg-red-500" label="Absolute max" />
      </div>
    </div>
  );
}

function ZoneMarker({
  left,
  label,
  color,
}: {
  left: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
      style={{ left: `${left}%` }}
    >
      <div className={`w-0.5 h-2 ${color}`} />
      <span className="text-[9px] text-crypto-text-muted mt-0.5">{label}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
