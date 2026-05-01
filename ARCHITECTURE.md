# Crypto Tycoon Pro — Análise Arquitetural dos Componentes

> Data: 2026-05-01
> Contexto: Projeto saiu de um estado híbrido (Neural Cortex + Trading) para um simulador puro. Este documento explica o que cada componente faz, como se comunica (ou não) com os outros, e por que a tela parece "morta" exceto pelo feed de notícias.

---

## 1. O Problema Central

**Nada se move porque ninguém atualiza o preço.**

O `tradingStore.ts` inicializa o BTC a **$45.000,00** e a volatilidade a **1,5%**. Esses valores são *imutáveis* em runtime. Não existe nenhum `setInterval`, nenhum WebSocket e nenhum hook conectado ao store que faça o preço oscilar. O resultado: o `MarketStatus` mostra $45.000 pra sempre, o `ChartCanvas` desenha uma linha reta, e o `OrderBook` gera bids/asks em torno de $45.000 sem nunca mudar.

O único componente com "vida" é o `NewsFeed`, que troca notícias hardcoded a cada 30 segundos via `setInterval` próprio. Daí o usuário olhar e pensar: "só as notícias funcionam".

---

## 2. A Pilha de Estado — `tradingStore.ts` (Zustand + Persist)

### 2.1 O que é

O coração da aplicação é um store Zustand com middleware de persistência no `localStorage` (chave: `trading-storage`). Isso significa que, se você abrir uma posição, fechar o browser e voltar amanhã, sua carteira e suas trades ainda estarão lá.

### 2.2 Estado inicial

```
price:           45000        // Preço BTC exibido no MarketStatus
currentPrice:    45000        // Mesmo valor, usado pelos componentes de trading
volatility:      1.5          // % de volatilidade (estático)
marketTrend:     "bull"       // Trend fixo pra sempre
priceHistory:    Array(50)    // 50 pontos aleatórios entre 44k e 46k
wallet:          10000        // Saldo inicial em USD
closedTrades:    []           // Nenhuma trade fechada ainda
position:        null         // Sem posição aberta
activePositions: []           // Lista vazia
isLoading:       false        // Flag de carregamento
```

### 2.3 O fluxo de uma trade completa

1. **Abertura** — `TradeControls` chama `openPosition(leverage, size, tp, sl)`
   - Cria um objeto `Position` com `entry = currentPrice` (45000), `type = "long"`, `size`, `leverage`
   - Deduz da carteira: `wallet -= size / leverage` (margem)
   - Guarda em `position` e `activePositions`

2. **Acompanhamento** — `PositionPanel` calcula P&L não-realizado em tempo real:
   ```
   unrealizedPnL = (currentPrice - entry) * (size / leverage)
   ```
   - Se o preço sobesse para 46.000, o P&L seria positivo.
   - **Mas o preço nunca sobe.** Então o P&L fica zero pra sempre.

3. **Fechamento** — `TradeControls` chama `closePosition()`
   - Calcula P&L final: `(currentPrice - entry) * (size / leverage)`
   - Devolve margem + lucro/prejuízo para `wallet`
   - Adiciona `{ pnl }` ao array `closedTrades`
   - Limpa `position` e `activePositions`

4. **Histórico** — `PnLDisplay` lê `closedTrades` e mostra:
   - Total de trades fechadas
   - Win rate (% de trades positivas)
   - Maior lucro / maior prejuízo

### 2.4 O elefante na sala: `price` vs `currentPrice`

O store mantém **duas propriedades com o mesmo valor** (`price` e `currentPrice`). Isso é um vestígio de refatoração. O `MarketStatus` e `OrderBook` leem `price`. O `ChartCanvas`, `PositionPanel`, `PnLDisplay` e `TradeControls` leem `currentPrice`. O `setPrice()` e `setCurrentPrice()` atualizam ambas ao mesmo tempo. Não é um bug, é redundância técnica.

---

## 3. Análise Componente por Componente

### 3.1 `NewsFeed.tsx` — O Único que "Funciona"

**Por que funciona:** é 100% autônomo. Tem um array `NEWS_ITEMS` hardcoded com 6 notícias de crypto. Usa `useEffect` para:
1. Inicializar o estado com 3 notícias aleatórias.
2. Rodar um `setInterval` de 30s que pega uma notícia aleatória do array e coloca no topo.

