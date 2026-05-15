# Plano de Testes Manuais

**Contexto:** Derivados dos bugs encontrados durante a refatoração de testes (maio/2026).
Áreas de risco: wallet floor em reduce/flip/close, canFlip boundary, TP/SL auto-criado,
múltiplos pending orders simultâneos, liquidação via wick.

**Como registrar:** marque ✅ passou · ❌ falhou (descreva o que viu) · ⏭️ não testado.

---

## Grupo A — Wallet floor em reduce/close

> Risco: `computePartialReduce` e `computeHedgeFlip` não têm `Math.max(0, ...)`.
> Wallet pode ficar negativo em casos de perda extrema.

---

### T01 — Reduce com perda maior que wallet

| | |
|---|---|
| **Setup** | Abra LONG $5.000 @ ~50k com 10x (margin=$500). Wallet inicial $10.000 → wallet restante $9.500. |
| **Passos** | 1. Aguarde preço cair para ~47k (perda de 6% → PnL ≈ −$600). <br>2. Selecione SHORT, mova slider para $3.000. <br>3. Clique **REDUCE POSITION**. |
| **Esperado** | Posição reduz para $2.000. Wallet recebe $300 de margin devolvida − PnL proporcional da parte reduzida. Wallet no painel **nunca exibe valor negativo**. |
| **Resultado** | |
| **Notas** | |

---

### T02 — Fechar posição com prejuízo extremo (quase liquidação)

| | |
|---|---|
| **Setup** | LONG $10.000 @ 50k com 50x (liq ≈ 49k, margin=$200). Wallet inicial $1.000. |
| **Passos** | 1. Aguarde preço cair para ~49.1k (≈ 98% das perdas realizadas). <br>2. Clique **CLOSE POSITION** manualmente. |
| **Esperado** | Trade registrado com PnL fortemente negativo. Wallet resultante ≥ $0. Painel de PnL não exibe "NaN" ou valor inválido. |
| **Resultado** | |
| **Notas** | |

---

### T03 — Flip com posição em prejuízo: wallet não fica negativo

| | |
|---|---|
| **Setup** | LONG $2.000 @ 50k com 10x. Wallet $10.000. Preço cai para 46k (perda de 8% → PnL ≈ −$320). |
| **Passos** | 1. Selecione SHORT. <br>2. Mova slider para $2.100 (excess=$100, excessMargin=$10). <br>3. Clique **FLIP TO SHORT**. |
| **Esperado** | Flip executado. Posição SHORT $100 aberta. Wallet = wallet_anterior + margin_devolvida + PnL_fechamento − excessMargin. Wallet **≥ 0**. |
| **Resultado** | |
| **Notas** | |

---

### T04 — INCREASE desabilitado quando wallet é exatamente zero

| | |
|---|---|
| **Setup** | Wallet $100 exatamente. Abra LONG $1.000 @ 50k com 10x (margin=$100 — consome tudo). |
| **Passos** | 1. Com posição aberta e wallet=$0, selecione LONG. <br>2. Mova slider para qualquer valor. <br>3. Observe o botão de ação. |
| **Esperado** | Botão **INCREASE POSITION** aparece desabilitado. Clique não executa nem gera erro visível. |
| **Resultado** | |
| **Notas** | |

---

### T05 — Reduce via limit com preço adverso: wallet correto

| | |
|---|---|
| **Setup** | LONG $3.000 @ 50k com 10x. Wallet $9.700. |
| **Passos** | 1. Coloque limit SHORT $3.000 @ 52k. <br>2. Aguarde candle com high ≥ 52k (order dispara pelo wick). <br>3. Confira wallet e histórico. |
| **Esperado** | Posição fechada (reduce total). Wallet recebe margin + PnL do fechamento @ 52k. Wallet **≥ 0**. Ordem marcada como "filled" no histórico. |
| **Resultado** | |
| **Notas** | |

---

## Grupo B — Flip e canFlip boundary

> Risco: `computeHedgeFlip` não tem clamp. No slider máximo exato, `newWallet` pode
> ficar em −$0.000x por imprecisão de float. Comportamento de canFlip em edge cases.

---

