import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DIFFICULTY_PRESETS, type DifficultyKey } from "@/lib/difficulty";

// Safari iOS private mode throws on localStorage access instead of returning null
const safeLocalStorage = {
  getItem: (name: string) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); } catch { /* noop */ }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch { /* noop */ }
  },
};

export interface Trade {
  pnl: number;
  side: "long" | "short";
  reason: "manual" | "tp" | "sl" | "liquidation" | "trailing_stop";
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  margin: number;
  entryTime: string;
  exitTime: string;
  durationSeconds: number;
}

const MAX_CLOSED_TRADES = 500;
const MAX_ORDERS_HISTORY = 500;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export interface PendingOrder {
  id: string;
  side: "long" | "short";
  orderType: "open" | "take_profit" | "stop_loss";
  leverage: number;
  size: number;
  tpPrice: number | null;
  slPrice: number | null;
  limitPrice: number;   // trigger price
  orderPrice: number | null; // execution price (null = market)
  createdAt: string;
}

export interface OrderHistoryItem {
  id: string;
  side: "long" | "short";
  type: "market" | "limit" | "tp" | "sl";
  status: "pending" | "filled" | "canceled";
  leverage: number;
  size: number;
  price: number;           // trigger price (limit/tp/sl) or fill price (market)
  executionPrice: number | null; // actual fill price for tp/sl (set when executed)
  tpPrice: number | null;
  slPrice: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Position {
  side: "long" | "short";
  entry: number;
  size: number;
  leverage: number;
  tpPrice: number | null;
  slPrice: number | null;
  trailingStopPercent: number | null;
  trailingStopPrice: number | null;
  liquidationPrice: number;
  entryTime: string;
  entryTimestamp: number;
  realizedPnL: number;
}

function calcTrailingStopPrice(side: "long" | "short", currentPrice: number, percent: number): number {
  return side === "long"
    ? currentPrice * (1 - percent / 100)
    : currentPrice * (1 + percent / 100);
}

interface TradingStore {
  price: number;
  currentPrice: number;
  volatility: number;
  marketTrend: "bull" | "bear" | "neutral";
  priceHistory: number[];
  wallet: number;
  closedTrades: Trade[];
  realizedPnL: number;
  position: Position | null;

  pendingOrders: PendingOrder[];
  ordersHistory: OrderHistoryItem[];
  isLoading: boolean;
  lastCloseReason: string | null;
  isLiquidated: boolean;
  simulationRealDate: string | null;
  hasSeenOnboarding: boolean;
  skipHighLeverageWarning: boolean;
  reduceOnly: boolean;
  lastActionError: string | null;
  difficulty: DifficultyKey;
  maxLeverage: number;
  startingWallet: number;