**Dependências externas:** zero. Não lê o Zustand store. Não lê API. Não lê localStorage (exceto se fosse persistente, mas não é).

**Problema:** as notícias são sempre as mesmas 6. Em feriado ou não, o feed mostra "Elon Musk twitta sobre Dogecoin" independente da realidade do mercado.

---

### 3.2 `MarketStatus.tsx` — O Termômetro Morto

**O que faz:** lê `price`, `volatility` e `marketTrend` do store e renderiza uma barra colorida.

**Por que parece morto:**
- `price` = 45000 pra sempre.
- `volatility` = 1.5 pra sempre.
- `marketTrend` = "bull" pra sempre.

O componente usa Tailwind para pintar a barra de verde (`bg-green-900/20`) quando `marketTrend === "bull"`. Como nunca muda, a barra nunca fica vermelha. O pulsar do indicador (`animate-pulse`) funciona, mas é CSS puro — não reflete movimento de mercado.

**Como deveria funcionar:** algum hook externo (ex: `useBinancePrice`) deveria chamar `setPrice()` e `setMarketTrend()` a cada tick do WebSocket.

---

### 3.3 `ChartCanvas.tsx` — Canvas Estático

**O que faz:** usa a API HTML5 Canvas para desenhar um gráfico de linha.

**O algoritmo de desenho:**
1. Limpa o canvas com cor `#1f2937` (cinza escuro).
2. Desenha linhas de grid horizontais a cada 40px.
3. Pega os últimos 50 pontos de `priceHistory`.
4. Calcula `minPrice` e `maxPrice` desses 50 pontos.
5. Mapeia cada ponto para coordenadas X/Y do canvas.
6. Desenha uma linha verde (`#22c55e`) conectando os pontos.
7. Desenha um círculo verde no último ponto + label de preço.

**Por que parece morto:**
- `priceHistory` é gerado **uma única vez** na inicialização do store (50 números aleatórios entre 44k e 46k).
- Depois disso, nunca é atualizado. O `useEffect` do Canvas só re-executa quando `priceHistory`, `currentPrice` ou `dimensions` mudam.
- Como nenhum desses três muda, o canvas é desenhado **uma vez** e congela.

**Problema de layout secundário:** o componente usa `containerRef.current.clientHeight` para definir a altura do canvas. Se o container não tiver altura explícita no primeiro render, `clientHeight` pode ser 0 ou 350px (do `minHeight`). O canvas pode estar desenhando "achatado" ou com proporções estranhas.

---

### 3.4 `OrderBook.tsx` — Book Sintético Congelado

**O que faz:** simula um book de ordens (bids e asks) em 5 níveis.

**O algoritmo:**
- Bids: `currentPrice - i * 2` para i = 5, 4, 3, 2, 1
- Asks: `currentPrice + i * 2` para i = 1, 2, 3, 4, 5
- Quantidades: `Math.random() * 0.5 + 0.1` BTC
- Atualiza a cada 2 segundos via `setInterval`

**Por que parece morto:**
- As quantidades (segunda coluna) mudam a cada 2s porque usam `Math.random()`.
- **Mas os preços (primeira coluna) NÃO mudam** porque dependem de `currentPrice`, que é 45000 pra sempre.
- O usuário vê números piscando na coluna da direita, mas a coluna da esquerda é uma tabela estática: 44990, 44992, 44994, 44996, 44998, 45000, 45002, 45004, 45006, 45008.

**Dependência externa:** lê `state.price` do Zustand store via selector `useTradingStore((state) => state.price)`.

---

### 3.5 `PnLDisplay.tsx` — Carteira e Estatísticas

**O que faz:** mostra o saldo da carteira, P&L da sessão, número de trades, win rate, e melhor/pior trade.

**O algoritmo:**
- `sessionPnL = closedTrades.reduce((acc, trade) => acc + trade.pnl, 0)`
- Win rate = `trades positivas / total trades * 100`

**Por que parece vazio:**
- `wallet` começa em $10.000,00. Mostra isso corretamente.
- `closedTrades` é um array vazio `[]`.
- Portanto: P&L = $0.00, trades = 0, win rate = 0%, sem maiores lucros/prejuízos.

**Quando encheria de dados:** depois que o usuário abrir e fechar uma posição via `TradeControls`. Mas como o preço nunca muda, toda trade fechada dá P&L = 0. O histórico teria trades, mas todas com lucro zero.

