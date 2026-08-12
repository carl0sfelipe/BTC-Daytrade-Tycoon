"use client";

import { useEffect, useState } from "react";

/**
 * True only after the component mounted on the client. The server (and the
 * hydration render) always sees false, so values that only exist client-side
 * — e.g. localStorage-rehydrated store state — can be deferred until after
 * mount without producing a hydration mismatch.
 *
 * @example const mounted = useMounted(); // false during SSR/hydration, then true
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
