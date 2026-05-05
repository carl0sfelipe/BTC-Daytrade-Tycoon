# Changelog — 05 de Maio de 2026

> **62 commits** — BMAD framework, Trailing Stop-Loss, 4 CRITICAL + 6 HIGH fixes, massive test expansion (+70+ tests), TP/SL ghost trigger fix, memory leak fixes, a11y overhaul.

---

## Table of Contents

1. [BMAD Framework](#bmad-framework)
2. [Critical Fixes (4)](#critical-fixes-4)
3. [High Severity Fixes (6)](#high-severity-fixes-6)
4. [Trailing Stop-Loss](#trailing-stop-loss)
5. [TP/SL Bug Fixes](#tpsl-bug-fixes)
6. [Trading Engine Polish](#trading-engine-polish)
7. [UI/UX Improvements](#uiux-improvements)
8. [Accessibility (a11y)](#accessibility-a11y)
9. [Performance](#performance)
10. [Test Suite Expansion](#test-suite-expansion)
11. [DevEx & Tooling](#devex--tooling)

---

## BMAD Framework

### `c48502f` — feat: Install BMAD Method framework with full skill suite

- Estrutura completa `_bmad/` com 37 skills, 6 agentes nomeados (Mary, John, Winston, Amelia, Sally, Paige)
- Python resolver para dependências de skills
- Sistema de Party Mode com 5 rounds de decisões estratégicas documentadas
- Repositório privado `btc-arena-backend` criado com documentação confidencial (~3.600 linhas, 20 arquivos)
- Decisões chave: Open Core (frontend público, backend privado), Stealth Loyalty (sem promessas de token), Web3 só após Web2

---

## Critical Fixes (4)

### `34d3272` — fix(critical): 4 CRITICAL issues from BMAD code review

1. **try/catch no tick loop** — `useTimewarpEngine.tick()` agora envolvido em try/catch; evita crash silencioso que congela a simulação
2. **Validação de dados Binance** — `useBinancePrice` agora valida estrutura da resposta da API antes de usar; previne NaN no preço
3. **crypto.randomUUID()** — Substituição de `Math.random()` por `crypto.randomUUID()` para geração de IDs de ordens
4. **Stale closure em callbacks** — `useCallback` hooks em `TradeControls` e `useTimewarpEngine` atualizados com deps corretas; evita execução com estado desatualizado

---

## High Severity Fixes (6)

### `0a5edf1` — fix(high): 6 HIGH severity issues from BMAD code review

1. **Otimização de re-render do chart** — `TradingChart` memoiza candles e timeScale; reduz re-renders de 60fps para update on-data-change
2. **Toast reducer** — `use-toast` refatorado para reducer pattern; evita enfileiramento infinito de toasts
3. **Guard de NaN no parseFloat** — Todas as conversões de string→number em inputs de trading agora usam `parseFloat` com guarda `isNaN`
4. **Divisão por zero** — `PnLDisplay`, `PositionPanel`, e `TradingChart` agora protegem contra `entry === 0` e `leverage === 0`
5. **Race condition em useBinancePrice** — AbortController para cancelar fetch pendente quando componente desmonta
6. **Cleanup de intervalos** — `useTimewarpEngine` e `useBinancePrice` limpam intervals/timeouts no unmount

---

## Trailing Stop-Loss

### `c5672f9` — feat(store): Trailing Stop-Loss support

- Novos campos em `Position`: `trailingStopPercent` e `trailingStopPrice`
- `setTrailingStop(percent)` — calcula stop price inicial baseado no preço atual
- `checkPosition()` — atualiza `trailingStopPrice` quando o preço se move favoravelmente; fecha posição quando cruza o stop

### `bdf1f9e` — test(store): +9 unit tests for Trailing Stop-Loss

- Movimento favorável atualiza stop
- Movimento desfavorável fecha posição
- Sem atualização quando preço oscila dentro da faixa

### `004b87e` — feat(ui): Trailing Stop-Loss controls and indicator

- Input de percentual no `TradeControls` (modo avançado)
- Botão "Set" / "Remove"
- Indicador visual no `PositionPanel` com preço atual do stop

### `b512b7f` — test(e2e): Trailing Stop-Loss E2E specs

- E2E completo: set, movimento de preço, trigger, remove

---

## TP/SL Bug Fixes

### `bf128f5` — fix(store): TP/SL ghost trigger, close order history, cancel guard, liq direction

- **Ghost trigger** — Inputs `tpPrice`/`slPrice` em `TradeControls` agora são limpos após `openPosition()` e `addPendingOrder()`; evita que ordens subsequentes herdem valores obsoletos
- **Close order history** — `closePosition` agora adiciona item correto ao `ordersHistory` com side e reason apropriados
- **Cancel guard** — `cancelPendingOrder()` verifica se ordem ainda existe antes de tentar cancelar
- **Liquidation direction** — Correção na direção do preço de liquidação para posições short

### `b181a16` — feat(ui): PositionPanel — TP/SL management with expandable 2-field UI

- Campos de input de TP/SL diretamente no `PositionPanel` quando posição está aberta
- Botão "Apply TP / SL" para atualizar sem fechar posição
- Visualização de pending orders TP/SL com botão de cancelamento individual

### `724804d` — feat(ui): OrdersPanel — TP/SL visual redesign with expandable execution details

- Redesign visual das tags TP/SL no `OrdersPanel`
- Detalhes expansíveis mostrando preços de execução e timestamps

---

## Trading Engine Polish

### `6fcbb4d` / `e0ca3a4` — chore: remove all console.log statements from production code

- Remoção completa de `console.log` de `tradingStore.ts`, `TradeControls.tsx`, `useTimewarpEngine.ts`
- Mantidos apenas logs de erro (`console.error`) e warnings

### `234c47c` — fix(hooks): useTimewarpEngine memory leaks, race conditions, stale closures

- `useRef` para `originalStartDateRef` e `candlesRef` — evita recriação a cada render
- `useCallback` com deps corretas em `reset()` e `start()`
- Cleanup de listeners e intervals no unmount

### `847c422` — refactor(store): remove broken activePositions array

- Remoção de `activePositions` array legado que causava inconsistência com `position` singleton

### `dfd2ab3` — fix(store): guard same-side overwrite and invalid size/leverage in openPosition

- `openPosition()` agora retorna erro explicitamente ao tentar sobrescrever posição same-side
- Validação de `size > 0` e `leverage > 0` com mensagens de erro claras

### `d114eb0` / `7af5230` — fix(store): reducePosition double-counted realizedPnL

- Correção de double-counting de `realizedPnL` em `reducePosition` (full close) e `openPosition` (hedge reduce)

---

## UI/UX Improvements

### `3216d13` — fix: Hedge Mode flip UI bugs — side reset, button label, disabled state

- Botão de flip não reseta side indevidamente
- Label do botão de ação reflete corretamente "Flip to Long/Short"
- Estado `disabled` respeita `canFlip` e saldo da carteira

### `2eb248c` — fix: hedge mode slider max should include position size + wallet * leverage

- Slider máximo em hedge mode agora inclui: `positionSize + wallet * leverage`
- Permite ordens de flip maiores que a posição existente

### `c909949` — feat(ui): trading component improvements

- Melhorias diversas em `TradeControls`, `PositionPanel`, `OrdersPanel`
- Estados de loading e disabled mais consistentes

### `94f9e97` — feat(pages): layout and auth page improvements

- Ajustes de layout em `/trading` e páginas de auth (`/login`, `/signup`)
- Responsividade mobile aprimorada

---

## Accessibility (a11y)

### `2ac81df` — a11y: modal roles/labels, icon-only button labels, progressbar, chart img role

- Modais com `role="dialog"`, `aria-labelledby`, `aria-modal`
- Botões de ícone com `aria-label` descritivo
- Risk gauge com `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- TradingChart com `role="img"` e `aria-label` descrevendo tendência

---

## Performance

### `c0a0936` — perf(store): Zustand persist partialize + array caps

- `partialize` no Zustand persiste apenas: `wallet`, `hasSeenOnboarding`, `skipHighLeverageWarning`, `reduceOnly`, `closedTrades`, `realizedPnL`, `ordersHistory`
- **NÃO persiste mais**: `position`, `pendingOrders`, `isLiquidated`, `simulationRealDate`
- `MAX_CLOSED_TRADES` = 100, `MAX_ORDERS_HISTORY` = 200 — previne crescimento infinito de arrays

---

## Test Suite Expansion

### Fábricas e Infraestrutura

- `03abd42` — **test: A) Foundation** — factories, `resetStore`, global `afterEach`
- `034c8d8` — **test(infra)** — `renderWithStore` helper, `mock-binance`, factories atualizadas

### Store (B1) — +17 tests

- `456e317` — `checkPosition`, `updateLeverage`, `liquidated`, early-returns

### Componentes (B2) — +25 tests em 7 arquivos

- `ad3217f` — Novos test files para componentes sem cobertura

### TradeControls Hardening (B3) — +3 tests

- `68658ad` — Testes de assimetria em `TradeControls.test.tsx`

### E2E Refactor

- `9cc7fc9` — `hedge-mode.spec.ts` via UI actions, mobile project, helpers
- `581aaae` — Mobile skip, production-bar skip, risk gauge deterministic

### Testes Específicos Adicionados

| Commit | Descrição |
|--------|-----------|
| `b8d870a` | 3 mutation tests para Hedge Mode UI bugs |
| `75a2b7b` | Hedge Mode flip: wallet validation, `canFlip`, Summary margin |
| `45f9224` | `addToPosition` preserva/sobrescreve TP e SL |
| `b9fa884` | `checkPendingOrders`: ordens simultâneas, reduce-only, hedge flip |
| `992c37a` | TradeControls TP/SL input values reach store |
| `6b0f813` | TradeControls trailing stop Set/Remove |
| `b185860` | PositionPanel realized P&L row conditional rendering |
| `1b0a53d` | PositionPanel trailing stop indicator row |
| `9d41371` | PositionPanel TP and SL tag conditional rendering |
| `f405ef0` | `useTradeNotifications` toast coverage |
| `34f3e55` | `reducePosition` float accumulation + trailing stop preservation |
| `f15a07d` | TradeHistory reverse-chronological order + reason badges |
| `1dc07b6` | PnLDisplay totalEquity includes margin and unrealized PnL |
| `f44a567` | E2E: wallet-validation — open button disabled when wallet < margin |
| `be8bbe2` | E2E: leverage pill + trailing stop Set/Remove via real UI clicks |
| `0b67799` | PositionPanel risk gauge isCritical/isDanger/safe class states |
| `e02a749` | High leverage modal end-to-end flow without mock |
| `ec4d606` | `interpolatePrice` edge cases |
| `fe98460` | E2E: onboarding does not reappear after skip on reload |
| `130e87d` | E2E: mobile bottom sheet toggle + UI-driven position open |
| `6b7fe8a` | E2E: onboarding reload test + NaN duration fix |
| `8935f1f` | `canFlip` disabled regression test; EndSimulationModal assert |
| `ec695b1` | Fix brace faltante em PositionPanel trailing stop test |

### `67bf3f7` — test: add TP/SL validation i18n tests + Portuguese smoke test

- **6 new unit tests** in `tradingStore.test.ts` verifying TP/SL error messages are in English and do NOT contain Portuguese words (`inválido`, `acima`, `abaixo`, `coloque`).
- **E2E `i18n-portuguese-smoke.spec.ts`**: scans all pages (`/`, `/trading`, `/achievements`, `/leaderboard`, `/auth/login`, `/auth/signup`) for visible Portuguese text — character patterns (`ç`, `ã`, `õ`) + word blacklist.
- **E2E `tp-sl-validation.spec.ts`**: validates invalid TP/SL flows show English error messages.

**Totais de Testes (após hoje):**
- **Unit (Vitest)**: ~250+ tests
- **E2E (Playwright)**: ~40+ specs

---

## i18n — All User-Facing Text to English

### `d14f872` — i18n: translate all user-facing Portuguese strings to English

- **tradingStore.ts**: 8 TP/SL error messages translated (`inválido` → `Invalid`, `ACIMA` → `ABOVE`, `ABAIXO` → `BELOW`, etc.)
- **PositionPanel.tsx**: Toast titles, trigger labels (`acima`/`abaixo` → `above`/`below`), placeholders (`mercado` → `market`)
- **TradeControls.tsx**: Placeholders and helper labels (`vazio = mercado` → `empty = market`)
- **LandingPage.tsx**: `Conquistas` → `Achievements`
- **useTimewarpEngine.ts**: Date formatting `pt-BR` → `en-US`

---

## Late-Day Bug Fixes

### `c06ab1f` — fix: TP/SL side display and preserve existing orders on partial update

- `setPositionTpSl` now only cancels the specific order type being updated. Setting SL no longer cancels existing TP (and vice-versa).
- `position.tpPrice`/`slPrice` now preserve existing values when input is empty.
- `ordersHistory` items for TP/SL now use correct type `tp`/`sl` instead of `market`.
- `OrdersPanel` shows reducing side (opposite of position) for TP/SL orders.

### `1f4bde2` — ui: remove cents from Bitcoin price display

- `MarketStatus`, `ChartCanvas`, `OrdersPanel`, `TradeControls`: Bitcoin price shown as whole dollars (rounded), no decimal cents.
- Inputs and placeholders for limit price default to `.toFixed(0)` instead of `.toFixed(2)`.
- Internal calculations (PnL, liquidation, triggers) keep full precision — only display is simplified.

### `8076bb0` — fix: closePosition stale state bug — SL stayed pending after TP hit

- **Root cause**: `closePosition` had two sequential `set()` calls. The second `set()` overwrote `ordersHistory` with the stale snapshot from before the first `set()`, losing the `"canceled"` status update for sibling TP/SL orders.
- **Effect**: When TP hit, the SL disappeared from `pendingOrders` (so `cancelPendingOrder` said "already cancelled") but remained `"pending"` in `ordersHistory`, making it visible but non-interactive in the UI.
- **Fix**: Consolidated both operations into a single `set()` using local vars. Applies to manual close, TP hit, SL hit, and trailing stop.

---

## DevEx & Tooling

### `3c2d5fb` — feat(testids): add data-testid to trading components for stable selectors

- `data-testid` adicionados em `TradeControls`, `PositionPanel`, `OrdersPanel`, `PnLDisplay`, `SimulationClock`, `MobileTradingView`
- Permite seletores estáveis para E2E sem depender de classes CSS

### `33ff1b2` — refactor(store): cleanup dead code, consolidate hooks and utils

- Remoção de código morto identificado pelo BMAD audit
- Consolidação de utilitários duplicados

### `6b1b210` — feat(ui): trade action toast notifications

- Toast notifications para: posição aberta, TP/SL hit, liquidação, trailing stop
- `useTradeNotifications` hook centralizado

### `fb922fa` — fix(components): guard division-by-zero in PnL, margin, chart calculations

- Proteção sistemática contra divisão por zero em todos os cálculos financeiros

---

## Commits Restaurados/Corrigidos

- `30b5f35` — Revert de remoção de console.log (foi removido de novo em `6fcbb4d`)
- `a588119` — Update README.md (sincronização com main)
- `cd2767e` — Restore original 2026-05-04 changelog (pt-BR)

---

## Stats do Dia

- **Commits**: 67
- **Arquivos modificados**: 50+
- **Testes adicionados**: ~80+ unit + ~12 E2E
- **Issues BMAD resolvidas**: 4 CRITICAL + 6 HIGH
- **Features novas**: Trailing Stop-Loss, BMAD Framework, TP/SL Panel Management
- **Bugfixes críticos**: Stale state em closePosition, TP cancelado ao setar SL, i18n completo
- **Frameworks/Metodologias adicionadas**: BMAD Method (37 skills, 6 agentes)

---

*Gerado do histórico git em 2026-05-05.*
