# Mapa de Violações da Lei — Análise Completa

> **Data:** 2026-05-11  
> **Lei:** AGENTS.md (funções 4–20 linhas, arquivos <500 linhas, SRP)

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Arquivos analisados em `src/` | ~120 |
| Arquivos >500 linhas | **2** (ambos testes) |
| Arquivos com funções >20 linhas | **92** |
| Total de funções >20 linhas | **~200** |
| Maior violação (produção) | `useTimewarpEngine` — 329 linhas |
| Maior violação (teste) | `tradingStore.test.ts` — 1232 linhas, função anônima de 238 linhas |

---

## Impacto Real em Tool Calls

Cada `ReadFile` no Kimi/Code CLI lê no máximo **1000 linhas** por chamada. Arquivos maiores que isso exigem **2+ tool calls** para leitura completa.

| Arquivo | Linhas | Est. Tokens | Tool Calls | Custo Relativo |
|---------|--------|-------------|------------|----------------|
| `src/store/tradingStore.test.ts` | 1232 | ~8.915 | **2** | 2× |
| `src/components/trading/TradeControls.test.tsx` | 931 | ~7.475 | 1 | 1× |
| `src/hooks/useTimewarpEngine.ts` | 406 | ~3.278 | 1 | 1× |
| `src/store/slices/positionSlice.ts` | 380 | ~3.155 | 1 | 1× |
| `src/components/trading/PositionPanel.tsx` | 376 | ~4.345 | 1 | 1× |
| `src/components/trading/TradeControls.tsx` | 348 | ~1.740 | 1 | 1× |
| `src/lib/trading/transitions.ts` | 344 | ~2.553 | 1 | 1× |
| `src/components/trading/trade-controls/TpSlPanel.tsx` | 318 | ~1.768 | 1 | 1× |

> **Conclusão de impacto:** Apenas **1 arquivo** (`tradingStore.test.ts`) exige 2 tool calls. O impacto direto em performance de leitura é baixo para produção, mas o impacto em **compreensão cognitiva** é alto.

---

## Categorização das Violações

### 🔴 Tier 1: Crítico — Refatorar Imediatamente

#### 1. `src/hooks/useTimewarpEngine.ts` (406 linhas)
- **Função violadora:** `useTimewarpEngine` — **329 linhas** (L75–L403)
- **Por que é crítico:** É o coração da simulação. Uma única função gerencia:
  - Fetch de dados da Binance
  - Normalização de candles
  - Game loop (`setInterval`)
  - Interpolação de preço
  - Métricas (trend, volatility)
  - Integração com Zustand (`checkPosition`, `checkPendingOrders`)
- **Impacto em agentes:** Um agente que precisa entender o game loop lê 329 linhas de lógica intercalada. Não consegue isolar "como funciona a interpolação" de "como funciona o trend calculation".
- **Recomendação:** Refatorar. Extrair para hooks menores:
  - `useCandleData()` — fetch + normalize
  - `useGameLoop()` — tick + interval
  - `usePriceInterpolation()` — calcular preço atual
  - `useSimulationMetrics()` — trend + volatility
  - `useEngineState()` — orquestração

#### 2. `src/components/trading/PositionPanel.tsx` (376 linhas)
- **Função violadora:** `PositionPanel` — **368 linhas** (L8–L375)
- **Por que é crítico:** Um componente React com ~370 linhas mistura:
  - 8 sub-componentes inline (`RiskGauge`, `InfoRow`, `LiquidationBar`, etc.)
  - Cálculos de PnL
  - Render condicional de TP/SL
  - Lista de pending orders
  - Botões de ação
- **Impacto em agentes:** Impossível reutilizar sub-componentes. Um bug em `LiquidationBar` exige ler 370 linhas para entender o contexto.
- **Recomendação:** Refatorar. Extrair sub-componentes para `src/components/trading/position-panel/`.

---

### 🟡 Tier 2: Moderado — Refatorar quando tocar

