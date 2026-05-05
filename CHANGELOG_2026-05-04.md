# Changelog — 2026-05-04

> **52 commits** — Major trading engine overhaul, limit orders, hedge mode, realized PnL tracking, comprehensive test suite, and UI polish.

---

## Table of Contents

1. [Trading Engine](#trading-engine)
2. [Order Types & Execution](#order-types--execution)
3. [Realized PnL & Position Management](#realized-pnl--position-management)
4. [Hedge Mode & Reduce Only](#hedge-mode--reduce-only)
5. [UI / UX](#ui--ux)
6. [Mobile](#mobile)
7. [Tests](#tests)
8. [Documentation](#documentation)
9. [DevEx & Tooling](#devex--tooling)

---

## Trading Engine

### Limit Orders — Full Implementation

- **`feat: working limit orders + TP/SL in simple mode`**
  - `tradingStore.ts`: Added `PendingOrder` interface with `tpPrice`, `slPrice`, `orderType` (`open` | `take_profit` | `stop_loss`).
  - `checkPendingOrders()`: Executes limit orders when price crosses limit; executes TP/SL orders when price hits target.
  - `addPendingOrder()`: Validates and queues limit/TP/SL orders with `crypto.randomUUID()`.
  - `useTimewarpEngine.ts`: Calls `storeCheckPendingOrders(price)` on every tick **before** `storeCheckPosition(price)`.
  - `TradeControls.tsx`: Full limit order UI with price input, stepper buttons, TP/SL fields.
  - Tests added in `tradingStore.test.ts` and `useTimewarpEngine.test.ts`.

- **`feat: limit orders can increase or reduce existing positions`**
  - Limit orders on the **same side** as open position → `addToPosition()` at limit price.
  - Limit orders on the **opposite side** → `reducePosition()` or full close.

- **`feat: limit orders can add to existing positions + Notional Value field`**
  - Added "Notional Value" readout next to size input for clarity.

- **`fix: limit orders now work when position is open`**
  - Fixed logic that blocked limit orders while a position was active.
  - Added debug logging for order execution.

- **`fix: limit orders now work correctly with open position`**
  - Corrected side-check logic in `TradeControls` slider and button handlers.

- **`fix: show limit price input even when position is open`**
  - Removed conditional hiding of limit price input.

- **`fix: allow switching Market/Limit order type when position is open`**
  - Order type tabs (Market / Limit) now always accessible.

- **`feat: auto-fill limit price on click with current price`**
  - Clicking the limit price input auto-fills with `currentPrice`.

- **`feat: stepper buttons for quick limit price adjustment`**
  - `+` / `-` buttons with configurable step (10, 50, 100, 500, custom).

- **`feat: collapsible step settings with custom value option`**
  - Step dropdown hidden by default; expandable for power users.

- **`chore: default limit price step to 0`**
  - Default step changed from 100 to 0 (freeform input).

- **`feat: clear button (X) on limit price input`**
  - One-click clear for limit price.

- **`fix: better positioning for limit price clear (X) button`**
  - Fixed z-index and padding overlap.

### Take Profit / Stop Loss

- **`feat: working limit orders + TP/SL in simple mode`**
  - TP/SL inputs visible in both Market and Limit modes.
  - TP/SL values propagate through `openPosition()`, `addPendingOrder()`, and `checkPendingOrders()`.
  - `PositionPanel.tsx`: Displays active TP/SL boxes with `.toFixed(2)` formatting.

- **`fix: add market increase/decrease orders to Orders history`**
  - TP/SL fields now tracked in `OrderHistoryItem`.

- **`fix: comprehensive bug fixes from deep audit + 6 new tests`**
  - Fixed stale TP/SL inputs in `TradeControls` — inputs now clear after successful position open.
  - Fixed `toFixed(2)` formatting across price displays.

### Pending Orders & History

- **`feat: new OrdersPanel component with full order history`**
  - New component showing all orders: pending, filled, canceled.
  - Columns: Side, Type, Size, Price, Leverage, Status, Time.
  - `cancelPendingOrder()` updates status to `canceled` in history.

- **`fix: remove pending orders from PositionPanel and MobileTradingView`**
  - Moved pending order display exclusively to `OrdersPanel`.

- **`ui: move OrdersPanel above TradeHistory in desktop layout`**
  - Reordered panels in `page.tsx` for better visual hierarchy.

- **`fix: order history side tracking on reduce operations`**
  - Reduce/close orders now correctly log the **reducing** side in history.

### Liquidation & State

- **`fix: responsive layout, mobile End button, and liquidation state cleanup`**
  - `isLiquidated` flag now properly reset on new session start.

- **`fix: freeze end date and block return after simulation end`**
  - After simulation ends, date is frozen; user cannot return to trading without starting a new session.

- **`fix: show end date in EndSimulationModal instead of em-dash`**
  - Displays actual end date string.

- **`fix: reset chart timeScale on new session to prevent huge gap`**
  - Fixes chart showing massive empty gap between old and new session data.

- **`fix: clear stale isLiquidated state and add persist migration`**
  - Added Zustand `migrate` (v1) that wipes transient state (`position`, `pendingOrders`, `isLiquidated`, `simulationRealDate`) from `localStorage` on load.
  - `isLiquidated` reset to `false` when opening a new position or closing manually/TP/SL.

---

## Order Types & Execution

### Order History Tracking

- **`feat: new OrdersPanel component with full order history`**
  - `OrderHistoryItem` interface with `id`, `side`, `type`, `status`, `leverage`, `size`, `price`, `tpPrice`, `slPrice`, `createdAt`, `executionPrice`, `updatedAt`.
  - Statuses: `pending`, `filled`, `canceled`.
  - Types: `market`, `limit`, `tp`, `sl`.

- **`fix: order-centric slider + symmetric Best/Worst Trade display`**
  - Slider now operates on **order size** rather than position size.
  - PnLDisplay shows symmetric "Best Trade" / "Worst Trade" stats.

---

## Realized PnL & Position Management

### Realized PnL Tracking

- **`feat: realized PnL for partial closes + show in PnLDisplay`**
  - `realizedPnL` field added to `Position` interface.
  - Partial closes accumulate realized PnL without closing the position.
  - Displayed in `PnLDisplay` component.

- **`feat: add realizedPnL tracking without polluting closedTrades`**
  - `closedTrades` only records **fully closed** positions.
  - `realizedPnL` tracks partial profit/loss in real-time.

- **`feat: show Realized P&L in PositionPanel when non-zero`**
  - Small readout under Unrealized P&L when `realizedPnL !== 0`.

- **`fix: realizedPnL is now per-position, not session-wide`**
  - Previously `realizedPnL` was a global store value; now tied to the active `Position` object.

- **`fix: reset realizedPnL on new session`**
  - `useTimewarpEngine.ts` `reset()` clears `realizedPnL`.

- **`fix: closePosition trade.pnl now includes prior realizedPnL from partial closes`**
  - Final trade PnL = unrealized PnL on remaining size + all prior realized PnL.

- **`fix: double-counting realizedPnL on hedge flip and reduce full-close + add comprehensive hedge tests`**
  - Fixed bug where `realizedPnL` was added twice during hedge flips.
  - Added 10+ unit tests covering hedge mode partial reduces, full closes, and flips.

### Slider & Position Sizing

- **`fix: order-centric slider + symmetric Best/Worst Trade display`**
  - Slider now represents **order size**, not total position size.
  - Min = 0, Max = wallet balance (or position size for reduce).

- **`fix: side button click resets slider toward intended direction`**
  - Clicking LONG resets slider to 0→max; SHORT resets to 0→max for opposite side.

- **`fix: action button label follows side toggle, not slider sizeDiff`**
  - Button always says "Open Long" / "Open Short" / "Increase Position" / "Reduce Position" based on side, not slider delta.

- **`ui: rename DECREASE POSITION → REDUCE POSITION`**
  - Industry-standard terminology.

---

## Hedge Mode & Reduce Only

### Reduce Only / Hedge Mode Toggle

- **`feat: implement Reduce Only / Hedge Mode toggle`**
  - New `reduceOnly` boolean in `TradingStore` (default: `true`).
  - `TradeControls.tsx`: Toggle button in advanced mode.
  - **Reduce Only**: Opposite-side orders can only reduce/close existing position.
  - **Hedge Mode**: Opposite-side orders larger than position size trigger a **flip** (close existing + open new with excess).

- **`fix: remove auto-close from side buttons + add Reduce Only / Hedge Mode to ROADMAP`**
  - Side buttons (LONG/SHORT) no longer auto-close position; they respect `reduceOnly` mode.

- **`fix: slider max in hedge mode allows orders larger than position`**
  - In hedge mode, slider max extends to full wallet balance for flips.

- **`feat: allow flipping side in market mode with open position`**
  - Market orders on opposite side now supported in hedge mode.

- **`fix: comprehensive bug fixes from deep audit + 6 new tests`**
  - Fixed hedge affordability check: existing margin + PnL is returned before requiring new margin.
  - Fixed `lastActionError` propagation in `TradeControls`.

---

## UI / UX

### TradeControls Overhaul

- **`feat: working limit orders + TP/SL in simple mode`**
  - Complete rewrite of order entry UI.
  - Market vs Limit tabs.
  - Size slider with wallet balance readout.
  - Leverage selector (1x–125x).
  - TP/SL inputs with validation.

- **`fix: show Limit Price input in simple mode + add TradeControls tests`**
  - Limit price visible in simple mode too.
  - 15+ new unit tests for `TradeControls`.

- **`fix: skip high-leverage warning modal in Advanced mode`**
  - `skipHighLeverageWarning` flag persists in `localStorage`.

- **`fix: auto-open mobile controls on position open + fix TypeScript errors`**
  - Mobile bottom sheet auto-opens when a position is opened externally (e.g. limit order fill).

### Panels & Displays

- **`feat: new OrdersPanel component with full order history`**
  - Self-contained component with status badges and cancel buttons.

- **`fix: remove pending orders from PositionPanel and MobileTradingView`**
  - Cleaner separation of concerns.

- **`feat: show Realized P&L in PositionPanel when non-zero`**
  - Conditional display of realized PnL.

- **`fix: remove market trend indicator (UP/DOWN/NEUTRAL) from MarketStatus`**
  - Removed confusing trend indicator; kept volatility badge.

- **`feat: add tooltip to High Volatility badge explaining what it means`**
  - Hover tooltip: "Price swings are wider than usual — adjust your risk."

### Layout & Responsive

- **`fix: responsive layout, mobile End button, and liquidation state cleanup`**
  - `Header.tsx`: Mobile-optimized End button placement.
  - `MarketStatus.tsx`: Responsive badge sizing.
  - `page.tsx`: Grid adjustments for mobile/desktop.

- **`fix: remove Historical Start from SimulationClock`**
  - Simplified clock UI; removed unused "Historical Start" label.

- **`fix: better positioning for limit price clear (X) button`**
  - Visual polish.

---

## Mobile

- **`fix: responsive layout, mobile End button, and liquidation state cleanup`**
  - End button visible in mobile header.
  - `MobileTradingView.tsx`: Responsive grid and spacing fixes.

- **`fix: remove Historical Start from SimulationClock and fix End button on mobile`**
  - `SimulationClock.tsx` simplified for mobile viewport.

- **`fix: auto-open mobile controls on position open + fix TypeScript errors`**
  - Mobile bottom sheet (`MobileTradingView`) auto-opens on position open.

---

## Tests

### Unit Tests

- **`test: add unit tests for all recent fixes`**
  - `Header.test.tsx` (3 tests)
  - `MarketStatus.test.tsx` (3 tests)
  - `MobileTradingView.test.tsx` (1 test)
  - `PnLDisplay.test.tsx` (4 tests)
  - `SimulationClock.test.tsx` (4 tests)
  - `useTimewarpEngine.test.ts` — additional coverage for limit order execution

- **`fix: show Limit Price input in simple mode + add TradeControls tests`**
  - `TradeControls.test.tsx` expanded with TP/SL flow tests, limit order tests.

- **`fix: order-centric slider + symmetric Best/Worst Trade display`**
  - Updated `TradeControls.test.tsx` and `PnLDisplay.test.tsx` for new behavior.

- **`fix: comprehensive bug fixes from deep audit + 6 new tests`**
  - 6 new tests in `TradeControls.test.ts` for edge cases (empty TP/SL, high leverage, etc.).

- **`fix: double-counting realizedPnL on hedge flip and reduce full-close + add comprehensive hedge tests`**
  - 10+ new tests in `tradingStore.test.ts` for hedge mode.

### E2E Tests

- **`test: add 9 new critical E2E tests + console log capture + fix existing tests`**
  - `e2e/_helper.ts`: Console log capture helper for debugging CI failures.
  - `e2e/hedge-mode.spec.ts`: NEW — Full hedge mode flow (reduce, flip, partial).
  - `e2e/limit-orders.spec.ts`: NEW — Limit order creation, execution, cancellation.
  - `e2e/tp-sl.spec.ts`: NEW — TP/SL creation, hit, cancellation.
  - `e2e/date-reveal.spec.ts`: Fixed TypeScript types.
  - `e2e/trading.spec.ts`: Updated for new UI.

- **`chore: fix TypeScript type in date-reveal E2E`**
  - Fixed `Date` vs `string` type mismatch in date-reveal test.

**Current Test Counts:**
- **Vitest (Unit)**: 176 passed, 4 skipped = **180 total**
- **Playwright (E2E)**: 36 passed, 4 skipped

---

## Documentation

- **`docs: update ARCHITECTURE.md, PRD and README with latest features`**
  - Updated system architecture diagrams and component descriptions.
  - Added limit order, hedge mode, and realized PnL sections.

- **`docs: update ROADMAP with shipped features`**
  - Checked off completed items (Limit Orders, Hedge Mode, Realized PnL, Orders Panel).

- **`docs: update README, ARCHITECTURE, and CHANGELOG`**
  - Added May 2026 feature summary.

- **`docs: remove CHANGELOG from repo (keep locally only)`**
  - Removed `CHANGELOG_2026-05-04.md` from git; kept locally.
  - *Note: Re-created in subsequent commits.*

- **`docs: add changelog for 2026-05-04`**
  - Initial version of this file.

- **`docs: sync README, ARCHITECTURE, and ROADMAP with May 2026 changelog`**
  - Final sync pass.

---

## DevEx & Tooling

- **`feat: enhanced debug logging for trading actions`**
  - `tradingStore.ts`: `[openPosition]`, `[closePosition]`, `[addPendingOrder]`, `[checkPendingOrders]`, `[cancelPendingOrder]` logs with full state snapshot.
  - `TradeControls.tsx`: Logs for user interactions.

- **`fix: remove noisy tick logs, add user action logging across all components`**
  - Removed `console.log` from every tick loop.
  - Kept action-level logging (open, close, cancel, execute).

- **`fix: remove remaining tick loop logs from checkPendingOrders`**
  - Final cleanup of tick-level logs.

- **`fix: hydration mismatch on LandingPage fake chart`**
  - Fixed Next.js hydration error caused by random data in `LandingPage` chart.

---

## Files Modified (Summary)

| Area | Files |
|------|-------|
| **Trading Store** | `src/store/tradingStore.ts`, `src/store/tradingStore.test.ts` |
| **Components** | `src/components/trading/TradeControls.tsx`, `PositionPanel.tsx`, `OrdersPanel.tsx`, `PnLDisplay.tsx`, `MobileTradingView.tsx`, `SimulationClock.tsx`, `TradingChart.tsx`, `ConfirmHighLeverageModal.tsx`, `OnboardingModal.tsx`, `EndSimulationModal.tsx` |
| **Layout** | `src/components/layout/Header.tsx`, `MarketStatus.tsx` |
| **Pages** | `src/app/trading/page.tsx`, `src/components/pages/LandingPage.tsx` |
| **Hooks** | `src/hooks/useTimewarpEngine.ts`, `useTimewarpEngine.test.ts`, `useTradeNotifications.ts`, `useTradeNotifications.test.ts` |
| **E2E** | `e2e/_helper.ts`, `e2e/hedge-mode.spec.ts`, `e2e/limit-orders.spec.ts`, `e2e/tp-sl.spec.ts`, `e2e/date-reveal.spec.ts`, `e2e/trading.spec.ts`, `e2e/manual-trading.spec.ts`, `e2e/production-bar.spec.ts` |
| **Docs** | `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG_2026-05-04.md` |
| **Config** | `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts` |

---

## Stats

- **Commits**: 52
- **Files changed**: 35+
- **Tests added**: ~40 unit tests, ~9 E2E tests
- **Lines added**: ~3,500+
- **Lines removed**: ~800+

---

*Generated from git history on 2026-05-04.*
