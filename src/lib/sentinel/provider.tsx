"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { VirtualClock, SentinelEvent } from "./types";
import { createEventLog } from "./log";
import type { EventLog } from "./log";

export type SentinelContextValue = {
  readonly clock: VirtualClock;
  readonly eventLog: EventLog;
};

const SentinelContext = createContext<SentinelContextValue | null>(null);

export type SentinelProviderProps = {
  readonly clock: VirtualClock;
  readonly children: ReactNode;
  readonly onEventFlush?: (events: ReadonlyArray<SentinelEvent>) => void;
};

export function SentinelProvider({
  clock,
  children,
  onEventFlush,
}: SentinelProviderProps): JSX.Element {
  // Use a ref so the eventLog is never recreated when the callback changes.
  const onFlushRef = useRef(onEventFlush);
  onFlushRef.current = onEventFlush;

  const value = useMemo(() => {
    const eventLog = createEventLog({
      maxSize: 1000,
      flushIntervalMs: 50,
      onFlush: (events) => {
        if (
          typeof process !== "undefined" &&
          process.env?.NODE_ENV === "development"
        ) {
          // eslint-disable-next-line no-console
          console.log("[Sentinel] flushed", events.length, "events");
        }
        onFlushRef.current?.(events);
      },
    });

    eventLog.startAutoFlush();

    return { clock, eventLog };
  }, [clock]);

  return (
    <SentinelContext.Provider value={value}>
      {children}
    </SentinelContext.Provider>
  );
}

export function useSentinelContext(): SentinelContextValue {
  const ctx = useContext(SentinelContext);

  if (ctx === null) {
    throw new Error(
      "useSentinelContext must be used inside a <SentinelProvider>",
    );
  }

  return ctx;
}