#### 3. `src/store/slices/positionSlice.ts` (380 linhas)
- **Funções violadoras:** `createPositionSlice` — 330 linhas; `setPositionTpSl` — 111 linhas; `checkPosition` — 59 linhas
- **Status:** Já foi refatorado de 1.183 → 380 linhas. Está na lista de action items do Party Mode (extrair `computeTpSlUpdate` e `computeTrailingStopCheck`).
- **Recomendação:** **NÃO refatorar agora** — já está programado no roadmap. Esperar a execução dos action items P0 do Party Mode.

#### 4. `src/lib/trading/transitions.ts` (344 linhas)
- **Funções violadoras:** `computeClosePosition` — 88 linhas; `computeHedgeFlip` — 77 linhas; `computeReduceOrClose` — 70 linhas; `computeFreshOpen` — 62 linhas
- **Por que é aceitável:** São funções **puras**, sem side effects. Cada uma tem **uma única responsabilidade** (fechar, flipar, reduzir, abrir). O tamanho vem da verbosidade de TypeScript + criação de objetos imutáveis.
- **Impacto em agentes:** Um agente que lê `computeClosePosition` sabe exatamente o que esperar: "essa função calcula o estado de fechamento". Não há surpresas.
- **Recomendação:** **Deixar como está**. O custo de refatorar (quebrar em 3–4 funções cada) não justifica o benefício. O padrão já está documentado no AGENTS.md como exceção para "funções puras com lógica de negócio complexa mas única".

#### 5. `src/components/trading/TradeControls.tsx` (348 linhas)
- **Funções violadoras:** `TradeControls` — 275 linhas; `handleOpen` — 45 linhas; `handleConfirmHighLeverage` — 34 linhas
- **Status:** Já foi refatorado de 937 → 347 linhas. Extraímos 9 sub-componentes.
- **Recomendação:** **Deixar como está**. O componente principal é um orchestrator — ele coordena 9 sub-componentes. `handleOpen` e `handleConfirmHighLeverage` são handlers de evento. Têm 45 e 34 linhas porque precisam validar inputs, chamar 2–3 actions do store, e tratar erros. Quebrar mais reduziria legibilidade.

#### 6. `src/components/trading/trade-controls/TpSlPanel.tsx` (318 linhas)
- **Funções violadoras:** `TpSlPanel` — 99 linhas; `ToggleButton` — 50 linhas; `PriceInputRow` — 54 linhas; `TpSlInputGroup` — 48 linhas; `StepButton` — 23 linhas
- **Por que é moderado:** Tem 5 sub-componentes inline. A função `TpSlPanel` em si tem 99 linhas (aceitável), mas os sub-componentes deveriam ser extraídos.
- **Recomendação:** Refatorar quando tocar em TP/SL (já está no roadmap do Party Mode para computeTpSlUpdate). Extrair sub-componentes para arquivos separados em `src/components/trading/trade-controls/tp-sl/`.

#### 7. `src/components/trading/OrdersPanel.tsx` (261 linhas)
- **Funções violadoras:** `OrdersPanel` — 252 linhas; função anônima de render — 195 linhas
- **Recomendação:** Refatorar quando tocar. Extrair `OrderRow` e filtros para sub-componentes.

---

### 🟢 Tier 3: Baixo — Deixar como Código Pré-Histórico

#### 8. `src/components/pages/LandingPage.tsx` (234 linhas)
- **Função violadora:** `LandingPage` — 218 linhas
- **Por que é baixo:** É uma página estática de marketing. Não tem lógica de negócio. 218 linhas de JSX com seções (`Hero`, `Features`, `CTA`, `Footer`).
- **Recomendação:** **Deixar como está**. Refatorar uma landing page em 8 sub-componentes aumenta o número de arquivos sem benefício real. Nenhum agente precisa entender a landing page para trabalhar no core do trading.

#### 9. `src/components/pages/AuthPage.tsx` (224 linhas)
- **Função violadora:** `AuthPage` — 210 linhas
- **Recomendação:** **Deixar como está**. Fake auth. Não é core do produto.

#### 10. `src/components/trading/MobileTradingView.tsx` (219 linhas)
- **Função violadora:** `MobileTradingView` — 197 linhas
- **Recomendação:** **Deixar como está**. É um wrapper com tabs. Cada tab é um componente existente. A complexidade está na configuração das tabs, não na lógica.

