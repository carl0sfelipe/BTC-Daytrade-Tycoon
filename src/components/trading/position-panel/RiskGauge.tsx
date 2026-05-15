interface RiskGaugeProps {
  barPercent: number;
  distanceToLiq: number;
  isCritical: boolean;
  isDanger: boolean;
}

export function RiskGauge({ barPercent, distanceToLiq, isCritical, isDanger }: RiskGaugeProps) {
  const statusColor = isCritical ? "text-crypto-short" : isDanger ? "text-crypto-warning" : "text-crypto-long";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Distance to Liquidation</span>
        <span className={`text-xs font-bold font-mono tabular-nums ${statusColor}`}>
          {distanceToLiq.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-crypto-surface-elevated overflow-hidden">
        <div
          data-testid="distance-bar"
          role="progressbar"
          aria-valuenow={Math.round(barPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full risk-gradient transition-all duration-100"
          style={{ width: `${barPercent}%`, minWidth: "2px" }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-crypto-text-muted">
        <span>Safe</span>
        <span>Dangerous</span>
        <span>Critical</span>
      </div>
    </div>
  );
}
