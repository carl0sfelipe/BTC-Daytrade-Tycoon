"use client";

interface LeverageSelectorProps {
  mode: "simple" | "advanced";
  leverage: number;
  maxLeverage: number;
  onChange: (value: number) => void;
}

export default function LeverageSelector({
  mode,
  leverage,
  maxLeverage,
  onChange,
}: LeverageSelectorProps) {
  if (mode === "simple") {
    return <LeveragePills leverage={leverage} maxLeverage={maxLeverage} onChange={onChange} />;
  }

  return <LeverageSlider leverage={leverage} onChange={onChange} />;
}

function LeveragePills({
  leverage,
  maxLeverage,
  onChange,
}: {
  leverage: number;
  maxLeverage: number;
  onChange: (v: number) => void;
}) {
  const options = [2, 5, 10, 25, 50, 100, 125].filter((o) => o <= maxLeverage);

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
        Leverage
      </span>
      <div className="grid grid-cols-6 gap-1.5">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`py-1.5 rounded-md text-xs font-bold font-mono transition-all ${
              leverage === opt
                ? opt >= 50
                  ? "bg-crypto-warning-dim text-crypto-warning border border-crypto-warning/30"
                  : "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
                : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
            }`}
          >
            {opt}x
          </button>
        ))}
      </div>
      {leverage >= 50 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-crypto-warning-dim border border-crypto-warning/20">
          <span className="text-[10px] text-crypto-warning font-semibold">
            ⚠️ High risk of quick liquidation
          </span>
        </div>
      )}
    </div>
  );
}

function LeverageSlider({
  leverage,
  onChange,
}: {
  leverage: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
          Leverage
        </span>
        <span className="text-sm font-bold font-mono text-crypto-accent">
          {leverage}x
        </span>
      </div>
      <input
        type="range"
        min={2}
        max={100}
        value={leverage}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-crypto-surface-elevated accent-crypto-accent cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
        <span>2x</span>
        <span>25x</span>
        <span>50x</span>
        <span>100x</span>
      </div>
    </div>
  );
}
