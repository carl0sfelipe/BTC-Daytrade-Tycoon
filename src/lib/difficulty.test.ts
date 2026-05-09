import { describe, it, expect } from "vitest";
import { DIFFICULTY_PRESETS } from "./difficulty";
import type { DifficultyKey } from "./difficulty";

describe("DIFFICULTY_PRESETS", () => {
  const keys: DifficultyKey[] = ["easy", "normal", "hard", "extreme"];

  it("has all four difficulty levels", () => {
    expect(Object.keys(DIFFICULTY_PRESETS)).toEqual(keys);
  });

  it("each preset has required fields", () => {
    for (const key of keys) {
      const p = DIFFICULTY_PRESETS[key];
      expect(typeof p.label).toBe("string");
      expect(typeof p.wallet).toBe("number");
      expect(typeof p.maxLeverage).toBe("number");
      expect(typeof p.emoji).toBe("string");
      expect(typeof p.description).toBe("string");
    }
  });

  it("wallets are ordered: easy > normal > hard > extreme", () => {
    expect(DIFFICULTY_PRESETS.easy.wallet).toBeGreaterThan(DIFFICULTY_PRESETS.normal.wallet);
    expect(DIFFICULTY_PRESETS.normal.wallet).toBeGreaterThan(DIFFICULTY_PRESETS.hard.wallet);
    expect(DIFFICULTY_PRESETS.hard.wallet).toBeGreaterThan(DIFFICULTY_PRESETS.extreme.wallet);
  });

  it("maxLeverage is ordered: easy < normal < hard <= extreme", () => {
    expect(DIFFICULTY_PRESETS.easy.maxLeverage).toBeLessThan(DIFFICULTY_PRESETS.normal.maxLeverage);
    expect(DIFFICULTY_PRESETS.normal.maxLeverage).toBeLessThan(DIFFICULTY_PRESETS.hard.maxLeverage);
    expect(DIFFICULTY_PRESETS.hard.maxLeverage).toBeLessThanOrEqual(DIFFICULTY_PRESETS.extreme.maxLeverage);
  });

  it("easy: $50,000 wallet, max 10x leverage", () => {
    expect(DIFFICULTY_PRESETS.easy.wallet).toBe(50_000);
    expect(DIFFICULTY_PRESETS.easy.maxLeverage).toBe(10);
  });

  it("normal: $10,000 wallet, max 50x leverage", () => {
    expect(DIFFICULTY_PRESETS.normal.wallet).toBe(10_000);
    expect(DIFFICULTY_PRESETS.normal.maxLeverage).toBe(50);
  });

  it("hard: $5,000 wallet, max 100x leverage", () => {
    expect(DIFFICULTY_PRESETS.hard.wallet).toBe(5_000);
    expect(DIFFICULTY_PRESETS.hard.maxLeverage).toBe(100);
  });

  it("extreme: $1,000 wallet, max 125x leverage", () => {
    expect(DIFFICULTY_PRESETS.extreme.wallet).toBe(1_000);
    expect(DIFFICULTY_PRESETS.extreme.maxLeverage).toBe(125);
  });
});
