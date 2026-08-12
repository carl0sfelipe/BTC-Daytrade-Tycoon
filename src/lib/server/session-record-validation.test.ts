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
