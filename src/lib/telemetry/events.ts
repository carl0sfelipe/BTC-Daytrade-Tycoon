/**
 * Typed telemetry events for the trading simulator.
 *
 * All events are anonymized before transmission.
 * No PII (Personally Identifiable Information) is ever included.
 */

export interface BaseEvent {
  event: string;
  ts: number; // Unix timestamp in ms
  sessionId: string; // hashed
  userId: string; // hashed
}

/** Fired when a position is opened. */
export interface TradeOpenedEvent extends BaseEvent {
  event: "trade_opened";
  side: "long" | "short";
  leverage: number;
  size: number;
  entryPrice: number;
  tpPrice: number | null;
  slPrice: number | null;
  orderType: "market" | "limit";
  walletAtOpen: number;
  sessionDurationMs: number;
}

/** Fired when a position is closed for any reason. */
export interface TradeClosedEvent extends BaseEvent {
  event: "trade_closed";
  side: "long" | "short";
  reason: "manual" | "tp" | "sl" | "liquidation" | "trailing_stop";
  pnl: number;
  pnlPercent: number;
  durationSeconds: number;
  maxDrawdownPercent: number;
  walletAtClose: number;
}

/** Fired when a pending order is created. */
export interface OrderCreatedEvent extends BaseEvent {
  event: "order_created";
  orderType: "open" | "take_profit" | "stop_loss";
  side: "long" | "short";
  leverage: number;
  size: number;
  limitPrice: number;
}

/** Fired when a pending order is executed. */
export interface OrderExecutedEvent extends BaseEvent {
  event: "order_executed";
  orderType: "open" | "take_profit" | "stop_loss";
  side: "long" | "short";
  leverage: number;
  size: number;
  limitPrice: number;
  executionPrice: number;
}

/** Fired when a pending order is cancelled. */
export interface OrderCancelledEvent extends BaseEvent {
  event: "order_cancelled";
  orderType: "open" | "take_profit" | "stop_loss";
  side: "long" | "short";
}

/** Fired when leverage is updated on an open position. */
export interface LeverageUpdatedEvent extends BaseEvent {
  event: "leverage_updated";
  oldLeverage: number;
  newLeverage: number;
  side: "long" | "short";
}

/** Fired when trailing stop is set or removed. */
export interface TrailingStopSetEvent extends BaseEvent {
  event: "trailing_stop_set";
  percent: number | null;
  side: "long" | "short";
}

/** Fired at the start of a simulation session. */
export interface SessionStartedEvent extends BaseEvent {
  event: "session_started";
  difficulty: string;
  startingWallet: number;
  maxLeverage: number;
  historicalDateRange: string;
}

/** Fired when a session ends (manual, liquidation, or data exhaustion). */
export interface SessionEndedEvent extends BaseEvent {
  event: "session_ended";
  reason: "manual" | "liquidation" | "data_exhausted" | "error";
  finalWallet: number;
  totalPnl: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  bestTradePnl: number;
  worstTradePnl: number;
  sessionDurationSeconds: number;
}

/** Fired on each tick — sampled (1 in 10) to avoid flooding. */
export interface TickSampleEvent extends BaseEvent {
  event: "tick_sample";
  price: number;
  trend: "bull" | "bear" | "neutral";
  volatility: number;
  hasOpenPosition: boolean;
  openPositionSide: "long" | "short" | null;
}

export type TelemetryEvent =
  | TradeOpenedEvent
  | TradeClosedEvent
  | OrderCreatedEvent
  | OrderExecutedEvent
  | OrderCancelledEvent
  | LeverageUpdatedEvent
  | TrailingStopSetEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | TickSampleEvent;
