"use client";

import { useEffect } from "react";

interface KeyboardShortcutCallbacks {
  onLong?: () => void;
  onShort?: () => void;
  onClose?: () => void;
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  const { onLong, onShort, onClose } = callbacks;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.key.toLowerCase()) {
        case "l":
          onLong?.();
          break;
        case "s":
          onShort?.();
          break;
        case "x":
          onClose?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onLong, onShort, onClose]);
}
