# PRD — Crypto Tycoon Pro: TimeWarp Trading Simulator

## 1. Visão Geral

Transformar o simulador de trading de um painel estático em uma **máquina do tempo financeira**. Ao entrar, o usuário é teleportado para um momento aleatório do passado do Bitcoin (a partir de dezembro/2017). Ele vê o preço subir e cair exatamente como aconteceu na história, mas em velocidade acelerada (60x). O objetivo é permitir que o usuário "treine" trading em cenários reais do passado sem arriscar dinheiro real.

---

## 2. O Conceito: TimeWarp

### 2.1 Sorteio Temporal
Ao carregar a página `/trading`, o sistema sorteia:
- **Data/hora de início**: um timestamp aleatório entre `01/12/2017 00:00:00 UTC` e `31/12/2020 23:59:59 UTC` (janela de 3 anos com alta volatilidade — bull run 2017, crash 2018, recuperação 2019/2020).

### 2.2 Aceleração Temporal
- **Fator de aceleração**: `60x` (configurável no futuro).
- **Regra**: 1 hora de história real = 1 minuto no simulador.
- **Exemplo**: Se na história o BTC subiu de $15.000 para $30.000 em 10 horas, no simulador essa movimentação completa levará 10 minutos.

### 2.3 Data Simulada na Tela
O usuário vê a data/hora simulada em destaque (ex: "15 Jan 2018 — 14:32 UTC"), para saber exatamente em que ponto da história está operando.

---

## 3. Fluxo de Dados

```
[Usuário entra em /trading]
         │
         ▼
[Sorteia startDate entre Dez/2017 e Dez/2020]
         │
         ▼
[Busca candles horários da Binance API]
         │
         ▼
[Armazena array de candles no Zustand store]
         │
         ▼
[Inicia loop de simulação: setInterval 100ms]
         │
         ▼
[Calcula simulatedTime = startDate + (realElapsedMs * 60)]
         │
         ▼
[Interpola preço entre dois candles adjacentes]
         │
         ▼
[Atualiza store: price, currentPrice, priceHistory, trend, volatility]
         │
         ▼
[Componentes reagem: gráfico anima, book muda, P&L atualiza]
```

---

## 4. O que Já Existe (Status Atual)

### 4.1 Infraestrutura
- ✅ Next.js 14 + App Router
- ✅ Tailwind CSS com tema dark
- ✅ TypeScript strict
- ✅ Zustand + persist middleware (`tradingStore.ts`)
- ✅ shadcn/ui components (button, card, slider, etc.)

### 4.2 Componentes de Trading
- ✅ `Header.tsx` — navegação com links para `/trading`, `/leaderboard`, `/achievements`
- ✅ `MarketStatus.tsx` — barra de status BTC/USDT (preço, volatilidade, trend)
- ✅ `ChartCanvas.tsx` — canvas 2D com grid, linha de preço, ponto atual
- ✅ `OrderBook.tsx` — book sintético de 5 níveis (bids/asks)
- ✅ `PnLDisplay.tsx` — carteira, P&L sessão, win rate, estatísticas
- ✅ `PositionPanel.tsx` — posição aberta, entry, liquidação, P&L unrealized
- ✅ `TradeControls.tsx` — alavancagem, tamanho, TP/SL, botão abrir/fechar
- ✅ `Leaderboard.tsx` — ranking hardcoded de traders fake
- ✅ `Achievements.tsx` — conquistas com persistência localStorage
- ✅ `NewsFeed.tsx` — feed de notícias hardcoded (único componente "vivo" hoje)

### 4.3 Store
- ✅ `tradingStore.ts` — Zustand com estado: price, currentPrice, volatility, marketTrend, priceHistory, wallet, closedTrades, position, activePositions
- ✅ Ações: openPosition, closePosition, setPrice, setCurrentPrice, addPriceHistory, etc.
- ⚠️ `price` e `currentPrice` duplicados (débito técnico leve)

### 4.4 Utilitários
- ✅ `formatCurrency.ts`, `priceCalc.ts`, `volatilityEngine.ts`
- ✅ `useBinancePrice.ts` — WebSocket real da Binance (não utilizado)
- ✅ `useTradingEngine.ts` — engine alternativa (não utilizada)
- ✅ `useMarketVolatility.ts` — simulador de volatilidade (não utilizado)
- ✅ `useKeyboardShortcuts.ts` — atalhos L/S/X (não utilizado)

