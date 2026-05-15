import type { TradingStore } from "@/store/types";
import type { DifficultyKey } from "@/lib/difficulty";
import type { Position, Trade, PendingOrder, OrderHistoryItem } from "@/store/tradingStore";

export interface SessionSnapshot {
  version: 1;
  timestamp: number;
  wallet: number;
  startingWallet: number;
  difficulty: DifficultyKey;
  maxLeverage: number;
  reduceOnly: boolean;
  position: Position | null;
  closedTrades: Trade[];
  realizedPnL: number;
  pendingOrders: PendingOrder[];
  ordersHistory: OrderHistoryItem[];
}

const STORAGE_KEY = "btc-daytrade-tycoon-session-snapshot";

/**
 * Captures a serializable snapshot of the current trading session.
 * Excludes transient UI state (isLoading, lastActionError, isLiquidated)
 * and engine state (candles, priceHistory) which are re-created on reset.
 */
export function captureSessionSnapshot(store: TradingStore): SessionSnapshot {
  return {
    version: 1,
    timestamp: Date.now(),
    wallet: store.wallet,
    startingWallet: store.startingWallet,
    difficulty: store.difficulty,
    maxLeverage: store.maxLeverage,
    reduceOnly: store.reduceOnly,
    position: store.position,
    closedTrades: store.closedTrades,
    realizedPnL: store.realizedPnL,
    pendingOrders: store.pendingOrders,
    ordersHistory: store.ordersHistory,
  };
}

/**
 * Hydrates the trading store from a snapshot.
 * `setState` is the Zustand `setState` function (e.g. useTradingStore.setState).
 */
export function restoreSessionSnapshot(
  setState: (patch: Partial<TradingStore>) => void,
  snapshot: SessionSnapshot
): void {
  setState({
    wallet: snapshot.wallet,
    startingWallet: snapshot.startingWallet,
    difficulty: snapshot.difficulty,
    maxLeverage: snapshot.maxLeverage,
    reduceOnly: snapshot.reduceOnly,
    position: snapshot.position,
    closedTrades: snapshot.closedTrades,
    realizedPnL: snapshot.realizedPnL,
    pendingOrders: snapshot.pendingOrders,
    ordersHistory: snapshot.ordersHistory,
    // Clear transient state
    isLoading: false,
    lastActionError: null,
    isLiquidated: false,
    lastCloseReason: null,
  });
}

/** Persists a snapshot to localStorage. */
export function saveSnapshotToStorage(snapshot: SessionSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage may be full or unavailable (private mode)
  }
}

/** Loads a snapshot from localStorage. Returns null if missing or invalid. */
export function loadSnapshotFromStorage(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Removes the saved snapshot from localStorage. */
export function clearStoredSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/** Checks whether a saved snapshot exists in localStorage. */
export function hasStoredSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
