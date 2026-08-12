"use client";

import type { SimulatedCandle } from "@/lib/binance-api";
import { useVolatilityEvent } from "@/hooks/useVolatilityEvent";
import { useGameMessages } from "@/hooks/useGameMessages";
import type { GameMessages } from "@/lib/i18n/game-locale";

interface VolatilityEventBannerProps {
  candles: SimulatedCandle[];
  currentTimeSec: number;
}

/**
 * Amber banner for the "Extreme Volatility" run event (PRD §3.3): pulsing
 * countdown while incoming, glowing timer while active, nothing otherwise.
 *
 * @example <VolatilityEventBanner candles={engine.candles} currentTimeSec={engine.currentTimeSec} />
 */
export default function VolatilityEventBanner({
  candles,
  currentTimeSec,
}: VolatilityEventBannerProps) {
  const event = useVolatilityEvent(candles, currentTimeSec);
  const messages = useGameMessages();
  if (!event) return null;
  if (event.kind === "incoming") {
    return <IncomingVolatilityBanner seconds={event.seconds} messages={messages} />;
  }
  return <ActiveVolatilityBanner seconds={event.seconds} messages={messages} />;
}

interface VolatilityBannerPhaseProps {
  seconds: number;
  messages: GameMessages;
}

function IncomingVolatilityBanner({ seconds, messages }: VolatilityBannerPhaseProps) {
  return (
    <div
      data-testid="volatility-event-banner"
      data-phase="incoming"
      className="animate-pulse rounded-lg border border-crypto-warning/50 bg-crypto-warning-dim px-3 py-2"
    >
      <span className="text-xs font-semibold text-crypto-warning">
        {messages.volatilityEvent.incomingBanner(seconds)}
      </span>
    </div>
  );
}

function ActiveVolatilityBanner({ seconds, messages }: VolatilityBannerPhaseProps) {
  return (
    <div
      data-testid="volatility-event-banner"
      data-phase="active"
      className="relative rounded-lg border border-crypto-warning bg-crypto-warning-dim px-3 py-2 shadow-glow-warning"
    >
      {/* Glow lives on an absolute overlay so the pulse never shifts layout. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-pulse rounded-lg ring-2 ring-crypto-warning/40"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <span className="text-xs font-bold text-crypto-warning">
          {messages.volatilityEvent.activeBanner(seconds)}
        </span>
        <span className="text-[10px] text-crypto-text-secondary">
          {messages.volatilityEvent.activeHint}
        </span>
      </div>
    </div>
  );
}
