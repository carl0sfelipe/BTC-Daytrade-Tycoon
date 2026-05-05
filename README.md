# BTC Daytrade Tycoon (Crypto Tycoon Pro)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build Passing" />
  <img src="https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square" alt="Tests Passing" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square" alt="License Apache 2.0" />
</p>

<p align="center">
  <b>A high-stakes Bitcoin futures trading simulator powered by real historical market data.</b><br/>
  No dates. No bias. Just you, the chart, and the market.
</p>

---

## 🌐 Live Demo

**[→ btc-daytrade-tycoon.vercel.app](https://btc-daytrade-tycoon.vercel.app/)**

## 📸 Demo & Screenshots

<p align="center">
  <img src="./demo.gif" alt="BTC Daytrade Tycoon Demo" width="800" />
</p>

```
_________________________________________________________________ 
  / [!] SYSTEM: TIMEWARP ENGAGED                                    \
┌───────────────────────────────────────────────────────────────────┐
│   @% @. %=%    [-/-=, + =-, [+]    (##%%)          _______        │
│   #######─── TIME MACHINE CONSOLE ────────────────|       |       │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │                                                               │ │
│ │          >>> TIMEWARP TRADING SIMULATOR <<<                   │ │
│ │                                                               │ │
│ │   You are dropped into a random real Bitcoin trading day      │ │
│ │   between Dec 2017 and Dec 2025. Time runs 60x faster.        │ │
│ │   The exact date is hidden.                                   │ │
│ │                                                               │ │
│ │   [ REAL MOVEMENTS & REAL-TIME PRICES ]                       │ │
│ │   To kill all hindsight bias, historical movements are real,  │ │
│ │   but the price is offset to match today's levels.            │ │
│ │                                                               │ │
│ │   Can you survive without knowing the future?                 │ │
│ │                                                               │ │
│ └───────────────────────────────────────────────────────────────┘ │
│   #######%@###     >>> INITIATE JUMP <<<   :[ | | | | | | ]:      │
└───────────────────────────────────────────────────────────────────┘
  \_________________________________________________________________/
```

---

## ✨ Features

- 🕰️ **TimeWarp Trading Simulator** — Experience a random real Bitcoin trading day (Dec 2017 – Dec 2025) with time running **60× faster** (1 real second = 1 simulated minute). The historical date is completely hidden — no time axis, no calendar — forcing you to trade purely on price action.
- 📈 **Real-Time Candlestick Chart** — Powered by `lightweight-charts` v5 with a live liquidation price overlay.
- 💼 **Position Panel** — Track unrealized P&L, realized P&L from partial closes, entry price, margin used, liquidation price, dynamic risk gauge, distance-to-liquidation bar, and pending orders.
- ⚙️ **Trade Controls** — Simple and Advanced modes, leverage pills (2x–100x), order-centric size slider (controls order delta, not total position size), **TP/SL visible in both modes**, **Market & Limit order types**.
- 🎯 **Limit Orders** — Place orders at a specific price. Orders stay pending until the market hits your level. Limit orders can **increase** (same side) or **reduce/close** (opposite side) existing positions. Includes a **stepper** with configurable step size ($1–$100 + custom) for quick price adjustment.
- 📋 **Orders Panel** — Full order history with filter tabs (All / Pending / Filled / Canceled). Correctly tracks operation side (e.g. SHORT reducing a LONG position) in the history.
- 💰 **Wallet & P&L Stats** — Monitor total equity, session realized P&L, unrealized P&L, win rate, and best/worst trades.
- 📜 **Trade History Timeline** — Complete session log of every trade decision.
- ⏯️ **Simulation Controls** — Play, pause, end, and reset the simulation clock at any time.
- 🕵️ **Blind Date Rule** — The real historical date is completely hidden during simulation. Only revealed upon liquidation or manual end. Once revealed, you cannot return to the simulation.
- 🔄 **Reduce Only / Hedge Mode Toggle** — Default "Reduce Only" mode: opposite-side orders only reduce/close the existing position. Switch to "Hedge Mode" to allow flips (e.g. long $50k → short $70k closes long and opens short $20k).
- 💀 **Liquidation Modal** — When you get rekt, the real historical date is revealed — learn from history.
- 🏁 **End Simulation Modal** — Full session summary with performance breakdown.
- 🎓 **Onboarding Modal** — 3-step interactive tutorial for first-time traders.
- 📱 **Responsive Mobile Trading View** — Fully responsive layout with bottom sheet + tabs for trading on the go.
- 🏠 **Landing Page** — Polished marketing page with feature highlights.
- 🔐 **Auth Pages** — Login and signup flows with simulated authentication.
- 🏆 **Leaderboard & Achievements** — Compete and unlock milestones.
- ⚠️ **High-Leverage Confirmation** — Safety modal for trades ≥50x leverage.
- 🔥 **Streak Tracking** — Utility to monitor consecutive wins/losses.
- 🧪 **Unit Test Suite** — 65+ Vitest tests across store logic, limit orders, position mechanics, component rendering, engine behavior, order history side tracking, and Reduce Only / Hedge Mode.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **UI Library** | [React 18](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v3](https://tailwindcss.com/) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) (with persist middleware) |
| **Charts** | [lightweight-charts](https://tradingview.github.io/lightweight-charts/) v5 |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) primitives + [shadcn/ui](https://ui.shadcn.com/) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) |
| **Data Fetching** | Native `fetch` (Binance REST API) |
| **Testing (Unit)** | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) |
| **Testing (E2E)** | [Playwright](https://playwright.dev/) |
| **Build Tool** | Next.js built-in |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (recommended: 20 LTS)
- [npm](https://www.npmjs.com/) 9+ or [pnpm](https://pnpm.io/)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/btc-daytrade-tycoon.git
cd btc-daytrade-tycoon

# Install dependencies
npm install
```

### Development

```bash
# Start the development server (runs on port 3000 by default)
npm run dev
```

> Next.js will auto-detect an available port if 3000 is already in use. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npx tsc --noEmit
```

---

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

Runs the [Vitest](https://vitest.dev/) suite covering core utilities, store logic, and React components.

### End-to-End Tests

```bash
npx playwright test
```

Our Playwright E2E suite includes **4 spec files**:

1. **`trading.spec.ts`** — Full simulation journey: skip onboarding, loader, chart advancing, pause, new session.
2. **`date-reveal.spec.ts`** — Validates that the real trading date is correctly hidden during simulation and revealed upon liquidation.
3. **`manual-trading.spec.ts`** — Covers opening, increasing, decreasing, and closing a position manually.
4. **`production-bar.spec.ts`** — Smoke test against live Vercel deployment verifying the distance-to-liquidation bar moves as price changes during simulation.

Run tests in headed mode for debugging:

```bash
npx playwright test --headed
```

---

## 🏗️ Architecture Overview

BTC Daytrade Tycoon follows a **feature-based modular architecture** inside the Next.js 14 App Router.

- **App Router (`src/app/`)** — Route segments for landing, trading, auth, leaderboard, and achievements.
- **State Management (`src/store/`)** — Zustand stores with persist middleware handle simulation state, wallet, positions, and UI modals.
- **Data Layer (`src/lib/`)** — Binance API integration fetches historical 1-minute candles and normalizes them to the current BTC price context.
- **Components (`src/components/`)** — Organized by domain: `trading/`, `pages/`, `layout/`, and reusable `ui/` (Radix-based).
- **Hooks (`src/hooks/`)** — Custom React hooks for simulation timing, chart synchronization, and streak tracking.
- **Utilities (`src/utils/`)** — Helper functions for P&L calculations, liquidation math, and formatting.
- **Types (`src/types/`)** — Centralized TypeScript definitions for trades, positions, candles, and simulation config.
- **Tests (`src/**/*.test.{ts,tsx}`)** — Vitest unit tests for store logic, engine behavior, and component rendering.

---

## 📁 Project Structure

```
btc-daytrade-tycoon/
├── e2e/                          # Playwright E2E tests
│   ├── _helper.ts
│   ├── date-reveal.spec.ts
│   ├── manual-trading.spec.ts
│   └── trading.spec.ts
├── public/                       # Static assets
│   └── chatgpt-extractor.js
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── achievements/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── leaderboard/
│   │   ├── trading/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/               # React components
│   │   ├── layout/               # Shell, navbar, footer
│   │   ├── pages/                # Page-level sections
│   │   ├── trading/              # Chart, position panel, controls, orders panel, P&L display
│   │   └── ui/                   # Reusable shadcn/Radix UI primitives
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # API clients, data fetchers, constants
│   ├── store/                    # Zustand state stores
│   ├── test/                     # Test setup (localStorage mock for zustand persist)
│   ├── types/                    # TypeScript interfaces & types
│   └── utils/                    # Formatters, math helpers, streak tracker
├── components.json               # shadcn/ui configuration
├── middleware.ts                 # Next.js middleware
├── next.config.mjs
├── playwright.config.ts
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code passes TypeScript checks and all tests before submitting:

```bash
npx tsc --noEmit && npm run test && npx playwright test
```

---

## 📄 License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](./LICENSE) file for details.

> Note: This license applies to the frontend code in this repository. The backend/API layer (when implemented) will be distributed under a separate commercial license.

---

<p align="center">
  Built with 💚, Qwen 3.6 35b 4q, caffeine, Opus 4.7 and Deepseek v4 pro
  </p>
  <p align="center">
  Trade safe. 🚀
</p>
