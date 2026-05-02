# BTC Daytrade Tycoon (Crypto Tycoon Pro)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build Passing" />
  <img src="https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square" alt="Tests Passing" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License MIT" />
</p>

<p align="center">
  <b>A high-stakes Bitcoin futures trading simulator powered by real historical market data.</b><br/>
  No dates. No bias. Just you, the chart, and the market.
</p>

---

## 📸 Demo & Screenshots

> _Screenshots and demo videos will be added here soon._

```
┌──────────────────────────────────────────────┐
│  🕰️ TimeWarp Trading Simulator                │
│                                               │
│  You are dropped into a random real Bitcoin   │
│  trading day between Dec 2017 and Dec 2020.   │
│  Time runs 60× faster. The date is hidden.    │
│  Can you survive without knowing the future?  │
└──────────────────────────────────────────────┘
```

---

## ✨ Features

- 🕰️ **TimeWarp Trading Simulator** — Experience a random real Bitcoin trading day (Dec 2017 – Dec 2020) with time running **60× faster** (1 real second = 1 simulated minute). The historical date is completely hidden — no time axis, no calendar — forcing you to trade purely on price action.
- 📈 **Real-Time Candlestick Chart** — Powered by `lightweight-charts` v5 with a live liquidation price overlay.
- 📖 **Synthetic Order Book** — Real-time depth visualization to gauge market sentiment.
- 💼 **Position Panel** — Track unrealized P&L, entry price, margin used, liquidation price, and a dynamic risk gauge.
- ⚙️ **Trade Controls** — Simple and Advanced modes, leverage pills (2x–100x), size slider/pills, and TP/SL inputs.
- 💰 **Wallet & P&L Stats** — Monitor total equity, session P&L, win rate, and best/worst trades.
- 📜 **Trade History Timeline** — Complete session log of every trade decision.
- ⏯️ **Simulation Controls** — Play, pause, end, and reset the simulation clock at any time.
- 💀 **Liquidation Modal** — When you get rekt, the real historical date is revealed — learn from history.
- 🏁 **End Simulation Modal** — Full session summary with performance breakdown.
- 🎓 **Onboarding Modal** — 3-step interactive tutorial for first-time traders.
- 📱 **Mobile Trading View** — Bottom sheet + tabs for trading on the go.
- 🏠 **Landing Page** — Polished marketing page with feature highlights.
- 🔐 **Auth Pages** — Login and signup flows with simulated authentication.
- 🏆 **Leaderboard & Achievements** — Compete and unlock milestones.
- ⚠️ **High-Leverage Confirmation** — Safety modal for trades ≥50x leverage.
- 🔥 **Streak Tracking** — Utility to monitor consecutive wins/losses.

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
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) primitives |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Data Fetching** | Axios + SWR |
| **Testing (Unit)** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| **Testing (E2E)** | [Playwright](https://playwright.dev/) |
| **Build Tool** | Next.js built-in (Turbopack ready) |

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

Our Playwright E2E suite includes **4 comprehensive tests**:

1. **Full Simulation Journey** — End-to-end flow from landing page to simulation completion.
2. **Historical Date Reveal** — Validates that the real trading date is correctly hidden during simulation and revealed upon liquidation.
3. **Liquidation Modal** — Ensures the liquidation flow triggers correctly with accurate session summary.
4. **Manual Position Lifecycle** — Covers opening, increasing, decreasing, and closing a position manually.

Run tests in headed mode for debugging:

```bash
npx playwright test --headed
```

---

## 🏗️ Architecture Overview

BTC Daytrade Tycoon follows a **feature-based modular architecture** inside the Next.js 14 App Router.

- **App Router (`src/app/`)** — Route segments for landing, trading, auth, leaderboard, and achievements.
- **State Management (`src/store/`)** — Zustand stores with persist middleware handle simulation state, wallet, positions, and UI modals.
- **Data Layer (`src/lib/`)** — Binance API integration fetches ~2,000 1-minute historical candles and normalizes them to the current BTC price context.
- **Components (`src/components/`)** — Organized by domain: `trading/`, `pages/`, `layout/`, and reusable `ui/` (Radix-based).
- **Hooks (`src/hooks/`)** — Custom React hooks for simulation timing, chart synchronization, and streak tracking.
- **Utilities (`src/utils/`)** — Helper functions for P&L calculations, liquidation math, and formatting.
- **Types (`src/types/`)** — Centralized TypeScript definitions for trades, positions, candles, and simulation config.

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
│   │   ├── trading/              # Chart, order book, position panel, controls
│   │   └── ui/                   # Reusable shadcn/Radix UI primitives
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # API clients, data fetchers, constants
│   ├── store/                    # Zustand state stores
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

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with 💚 and caffeine. Trade safe. 🚀
</p>
