import { Position, OrderSide } from "@/types/trading";

export function calculatePnL(position: Position): number {
  if (position.side === "LONG") {
    return ((position.currentPrice - position.entryPrice) * position.amount) / position.leverage;
  } else {
    return ((position.entryPrice - position.currentPrice) * position.amount) / position.leverage;
  }
}

export function calculateROI(position: Position): number {
  const pnl = calculatePnL(position);
  const marginUsed = (position.amount * position.entryPrice) / position.leverage;
  
  if (marginUsed === 0) return 0;
  return (pnl / marginUsed) * 100;
}

export function calculateMarginRequired(
  price: number,
  amount: number,
  leverage: number
): number {
  return (price * amount) / leverage;
}

export function calculateLiquidationPrice(
  position: Position
): number {
  const liquidationBuffer = 0.98; // 2% buffer
  
  if (position.side === "LONG") {
    return position.entryPrice * (1 - liquidationBuffer / position.leverage);
  } else {
    return position.entryPrice * (1 + liquidationBuffer / position.leverage);
  }
}

export function calculateFee(
  amount: number,
  price: number,
  feeRate: number = 0.001
): number {
  return amount * price * feeRate;
}
