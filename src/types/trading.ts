export type OrderSide = "LONG" | "SHORT";

export type OrderType = "MARKET" | "LIMIT";

export interface Order {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  timestamp: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  openedAt: number;
  isClosed?: boolean;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface VolatilityState {
  currentVolatility: number;
  historicalVolatility: number[];
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface TradingEngineState {
  balance: number;
  positions: Position[];
  isOpen: boolean;
}
