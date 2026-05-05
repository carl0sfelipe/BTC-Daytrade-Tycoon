# Changelog — 04 de Maio de 2026

## Resumo da Sessão

Sessão focada em **bugfixes críticos**, **melhorias de UX no trading**, **remoção de viés de retrospectiva**, e **novas features de modo de trading**.

---

## 1. EndSimulationModal — Correções Críticas

### `72aa836` — fix: freeze end date and block return after simulation end
- **Problema:** O end date no modal continuava crescendo porque `currentTimeSec` avançava enquanto a simulação rodava.
- **Solução:** Pausar o engine e capturar `realDateRange` no momento exato em que o modal é aberto.
- **Regra blind date:** Ambos os botões do modal ("Back" e "New Session") agora forçam uma nova sessão. Após ver a data real histórica, o jogador **não pode voltar** para a simulação.

---

## 2. MarketStatus — Remoção de Viés de Retrospectiva

### `b63d88e` — fix: remove market trend indicator (UP/DOWN/NEUTRAL) from MarketStatus
- **Motivo:** O badge "UP/DOWN/NEUTRAL" dava viés de retrospectiva — o jogador não deveria saber se o mercado está em tendência de alta ou baixa durante a simulação às cegas.
- **Ação:** Indicador de tendência removido completamente do `MarketStatus`.

### `bbeec8f` — feat: add tooltip to High Volatility badge explaining what it means
- Adicionado `title` explicativo no badge "High Volatility":  
  *"Price has been swinging more than usual in the last 24 candles. Risk of sudden moves is higher."*

---

## 3. TradeControls — Limit Orders & Market Orders

### `d97aef1` → `88b2380` — fix: limit orders now work correctly with open position
- **Bug crítico:** Quando havia posição aberta, o componente **nunca mostrava o botão "Place Limit"**. Em vez disso, mostrava "INCREASE/DECREASE/CLOSE" (market orders).
- **Solução:** A condição dos botões de ação foi alterada de:
  ```tsx
  {position ? ( /* INCREASE/DECREASE/CLOSE */ ) : ( /* Place Limit */ )}
  ```
  para:
  ```tsx
  {position && orderType !== "limit" ? ( /* INCREASE/DECREASE/CLOSE */ ) : ( /* Place Limit */ )}
  ```
- Também adicionados logs de debug em toda a cadeia de limit orders.

### `4269f44` — fix: allow switching Market/Limit order type when position is open
- **Problema:** Os botões "Market" e "Limit" ficavam travados (`disabled`) quando havia posição aberta.
- **Solução:** Botões liberados. Agora o jogador pode alternar livremente entre Market e Limit mesmo com posição aberta.

### `10ecfa9` — feat: allow flipping side in market mode with open position
- **Problema:** Com posição LONG aberta em modo Market, os botões LONG/SHORT ficavam desabilitados.
- **Solução:** Botões sempre habilitados. Clicar no lado **oposto** à posição atual fecha a posição (`closePosition`) e troca o side, permitindo flip rápido long↔short.

### `5a4bad8` — fix: skip high-leverage warning modal in Advanced mode
- Modal de confirmação de alavancagem alta (≥50x) não aparece mais no modo Advanced. Apenas no Simple.

### `c5cb34b` — ui: rename DECREASE POSITION → REDUCE POSITION
- Terminologia padronizada.

---

## 4. OrdersPanel & Order History

### `ce3a09b` — fix: add market increase/decrease orders to Orders history
- `updatePositionSize` (aumento/diminuição via slider) agora cria `OrderHistoryItem` e adiciona ao `ordersHistory`.
- Antes apenas a ordem de abertura inicial aparecia no histórico.

### `195d140` — ui: move OrdersPanel above TradeHistory in desktop layout
- `OrdersPanel` movido da coluna lateral para a coluna principal, ficando **acima** do `TradeHistory`.

---

## 5. Realized P&L — Nova Feature

### `d8bf246` → `5af9ef6` → `70e25fe` — Realized P&L tracking
- **Feature:** Quando o jogador fecha parcialmente uma posição (via slider REDUCE ou limit order do lado oposto), o P&L realizado daquela parte é acumulado.
- **Separação limpa:**
  - `position.realizedPnL` → P&L realizado **apenas da posição atualmente aberta** (mostrado no PositionPanel).
  - `store.realizedPnL` → P&L realizado **acumulado da sessão inteira** (mostrado no PnLDisplay).
- O `closedTrades` continua contendo **apenas trades fechados completamente** (TradeHistory inalterado).

