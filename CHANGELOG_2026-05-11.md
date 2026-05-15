# Changelog — 2026-05-11

## Store Refactor: Monolith → Slices + Pure Transitions

**Status:** ✅ Merged | **Baseline:** 314 passed, 4 skipped | **Build:** ✅

---

### Summary

Decomposed `src/store/tradingStore.ts` from a 1,183-line monolith into 6 Zustand slices + pure transition functions. Zero breaking changes to `useTradingStore((s) => s.xxx)` selectors.

### Files Changed

#### Created

| File | Lines | Responsibility |
|------|-------|----------------|
| `src/store/slices/marketSlice.ts` | ~30 | Price, volatility, trend, priceHistory |
| `src/store/slices/sessionSlice.ts` | ~40 | Wallet, difficulty, leverage, onboarding flags |
| `src/store/slices/historySlice.ts` | ~20 | closedTrades, realizedPnL |
| `src/store/slices/uiSlice.ts` | ~25 | isLoading, lastCloseReason, isLiquidated, errors |
| `src/store/slices/ordersSlice.ts` | ~190 | pendingOrders, ordersHistory, checkPendingOrders |
| `src/store/slices/positionSlice.ts` | ~380 | position + actions (thin orchestrator) |
| `src/store/types.ts` | ~20 | TradingStore = intersection of all slices |
| `src/store/domain-types.ts` | ~60 | Position, Trade, PendingOrder, OrderHistoryItem |
| `src/lib/trading/transitions.ts` | ~340 | computeClosePosition, computeHedgeFlip, computeReduceOrClose, computeFreshOpen |
| `src/lib/trading/position-adjust.ts` | ~165 | computePartialReduce, computeAddToPosition, computeSizeIncrease |
| `src/lib/trading/validation.ts` | ~90 | validateTpSl, validateTpSlCurrentPrice, validateOpenPosition |
| `src/lib/trading/position-builders.ts` | ~150 | buildTrade, buildNewPosition, buildOrderHistoryItem, buildPendingOrder |
| `AGENTS.md` | ~120 | Project-wide code standards (functions 4–20 lines, files <500 lines, SRP) |

#### Modified

| File | Before | After | Change |
|------|--------|-------|--------|
| `src/store/tradingStore.ts` | 1,183 lines | 80 lines | Compositor only — spreads slices + persist |
| `ARCHITECTURE.md` | 519 lines | ~580 lines | Added Slice + Pure Transitions section |

#### Removed

- `formatStoreState` debug helper (superseded by `window.__tradingStore`)

---

### Pattern: Slice + Pure Transitions

```ts
// Slice — thin orchestrator
const createPositionSlice: StateCreator<TradingStore, [], [], PositionSlice> =
  (set, get) => ({
    position: null,
    openPosition: (side, leverage, size, tp, sl, limit) => {
      const state = get();
      const patch = computeFreshOpen(
        state.wallet, side, state.currentPrice, size, leverage,
        parseFloat(tp), parseFloat(sl), state.ordersHistory, limit
      );
      set(patch);
    },
  });

// Compositor — no logic, only spread + persist
export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get, store) => ({
      ...createMarketSlice(set, get, store),
      ...createSessionSlice(set, get, store),
      ...createHistorySlice(set, get, store),
      ...createUISlice(set, get, store),
      ...createOrdersSlice(set, get, store),
      ...createPositionSlice(set, get, store),
    }),
    { name: "trading-storage", /* migrate, partialize */ }
  )
);
```

### Key Decisions

1. **API Freeze:** `useTradingStore((s) => s.xxx)` selectors in 40+ components must never change.
2. **Cross-slice calls:** `ordersSlice.checkPendingOrders()` uses `get().closePosition("tp")` at runtime.
3. **Pure transitions:** Each `compute*` function receives a snapshot and returns a `Partial<TradingStore>` patch.
4. **File limits:** All files stay under 500 lines. Monolith split because it exceeded the limit.

### Test Impact

- **Before:** 314 passed, 4 skipped
- **After:** 314 passed, 4 skipped
- `src/store/tradingStore.test.ts`: 67/67 passed

No test modifications were required — the public API is unchanged.

---

### Action Items (from BMad Party Mode 2026-05-11)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Atualizar `ARCHITECTURE.md` com padrão Slice + Pure Transitions | Paige | ✅ Done |
| 2 | Criar `CHANGELOG_2026-05-11.md` | Paige | ✅ Done |
| 3 | Criar `AGENTS.md` com code standards | Paige | ✅ Done |
| 4 | Extrair `computeTpSlUpdate` e `computeTrailingStopCheck` para `transitions.ts` | Amelia | 🔲 Pending |
| 5 | Spike: modelo de dados para múltiplas posições (Hedge Mode) | Winston | 🔲 Pending |

### Refatorações Críticas Concluídas (2026-05-11 #2)

| Arquivo | Antes | Depois | Extraído para |
|---------|-------|--------|---------------|
| `src/hooks/useTimewarpEngine.ts` | 406 linhas | **263 linhas** | `lib/engine/time-formatters.ts`, `session-loader.ts`, `tick-processor.ts`, `hooks/engine/useE2EHelpers.ts` |
| `src/components/trading/PositionPanel.tsx` | 376 linhas | **109 linhas** | `position-panel/` (10 sub-componentes) |
