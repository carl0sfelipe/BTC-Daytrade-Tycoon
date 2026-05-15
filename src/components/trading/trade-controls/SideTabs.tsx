"use client";

import type { Position } from "@/store/tradingStore";

type Side = "long" | "short";

interface SideTabsProps {
  side: Side;
  position: Position | null;
  orderType: "market" | "limit";
  onSideChange: (side: Side) => void;
}

function getSideLabel(
  position: Position | null,
  orderType: "market" | "limit",
  tabSide: Side
): string | null {
  if (!position || orderType !== "limit") return null;
  if (position.side === tabSide) return "Increase";
  return "Reduce";
}

export default function SideTabs({
  side,
  position,
  orderType,
  onSideChange,
}: SideTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <SideButton
        side="long"
        isActive={side === "long"}
        label={getSideLabel(position, orderType, "long")}
        onClick={() => onSideChange("long")}
      />
      <SideButton
        side="short"
        isActive={side === "short"}
        label={getSideLabel(position, orderType, "short")}
        onClick={() => onSideChange("short")}
      />
    </div>
  );
}

function SideButton({
  side,
  isActive,
  label,
  onClick,
}: {
  side: Side;
  isActive: boolean;
  label: string | null;
  onClick: () => void;
}) {
  const isLong = side === "long";

  return (
    <button
      type="button"
      data-testid={`trade-controls-side-${side}`}
      onClick={onClick}
      className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border ${
        isActive
          ? isLong
            ? "bg-crypto-long text-black border-crypto-long shadow-glow-long"
            : "bg-crypto-short text-white border-crypto-short shadow-glow-short"
          : "bg-crypto-surface-elevated text-crypto-text-secondary border-crypto-border hover:border-crypto-text-muted"
      }`}
    >
      {side.toUpperCase()}
      {label && (
        <span className="block text-[8px] font-normal normal-case opacity-70">
          {label}
        </span>
      )}
    </button>
  );
}