### 4.5 Páginas
- ✅ `/trading` — página principal com grid de componentes
- ✅ `/leaderboard` — página isolada do ranking
- ✅ `/achievements` — página isolada das conquistas
- ✅ `/` — redirect para `/trading`

---

## 5. O que Precisa Corrigir

### 5.1 Remover duplicação `price` / `currentPrice`
- **Arquivo**: `src/store/tradingStore.ts`
- **Problema**: duas propriedades com mesmo valor, duas actions para setar.
- **Fix**: Manter apenas `currentPrice` (nome mais descritivo). Atualizar `MarketStatus.tsx` e `OrderBook.tsx` para lerem `currentPrice`.

### 5.2 `TradeControls` — botão de fechar posição não atualiza visual
- **Arquivo**: `src/components/trading/TradeControls.tsx`
- **Problema**: Após abrir posição, o botão muda para "FECHAR POSIÇÃO", mas o `PositionPanel` só atualiza se `position` mudar. A lógica funciona, mas a UX é confusa porque o preço nunca se move (hoje).
- **Fix**: Funcionará naturalmente quando o engine de preço estiver conectado.

### 5.3 `ChartCanvas` — resize pode dar altura zero
- **Arquivo**: `src/components/trading/ChartCanvas.tsx`
- **Problema**: `containerRef.current.clientHeight` pode retornar 0 se o flexbox não tiver altura definida.
- **Fix**: Adicionar `minHeight: "350px"` ao container já existe, mas garantir que o canvas use `Math.max(350, clientHeight)`.

### 5.4 `OrderBook` — atualização independente do preço
- **Arquivo**: `src/components/trading/OrderBook.tsx`
- **Problema**: O book gera bids/asks a cada 2s com `Math.random()`, mas os preços só mudam quando `currentPrice` muda. A quantidade pisca sem sentido.
- **Fix**: Remover o `setInterval` interno. O book deve re-renderizar apenas quando `currentPrice` muda (via dependência do useEffect). As quantidades podem ser randômicas, mas só no momento da re-renderização por mudança de preço.

### 5.5 `Achievements` — lógica de desbloqueio não conectada
- **Arquivo**: `src/components/dashboard/Achievements.tsx`
- **Problema**: As conquistas só desbloqueiam via botão "Testar" manual. Não há listener no store.
- **Fix**: Criar um hook ou efeito que escuta mudanças no `tradingStore` (ex: `wallet > 11000` desbloqueia "Grande Vencedor").

### 5.6 `Leaderboard` — dados hardcoded
- **Arquivo**: `src/components/dashboard/Leaderboard.tsx`
- **Problema**: ranking fixo no código.
- **Fix**: Manter como está para MVP (não é prioridade), mas adicionar uma nota de que no futuro pode virar uma tabela global.

### 5.7 Persistência do Zustand pode conflitar com nova sessão
- **Arquivo**: `src/store/tradingStore.ts`
- **Problema**: Se o usuário já jogou antes, o localStorage contém `price: 45000`, posições antigas, etc. Ao entrar numa nova sessão TimeWarp, o preço inicial deveria vir dos dados históricos, não do cache.
- **Fix**: Ao iniciar uma sessão TimeWarp, resetar o store (limpar posições, trades, priceHistory) e sobrescrever o estado inicial com o preço do primeiro candle baixado.

---

## 6. O que Precisa Criar

### 6.1 `src/lib/binance-api.ts` — Cliente de Candles
**Responsabilidade**: Buscar candles horários da Binance API.

**Endpoint**: `GET https://api.binance.com/api/v3/klines`
**Parâmetros**:
- `symbol=BTCUSDT`
- `interval=1h`
- `startTime={timestampMs}`
- `limit=1000` (máximo da Binance)

**Resposta**: Array de arrays:
```
[
  1502942400000,  // Open time
  "4261.48000000", // Open
  "4280.56000000", // High
  "4180.00000000", // Low
  "4261.48000000", // Close
  ...
]
```

**Interface**:
```typescript
interface BinanceCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

async function fetchCandles(startTime: Date, limit?: number): Promise<BinanceCandle[]>;
```

### 6.2 `src/hooks/useTimewarpEngine.ts` — Engine Temporal
**Responsabilidade**: Orquestrar todo o fluxo TimeWarp.

