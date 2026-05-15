"use client";

import { useCallback } from "react";
import { useTradingStore } from "@/store/tradingStore";
import { useSentinelContext, diffState } from "@/lib/sentinel";
import type { SentinelEvent } from "@/lib/sentinel";

interface PositionSnapshot {
  side: "long" | "short" | null;
  entry: number | null;
  size: number | null;
  leverage: number | null;
  liquidationPrice: number | null;
  tpPrice: number | null;
  slPrice: number | null;
  unrealizedPnL: number | null;
  distToLiq: number | null;
  distToLiqPercent: number | null;
}

function buildBlockedEvent(
  semanticId: string,
  role: string,
  state: ReturnType<typeof useTradingStore.getState>,
  clock: { now(): number }
): Omit<SentinelEvent, "id" | "sequenceId"> {
  return {
    timestamp: clock.now(),
    type: "UI_ACTION",
    semanticId,
    role,
    payload: {
      action: { type: "blocked_click", reason: "disabled" },
      position: buildPositionSnapshot(state),
      wallet: state.wallet,
      sessionRealizedPnL: state.realizedPnL,
      pendingOrders: state.pendingOrders.length,
      reduceOnly: state.reduceOnly,
    },
    engineSnapshot: { changedPaths: [], isCheckpoint: false },
    marketContext: {
      price: state.currentPrice,
      indexPrice: state.currentPrice,
      timestamp: clock.now(),
    },
    accessibilityRef: "",
  };
}

function buildPositionSnapshot(state: ReturnType<typeof useTradingStore.getState>): PositionSnapshot {
  const { position, currentPrice } = state;
  if (!position) {
    return {
      side: null,
      entry: null,
      size: null,
      leverage: null,
      liquidationPrice: null,
      tpPrice: null,
      slPrice: null,
      unrealizedPnL: null,
      distToLiq: null,
      distToLiqPercent: null,
    };
  }

  const priceDiff = position.side === "long"
    ? currentPrice - position.entry
    : position.entry - currentPrice;
  const unrealizedPnL = (priceDiff / position.entry) * position.size;
  const distToLiq = position.side === "long"
    ? currentPrice - position.liquidationPrice
    : position.liquidationPrice - currentPrice;
  const distToLiqPercent = position.side === "long"
    ? ((currentPrice - position.liquidationPrice) / currentPrice) * 100
    : ((position.liquidationPrice - currentPrice) / currentPrice) * 100;

  return {
    side: position.side,
    entry: position.entry,
    size: position.size,
    leverage: position.leverage,
    liquidationPrice: position.liquidationPrice,
    tpPrice: position.tpPrice,
    slPrice: position.slPrice,
    unrealizedPnL,
    distToLiq,
    distToLiqPercent,
  };
}

/**
 * Records a trading interaction with full market context, state delta,
 * and a complete position snapshot.
 */
export function useTradeSentinel(semanticId: string, role: string) {
  const { clock, eventLog } = useSentinelContext();

  return useCallback(
    (action: () => void, payload: unknown) => {
      const before = { ...useTradingStore.getState() } as unknown as Record<string, unknown>;

      action();

      const after = { ...useTradingStore.getState() } as unknown as Record<string, unknown>;
      const delta = diffState(before, after);

      const state = useTradingStore.getState();

      eventLog.append({
        timestamp: clock.now(),
        type: "UI_ACTION",
        semanticId,
        role,
        payload: {
          action: payload,
          position: buildPositionSnapshot(state),
          wallet: state.wallet,
          sessionRealizedPnL: state.realizedPnL,
          pendingOrders: state.pendingOrders.length,
          reduceOnly: state.reduceOnly,
        },
        engineSnapshot: delta,
        marketContext: {
          price: state.currentPrice,
          indexPrice: state.currentPrice,
          timestamp: clock.now(),
        },
        accessibilityRef: "",
      });
    },
    [clock, eventLog, semanticId, role],
  );
}

/**
 * Captures clicks on disabled buttons via pointerdown (which fires on
 * disabled elements, unlike click). This ensures every user interaction
 * is recorded in Sentinel, even when the UI blocks it.
 *
 * Usage: spread the returned handler as onPointerDown on the button.
 * It only records when the element is actually disabled, avoiding
 * duplication with the normal onClick handler.
 */
export function useTradeSentinelBlocked(semanticId: string, role: string) {
  const { clock, eventLog } = useSentinelContext();

  return useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget as HTMLButtonElement | HTMLInputElement;
      if (!el.disabled) return; // enabled → let onClick record normally

      const state = useTradingStore.getState();
      eventLog.append(buildBlockedEvent(semanticId, role, state, clock));
    },
    [clock, eventLog, semanticId, role],
  );
}
