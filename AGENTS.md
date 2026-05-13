# Agent Instructions — BTC Daytrade Tycoon

> **Status:** Active law. Every code change must comply.

---

## Code Style

- **Functions:** 4–20 lines. Split if longer.
- **Files:** under 500 lines. Split by responsibility.
- **One thing per function, one responsibility per module (SRP).**
- **Names:** specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- **Types:** explicit. No `any`, no `Dict`, no untyped functions.
- **No code duplication.** Extract shared logic into a function/module.
- **Early returns** over nested ifs. Max 2 levels of indentation.
- **Exception messages** must include the offending value and expected shape.

## Comments

- **Keep your own comments.** Don't strip them on refactor — they carry
  intent and provenance.
- **Write WHY, not WHAT.** Skip `// increment counter` above `i++`.
- **Docstrings on public functions:** intent + one usage example.
- **Reference issue numbers / commit SHAs** when a line exists because
  of a specific bug or upstream constraint.

## Tests

- **Tests run with a single command:** `npm run test`.
- **Every new function gets a test.** Bug fixes get a regression test.
- **Mock external I/O** (API, DB, filesystem) with named fake classes,
  not inline stubs.
- **Tests must be F.I.R.S.T:** fast, independent, repeatable,
  self-validating, timely.

### Testing Pyramid (3 Levels)

| Level | Scope | When Required |
|-------|-------|---------------|
| **Unit** | Pure transitions, validators, hooks in isolation | Every new function |
| **Integration** | Engine + Store + candles running ticks together | Every bug fix in trading logic |
| **E2E** | Full user flows via Playwright | Every user-facing feature |

**Bug fix rule:** A trading logic bug fix must ship with **unit + integration** tests.
E2E is required when the bug is reproducible via UI.

**Integration test location:** `src/store/tradingStore.integration.test.ts` and
`src/lib/engine/wick-scenarios.test.ts` are the canonical files for engine-store
integration tests.

## Dependencies

- **Inject dependencies** through constructor/parameter, not global/import.
- **Wrap third-party libs** behind a thin interface owned by this project.

## Structure

- **Follow the framework's convention** (Next.js App Router, React 18, etc.).
- **Prefer small focused modules** over god files.
- **Predictable paths:** `src/app/`, `src/components/`, `src/hooks/`,
  `src/lib/`, `src/store/`, `src/test/`, `e2e/`.

## Formatting

- **Use the language default formatter** (`prettier`).
  Don't discuss style beyond that.

## Logging

- **Structured JSON** when logging for debugging / observability.
- **Plain text** only for user-facing CLI output.

---

## Project-Specific Conventions

### Store Architecture (Zustand)

This project uses the **Slice + Pure Transitions** pattern.

```
src/store/
├── tradingStore.ts          # Compositor (pure — no logic, only spread + persist)
├── types.ts                 # TradingStore = intersection of all slices
├── domain-types.ts          # Position, Trade, PendingOrder, OrderHistoryItem
└── slices/
    ├── marketSlice.ts
    ├── sessionSlice.ts
    ├── historySlice.ts
    ├── uiSlice.ts
    ├── ordersSlice.ts
    └── positionSlice.ts     # Thin orchestrator — delegates to pure transitions
```

**Rules:**
1. Slices use `StateCreator<TradingStore, [], [], SliceType>`.
2. Each slice owns its state + actions. Cross-slice calls use `get().action()`.
3. Complex state mutations are extracted to **pure transition functions** in `src/lib/trading/transitions.ts` (or adjacent files).
4. A transition function receives a typed snapshot and returns a `Partial<TradingStore>` patch. No side effects. No `set`/`get`.
5. API Freeze: `useTradingStore((s) => s.xxx)` selectors in 40+ components must never change without a major version bump.

### File Size Limits

| Type | Max Lines |
|------|-----------|
| Slice | 500 |
| Transition (pure fn) | 500 |
| Component | 500 |
| Test file | 500 |
| Hook | 500 |

If a file exceeds the limit, split by responsibility before merging.

### Naming Conventions

- Slices: `createXxxSlice` function + `XxxSlice` interface.
- Transitions: `computeXxx` prefix for pure state-computing functions.
- Validations: `validateXxx` prefix, return `string | null` (error message).
- Builders: `buildXxx` prefix for factory functions.

### Test Baseline

- **393 passed, 4 skipped** (Vitest + React Testing Library)
- **Build:** `npm run build` must pass.
- **TypeScript:** `npx tsc --noEmit` must pass.
- Any PR that breaks the baseline is rejected.
