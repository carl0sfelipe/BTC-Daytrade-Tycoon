import { describe, it, expect, beforeEach } from "vitest";
import { TickEventLog } from "./tick-events";

describe("TickEventLog", () => {
  let log: TickEventLog;

  beforeEach(() => {
    log = new TickEventLog(5);
  });

  it("records events in order", () => {
    log.push({ simulatedTimeSec: 0, price: 50000, candleLow: 49000, candleHigh: 51000, checks: [] });
    log.push({ simulatedTimeSec: 1, price: 50100, candleLow: 49100, candleHigh: 51100, checks: [] });

    const events = log.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].tickId).toBe(0);
    expect(events[1].tickId).toBe(1);
  });

  it("overwrites old events when buffer is full (ring buffer)", () => {
    for (let i = 0; i < 7; i++) {
      log.push({ simulatedTimeSec: i, price: 50000 + i, candleLow: 49000, candleHigh: 51000, checks: [] });
    }

    const events = log.getEvents();
    expect(events).toHaveLength(5);
    expect(events[0].tickId).toBe(2); // oldest remaining
    expect(events[4].tickId).toBe(6); // newest
  });

  it("finds triggered checks by type", () => {
    log.push({ simulatedTimeSec: 0, price: 50000, candleLow: 49000, candleHigh: 51000, checks: [{ type: "liquidation", triggered: true }] });
    log.push({ simulatedTimeSec: 1, price: 50100, candleLow: 49100, candleHigh: 51100, checks: [{ type: "tp", triggered: false }] });
    log.push({ simulatedTimeSec: 2, price: 50200, candleLow: 49200, candleHigh: 51200, checks: [{ type: "liquidation", triggered: false }] });

    const liqs = log.findTriggered("liquidation");
    expect(liqs).toHaveLength(1);
    expect(liqs[0].tickId).toBe(0);
  });

  it("getLast returns newest events first", () => {
    log.push({ simulatedTimeSec: 0, price: 50000, candleLow: 49000, candleHigh: 51000, checks: [] });
    log.push({ simulatedTimeSec: 1, price: 50100, candleLow: 49100, candleHigh: 51100, checks: [] });
    log.push({ simulatedTimeSec: 2, price: 50200, candleLow: 49200, candleHigh: 51200, checks: [] });

    const last = log.getLast(2);
    expect(last).toHaveLength(2);
    expect(last[0].tickId).toBe(2);
    expect(last[1].tickId).toBe(1);
  });

  it("clear resets everything", () => {
    log.push({ simulatedTimeSec: 0, price: 50000, candleLow: 49000, candleHigh: 51000, checks: [] });
    log.clear();
    expect(log.getEvents()).toHaveLength(0);
    expect(log.size).toBe(0);
  });
});
