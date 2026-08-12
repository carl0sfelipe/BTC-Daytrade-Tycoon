import { useGameMessages } from "@/hooks/useGameMessages";

interface CloseButtonProps {
  onClose: () => void;
}

export function CloseButton({ onClose }: CloseButtonProps) {
  const messages = useGameMessages();
  return (
    <button
      type="button"
      data-testid="position-panel-close-btn"
      aria-label={messages.positionPanel.closePosition}
      onClick={onClose}
      className="w-full py-2.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-sm font-semibold"
    >
      {messages.positionPanel.closePosition}
    </button>
  );
}
