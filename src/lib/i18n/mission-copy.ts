import type { GameMessages } from "./game-locale";

export interface MissionDisplayCopy {
  title: string;
  description: string;
}

/**
 * Localized title/description for a daily mission. Mission definitions come
 * from the server EN-only (Loop 2 debt), so translation happens client-side
 * keyed by mission id — a mission the catalog does not know yet falls back to
 * the server copy instead of breaking the board.
 *
 * @example resolveMissionCopy({ id: "daily-run", title: "Close the Day", description: "…" }, ptBrGameMessages).title // "Feche o Dia"
 */
export function resolveMissionCopy(
  mission: { id: string; title: string; description: string },
  messages: GameMessages
): MissionDisplayCopy {
  const knownDefinitions: Record<string, MissionDisplayCopy> = messages.missions.definitions;
  const translated = knownDefinitions[mission.id];
  if (!translated) return { title: mission.title, description: mission.description };
  return translated;
}
