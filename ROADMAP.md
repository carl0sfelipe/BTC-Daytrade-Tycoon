# BTC Daytrade Tycoon — Product Roadmap

A Next.js 14 TimeWarp Trading Simulator that drops users into real historical Bitcoin days (2017–2020) at 60x speed with hidden dates.

> **Current State (May 2026):** Core engine, trading UI, and crypto dark theme are solid. Time to go deeper.

---

## Phase 0 — Quality Hardening *(Current — May 2026)*

Post-bug-fix stabilization. Every feature below was driven by production bugs.

- [x] **Wick-aware liquidation** — `checkPosition` now evaluates `candleLow`/`candleHigh` so intra-candle price action never misses a liquidation.
- [x] **Wick-aware limit orders** — `checkPendingOrders` executes limit orders touched by candle wicks, not just interpolated price.
- [x] **Effective-wallet slider max** — `calcSliderMax` accounts for unrealized PnL, preventing "Insufficient funds" after the user drags to max.
- [x] **Landing page real links** — Replaced `router.push()` buttons with Next.js `<Link>` for SEO, accessibility, and native browser behavior.
- [x] **Integration test suite** — `tradingStore.integration.test.ts`, `wick-scenarios.test.ts`, `tick-processor.test.ts`, and `golden-ticks.ts` (20 scenarios).
- [x] **Contract tests** — Cross-layer compatibility guarantees between engine, store, and transitions.
- [x] **CI pipeline** — GitHub Actions with unit, integration, build, and typecheck jobs.
- [x] **Testing Strategy docs** — `TESTING_STRATEGY.md`, `CONTRACT_TESTS.md`, and `CHANGELOG_2026-05-12.md`.

---

## Phase 1 — Polish & Stability *(Shipped)*

The foundation. These are shipped and battle-tested.

- [x] **TimeWarp engine with real Binance data** — Fetches and caches historical 1-minute candles for seamless playback.
- [x] **Position increase/decrease via slider** — Intuitive drag-to-size controls for quick position adjustments.
- [x] **PnL calculation fix** — Total equity now correctly computed as `wallet + margin + unrealized PnL`.
- [x] **Crypto redesign (dark theme, glow effects, color tokens)** — Full visual overhaul with neon accents and moody chart aesthetics.
- [x] **English localization** — All UI strings extracted and translated.
- [x] **E2E test coverage for core flows** — 4 Playwright tests covering onboarding, trading, date reveal, and liquidation.
- [x] **Limit Orders** — Place pending orders at a specific price. Orders can increase (same side) or reduce/close (opposite side) existing positions.
- [x] **Orders Panel** — Full order history with filter tabs (All / Pending / Filled / Canceled).
- [x] **TP/SL in Simple Mode** — Take Profit and Stop Loss inputs visible in both Simple and Advanced trade modes.
- [x] **Limit Price Stepper** — Quick-adjust limit price with configurable step sizes ($1–$100 + custom).
- [x] **Responsive Layout** — Header, MarketStatus, SimulationClock, and PnLDisplay adapt to smaller screens.
- [x] **Unit Test Suite** — 354+ Vitest tests covering store logic, limit orders, position mechanics, component rendering, engine behavior, order history side tracking, and Reduce Only / Hedge Mode.

---

## Phase 2 — Gameplay Depth *(Next 2–4 weeks)*

Make every session feel unique, replayable, and competitive.

- [ ] **Session replay** — Save simulation state and replay past sessions with full control (play, pause, scrub).
- [ ] **Difficulty presets** — Easy (10x max leverage), Normal (50x), Hard (100x + higher volatility multiplier).
- [ ] **Streak system** — Track consecutive profitable sessions; display fire streak badges.
- [ ] **Daily challenge** — Everyone gets the same random historical day. Compete for best PnL on identical price action.
- [x] **Position partial close** — Close X% of a position instead of all-or-nothing exits (via `reducePosition()` on opposite-side limit orders).
- [x] **Trailing stop-loss** — Auto-adjusting stop that trails the price by a user-defined distance.
- [x] **Reduce Only / Hedge Mode toggle** — `Reduce Only` (default, one-way): opposite-side orders reduce or close the existing position only. When unchecked (hedge mode): opposite-side orders can open a new position on the other side if the size exceeds the current position (e.g., long $50k + short $70k = close long + open short $20k).

### Metrics & Telemetry

- [ ] **Max Drawdown tracking** — Track the worst peak-to-trough decline (as a negative %) for every open position. Updated on every tick. Shown in PositionPanel and included in trade history. Critical metric for prop firm partnerships and trader scoring.
- [ ] **Structured telemetry pipeline** — `src/lib/telemetry/` with batch queue, retry logic, and anonymization (hashed IDs, rounded wallets, truncated timestamps). Separate streams for trade events (自建) and product analytics (PostHog).
- [ ] **Trader Score algorithm** — Composite score based on win rate, Sharpe-like ratio, max drawdown, and consistency. Enables future monetization via prop firm referrals.

> **💡 Insight on Max Drawdown:** This single metric separates hobbyists from professionals. A trader with +50% return and -40% max drawdown is considered high-risk. A trader with +30% return and -5% max drawdown is considered disciplined. Prop firms use this ratio (return / |drawdown|) as their primary hiring signal. For us, it unlocks a data product: "anonymized drawdown patterns of profitable traders" is worth $2k–$5k/month to hedge funds.

### Chart Trading Overlays *(Visual trading directly on the chart)*

