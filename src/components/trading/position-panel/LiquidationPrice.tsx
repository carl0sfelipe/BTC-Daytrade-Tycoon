import { AlertTriangle } from "lucide-react";

interface LiquidationPriceProps {
  price: number;
}

export function LiquidationPrice({ price }: LiquidationPriceProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-crypto-short-dim border border-crypto-short/20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-crypto-short" />
        <span className="text-xs font-semibold text-crypto-short">Liquidation Price</span>
      </div>
      <span className="text-sm font-bold font-mono text-crypto-short tabular-nums">
        ${price.toFixed(2)}
      </span>
    </div>
  );
}
