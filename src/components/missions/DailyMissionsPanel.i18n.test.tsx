import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { DAILY_MISSIONS, buildMissionStatus } from "@/lib/missions/daily-missions";
import type { DailyMissionBoardResult } from "@/lib/missions-client";
import DailyMissionsPanel from "./DailyMissionsPanel";

const fetchBoardMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/missions-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/missions-client")>();
  return {
    ...actual,
    fetchDailyMissionBoard: fetchBoardMock,
    claimDailyMissionRequest: vi.fn(),
  };
});

// A mission id the catalogs do not know — simulates the server shipping a new
// mission before the client learns its translation.
const unknownMission = buildMissionStatus(
  {
    id: "daily-mystery",
    title: "Mystery Mission",
    description: "Do the mysterious thing today",
    target: 1,
    reward: 5,
  },
  0,
  false
);

function boardWithUnknownMission(): DailyMissionBoardResult {
  return {
    kind: "board",
    day: "2026-08-12",
    missions: [
      ...DAILY_MISSIONS.map((definition) => buildMissionStatus(definition, 0, false)),
      unknownMission,
    ],
  };
}

describe("DailyMissionsPanel mission definitions i18n", () => {
  beforeEach(() => {
    fetchBoardMock.mockReset();
    useTradingStore.setState({ diamonds: 0, gameLocale: "pt-BR" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("shows translated titles and descriptions for known mission ids", async () => {
    fetchBoardMock.mockResolvedValue(boardWithUnknownMission());
    render(<DailyMissionsPanel />);

    expect(await screen.findByText("Feche o Dia")).toBeInTheDocument();
    expect(screen.getByText("No Verde")).toBeInTheDocument();
    expect(screen.getByText("Acerte 2 called shots hoje")).toBeInTheDocument();
  });

  it("falls back to the server copy for an unknown mission id", async () => {
    fetchBoardMock.mockResolvedValue(boardWithUnknownMission());
    render(<DailyMissionsPanel />);

    expect(await screen.findByText("Mystery Mission")).toBeInTheDocument();
    expect(screen.getByText("Do the mysterious thing today")).toBeInTheDocument();
  });
});