### T06 — Flip no slider máximo absoluto: wallet não fica em float negativo

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x. Wallet $500. Preço sobe para 51k (posição em lucro). |
| **Passos** | 1. Selecione SHORT. <br>2. Arraste slider até o **máximo** (trava no limite calculado). <br>3. Clique **FLIP TO SHORT**. |
| **Esperado** | Flip executa. Wallet exibido ≥ $0 (não −$0.01 por arredondamento). liqPrice da nova posição está **acima** do preço de entrada (curto). |
| **Resultado** | |
| **Notas** | |

---

### T07 — Flip com posição em prejuízo: slider max reflete effectiveWallet

| | |
|---|---|
| **Setup** | SHORT $1.000 @ 50k com 10x. Wallet $60. Preço sobe para 52k (short em perda). |
| **Passos** | 1. Selecione LONG. <br>2. Observe o valor máximo do slider. <br>3. Tente arrastar para o máximo e clique **FLIP TO LONG**. |
| **Esperado** | Slider max = position.size + effectiveWallet×leverage. effectiveWallet = 60 + 100 − 40 = 120 → max ≈ $2.200. Flip executa sem erro. Wallet ≥ $0. |
| **Resultado** | |
| **Notas** | |

---

### T08 — Flip cancela TP/SL do lado antigo automaticamente

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com TP @ 55k e SL @ 45k configurados (pending orders criados). |
| **Passos** | 1. Selecione SHORT, slider em $1.100. <br>2. Clique **FLIP TO SHORT**. <br>3. Abra painel de ordens. |
| **Esperado** | TP e SL do LONG aparecem como **"canceled"** no histórico. Nenhum pending order órfão na lista de ativos. |
| **Resultado** | |
| **Notas** | |

---

### T09 — Flip via limit order dispara pelo wick: nova posição correta

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x. Wallet $200. |
| **Passos** | 1. Selecione SHORT, Limit, slider $1.100, limit price $52k. <br>2. Clique **Place Short Limit**. <br>3. Aguarde candle com high ≥ 52k. |
| **Esperado** | Limit dispara @ 52k. Posição vira SHORT $100 (excess = 1100−1000). Wallet recebe margin devolvida + PnL. Verifique liqPrice da nova posição SHORT. |
| **Resultado** | |
| **Notas** | |

---

### T10 — reduceOnly=true: slider nunca ultrapassa position.size em modo oposto

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x. Ative **Reduce Only**. |
| **Passos** | 1. Selecione SHORT. <br>2. Tente arrastar slider para $1.500. <br>3. Observe label do botão e valor máximo do slider. |
| **Esperado** | Slider trava em $1.000 (position.size). Label sempre mostra **"REDUCE POSITION"**, nunca "FLIP TO SHORT". |
| **Resultado** | |
| **Notas** | |

---

## Grupo C — TP/SL auto-criado

> Risco: `openPosition` com TP/SL chama `setPositionTpSl` internamente, criando
> pending orders. Interações com candle que atinge TP e SL simultaneamente.

---

### T11 — Limit com TP dispara: pending TP é criado, não duplicado

| | |
|---|---|
| **Setup** | Sem posição. Coloque limit LONG $1.000 @ 48k com TP @ 55k. |
| **Passos** | 1. Aguarde candle com low ≤ 48k. <br>2. Abra painel de ordens. |
| **Esperado** | Posição LONG aberta com tpPrice=55k. **Exatamente 1** pending order de take_profit @ 55k. Nenhuma ordem duplicada. |
| **Resultado** | |
| **Notas** | |

---

### T12 — Fechar manualmente com TP/SL pendentes: pending orders cancelados

| | |
|---|---|
| **Setup** | Abra LONG com TP @ 55k e SL @ 45k (pending orders existem). |
| **Passos** | 1. Clique **CLOSE POSITION** manualmente (antes do TP/SL disparar). <br>2. Verifique painel de ordens. |
| **Esperado** | Posição fecha. Pending TP e SL mudam para **"canceled"** no histórico. Lista de pending orders ativos fica **vazia**. |
| **Resultado** | |
| **Notas** | |

---

