import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { DAILY_MISSIONS, buildMissionStatus } from "@/lib/missions/daily-missions";
import type { DailyMissionBoardResult } from "@/lib/missions-client";
import DailyMissionsPanel from "./DailyMissionsPanel";

const fetchBoardMock = vi.hoisted(() => vi.fn());
const claimMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/missions-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/missions-client")>();
  return {
    ...actual,
    fetchDailyMissionBoard: fetchBoardMock,
    claimDailyMissionRequest: claimMock,
  };
});

function boardWithProgress(
  progressById: Record<string, number>,
  claimedIds: string[] = []
): DailyMissionBoardResult {
  return {
    kind: "board",
    day: "2026-08-12",
    missions: DAILY_MISSIONS.map((definition) =>
      buildMissionStatus(
        definition,
        progressById[definition.id] ?? 0,
        claimedIds.includes(definition.id)
      )
    ),
  };
}

describe("DailyMissionsPanel", () => {
  beforeEach(() => {
    fetchBoardMock.mockReset();
    claimMock.mockReset();
    useTradingStore.setState({ diamonds: 0 });
  });

  it("shows the signup CTA for guests (401 board)", async () => {
    fetchBoardMock.mockResolvedValue({ kind: "guest" });
    render(<DailyMissionsPanel />);

    expect(
      await screen.findByText("Missions need an account — create one to earn 💎")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/auth/signup"
    );
  });

  it("shows the error state with a working Retry on a transient failure", async () => {
    fetchBoardMock
      .mockResolvedValueOnce({ kind: "error" })
      .mockResolvedValueOnce(boardWithProgress({}));
    render(<DailyMissionsPanel />);

    expect(await screen.findByText("Couldn't load missions")).toBeInTheDocument();
    expect(screen.queryByText("Missions need an account — create one to earn 💎")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Close the Day")).toBeInTheDocument();
    expect(fetchBoardMock).toHaveBeenCalledTimes(2);
  });

  it("renders the three missions with progress and reward chips", async () => {
    fetchBoardMock.mockResolvedValue(boardWithProgress({ "daily-called-shots": 1 }));
    render(<DailyMissionsPanel />);

    expect(await screen.findByText("Close the Day")).toBeInTheDocument();
    expect(screen.getByText("Sniper")).toBeInTheDocument();
    expect(screen.getByText("In the Green")).toBeInTheDocument();
    expect(screen.getByText("+15 💎")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("disables Claim while a mission is incomplete", async () => {
    fetchBoardMock.mockResolvedValue(boardWithProgress({}));
    render(<DailyMissionsPanel />);

    await screen.findByText("Close the Day");
    for (const button of screen.getAllByRole("button", { name: "Claim" })) {
      expect(button).toBeDisabled();
    }
  });

  it("shows the claimed state instead of a button for claimed missions", async () => {
    fetchBoardMock.mockResolvedValue(boardWithProgress({ "daily-run": 1 }, ["daily-run"]));
    render(<DailyMissionsPanel />);

    expect(await screen.findByText("Claimed ✓")).toBeInTheDocument();
  });

  it("claims a completed mission, marks it claimed and reconciles diamonds", async () => {
    fetchBoardMock.mockResolvedValue(boardWithProgress({ "daily-run": 1 }));
    claimMock.mockResolvedValue({ reward: 10, diamonds: 42 });
    render(<DailyMissionsPanel />);

    // "daily-run" renders first and is the only completed mission.
    const claimButton = (await screen.findAllByRole("button", { name: "Claim" }))[0];
    expect(claimButton).toBeEnabled();
    fireEvent.click(claimButton);

    await waitFor(() => expect(screen.getByText("Claimed ✓")).toBeInTheDocument());
    expect(claimMock).toHaveBeenCalledWith("daily-run");
    expect(useTradingStore.getState().diamonds).toBe(42);
  });

  it("resyncs the board and shows an inline error when the claim fails", async () => {
    fetchBoardMock.mockResolvedValue(boardWithProgress({ "daily-run": 1 }));
    claimMock.mockResolvedValue(null);
    render(<DailyMissionsPanel />);

    const claimButton = (await screen.findAllByRole("button", { name: "Claim" }))[0];
    fireEvent.click(claimButton);

    expect(await screen.findByText("Claim failed — try again")).toBeInTheDocument();
    // Initial load + post-failure resync (state may have changed elsewhere).
    expect(fetchBoardMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Claimed ✓")).not.toBeInTheDocument();
    expect(useTradingStore.getState().diamonds).toBe(0);
  });

  it("shows Claimed after the resync when another device already claimed (409)", async () => {
    fetchBoardMock
      .mockResolvedValueOnce(boardWithProgress({ "daily-run": 1 }))
      .mockResolvedValueOnce(boardWithProgress({ "daily-run": 1 }, ["daily-run"]));
    claimMock.mockResolvedValue(null);
    render(<DailyMissionsPanel />);

    const claimButton = (await screen.findAllByRole("button", { name: "Claim" }))[0];
    fireEvent.click(claimButton);

    // The resynced board says claimed — the claimed state wins over the error.
    expect(await screen.findByText("Claimed ✓")).toBeInTheDocument();
    expect(screen.queryByText("Claim failed — try again")).not.toBeInTheDocument();
  });
});

describe("DailyMissionsPanel pt-BR", () => {
  beforeEach(() => {
    fetchBoardMock.mockReset();
    claimMock.mockReset();
    useTradingStore.setState({ diamonds: 0, gameLocale: "pt-BR" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("shows the signup CTA in Portuguese for guests", async () => {
    fetchBoardMock.mockResolvedValue({ kind: "guest" });
    render(<DailyMissionsPanel />);

    expect(
      await screen.findByText("Missões precisam de uma conta — crie a sua para ganhar 💎")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/auth/signup"
    );
  });
});