---

### 3.6 `PositionPanel.tsx` — Painel de Posição

**O que faz:** mostra a posição aberta atual (se houver).

**Dois estados:**
1. **Sem posição:** mostra "Sem posição aberta" em cinza.
2. **Com posição:** mostra tipo (LONG/SHORT), preço de entrada, preço atual, tamanho, P&L não-realizado e preço de liquidação.

**Por que parece morto:**
- `position` inicial é `null`, então sempre mostra o estado 1.
- Mesmo que o usuário clique em "ABRIR LONG", o preço não muda, então o P&L não-realizado será sempre zero.
- A fórmula de liquidação: `entry * (1 - 1/leverage)`. Com entry=45000 e leverage=10x, liquidação = 45000 * 0.9 = 40500. O preço nunca chega lá, então ninguém é liquidado.

---

### 3.7 `TradeControls.tsx` — Controles de Ordem

**O que faz:** slider de alavancagem (2x–100x), slider de tamanho da posição, inputs de TP/SL, e botão de ação.

**O algoritmo do botão:**
- Se `!position` -> chama `openPosition(leverage, positionSize, tpPrice, slPrice)`
- Se `position` -> chama `closePosition()`

**Por que parece morto:**
- O botão diz "ABRIR LONG" porque `position` é `null`.
- O slider de tamanho vai de 100 até `wallet` (10.000).
- O slider de alavancagem vai de 2 até 100.
- **Funciona** — clicar em "ABRIR LONG" abre uma posição, muda o botão para "FECHAR POSIÇÃO", e deduz a margem da carteira.
- **Mas a experiência é sem graça** porque, após abrir, o P&L fica em zero eternamente e o preço não se move.

**Bug conhecido:** os parâmetros `tpPrice` e `slPrice` são passados para `openPosition` como strings, mas a função os recebe como `_tpPrice` e `_slPrice` (prefixo underscore = ignorados). Não existe lógica de stop-loss ou take-profit no store.

---

### 3.8 `Leaderboard.tsx` — Ranking Fake

**O que faz:** mostra uma lista hardcoded de 5 traders fictícios com P&L positivo.

**Por que parece morto:** é literalmente um array fixo no código-fonte. Não lê API, não lê store, não lê localStorage. Os nomes (WhaleBot_α, CryptoKing99, etc.) e os valores ($25.430, $18.750, etc.) estão hardcoded. O botão "Copiar Robô IA" dispara um `alert()`.

**Dependências externas:** zero.

---

### 3.9 `Achievements.tsx` — Conquistas Locais

**O que faz:** exibe 4 conquistas. Usa `localStorage` (chave: `crypto_tycoon_achievements`) para persistir quais foram desbloqueadas.

**O algoritmo:**
- No mount, lê `localStorage.getItem("crypto_tycoon_achievements")`.
- Se existir, marca as conquistas correspondentes como `unlocked: true`.
- Cada conquista tem um botão "Testar" que permite desbloqueá-la manualmente.

**Por que parece morto:**
- Inicialmente 1/4 desbloqueada ("Primeira Trade" está hardcoded como `unlocked: true`).
- As outras 3 aparecem bloqueadas (cinza/opaco).
- O usuário pode clicar em "Testar" para desbloquear, mas isso não acontece automaticamente — a lógica de desbloqueio real (ex: detectar lucro > $1000) não está implementada no store.

---

### 3.10 `Header.tsx` — Cabeçalho

**O que faz:** barra de navegação com links para `/trading`, `/leaderboard`, `/achievements`.

**Estado atual:** os links funcionam porque as páginas existem. O botão "Exportar CSV" é um `console.log()` vazio.

---

## 4. O Que Existe Mas Não Está Conectado

### 4.1 `useBinancePrice.ts`

Este hook existe em `src/hooks/useBinancePrice.ts` e **não é usado por ninguém**. Ele abre uma conexão WebSocket real com a Binance (`wss://stream.binance.com:9443/ws/btcusdt@ticker`) e retorna:
- `price` (preço atual)
- `priceChange` (variação 24h)
- `priceChangePercent` (variação % 24h)

**Se estivesse conectado:** o preço do BTC seria atualizado em tempo real a cada ~1s, e o gráfico, o book e o P&L ganhariam vida.

