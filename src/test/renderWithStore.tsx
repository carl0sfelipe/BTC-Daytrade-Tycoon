import React, { act } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import { makePosition } from "./factories";
import { resetStore } from "./resetStore";
import type { Position } from "@/store/tradingStore";
import { SentinelProvider } from "@/lib/sentinel/provider";
import { createFrozenClock } from "@/lib/sentinel/clock";

type TradingState = Parameters<typeof useTradingStore.setState>[0];

interface RenderWithStoreOpts {
  store?: Partial<TradingState>;
  position?: Partial<Position>;
}

interface RenderWithStoreResult extends RenderResult {
  updateStore: (patch: Partial<TradingState>) => void;
}

export function renderWithStore(
  ui: React.ReactElement,
  opts: RenderWithStoreOpts = {}
): RenderWithStoreResult {
  resetStore();

  if (opts.position !== undefined) {
    useTradingStore.setState({ position: makePosition(opts.position) });
  }
  if (opts.store) {
    useTradingStore.setState(opts.store);
  }

  const result = render(
    <SentinelProvider clock={createFrozenClock()}>{ui}</SentinelProvider>
  );

  const updateStore = (patch: Partial<TradingState>) => {
    act(() => {
      useTradingStore.setState(patch);
    });
  };

  return { ...result, updateStore };
}
