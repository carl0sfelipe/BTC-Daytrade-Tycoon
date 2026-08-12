import { useGameMessages } from "@/hooks/useGameMessages";

interface PositionDetailsProps {
  entry: number;
  size: number;
  leverage: number;
  margin: number;
}

export function PositionDetails({ entry, size, leverage, margin }: PositionDetailsProps) {
  const messages = useGameMessages();
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <DetailItem label={messages.positionPanel.entryPrice} value={`$${entry.toFixed(2)}`} />
      <DetailItem label={messages.positionPanel.size} value={`$${size.toLocaleString()}`} />
      <DetailItem label={messages.positionPanel.leverage} value={`${leverage}x`} accent />
      <DetailItem label={messages.positionPanel.margin} value={`$${margin.toFixed(2)}`} />
    </div>
  );
}

function DetailItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-semibold tabular-nums ${accent ? "text-crypto-accent" : "text-crypto-text"}`}>
        {value}
      </span>
    </div>
  );
}
