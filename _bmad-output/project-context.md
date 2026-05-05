# Project Context — BTC Daytrade Tycoon

> Auto-generated context for BMad Method agents.
> This file ensures all AI agents follow consistent conventions.

## Project Overview

**Name:** BTC Daytrade Tycoon
**Type:** Web-based trading simulation game
**Stack:** Next.js 14 + React 18 + TypeScript + Tailwind CSS + Zustand
**Test Stack:** Vitest (180 unit tests) + Playwright (36 E2E tests)

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14 (App Router) |
| UI Library | React | 18 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 4.x |
| Charts | lightweight-charts | 4.x |
| Tests (Unit) | Vitest | 1.x |
| Tests (E2E) | Playwright | 1.x |
| Package Manager | npm | — |

## Code Organization

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── trading/      # Trading-specific UI
│   └── ui/           # Shared UI primitives
├── hooks/            # Custom React hooks
├── lib/              # Utilities, API clients
├── store/            # Zustand stores
├── types/            # TypeScript types
└── utils/            # Helper functions
```

## Naming Conventions

- Components: PascalCase (`TradeControls.tsx`)
- Hooks: camelCase prefixed with `use` (`useTimewarpEngine.ts`)
- Stores: camelCase suffixed with `Store` (`tradingStore.ts`)
- Types/Interfaces: PascalCase (`Trade`, `Position`)
- Test files: Same name as source + `.test.ts(x)`

## Testing Conventions

- Unit tests alongside source files (co-located)
- E2E tests in `e2e/` directory
- Vitest for unit, Playwright for E2E
- Mock external APIs (Binance) in tests
- Test IDs via `data-testid` for E2E selectors

## Key Patterns

- **Zustand slices** for store modularity
- **Custom hooks** for business logic separation
- **Tailwind** for all styling (no CSS modules)
- **shadcn/ui** components in `components/ui/`
- **Toast notifications** via `use-toast.ts`

## State Management

Main store: `src/store/tradingStore.ts`
- Wallet balance, positions, trade history
- Price history, simulation state
- Leverage, order controls

## External APIs

- **Binance** (`src/lib/binance-api.ts`): Price data
- Mocked in test environments

## Build & Dev

```bash
npm run dev       # Development server
npm run build     # Production build
npm run test      # Unit tests (Vitest)
npm run test:e2e  # E2E tests (Playwright)
```

## Critical Implementation Rules

1. Never use `parseFloat` without NaN validation
2. Never divide without zero guard
3. Use `crypto.randomUUID()` for IDs (with Math.random fallback)
4. Wrap simulation ticks in try/catch
5. Always clear intervals/timeouts on unmount
6. Toast notifications must be pure (no side effects in reducer)

## Recent Context

- 53 commits ahead of origin/main
- 4 CRITICAL + 6 HIGH issues fixed in latest code review
- 10 MEDIUM + 5 LOW issues pending
- Trailing Stop-Loss feature recently added
- Performance Metrics modal added to End Session
