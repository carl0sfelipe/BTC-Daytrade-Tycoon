"use client";

interface OrderTypeToggleProps {
  orderType: "market" | "limit";
  onChange: (type: "market" | "limit") => void;
}

export default function OrderTypeToggle({
  orderType,
  onChange,
}: OrderTypeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <TypeButton
        type="market"
        isActive={orderType === "market"}
        onClick={() => onChange("market")}
      />
      <TypeButton
        type="limit"
        isActive={orderType === "limit"}
        onClick={() => onChange("limit")}
      />
    </div>
  );
}

function TypeButton({
  type,
  isActive,
  onClick,
}: {
  type: "market" | "limit";
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
        isActive
          ? "bg-crypto-accent-dim text-crypto-accent border border-crypto-accent/30"
          : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border"
      }`}
    >
      {type === "market" ? "Market" : "Limit"}
    </button>
  );
}
