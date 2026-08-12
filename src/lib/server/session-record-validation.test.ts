import { describe, it, expect } from "vitest";
import { validateTradingSessionInput } from "./session-record-validation";

const validPayload = {
  endReason: "manual",
  startingWallet: 10000,
  finalWallet: 12500,
  pnl: 2500,
  returnPercent: 25,
  trades: 8,
  winRate: 62.5,
  bestTrade: 900,
  worstTrade: -300,
  maxDrawdown: 4.2,
  traderScore: 71,
};

describe("validateTradingSessionInput", () => {
  it("returns null for a valid manual-end payload", () => {
    expect(validateTradingSessionInput(validPayload)).toBeNull();
  });

  it("accepts a liquidation payload", () => {
    expect(validateTradingSessionInput({ ...validPayload, endReason: "liquidated" })).toBeNull();
  });

  it("rejects an unknown endReason", () => {
    expect(validateTradingSessionInput({ ...validPayload, endReason: "rage-quit" })).not.toBeNull();
  });

  it("rejects a session without trades — nothing to rank", () => {
    expect(validateTradingSessionInput({ ...validPayload, trades: 0 })).toMatch(/at least 1 trade/);
  });

  it("rejects a winRate above 100", () => {
    expect(validateTradingSessionInput({ ...validPayload, winRate: 150 })).toMatch(/0 and 100/);
  });

  it("rejects a forged returnPercent outside the sanity bounds, naming the value", () => {
    expect(validateTradingSessionInput({ ...validPayload, returnPercent: 10001 })).toMatch(
      /returnPercent 10001.*between -100 and 10000/
    );
    expect(validateTradingSessionInput({ ...validPayload, returnPercent: -150 })).toMatch(
      /returnPercent -150/
    );
  });

  it("accepts returnPercent exactly on the sanity bounds", () => {
    expect(validateTradingSessionInput({ ...validPayload, returnPercent: -100 })).toBeNull();
    expect(validateTradingSessionInput({ ...validPayload, returnPercent: 10000 })).toBeNull();
  });

  it("rejects a non-positive startingWallet", () => {
    expect(validateTradingSessionInput({ ...validPayload, startingWallet: 0 })).not.toBeNull();
  });

  it("rejects non-finite numbers", () => {
    expect(validateTradingSessionInput({ ...validPayload, pnl: Infinity })).not.toBeNull();
  });

  it("rejects missing fields and non-object payloads", () => {
    const { pnl: _pnl, ...withoutPnl } = validPayload;
    expect(validateTradingSessionInput(withoutPnl)).not.toBeNull();
    expect(validateTradingSessionInput(null)).not.toBeNull();
  });
});