**Algoritmo**:
```
1. sorteiaStartDate() -> Date entre 2017-12-01 e 2020-12-31
2. fetchCandles(startDate) -> BinanceCandle[]
3. Calcula preço inicial = candles[0].open
4. Reseta tradingStore (limpa trades, posições, zera history)
5. Define store.currentPrice = preço inicial
6. Inicia setInterval(100ms):
   a. realElapsedMs = Date.now() - simulationStartRealTime
   b. simulatedElapsedMs = realElapsedMs * 60
   c. simulatedTime = startDate.getTime() + simulatedElapsedMs
   d. Encontra candle[i] onde candle[i].openTime <= simulatedTime < candle[i+1].openTime
   e. Interpola preço: progress = (simulatedTime - candle[i].openTime) / 3600000
      price = candle[i].open + (candle[i].close - candle[i].open) * progress
   f. Atualiza store:
      - currentPrice = price
      - priceHistory (push a cada ~1s real = ~1min simulado)
      - marketTrend (comparando com média móvel de 20 candles)
      - volatility (desvio padrão dos últimos 24 candles)
```

**Interface**:
```typescript
interface UseTimewarpEngineReturn {
  isLoading: boolean;
  isPlaying: boolean;
  simulatedDate: Date;
  progressPercent: number; // % do array de candles já percorrido
  start: () => void;
  pause: () => void;
  reset: () => void;
}
```

### 6.3 `src/components/trading/SimulationClock.tsx` — Relógio Simulado
**Responsabilidade**: Mostrar a data/hora simulada em destaque na UI.

**Design**: Badge grande no topo, estilo "terminal de missão espacial".
```
┌─────────────────────────────────────┐
│  ⏱ SIMULAÇÃO: 15 Jan 2018 14:32   │
│  Velocidade: 60x │ Progresso: 12%   │
└─────────────────────────────────────┘
```

**Props**:
```typescript
interface SimulationClockProps {
  simulatedDate: Date;
  speed: number;
  progressPercent: number;
  isPlaying: boolean;
  onPause: () => void;
  onResume: () => void;
}
```

### 6.4 `src/components/trading/SimulationLoader.tsx` — Tela de Carregamento
**Responsabilidade**: Mostrar enquanto os candles estão sendo baixados da Binance.

**Mensagens**:
1. "Sorteando data de início..."
2. "Conectando à Binance..."
3. "Baixando 1.000 candles horários..."
4. "Preparando simulação..."
5. "Iniciando TimeWarp em 3... 2... 1..."

### 6.5 Atualização do `src/app/trading/page.tsx`
**Mudanças**:
- Importar `useTimewarpEngine`
- Substituir o `useEffect` de `mounted` por controle de loading da engine
- Adicionar `<SimulationClock />` entre `Header` e `MarketStatus`
- Enquanto `isLoading`, mostrar `<SimulationLoader />`
- Quando `isPlaying`, renderizar o grid normal

### 6.6 Atualização do `MarketStatus.tsx`
**Mudanças**:
- Ler `currentPrice` em vez de `price`
- A volatilidade agora vem calculada pelo engine (não mais hardcoded 1.5%)
- O trend também vem do engine (comparando com média móvel)

### 6.7 Atualização do `ChartCanvas.tsx`
**Mudanças**:
- `priceHistory` agora recebe um novo ponto a cada ~1 segundo real (60 minutos simulados)
- O canvas deve animar suavemente, não pular
- Considerar usar `requestAnimationFrame` em vez de `useEffect` para o desenho, para evitar re-renderizações do React a cada tick

### 6.8 Atualização do `NewsFeed.tsx`
**Mudanças**:
- As notícias atualmente são hardcoded e genéricas.
- **Ideia**: manter as notícias hardcoded por simplicidade, mas adicionar uma frase no topo: "Você está em Janeiro de 2018. O mercado está em pânico após o ATH de dezembro."
- Ou: criar um mapa de `dateRange -> notícias de contexto histórico`.

---

## 7. Especificações Técnicas Detalhadas

### 7.1 Fórmula de Interpolação Linear

Entre dois candles horários consecutivos:
```
candleA = candles[i]        // openTime = T1, close = P1
candleB = candles[i+1]      // openTime = T2, close = P2
simulatedTime = Ts

progress = (Ts - T1) / (T2 - T1)   // 0.0 a 1.0
price = P1 + (P2 - P1) * progress
```

