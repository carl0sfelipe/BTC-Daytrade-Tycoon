"use client";

import { useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "./position-panel/EmptyState";
import { PnLDisplay } from "./position-panel/PnLDisplay";
import { PositionDetails } from "./position-panel/PositionDetails";
import { TrailingStopIndicator } from "./position-panel/TrailingStopIndicator";
import { ActiveTpSl } from "./position-panel/ActiveTpSl";
import { PendingOrdersList } from "./position-panel/PendingOrdersList";
import { TpSlEditor } from "./position-panel/TpSlEditor";
import { LiquidationPrice } from "./position-panel/LiquidationPrice";
import { RiskGauge } from "./position-panel/RiskGauge";
import { CloseButton } from "./position-panel/CloseButton";

export default function PositionPanel() {
  const position = useTradingStore((s) => s.position);
  const currentPrice = useTradingStore((s) => s.currentPrice);
  const closePosition = useTradingStore((s) => s.closePosition);
  const lastCloseReason = useTradingStore((s) => s.lastCloseReason);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const setPositionTpSl = useTradingStore((s) => s.setPositionTpSl);
  const cancelPendingOrder = useTradingStore((s) => s.cancelPendingOrder);
  const lastActionError = useTradingStore((s) => s.lastActionError);
  const clearLastActionError = useTradingStore((s) => s.clearLastActionError);
  const { toast } = useToast();

  useEffect(() => {
    if (lastActionError) {
      toast({ title: "⚠️ Invalid Order", description: lastActionError, variant: "destructive" });
      clearLastActionError();
    }
  }, [lastActionError, toast, clearLastActionError]);

  if (!position) {
    return <EmptyState lastCloseReason={lastCloseReason} />;
  }

  const { side, entry, size, leverage, tpPrice, slPrice, liquidationPrice, trailingStopPercent, trailingStopPrice, realizedPnL } = position;

  const safeEntry = entry || 1;
  const safeLeverage = leverage || 1;
  const safeCurrentPrice = currentPrice || 1;

  const priceDiff = side === "long" ? safeCurrentPrice - safeEntry : safeEntry - safeCurrentPrice;
  const pnl = (priceDiff / safeEntry) * size;
  const pnlPercent = (priceDiff / safeEntry) * safeLeverage * 100;
  const margin = size / safeLeverage;

  const distanceToLiq = Math.max(0, Math.min(100, Math.abs((safeCurrentPrice - liquidationPrice) / safeCurrentPrice) * 100));
  const maxDistance = 100 / safeLeverage;
  const barPercent = Math.max(0, Math.min(100, 100 - (distanceToLiq / maxDistance) * 100));

  const isLong = side === "long";
  const isCritical = barPercent < 15;
  const isDanger = barPercent < 40;

  const tpPending = pendingOrders.filter((o) => o.side === side && o.orderType === "take_profit");
  const slPending = pendingOrders.filter((o) => o.side === side && o.orderType === "stop_loss");

  return (
    <div className={`card-surface overflow-hidden ${isCritical ? "animate-pulse-glow border-crypto-short/50" : ""}`}>
      <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Your Position</h3>
        <SideBadge isLong={isLong} />
      </div>

      <div className="p-4 space-y-4">
        <PnLDisplay pnl={pnl} pnlPercent={pnlPercent} realizedPnL={realizedPnL} />
        <PositionDetails entry={entry} size={size} leverage={leverage} margin={margin} />

        {trailingStopPercent != null && trailingStopPrice != null && (
          <TrailingStopIndicator percent={trailingStopPercent} price={trailingStopPrice} />
        )}

        <ActiveTpSl tpPrice={tpPrice} slPrice={slPrice} />

        <PendingOrdersList
          tpOrders={tpPending}
          slOrders={slPending}
          onCancelTp={cancelPendingOrder}
          onCancelSl={cancelPendingOrder}
        />

        <TpSlEditor isLong={isLong} currentPrice={currentPrice} onApply={setPositionTpSl} />
        <LiquidationPrice price={liquidationPrice} />
        <RiskGauge barPercent={barPercent} distanceToLiq={distanceToLiq} isCritical={isCritical} isDanger={isDanger} />
        <CloseButton onClose={() => closePosition("manual")} />
      </div>
    </div>
  );
}

function SideBadge({ isLong }: { isLong: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${isLong ? "bg-crypto-long-dim" : "bg-crypto-short-dim"}`}>
      {isLong ? (
        <TrendingUp className="w-3.5 h-3.5 text-crypto-long" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5 text-crypto-short" />
      )}
      <span className={`text-xs font-bold uppercase ${isLong ? "text-crypto-long" : "text-crypto-short"}`}>
        {isLong ? "LONG" : "SHORT"}
      </span>
    </div>
  );
}
