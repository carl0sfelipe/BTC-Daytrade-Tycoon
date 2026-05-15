interface ActiveTpSlProps {
  tpPrice: number | null;
  slPrice: number | null;
}

export function ActiveTpSl({ tpPrice, slPrice }: ActiveTpSlProps) {
  if (!tpPrice && !slPrice) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {tpPrice && (
        <div className="flex flex-col p-2 rounded-lg bg-crypto-long-dim border border-crypto-long/20">
          <span className="text-[10px] text-crypto-long uppercase tracking-wider">Take Profit</span>
          <span className="text-sm font-mono font-semibold text-crypto-long">${tpPrice.toFixed(2)}</span>
        </div>
      )}
      {slPrice && (
        <div className="flex flex-col p-2 rounded-lg bg-crypto-short-dim border border-crypto-short/20">
          <span className="text-[10px] text-crypto-short uppercase tracking-wider">Stop Loss</span>
          <span className="text-sm font-mono font-semibold text-crypto-short">${slPrice.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
