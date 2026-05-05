"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, Filter } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";

type OrderFilter = "all" | "pending" | "filled" | "canceled";

export default function OrdersPanel() {
  const [filter, setFilter] = useState<OrderFilter>("all");
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
            key={f.key}
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
          <div className="flex items-center justify-center py-6">
            <p className="text-xs text-crypto-text-muted">No orders</p>
          </div>
        ) : (
          filtered.map((order) => {
            const isPending = order.status === "pending";
            const isFilled = order.status === "filled";
            const isCanceled = order.status === "canceled";

            return (
              <div
                key={order.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border ${
                  isPending
                    ? "bg-crypto-surface-elevated border-crypto-border"
                    : isFilled
                    ? "bg-crypto-long-dim/30 border-crypto-long/20"
                    : "bg-crypto-short-dim/30 border-crypto-short/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isPending
                      ? "bg-crypto-accent-dim"
                      : isFilled
                      ? "bg-crypto-long/20"
                      : "bg-crypto-short/20"
                  }`}>
                    {isPending ? (
                      <Clock className="w-3 h-3 text-crypto-accent" />
                    ) : isFilled ? (
                      <CheckCircle2 className="w-3 h-3 text-crypto-long" />
                    ) : (
                      <XCircle className="w-3 h-3 text-crypto-short" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">
                      <span className={`uppercase ${order.side === "long" ? "text-crypto-long" : "text-crypto-short"}`}>
                        {order.side}
                      </span>{" "}
                      <span className="text-crypto-text-secondary">{order.type}</span>{" "}
                      <span className="text-crypto-accent">{order.leverage}x</span>
                    </span>
                    <span className="text-[10px] font-mono text-crypto-text-muted">
                      ${order.size.toLocaleString()} @ ${order.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      {order.tpPrice ? ` TP ${order.tpPrice.toFixed(0)}` : ""}
                      {order.slPrice ? ` SL ${order.slPrice.toFixed(0)}` : ""}
                    </span>
                    {isPending && (
                      <span className="text-[9px] font-mono text-crypto-text-muted">
                        Current: ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                      onClick={() => cancelPendingOrder(order.id)}
                      aria-label="Cancel order"
                      className="p-1 rounded bg-crypto-short-dim text-crypto-short hover:bg-crypto-short/20 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
