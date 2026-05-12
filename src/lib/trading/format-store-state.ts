import type { TradingStore } from "@/store/types";

/**
 * Formats the trading store state for debug console logging.
 *
 * @example
 * console.log("[openPosition]", formatStoreState(get()));
 */
export function formatStoreState(
  state: Pick<TradingStore, "currentPrice" | "wallet" | "position" | "realizedPnL" | "pendingOrders" | "reduceOnly">
) {
  const { currentPrice, wallet, position, realizedPnL, pendingOrders, reduceOnly } = state;
  const unrealizedPnL = position
    ? ((position.side === "long" ? currentPrice - position.entry : position.entry - currentPrice) / position.entry) *
      position.size
    : 0;
  return {
    price: currentPrice?.toFixed(2) ?? "N/A",
    wallet: wallet?.toFixed(2) ?? "N/A",
    position: position
      ? {
          side: position.side,
          entry: position.entry.toFixed(2),
          size: position.size.toFixed(2),
          leverage: position.leverage + "x",
          liqPrice: position.liquidationPrice.toFixed(2),
          unrealizedPnL: unrealizedPnL.toFixed(2),
          realizedPnL: (position.realizedPnL || 0).toFixed(2),
        }
      : null,
    sessionRealizedPnL: (realizedPnL || 0).toFixed(2),
    pendingOrders: pendingOrders?.length ?? 0,
    reduceOnly,
  };
}
