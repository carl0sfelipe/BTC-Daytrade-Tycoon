import type { StateCreator } from "zustand";
import type { TradingStore } from "../types";
import { DIFFICULTY_PRESETS, type DifficultyKey } from "@/lib/difficulty";

export interface SessionSlice {
  wallet: number;
  difficulty: DifficultyKey;
  maxLeverage: number;
  startingWallet: number;
  hasSeenOnboarding: boolean;
  skipHighLeverageWarning: boolean;
  reduceOnly: boolean;
  setWallet: (wallet: number) => void;
  setDifficulty: (key: DifficultyKey) => void;
  setOnboardingSeen: () => void;
  setSkipHighLeverageWarning: (skip: boolean) => void;
  setReduceOnly: (value: boolean) => void;
}

export const createSessionSlice: StateCreator<TradingStore, [], [], SessionSlice> =
  (set) => ({
    wallet: 10000,
    difficulty: "normal" as DifficultyKey,
    maxLeverage: 50,
    startingWallet: 10000,
    hasSeenOnboarding: false,
    skipHighLeverageWarning: false,
    reduceOnly: true,
    setWallet: (wallet) => set({ wallet }),
    setDifficulty: (key: DifficultyKey) => {
      const preset = DIFFICULTY_PRESETS[key];
      set({
        difficulty: key,
        maxLeverage: preset.maxLeverage,
        startingWallet: preset.wallet,
      });
    },
    setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
    setSkipHighLeverageWarning: (skip) =>
      set({ skipHighLeverageWarning: skip }),
    setReduceOnly: (value) => set({ reduceOnly: value }),
  });
