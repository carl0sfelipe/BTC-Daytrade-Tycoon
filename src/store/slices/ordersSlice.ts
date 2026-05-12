import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";
import type { PendingOrder, OrderHistoryItem } from "../domain-types";
import { generateId, formatTimestamp } from "@/lib/trading";
import { formatStoreState } from "@/lib/trading/format-store-state";
import { logger } from "@/lib/logger";

const MAX_ORDERS_HISTORY = 500;

export interface OrdersSlice {
  pendingOrders: PendingOrder[];
  ordersHistory: OrderHistoryItem[];
  addPendingOrder: (order: Omit<PendingOrder, "id" | "createdAt">) => void;
  cancelPendingOrder: (id: string) => void;
  cancelPendingOrdersForPosition: () => void;
  checkPendingOrders: (currentPrice: number) => void;
  clearOrdersHistory: () => void;
}

export const createOrdersSlice: StateCreator<TradingStore, [], [], OrdersSlice> =
  (set, get) => ({
    pendingOrders: [],
    ordersHistory: [],

    addPendingOrder: (order) => {
      const state = get();
      const id = generateId();
      const now = formatTimestamp();
      logger.log(`[addPendingOrder] ${order.orderType} ${order.side.toUpperCase()} $${order.size} x${order.leverage} limit@${order.limitPrice} tp=${order.tpPrice || "-"} sl=${order.slPrice || "-"}`, formatStoreState(state));

      const historyItem: OrderHistoryItem = {
        id,
        side: order.side,
        type: order.orderType === "take_profit" ? "tp" : order.orderType === "stop_loss" ? "sl" : "limit",
        status: "pending",
        leverage: order.leverage,
        size: order.size,
        price: order.limitPrice,
        tpPrice: order.tpPrice,
        slPrice: order.slPrice,
        createdAt: now,
        executionPrice: null,
        updatedAt: null,
      };

      set((state) => ({
        pendingOrders: [
          ...state.pendingOrders,
          { ...order, id, createdAt: now },
        ],
        ordersHistory: [...state.ordersHistory, historyItem].slice(
          -MAX_ORDERS_HISTORY
        ),
      }));
    },

    cancelPendingOrder: (id) => {
      const order = get().pendingOrders.find((o) => o.id === id);
      if (!order) {
        logger.log(`[cancelPendingOrder] id=${id} — already cancelled/filled, skipping`);
        return;
      }
      logger.log(`[cancelPendingOrder] id=${id} order=`, order, formatStoreState(get()));

      const now = formatTimestamp();

      set((state) => ({
        pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
        ordersHistory: state.ordersHistory.map((o) =>
          o.id === id
            ? { ...o, status: "canceled" as const, updatedAt: now }
            : o
        ),
      }));
    },

    cancelPendingOrdersForPosition: () => {
      set((state) => {
        if (!state.position) return state;
        const { side } = state.position;
        const toCancel = state.pendingOrders.filter(
          (o) =>
            o.side === side &&
            (o.orderType === "take_profit" || o.orderType === "stop_loss")
        );
        const now = formatTimestamp();
        return {
          pendingOrders: state.pendingOrders.filter(
            (o) =>
              !(o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss"))
          ),
          ordersHistory: state.ordersHistory.map((o) =>
            toCancel.some((c) => c.id === o.id)
              ? { ...o, status: "canceled" as const, updatedAt: now }
              : o
          ),
        };
      });
    },

    checkPendingOrders: (currentPrice) => {
      const state = get();
      if (state.pendingOrders.length === 0) return;
      const executed: PendingOrder[] = [];
      const remaining: PendingOrder[] = [];

      for (const order of state.pendingOrders) {
        let shouldExecute = false;
        if (order.orderType === "open") {
          shouldExecute =
            (order.side === "long" && currentPrice <= order.limitPrice) ||
            (order.side === "short" && currentPrice >= order.limitPrice);
        } else if (order.orderType === "take_profit") {
          const pos = state.position;
          if (pos && pos.side === order.side) {
            shouldExecute =
              (pos.side === "long" && currentPrice >= order.limitPrice) ||
              (pos.side === "short" && currentPrice <= order.limitPrice);
          }
        } else if (order.orderType === "stop_loss") {
          const pos = state.position;
          if (pos && pos.side === order.side) {
            shouldExecute =
              (pos.side === "long" && currentPrice <= order.limitPrice) ||
              (pos.side === "short" && currentPrice >= order.limitPrice);
          }
        }

        if (shouldExecute) {
          executed.push(order);
        } else {
          remaining.push(order);
        }
      }

      if (executed.length > 0) {
        executed.forEach((o) => {
          logger.log(`[checkPendingOrders] EXECUTED ${o.orderType} ${o.side.toUpperCase()} $${o.size} x${o.leverage} @${o.limitPrice} price=${currentPrice.toFixed(2)}`, formatStoreState(state));
        });
        const now = formatTimestamp();
        set({
          pendingOrders: remaining,
          ordersHistory: state.ordersHistory.map((o) => {
            const exec = executed.find((e) => e.id === o.id);
            if (!exec) return o;
            const isTpSl = exec.orderType === "take_profit" || exec.orderType === "stop_loss";
            return {
              ...o,
              status: "filled" as const,
              executionPrice: isTpSl ? currentPrice : o.executionPrice,
              updatedAt: now,
            };
          }),
        });
        for (const order of executed) {
          if (order.orderType === "take_profit") {
            state.closePosition("tp");
          } else if (order.orderType === "stop_loss") {
            state.closePosition("sl");
          } else {
            const existing = get().position;
            if (existing && existing.side === order.side) {
              state.addToPosition(
                order.size,
                order.limitPrice,
                order.tpPrice?.toString() ?? "",
                order.slPrice?.toString() ?? ""
              );
            } else if (existing && existing.side !== order.side) {
              const shouldFlip = !get().reduceOnly && order.size > existing.size;
              if (shouldFlip) {
                state.openPosition(
                  order.side,
                  order.leverage,
                  order.size,
                  order.tpPrice?.toString() ?? "",
                  order.slPrice?.toString() ?? "",
                  order.limitPrice.toString()
                );
              } else {
                state.reducePosition(order.size, order.limitPrice);
              }
            } else {
              state.openPosition(
                order.side,
                order.leverage,
                order.size,
                order.tpPrice?.toString() ?? "",
                order.slPrice?.toString() ?? "",
                order.limitPrice.toString()
              );
            }
          }
        }
      }
    },

    clearOrdersHistory: () => set({ ordersHistory: [] }),
  });
