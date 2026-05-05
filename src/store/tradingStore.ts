import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export interface PendingOrder {
  id: string;
  side: "long" | "short";
  leverage: number;
  size: number;
  tpPrice: number | null;
  slPrice: number | null;
  limitPrice: number;
  createdAt: string;
}

export interface OrderHistoryItem {
  id: string;
  side: "long" | "short";
  type: "market" | "limit";
  status: "pending" | "filled" | "canceled";
  leverage: number;
  size: number;
  price: number;
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
  checkPendingOrders: (currentPrice: number) => void;
  clearOrdersHistory: () => void;
  setLiquidated: (date: string) => void;
  clearLiquidated: () => void;
  setOnboardingSeen: () => void;
  setSkipHighLeverageWarning: (skip: boolean) => void;
  setReduceOnly: (value: boolean) => void;
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
      addClosedTrade: (trade) =>
        set((state) => ({
          closedTrades: [...state.closedTrades, trade],
        })),
      setPosition: (position) => set({ position }),
      addPendingOrder: (order) =>
        set((state) => {
          const id = Math.random().toString(36).slice(2, 9);
          const now = new Date().toLocaleString("pt-BR", {
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
            type: "limit",
            status: "pending",
            leverage: order.leverage,
            size: order.size,
            price: order.limitPrice,
            tpPrice: order.tpPrice,
            slPrice: order.slPrice,
            createdAt: now,
            updatedAt: null,
          };
          return {
            pendingOrders: [
              ...state.pendingOrders,
              { ...order, id, createdAt: now },
            ],
            ordersHistory: [...state.ordersHistory, historyItem],
          };
        }),
      cancelPendingOrder: (id) => {
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
          ordersHistory: state.ordersHistory.map((o) =>
            o.id === id ? { ...o, status: "canceled" as const, updatedAt: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) } : o
          ),
        }));
      },
      clearOrdersHistory: () => set({ ordersHistory: [] }),
      checkPendingOrders: (currentPrice) => {
        const state = get();
        if (state.pendingOrders.length === 0) return;
        const executed: PendingOrder[] = [];
        const remaining: PendingOrder[] = [];

        for (const order of state.pendingOrders) {
          const shouldExecute =
            (order.side === "long" && currentPrice <= order.limitPrice) ||
            (order.side === "short" && currentPrice >= order.limitPrice);


          if (shouldExecute) {
            executed.push(order);
          } else {
            remaining.push(order);
          }
        }

        if (executed.length > 0) {
          const now = new Date().toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          set({
            pendingOrders: remaining,
            ordersHistory: state.ordersHistory.map((o) =>
              executed.some((e) => e.id === o.id)
                ? { ...o, status: "filled" as const, updatedAt: now }
                : o
            ),
          });
          for (const order of executed) {

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
      },

      openPosition: (side, leverage, positionSize, tpPriceStr, slPriceStr, limitPrice) => {
        const state = get();
        const entryPrice = limitPrice ? parseFloat(limitPrice) : state.currentPrice;
        if (!entryPrice || entryPrice <= 0) return;
        if (!positionSize || positionSize <= 0) return;
        if (!leverage || leverage <= 0) return;

        // Guard against silently overwriting a same-side position
        if (state.position && state.position.side === side) {
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
          if (state.wallet + returnedMargin + closePnl < excessMargin) return;
        } else if (state.wallet < margin) {
          return;
        }

        const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
        const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;

        const now = new Date().toLocaleString("pt-BR", {
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
              realizedPnL: 0,
            };

            const historyItem: OrderHistoryItem = {
              id: Math.random().toString(36).slice(2, 9),
              side,
              type: limitPrice ? "limit" : "market",
              status: "filled",
              leverage,
              size: positionSize,
              price: entryPrice,
              tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
              slPrice: slPrice && slPrice > 0 ? slPrice : null,
              createdAt: now,
              updatedAt: now,
            };

            set({
              wallet: state.wallet + returnedMargin + closePnl - excessMargin,
              position: flippedPosition,
              closedTrades: [...state.closedTrades, trade],
              realizedPnL: state.realizedPnL + closePnl,
              ordersHistory: [...state.ordersHistory, historyItem],
              lastCloseReason: null,
            });
            return;
          } else {
            // Partial reduce in hedge mode — same as reduce only
            const reducedSize = positionSize;
            const priceDiff = existing.side === "long" ? entryPrice - existing.entry : existing.entry - entryPrice;
            const pnlPartial = (priceDiff / existing.entry) * reducedSize;
            const marginReturned = reducedSize / existing.leverage;
            const newSize = existing.size - reducedSize;

            const historyItem: OrderHistoryItem = {
              id: Math.random().toString(36).slice(2, 9),
              side,
              type: limitPrice ? "limit" : "market",
              status: "filled",
              leverage: existing.leverage,
              size: reducedSize,
              price: entryPrice,
              tpPrice: existing.tpPrice,
              slPrice: existing.slPrice,
              createdAt: now,
              updatedAt: now,
            };

            if (newSize <= 0) {
              // Full close — calculate PnL on entire existing position
              const closePnl = (priceDiff / existing.entry) * existing.size;
              const totalRealized = existing.realizedPnL + closePnl;
              const margin = existing.size / existing.leverage;
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
              };
              set({
                wallet: state.wallet + margin + closePnl,
                position: null,
                closedTrades: [...state.closedTrades, trade],
                realizedPnL: state.realizedPnL + closePnl,
                ordersHistory: [...state.ordersHistory, historyItem],
                lastCloseReason: null,
              });
            } else {
              set({
                wallet: state.wallet + marginReturned + pnlPartial,
                position: { ...existing, size: newSize, realizedPnL: existing.realizedPnL + pnlPartial },
                ordersHistory: [...state.ordersHistory, historyItem],
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
          realizedPnL: 0,
        };

        // Add market order to history
        const isLimit = !!limitPrice;
        if (!isLimit) {
          const historyItem: OrderHistoryItem = {
            id: Math.random().toString(36).slice(2, 9),
            side,
            type: "market",
            status: "filled",
            leverage,
            size: positionSize,
            price: entryPrice,
            tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
            slPrice: slPrice && slPrice > 0 ? slPrice : null,
            createdAt: now,
            updatedAt: now,
          };
          set({
            position: newPosition,
            wallet: state.wallet - margin,
            lastCloseReason: null,
            ordersHistory: [...state.ordersHistory, historyItem],
          });
        } else {
          set({
            position: newPosition,
            wallet: state.wallet - margin,
            lastCloseReason: null,
          });
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
        const newLiqPrice = calcLiquidationPrice(newEntry, leverage, side);

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

        const now = new Date().toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        if (reducedSize >= size) {
          // Close entire position
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnl = (priceDiff / entry) * size;
          const margin = size * marginPerUnit;
          const totalRealized = state.position.realizedPnL + pnl;
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
          };
          set({
            wallet: state.wallet + margin + pnl,
            position: null,
            closedTrades: [...state.closedTrades, trade],
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

        const now = new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

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
        };

        set({
          wallet: Math.max(0, newWallet),
          closedTrades: [...state.closedTrades, trade],
          realizedPnL: state.realizedPnL + pnl,
          position: null,
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

        const { side, entry, size, leverage } = state.position;
        const price = state.currentPrice;
        const marginPerUnit = 1 / leverage;
        const oldMargin = size * marginPerUnit;
        const newMargin = newSize * marginPerUnit;
        const marginDiff = newMargin - oldMargin;
        const historySide = orderSide ?? side;

        const now = new Date().toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        if (newSize > size) {
          // Increasing position
          if (state.wallet < marginDiff) return;
          const additionalSize = newSize - size;
          const newEntry = (size * entry + additionalSize * price) / newSize;
          const newLiqPrice = calcLiquidationPrice(newEntry, leverage, side);
          const historyItem: OrderHistoryItem = {
            id: Math.random().toString(36).slice(2, 9),
            side: historySide,
            type: "market",
            status: "filled",
            leverage,
            size: additionalSize,
            price,
            tpPrice: state.position.tpPrice,
            slPrice: state.position.slPrice,
            createdAt: now,
            updatedAt: now,
          };
          set({
            wallet: state.wallet - marginDiff,
            position: { ...state.position, entry: newEntry, size: newSize, liquidationPrice: newLiqPrice },
            ordersHistory: [...state.ordersHistory, historyItem],
          });
        } else if (newSize < size) {
          // Decreasing position
          const reducedSize = size - newSize;
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnlPartial = (priceDiff / entry) * reducedSize;
          const marginReturned = reducedSize * marginPerUnit;
          const historyItem: OrderHistoryItem = {
            id: Math.random().toString(36).slice(2, 9),
            side: historySide,
            type: "market",
            status: "filled",
            leverage,
            size: reducedSize,
            price,
            tpPrice: state.position.tpPrice,
            slPrice: state.position.slPrice,
            createdAt: now,
            updatedAt: now,
          };
          set({
            wallet: state.wallet + marginReturned + pnlPartial,
            position: { ...state.position, size: newSize, realizedPnL: state.position.realizedPnL + pnlPartial },
            ordersHistory: [...state.ordersHistory, historyItem],
            realizedPnL: state.realizedPnL + pnlPartial,
          });
        }
      },

      updateLeverage: (newLeverage: number) => {
        const state = get();
        if (!state.position) return;

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
          state.closePosition("liquidation");
          return { closed: true, reason: "liquidation" };
        }
        if (side === "short" && currentPrice >= liquidationPrice) {
          state.closePosition("liquidation");
          return { closed: true, reason: "liquidation" };
        }

        // Check trailing stop
        if (trailingStopPercent && trailingStopPrice !== null) {
          if (
            (side === "long" && currentPrice <= trailingStopPrice) ||
            (side === "short" && currentPrice >= trailingStopPrice)
          ) {
            state.closePosition("trailing_stop");
            return { closed: true, reason: "trailing_stop" };
          }
        }

        // Check SL
        if (slPrice) {
          if (side === "long" && currentPrice <= slPrice) {
            state.closePosition("sl");
            return { closed: true, reason: "sl" };
          }
          if (side === "short" && currentPrice >= slPrice) {
            state.closePosition("sl");
            return { closed: true, reason: "sl" };
          }
        }

        // Check TP
        if (tpPrice) {
          if (side === "long" && currentPrice >= tpPrice) {
            state.closePosition("tp");
            return { closed: true, reason: "tp" };
          }
          if (side === "short" && currentPrice <= tpPrice) {
            state.closePosition("tp");
            return { closed: true, reason: "tp" };
          }
        }

        return { closed: false };
      },
    }),
    {
      name: "trading-storage",
    }
  )
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __tradingStore?: typeof useTradingStore }).__tradingStore = useTradingStore;
}