### T13 — TP e SL no mesmo candle: posição fecha exatamente uma vez

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com TP @ 55k e SL @ 45k. |
| **Passos** | 1. Aguarde (ou simule) candle com high ≥ 55k **e** low ≤ 45k. <br>2. Observe wallet, histórico de trades e histórico de ordens. |
| **Esperado** | **1 único trade** no histórico. Wallet atualizado uma vez. Não há dois trades de fechamento. O outro pending (TP ou SL que não "ganhou") fica "canceled". |
| **Resultado** | |
| **Notas** | |

---

### T14 — Limit dispara e TP do mesmo candle: TP executa no tick seguinte, não no mesmo

| | |
|---|---|
| **Setup** | Sem posição. Limit LONG $1.000 @ 48k com TP @ 49k. |
| **Passos** | 1. Aguarde candle com low ≤ 48k **e** high ≥ 49k. <br>2. Observe se posição chegou a existir ou foi aberta e fechada no mesmo frame. |
| **Esperado** | O TP foi criado **depois** que o limit disparou (no mesmo tick). Resultado aceitável: posição abre e fecha no mesmo candle visualmente. O que **não** deve ocorrer: wallet incorreto, posição órfã, ou crash. |
| **Resultado** | |
| **Notas** | |

---

### T15 — Cancelar limit antes de disparar: TP/SL não fica órfão

| | |
|---|---|
| **Setup** | Coloque limit LONG $1.000 @ 48k com TP @ 55k (ordem ainda não disparou — preço acima de 48k). |
| **Passos** | 1. Cancele o limit no painel de ordens. <br>2. Verifique pending orders ativos. |
| **Esperado** | Limit marcado como "canceled". **Nenhum** pending TP aparece (position nunca abriu). Lista de ativos vazia. |
| **Resultado** | |
| **Notas** | |

---

## Grupo D — Múltiplos pending orders simultâneos

> Risco: `checkPendingOrders` itera `executed` sequencialmente. Segunda ordem vê
> estado já modificado pela primeira. Interações não testadas automaticamente.

---

### T16 — Dois limits LONG disparam no mesmo candle

| | |
|---|---|
| **Setup** | Sem posição. Limit LONG $500 @ 49k. Limit LONG $300 @ 48k. |
| **Passos** | 1. Aguarde candle com low ≤ 47.5k. <br>2. Verifique posição e wallet. |
| **Esperado** | Posição LONG size=$800 (500+300). Wallet deduz margin de ambos. Histórico mostra 2 ordens "filled". liqPrice recalculada para $800. |
| **Resultado** | |
| **Notas** | |

---

### T17 — Limit LONG e Limit SHORT simultâneos (sem posição, sem reduceOnly)

| | |
|---|---|
| **Setup** | Sem posição. reduceOnly=**off**. Limit LONG $1.000 @ 49k. Limit SHORT $800 @ 49k. |
| **Passos** | 1. Aguarde (ou simule) preço = 49k. <br>2. Verifique posição, wallet e histórico. |
| **Esperado** | LONG dispara primeiro → posição LONG $1.000. SHORT ($800 < $1.000) → REDUCE → posição LONG $200. Wallet consistente. Sem estado inválido. |
| **Resultado** | |
| **Notas** | |

---

### T18 — Cancelar um de dois limits antes do tick

| | |
|---|---|
| **Setup** | Limit LONG $500 @ 49k e Limit LONG $300 @ 48k (ambos pendentes). |
| **Passos** | 1. Cancele o segundo ($300 @ 48k). <br>2. Aguarde candle com low ≤ 47.5k. <br>3. Verifique posição. |
| **Esperado** | Posição LONG $500 (só o primeiro). Segundo está "canceled". Wallet deduz margin apenas de $500. |
| **Resultado** | |
| **Notas** | |

---

### T19 — Limit com SL embutido: SL pending registrado no preço correto

| | |
|---|---|
| **Setup** | Sem posição. Limit LONG $1.000 @ 48k com SL @ 45k. |
| **Passos** | 1. Aguarde candle com low ≤ 48k. <br>2. Abra painel de ordens. |
| **Esperado** | Posição aberta com slPrice=45k. **1** pending stop_loss @ 45k no painel. Nenhuma duplicata. |
| **Resultado** | |
| **Notas** | |

---

### T20 — TP dispara via wick, SL criado no mesmo tick é cancelado

