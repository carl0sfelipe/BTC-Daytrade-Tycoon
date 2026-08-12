"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Backpack, ListChecks, BarChart3, Trophy, ShoppingBag, X } from "lucide-react";
import DailyMissionsPanel from "@/components/missions/DailyMissionsPanel";

/**
 * Mobile game shell bottom nav (PRD_ROGUELIKE_PVP.md — mobile-first shell,
 * party 2026-08-12, Sally). Trade and Ranking are live; Missions opens the
 * daily missions board (R1); Inventory and Shop land in later R1.x slices
 * and open an honest "coming soon" sheet.
 */

type GameNavSheetTab = "inventory" | "missions" | "shop";
type ComingSoonTab = Exclude<GameNavSheetTab, "missions">;

const SHEET_EMOJI: Record<GameNavSheetTab, string> = {
  inventory: "🎒",
  missions: "📋",
  shop: "🛒",
};

const COMING_SOON_COPY: Record<ComingSoonTab, { title: string; body: string }> = {
  inventory: {
    title: "Inventory",
    body: "Sabotages and consumables you own will live here. Earn diamonds with called shots — spending them arrives in a future update.",
  },
  shop: {
    title: "Shop",
    body: "The sabotage shop (fake spikes, liquidity drains…) unlocks with PvP. Stack diamonds now, spend them on rivals later.",
  },
};

export default function MobileGameNav() {
  const [openSheet, setOpenSheet] = useState<GameNavSheetTab | null>(null);

  return (
    <>
      <div className="card-surface border border-crypto-border p-1.5 flex items-center justify-around">
        <SheetTabButton icon={Backpack} label="Inventory" onClick={() => setOpenSheet("inventory")} />
        <SheetTabButton icon={ListChecks} label="Missions" onClick={() => setOpenSheet("missions")} />

        {/* Active tab — trading is the center of the shell */}
        <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated">
          <BarChart3 className="w-4 h-4 text-crypto-accent" />
          <span className="text-[9px] text-crypto-text-secondary font-medium">Trade</span>
        </div>

        <Link
          href="/leaderboard"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-crypto-surface-elevated"
        >
          <Trophy className="w-4 h-4 text-crypto-text-muted" />
          <span className="text-[9px] text-crypto-text-muted font-medium">Ranking</span>
        </Link>

        <SheetTabButton icon={ShoppingBag} label="Shop" onClick={() => setOpenSheet("shop")} />
      </div>

      <AnimatePresence>
        {openSheet && (
          <GameNavSheet emoji={SHEET_EMOJI[openSheet]} onClose={() => setOpenSheet(null)}>
            {openSheet === "missions" ? (
              <DailyMissionsPanel />
            ) : (
              <ComingSoonCopy tab={openSheet} />
            )}
          </GameNavSheet>
        )}
      </AnimatePresence>
    </>
  );
}

function SheetTabButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Backpack;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-crypto-surface-elevated"
    >
      <Icon className="w-4 h-4 text-crypto-text-muted" />
      <span className="text-[9px] text-crypto-text-muted font-medium">{label}</span>
    </button>
  );
}

/** Shared bottom-sheet shell: backdrop, slide-up panel, emoji + close row. */
function GameNavSheet({
  emoji,
  onClose,
  children,
}: {
  emoji: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-crypto-surface rounded-t-2xl z-50 border-t border-crypto-border shadow-2xl"
      >
        <div className="p-5 pb-8 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="flex items-start justify-between">
            <span className="text-3xl">{emoji}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-crypto-text-muted hover:text-crypto-text hover:bg-crypto-surface-elevated"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </div>
      </motion.div>
    </>
  );
}

function ComingSoonCopy({ tab }: { tab: ComingSoonTab }) {
  const copy = COMING_SOON_COPY[tab];

  return (
    <>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-crypto-text">{copy.title}</h3>
        <span className="inline-block px-2 py-0.5 rounded-full bg-crypto-accent-dim text-[10px] font-bold text-crypto-accent uppercase tracking-wider">
          Coming soon
        </span>
      </div>
      <p className="text-sm text-crypto-text-secondary leading-relaxed">{copy.body}</p>
    </>
  );
}
