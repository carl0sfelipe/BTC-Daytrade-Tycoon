import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  captureSessionSnapshot,
  restoreSessionSnapshot,
  saveSnapshotToStorage,
  loadSnapshotFromStorage,
  clearStoredSnapshot,
  hasStoredSnapshot,
} from "./session-replay";
import type { TradingStore } from "@/store/types";

const makeMockStore = (overrides: Partial<TradingStore> = {}): TradingStore =>
  ({
    wallet: 9500,
    startingWallet: 10000,
    difficulty: "normal",
    maxLeverage: 50,
    reduceOnly: true,
    position: null,
    closedTrades: [],
    realizedPnL: 0,
    pendingOrders: [],
    ordersHistory: [],
    isLoading: false,
    lastActionError: null,
    isLiquidated: false,
    lastCloseReason: null,
    ...overrides,
  }) as TradingStore;

describe("captureSessionSnapshot", () => {
  it("captures essential trading state", () => {
    const store = makeMockStore({ wallet: 12345 });
    const snap = captureSessionSnapshot(store);

    expect(snap.version).toBe(1);
    expect(snap.wallet).toBe(12345);
    expect(snap.timestamp).toBeGreaterThan(0);
  });

  it("excludes transient UI state", () => {
    const store = makeMockStore({ isLoading: true, isLiquidated: true });
    const snap = captureSessionSnapshot(store);

    expect((snap as unknown as Record<string, unknown>).isLoading).toBeUndefined();
    expect((snap as unknown as Record<string, unknown>).isLiquidated).toBeUndefined();
  });
});

describe("restoreSessionSnapshot", () => {
  it("hydrates store and clears transient state", () => {
    const setState = vi.fn();
    const snap = captureSessionSnapshot(makeMockStore({ wallet: 8000 }));

    restoreSessionSnapshot(setState, snap);

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: 8000,
        isLoading: false,
        isLiquidated: false,
        lastActionError: null,
        lastCloseReason: null,
      })
    );
  });
});

describe("localStorage round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads snapshot", () => {
    const snap = captureSessionSnapshot(makeMockStore());
    saveSnapshotToStorage(snap);

    expect(hasStoredSnapshot()).toBe(true);

    const loaded = loadSnapshotFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.wallet).toBe(snap.wallet);
    expect(loaded!.version).toBe(1);
  });

  it("returns null when no snapshot exists", () => {
    expect(loadSnapshotFromStorage()).toBeNull();
    expect(hasStoredSnapshot()).toBe(false);
  });

  it("clears stored snapshot", () => {
    saveSnapshotToStorage(captureSessionSnapshot(makeMockStore()));
    clearStoredSnapshot();
    expect(hasStoredSnapshot()).toBe(false);
  });
});
