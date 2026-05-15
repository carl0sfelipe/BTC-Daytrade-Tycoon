import {
  Target,
  Shield,
  Flame,
  TrendingDown,
  Hand,
  CheckCircle2,
  XCircle,
  CircleDollarSign,
} from "lucide-react";
import type { EventLogItem } from "@/lib/trading/event-log";

interface EventLogProps {
  events: EventLogItem[];
}

export default function EventLog({ events }: EventLogProps) {
  if (events.length === 0) {
    return (
      <div data-testid="event-log-empty" className="flex items-center justify-center py-6">
        <p className="text-xs text-crypto-text-muted">No events yet</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 space-y-1.5 max-h-[300px] overflow-y-auto">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventRow({ event }: { event: EventLogItem }) {
  const config = getEventConfig(event.type);
  const Icon = config.icon;
  const pnlColor =
    event.pnl == null
      ? ""
      : event.pnl >= 0
      ? "text-crypto-long"
      : "text-crypto-short";

  return (
    <div
      data-testid={`event-log-row-${event.id}`}
      className={`rounded-lg border ${config.bg} flex items-center justify-between p-2.5`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconBg}`}
        >
          <Icon className={`w-3 h-3 ${config.iconColor}`} />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold truncate">
            <span className={config.labelColor}>{event.label}</span>
            {" "}
            <span
              className={`uppercase text-[9px] ${
                event.side === "long" ? "text-crypto-long" : "text-crypto-short"
              }`}
            >
              {event.side}
            </span>
            {" "}
            <span className="text-crypto-accent">{event.leverage}x</span>
          </span>

          <span className="text-[10px] font-mono text-crypto-text-muted">
            ${event.size.toLocaleString()} @{" "}
            <span className="text-crypto-text">
              ${event.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            {event.pnl != null && (
              <span className={`font-semibold ${pnlColor}`}>
                {" "}
                {event.pnl >= 0 ? "+" : ""}
                {event.pnl.toFixed(2)}
              </span>
            )}
          </span>

          <span className="text-[9px] font-mono text-crypto-text-muted">
            {event.time}
          </span>
        </div>
      </div>
    </div>
  );
}

function getEventConfig(type: EventLogItem["type"]) {
  switch (type) {
    case "tp":
    case "limit_fill":
      return {
        icon: Target,
        bg: "bg-crypto-long-dim/20 border-crypto-long/20",
        iconBg: "bg-crypto-long/20",
        iconColor: "text-crypto-long",
        labelColor: "text-crypto-long",
      };
    case "sl":
      return {
        icon: Shield,
        bg: "bg-crypto-short-dim/20 border-crypto-short/20",
        iconBg: "bg-crypto-short/20",
        iconColor: "text-crypto-short",
        labelColor: "text-crypto-short",
      };
    case "liquidation":
      return {
        icon: Flame,
        bg: "bg-crypto-short-dim/30 border-crypto-short/30",
        iconBg: "bg-crypto-short/20",
        iconColor: "text-crypto-short",
        labelColor: "text-crypto-short",
      };
    case "trailing_stop":
      return {
        icon: TrendingDown,
        bg: "bg-crypto-warning/10 border-crypto-warning/20",
        iconBg: "bg-crypto-warning/20",
        iconColor: "text-crypto-warning",
        labelColor: "text-crypto-warning",
      };
    case "manual":
      return {
        icon: Hand,
        bg: "bg-crypto-surface-elevated border-crypto-border",
        iconBg: "bg-crypto-accent-dim",
        iconColor: "text-crypto-accent",
        labelColor: "text-crypto-text",
      };
    case "market_fill":
      return {
        icon: CheckCircle2,
        bg: "bg-crypto-long-dim/20 border-crypto-long/20",
        iconBg: "bg-crypto-long/20",
        iconColor: "text-crypto-long",
        labelColor: "text-crypto-text",
      };
    case "order_canceled":
      return {
        icon: XCircle,
        bg: "bg-crypto-short-dim/20 border-crypto-short/20",
        iconBg: "bg-crypto-short/20",
        iconColor: "text-crypto-short",
        labelColor: "text-crypto-text-muted",
      };
    default:
      return {
        icon: CircleDollarSign,
        bg: "bg-crypto-surface-elevated border-crypto-border",
        iconBg: "bg-crypto-accent-dim",
        iconColor: "text-crypto-accent",
        labelColor: "text-crypto-text",
      };
  }
}
