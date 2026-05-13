import type { Position } from "@/store/domain-types";

export interface CheckResult {
  triggered: boolean;
  reason?: "liquidation" | "trailing_stop" | "sl" | "tp";
}

/**
 * Pure transition: check if liquidation should trigger.
 */
export function computeLiquidationCheck(
  position: Pick<Position, "side" | "liquidationPrice">,
  effectiveLow: number,
  effectiveHigh: number
): CheckResult {
  const { side, liquidationPrice } = position;
  if (side === "long" && effectiveLow <= liquidationPrice) {
    return { triggered: true, reason: "liquidation" };
  }
  if (side === "short" && effectiveHigh >= liquidationPrice) {
    return { triggered: true, reason: "liquidation" };
  }
  return { triggered: false };
}

/**
 * Pure transition: check if trailing stop should trigger.
 */
export function computeTrailingStopCheck(
  position: Pick<Position, "side" | "trailingStopPercent" | "trailingStopPrice">,
  effectiveLow: number,
  effectiveHigh: number
): CheckResult {
  const { side, trailingStopPercent, trailingStopPrice } = position;
  if (!trailingStopPercent || trailingStopPrice === null) {
    return { triggered: false };
  }
  if (side === "long" && effectiveLow <= trailingStopPrice) {
    return { triggered: true, reason: "trailing_stop" };
  }
  if (side === "short" && effectiveHigh >= trailingStopPrice) {
    return { triggered: true, reason: "trailing_stop" };
  }
  return { triggered: false };
}

/**
 * Pure transition: check if SL or TP should trigger.
 */
export function computeTpSlCheck(
  position: Pick<Position, "side" | "tpPrice" | "slPrice">,
  effectiveLow: number,
  effectiveHigh: number
): { sl: CheckResult; tp: CheckResult } {
  const { side, tpPrice, slPrice } = position;

  const slResult: CheckResult = { triggered: false };
  if (slPrice) {
    if (side === "long" && effectiveLow <= slPrice) {
      slResult.triggered = true;
      slResult.reason = "sl";
    } else if (side === "short" && effectiveHigh >= slPrice) {
      slResult.triggered = true;
      slResult.reason = "sl";
    }
  }

  const tpResult: CheckResult = { triggered: false };
  if (tpPrice) {
    if (side === "long" && effectiveHigh >= tpPrice) {
      tpResult.triggered = true;
      tpResult.reason = "tp";
    } else if (side === "short" && effectiveLow <= tpPrice) {
      tpResult.triggered = true;
      tpResult.reason = "tp";
    }
  }

  return { sl: slResult, tp: tpResult };
}
