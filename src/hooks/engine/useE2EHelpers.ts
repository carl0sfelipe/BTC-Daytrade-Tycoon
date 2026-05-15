import { useEffect } from "react";

export interface EngineControls {
  pause: () => void;
  start: () => void;
  reset: () => void;
}

/**
 * Exposes engine controls on `window.__timewarpEngine` for E2E tests.
 *
 * Only active when `NEXT_PUBLIC_ENABLE_E2E_HELPERS === "true"`.
 */
export function useE2EHelpers(controls: EngineControls): void {
  useEffect(() => {
    const enabled = process.env.NEXT_PUBLIC_ENABLE_E2E_HELPERS === "true";
    if (typeof window !== "undefined" && enabled) {
      (window as Window & { __timewarpEngine?: EngineControls }).__timewarpEngine = controls;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as Window & { __timewarpEngine?: unknown }).__timewarpEngine;
      }
    };
  }, [controls.pause, controls.start, controls.reset]);
}
