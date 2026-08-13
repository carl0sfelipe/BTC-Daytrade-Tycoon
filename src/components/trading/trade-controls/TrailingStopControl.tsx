"use client";

import { useGameMessages } from "@/hooks/useGameMessages";

// Range enforced by the original UI (commit 004b87e) plus the Set-button
// max validation added in a5a87eb: 0 < percent <= 20, stepping by 0.1%.
const TRAILING_PERCENT_MIN = 0.1;
const TRAILING_PERCENT_MAX = 20;

interface TrailingStopControlProps {
  trailingStopPercent: number | null;
  trailingStopPrice: number | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  /** Store action `setTrailingStop`: a percent arms the stop, null removes it. */
  onSetTrailingStop: (percent: number | null) => void;
}

function isArmablePercent(rawInput: string): boolean {
  const percent = parseFloat(rawInput);
  return percent > 0 && percent <= TRAILING_PERCENT_MAX;
}

/**
 * Trailing-stop arm/remove control, rendered below the size selector while a
 * position is open and the controls are not in reduce mode. Restores the UI
 * dropped by refactor 3193d78 with the original behavior: percent input,
 * Set button (disabled outside 0–20%), Remove button while a stop is active,
 * and the live stop price shown next to the label.
 *
 * @example
 * <TrailingStopControl trailingStopPercent={5} trailingStopPrice={47500}
 *   inputValue="" onInputChange={setInput} onSetTrailingStop={setTrailingStop} />
 */
export default function TrailingStopControl({
  trailingStopPercent,
  trailingStopPrice,
  inputValue,
  onInputChange,
  onSetTrailingStop,
}: TrailingStopControlProps) {
  const handleArm = () => {
    if (!isArmablePercent(inputValue)) return;
    onSetTrailingStop(parseFloat(inputValue));
  };

  const handleRemove = () => {
    onSetTrailingStop(null);
    onInputChange("");
  };

  return (
    <div className="space-y-1.5 pt-1">
      <TrailingStopHeader
        trailingStopPercent={trailingStopPercent}
        trailingStopPrice={trailingStopPrice}
      />
      <div className="flex gap-2">
        <TrailingPercentInput value={inputValue} onChange={onInputChange} />
        {trailingStopPercent != null ? (
          <RemoveTrailingStopButton onClick={handleRemove} />
        ) : (
          <ArmTrailingStopButton
            disabled={!isArmablePercent(inputValue)}
            onClick={handleArm}
          />
        )}
      </div>
    </div>
  );
}

function TrailingStopHeader({
  trailingStopPercent,
  trailingStopPrice,
}: {
  trailingStopPercent: number | null;
  trailingStopPrice: number | null;
}) {
  const messages = useGameMessages();
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
        {messages.tradeControls.trailingStopLabel}
      </span>
      {trailingStopPercent != null && trailingStopPrice != null && (
        <span className="text-[10px] font-mono text-crypto-warning">
          {messages.tradeControls.trailingStopActiveAt(
            trailingStopPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })
          )}
        </span>
      )}
    </div>
  );
}

function TrailingPercentInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const messages = useGameMessages();
  return (
    <div className="relative flex-1">
      <input
        type="number"
        data-testid="trailing-stop-input"
        min={TRAILING_PERCENT_MIN}
        max={TRAILING_PERCENT_MAX}
        step={0.1}
        placeholder={messages.tradeControls.trailingStopPlaceholder}
        aria-label={messages.tradeControls.trailingStopInputAria}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-accent"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-crypto-text-muted">
        %
      </span>
    </div>
  );
}

function ArmTrailingStopButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  const messages = useGameMessages();
  return (
    <button
      type="button"
      data-testid="trailing-stop-set"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-semibold text-crypto-text-secondary hover:text-crypto-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {messages.tradeControls.trailingStopSet}
    </button>
  );
}

function RemoveTrailingStopButton({ onClick }: { onClick: () => void }) {
  const messages = useGameMessages();
  return (
    <button
      type="button"
      data-testid="trailing-stop-remove"
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-semibold text-crypto-text-secondary hover:text-crypto-short transition-colors"
    >
      {messages.tradeControls.trailingStopRemove}
    </button>
  );
}
