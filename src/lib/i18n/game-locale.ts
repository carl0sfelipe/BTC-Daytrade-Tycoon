import { enGameMessages, type GameMessages } from "./messages/en";
import { ptBrGameMessages } from "./messages/pt-br";

export type { GameMessages } from "./messages/en";

export type GameLocale = "en" | "pt-BR";

/** Toggle cycle order — also the canonical list of supported locales. */
export const GAME_LOCALES: readonly GameLocale[] = ["en", "pt-BR"];

/** Short label shown on the locale toggle button for each locale. */
export const GAME_LOCALE_SHORT_LABELS: Record<GameLocale, string> = {
  en: "EN",
  "pt-BR": "PT",
};

/**
 * Full message catalog for a locale. Anything that is not "pt-BR" falls back
 * to English — that keeps mocked stores (gameLocale undefined) safe.
 *
 * @example resolveGameMessages("pt-BR").nav.missions // "Missões"
 */
export function resolveGameMessages(locale: GameLocale): GameMessages {
  if (locale === "pt-BR") return ptBrGameMessages;
  return enGameMessages;
}

/**
 * Next locale in the toggle cycle — wraps around after the last one.
 *
 * @example nextGameLocale("en") // "pt-BR"
 */
export function nextGameLocale(current: GameLocale): GameLocale {
  const currentIndex = GAME_LOCALES.indexOf(current);
  return GAME_LOCALES[(currentIndex + 1) % GAME_LOCALES.length];
}
