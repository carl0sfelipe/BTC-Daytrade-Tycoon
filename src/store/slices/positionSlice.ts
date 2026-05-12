import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";
import type { Position, Trade, OrderHistoryItem, PendingOrder } from "../domain-types";
import {
  validateTpSl,
  validateTpSlCurrentPrice,
  validateOpenPosition,
} from "@/lib/trading/validation";
import {
  computeClosePosition,
  computeHedgeFlip,
  computeReduceOrClose,
  computeFreshOpen,
} from "@/lib/trading/transitions";
import {
  computePartialReduce,
  computeAddToPosition,
  computeSizeIncrease,
} from "@/lib/trading/position-adjust";
import { calcLiquidationPrice, calcTrailingStopPrice, generateId } from "@/lib/trading";
import { formatStoreState } from "@/lib/trading/format-store-state";
import { logger } from "@/lib/logger";

const MAX_ORDERS_HISTORY = 500;

export interface PositionSlice {
  position: Position | null;
  setPosition: (position: Position | null) => void;
  openPosition: (
    side: "long" | "short",
    leverage: number,
    positionSize: number,
    tpPrice: string,
    slPrice: string,
    limitPrice: string | null
  ) => void;
  closePosition: (reason?: Trade["reason"]) => void;
  setTrailingStop: (percent: number | null) => void;
  addToPosition: (additionalSize: number, price: number, tpPrice: string, slPrice: string) => void;
  reducePosition: (reducedSize: number, price: number) => void;
  updatePositionSize: (newSize: number, orderSide?: "long" | "short") => void;
  updateLeverage: (newLeverage: number) => void;
  checkPosition: (currentPrice: number) => { closed: boolean; reason?: Trade["reason"] };
  setPositionTpSl: (tpPrice: string, slPrice: string) => void;
}

export const createPositionSlice: StateCreator<
  TradingStore,
  [],
  [],
  PositionSlice
