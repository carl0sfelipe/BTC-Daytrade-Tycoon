# Testing Strategy — BTC Daytrade Tycoon

> **Status:** Active law. Every code change must comply.

---

## Testing Pyramid

The project follows a **3-level testing strategy** designed to catch bugs at the lowest possible cost.

```
        ▲
       / \     E2E (Playwright)
      /   \    User flows, critical paths
     /─────\
    /       \   Integration (Vitest)
   /         \  Engine + Store + candles
  /───────────\
 /             \ Unit (Vitest + RTL)
/               \ Functions, hooks, components
─────────────────
```

| Level | Tool | Scope | When Required | Execution |
|-------|------|-------|---------------|-----------|
| **Unit** | Vitest + React Testing Library | Pure transitions, validators, builders, hooks in isolation | Every new function | `npm run test` |
| **Integration** | Vitest | Engine + Store + candles running ticks together | Every bug fix in trading logic; every change to `tradingStore.ts` or `tick-processor.ts` | `npm run test:integration` |
| **E2E** | Playwright | Full user flows via UI | Every user-facing feature; every critical path | `npm run test:e2e` |

---

## Level 1 — Unit Tests

### What to test

- Pure transition functions (`compute*`, `validate*`, `build*`)
- Store slices in isolation (with `setState` injection)
- React hooks (with `renderHook`)
- UI components (with React Testing Library)

### Rules

- Every new function gets a test.
- Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes, not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable, self-validating, timely.

### Example

```ts
// src/lib/trading/margin.test.ts
it("returns effective wallet * leverage in hedge mode considering unrealized loss", () => {
  const position = { size: 5000, side: "long", entry: 50000, leverage: 10 };
  expect(calcSliderMax(position as any, 9500, 10, "short", false, 48000)).toBe(98000);
});
```

---

## Level 2 — Integration Tests

### What to test

- The engine simulates ticks and the store reacts correctly.
- Candles with wicks trigger liquidation, limit orders, TP, and SL.
- Order of operations: `checkPendingOrders` before `checkPosition` on each tick.

### Rules

- Use real candle shapes (with `high`, `low`, `open`, `close`).
- Simulate at least 10 consecutive ticks for time-dependent logic.
- Inject state via `useTradingStore.setState()`, never mock slices.
- Each scenario must be deterministic and reproducible.

### Canonical test files

| File | Coverage |
|------|----------|
| `src/store/tradingStore.integration.test.ts` | Limit reduce, flip with loss, liquidation via wicks |
| `src/lib/engine/wick-scenarios.test.ts` | Deterministic table: 9 candle shapes × outcomes |
| `src/lib/engine/tick-processor.test.ts` | `processTick` returns `candleLow`/`candleHigh` |

### Example

```ts
// src/lib/engine/wick-scenarios.test.ts
it("LONG liq via low: candle dips below liquidation price", () => {
  const candles = [makeCandle(0, 50000, 51000, 44000, 49000)];
  const tick = processTick({ startDate, currentCandles: candles, simulationStartRealTime: Date.now() });
  expect(tick.price).toBeGreaterThan(45000);    // interpolated
  expect(tick.candleLow).toBe(44000);           // wick touched liq
  expect(tick.candleLow).toBeLessThan(45000);
});
```

---

## Level 3 — E2E Tests

### What to test

- Full user journeys: open position, manage, close, liquidate.
- Date reveal mechanics.
- Limit order creation, execution, and cancellation.
- Mobile responsive flows.

### Rules

- Seed `localStorage` with `hasSeenOnboarding: true` to bypass tutorial.
- Use `__tradingStore` global to inject deterministic state.
- Capture screenshots on failure via `saveEvidence()`.

### Canonical spec files

| Spec | ID | Coverage |
|------|----|----------|
| `e2e/trading.spec.ts` | `TRADING-01` | Full simulation journey |
| `e2e/date-reveal.spec.ts` | `DATE-REVEAL` | End / liquidation reveals date |
| `e2e/manual-trading.spec.ts` | — | Position lifecycle via slider |
| `e2e/limit-orders.spec.ts` | `LIMIT-ORDERS` | Create, cancel, execute limits |
| `e2e/hedge-mode.spec.ts` | `HEDGE-MODE` | Reduce Only toggle, flip position |

---

## Bug Fix Rule

> **A bug fix in trading logic must ship with unit + integration tests.**
>
> E2E is required when the bug is reproducible via UI interaction.

| Bug type | Unit | Integration | E2E |
|----------|------|-------------|-----|
| Pure math error (PnL calc) | ✅ | — | — |
| Store state mutation | ✅ | ✅ | — |
| Engine-store interaction | ✅ | ✅ | — |
| UI button not clickable | — | — | ✅ |
| Limit order not executing | ✅ | ✅ | ✅ |

---

## Running Tests

```bash
# All tests (unit + integration)
npm run test

# Unit only
npx vitest run src/lib src/store src/hooks src/components

# Integration only
npm run test:integration

# E2E
npm run test:e2e

# E2E mobile
npm run test:e2e:mobile

# Everything
npm run test:all
```

---

## Golden Ticks

`src/test/golden-ticks.ts` contains 50 pre-computed tick scenarios used as regression snapshots.

When a developer changes the engine or store logic, they run:

```bash
npx vitest run src/test/golden-ticks.test.ts --update
```

Any diff must be justified in the PR description.

---

## Quality Metrics

| Metric | Target | How to measure |
|--------|--------|----------------|
| Unit test coverage | > 80% | `npx vitest run --coverage` |
| Integration test scenarios | ≥ 50 | `src/test/golden-ticks.ts` |
| E2E critical paths | 100% | `e2e/*.spec.ts` must pass |
| Bug Escape Rate (BER) | < 0.1 | Bugs in prod / bugs found in dev |

---

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. `lint-and-typecheck` — TypeScript strict check
2. `unit-tests` — All unit tests
3. `integration-tests` — Engine + store integration suite
4. `build` — Next.js production build

All 4 jobs must pass before merge.
