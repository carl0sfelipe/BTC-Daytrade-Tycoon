# BTC Daytrade Tycoon — Technical Architecture

> **Version:** May 2026  
> **Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS v3, Zustand, lightweight-charts v5, Playwright (E2E)  
> **Target Audience:** Developers contributing to or maintaining the codebase.

---

## Table of Contents

1. [Overview & Core Concept](#overview--core-concept)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Data Flow & Simulation Engine](#data-flow--simulation-engine)
5. [State Management (Zustand)](#state-management-zustand)
6. [Position Mechanics](#position-mechanics)
7. [Component Architecture](#component-architecture)
8. [Modals & UX Flows](#modals--ux-flows)
9. [Authentication](#authentication)
10. [E2E Testing](#e2e-testing)
11. [Important Technical Notes](#important-technical-notes)

---

## Overview & Core Concept

**TimeWarp Trading Simulator** drops the user into a random, real Bitcoin trading day between December 2017 and December 2020. The historical date is intentionally hidden — there is no time axis, no calendar, and no date labels on the chart. The goal is pure price-action trading without temporal bias.

| Parameter | Value |
|-----------|-------|
| Speed | 60× (1 real second = 1 simulated minute) |
| Tick interval | 100 ms |
| Data source | Binance 1-minute candle API (`BTCUSDT`) |
| Candle batch | 2 × 1000 candles ≈ 2000 candles ≈ ~33 hours of data |
| Price normalization | Historical percentage returns preserved, but prices scaled to current live BTC price |
| Starting wallet | $10,000 |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI Library | React 18 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + `tailwindcss-animate` |
| State | Zustand 4 + `persist` middleware |
| Charts | `lightweight-charts` v5 |
| UI Primitives | Radix UI (Dialog, Slider, ScrollArea, Tooltip, etc.) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| E2E Tests | Playwright |
| Unit Tests | Vitest + React Testing Library |

---

## Project Structure

```
BTC-Daytrade-Tycoon/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── trading/page.tsx    # Main simulation page (mounted guard)
│   │   ├── auth/               # Login / signup pages
│   │   ├── leaderboard/        # Rankings page
│   │   ├── achievements/       # Achievements page
│   │   ├── layout.tsx          # Root layout (lang="en")
│   │   └── globals.css         # Tailwind + custom crypto theme vars
│   ├── components/
│   │   ├── layout/             # Header, MarketStatus
│   │   ├── trading/            # Core trading UI components
│   │   └── ui/                 # shadcn/ui primitives (Button, Dialog, Slider, etc.)
│   ├── hooks/
│   │   ├── useTimewarpEngine.ts   # Simulation loop & data fetch
│   │   ├── useTradingEngine.ts    # (legacy compat)
│   │   ├── useBinancePrice.ts
│   │   ├── useMarketVolatility.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── use-mobile.tsx
│   ├── store/
│   │   └── tradingStore.ts     # Zustand store + persist
│   ├── lib/
│   │   ├── binance-api.ts      # Fetch + normalize + interpolate candles
│   │   ├── fake-auth.ts        # Client-side fake auth
│   │   └── utils.ts            # cn() helper
│   ├── types/
│   │   └── trading.ts          # Shared type definitions
│   └── utils/
│       ├── priceCalc.ts
│       ├── formatCurrency.ts
│       ├── volatilityEngine.ts
│       └── streak.ts
├── e2e/                        # Playwright specs
│   ├── trading.spec.ts
│   ├── date-reveal.spec.ts
│   ├── manual-trading.spec.ts
│   └── _helper.ts
├── public/
│   └── chatgpt-extractor.js
├── next.config.mjs
├── tailwind.config.ts
├── playwright.config.ts
└── package.json
```

---

## Data Flow & Simulation Engine

The simulation is driven by the `useTimewarpEngine` hook. It orchestrates data fetching, the game loop, and store updates.

### High-Level Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Binance API    │────▶│  useTimewarpEngine│────▶│  Zustand Store      │
│  (BTCUSDT 1m)   │     │  (game loop)      │     │  (price, trend,     │
└─────────────────┘     └──────────────────┘     │   volatility, ...)  │
                                                  └──────────┬──────────┘
                                                             │
                              ┌──────────────────────────────┼──────────┐
                              ▼                              ▼          ▼
                    ┌─────────────────┐            ┌─────────────────┐  ┌──────────────┐
                    │  TradingChart   │            │  PositionPanel  │  │  OrderBook   │
                    │  (lightweight-  │            │  (PnL / Risk)   │  │  (synthetic) │
                    │   charts v5)    │            └─────────────────┘  └──────────────┘
                    └─────────────────┘
```

### Step-by-Step Engine Lifecycle

1. **Random Date Draw**
   ```ts
   const MIN_DATE = new Date("2017-12-01T00:00:00Z").getTime();
   const MAX_DATE = new Date("2020-12-31T00:00:00Z").getTime();
   ```
   A random timestamp between these bounds is chosen.

2. **Data Fetch**
   - `fetchCurrentPrice()` gets live BTC price from Binance.
   - `fetchCandles(startDate)` performs **2 sequential API calls** (`limit=1000` each) to retrieve ~2000 1-minute candles (~33 hours).

3. **Normalization**
   ```ts
   normalizeCandlesToBasePrice(historicalCandles, currentLivePrice)
   ```
   Each candle's OHLC is divided by the first candle's open to get percentage ratios, then multiplied by the live BTC price. This preserves historical volatility and returns while making prices feel current.

4. **History Offset**
   The first 30 candles are pre-consumed so the chart is already populated when the user sees it:
   ```ts
   const HISTORY_OFFSET_CANDLES = 30;
   ```

5. **Game Loop**
   ```ts
   const SPEED_MULTIPLIER = 60; // 1 real sec = 1 simulated min
   const TICK_MS = 100;
   ```
   `setInterval(tick, 100)` runs while `isPlaying` is true.

   On each tick:
   ```ts
   const realElapsedMs = Date.now() - simulationStartRealTimeRef.current;
   const simulatedElapsedMs = realElapsedMs * SPEED_MULTIPLIER;
   const simulatedTimeMs = startDate.getTime() + simulatedElapsedMs;
   ```

6. **Interpolation**
   `interpolatePrice(candles, simulatedTimeSec)` finds the two surrounding candles and linearly interpolates the price between their open values.

7. **Metrics Update**
   - **Trend:** `calculateTrend` computes a 20-candle SMA and labels `bull` / `bear` / `neutral` (±1% threshold).
   - **Volatility:** `calculateVolatility` computes `(max - min) / avg * 100` over the last 24 candles.
   - **History:** Rolling `priceHistory` array (last 50 closes) is maintained for sparklines.

8. **Position Checks**
   Every tick calls `store.checkPosition(price)`, which evaluates TP, SL, and liquidation conditions.

---

## State Management (Zustand)

The store lives in `src/store/tradingStore.ts`. It uses Zustand's `persist` middleware with the key `trading-storage`.

### Store Shape

```ts
interface TradingStore {
  price: number;                    // Current simulated BTC price
  currentPrice: number;             // Alias synced with price
  volatility: number;               // Computed over last 24 candles
  marketTrend: "bull" | "bear" | "neutral";
  priceHistory: number[];           // Last 50 prices for sparklines

  wallet: number;                   // Free balance (starts at $10,000)
  position: Position | null;        // Active position
  activePositions: Position[];      // Historical array of open positions
  closedTrades: Trade[];            // Closed trade history

  isLiquidated: boolean;
  simulationRealDate: string | null; // Revealed on end/liquidation
  hasSeenOnboarding: boolean;
  lastCloseReason: string | null;

  // Actions
  openPosition(side, leverage, size, tpPrice, slPrice, limitPrice): void;
  closePosition(reason?): void;
  updatePositionSize(newSize): void;
  updateLeverage(newLeverage): void;
  checkPosition(currentPrice): { closed: boolean; reason? };
  setLiquidated(date): void;
  clearLiquidated(): void;
  setOnboardingSeen(): void;
}
```

### Position Interface

```ts
interface Position {
  side: "long" | "short";
  entry: number;
  size: number;
  leverage: number;
  tpPrice: number | null;
  slPrice: number | null;
  liquidationPrice: number;
}
```

### Dev Debug Hook

In non-production builds, the store is exposed globally:

```ts
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as any).__tradingStore = useTradingStore;
}
```

This is actively used by E2E tests to inject positions for liquidation scenarios.

---

## Position Mechanics

### Opening a Position

```ts
const margin = positionSize / leverage;
// Deducts margin from wallet
```

### Liquidation Price

Simplified model: liquidation occurs when price moves `1 / leverage` against the position.

```ts
// Long
liquidationPrice = entry * (1 - 1 / leverage);

// Short
liquidationPrice = entry * (1 + 1 / leverage);
```

### PnL Calculation

```ts
const priceDiff = side === "long" ? price - entry : entry - price;
const pnl = (priceDiff / entry) * size;
```

On close:
```ts
wallet += margin + pnl;
```

### Increasing Position Size

- New entry = weighted average: `(oldSize * oldEntry + additionalSize * currentPrice) / newSize`
- Additional margin is deducted from wallet.

### Decreasing Position Size

- Returns margin for the reduced portion + proportional unrealized PnL.

### Updating Leverage

- Recalculates margin requirement: `newMargin = size / newLeverage`
- If margin decreases, difference is returned to wallet.
- If margin increases, difference is deducted from wallet.
- Liquidation price is recalculated.

---

## Component Architecture

### Layout Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `Header` | `components/layout/Header.tsx` | App header, navigation links |
| `MarketStatus` | `components/layout/MarketStatus.tsx` | Current price sparkline, volatility badge, trend indicator |

### Core Trading Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `TradingChart` | `components/trading/TradingChart.tsx` | `lightweight-charts` candlestick chart. Crypto-themed colors (green long, red short). Dynamic liquidation price line. |
| `TradeControls` | `components/trading/TradeControls.tsx` | Simple/Advanced modes, leverage pills (2×–100×), size slider/pills, TP/SL inputs, open/close/increase/decrease buttons. |
| `PositionPanel` | `components/trading/PositionPanel.tsx` | Risk gauge, unrealized PnL, entry/size/leverage/margin/liquidation display. |
| `PnLDisplay` | `components/trading/PnLDisplay.tsx` | Total equity (wallet + margin + unrealizedPnL), session PnL, win rate, best/worst trade. |
| `SimulationClock` | `components/trading/SimulationClock.tsx` | Elapsed time, progress %, play/pause/end/reset buttons. |
| `OrderBook` | `components/trading/OrderBook.tsx` | Synthetic depth bars around current price. |
| `TradeHistory` | `components/trading/TradeHistory.tsx` | Timeline of closed trades. |
| `MobileTradingView` | `components/trading/MobileTradingView.tsx` | Bottom-sheet tabs for mobile (Chart, History, Your Position, Order Controls). |
| `SimulationLoader` | `components/trading/SimulationLoader.tsx` | Loading overlay with status messages. |

### Page Composition (`/trading/page.tsx`)

```
┌─────────────────────────────────────────────┐
│                   Header                      │
├─────────────────────────────────────────────┤
│              SimulationClock                  │
├─────────────────────────────────────────────┤
│                MarketStatus                   │
├─────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌────────────────┐ │
│  │                     │ │   OrderBook    │ │
│  │    TradingChart     │ ├────────────────┤ │
│  │                     │ │ PositionPanel  │ │
│  │                     │ ├────────────────┤ │
│  │                     │ │  TradeControls │ │
│  ├─────────────────────┤ ├────────────────┤ │
│  │    TradeHistory     │ │   PnLDisplay   │ │
│  └─────────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────┘
```

On mobile (`useIsMobile`), the grid collapses into `MobileTradingView` with tabbed bottom sheets.

---

## Modals & UX Flows

| Modal | Trigger | Purpose |
|-------|---------|---------|
| `OnboardingModal` | First visit (`hasSeenOnboarding === false`) | 3-step tutorial: TimeWarp concept, Blind Date (no dates), Leverage warning. |
| `ConfirmHighLeverageModal` | Opening position with leverage ≥ 50× | Risk warning requiring explicit confirmation. |
| `LiquidationModal` | `checkPosition` detects liquidation | Red shake animation (Framer Motion). Reveals real historical date range. |
| `EndSimulationModal` | User clicks **End** button | Session summary: real date range, total PnL, return %. |

### Date Reveal Logic

The real historical date range (e.g., `01/12/2017 → 02/01/2018`) is stored as `simulationRealDate` in the store. It is only revealed in:
- `EndSimulationModal` (manual end)
- `LiquidationModal` (forced end)

The format uses `pt-BR` locale: `DD/MM/YYYY → DD/MM/YYYY`.

---

## Authentication

Fake auth using `localStorage` key `ctp-auth-user`. No backend session.

```ts
// src/lib/fake-auth.ts
export function getUser() {
  if (typeof window === "undefined") return null;
  return JSON.parse(localStorage.getItem("ctp-auth-user") || "null");
}
```

All `localStorage` / `window` access is guarded with `typeof window !== "undefined"` for SSR safety.

---

## E2E Testing

Playwright tests live in `e2e/`.

| Spec | ID | Coverage |
|------|----|----------|
| `trading.spec.ts` | `TRADING-01` | Full simulation journey: skip onboarding, loader, chart advancing, pause, new session. |
| `date-reveal.spec.ts` | `DATE-REVEAL` | End button reveals date modal; liquidation modal reveals date via `__tradingStore` injection. |
| `manual-trading.spec.ts` | — | Position lifecycle: open LONG 10× at 50%, increase via slider, decrease via slider, close via panel. |

### Test Helpers

- `_helper.ts` provides `saveEvidence(page, jid, step)` for screenshot capture during CI.
- Tests seed `localStorage` with `hasSeenOnboarding: true` to bypass the tutorial.
- `__tradingStore` global is used to inject a 100× long position with a liquidation price above current market to force liquidation in under 5 seconds.

---

## Important Technical Notes

### Hydration Safety

`/trading/page.tsx` uses a `mounted` state guard to prevent SSR/client mismatch with Zustand `persist`:

```tsx
export default function TradingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  // ... rest of render
}
```

Without this, the server-rendered HTML differs from the client-side hydrated HTML (because persisted store state is only available in the browser), causing React hydration errors.

### SSR & `window` Guards

Every file that accesses `window`, `localStorage`, or `document` is marked `"use client"` and/or wraps access in `typeof window !== "undefined"`.

### Language

Root layout sets `lang="en"`:

```tsx
// src/app/layout.tsx
<html lang="en">
```

### Git Ignore

```gitignore
.next/
node_modules/
test-results/
Kimi_Agent_BTC Daytrade Tycoon Redesign/
```

### Chart Performance

`TradingChart` receives the full `candles` array from the engine but should avoid re-rendering the `lightweight-charts` instance on every tick. Price updates are pushed via the chart's API rather than destroying/recreating the series.

### Binance API Resilience

`fetchCandles` fetches in batches. If a batch returns fewer than 1000 candles, the loop breaks early. If no candles are returned at all, an explicit error is thrown and surfaced in the UI via `engine.error`.

---

## Glossary

| Term | Meaning |
|------|---------|
| **TimeWarp** | The core simulation concept — trading inside a hidden historical window at 60× speed. |
| **Blind Date** | UX principle of hiding all calendar dates/times so the user cannot identify the historical period. |
| **Normalized Price** | Historical candles scaled proportionally to the current live BTC price, preserving percentage returns. |
| **Offset Candles** | First 30 candles consumed before the simulation becomes visible, so the chart is not empty on load. |
| **SMA20** | Simple Moving Average over 20 candles; used for trend classification. |

---

*End of Architecture Document*
