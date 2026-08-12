import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import type { RunRankAward } from "@/lib/session-record-client";
import { useSessionRecordSaver, type SessionRecordSaverArgs } from "./useSessionRecordSaver";

const saveRecordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session-record-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-record-client")>();
  return { ...actual, saveTradingSessionRecord: saveRecordMock };
});

const award: RunRankAward = { rank: 1, totalRuns: 5, reward: 30, diamonds: 30 };

const saverArgs: SessionRecordSaverArgs = {
  isLiquidated: false,
  stats: {
    pnl: 100,
    trades: 3,
    winRate: 66,
    returnPercent: 10,
    bestTrade: 50,
    worstTrade: -20,
    maxDrawdown: 2,
    traderScore: 60,
  },
  startingWallet: 10_000,
  finalWallet: 10_100,
};

describe("useSessionRecordSaver — run rank award staleness", () => {
  beforeEach(() => {
    saveRecordMock.mockReset();
    useTradingStore.setState({ runRankAward: null, diamonds: 0 });
  });

  it("records the award when the response lands within the same run", async () => {
    saveRecordMock.mockResolvedValue(award);
    const { result } = renderHook(() => useSessionRecordSaver(saverArgs));

    await act(async () => {
      result.current.saveSessionRecord("manual");
    });

    expect(useTradingStore.getState().runRankAward).toEqual(award);
  });

  it("drops an award that resolves after resetSessionSaver (new run started)", async () => {
    let resolveSave!: (value: RunRankAward | null) => void;
    saveRecordMock.mockReturnValue(
      new Promise<RunRankAward | null>((resolve) => { resolveSave = resolve; })
    );
    const { result } = renderHook(() => useSessionRecordSaver(saverArgs));

    act(() => {
      result.current.saveSessionRecord("manual");
      // Player starts the next run before the server responds.
      result.current.resetSessionSaver();
    });
    await act(async () => {
      resolveSave(award);
    });

    expect(useTradingStore.getState().runRankAward).toBeNull();
  });

  it("skips saving entirely for a run without trades", () => {
    const { result } = renderHook(() =>
      useSessionRecordSaver({ ...saverArgs, stats: { ...saverArgs.stats, trades: 0 } })
    );
    act(() => {
      result.current.saveSessionRecord("manual");
    });
    expect(saveRecordMock).not.toHaveBeenCalled();
  });
});
