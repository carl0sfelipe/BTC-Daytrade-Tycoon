import { Target, Shield } from "lucide-react";
import type { PendingOrder } from "@/store/types";

interface PendingOrdersListProps {
  tpOrders: PendingOrder[];
  slOrders: PendingOrder[];
  onCancelTp: (id: string) => void;
  onCancelSl: (id: string) => void;
}

export function PendingOrdersList({ tpOrders, slOrders, onCancelTp, onCancelSl }: PendingOrdersListProps) {
  if (tpOrders.length === 0 && slOrders.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-crypto-text-muted uppercase tracking-wider">Pending Orders</span>
      {tpOrders.map((order) => (
        <OrderRow
          key={order.id}
          icon={<Target className="w-3.5 h-3.5 text-crypto-long" />}
          label={`TP @ $${order.limitPrice.toFixed(2)}`}
          colorClass="text-crypto-long"
          bgClass="bg-crypto-long-dim/30 border-crypto-long/20"
          onCancel={() => onCancelTp(order.id)}
        />
      ))}
      {slOrders.map((order) => (
        <OrderRow
          key={order.id}
          icon={<Shield className="w-3.5 h-3.5 text-crypto-short" />}
          label={`SL @ $${order.limitPrice.toFixed(2)}`}
          colorClass="text-crypto-short"
          bgClass="bg-crypto-short-dim/30 border-crypto-short/20"
          onCancel={() => onCancelSl(order.id)}
        />
      ))}
    </div>
  );
}

function OrderRow({
  icon,
  label,
  colorClass,
  bgClass,
  onCancel,
}: {
  icon: React.ReactNode;
  label: string;
  colorClass: string;
  bgClass: string;
  onCancel: () => void;
}) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${bgClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-xs font-mono ${colorClass}`}>{label}</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-[10px] text-crypto-text-muted hover:text-crypto-short transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
