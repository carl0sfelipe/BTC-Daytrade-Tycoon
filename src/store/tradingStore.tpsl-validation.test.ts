import { describe, it, expect } from "vitest";
import { useTradingStore } from "./tradingStore";

describe("TradingStore — TP/SL validation messages are in English", () => {
  it("rejects LONG TP below entry with English message", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: null,
    });

    useTradingStore.getState().openPosition("long", 10, 1000, "49000", "", null);

    const error = useTradingStore.getState().lastActionError;
    expect(error).toContain("Invalid");
    expect(error).toContain("ABOVE");
    expect(error).toContain("entry");
    expect(error).not.toContain("inválido");
    expect(error).not.toContain("acima");
    expect(error).not.toContain("coloque");
  });

  it("rejects SHORT TP above entry with English message", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: null,
    });

    useTradingStore.getState().openPosition("short", 10, 1000, "51000", "", null);

    const error = useTradingStore.getState().lastActionError;
    expect(error).toContain("Invalid");
    expect(error).toContain("BELOW");
    expect(error).toContain("entry");
    expect(error).not.toContain("inválido");
    expect(error).not.toContain("abaixo");
    expect(error).not.toContain("coloque");
  });

  it("rejects LONG SL above entry with English message", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: null,
    });

    useTradingStore.getState().openPosition("long", 10, 1000, "", "51000", null);

    const error = useTradingStore.getState().lastActionError;
    expect(error).toContain("Invalid");
    expect(error).toContain("BELOW");
    expect(error).toContain("entry");
    expect(error).not.toContain("inválido");
    expect(error).not.toContain("abaixo");
    expect(error).not.toContain("coloque");
  });

  it("rejects SHORT SL below entry with English message", () => {
    useTradingStore.setState({
      wallet: 10000,
      currentPrice: 50000,
      position: null,
    });

    useTradingStore.getState().openPosition("short", 10, 1000, "", "49000", null);

    const error = useTradingStore.getState().lastActionError;
    expect(error).toContain("Invalid");
    expect(error).toContain("ABOVE");
    expect(error).toContain("entry");
    expect(error).not.toContain("inválido");
    expect(error).not.toContain("acima");
    expect(error).not.toContain("coloque");
  });

  it("rejects setPositionTpSl LONG TP below current price with English message", () => {
    useTradingStore.setState({
      wallet: 9900,
      currentPrice: 50000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });

    useTradingStore.getState().setPositionTpSl("49000", "");

    const error = useTradingStore.getState().lastActionError;
    expect(error).toContain("Invalid");
    expect(error).toContain("ABOVE");
    expect(error).toContain("current price");
    expect(error).not.toContain("inválido");
    expect(error).not.toContain("acima");
    expect(error).not.toContain("coloque");
  });

  it("rejects setPositionTpSl SHORT SL below current price with English message", () => {
    useTradingStore.setState({
      wallet: 9900,
      currentPrice: 50000,
      position: {
        side: "short", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 55000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
    });

    // For SHORT, SL must be ABOVE current price. 49000 is below → invalid
    useTradingStore.getState().setPositionTpSl("", "49000");

    const error = useTradingStore.getState().lastActionError;
    expect(error).toContain("Invalid");
    expect(error).toContain("ABOVE");
    expect(error).toContain("current price");
    expect(error).not.toContain("inválido");
    expect(error).not.toContain("acima");
    expect(error).not.toContain("coloque");
  });
});