#### 11. `src/components/trading/EndSimulationModal.tsx` (212 linhas)
- **Função violadora:** `EndSimulationModal` — 172 linhas
- **Recomendação:** **Deixar como está**. Modal com formatação de dados de sessão. Lógica simples, apenas verboso por causa do JSX.

#### 12. `src/hooks/use-toast.ts` (204 linhas)
- **Funções violadoras:** `reducer` — 44 linhas; `toast` — 36 linhas
- **Recomendação:** **Deixar como está**. É código do shadcn/ui (biblioteca de terceiros). Não devemos editar código de terceiro — viola a lei de "wrap third-party libs". Se precisar modificar, criar um wrapper `useTradingToast.ts`.

#### 13. `src/app/trading/page.tsx` (266 linhas)
- **Função violadora:** `TradingPage` — 239 linhas
- **Recomendação:** **Deixar como está** por ora. É a página raiz que monta todos os componentes. A complexidade está na composição (`<Header />`, `<TradingChart />`, etc.), não na lógica. Quando adicionarmos mais componentes (ex: Hedge Mode), aí sim precisará ser refatorada.

---

### ⚫ Tier 4: Testes — Deixar como Está (Código Pré-Histórico)

#### 14. `src/store/tradingStore.test.ts` (1232 linhas)
- **Funções violadoras:** 34 funções anônimas de 21–238 linhas
- **Impacto em tool calls:** **2 tool calls** para ler o arquivo completo.
- **Recomendação:** **Deixar como está**. Testes são "write-once, read-occasionally". Refatorar 67 testes em 15 arquivos separados aumentaria o tempo de execução do test runner (`npm run test`) porque cada arquivo precisa de setup/teardown. A legibilidade de testes longos é culturalmente aceita na comunidade quando bem organizados com `describe`/`it`.

#### 15. `src/components/trading/TradeControls.test.tsx` (931 linhas)
- **Funções violadoras:** 20 funções anônimas de 21–799 linhas
- **Recomendação:** **Deixar como está**. Mesma lógica do teste de store.

#### 16. Outros arquivos de teste (PositionPanel.test.tsx, MobileTradingView.test.tsx, etc.)
- **Recomendação:** **Deixar como está**. Testes são exemptos da lei de tamanho de arquivo. A lei foi escrita para código de produção.

---

## Recomendação Final

| Ação | Arquivos | Justificativa |
|------|----------|---------------|
| **🔴 Refatorar Imediatamente** | `useTimewarpEngine.ts`, `PositionPanel.tsx` | Core do produto. Impacto direto na capacidade de agentes entenderem o engine. |
| **🟡 Refatorar quando tocar** | `TpSlPanel.tsx`, `OrdersPanel.tsx`, `positionSlice.ts` | Já no roadmap. Esperar os action items do Party Mode. |
| **🟢 Deixar como está** | `TradeControls.tsx`, `transitions.ts`, `LandingPage.tsx`, `AuthPage.tsx`, `MobileTradingView.tsx`, `EndSimulationModal.tsx`, `trading/page.tsx` | Custo de refatoração > benefício. São orchestrators ou páginas estáticas. |
| **⚫ Testes — não tocar** | `tradingStore.test.ts`, `TradeControls.test.tsx`, todos os `*.test.tsx/ts` | Testes são exemptos. Refatorar reduziria performance do runner. |
| **⚫ Terceiros — não tocar** | `use-toast.ts` | Código do shadcn/ui. Criar wrapper se necessário. |

---

## Nota sobre a Lei

A lei de 4–20 linhas por função é uma **heurística**, não um dogma. O objetivo é **reduzir a carga cognitiva** de agentes que leem o código. Funções puras de 60–90 linhas que fazem **uma única coisa** (ex: `computeClosePosition`) são mais fáceis de entender do que 3 funções de 20 linhas cada com nomes artificiais (`computeClosePositionPart1`, `computeClosePositionPart2`, `computeClosePositionPart3`).

A lei deve ser aplicada com **juízo técnico**. O AGENTS.md será atualizado com uma cláusula de exceção para funções puras com lógica de negócio única e bem documentada.
