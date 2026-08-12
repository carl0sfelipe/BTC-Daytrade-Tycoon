import { describe, it, expect } from "vitest";
import {
  DIAMOND_BURST_MAX_DELAY_MS,
  DIAMOND_BURST_MAX_DISTANCE_PX,
  DIAMOND_BURST_MAX_SCALE,
  DIAMOND_BURST_MIN_DISTANCE_PX,
  DIAMOND_BURST_MIN_SCALE,
  buildDiamondBurstParticles,
  buildSeededUnitRandom,
} from "./diamond-burst-particles";

describe("buildSeededUnitRandom", () => {
  it("yields the exact same sequence for the same seed", () => {
    const first = buildSeededUnitRandom(42);
    const second = buildSeededUnitRandom(42);
    const firstRun = [first(), first(), first()];
    const secondRun = [second(), second(), second()];
    expect(firstRun).toEqual(secondRun);
  });

  it("yields different sequences for different seeds", () => {
    const seedA = buildSeededUnitRandom(1);
    const seedB = buildSeededUnitRandom(2);
    expect(seedA()).not.toBe(seedB());
  });

  it("stays inside [0, 1)", () => {
    const nextUnit = buildSeededUnitRandom(1_723_456_789_000);
    for (let i = 0; i < 100; i++) {
      const value = nextUnit();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("buildDiamondBurstParticles", () => {
  const SEED = 1_723_456_789_000; // realistic Date.now()-style resolvedAt

  it("is deterministic: same (count, seed) → identical particles", () => {
    expect(buildDiamondBurstParticles(14, SEED)).toEqual(buildDiamondBurstParticles(14, SEED));
  });

  it("produces a different layout for a different seed", () => {
    expect(buildDiamondBurstParticles(14, SEED)).not.toEqual(buildDiamondBurstParticles(14, SEED + 1));
  });

  it("respects the requested count with sequential ids", () => {
    const particles = buildDiamondBurstParticles(14, SEED);
    expect(particles).toHaveLength(14);
    expect(particles.map((p) => p.id)).toEqual(Array.from({ length: 14 }, (_, i) => i));
  });

  it("returns an empty array for count 0", () => {
    expect(buildDiamondBurstParticles(0, SEED)).toEqual([]);
  });

  it("keeps every particle inside the documented ranges", () => {
    for (const particle of buildDiamondBurstParticles(50, SEED)) {
      expect(particle.angleDeg).toBeGreaterThanOrEqual(0);
      expect(particle.angleDeg).toBeLessThan(360);
      expect(particle.distancePx).toBeGreaterThanOrEqual(DIAMOND_BURST_MIN_DISTANCE_PX);
      expect(particle.distancePx).toBeLessThanOrEqual(DIAMOND_BURST_MAX_DISTANCE_PX);
      expect(particle.delayMs).toBeGreaterThanOrEqual(0);
      expect(particle.delayMs).toBeLessThanOrEqual(DIAMOND_BURST_MAX_DELAY_MS);
      expect(particle.scale).toBeGreaterThanOrEqual(DIAMOND_BURST_MIN_SCALE);
      expect(particle.scale).toBeLessThanOrEqual(DIAMOND_BURST_MAX_SCALE);
    }
  });

  it("spreads particles across 360°: each one stays inside its own sector", () => {
    const count = 14;
    const sectorDeg = 360 / count;
    buildDiamondBurstParticles(count, SEED).forEach((particle, index) => {
      expect(particle.angleDeg).toBeGreaterThanOrEqual(index * sectorDeg);
      expect(particle.angleDeg).toBeLessThan((index + 1) * sectorDeg);
    });
  });

  it("only emits 💎 or ✨ and includes both in a large burst", () => {
    const emojis = buildDiamondBurstParticles(50, SEED).map((p) => p.emoji);
    expect(emojis.every((e) => e === "💎" || e === "✨")).toBe(true);
    expect(emojis).toContain("💎");
    expect(emojis).toContain("✨");
  });
});
