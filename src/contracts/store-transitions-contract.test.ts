import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "@/store/tradingStore";

describe("Contract: Store → Transitions (Position)", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      closedTrades: [],
      ordersHistory: [],
      pendingOrders: [],
      realizedPnL: 0,
      currentPrice: 50000,
    });
  });

  it("positionSlice produces valid Position with all required fields", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    const pos = useTradingStore.getState().position;

    expect(pos).not.toBeNull();
    expect(pos).toHaveProperty("side");
    expect(pos).toHaveProperty("entry");
    expect(pos).toHaveProperty("size");
    expect(pos).toHaveProperty("leverage");
    expect(pos).toHaveProperty("liquidationPrice");
    expect(pos).toHaveProperty("realizedPnL");
  });

  it("Position.size is always > 0 after open", () => {
    useTradingStore.getState().openPosition("short", 25, 5000, "40000", "60000", null);
    const pos = useTradingStore.getState().position;
    expect(pos!.size).toBeGreaterThan(0);
  });

  it("Position.leverage is always >= 1", () => {
    useTradingStore.getState().openPosition("long", 1, 1000, "", "", null);
    const pos = useTradingStore.getState().position;
    expect(pos!.leverage).toBeGreaterThanOrEqual(1);
  });

  it("liquidationPrice is computed and differs from entry", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    const pos = useTradingStore.getState().position;
    expect(pos!.liquidationPrice).not.toBe(pos!.entry);
    expect(pos!.liquidationPrice).toBe(0);
  });
});
