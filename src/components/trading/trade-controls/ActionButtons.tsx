"use client";

import type { Position } from "@/store/tradingStore";

interface ActionButtonsProps {
  position: Position | null;
  orderType: "market" | "limit";
  side: "long" | "short";
  isReduceMode: boolean;
  reduceOnly: boolean;
  canOpen: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  canFlip: boolean;
  positionSize: number;
  onOpen: () => void;
  onUpdate: () => void;
  onClose: () => void;
}

export default function ActionButtons({
  position,
  orderType,
  side,
  isReduceMode,
  reduceOnly,
  canOpen,
  canIncrease,
  canDecrease,
  canFlip,
  positionSize,
  onOpen,
  onUpdate,
  onClose,
}: ActionButtonsProps) {
  // Position open + market order
  if (position && orderType === "market") {
    return (
      <div className="space-y-2">
        {side === position.side ? (
          <ActionButton
            testId="trade-controls-action-btn"
            onClick={onUpdate}
            disabled={!canIncrease}
            variant={position.side === "long" ? "long" : "short"}
            label="INCREASE POSITION"
          />
        ) : reduceOnly ? (
          <ActionButton
            testId="trade-controls-action-btn"
            onClick={onUpdate}
            disabled={!canDecrease}
            variant="warning"
            label="REDUCE POSITION"
          />
        ) : (
          <ActionButton
            testId="trade-controls-action-btn"
            onClick={onUpdate}
            disabled={!canFlip}
            variant={side === "long" ? "long" : "short"}
            label={
              positionSize >= position.size
                ? `FLIP TO ${side.toUpperCase()}`
                : "REDUCE POSITION"
            }
          />
        )}
        <CloseButton onClick={onClose} />
      </div>
    );
  }

  // Position open + limit order
  if (position && orderType === "limit") {
    const enabled = isReduceMode
      ? !reduceOnly
        ? canFlip
        : canDecrease
      : canOpen;

    return (
      <div className="space-y-2">
        <ActionButton
          testId="trade-controls-action-btn"
          onClick={onOpen}
          disabled={!enabled}
          variant={side === "long" ? "long" : "short"}
          label={`Place ${side === "long" ? "Long" : "Short"} Limit`}
        />
        <CloseButton onClick={onClose} />
      </div>
    );
  }

  // No position
  const noPositionLabel =
    orderType === "limit"
      ? `Place ${side === "long" ? "Long" : "Short"} Limit`
      : `Open ${side === "long" ? "Long" : "Short"}`;

  return (
    <ActionButton
      testId="trade-controls-action-btn"
      onClick={onOpen}
      disabled={!canOpen}
      variant={side === "long" ? "long" : "short"}
      label={noPositionLabel}
    />
  );
}

function ActionButton({
  testId,
  onClick,
  disabled,
  variant,
  label,
}: {
  testId: string;
  onClick: () => void;
  disabled: boolean;
  variant: "long" | "short" | "warning";
  label: string;
}) {
  const variantClasses = {
    long: "bg-crypto-long text-black hover:shadow-glow-long",
    short: "bg-crypto-short text-white hover:shadow-glow-short",
    warning: "bg-crypto-warning text-black hover:bg-crypto-warning/90",
  };

  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-full font-bold py-2.5 px-4 rounded-lg transition-colors text-sm ${
        disabled
          ? "bg-crypto-surface-elevated text-crypto-text-muted cursor-not-allowed"
          : variantClasses[variant]
      }`}
    >
      {label}
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="trade-controls-close-btn"
      aria-label="Close Position"
      onClick={onClick}
      className="w-full font-bold py-2.5 px-4 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm"
    >
      CLOSE POSITION
    </button>
  );
}
