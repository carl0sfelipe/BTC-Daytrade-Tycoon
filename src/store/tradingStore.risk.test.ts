import { describe, it, expect, beforeEach } from "vitest";
import { useTradingStore } from "./tradingStore";

describe("TradingStore — checkPosition", () => {
  it("liquidation long triggers when price hits liquidationPrice", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 45000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(45000);

    expect(result).toEqual({ closed: true, reason: "liquidation" });
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].reason).toBe("liquidation");
    expect(useTradingStore.getState().isLiquidated).toBe(false); // no real date set
  });

  it("liquidation long with simulationRealDate sets isLiquidated true", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 45000,
      simulationRealDate: "2020-03-12 → 2020-03-15",
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    useTradingStore.getState().checkPosition(45000);

    expect(useTradingStore.getState().isLiquidated).toBe(true);
  });

  it("liquidation short triggers when price rises to liquidationPrice", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 55000,
      position: {
        side: "short",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 55000,
        tpPrice: null,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(55000);

    expect(result).toEqual({ closed: true, reason: "liquidation" });
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("SL hit long closes with reason 'sl'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 48000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 48000,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(48000);

    expect(result).toEqual({ closed: true, reason: "sl" });
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].pnl).toBeLessThan(0);
  });

  it("SL hit short closes with reason 'sl'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 52000,
      position: {
        side: "short",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 55000,
        tpPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 52000,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(52000);

    expect(result).toEqual({ closed: true, reason: "sl" });
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("TP hit long closes with reason 'tp'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 55000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: 55000,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(55000);

    expect(result).toEqual({ closed: true, reason: "tp" });
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].pnl).toBeGreaterThan(0);
  });

  it("TP hit short closes with reason 'tp'", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 45000,
      position: {
        side: "short",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 55000,
        tpPrice: 45000,
        slPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(45000);

    expect(result).toEqual({ closed: true, reason: "tp" });
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("no trigger between liq/sl/tp returns {closed:false}", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50500,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: 55000,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 48000,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(50500);

    expect(result).toEqual({ closed: false });
    expect(useTradingStore.getState().position).not.toBeNull();
  });

  it("liquidation precedence over SL when both would trigger", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 44900,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        trailingStopPercent: null,
        trailingStopPrice: null,
slPrice: 46000,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    const result = useTradingStore.getState().checkPosition(44900);

    expect(result.reason).toBe("liquidation");
  });
});

describe("TradingStore — setLiquidated / clearLiquidated / openPosition early-returns", () => {
  it("setLiquidated stores flag and date", () => {
    useTradingStore.getState().setLiquidated("2020-03-12 → 2020-03-15");

    const state = useTradingStore.getState();
    expect(state.isLiquidated).toBe(true);
    expect(state.simulationRealDate).toBe("2020-03-12 → 2020-03-15");
  });

  it("clearLiquidated resets both", () => {
    useTradingStore.getState().setLiquidated("2020-03-12 → 2020-03-15");
    useTradingStore.getState().clearLiquidated();

    const state = useTradingStore.getState();
    expect(state.isLiquidated).toBe(false);
    expect(state.simulationRealDate).toBeNull();
  });

  it("openPosition early-returns when entryPrice <= 0", () => {
    useTradingStore.setState({ currentPrice: 0, wallet: 10000, position: null });

    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);

    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().wallet).toBe(10000);
  });

  it("openPosition early-returns when wallet < margin (no flip path)", () => {
    useTradingStore.setState({ currentPrice: 50000, wallet: 50, position: null });

    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);

    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().wallet).toBe(50);
  });
});


describe("Trailing Stop", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: null,
      closedTrades: [],
      realizedPnL: 0,
    });
  });

  it("setTrailingStop calculates initial stop price for long", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    const pos = useTradingStore.getState().position!;
    expect(pos.trailingStopPercent).toBe(5);
    expect(pos.trailingStopPrice).toBe(50000 * 0.95); // 5% below entry
  });

  it("setTrailingStop calculates initial stop price for short", () => {
    useTradingStore.getState().openPosition("short", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    const pos = useTradingStore.getState().position!;
    expect(pos.trailingStopPercent).toBe(5);
    expect(pos.trailingStopPrice).toBe(50000 * 1.05); // 5% above entry
  });

  it("setTrailingStop with null clears trailing stop", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);
    useTradingStore.getState().setTrailingStop(null);

    const pos = useTradingStore.getState().position!;
    expect(pos.trailingStopPercent).toBeNull();
    expect(pos.trailingStopPrice).toBeNull();
  });

  it("checkPosition updates trailing stop when price moves favorably (long)", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    // Price rises to 52000 → trailing stop should move to 52000 * 0.95 = 49400
    const result = useTradingStore.getState().checkPosition(52000);
    expect(result.closed).toBe(false);

    const pos = useTradingStore.getState().position!;
    expect(pos.trailingStopPrice).toBe(52000 * 0.95);
  });

  it("checkPosition closes position when price crosses trailing stop (long)", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    // Price rises then falls below trailing stop
    useTradingStore.getState().checkPosition(52000); // updates stop to 49400
    const result = useTradingStore.getState().checkPosition(49300); // crosses stop

    expect(result.closed).toBe(true);
    expect(result.reason).toBe("trailing_stop");
    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades[0].reason).toBe("trailing_stop");
  });

  it("checkPosition updates trailing stop when price moves favorably (short)", () => {
    useTradingStore.getState().openPosition("short", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    // Price falls to 48000 → trailing stop should move to 48000 * 1.05 = 50400
    const result = useTradingStore.getState().checkPosition(48000);
    expect(result.closed).toBe(false);

    const pos = useTradingStore.getState().position!;
    expect(pos.trailingStopPrice).toBe(48000 * 1.05);
  });

  it("checkPosition closes position when price crosses trailing stop (short)", () => {
    useTradingStore.getState().openPosition("short", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    // Price falls then rises above trailing stop
    useTradingStore.getState().checkPosition(48000); // updates stop to 50400
    const result = useTradingStore.getState().checkPosition(50500); // crosses stop

    expect(result.closed).toBe(true);
    expect(result.reason).toBe("trailing_stop");
    expect(useTradingStore.getState().position).toBeNull();
  });

  it("trailing stop does not move when price moves against position", () => {
    useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
    useTradingStore.getState().setTrailingStop(5);

    const initialStop = useTradingStore.getState().position!.trailingStopPrice;

    // Price falls → stop should NOT move down
    useTradingStore.getState().checkPosition(49000);
    expect(useTradingStore.getState().position!.trailingStopPrice).toBe(initialStop);
  });

  it("trailing stop has precedence over SL but not liquidation", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: {
        side: "long",
        entry: 50000,
        size: 1000,
        leverage: 10,
        liquidationPrice: 45000,
        tpPrice: null,
        slPrice: 46000,
        trailingStopPercent: 5,
        trailingStopPrice: 50000 * 0.95,
        entryTime: "now",
        entryTimestamp: 0,
        realizedPnL: 0,
      },
    });

    // Price hits liquidation → liquidation takes precedence
    const result = useTradingStore.getState().checkPosition(44900);
    expect(result.reason).toBe("liquidation");
  });
});
