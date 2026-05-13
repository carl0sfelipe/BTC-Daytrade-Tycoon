"use client";

import { useState, useEffect } from "react";
import { Save, FolderOpen, Trash2, Download } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import {
  captureSessionSnapshot,
  restoreSessionSnapshot,
  saveSnapshotToStorage,
  loadSnapshotFromStorage,
  clearStoredSnapshot,
  hasStoredSnapshot,
} from "@/lib/engine/session-replay";
import { useSentinelContext, exportSentinelSession, downloadSession } from "@/lib/sentinel";

interface SessionReplayControlsProps {
  onLoad?: () => void;
}

export default function SessionReplayControls({ onLoad }: SessionReplayControlsProps) {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_REPLAY === "true";
  const isSentinelEnabled = process.env.NEXT_PUBLIC_ENABLE_E2E_HELPERS === "true";
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { eventLog, clock } = useSentinelContext();

  useEffect(() => {
    setHasSnapshot(hasStoredSnapshot());
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSave = () => {
    const store = useTradingStore.getState();
    const snapshot = captureSessionSnapshot(store);
    saveSnapshotToStorage(snapshot);
    setHasSnapshot(true);
    showToast("Session saved 💾");
  };

  const handleLoad = () => {
    const snapshot = loadSnapshotFromStorage();
    if (!snapshot) {
      showToast("No saved session found");
      return;
    }
    restoreSessionSnapshot(useTradingStore.setState, snapshot);
    setHasSnapshot(true);
    showToast("Session loaded 📂");
    onLoad?.();
  };

  const handleClear = () => {
    clearStoredSnapshot();
    setHasSnapshot(false);
    showToast("Snapshot deleted 🗑️");
  };

  const handleExportSentinel = () => {
    eventLog.flush();
    // Access internal buffer for export — in real app this would be via API
    const pending = eventLog.getPendingCount();
    const session = exportSentinelSession([], clock);
    downloadSession(session, `sentinel-session-${Date.now()}.json`);
    showToast(`Session exported 📥 (${pending} pending events)`);
  };

  if (!isEnabled && !isSentinelEnabled) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSave}
        data-testid="session-replay-save"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted transition-all text-xs font-semibold"
      >
        <Save className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        type="button"
        onClick={handleLoad}
        data-testid="session-replay-load"
        disabled={!hasSnapshot}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          hasSnapshot
            ? "bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:text-crypto-text hover:border-crypto-text-muted"
            : "bg-crypto-surface-elevated border-crypto-border text-crypto-text-muted cursor-not-allowed"
        }`}
      >
        <FolderOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Load</span>
      </button>

      {hasSnapshot && (
        <button
          type="button"
          onClick={handleClear}
          data-testid="session-replay-clear"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crypto-short-dim border border-crypto-short/20 text-crypto-short hover:bg-crypto-short/20 transition-all text-xs font-semibold"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {isSentinelEnabled && (
        <button
          type="button"
          onClick={handleExportSentinel}
          data-testid="sentinel-export-session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crypto-accent-dim border border-crypto-accent/30 text-crypto-accent hover:bg-crypto-accent/20 transition-all text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      )}

      {toast && (
        <span className="absolute bottom-full mb-2 right-0 px-2 py-1 rounded bg-crypto-accent text-white text-[10px] font-bold whitespace-nowrap">
          {toast}
        </span>
      )}
    </div>
  );
}
