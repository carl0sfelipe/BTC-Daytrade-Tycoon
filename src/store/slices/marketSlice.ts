import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";

export interface MarketSlice {
  price: number;
  currentPrice: number;
  volatility: number;
  marketTrend: "bull" | "bear" | "neutral";
  priceHistory: number[];
  setPrice: (price: number) => void;
  setCurrentPrice: (price: number) => void;
  setVolatility: (volatility: number) => void;
  setMarketTrend: (trend: "bull" | "bear" | "neutral") => void;
  addPriceHistory: (price: number) => void;
}

export const createMarketSlice: StateCreator<TradingStore, [], [], MarketSlice> =
  (set) => ({
    price: 45000,
    currentPrice: 45000,
    volatility: 1.5,
    marketTrend: "bull",
    priceHistory: Array.from(
      { length: 50 },
      () => 44000 + Math.random() * 2000
    ),
    setPrice: (price) => set({ price, currentPrice: price }),
    setCurrentPrice: (price) => set({ currentPrice: price, price }),
    setVolatility: (volatility) => set({ volatility }),
    setMarketTrend: (marketTrend) => set({ marketTrend }),
    addPriceHistory: (price) =>
      set((state) => ({
        priceHistory: [...state.priceHistory.slice(-49), price],
      })),
  });
