/** Roguelike run settings (PRD_ROGUELIKE_PVP.md, Phase R1). */
export const RUN_DURATION_SEC = 600; // 10 simulated-clock minutes per run

/** Below this many seconds the countdown switches to the critical style. */
export const RUN_COUNTDOWN_CRITICAL_SEC = 60;

export function parseElapsedToSeconds(elapsedTime: string): number {
  const [h, m, s] = elapsedTime.split(":").map(Number);
  if ([h, m, s].some(Number.isNaN)) return 0;
  return h * 3600 + m * 60 + s;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
