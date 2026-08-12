/**
 * Deterministic particle layouts for the called-shot diamond celebration.
 * Pure — no DOM, no Math.random — so burst geometry is unit-testable and a
 * given resolvedAt seed always replays the exact same burst.
 */

export interface DiamondBurstParticle {
  id: number;
  angleDeg: number;
  distancePx: number;
  scale: number;
  delayMs: number;
  emoji: "💎" | "✨";
}

export const DIAMOND_BURST_MIN_DISTANCE_PX = 60;
export const DIAMOND_BURST_MAX_DISTANCE_PX = 160;
export const DIAMOND_BURST_MAX_DELAY_MS = 200;
export const DIAMOND_BURST_MIN_SCALE = 0.7;
export const DIAMOND_BURST_MAX_SCALE = 1.4;

// Numerical Recipes LCG constants; 1664525 * 2^32 < 2^53 keeps the math exact.
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 2 ** 32;

/**
 * Builds a seeded pseudo-random generator yielding floats in [0, 1).
 * Same seed → same sequence, which is what makes burst layouts assertable.
 *
 * Example:
 *   const nextUnit = buildSeededUnitRandom(42);
 *   nextUnit(); // always the same first value for seed 42
 */
export function buildSeededUnitRandom(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) % LCG_MODULUS;
  return () => {
    state = (LCG_MULTIPLIER * state + LCG_INCREMENT) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
}

/**
 * Builds `count` deterministic burst particles spread across 360°: each one
 * jittered inside its own angular sector (so the ring never clumps), flying
 * 60–160px with a 0–200ms stagger. Seed with `resolvedAt` for a unique-yet-
 * reproducible burst per called-shot hit.
 *
 * Example:
 *   buildDiamondBurstParticles(14, 1723456789)[0]
 *   // → { id: 0, angleDeg: 12.3…, distancePx: 87.1…, scale: 1.05…, delayMs: 140, emoji: "💎" }
 */
export function buildDiamondBurstParticles(count: number, seed: number): DiamondBurstParticle[] {
  const nextUnit = buildSeededUnitRandom(seed);
  const sectorDeg = 360 / Math.max(count, 1);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    angleDeg: index * sectorDeg + nextUnit() * sectorDeg,
    distancePx:
      DIAMOND_BURST_MIN_DISTANCE_PX +
      nextUnit() * (DIAMOND_BURST_MAX_DISTANCE_PX - DIAMOND_BURST_MIN_DISTANCE_PX),
    scale: DIAMOND_BURST_MIN_SCALE + nextUnit() * (DIAMOND_BURST_MAX_SCALE - DIAMOND_BURST_MIN_SCALE),
    delayMs: Math.round(nextUnit() * DIAMOND_BURST_MAX_DELAY_MS),
    // ~2/3 diamonds keeps the reward icon dominant; sparkles are filler.
    emoji: nextUnit() < 0.65 ? "💎" : "✨",
  }));
}