### `0828a86` — feat: show Realized P&L in PositionPanel when non-zero
- Badge "Realized P&L" adicionado abaixo do "Unrealized P&L" no PositionPanel, aparecendo apenas quando há valor.

### `fb1f801` — fix: reset realizedPnL on new session
- **Bug encontrado:** O `resetStore` do engine (`useTimewarpEngine.ts`) não incluía `realizedPnL: 0`, fazendo o P&L realizado da sessão anterior vazar para a nova.

---

## 6. Trade History P&L Fix

### `0a148fb` — fix: closePosition trade.pnl now includes prior realizedPnL from partial closes
- **Bug:** O Trade History mostrava apenas o P&L da porção **restante** da posição, ignorando o P&L realizado em reduções parciais anteriores.
- **Solução:** `closePosition` agora soma `position.realizedPnL` ao `trade.pnl` final.
- **Exemplo:** Posição LONG $1000 → REDUCE $500 com +$20 → REDUCE $300 com +$10 → CLOSE $200 com +$5. Antes o trade mostrava `$5`. Agora mostra `$35` ($20 + $10 + $5).

---

## 7. Chart Gap Fix

### `cbcfbbc` — fix: reset chart timeScale on new session to prevent huge gap
- **Bug:** Ao iniciar uma nova sessão, o gráfico mostrava um gap enorme entre a última vela da sessão anterior e a primeira vela da nova sessão.
- **Solução:** `TradingChart.tsx` chama `chartRef.current.timeScale().fitContent()` após limpar os dados (`seriesRef.current.setData([])`) em nova sessão.

---

## 8. Reduce Only / Hedge Mode Toggle

### `49b86d0` → `ae8c7ba` — feat: implement Reduce Only / Hedge Mode toggle
- **Nova feature:** Toggle no TradeControls (visível quando há posição aberta) permite alternar entre:
  - **Reduce Only (padrão):** Ordens do lado oposto apenas reduzem/fecham a posição existente. Nunca abrem posição no lado oposto.
  - **Hedge Mode:** Ordens do lado oposto **maiores** que a posição atual fecham a existente e abrem uma nova no lado oposto com o excesso (flip).
- **Slider max em Hedge Mode:** Usa `wallet * leverage` em vez de `position.size`, permitindo ordens maiores que a posição atual.
- **Limit orders em Hedge Mode:** Quando executados, flipam a posição se `!reduceOnly && order.size > existing.size`.
- **Reset:** `reduceOnly` volta para `true` em nova sessão.
- **Testes:** 5 testes de store + 1 teste de TradeControls.

---

## 9. Deep Audit — Bugs Encontrados & Corrigidos

Auditoria completa do `TradeControls.tsx` e `tradingStore.ts` com agents dedicados. Foram encontrados **14+ bugs**; os críticos foram corrigidos.

### TradeControls — Correções

| # | Bug | Causa | Fix |
|---|-----|-------|-----|
| 1 | **REDUCE no máximo = no-op silencioso** | `handleUpdate` chamava `updatePositionSize(0)`, que retornava early sem fazer nada | Agora `handleUpdate` detecta `targetSize <= 0` e chama `closePosition("manual")` |
| 2 | **Slider resetava pra $1000 ignorando posição pequena** | `useEffect` fazia `setPositionSize(1000)` incondicionalmente | Agora capa em `min(1000, position.size)` |
| 3 | **Side buttons não resetavam slider em limit mode** | O reset só acontecia quando `orderType === "market"` | Removida a condição — reseta sempre que há posição |
| 4 | **Limit price vazio + high leverage = market order** | `pendingTrade.limitPrice = ""` era falsy, caindo no branch `openPosition` | Agora valida `parseFloat(limitPrice) > 0` antes de decidir entre limit e market |
| 5 | **TP/SL escondido em advanced + limit + posição** | A condição era `{!position && (...)}` em advanced mode | Alinhado com simple mode: `{(!position || orderType === "limit") && (...)}` |
| 6 | **Botão CLOSE sumia em limit mode** | A condição era `{position && orderType !== "limit"}` | Simplificado para `{position}` — CLOSE sempre visível |

### tradingStore — Correções

| # | Bug | Causa | Fix |
|---|-----|-------|-----|
| 7 | **`liquidationPrice` não recalculado no increase** | `updatePositionSize` aumento atualizava `entry` e `size`, mas esquecia `liquidationPrice` | Agora recalcula via `calcLiquidationPrice(newEntry, leverage, side)` |
| 8 | **`reducePosition` full close não criava Trade** | O branch `reducedSize >= size` só atualizava wallet e setava `position: null` | Agora cria `Trade`, adiciona a `closedTrades`, e soma `position.realizedPnL + pnl` ao global `realizedPnL` |

