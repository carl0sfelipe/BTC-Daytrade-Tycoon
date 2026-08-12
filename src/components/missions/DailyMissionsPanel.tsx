"use client";

/**
 * Daily missions board for the mobile shell's Missions tab
 * (PRD_ROGUELIKE_PVP.md §6, R1). The server owns progress and claims; this
 * panel only renders the board and reconciles the diamond balance after a
 * claim — same server-mirror contract as useCallServerSync.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTradingStore } from "@/store/tradingStore";
import type { DailyMissionStatus } from "@/lib/missions/daily-missions";
import { claimDailyMissionRequest, fetchDailyMissionBoard } from "@/lib/missions-client";
import { useGameMessages } from "@/hooks/useGameMessages";
import { resolveMissionCopy } from "@/lib/i18n/mission-copy";

type MissionBoardState =
  | { phase: "loading" }
  | { phase: "guest" }
  | { phase: "error" }
  | { phase: "ready"; day: string; missions: DailyMissionStatus[] };

function markMissionClaimed(state: MissionBoardState, missionId: string): MissionBoardState {
  if (state.phase !== "ready") return state;
  return {
    ...state,
    missions: state.missions.map((mission) =>
      mission.id === missionId ? { ...mission, claimed: true } : mission
    ),
  };
}

// Server wins over the local diamond mirror; the locally derived streak is
// untouched (same contract as useCallServerSync's resolve reconciliation).
function reconcileDiamondsFromServer(diamonds: number): void {
  const store = useTradingStore.getState();
  store.reconcileCallStateFromServer(diamonds, store.callStreak);
}

export default function DailyMissionsPanel() {
  const [board, setBoard] = useState<MissionBoardState>({ phase: "loading" });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimErrorId, setClaimErrorId] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    const result = await fetchDailyMissionBoard();
    if (result.kind === "board") {
      setBoard({ phase: "ready", day: result.day, missions: result.missions });
      return;
    }
    setBoard({ phase: result.kind });
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  async function claimMission(missionId: string): Promise<void> {
    setClaimingId(missionId);
    setClaimErrorId(null);
    const payout = await claimDailyMissionRequest(missionId);
    setClaimingId(null);
    if (!payout) {
      // The board may have moved under us (e.g. a 409 from a claim on
      // another device) — resync from the server instead of guessing.
      setClaimErrorId(missionId);
      await loadBoard();
      return;
    }
    setBoard((previous) => markMissionClaimed(previous, missionId));
    reconcileDiamondsFromServer(payout.diamonds);
  }

  if (board.phase === "loading") return <MissionBoardLoadingHint />;
  if (board.phase === "guest") return <GuestMissionsCta />;
  if (board.phase === "error") return <MissionBoardErrorHint onRetry={() => void loadBoard()} />;
  return (
    <div className="space-y-3">
      <MissionBoardHeader />
      {board.missions.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          claiming={claimingId === mission.id}
          claimFailed={claimErrorId === mission.id}
          onClaim={() => void claimMission(mission.id)}
        />
      ))}
    </div>
  );
}

function MissionBoardLoadingHint() {
  const messages = useGameMessages();
  return <p className="text-sm text-crypto-text-muted py-2">{messages.missions.loading}</p>;
}

function MissionBoardErrorHint({ onRetry }: { onRetry: () => void }) {
  const messages = useGameMessages();
  return (
    <div className="space-y-3 py-2 text-center">
      <p className="text-sm text-crypto-text-secondary">{messages.missions.loadError}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-block px-4 py-2 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-sm font-bold text-crypto-text"
      >
        {messages.missions.retry}
      </button>
    </div>
  );
}

function MissionBoardHeader() {
  const messages = useGameMessages();
  return (
    <div className="space-y-1">
      <h3 className="text-base font-bold text-crypto-text">{messages.missions.boardTitle}</h3>
      <p className="text-[10px] text-crypto-text-muted uppercase tracking-wider">
        {messages.missions.boardSubtitle}
      </p>
    </div>
  );
}

function GuestMissionsCta() {
  const messages = useGameMessages();
  return (
    <div className="space-y-3 py-2 text-center">
      <p className="text-sm text-crypto-text-secondary">{messages.missions.guestCta}</p>
      <Link
        href="/auth/signup"
        className="inline-block px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-sm font-bold text-purple-300"
      >
        {messages.missions.createAccount}
      </Link>
    </div>
  );
}

function MissionCard({
  mission,
  claiming,
  claimFailed,
  onClaim,
}: {
  mission: DailyMissionStatus;
  claiming: boolean;
  claimFailed: boolean;
  onClaim: () => void;
}) {
  const messages = useGameMessages();
  const copy = resolveMissionCopy(mission, messages);
  return (
    <div className="p-3 rounded-xl bg-crypto-surface-elevated border border-crypto-border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-crypto-text">{copy.title}</p>
          <p className="text-xs text-crypto-text-secondary">{copy.description}</p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] font-bold font-mono text-purple-300">
          +{mission.reward} 💎
        </span>
      </div>
      <MissionProgressBar progress={mission.progress} target={mission.target} />
      <MissionClaimAction
        mission={mission}
        claiming={claiming}
        claimFailed={claimFailed}
        onClaim={onClaim}
      />
    </div>
  );
}

function MissionProgressBar({ progress, target }: { progress: number; target: number }) {
  const percent = Math.round((progress / target) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-crypto-surface overflow-hidden">
        <div className="h-full rounded-full bg-purple-400" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[10px] font-mono text-crypto-text-muted">
        {progress}/{target}
      </span>
    </div>
  );
}

function MissionClaimAction({
  mission,
  claiming,
  claimFailed,
  onClaim,
}: {
  mission: DailyMissionStatus;
  claiming: boolean;
  claimFailed: boolean;
  onClaim: () => void;
}) {
  const messages = useGameMessages();
  if (mission.claimed) {
    return <p className="text-xs font-semibold text-crypto-long text-center py-1">{messages.missions.claimed}</p>;
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClaim}
        disabled={!mission.completed || claiming}
        className="w-full py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {claiming ? messages.missions.claiming : messages.missions.claim}
      </button>
      {claimFailed && (
        <p className="text-[10px] font-semibold text-crypto-short text-center">
          {messages.missions.claimFailed}
        </p>
      )}
    </div>
  );
}
