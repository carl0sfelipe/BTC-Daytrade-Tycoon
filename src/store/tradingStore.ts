import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Trade {
  pnl: number;
  side: "long" | "short";
  reason: "manual" | "tp" | "sl" | "liquidation";
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
  liquidationPrice: number;
  entryTime: string;
}

interface TradingStore {
  price: number;
  currentPrice: number;
  volatility: number;
  marketTrend: "bull" | "bear" | "neutral";
  priceHistory: number[];
  wallet: number;
  closedTrades: Trade[];
  position: Position | null;
  activePositions: Position[];
  pendingOrders: PendingOrder[];
  ordersHistory: OrderHistoryItem[];
  isLoading: boolean;
  lastCloseReason: string | null;
  isLiquidated: boolean;
  simulationRealDate: string | null;
  hasSeenOnboarding: boolean;
  skipHighLeverageWarning: boolean;

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
  addToPosition: (additionalSize: number, price: number, tpPrice: string, slPrice: string) => void;
  reducePosition: (reducedSize: number, price: number) => void;
  updatePositionSize: (newSize: number) => void;
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
      position: null,
      activePositions: [],
      pendingOrders: [],
      ordersHistory: [],
      isLoading: false,
      lastCloseReason: null,
      isLiquidated: false,
      simulationRealDate: null,
      hasSeenOnboarding: false,
      skipHighLeverageWarning: false,

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
      addClosedTrade: (trade) =>
        set((state) => ({
          closedTrades: [...state.closedTrades, trade],
        })),
      setPosition: (position) => set({ position }),
      addPendingOrder: (order) =>
        set((state) => {
          console.log("[tradingStore] addPendingOrder", order);
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
        console.log("[tradingStore] cancelPendingOrder", id);
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
          ordersHistory: state.ordersHistory.map((o) =>
            o.id === id ? { ...o, status: "canceled" as const, updatedAt: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) } : o
          ),
        }));
      },
      clearOrdersHistory: () => set({ ordersHistory: [] }),
      checkPendingOrders: (currentPrice) => {
        console.log("[tradingStore] checkPendingOrders", { currentPrice, pendingCount: get().pendingOrders.length });
        const state = get();
        const executed: PendingOrder[] = [];
        const remaining: PendingOrder[] = [];

        for (const order of state.pendingOrders) {
          const shouldExecute =
            (order.side === "long" && currentPrice <= order.limitPrice) ||
            (order.side === "short" && currentPrice >= order.limitPrice);
          console.log("[tradingStore] evaluating order", { id: order.id, side: order.side, limitPrice: order.limitPrice, currentPrice, shouldExecute });

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
            console.log("[tradingStore] executing limit order", { id: order.id, side: order.side, size: order.size, limitPrice: order.limitPrice });
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
              // Reduce or close existing position (opposite side)
              state.reducePosition(order.size, order.limitPrice);
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
        console.log("[tradingStore] openPosition", { side, leverage, positionSize, limitPrice, currentPrice: get().currentPrice });
        const state = get();
        const entryPrice = limitPrice ? parseFloat(limitPrice) : state.currentPrice;
        if (!entryPrice || entryPrice <= 0) return;

        const margin = positionSize / leverage;
        if (state.wallet < margin) return;

        const tpPrice = tpPriceStr ? parseFloat(tpPriceStr) : null;
        const slPrice = slPriceStr ? parseFloat(slPriceStr) : null;
        const liqPrice = calcLiquidationPrice(entryPrice, leverage, side);

        const now = new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const newPosition: Position = {
          side,
          entry: entryPrice,
          size: positionSize,
          leverage,
          tpPrice: tpPrice && tpPrice > 0 ? tpPrice : null,
          slPrice: slPrice && slPrice > 0 ? slPrice : null,
          liquidationPrice: liqPrice,
          entryTime: now,
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
            activePositions: [...state.activePositions, newPosition],
            wallet: state.wallet - margin,
            lastCloseReason: null,
            ordersHistory: [...state.ordersHistory, historyItem],
          });
        } else {
          set({
            position: newPosition,
            activePositions: [...state.activePositions, newPosition],
            wallet: state.wallet - margin,
            lastCloseReason: null,
          });
        }
      },

      addToPosition: (additionalSize: number, price: number, tpPriceStr: string, slPriceStr: string) => {
        console.log("[tradingStore] addToPosition", { additionalSize, price, tpPriceStr, slPriceStr });
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
          },
        });
      },

      reducePosition: (reducedSize: number, price: number) => {
        console.log("[tradingStore] reducePosition", { reducedSize, price });
        const state = get();
        if (!state.position) return;

        const { side, entry, size, leverage } = state.position;
        const marginPerUnit = 1 / leverage;

        if (reducedSize >= size) {
          // Close entire position
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnl = (priceDiff / entry) * size;
          const margin = size * marginPerUnit;
          set({
            wallet: state.wallet + margin + pnl,
            position: null,
            activePositions: state.activePositions.filter(
              (p) => p.entry !== state.position!.entry || p.side !== state.position!.side
            ),
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
            },
          });
        }
      },

      closePosition: (reason = "manual") => {
        console.log("[tradingStore] closePosition", { reason, currentPrice: get().currentPrice });
        const state = get();
        if (!state.position) return;

        const { side, entry, size, leverage } = state.position;
        const price = state.currentPrice;

        // PnL = (priceDiff / entry) * positionSize
        // For long: positive when price > entry
        // For short: positive when price < entry
        const priceDiff = side === "long" ? price - entry : entry - price;
        const pnl = (priceDiff / entry) * size;

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
          pnl,
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
          position: null,
          activePositions: state.activePositions.filter(
            (p) => p.entry !== state.position!.entry || p.side !== state.position!.side
          ),
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

      updatePositionSize: (newSize: number) => {
        const state = get();
        if (!state.position || newSize <= 0) return;

        const { side, entry, size, leverage } = state.position;
        const price = state.currentPrice;
        const marginPerUnit = 1 / leverage;
        const oldMargin = size * marginPerUnit;
        const newMargin = newSize * marginPerUnit;
        const marginDiff = newMargin - oldMargin;

        if (newSize > size) {
          // Increasing position
          if (state.wallet < marginDiff) return;
          const additionalSize = newSize - size;
          const newEntry = (size * entry + additionalSize * price) / newSize;
          set({
            wallet: state.wallet - marginDiff,
            position: { ...state.position, entry: newEntry, size: newSize },
          });
        } else if (newSize < size) {
          // Decreasing position
          const reducedSize = size - newSize;
          const priceDiff = side === "long" ? price - entry : entry - price;
          const pnlPartial = (priceDiff / entry) * reducedSize;
          const marginReturned = reducedSize * marginPerUnit;
          set({
            wallet: state.wallet + marginReturned + pnlPartial,
            position: { ...state.position, size: newSize },
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

      checkPosition: (currentPrice) => {
        const state = get();
        if (!state.position) return { closed: false };

        const { side, tpPrice, slPrice, liquidationPrice } = state.position;

        // Check liquidation
        if (side === "long" && currentPrice <= liquidationPrice) {
          state.closePosition("liquidation");
          return { closed: true, reason: "liquidation" };
        }
        if (side === "short" && currentPrice >= liquidationPrice) {
          state.closePosition("liquidation");
          return { closed: true, reason: "liquidation" };
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
