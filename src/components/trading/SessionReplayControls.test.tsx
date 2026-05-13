import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithStore } from "@/test/renderWithStore";
import SessionReplayControls from "./SessionReplayControls";
import { saveSnapshotToStorage, clearStoredSnapshot } from "@/lib/engine/session-replay";
import { captureSessionSnapshot } from "@/lib/engine/session-replay";

describe("SessionReplayControls", () => {
  beforeEach(() => {
    clearStoredSnapshot();
    vi.unstubAllEnvs();
  });

  it("renders nothing when feature flag is off", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REPLAY", "false");
    renderWithStore(<SessionReplayControls />);
    expect(screen.queryByTestId("session-replay-save")).not.toBeInTheDocument();
  });

  it("renders save/load buttons when feature flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REPLAY", "true");
    renderWithStore(<SessionReplayControls />);
    expect(screen.getByTestId("session-replay-save")).toBeInTheDocument();
    expect(screen.getByTestId("session-replay-load")).toBeInTheDocument();
  });

  it("disables load when no snapshot exists", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REPLAY", "true");
    renderWithStore(<SessionReplayControls />);
    expect(screen.getByTestId("session-replay-load")).toBeDisabled();
  });

  it("enables load after saving a snapshot", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REPLAY", "true");
    renderWithStore(<SessionReplayControls />);

    act(() => {
      fireEvent.click(screen.getByTestId("session-replay-save"));
    });

    expect(screen.getByTestId("session-replay-load")).not.toBeDisabled();
  });

  it("calls onLoad callback when loading", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REPLAY", "true");
    const onLoad = vi.fn();

    // Pre-populate localStorage
    const snap = captureSessionSnapshot({
      wallet: 5000,
      startingWallet: 10000,
      difficulty: "normal",
      maxLeverage: 50,
      reduceOnly: true,
      position: null,
      closedTrades: [],
      realizedPnL: 0,
      pendingOrders: [],
      ordersHistory: [],
    } as unknown as Parameters<typeof captureSessionSnapshot>[0]);
    saveSnapshotToStorage(snap);

    renderWithStore(<SessionReplayControls onLoad={onLoad} />);

    act(() => {
      fireEvent.click(screen.getByTestId("session-replay-load"));
    });

    expect(onLoad).toHaveBeenCalled();
  });
});
