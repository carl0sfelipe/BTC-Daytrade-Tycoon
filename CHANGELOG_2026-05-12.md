# Changelog — 2026-05-12

## Bug Fixes

### Trading Engine

- **Liquidation via candle wicks**
  - `processTick` now returns `candleLow` and `candleHigh` from the active candle.
  - `checkPosition` evaluates liquidation against the full candle range
    (`effectiveLow = min(price, candleLow)`, `effectiveHigh = max(price, candleHigh)`),
    preventing missed liquidations when the interpolated price never reaches the liq level.
  - Files: `src/lib/engine/tick-processor.ts`, `src/store/slices/positionSlice.ts`

- **Limit order execution via candle wicks**
  - `checkPendingOrders` now considers `candleLow`/`candleHigh` when deciding
    whether a limit order (open, TP, or SL) should execute.
  - Fixes cases where a long limit below the interpolated path or a short limit
    above it would never fill despite the candle wick touching the limit price.
  - Files: `src/store/slices/ordersSlice.ts`, `src/hooks/useTimewarpEngine.ts`

- **Slider max for flip accounts for unrealized PnL**
  - `calcSliderMax` in `src/lib/trading/margin.ts` now calculates
    `effectiveWallet = wallet + returnedMargin + closePnl` before determining
    the maximum flip size. Prevents the UI from letting users select a size
    that the store will reject as "Insufficient funds to flip".
  - Removed duplicate `calcSideMax` from `TradeControls.tsx`; all slider-max
    logic now lives in `margin.ts`.
  - Files: `src/lib/trading/margin.ts`, `src/components/trading/TradeControls.tsx`

### Landing Page

- **Navigation links now use real anchor tags**
  - Converted all navbar and CTA buttons from `<button onClick={router.push}>`
    to Next.js `<Link>` components. Fixes broken behavior for:
    - Open in new tab
    - Middle-click
    - Ctrl/Cmd + click
    - SEO crawlability
    - No-JS navigation
  - Files: `src/components/pages/LandingPage.tsx`

## Content Updates

- Updated home page copy from "2017–2020" to "2020–2025" across hero, feature cards, and Blind Date description.

## Tests

- Added `src/lib/engine/tick-processor.test.ts` — tests `processTick` returning candle ranges.
- Added `src/lib/engine/wick-scenarios.test.ts` — deterministic scenario table covering:
  - Long/short liquidation via low/high wicks
  - Long/short safety when wicks stay beyond liq
  - Limit fill / no-fill via wicks
  - TP/SL hit via wicks
- Added `src/store/tradingStore.integration.test.ts` — integration tests reproducing the 3 reported bugs.
- Added `src/hooks/trade-controls/useOrderCapabilities.test.ts` — `canFlip` behavior with unrealized loss vs profit.
- Updated `src/lib/trading/margin.test.ts` — `calcSliderMax` now tests effective-wallet calculation including PnL.

## Architecture

- Added `getCurrentCandle` to `src/lib/binance-api.ts` for retrieving the active candle at a given simulated time.
- `TickResult` interface expanded with `candleLow: number` and `candleHigh: number`.

## Documentation

- Updated `ARCHITECTURE.md` with:
  - Wick-aware interpolation and position check details
  - `TickResult` interface documentation
  - Testing Pyramid section (Unit / Integration / E2E)
- Updated `AGENTS.md` with:
  - Testing Pyramid definition of done
  - Integration test canonical file locations
  - Test baseline: 348 passed, 4 skipped

## Additional Fixes (evening session)

### TP/SL Wick Awareness
- `checkPosition` now evaluates **Take Profit** and **Stop Loss** against `effectiveLow`/`effectiveHigh`, not just `currentPrice`.
- This prevents TP/SL from being missed when the candle wick touches the target but the interpolated close price does not.
- Files: `src/store/slices/positionSlice.ts`

### Contract Tests Hardening
- Fixed `src/contracts/orders-position-contract.test.ts` — corrected limit-order execution expectation (long limit at 52000 with price 49000 *should* execute since 49000 ≤ 52000).
- Fixed `src/contracts/store-transitions-contract.test.ts` — corrected TP/SL values for short position (TP below entry, SL above entry).
- Added missing `beforeEach` import in both contract test files.

### Golden Ticks Regression Suite
- Added `src/test/golden-ticks.ts` — 20 deterministic tick scenarios covering liquidation, limit fill, TP/SL wick hits, trailing stop, and edge cases.
- Added `src/test/golden-ticks.test.ts` — processes each scenario through `processTick` and store checks, asserting expected outcomes.

### Integration Test Command
- Added `test:integration` to `package.json` — runs the canonical integration + contract + golden-ticks suite in one command.

### UX Prototypes

**Capacity Slider (`src/components/trading/trade-controls/CapacitySlider.tsx`)**
- Visual zones on the position-size slider indicating risk/capacity levels:
  - 🟢 Safe — can open/increase without touching existing position
  - 🟡 Flip — requires closing/reducing existing position
  - 🔴 Max — absolute max including unrealized PnL (effective wallet)
- Uses CSS gradient backgrounds on the native `<input type="range">` track.
- Not yet wired into `SizeSelector`; activate by feature flag or direct import.

**Debug Chart Overlay (`src/hooks/chart/useDebugOverlay.ts`, `src/components/trading/ChartOverlays.tsx`)**
- Dev-only price lines showing current candle **low** (blue dotted) and **high** (amber dotted).
- Dev-only DOM badge in chart corner showing `H {high} L {low} Δ{range}`.
- Gated by `process.env.NODE_ENV !== "production"` — zero production impact.
- Files: `src/hooks/chart/useDebugOverlay.ts`, `src/components/trading/TradingChart.tsx`, `src/components/trading/ChartOverlays.tsx`, `src/hooks/chart/index.ts`

### Quality Metrics
- Added `docs/BER_METRIC.md` — Bug Escape Rate definition, classification rules, dashboard spec (3-phase roadmap), historical baseline, and action triggers.

### Test Baseline
- **393 passed, 4 skipped** (was 348 → 354 → 390 → 393)

---

*Compiled from Party Mode Retrospective action items. All 9 items completed.*
