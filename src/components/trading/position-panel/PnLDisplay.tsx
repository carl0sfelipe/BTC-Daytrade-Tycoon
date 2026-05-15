import { Crosshair } from "lucide-react";

interface PnLDisplayProps {
  pnl: number;
  pnlPercent: number;
  realizedPnL: number;
}

export function PnLDisplay({ pnl, pnlPercent, realizedPnL }: PnLDisplayProps) {
  const isProfit = pnl >= 0;
  const colorClass = isProfit ? "text-crypto-long text-glow-long" : "text-crypto-short text-glow-short";
  const percentColor = isProfit ? "text-crypto-long" : "text-crypto-short";
  const realizedColor = realizedPnL >= 0 ? "text-crypto-long" : "text-crypto-short";

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Unrealized P&L</span>
        <div className="flex items-baseline gap-2">
          <span data-testid="position-panel-pnl" className={`text-2xl font-bold font-mono tabular-nums ${colorClass}`}>
            {isProfit ? "+" : ""}${pnl.toFixed(2)}
          </span>
          <span data-testid="position-panel-pnl-percent" className={`text-sm font-bold font-mono tabular-nums ${percentColor}`}>
            ({isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%)
          </span>
        </div>
        {realizedPnL !== 0 && (
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Realized P&L</span>
            <span className={`text-xs font-bold font-mono tabular-nums ${realizedColor}`}>
              {realizedPnL >= 0 ? "+" : ""}${realizedPnL.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      <div className="w-10 h-10 rounded-full bg-crypto-surface-elevated border border-crypto-border flex items-center justify-center">
        <Crosshair className="w-5 h-5 text-crypto-accent" />
      </div>
    </div>
  );
}
