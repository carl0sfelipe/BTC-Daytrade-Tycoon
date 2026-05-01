"use client";

import { useEffect } from "react";

interface KeyboardShortcutCallbacks {
  onLong?: () => void;
  onShort?: () => void;
  onClose?: () => void;
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver em um input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.key.toLowerCase()) {
        case "l":
          callbacks.onLong?.();
          break;
        case "s":
          callbacks.onShort?.();
          break;
        case "x":
          callbacks.onClose?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callbacks]);
}
