import { TrendingDown } from "lucide-react";

interface TrailingStopIndicatorProps {
  percent: number;
  price: number;
}

export function TrailingStopIndicator({ percent, price }: TrailingStopIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-crypto-warning-dim/30 border border-crypto-warning/20">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-3.5 h-3.5 text-crypto-warning" />
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Trailing Stop</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-crypto-warning">{percent}%</span>
        <span className="text-[10px] text-crypto-text-muted">
          @ ${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
