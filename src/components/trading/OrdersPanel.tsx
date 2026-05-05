"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, Filter, Target, Shield } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

type OrderFilter = "all" | "pending" | "filled" | "canceled";

export default function OrdersPanel() {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const ordersHistory = useTradingStore((s) => s.ordersHistory);
  const cancelPendingOrder = useTradingStore((s) => s.cancelPendingOrder);
  const currentPrice = useTradingStore((s) => s.currentPrice);

  const filtered = ordersHistory.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const filters: { key: OrderFilter; label: string }[] = [
    { key: "all", label: `All (${ordersHistory.length})` },
    { key: "pending", label: `Pending (${pendingOrders.length})` },
    { key: "filled", label: `Filled (${ordersHistory.filter((o) => o.status === "filled").length})` },
    { key: "canceled", label: `Canceled (${ordersHistory.filter((o) => o.status === "canceled").length})` },
  ];

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">Orders</h3>
        <Filter className="w-3.5 h-3.5 text-crypto-text-muted" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            type="button"
            key={f.key}
            data-testid={`orders-panel-filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
              filter === f.key
                ? "bg-crypto-accent text-white"
                : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-3 pb-3 space-y-1.5 max-h-[300px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div data-testid="orders-panel-empty" className="flex items-center justify-center py-6">
            <p className="text-xs text-crypto-text-muted">No orders</p>
          </div>
        ) : (
          filtered.map((order) => {
            const isPending = order.status === "pending";
            const isFilled = order.status === "filled";
            const isTp = order.type === "tp";
            const isSl = order.type === "sl";
            const isTpSl = isTp || isSl;
            const isMarket = order.type === "market";
            const isLimit = order.type === "limit";

            const rowBg = isPending
              ? isTp ? "bg-crypto-long-dim/20 border-crypto-long/20"
              : isSl ? "bg-crypto-short-dim/20 border-crypto-short/20"
              : "bg-crypto-surface-elevated border-crypto-border"
              : isFilled
              ? "bg-crypto-long-dim/30 border-crypto-long/20"
              : "bg-crypto-short-dim/30 border-crypto-short/20";

            const Icon = isTp
              ? Target
              : isSl
              ? Shield
              : isPending
              ? Clock
              : isFilled
              ? CheckCircle2
              : XCircle;

            const iconColor = isTp
              ? "text-crypto-long"
              : isSl
              ? "text-crypto-short"
              : isPending
              ? "text-crypto-accent"
              : isFilled
              ? "text-crypto-long"
              : "text-crypto-short";

            const iconBg = isTp
              ? "bg-crypto-long/20"
              : isSl
              ? "bg-crypto-short/20"
              : isPending
              ? "bg-crypto-accent-dim"
              : isFilled
              ? "bg-crypto-long/20"
              : "bg-crypto-short/20";

            const isExpanded = expandedId === order.id;

            return (
              <div
                key={order.id}
                className={`rounded-lg border ${rowBg} ${isTpSl ? "cursor-pointer" : ""}`}
                onClick={isTpSl ? () => setExpandedId(isExpanded ? null : order.id) : undefined}
              >
              <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className={`w-3 h-3 ${iconColor}`} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    {/* Title row */}
                    {isTpSl ? (
                      /* TP/SL: type is the headline, side is secondary */
                      <span className="text-xs font-bold">
                        <span className={isTp ? "text-crypto-long" : "text-crypto-short"}>
                          {isTp ? "Take Profit" : "Stop Loss"}
                        </span>
                        {" "}
                        <span className="text-crypto-text-muted font-normal text-[9px] uppercase">
                          {order.side}
                        </span>
                        {" "}
                        <span className="text-crypto-accent">{order.leverage}x</span>
                      </span>
                    ) : (
                      /* Market/Limit: side is the headline */
                      <span className="text-xs font-bold">
                        <span className={`uppercase ${order.side === "long" ? "text-crypto-long" : "text-crypto-short"}`}>
                          {order.side}
                        </span>
                        {" "}
                        <span className="text-crypto-text-secondary capitalize">
                          {isMarket ? "Market" : "Limit"}
                        </span>
                        {" "}
                        <span className="text-crypto-accent">{order.leverage}x</span>
                      </span>
                    )}

                    {/* Detail row */}
                    <span className="text-[10px] font-mono text-crypto-text-muted">
                      ${order.size.toLocaleString()}
                      {isTpSl ? (
                        <>
                          {" "}trigger{" "}
                          <span className={`font-semibold ${isTp ? "text-crypto-long" : "text-crypto-short"}`}>
                            ${order.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </>
                      ) : isLimit ? (
                        <>
                          {" "}trigger{" "}
                          <span className="font-semibold text-crypto-accent">
                            ${order.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </>
                      ) : (
                        <>
                          {" "}@{" "}
                          <span className="text-crypto-text">
                            ${order.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </>
                      )}
                      {(isMarket || isLimit) && order.tpPrice ? ` · TP $${order.tpPrice.toFixed(0)}` : ""}
                      {(isMarket || isLimit) && order.slPrice ? ` · SL $${order.slPrice.toFixed(0)}` : ""}
                    </span>

                    {isPending && (
                      <span className="text-[9px] font-mono text-crypto-text-muted">
                        now ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        {isTpSl && (
                          <span className={
                            isTp
                              ? (order.side === "long" ? currentPrice >= order.price : currentPrice <= order.price) ? " text-crypto-long font-semibold" : ""
                              : (order.side === "long" ? currentPrice <= order.price : currentPrice >= order.price) ? " text-crypto-short font-semibold" : ""
                          }>
                            {" "}· {Math.abs(currentPrice - order.price).toFixed(0)} away
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isPending
                      ? "bg-crypto-accent-dim text-crypto-accent"
                      : isFilled
                      ? "bg-crypto-long-dim text-crypto-long"
                      : "bg-crypto-short-dim text-crypto-short"
                  }`}>
                    {order.status}
                  </span>
                  {isPending && (
                    <button
                      type="button"
                      data-testid={`orders-panel-cancel-${order.id}`}
                      onClick={(e) => { e.stopPropagation(); cancelPendingOrder(order.id); }}
                      aria-label="Cancel order"
                      className="p-1 rounded bg-crypto-short-dim text-crypto-short hover:bg-crypto-short/20 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  )}
                  {isTpSl && (
                    <span className="text-[9px] text-crypto-text-muted">{isExpanded ? "▲" : "▼"}</span>
                  )}
                </div>
              </div>

              {/* Expanded detail: trigger + execution price */}
              {isTpSl && isExpanded && (
                <div className="px-3 pb-2.5 pt-0 flex gap-4 border-t border-crypto-border/40 mt-0">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Trigger Price</span>
                    <span className={`text-xs font-mono font-semibold ${isTp ? "text-crypto-long" : "text-crypto-short"}`}>
                      ${order.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Order Price</span>
                    <span className="text-xs font-mono font-semibold text-crypto-text">
                      {order.executionPrice != null
                        ? `$${order.executionPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : <span className="text-crypto-text-muted">pending</span>
                      }
                    </span>
                  </div>
                  {order.executionPrice != null && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-crypto-text-muted uppercase tracking-wider">Slippage</span>
                      <span className={`text-xs font-mono font-semibold ${Math.abs(order.executionPrice - order.price) < 1 ? "text-crypto-long" : "text-crypto-warning"}`}>
                        ${Math.abs(order.executionPrice - order.price).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