| | |
|---|---|
| **Setup** | Limit LONG $1.000 @ 48k com TP @ 52k e SL @ 45k. Limit dispara. |
| **Passos** | 1. Aguarde candle com high ≥ 52k (TP pelo wick). <br>2. Confira histórico de ordens. |
| **Esperado** | Posição fecha pelo TP. SL aparece como "canceled". Wallet reflete lucro do TP. Sem posição residual. |
| **Resultado** | |
| **Notas** | |

---

## Grupo E — Reduce-only e edge cases de tamanho

---

### T21 — Reduce posição para $1 (quase zero)

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x. |
| **Passos** | 1. Selecione SHORT, slider em $999. <br>2. Clique **REDUCE POSITION**. <br>3. Verifique painel de posição. |
| **Esperado** | Posição LONG $1 exibida. liqPrice recalculada corretamente. Wallet aumenta (margin $99.9 + PnL). Próxima ação: fechar os $1 restantes deve funcionar normalmente. |
| **Resultado** | |
| **Notas** | |

---

### T22 — Abrir posição com wallet exatamente igual à margin (sem folga)

| | |
|---|---|
| **Setup** | Wallet $1.000 exatamente. Sem posição. Leverage 10x. |
| **Passos** | 1. Mova slider para $10.000 (margin = $1.000 = wallet exato). <br>2. Clique **Open Long**. |
| **Esperado** | Posição abre. Wallet = $0 exato (não −$0.01). liqPrice ≈ 45k (10% abaixo de 50k). Botão INCREASE POSITION desabilitado (wallet=0). |
| **Resultado** | |
| **Notas** | |

---

### T23 — Mudar leverage com posição aberta: liqPrice recalcula ou bloqueia

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x (liqPrice ≈ 45k). |
| **Passos** | 1. Selecione leverage 20x no seletor. <br>2. Observe liqPrice no painel de posição. |
| **Esperado** | **Opção A (leverage change permitida):** liqPrice sobe para ≈ 47.5k (mais perto do preço). Wallet inalterado. **Opção B (bloqueada):** botão desabilitado ou erro claro. Nenhum estado intermediário inválido. |
| **Resultado** | |
| **Notas** | |

---

### T24 — reduceOnly=true + limit SHORT > position.size: comportamento do excesso

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x. reduceOnly=**on**. |
| **Passos** | 1. Selecione SHORT, Limit, slider $1.500, limit @ 52k. <br>2. Clique **Place Short Limit**. <br>3. Aguarde disparo. |
| **Esperado** | Com reduceOnly=true, a execução deve reduzir/fechar a posição ($1.000). O excesso ($500) **não** deve abrir uma posição SHORT. Observar se: (a) apenas $1.000 é executado, ou (b) order é colocada mas dispara como reduce-only. Qualquer abertura de SHORT seria bug. |
| **Resultado** | |
| **Notas** | |

---

### T25 — Trailing stop + reduce parcial: trailing persiste na posição reduzida

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x. Configure trailing stop de 2%. |
| **Passos** | 1. Reduce para $500 (SHORT slider $500 → REDUCE). <br>2. Observe o trailing stop no painel de posição. |
| **Esperado** | Trailing stop de 2% continua ativo. Trailing stop price é recalculado para a posição de $500. Sem erro ou trailing price zerado. |
| **Resultado** | |
| **Notas** | |

---

## Grupo F — Liquidação via wick

---

### T26 — Liquidação LONG pelo wick (preço interpolado acima do liq)

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com 10x (liq ≈ 45k). Wallet $9.900. |
| **Passos** | 1. Deixe o simulador avançar. <br>2. Aguarde candle com low < 45k mas que feche acima. <br>3. Verifique o estado. |
| **Esperado** | Posição liquidada. Histórico mostra "liquidation". Wallet vai para **≥ $0** (não negativo). Toast ou banner de liquidação exibido. |
| **Resultado** | |
| **Notas** | |

---

### T27 — Liquidação SHORT pelo wick high