> = (set, get) => ({
  position: null,
  setPosition: (position) => set({ position }),

  openPosition: (side, leverage, positionSize, tpPriceStr, slPriceStr, limitPrice) => {
    const state = get();
    logger.log(`[openPosition] ${side.toUpperCase()} $${positionSize} x${leverage}${limitPrice ? ` limit@${limitPrice}` : ""} tp=${tpPriceStr || "-"} sl=${slPriceStr || "-"}`, formatStoreState(state));
    const entryPrice = limitPrice ? parseFloat(limitPrice) : state.currentPrice;
    const margin = positionSize / leverage;

    const validationError = validateOpenPosition(entryPrice, positionSize, leverage, state.wallet, margin);
    if (validationError) {
      set({ lastActionError: validationError });
      return;
    }

    if (state.position && state.position.side === side) {
      set({ lastActionError: `Close your existing ${side} position first` });
      return;
    }

    const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
    const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;

    const tpSlError = validateTpSl(side, entryPrice, tpPrice, slPrice);
    if (tpSlError) {
      set({ lastActionError: tpSlError });
      return;
    }

    if (state.position && state.position.side !== side) {
      const existing = state.position;
      if (!state.reduceOnly && positionSize > existing.size) {
        const returnedMargin = existing.size / existing.leverage;
        const excessSize = positionSize - existing.size;
        const excessMargin = excessSize / leverage;
        if (state.wallet + returnedMargin + ((existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice) / existing.entry) * existing.size < excessMargin) {
          set({ lastActionError: "Insufficient funds for hedge flip" });
          return;
        }
        const patch = computeHedgeFlip(
          state.wallet, existing, entryPrice, side, leverage, positionSize,
          tpPrice, slPrice, state.closedTrades, state.realizedPnL, state.ordersHistory, limitPrice
        );
        set(patch);
        if ((tpPrice && tpPrice > 0) || (slPrice && slPrice > 0)) {
          get().setPositionTpSl(tpPriceStr, slPriceStr);
        }
        return;
      }

      const patch = computeReduceOrClose(
        state.wallet, existing, entryPrice, positionSize, side, leverage,
        state.ordersHistory, state.closedTrades, state.realizedPnL, limitPrice
      );
      set(patch);
      return;
    }

    const patch = computeFreshOpen(
      state.wallet, side, entryPrice, positionSize, leverage,
      tpPrice, slPrice, state.ordersHistory, limitPrice
    );
    set(patch);
    if ((tpPrice && tpPrice > 0) || (slPrice && slPrice > 0)) {
      get().setPositionTpSl(tpPriceStr, slPriceStr);
    }
  },

  addToPosition: (additionalSize, price, tpPriceStr, slPriceStr) => {
    const state = get();
    if (!state.position) return;
    const margin = additionalSize / state.position.leverage;
    if (state.wallet < margin) return;
    logger.log(`[addToPosition] ${state.position.side.toUpperCase()} +$${additionalSize} @${price.toFixed(2)}`, formatStoreState(state));

    const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
    const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;
    const patch = computeAddToPosition(state.wallet, state.position, additionalSize, price, tpPrice, slPrice);
    set(patch);
  },

  reducePosition: (reducedSize, price) => {
    const state = get();
    if (!state.position) return;
    logger.log(`[reducePosition] ${state.position.side.toUpperCase()} -$${reducedSize} @${price.toFixed(2)}`, formatStoreState(state));
    const patch = computePartialReduce(
      state.wallet, state.position, reducedSize, price,
      state.ordersHistory, state.closedTrades, state.realizedPnL
    );
    set(patch);
  },

  closePosition: (reason = "manual") => {
    const state = get();
    if (!state.position) return;
    logger.log(`[closePosition] reason=${reason} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));
    const patch = computeClosePosition(
      state.wallet, state.position, state.currentPrice, reason,
      state.closedTrades, state.ordersHistory, state.realizedPnL,
      state.pendingOrders, state.simulationRealDate
    );
    set(patch);
  },

  updatePositionSize: (newSize, orderSide) => {
    const state = get();
    if (!state.position || newSize <= 0) return;
    const { size } = state.position;
    const price = state.currentPrice;
    logger.log(`[updatePositionSize] ${state.position.side.toUpperCase()} ${size} → ${newSize} price=${price.toFixed(2)}`, formatStoreState(state));

    if (newSize > size) {
      const marginPerUnit = 1 / state.position.leverage;
      const oldMargin = size * marginPerUnit;
      const newMargin = newSize * marginPerUnit;
      if (state.wallet < newMargin - oldMargin) return;
      const patch = computeSizeIncrease(state.wallet, state.position, newSize, price, state.ordersHistory, orderSide);
      set(patch);
    } else if (newSize < size) {
      const reducedSize = size - newSize;
      const patch = computePartialReduce(
        state.wallet, state.position, reducedSize, price,
        state.ordersHistory, state.closedTrades, state.realizedPnL, orderSide
      );
      set(patch);
    }
  },

  updateLeverage: (newLeverage) => {
    const state = get();
    if (!state.position) return;
    logger.log(`[updateLeverage] ${state.position.leverage}x → ${newLeverage}x`, formatStoreState(state));

    const { size, leverage: oldLeverage } = state.position;
    const oldMargin = size / oldLeverage;
    const newMargin = size / newLeverage;
    const marginDiff = newMargin - oldMargin;

    if (marginDiff > 0 && state.wallet < marginDiff) return;

    const newLiqPrice = calcLiquidationPrice(state.position.entry, newLeverage, state.position.side);
    set({
      wallet: state.wallet - marginDiff,
      position: {
        ...state.position,
        leverage: newLeverage,
        liquidationPrice: newLiqPrice,
      },
    });
  },

  setTrailingStop: (percent) => {
    const state = get();
    if (!state.position) return;
    logger.log(`[setTrailingStop] ${percent === null ? "remove" : `${percent}%`} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));

    if (percent === null || percent <= 0) {
      set({ position: { ...state.position, trailingStopPercent: null, trailingStopPrice: null } });
      return;
    }
    const newStopPrice = calcTrailingStopPrice(state.position.side, state.currentPrice, percent);
    set({ position: { ...state.position, trailingStopPercent: percent, trailingStopPrice: newStopPrice } });
  },

  setPositionTpSl: (tpPriceStr, slPriceStr) => {
    const state = get();
    if (!state.position) return;
    logger.log(`[setPositionTpSl] tp=${tpPriceStr || "-"} sl=${slPriceStr || "-"} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));

    const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
    const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;
    const { side, leverage, size } = state.position;
    const ref = state.currentPrice;

    const error = validateTpSlCurrentPrice(side, ref, tpPrice, slPrice);
    if (error) {
      set({ lastActionError: error });
      return;
    }

    const now = new Date().toISOString();

    const cancelTypes: Array<"take_profit" | "stop_loss"> = [];
    if (tpPriceStr) cancelTypes.push("take_profit");
    if (slPriceStr) cancelTypes.push("stop_loss");

    const toCancel = state.pendingOrders.filter(
      (o) => o.side === side && cancelTypes.includes(o.orderType as "take_profit" | "stop_loss")
    );

    let newPendingOrders = state.pendingOrders.filter(
      (o) => !(o.side === side && cancelTypes.includes(o.orderType as "take_profit" | "stop_loss"))
    );

    let newOrdersHistory = state.ordersHistory.map((o) =>
      toCancel.some((c) => c.id === o.id)
        ? { ...o, status: "canceled" as const, updatedAt: now }
        : o
    );

    if (tpPrice && tpPrice > 0) {
      const tpOrder: PendingOrder = {
        id: generateId(),
        side,
        orderType: "take_profit",
        leverage,
        size,
        limitPrice: tpPrice,
        orderPrice: null,
        tpPrice: null,
        slPrice: null,
        createdAt: now,
      };
      newPendingOrders = [...newPendingOrders, tpOrder];
      newOrdersHistory = [
        ...newOrdersHistory,
        {
          id: tpOrder.id,
          side,
          type: "tp",
          status: "pending",
          leverage,
          size,
          price: tpPrice,
          tpPrice: null,
          slPrice: null,
          createdAt: now,
          executionPrice: null,
          updatedAt: null,
        },
      ];
    }

    if (slPrice && slPrice > 0) {
      const slOrder: PendingOrder = {
        id: generateId(),
        side,
        orderType: "stop_loss",
        leverage,
        size,
        limitPrice: slPrice,
        orderPrice: null,
        tpPrice: null,
        slPrice: null,
        createdAt: now,
      };
      newPendingOrders = [...newPendingOrders, slOrder];
      newOrdersHistory = [
        ...newOrdersHistory,
        {
          id: slOrder.id,
          side,
          type: "sl",
          status: "pending",
          leverage,
          size,
          price: slPrice,
          tpPrice: null,
          slPrice: null,
          createdAt: now,
          executionPrice: null,
          updatedAt: null,
        },
      ];
    }

    set({
      position: {
        ...state.position,
        tpPrice: tpPrice && tpPrice > 0 ? tpPrice : state.position.tpPrice,
        slPrice: slPrice && slPrice > 0 ? slPrice : state.position.slPrice,
      },
      pendingOrders: newPendingOrders,
      ordersHistory: newOrdersHistory.slice(-MAX_ORDERS_HISTORY),
    });
  },

  checkPosition: (currentPrice) => {
    const state = get();
    if (!state.position) return { closed: false };

    const { side, tpPrice, slPrice, liquidationPrice, trailingStopPercent, trailingStopPrice } = state.position;

    if (trailingStopPercent && trailingStopPrice !== null) {
      const newStopPrice = calcTrailingStopPrice(side, currentPrice, trailingStopPercent);
      if (
        (side === "long" && newStopPrice > trailingStopPrice) ||
        (side === "short" && newStopPrice < trailingStopPrice)
      ) {
        set({ position: { ...state.position, trailingStopPrice: newStopPrice } });
      }
    }

    if (side === "long" && currentPrice <= liquidationPrice) {
      logger.log(`[checkPosition] 💀 LIQUIDATION long price=${currentPrice.toFixed(2)} liq=${liquidationPrice.toFixed(2)}`, formatStoreState(state));
      state.closePosition("liquidation");
      return { closed: true, reason: "liquidation" };
    }
    if (side === "short" && currentPrice >= liquidationPrice) {
      logger.log(`[checkPosition] 💀 LIQUIDATION short price=${currentPrice.toFixed(2)} liq=${liquidationPrice.toFixed(2)}`, formatStoreState(state));
      state.closePosition("liquidation");
      return { closed: true, reason: "liquidation" };
    }

    if (trailingStopPercent && trailingStopPrice !== null) {
      if (
        (side === "long" && currentPrice <= trailingStopPrice) ||
        (side === "short" && currentPrice >= trailingStopPrice)
      ) {
        logger.log(`[checkPosition] 📉 TRAILING STOP ${side} price=${currentPrice.toFixed(2)} stop=${trailingStopPrice.toFixed(2)}`, formatStoreState(state));
        state.closePosition("trailing_stop");
        return { closed: true, reason: "trailing_stop" };
      }
    }

    if (slPrice) {
      if (side === "long" && currentPrice <= slPrice) {
        logger.log(`[checkPosition] 🛡️ SL HIT long price=${currentPrice.toFixed(2)} sl=${slPrice.toFixed(2)}`, formatStoreState(state));
        state.closePosition("sl");
        return { closed: true, reason: "sl" };
      }
      if (side === "short" && currentPrice >= slPrice) {
        logger.log(`[checkPosition] 🛡️ SL HIT short price=${currentPrice.toFixed(2)} sl=${slPrice.toFixed(2)}`, formatStoreState(state));
        state.closePosition("sl");
        return { closed: true, reason: "sl" };
      }
    }

    if (tpPrice) {
      if (side === "long" && currentPrice >= tpPrice) {
        logger.log(`[checkPosition] 🎯 TP HIT long price=${currentPrice.toFixed(2)} tp=${tpPrice.toFixed(2)}`, formatStoreState(state));
        state.closePosition("tp");
        return { closed: true, reason: "tp" };
      }
      if (side === "short" && currentPrice <= tpPrice) {
        logger.log(`[checkPosition] 🎯 TP HIT short price=${currentPrice.toFixed(2)} tp=${tpPrice.toFixed(2)}`, formatStoreState(state));
        state.closePosition("tp");
        return { closed: true, reason: "tp" };
      }
    }

    return { closed: false };
  },
});
