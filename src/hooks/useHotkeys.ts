"use client";
import { useEffect, useRef } from "react";

export interface HotkeyHandlers {
  onPlayPause?: () => void;
  onClose?: () => void;
  onBuy?: () => void;
  onSell?: () => void;
}

export function useHotkeys(handlers: HotkeyHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          handlersRef.current.onPlayPause?.();
          break;
        case "KeyB":
          if (!e.ctrlKey && !e.metaKey && !e.altKey)
            handlersRef.current.onBuy?.();
          break;
        case "KeyS":
          if (!e.ctrlKey && !e.metaKey && !e.altKey)
            handlersRef.current.onSell?.();
          break;
        case "KeyC":
          if (!e.ctrlKey && !e.metaKey && !e.altKey)
            handlersRef.current.onClose?.();
          break;
        case "Escape":
          handlersRef.current.onClose?.();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