Isso garante que o preço se mova suavemente dentro de cada hora, não em saltos de candle em candle.

### 7.2 Cálculo de Trend (Bull/Bear)

```
prices = últimos 20 candles fechados (close)
sma20 = média aritmética dos 20 preços

if currentPrice > sma20 * 1.01:
  trend = "bull"
elif currentPrice < sma20 * 0.99:
  trend = "bear"
else:
  trend = "neutral" (novo estado)
```

### 7.3 Cálculo de Volatilidade

```
prices = últimos 24 candles (1 dia)
returns = log(price[i] / price[i-1]) para i = 1..23
volatility = desvio_padrão(returns) * sqrt(365 * 24) * 100  // anualizada em %
```

Ou, mais simples para UI:
```
volatility = (max(últimos 24 candles) - min(últimos 24 candles)) / média * 100
```

### 7.4 Limites da API Binance

- Máximo 1.000 candles por request.
- Rate limit: 1.200 request weight por minuto para /api/v3/klines (weight=1 por request).
- **Estratégia**: Um único request de 1.000 candles horários cobre ~41 dias de história. Para o MVP, isso é suficiente (~1 mês de simulação por sessão).
- **Futuro**: Se quisermos mais dados, fazer paginação com múltiplos requests usando `endTime` do último candle como `startTime` do próximo.

### 7.5 Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Binance offline | Fallback para simulação random walk com seed baseada na data sorteada (reproduzível) |
| Rate limit atingido | Exponential backoff: esperar 1s, 2s, 4s... |
| Array de candles vazio | Mostrar erro "Nenhum dado histórico encontrado para esta data" e sortear nova data |
| Usuário pausa simulação | Engine para de atualizar o store. Preço congela. Trade ainda pode ser aberta/fechada no preço congelado. |

---

## 8. Checklist de Implementação

### Fase 1: Fundação
- [ ] Criar `src/lib/binance-api.ts` com fetch de candles
- [ ] Criar `src/hooks/useTimewarpEngine.ts` com sorteio, download e loop
- [ ] Criar `src/components/trading/SimulationLoader.tsx`
- [ ] Atualizar `src/app/trading/page.tsx` para usar engine + loader

### Fase 2: Correções
- [ ] Unificar `price` e `currentPrice` no store
- [ ] Resetar store ao iniciar nova sessão TimeWarp
- [ ] Corrigir `ChartCanvas` altura zero
- [ ] Corrigir `OrderBook` para reagir só a mudança de preço
- [ ] Corrigir `TradeControls` lógica de TP/SL (opcional)

### Fase 3: UI/UX
- [ ] Criar `SimulationClock.tsx`
- [ ] Atualizar `MarketStatus` para ler trend/vol do engine
- [ ] Adicionar controles de play/pause no clock
- [ ] Melhorar `NewsFeed` com contexto histórico (opcional)

### Fase 4: Polish
- [ ] Conectar achievements ao store (desbloqueio automático)
- [ ] Adicionar sound effects (opcional)
- [ ] Testar em diferentes datas sorteadas
- [ ] Verificar performance do canvas com priceHistory crescendo

---

## 9. Métricas de Sucesso

- [ ] Usuário entra em `/trading` e em < 3 segundos vê o loader desaparecer e o relógio simulado começar a andar.
- [ ] Preço do BTC se move de forma contínua e suave, refletindo dados reais da Binance.
- [ ] Uma "hora simulada" leva exatamente 1 minuto real (+/- tolerância do setInterval).
- [ ] Abrir e fechar uma posição durante a simulação atualiza P&L, carteira e histórico corretamente.
- [ ] Ao recarregar a página, uma NOVA data é sorteada (sessões independentes).

---

## 10. Notas de Escopo

### In-Scope (MVP)
- Sorteio de data entre Dez/2017 e Dez/2020
- Download de até 1.000 candles horários da Binance
- Simulação a 60x com interpolação linear
- Relógio simulado na UI
- Play/Pause

### Out-of-Scope (Futuro)
- Múltiplos timeframes (15min, 4h, 1d)
- Múltiplos pares de trading (ETH, SOL, etc.)
- Order book real da Binance (hoje é sintético)
- Leaderboard global com backend
- Replay de sessões passadas
- Exportação de trades para CSV real