### 4.2 `useTradingEngine.ts`

Outro hook órfão. É uma engine alternativa de trading com `localStorage` próprio. Tem lógica de LONG e SHORT, mas os componentes atuais só usam o `tradingStore.ts`.

### 4.3 `useMarketVolatility.ts`

Hook que simula volatilidade (gera números aleatórios entre 2% e 7%). Não está conectado a nenhum componente.

### 4.4 `useKeyboardShortcuts.ts`

Hook que escuta teclas `L` (long), `S` (short), `X` (close). Não está conectado a nenhum componente.

---

## 5. Resumo do Diagnóstico

| Componente | Renderiza? | Por que parece morto? |
|---|---|---|
| `NewsFeed` | ✅ Sim | É o único com `setInterval` próprio atualizando estado |
| `MarketStatus` | ✅ Sim, mas estático | `price`, `volatility`, `marketTrend` nunca mudam |
| `ChartCanvas` | ✅ Sim, uma vez | `priceHistory` nunca é atualizado depois do mount |
| `OrderBook` | ✅ Sim, mas preços fixos | Preços dependem de `currentPrice` que é estático |
| `PnLDisplay` | ✅ Sim, mas vazio | `closedTrades` vazio, nenhuma trade foi fechada |
| `PositionPanel` | ✅ Sim, "Sem posição" | `position` começa `null` e o preço nunca move pra criar P&L |
| `TradeControls` | ✅ Sim | Funciona, mas abrir posição é sem graça sem movimento de preço |
| `Leaderboard` | ✅ Sim | Hardcoded, não é "vivo" mas renderiza |
| `Achievements` | ✅ Sim | 1/4 desbloqueada, o resto requer interação manual |
| `Header` | ✅ Sim | Links funcionam |

**Conclusão:** todos os componentes renderizam. O problema não é que eles estão quebrados — é que **não existe uma fonte de dados atualizando o preço do BTC**. O simulador simula trades, mas não simula o mercado.

---

## 6. Como Fazer Funcionar de Verdade (Roadmap Técnico)

### Opção A: Conectar o WebSocket da Binance (Real)
1. Importar `useBinancePrice` em `src/app/trading/page.tsx`.
2. A cada tick do WebSocket, chamar `tradingStore.setPrice(newPrice)`.
3. O `priceHistory` precisaria de um `setInterval` separado que chame `addPriceHistory(currentPrice)` a cada 1s para alimentar o gráfico.
4. O `MarketStatus` ganharia vida automaticamente.

### Opção B: Simulador Puro (Sem Internet)
1. Criar um hook `usePriceSimulator()` que rode `setInterval` a cada 500ms.
2. A cada tick, aplicar um random walk no preço: `newPrice = oldPrice * (1 + (Math.random() - 0.5) * volatility)`.
3. Atualizar `price`, `currentPrice`, `priceHistory`, e calcular `marketTrend` comparando com a média móvel.
4. Dá pra fazer tudo offline, sem depender de API externa.

### Opção C: Híbrido (Recomendado)
- Usar WebSocket da Binance quando online.
- Fallback para simulador random walk quando offline ou em erro de conexão.
- Isso é o que a maioria dos simuladores profissionais faz.

---

## 7. Notas Técnicas de Implementação

### Hydration Mismatch
A página `/trading/page.tsx` tem:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```
Isso evita hydration mismatch entre server e client (o Zustand persist só existe no browser). O efeito colateral é um flash de tela branca no primeiro load. Em produção, isso deveria ser substituído por um skeleton loader.

### Persistência do Zustand
O store usa `persist` com `name: "trading-storage"`. Se o usuário já abriu o app antes, o `localStorage` pode conter dados antigos (ex: posição aberta, carteira zerada). Para "resetar", é necessário limpar o localStorage do browser ou mudar a chave do persist.

### O Canvas e o Resize
O `ChartCanvas` lê `containerRef.current.clientWidth/Height`. Se o usuário redimensionar a janela, o canvas é redesenhado. Mas se o container pai não tem altura definida (ex: flexbox sem `flex-1`), o `clientHeight` pode ser 0 e o canvas não desenha nada.

### Type Safety
O projeto usa TypeScript strict. Todas as interfaces de trading estão em `src/types/trading.ts`. O store é fortemente tipado, o que é bom, mas a duplicação `price`/`currentPrice` é um débito técnico.