  setPrice: (price: number) => void;
  setCurrentPrice: (price: number) => void;
  setVolatility: (volatility: number) => void;
  setMarketTrend: (trend: "bull" | "bear" | "neutral") => void;
  addPriceHistory: (price: number) => void;
  setWallet: (wallet: number) => void;
  addClosedTrade: (trade: Trade) => void;
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
  addPendingOrder: (order: Omit<PendingOrder, "id" | "createdAt">) => void;
  cancelPendingOrder: (id: string) => void;
  cancelPendingOrdersForPosition: () => void;
  setPositionTpSl: (tpPrice: string, slPrice: string) => void;
  checkPendingOrders: (currentPrice: number) => void;
  clearOrdersHistory: () => void;
  setLiquidated: (date: string) => void;
  clearLiquidated: () => void;
  setOnboardingSeen: () => void;
  setSkipHighLeverageWarning: (skip: boolean) => void;
  setReduceOnly: (value: boolean) => void;
  clearLastActionError: () => void;
  setDifficulty: (key: DifficultyKey) => void;
}

function formatStoreState(state: TradingStore) {
  const { currentPrice, wallet, position, realizedPnL, pendingOrders, reduceOnly } = state;
  const unrealizedPnL = position
    ? ((position.side === "long" ? currentPrice - position.entry : position.entry - currentPrice) / position.entry) * position.size
    : 0;
  return {
    price: currentPrice?.toFixed(2) ?? "N/A",
    wallet: wallet?.toFixed(2) ?? "N/A",
    position: position
      ? {
          side: position.side,
          entry: position.entry.toFixed(2),
          size: position.size.toFixed(2),
          leverage: position.leverage + "x",
          liqPrice: position.liquidationPrice.toFixed(2),
          unrealizedPnL: unrealizedPnL.toFixed(2),
          realizedPnL: (position.realizedPnL || 0).toFixed(2),
        }
      : null,
    sessionRealizedPnL: (realizedPnL || 0).toFixed(2),
    pendingOrders: pendingOrders?.length ?? 0,
    reduceOnly,
  };
}

function calcLiquidationPrice(entry: number, leverage: number, side: "long" | "short"): number {
  // Simplified: liq when price moves 1/leverage against position
  // For long: liq = entry * (1 - 1/leverage)
  // For short: liq = entry * (1 + 1/leverage)
  if (side === "long") {
    return entry * (1 - 1 / leverage);
  }
  return entry * (1 + 1 / leverage);
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      price: 45000,
      currentPrice: 45000,
      volatility: 1.5,
      marketTrend: "bull",
      priceHistory: Array.from({ length: 50 }, () => 44000 + Math.random() * 2000),
      wallet: 10000,
      closedTrades: [],
      realizedPnL: 0,
      position: null,

      pendingOrders: [],
      ordersHistory: [],
      isLoading: false,
      lastCloseReason: null,
      isLiquidated: false,
      simulationRealDate: null,
      hasSeenOnboarding: false,
      skipHighLeverageWarning: false,
      reduceOnly: true,
      lastActionError: null,
      difficulty: "normal" as DifficultyKey,
      maxLeverage: 50,
      startingWallet: 10000,

      setDifficulty: (key: DifficultyKey) => {
        const preset = DIFFICULTY_PRESETS[key];
        set({ difficulty: key, maxLeverage: preset.maxLeverage, startingWallet: preset.wallet });
      },

      setPrice: (price) => set({ price, currentPrice: price }),
      setCurrentPrice: (price) => set({ currentPrice: price, price }),
      setVolatility: (volatility) => set({ volatility }),
      setMarketTrend: (marketTrend) => set({ marketTrend }),
      addPriceHistory: (price) =>
        set((state) => ({
          priceHistory: [...state.priceHistory.slice(-49), price],
        })),
      setWallet: (wallet) => set({ wallet }),
      setLiquidated: (date) => set({ isLiquidated: true, simulationRealDate: date }),
      clearLiquidated: () => set({ isLiquidated: false, simulationRealDate: null }),
      setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setSkipHighLeverageWarning: (skip) => set({ skipHighLeverageWarning: skip }),
      setReduceOnly: (value) => set({ reduceOnly: value }),
      clearLastActionError: () => set({ lastActionError: null }),
      addClosedTrade: (trade) =>
        set((state) => ({
          closedTrades: [...state.closedTrades, trade].slice(-MAX_CLOSED_TRADES),
        })),
      setPosition: (position) => set({ position }),
      addPendingOrder: (order) =>
        set((state) => {
          console.log(`[addPendingOrder] ${order.orderType} ${order.side.toUpperCase()} $${order.size} x${order.leverage} limit@${order.limitPrice} tp=${order.tpPrice||"-"} sl=${order.slPrice||"-"}`, formatStoreState(state));
          const id = generateId();
          const now = new Date().toLocaleString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
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
          return {
            pendingOrders: [
              ...state.pendingOrders,
              { ...order, id, createdAt: now },
            ],
            ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
          };
        }),
      cancelPendingOrder: (id) => {
        const order = get().pendingOrders.find((o) => o.id === id);
        if (!order) {
          console.log(`[cancelPendingOrder] id=${id} — already cancelled/filled, skipping`);
          return;
        }
        console.log(`[cancelPendingOrder] id=${id} order=`, order, formatStoreState(get()));
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
          ordersHistory: state.ordersHistory.map((o) =>
            o.id === id ? { ...o, status: "canceled" as const, updatedAt: new Date().toLocaleString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) } : o
          ),
        }));
      },
      cancelPendingOrdersForPosition: () => {
        set((state) => {
          if (!state.position) return state;
          const { side } = state.position;
          const toCancel = state.pendingOrders.filter(
            (o) => o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss")
          );
          const now = new Date().toLocaleString("en-US", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          });
          return {
            pendingOrders: state.pendingOrders.filter(
              (o) => !(o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss"))
            ),
            ordersHistory: state.ordersHistory.map((o) =>
              toCancel.some((c) => c.id === o.id)
                ? { ...o, status: "canceled" as const, updatedAt: now }
                : o
            ),
          };
        });
      },
      clearOrdersHistory: () => set({ ordersHistory: [] }),
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
          for (const o of executed) {
            console.log(`[checkPendingOrders] EXECUTED ${o.orderType} ${o.side.toUpperCase()} $${o.size} x${o.leverage} @${o.limitPrice} price=${currentPrice.toFixed(2)}`, formatStoreState(state));
          }
          const now = new Date().toLocaleString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
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
                // Add to existing position
                state.addToPosition(
                  order.size,
                  order.limitPrice,
                  order.tpPrice?.toString() ?? "",
                  order.slPrice?.toString() ?? ""
                );
              } else if (existing && existing.side !== order.side) {
                // Reduce, close, or flip existing position (opposite side)
                const shouldFlip = !get().reduceOnly && order.size > existing.size;
                if (shouldFlip) {
                  // Hedge mode: close existing and open flipped position
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
                // Open new position
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

      openPosition: (side, leverage, positionSize, tpPriceStr, slPriceStr, limitPrice) => {
        const state = get();
        console.log(`[openPosition] ${side.toUpperCase()} $${positionSize} x${leverage}${limitPrice ? ` limit@${limitPrice}` : ""} tp=${tpPriceStr||"-"} sl=${slPriceStr||"-"}`, formatStoreState(state));
        const entryPrice = limitPrice ? parseFloat(limitPrice) : state.currentPrice;
        if (!entryPrice || entryPrice <= 0) {
          set({ lastActionError: "Invalid entry price" });
          return;
        }
        if (!positionSize || positionSize <= 0) {
          set({ lastActionError: "Position size must be greater than 0" });
          return;
        }
        if (!leverage || leverage <= 0) {
          set({ lastActionError: "Leverage must be greater than 0" });
          return;
        }

        // Guard against silently overwriting a same-side position
        if (state.position && state.position.side === side) {
          set({ lastActionError: `Close your existing ${side} position first` });
          return;
        }

        const margin = positionSize / leverage;

        // Validate funds — in Hedge Mode flip, only the excess needs new margin
        // because the existing position's margin + PnL is returned first
        if (state.position && state.position.side !== side && !state.reduceOnly && positionSize > state.position.size) {
          const existing = state.position;
          const priceDiff = existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice;
          const closePnl = (priceDiff / existing.entry) * existing.size;
          const returnedMargin = existing.size / existing.leverage;
          const excessSize = positionSize - existing.size;
          const excessMargin = excessSize / leverage;
          if (state.wallet + returnedMargin + closePnl < excessMargin) {
            set({ lastActionError: "Insufficient funds for hedge flip" });
            return;
          }
        } else if (state.wallet < margin) {
          set({ lastActionError: "Insufficient wallet balance" });
          return;
        }

        const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
        const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;

        // Validate TP/SL won't trigger immediately at entry price
        if (tpPrice && tpPrice > 0) {
          if (side === "long" && entryPrice >= tpPrice) {
            set({ lastActionError: `Invalid TP: for LONG the Take Profit must be ABOVE entry ($${entryPrice.toFixed(2)}). Enter a value > $${entryPrice.toFixed(2)}.` });
            return;
          }
          if (side === "short" && entryPrice <= tpPrice) {
            set({ lastActionError: `Invalid TP: for SHORT the Take Profit must be BELOW entry ($${entryPrice.toFixed(2)}). Enter a value < $${entryPrice.toFixed(2)}.` });
            return;
          }
        }
        if (slPrice && slPrice > 0) {
          if (side === "long" && entryPrice <= slPrice) {
            set({ lastActionError: `Invalid SL: for LONG the Stop Loss must be BELOW entry ($${entryPrice.toFixed(2)}). Enter a value < $${entryPrice.toFixed(2)}.` });
            return;
          }
          if (side === "short" && entryPrice >= slPrice) {
            set({ lastActionError: `Invalid SL: for SHORT the Stop Loss must be ABOVE entry ($${entryPrice.toFixed(2)}). Enter a value > $${entryPrice.toFixed(2)}.` });
            return;
          }
        }

        const now = new Date().toLocaleString("en-US", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Opposite-side orders: reduce, close, or flip depending on reduceOnly mode
        if (state.position && state.position.side !== side) {
          const existing = state.position;
          if (!state.reduceOnly && positionSize > existing.size) {
            // Hedge mode — Flip: close existing and open new position with excess
            const priceDiff = existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice;
            const closePnl = (priceDiff / existing.entry) * existing.size;
            const totalRealized = existing.realizedPnL + closePnl;
            const returnedMargin = existing.size / existing.leverage;
            const excessSize = positionSize - existing.size;
            const excessMargin = excessSize / leverage;

            const durationSeconds = Math.floor((Date.now() - existing.entryTimestamp) / 1000);
            const trade: Trade = {
              pnl: totalRealized,
              side: existing.side,
              reason: "manual",
              entryPrice: existing.entry,
              exitPrice: entryPrice,
              size: existing.size,
              leverage: existing.leverage,
              margin: returnedMargin,
              entryTime: existing.entryTime || now,
              exitTime: now,
              durationSeconds,
            };

            const newLiqPrice = calcLiquidationPrice(entryPrice, leverage, side);
            const flippedPosition: Position = {
              side,
              entry: entryPrice,
              size: excessSize,
              leverage,
              tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
              slPrice: slPrice && slPrice > 0 ? slPrice : null,
              trailingStopPercent: null,
              trailingStopPrice: null,
              liquidationPrice: newLiqPrice,
              entryTime: now,
              entryTimestamp: Date.now(),
              realizedPnL: 0,
            };

            const historyItem: OrderHistoryItem = {
              id: generateId(),
              side,
              type: limitPrice ? "limit" : "market",
              status: "filled",
              leverage,
              size: positionSize,
              price: entryPrice,
              tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
              slPrice: slPrice && slPrice > 0 ? slPrice : null,
              createdAt: now,
              executionPrice: null,
              updatedAt: now,
            };

            set({
              wallet: state.wallet + returnedMargin + closePnl - excessMargin,
              position: flippedPosition,
              closedTrades: [...state.closedTrades, trade].slice(-MAX_CLOSED_TRADES),
              realizedPnL: state.realizedPnL + closePnl,
              ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
              lastCloseReason: null,
            });
            if ((tpPrice && tpPrice > 0) || (slPrice && slPrice > 0)) {
              get().setPositionTpSl(tpPriceStr, slPriceStr);
            }
            return;
          } else {
            // Partial reduce in hedge mode — same as reduce only
            const reducedSize = positionSize;
            const priceDiff = existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice;
            const pnlPartial = (priceDiff / existing.entry) * reducedSize;
            const marginReturned = reducedSize / existing.leverage;
            const newSize = existing.size - reducedSize;

            const historyItem: OrderHistoryItem = {
              id: generateId(),
              side,
              type: limitPrice ? "limit" : "market",
              status: "filled",
              leverage: existing.leverage,
              size: reducedSize,
              price: entryPrice,
              tpPrice: existing.tpPrice,
              slPrice: existing.slPrice,
              createdAt: now,
              executionPrice: null,
              updatedAt: now,
            };

            if (newSize <= 0) {
              // Full close — calculate PnL on entire existing position
              const closePnl = (priceDiff / existing.entry) * existing.size;
              const totalRealized = existing.realizedPnL + closePnl;
              const margin = existing.size / existing.leverage;
              const durationSeconds = Math.floor((Date.now() - existing.entryTimestamp) / 1000);
              const trade: Trade = {
                pnl: totalRealized,
                side: existing.side,
                reason: "manual",
                entryPrice: existing.entry,
                exitPrice: entryPrice,
                size: existing.size,
                leverage: existing.leverage,
                margin,
                entryTime: existing.entryTime || now,
                exitTime: now,
                durationSeconds,
              };
              set({
                wallet: state.wallet + margin + closePnl,
                position: null,
                closedTrades: [...state.closedTrades, trade].slice(-MAX_CLOSED_TRADES),
                realizedPnL: state.realizedPnL + closePnl,
                ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
                lastCloseReason: null,
              });
            } else {
              set({
                wallet: state.wallet + marginReturned + pnlPartial,
                position: { ...existing, size: newSize, realizedPnL: existing.realizedPnL + pnlPartial },
                ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
                realizedPnL: state.realizedPnL + pnlPartial,
              });
            }
            return;
          }
        }

        const liqPrice = calcLiquidationPrice(entryPrice, leverage, side);

        const newPosition: Position = {
          side,
          entry: entryPrice,
          size: positionSize,
          leverage,
          tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
          slPrice: slPrice && slPrice > 0 ? slPrice : null,
          trailingStopPercent: null,
          trailingStopPrice: null,
          liquidationPrice: liqPrice,
          entryTime: now,
          entryTimestamp: Date.now(),
          realizedPnL: 0,
        };

        // Add market order to history
        const isLimit = !!limitPrice;
        if (!isLimit) {
          const historyItem: OrderHistoryItem = {
            id: generateId(),
            side,
            type: "market",
            status: "filled",
            leverage,
            size: positionSize,
            price: entryPrice,
            tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
            slPrice: slPrice && slPrice > 0 ? slPrice : null,
            createdAt: now,
            executionPrice: null,
            updatedAt: now,
          };
          set({
            position: newPosition,
            wallet: state.wallet - margin,
            lastCloseReason: null,
            isLiquidated: false,
            ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
          });
        } else {
          set({
            position: newPosition,
            wallet: state.wallet - margin,
            lastCloseReason: null,
            isLiquidated: false,
          });
        }
        if ((tpPrice && tpPrice > 0) || (slPrice && slPrice > 0)) {
          get().setPositionTpSl(tpPriceStr, slPriceStr);
        }
      },

      addToPosition: (additionalSize: number, price: number, tpPriceStr: string, slPriceStr: string) => {
        const state = get();
        if (!state.position) return;

        const { side, entry, size, leverage } = state.position;
        const margin = additionalSize / leverage;
        if (state.wallet < margin) return;

        // Same side → increase position
        const newSize = size + additionalSize;
        const newEntry = (size * entry + additionalSize * price) / newSize;

        const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : state.position.tpPrice;
        const slPrice = slPriceStr ? parseFloat(slPriceStr) : state.position.slPrice;
        const rawLiqPrice = calcLiquidationPrice(newEntry, leverage, side);
        const newLiqPrice = side === "short"
          ? Math.min(rawLiqPrice, state.position.liquidationPrice)
          : Math.max(rawLiqPrice, state.position.liquidationPrice);

        set({
          wallet: state.wallet - margin,
          position: {
            ...state.position,
            entry: newEntry,
            size: newSize,
            tpPrice: tpPrice && tpPrice > 0 ? tpPrice : state.position.tpPrice,
            slPrice: slPrice && slPrice > 0 ? slPrice : state.position.slPrice,
            liquidationPrice: newLiqPrice,
            realizedPnL: state.position.realizedPnL,
          },
        });
      },

      reducePosition: (reducedSize: number, price: number) => {
        const state = get();
        if (!state.position) return;

        const { side, entry, size, leverage } = state.position;
        const marginPerUnit = 1 / leverage;

        const now = new Date().toLocaleString("en-US", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        if (reducedSize >= size) {
          // Close entire position
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnl = (priceDiff / entry) * size;
          const margin = size * marginPerUnit;
          const totalRealized = state.position.realizedPnL + pnl;
          const durationSeconds = Math.floor((Date.now() - state.position.entryTimestamp) / 1000);
          const trade: Trade = {
            pnl: totalRealized,
            side,
            reason: "manual",
            entryPrice: entry,
            exitPrice: price,
            size,
            leverage,
            margin,
            entryTime: state.position.entryTime || now,
            exitTime: now,
            durationSeconds,
          };
          set({
            wallet: state.wallet + margin + pnl,
            position: null,
            closedTrades: [...state.closedTrades, trade].slice(-MAX_CLOSED_TRADES),
            realizedPnL: state.realizedPnL + pnl,
          });
        } else {
          // Partial close
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnlPartial = (priceDiff / entry) * reducedSize;
          const marginReturned = reducedSize * marginPerUnit;
          set({
            wallet: state.wallet + marginReturned + pnlPartial,
            position: {
              ...state.position,
              size: size - reducedSize,
              realizedPnL: state.position.realizedPnL + pnlPartial,
            },
            realizedPnL: state.realizedPnL + pnlPartial,
          });
        }
      },

      closePosition: (reason = "manual") => {
        const state = get();
        if (!state.position) return;
        console.log(`[closePosition] reason=${reason} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));

        const { side, entry, size, leverage } = state.position;
        const price = state.currentPrice;

        // PnL = (priceDiff / entry) * positionSize
        // For long: positive when price > entry
        // For short: positive when price < entry
        const priceDiff = side === "long" ? price - entry : entry - price;
        const pnl = (priceDiff / entry) * size;
        const priorRealized = state.position.realizedPnL || 0;
        const totalPnl = pnl + priorRealized;

        const margin = size / leverage;
        const newWallet = state.wallet + margin + pnl;

        const now = new Date().toLocaleString("en-US", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Cancel any TP/SL pending orders when position closes
        const toCancel = state.pendingOrders.filter(
          (o) => o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss")
        );

        let newPendingOrders = state.pendingOrders;
        let newOrdersHistory = state.ordersHistory;

        if (toCancel.length > 0) {
          newPendingOrders = state.pendingOrders.filter(
            (o) => !(o.side === side && (o.orderType === "take_profit" || o.orderType === "stop_loss"))
          );
          newOrdersHistory = state.ordersHistory.map((o) =>
            toCancel.some((c) => c.id === o.id)
              ? { ...o, status: "canceled" as const, updatedAt: now }
              : o
          );
        }

        const durationSeconds = Math.floor((Date.now() - state.position.entryTimestamp) / 1000);
        const trade: Trade = {
          pnl: totalPnl,
          side,
          reason,
          entryPrice: entry,
          exitPrice: price,
          size,
          leverage,
          margin,
          entryTime: state.position.entryTime || now,
          exitTime: now,
          durationSeconds,
        };

        const closeHistoryItem: OrderHistoryItem = {
          id: generateId(),
          side: side === "long" ? "short" : "long",
          type: "market",
          status: "filled",
          leverage,
          size,
          price,
          tpPrice: null,
          slPrice: null,
          createdAt: now,
          executionPrice: null,
          updatedAt: now,
        };

        set({
          wallet: Math.max(0, newWallet),
          closedTrades: [...state.closedTrades, trade].slice(-MAX_CLOSED_TRADES),
          ordersHistory: [...newOrdersHistory, closeHistoryItem].slice(-MAX_ORDERS_HISTORY),
          realizedPnL: state.realizedPnL + pnl,
          position: null,
          pendingOrders: newPendingOrders,
          isLiquidated: reason === "liquidation" ? get().isLiquidated : false,
          lastCloseReason:
            reason === "tp"
              ? "Take Profit hit!"
              : reason === "sl"
              ? "Stop Loss hit!"
              : reason === "liquidation"
              ? "Position liquidated!"
              : null,
        });
        if (reason === "liquidation") {
          const dateStr = get().simulationRealDate;
          if (dateStr) {
            set({ isLiquidated: true });
          }
        }
      },

      updatePositionSize: (newSize: number, orderSide?: "long" | "short") => {
        const state = get();
        if (!state.position || newSize <= 0) return;
        console.log(`[updatePositionSize] ${state.position.side.toUpperCase()} ${state.position.size} → ${newSize} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));

        const { side, entry, size, leverage } = state.position;
        const price = state.currentPrice;
        const marginPerUnit = 1 / leverage;
        const oldMargin = size * marginPerUnit;
        const newMargin = newSize * marginPerUnit;
        const marginDiff = newMargin - oldMargin;
        const historySide = orderSide ?? side;

        const now = new Date().toLocaleString("en-US", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        if (newSize > size) {
          // Increasing position
          if (state.wallet < marginDiff) return;
          const additionalSize = newSize - size;
          const newEntry = (size * entry + additionalSize * price) / newSize;
          const rawLiqPrice = calcLiquidationPrice(newEntry, leverage, side);
          // Liq price must always move toward current price when increasing — never away
          const newLiqPrice = side === "short"
            ? Math.min(rawLiqPrice, state.position.liquidationPrice)
            : Math.max(rawLiqPrice, state.position.liquidationPrice);
          const historyItem: OrderHistoryItem = {
            id: generateId(),
            side: historySide,
            type: "market",
            status: "filled",
            leverage,
            size: additionalSize,
            price,
            tpPrice: state.position.tpPrice,
            slPrice: state.position.slPrice,
            createdAt: now,
            executionPrice: null,
            updatedAt: now,
          };
          set({
            wallet: state.wallet - marginDiff,
            position: { ...state.position, entry: newEntry, size: newSize, liquidationPrice: newLiqPrice },
            ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
          });
        } else if (newSize < size) {
          // Decreasing position
          const reducedSize = size - newSize;
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnlPartial = (priceDiff / entry) * reducedSize;
          const marginReturned = reducedSize * marginPerUnit;
          const historyItem: OrderHistoryItem = {
            id: generateId(),
            side: historySide,
            type: "market",
            status: "filled",
            leverage,
            size: reducedSize,
            price,
            tpPrice: state.position.tpPrice,
            slPrice: state.position.slPrice,
            createdAt: now,
            executionPrice: null,
            updatedAt: now,
          };
          set({
            wallet: state.wallet + marginReturned + pnlPartial,
            position: { ...state.position, size: newSize, realizedPnL: state.position.realizedPnL + pnlPartial },
            ordersHistory: [...state.ordersHistory, historyItem].slice(-MAX_ORDERS_HISTORY),
            realizedPnL: state.realizedPnL + pnlPartial,
          });
        }
      },

      updateLeverage: (newLeverage: number) => {
        const state = get();
        if (!state.position) return;
        console.log(`[updateLeverage] ${state.position.leverage}x → ${newLeverage}x`, formatStoreState(state));

        const { size, leverage: oldLeverage } = state.position;
        const oldMargin = size / oldLeverage;
        const newMargin = size / newLeverage;
        const marginDiff = newMargin - oldMargin;

        if (marginDiff > 0 && state.wallet < marginDiff) return;

        const newLiqPrice = calcLiquidationPrice(
          state.position.entry,
          newLeverage,
          state.position.side
        );

        set({
          wallet: state.wallet - marginDiff,
          position: {
            ...state.position,
            leverage: newLeverage,
            liquidationPrice: newLiqPrice,
          },
        });
      },

          setTrailingStop: (percent: number | null) => {
        const state = get();
        if (!state.position) return;
        console.log(`[setTrailingStop] ${percent === null ? "remove" : `${percent}%`} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));
        if (percent === null || percent <= 0) {
          set({
            position: { ...state.position, trailingStopPercent: null, trailingStopPrice: null },
          });
          return;
        }
        const newStopPrice = calcTrailingStopPrice(state.position.side, state.currentPrice, percent);
        set({
          position: { ...state.position, trailingStopPercent: percent, trailingStopPrice: newStopPrice },
        });
      },

      setPositionTpSl: (tpPriceStr: string, slPriceStr: string) => {
        const state = get();
        if (!state.position) return;
        console.log(`[setPositionTpSl] tp=${tpPriceStr||"-"} sl=${slPriceStr||"-"} price=${state.currentPrice.toFixed(2)}`, formatStoreState(state));

        const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
        const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;
        const { side, leverage, size } = state.position;
        const ref = state.currentPrice;

        if (tpPrice && tpPrice > 0) {
          if (side === "long" && ref >= tpPrice) {
            set({ lastActionError: `Invalid TP: for LONG the Take Profit must be ABOVE the current price ($${ref.toFixed(2)}). Enter a value > $${ref.toFixed(2)}.` });
            return;
          }
          if (side === "short" && ref <= tpPrice) {
            set({ lastActionError: `Invalid TP: for SHORT the Take Profit must be BELOW the current price ($${ref.toFixed(2)}). Enter a value < $${ref.toFixed(2)}.` });
            return;
          }
        }
        if (slPrice && slPrice > 0) {
          if (side === "long" && ref <= slPrice) {
            set({ lastActionError: `Invalid SL: for LONG the Stop Loss must be BELOW the current price ($${ref.toFixed(2)}). Enter a value < $${ref.toFixed(2)}.` });
            return;
          }
          if (side === "short" && ref >= slPrice) {
            set({ lastActionError: `Invalid SL: for SHORT the Stop Loss must be ABOVE the current price ($${ref.toFixed(2)}). Enter a value > $${ref.toFixed(2)}.` });
            return;
          }
        }

        const now = new Date().toLocaleString("en-US", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        // Only cancel the specific order type being updated.
        // If tpPriceStr is empty, keep existing TP. If slPriceStr is empty, keep existing SL.
        const cancelTypes: Array<"take_profit" | "stop_loss"> = [];
        if (tpPriceStr) cancelTypes.push("take_profit");
        if (slPriceStr) cancelTypes.push("stop_loss");

        const toCancel = state.pendingOrders.filter(
          (o) => o.side === side && cancelTypes.includes(o.orderType as "take_profit" | "stop_loss")
        );

        let newPendingOrders = state.pendingOrders.filter(
          (o) => !(o.side === side && cancelTypes.includes(o.orderType as "take_profit" | "stop_loss"))
        );

        const newOrdersHistory = state.ordersHistory.map((o) =>
          toCancel.some((c) => c.id === o.id)
            ? { ...o, status: "canceled" as const, updatedAt: now }
            : o
        );

        // Create new TP/SL pending orders if valid
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
          newOrdersHistory.push({
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
          });
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
          newOrdersHistory.push({
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
          });
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

        // Update trailing stop if price moved favorably (before any checks)
        if (trailingStopPercent && trailingStopPrice !== null) {
          const newStopPrice = calcTrailingStopPrice(side, currentPrice, trailingStopPercent);
          if (
            (side === "long" && newStopPrice > trailingStopPrice) ||
            (side === "short" && newStopPrice < trailingStopPrice)
          ) {
            set({ position: { ...state.position, trailingStopPrice: newStopPrice } });
          }
        }

        // Check liquidation (highest precedence)
        if (side === "long" && currentPrice <= liquidationPrice) {
          console.log(`[checkPosition] 💀 LIQUIDATION long price=${currentPrice.toFixed(2)} liq=${liquidationPrice.toFixed(2)}`, formatStoreState(state));
          state.closePosition("liquidation");
          return { closed: true, reason: "liquidation" };
        }
        if (side === "short" && currentPrice >= liquidationPrice) {
          console.log(`[checkPosition] 💀 LIQUIDATION short price=${currentPrice.toFixed(2)} liq=${liquidationPrice.toFixed(2)}`, formatStoreState(state));
          state.closePosition("liquidation");
          return { closed: true, reason: "liquidation" };
        }

        // Check trailing stop
        if (trailingStopPercent && trailingStopPrice !== null) {
          if (
            (side === "long" && currentPrice <= trailingStopPrice) ||
            (side === "short" && currentPrice >= trailingStopPrice)
          ) {
            console.log(`[checkPosition] 📉 TRAILING STOP ${side} price=${currentPrice.toFixed(2)} stop=${trailingStopPrice.toFixed(2)}`, formatStoreState(state));
            state.closePosition("trailing_stop");
            return { closed: true, reason: "trailing_stop" };
          }
        }

        // Check SL
        if (slPrice) {
          if (side === "long" && currentPrice <= slPrice) {
            console.log(`[checkPosition] 🛡️ SL HIT long price=${currentPrice.toFixed(2)} sl=${slPrice.toFixed(2)}`, formatStoreState(state));
            state.closePosition("sl");
            return { closed: true, reason: "sl" };
          }
          if (side === "short" && currentPrice >= slPrice) {
            console.log(`[checkPosition] 🛡️ SL HIT short price=${currentPrice.toFixed(2)} sl=${slPrice.toFixed(2)}`, formatStoreState(state));
            state.closePosition("sl");
            return { closed: true, reason: "sl" };
          }
        }

        // Check TP
        if (tpPrice) {
          if (side === "long" && currentPrice >= tpPrice) {
            console.log(`[checkPosition] 🎯 TP HIT long price=${currentPrice.toFixed(2)} tp=${tpPrice.toFixed(2)}`, formatStoreState(state));
            state.closePosition("tp");
            return { closed: true, reason: "tp" };
          }
          if (side === "short" && currentPrice <= tpPrice) {
            console.log(`[checkPosition] 🎯 TP HIT short price=${currentPrice.toFixed(2)} tp=${tpPrice.toFixed(2)}`, formatStoreState(state));
            state.closePosition("tp");
            return { closed: true, reason: "tp" };
          }
        }

        return { closed: false };
      },
    }),
    {
      name: "trading-storage",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      migrate: (persistedState: unknown) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return {} as TradingStore;
        }
        const s = persistedState as Partial<TradingStore>;
        // Clear stale transient state that should never persist across sessions
        return {
          ...s,
          position: null,
          pendingOrders: [],
          isLiquidated: false,
          lastCloseReason: null,
          simulationRealDate: null,
          isLoading: false,
          lastActionError: null,
        } as TradingStore;
      },
      partialize: (state) => ({
        wallet: state.wallet,
        hasSeenOnboarding: state.hasSeenOnboarding,
        skipHighLeverageWarning: state.skipHighLeverageWarning,
        reduceOnly: state.reduceOnly,
        closedTrades: state.closedTrades,
        realizedPnL: state.realizedPnL,
        ordersHistory: state.ordersHistory,
        difficulty: state.difficulty,
        maxLeverage: state.maxLeverage,
        startingWallet: state.startingWallet,
      }),
    }
  )
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __tradingStore?: typeof useTradingStore }).__tradingStore = useTradingStore;
}
