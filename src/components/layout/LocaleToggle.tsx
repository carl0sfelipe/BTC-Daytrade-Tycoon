"use client";

import { useTradingStore } from "@/store/tradingStore";
import { GAME_LOCALE_SHORT_LABELS, nextGameLocale } from "@/lib/i18n/game-locale";
import { useGameMessages } from "@/hooks/useGameMessages";
import { useMounted } from "@/hooks/useMounted";

/**
 * One-tap language switch (Boss decision 2026-08-12: EN default + PT-BR).
 * Shows the TARGET locale — "PT" while in English — so the label reads as
 * "switch to", the common game-settings convention.
 *
 * @example <LocaleToggle />  // renders "PT" while gameLocale is "en"
 */
export default function LocaleToggle() {
  const gameLocale = useTradingStore((s) => s.gameLocale);
  const setGameLocale = useTradingStore((s) => s.setGameLocale);
  const messages = useGameMessages();
  const mounted = useMounted();
  // gameLocale rehydrates from localStorage, so the server always renders the
  // EN-default label while the client could start at pt-BR. The Header (and
  // this toggle) renders on routes without the trading page's mounted gate,
  // so until mount we render the same stable EN-default label ("PT", same
  // size as "EN") that the server produced — no hydration mismatch.
  const displayLocale = mounted ? gameLocale : "en";
  const targetLocale = nextGameLocale(displayLocale);

  return (
    <button
      type="button"
      data-testid="locale-toggle"
      aria-label={messages.nav.switchLanguage}
      onClick={() => setGameLocale(targetLocale)}
      className="px-2.5 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-xs font-bold text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all"
    >
      {GAME_LOCALE_SHORT_LABELS[targetLocale]}
    </button>
  );
}
