interface EmptyStateProps {
  lastCloseReason: string | null;
}

export function EmptyState({ lastCloseReason }: EmptyStateProps) {
  return (
    <div className="card-surface overflow-hidden space-y-0">
      <div className="px-4 py-3 border-b border-crypto-border">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Your Position</h3>
      </div>
      {lastCloseReason && (
        <p data-testid="position-panel-last-close-reason" className="text-center text-crypto-warning text-xs py-2">{lastCloseReason}</p>
      )}
      <div data-testid="position-panel-empty" className="flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-crypto-text-muted">No open position</p>
      </div>
    </div>
  );
}
