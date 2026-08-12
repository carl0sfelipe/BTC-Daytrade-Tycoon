import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";

describe("TradingStore — Difficulty Presets", () => {
  beforeEach(() => {
    useTradingStore.setState({
      difficulty: "normal",
      maxLeverage: 50,
      startingWallet: 10_000,
    });
  });

  it("initial difficulty is normal with correct defaults", () => {
    const s = useTradingStore.getState();
    expect(s.difficulty).toBe("normal");
    expect(s.maxLeverage).toBe(50);
    expect(s.startingWallet).toBe(10_000);
  });

  it("setDifficulty('easy') sets wallet 50k and maxLeverage 10", () => {
    useTradingStore.getState().setDifficulty("easy");
    const s = useTradingStore.getState();
    expect(s.difficulty).toBe("easy");
    expect(s.maxLeverage).toBe(10);
    expect(s.startingWallet).toBe(50_000);
  });

  it("setDifficulty('hard') sets wallet 5k and maxLeverage 100", () => {
    useTradingStore.getState().setDifficulty("hard");
    const s = useTradingStore.getState();
    expect(s.difficulty).toBe("hard");
    expect(s.maxLeverage).toBe(100);
    expect(s.startingWallet).toBe(5_000);
  });

  it("setDifficulty('extreme') sets wallet 1k and maxLeverage 125", () => {
    useTradingStore.getState().setDifficulty("extreme");
    const s = useTradingStore.getState();
    expect(s.difficulty).toBe("extreme");
    expect(s.maxLeverage).toBe(125);
    expect(s.startingWallet).toBe(1_000);
  });

  it("setDifficulty('normal') restores normal defaults", () => {
    useTradingStore.getState().setDifficulty("extreme");
    useTradingStore.getState().setDifficulty("normal");
    const s = useTradingStore.getState();
    expect(s.difficulty).toBe("normal");
    expect(s.maxLeverage).toBe(50);
    expect(s.startingWallet).toBe(10_000);
  });

  it("setDifficulty does not touch wallet (current balance is separate from startingWallet)", () => {
    useTradingStore.setState({ wallet: 7_500 });
    useTradingStore.getState().setDifficulty("hard");
    // wallet (current session balance) should be unchanged
    expect(useTradingStore.getState().wallet).toBe(7_500);
    // startingWallet should reflect the preset
    expect(useTradingStore.getState().startingWallet).toBe(5_000);
  });
});