### Novos Testes

6 testes adicionados cobrindo os cenomas acima:
- REDUCE com slider no máximo fecha a posição
- REDUCE com slider max (=position.size) fecha a posição
- useEffect capa positionSize quando posição < $1000
- CLOSE POSITION visível em limit mode com posição aberta
- TP/SL visível em advanced mode + limit + posição aberta
- INCREASE recalcula liquidationPrice após adicionar à posição

---

## 10. Debug Logging

### `c7e7a54` → `d1fe6d2` — Console logs para ações do usuário
- Removidos logs poluidos do loop de tick (`checkPendingOrders` a cada 100ms).
- Adicionados logs em **todas as ações do usuário:**
  - `TradeControls`: handleOpen, handleUpdate, closePosition, high-leverage confirm
  - `SimulationClock`: Pause, Resume, End, Reset
  - `OrdersPanel`: cancelPendingOrder
  - `tradingStore`: addPendingOrder, openPosition, addToPosition, reducePosition, closePosition, cancelPendingOrder

### `01a8623` — feat: enhanced debug logging for trading actions
- **Melhoria:** Logs enriquecidos com contexto completo de estado em todas as ações.
- `formatStoreState()` helper no `tradingStore` para formatação consistente.
- Cada log agora inclui: preço atual, wallet, posição (side, entry, size, leverage, liqPrice, unrealizedPnL, realizedPnL), P&L da sessão, pending orders count, e modo Reduce Only.
- `TradeControls` logs incluem wallet, detalhes da posição, unrealized P&L, e currentPrice.
- `checkPendingOrders` agora faz early return quando não há ordens pendentes (pequena otimização de performance).
- **Nenhuma mudança funcional** — 65 unit tests + trading E2E passing.

---

## 11. Order History Side Tracking

### `b598d63` — fix: order history side tracking on reduce operations
- **Bug:** Ao reduzir uma posição LONG clicando em SHORT (ou vice-versa), o `ordersHistory` registrava o lado da **posição** em vez do lado da **operação**, fazendo parecer que haviam 2 LONGs no histórico.
- **Solução:** `updatePositionSize` agora aceita um parâmetro opcional `orderSide`. O `TradeControls` passa o `side` selecionado pelo usuário, e o histórico usa esse valor.
- **Fallback:** Quando `orderSide` não é fornecido, usa `position.side` (compatibilidade retroativa).
- **Testes:** 5 novos testes unitários cobrindo increase, reduce com lado oposto, reduce short→long, fallback padrão, e workflow completo.

---

## 12. Documentação

### `bde89e0` — docs: update README, ARCHITECTURE, and CHANGELOG
- README.md e ARCHITECTURE.md sincronizados com o código real:
  - Dependências mortas removidas
  - Contagem de testes atualizada (65+)
  - Diagramas de layout corrigidos
  - Seção de Reduce Only / Hedge Mode adicionada

---

## Commits (ordem cronológica)

```
01a8623  feat: enhanced debug logging for trading actions
ae8c7ba  fix: slider max in hedge mode allows orders larger than position
49b86d0  feat: implement Reduce Only / Hedge Mode toggle
88b2380  fix: limit orders now work correctly with open position
cbcfbbc  fix: reset chart timeScale on new session to prevent huge gap
0a148fb  fix: closePosition trade.pnl now includes prior realizedPnL from partial closes
2ae01de  docs: remove CHANGELOG from repo (keep locally only)
bde89e0  docs: update README, ARCHITECTURE, and CHANGELOG
b598d63  fix: order history side tracking on reduce operations
6e76478  fix: comprehensive bug fixes from deep audit + 6 new tests
078e6ac  fix: order-centric slider + symmetric Best/Worst Trade display
d0d0317  fix: action button label follows side toggle, not slider sizeDiff
fd461b5  fix: side button click resets slider toward intended direction
66556e2  fix: hydration mismatch on LandingPage fake chart
1d7bafb  fix: remove auto-close from side buttons + add Reduce Only / Hedge Mode to ROADMAP
fb1f801  fix: reset realizedPnL on new session
c5cb34b  ui: rename DECREASE POSITION → REDUCE POSITION
10ecfa9  feat: allow flipping side in market mode with open position
70e25fe  fix: realizedPnL is now per-position, not session-wide
0828a86  feat: show Realized P&L in PositionPanel when non-zero
```
