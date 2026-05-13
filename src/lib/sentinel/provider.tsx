"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { VirtualClock } from "./types";
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
};

export function SentinelProvider({
  clock,
  children,
}: SentinelProviderProps): JSX.Element {
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
