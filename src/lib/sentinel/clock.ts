import type { VirtualClock } from "./types";

/**
 * Production clock: delegates to the browser's high-resolution timer.
 */
export function createWallClock(): VirtualClock {
  let origin = performance.now();

  return {
    now: () => performance.now() - origin,
    advance: (ms: number) => {
      origin -= ms;
    },
    setTime: (ts: number) => {
      origin = performance.now() - ts;
    },
    getElapsed: () => performance.now() - origin,
  };
}

/**
 * Frozen clock: only advances when explicitly told to.
 *
 * Essential for deterministic replay.
 */
export function createFrozenClock(initialTime = 0): VirtualClock {
  let current = initialTime;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    setTime: (ts: number) => {
      current = ts;
    },
    getElapsed: () => current,
  };
}
