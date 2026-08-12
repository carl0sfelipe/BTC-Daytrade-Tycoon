"use client";

import { useTradingStore } from "@/store/tradingStore";
import { resolveGameMessages, type GameMessages } from "@/lib/i18n/game-locale";
import { useMounted } from "./useMounted";

/**
 * Locale-resolved message catalog for the game UI.
 *
 * Reads `gameLocale` from the trading store instead of a React context on
 * purpose: components rendered outside any provider — and the existing RTL
 * tests with zero i18n setup — keep getting the English default for free.
 *
 * The persisted locale only applies after mount: `gameLocale` rehydrates from
 * localStorage, so the server always renders EN while the client could start
 * at pt-BR. Surfaces outside the trading page's mounted gate (Header, its
 * DiamondCounter titles) would hydrate-mismatch without this deferral.
 *
 * @example useGameMessages().nav.missions // "Missions" (or "Missões" in pt-BR)
 */
export function useGameMessages(): GameMessages {
  const gameLocale = useTradingStore((s) => s.gameLocale);
  const mounted = useMounted();
  return resolveGameMessages(mounted ? gameLocale : "en");
}
