import { describe, it, expect } from "vitest";
import {
  computeFreshOpen,
  computeClosePosition,
  computeHedgeFlip,
  computeReduceOrClose,
} from "./transitions";
import { makePosition } from "@/test/helpers";

describe("transitions integration", () => {
  describe("computeFreshOpen", () => {
    it("opens a long position with tp and sl", () => {
      const patch = computeFreshOpen(
        10000,
        "long",
        50000,
        1000,
        10,
        55000,
        48000,
        [],
        null
      );

      expect(patch.position).not.toBeNull();
      expect(patch.position.side).toBe("long");
      expect(patch.position.tpPrice).toBe(55000);
      expect(patch.position.slPrice).toBe(48000);
      expect(patch.wallet).toBe(9900); // 10000 - 100 margin
    });

    it("opens a short position without tp/sl", () => {
      const patch = computeFreshOpen(
        10000,
        "short",
        50000,
        2000,
        20,
        NaN,
        NaN,
        [],
        null
      );

      expect(patch.position.side).toBe("short");
      expect(patch.position.tpPrice).toBeNull();
      expect(patch.position.slPrice).toBeNull();
      expect(patch.wallet).toBe(9900); // 10000 - 100 margin
    });
  });

  describe("computeClosePosition", () => {
    it("closes long with profit", () => {
      const position = makePosition({ side: "long", entry: 50000, size: 1000, leverage: 10 });
      const patch = computeClosePosition(
        9900, // wallet after margin deduction
        position,
        52000,
        "manual",
        [],
        [],
        0,
        [],
        null
      );

      expect(patch.position).toBeNull();
      expect(patch.closedTrades).toHaveLength(1);
      expect(patch.closedTrades[0].pnl).toBe(40); // (2000/50000)*1000
      expect(patch.wallet).toBe(10040); // 9900 + 100 margin + 40 pnl
    });

    it("closes short with profit", () => {
      const position = makePosition({ side: "short", entry: 50000, size: 1000, leverage: 10 });
      const patch = computeClosePosition(
        9900, // wallet after margin deduction
        position,
        48000,
        "manual",
        [],
        [],
        0,
        [],
        null
      );

      expect(patch.closedTrades[0].pnl).toBe(40); // (2000/50000)*1000
      expect(patch.wallet).toBe(10040); // 9900 + 100 margin + 40 pnl
    });
  });

  describe("computeHedgeFlip", () => {
    it("flips long to short with excess size", () => {
      const existing = makePosition({ side: "long", entry: 50000, size: 1000, leverage: 10 });
      const patch = computeHedgeFlip(
        10000,
        existing,
        52000,
        "short",
        10,
        2000,
        NaN,
        NaN,
        [],
        0,
        [],
        null
      );

      // Close long at 52000: pnl = 40, margin returned = 100
      // excessSize = 1000, excessMargin = 100
      expect(patch.position.side).toBe("short");
      expect(patch.position.size).toBe(1000);
      expect(patch.wallet).toBe(10040); // 10000 + 100 returned + 40 pnl - 100 excess
    });
  });

  describe("computeReduceOrClose", () => {
    it("recalculates liquidationPrice on partial reduce", () => {
      const existing = makePosition({ side: "short", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 55000 });
      const patch = computeReduceOrClose(
        5000, existing, 51000, 400, "long", 10, [], [], 0, null
      );
      // newSize = 600, newWallet = 5000 + 40 + (50000-51000)/50000*400 = 5000 + 40 - 8 = 5032
      // margin = 60, total = 5092, ratio = 5092/600 = 8.487
      // liq = 50000 * (1 + 8.487) = 474333
      expect(patch.position).not.toBeNull();
      expect(patch.position!.size).toBe(600);
      expect(patch.position!.liquidationPrice).not.toBe(55000);
      expect(patch.position!.liquidationPrice).toBeGreaterThan(55000);
    });
  });
});