- [ ] **Position marker on chart** — Active position shown as a labeled marker on the price axis with side (long/short), size, and entry price. Includes an **X button** to close the position instantly without scrolling to the panel.
- [ ] **Breakeven line** — Horizontal line at the exact price where PnL = $0 (entry ± fees). Color-coded and labeled.
- [ ] **Stop Loss line** — Horizontal dashed line at SL price with label. Visual cue for risk zone.
- [ ] **Take Profit line** — Horizontal dashed line at TP price with label.
- [ ] **Pending orders on chart** — Limit orders displayed as flags/markers at their target price on the chart. Shows order type (buy/sell), size, and side. Tappable to edit or cancel.
- [ ] **Liquidation zone shading** — Area between entry price and liquidation price shaded in red (short) or orange (long) to visualize risk exposure.
- [ ] **Floating PnL label** — Real-time unrealized PnL shown next to the position marker on the chart, updating as price moves.
- [ ] **Crosshair PnL projection** — When hovering/dragging crosshair, show projected PnL at that price point without opening a position.
- [ ] **Draggable TP/SL lines** — Click and drag TP/SL lines directly on the chart to adjust prices, TradingView-style. Confirm with a tap or auto-save after a short delay.
- [ ] **Trade templates / presets** — Save recurring trade configurations (e.g., "Scalp $500 / 25x / TP +2% / SL -1%") as named presets. One tap fills all fields.
- [ ] **Ruler / Measure Tool on chart** — Drag between two price points on the chart to see: distance %, target price, and projected PnL with current leverage. TradingView-style visual analysis before entering.
- [ ] **Desktop hotkeys** — Keyboard shortcuts for power users: B = Buy Long, S = Sell Short, ESC = Close Position, L = Toggle Limit Order mode, +/- = Adjust leverage.
- [ ] **Integrated Position Size Calculator** — Visual risk calculator: set desired risk % of wallet → app auto-calculates position size, shows projected liquidation price, TP profit, and SL loss before confirming the trade.

### Mobile Trading Drawer

- [ ] **Swipe-up trade drawer** — Consolidated mobile trading controls in a bottom sheet (via `vaul`). Replaces cramped sidebar with full-screen trading panel on swipe. Includes quick-close gesture and mini-chart thumbnail.

---

## Phase 3 — Social & Competition *(Next 1–2 months)*

Turn solitary trading into a shared experience.

- [ ] **Real backend + database** — Migrate from localStorage to Supabase or Firebase for persistent data.
- [ ] **Global leaderboard with real player data** — Rankings by total return, win rate, and streak length.
- [ ] **Share session results** — Generate Twitter/X cards with session stats and a screenshot of the final chart.
- [ ] **Challenge friends** — Generate a shareable link to a specific historical day and invite others to beat your score.
- [ ] **Player profiles with stats** — Total sessions, average return, favorite leverage, best/worst trades.

---

## Phase 4 — Content & Education *(Next 2–3 months)*

Help players learn to trade by connecting gameplay to real history and concepts.

- [ ] **Tutorial mode** — Guided first trade with step-by-step overlays and explanations.
- [ ] **Historical events overlay** — Contextual labels on the chart (e.g., "Bitcoin halving here", "SEC ETF approval").
- [ ] **Market regime labels** — Auto-detected phases: bull market, bear market, accumulation, distribution.
- [ ] **Educational tooltips** — Every UI element explains what it does and why it matters.
- [ ] **Glossary of trading terms** — In-app dictionary for leverage, liquidation, margin, funding rate, etc.

---

## Phase 5 — Advanced Features *(Future)*

The long-term vision. These expand scope significantly.

- [ ] **Multiple timeframes on chart** — Switch between 15m, 1h, 4h, and 1d views mid-simulation.
- [ ] **Multiple trading pairs** — Expand beyond BTC to ETH, SOL, BNB, and other top assets.
- [ ] **Options / futures simulation** — Beyond perpetuals: simulate expiry dates and option Greeks.
- [ ] **AI trading bot opponents** — Compete against algorithmic traders with different strategies.
- [ ] **Custom indicators on chart** — RSI, MACD, Bollinger Bands, Volume Profile overlays.
- [ ] **Export trades to CSV / JSON** — Download full trade history for external analysis.
- [ ] **Dark / light theme toggle** — User preference beyond the default crypto dark mode.
- [ ] **Sound effects & haptic feedback** — Audio cues for fills, liquidations, and milestone achievements.
- [ ] **PWA support** — Offline mode with cached historical data, installable on mobile home screens.
- [ ] **WebSocket real-time mode** — Optional 1x speed mode to trade the actual live market.

---

## Technical Debt & Refactoring

Ongoing housekeeping to keep the codebase fast and maintainable.

- [ ] **Unify `price` / `currentPrice` in store** — Eliminate dual price sources causing subtle sync bugs.
- [ ] **Add proper error boundaries** — Graceful crash recovery instead of blank screens.
- [ ] **Migrate fake auth to real auth** — OAuth2 / JWT integration (GitHub, Google, X login).
- [ ] **Add Sentry for error tracking** — Real-time production error monitoring and alerting.
- [ ] **Performance: virtualize trade history list** — React Window or similar for long trade logs.
- [ ] **Add React Query for API caching** — Deduplicate Binance requests and add stale-while-revalidate logic.
- [ ] **Migrate from lightweight-charts v5 to v6** — When v6 hits stable, adopt new APIs and performance improvements.

---

> *"The goal is simple: make the best damn Bitcoin trading simulator on the web."*
