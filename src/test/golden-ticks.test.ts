import { describe, it, expect, beforeEach } from "vitest";
import { createFrozenClock } from "@/lib/sentinel";
import { useTradingStore } from "@/store/tradingStore";
import { processTick } from "@/lib/engine/tick-processor";
import { goldenTickScenarios } from "./golden-ticks";

describe("Golden Ticks — regression snapshot", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      pendingOrders: [],
      closedTrades: [],
      ordersHistory: [],
      realizedPnL: 0,
    });
  });

  for (const scenario of goldenTickScenarios) {
    it(`[${scenario.id}] ${scenario.description}`, () => {
      // Seed store state
      useTradingStore.setState({
        position: scenario.position,
        pendingOrders: scenario.pendingOrders,
        wallet: 10000,
      });

      // Process tick
      const tickResult = processTick({
        startDate: new Date(0),
        currentCandles: scenario.candles,
        clock: createFrozenClock(0),
      });

      expect("error" in tickResult).toBe(false);
      const tick = tickResult as Extract<typeof tickResult, { price: number }>;

      // Run store checks
      const state = useTradingStore.getState();

      if (state.position && scenario.position) {
        const checkResult = state.checkPosition(tick.price, tick.candleLow, tick.candleHigh);
        expect(checkResult.closed).toBe(scenario.expected.positionClosed ?? false);
      }

      if (state.pendingOrders.length > 0) {
        state.checkPendingOrders(tick.price, tick.candleLow, tick.candleHigh);
      }

      const finalState = useTradingStore.getState();

      if (scenario.expected.positionSide !== undefined) {
        expect(finalState.position?.side ?? null).toBe(scenario.expected.positionSide);
      }

      if (scenario.expected.pendingOrderExecuted === true) {
        expect(finalState.pendingOrders.length).toBeLessThan(scenario.pendingOrders.length);
      } else if (scenario.expected.pendingOrderExecuted === false) {
        expect(finalState.pendingOrders.length).toBe(scenario.pendingOrders.length);
      }
    });
  }
});