| | |
|---|---|
| **Setup** | SHORT $1.000 @ 50k com 10x (liq ≈ 55k). Wallet $9.900. |
| **Passos** | 1. Aguarde candle com high > 55k mas que feche abaixo. <br>2. Verifique estado. |
| **Esperado** | Posição liquidada. Wallet ≥ $0. Histórico mostra "liquidation" com exitPrice ≈ 55k. |
| **Resultado** | |
| **Notas** | |

---

### T28 — Liquidação com TP/SL pendentes: pending orders cancelados

| | |
|---|---|
| **Setup** | LONG $1.000 @ 50k com TP @ 60k e SL @ 45k (pending orders ativos). |
| **Passos** | 1. Aguarde liquidação (wick abaixo de liq). <br>2. Inspecione painel de ordens. |
| **Esperado** | Posição liquidada. Pending TP e SL ficam **"canceled"** no histórico. Lista de pending ativos fica vazia. Sem ordens órfãs. |
| **Resultado** | |
| **Notas** | |

---

## Grupo G — PnL e integridade numérica

---

### T29 — PnL acumulado bate com saldo final (wallet accounting)

| | |
|---|---|
| **Setup** | Wallet inicial $10.000. Execute sequência: abrir LONG, fechar com lucro (+$200); abrir SHORT, fechar com perda (−$150); abrir LONG, fechar com lucro (+$80). |
| **Passos** | 1. Anote o PnL de cada trade no histórico de ordens. <br>2. Some: $10.000 + $200 − $150 + $80 = **$10.130**. <br>3. Compare com wallet exibido. |
| **Esperado** | Wallet exibido = **$10.130** (±$0.01 por arredondamento de display). Se divergir, há drift numérico no accounting. |
| **Resultado** | |
| **Notas** | |

---

### T30 — Session replay após sequência com cancels e pending orders

| | |
|---|---|
| **Setup** | Execute a seguinte sequência: (1) abra posição LONG; (2) coloque 2 limits SHORT; (3) cancele 1; (4) deixe o outro disparar como reduce; (5) feche o restante manualmente. Salve snapshot. |
| **Passos** | 1. Clique **Save Session**. <br>2. Recarregue a página ou use **Replay Session**. <br>3. Compare estado final do replay com o estado original. |
| **Esperado** | Wallet, closedTrades e ordersHistory são idênticos antes e depois do replay. Ordem cancelada aparece como "canceled" (não "pending"). Sem posição residual. |
| **Resultado** | |
| **Notas** | |

---

## Checklist rápido de resultados

| # | Área | ✅/❌/⏭️ | Observação |
|---|------|---------|-----------|
| T01 | Wallet floor — reduce parcial com perda | | |
| T02 | Wallet floor — close quase-liquidação | | |
| T03 | Wallet floor — flip com perda | | |
| T04 | canIncrease desabilitado (wallet=0) | | |
| T05 | Reduce via limit pelo wick | | |
| T06 | Flip no slider máximo (float precision) | | |
| T07 | Flip com prejuízo (slider max correto) | | |
| T08 | Flip cancela TP/SL do lado antigo | | |
| T09 | Flip via limit pelo wick | | |
| T10 | reduceOnly bloqueia flip via slider | | |
| T11 | Limit com TP: pending criado, sem duplicata | | |
| T12 | Close manual cancela TP/SL pendentes | | |
| T13 | TP+SL mesmo candle: 1 único close | | |
| T14 | Limit+TP mesmo candle: sem posição órfã | | |
| T15 | Cancelar limit: sem TP/SL órfão | | |
| T16 | Dois limits LONG simultâneos | | |
| T17 | Limit LONG + Limit SHORT simultâneos | | |
| T18 | Cancelar 1 de 2 limits | | |
| T19 | Limit com SL: pending no preço certo | | |
| T20 | TP pelo wick cancela SL | | |
| T21 | Reduce para $1 (quase zero) | | |
| T22 | Open com wallet = margin exato | | |
| T23 | Mudar leverage com posição aberta | | |
| T24 | reduceOnly + limit > position.size | | |
| T25 | Trailing stop + reduce parcial | | |
| T26 | Liquidação LONG pelo wick | | |
| T27 | Liquidação SHORT pelo wick | | |
| T28 | Liquidação cancela TP/SL pendentes | | |
| T29 | PnL acumulado bate com wallet | | |
| T30 | Session replay com cancels e pendentes | | |
