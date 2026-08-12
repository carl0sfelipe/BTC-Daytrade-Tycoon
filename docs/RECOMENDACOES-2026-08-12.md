# Recomendações — 2026-08-12

> Consolidado das três decisões do Boss, com racional. Detalhes técnicos no
> PRD §11 e no relatório do garimpo (`~/garimpo/relatorios/2026-08-12-daytrade.md`).

## 1. Domínio — recomendação: **calledshot.trade**

Verificação de carrinho real (Porkbun, bulk search) sobre a shortlist do
garimpo + oráculo de keywords (1,15M lotes do Namecheap Market):

| Domínio | 1º ano | Renovação | Nota |
|---|---|---|---|
| **calledshot.trade** ← escolha | $4.61 | **$5.64** | mecânica-assinatura como marca; renovação mais barata |
| rekt.monster | $1.54 | $12.98 | levar junto como domínio meme/marketing |
| daytrade.quest | $1.54 | $12.98 | reserva (framing roguelike literal) |
| wick.quest / hodl.monster | $1.54 | $12.98 | reservas |

Descartados: **"tycoon" está premium em todos os registries** ($50.91/ano no
.top até $650 no .win) — o oráculo explica: 53k buscas/mês, Estibot $1.300.
candle.trade e bull.trade indisponíveis (aftermarket).

Custo da escolha: calledshot.trade ≈ **$27 por 5 anos**. rekt.monster junto ≈
+$53 por 5 anos.

## 2. Diamantes de guest — migrar no signup (implementado, `d6c2ea7`)

Racional (gamificação/neuromarketing): aversão à perda pesa ~2x um ganho
equivalente (Kahneman) e o efeito dote faz o saldo guest parecer propriedade.
Zerar no signup pune a conversão; migrar e celebrar ("💎 secured") a
transforma em pico (peak-end rule). Teto server-side de 150 (1 run) contra
payload adulterado. Login nunca migra — servidor é a verdade, toast explica.

## 3. Idioma — i18n desde já (fila R1.1)

EN default + PT-BR. Abordagem: next-intl **sem locale routing** (cookie-based)
para não refatorar o App Router nem quebrar o e2e `i18n-portuguese-smoke`
(que proíbe PT na UI default). Strings novas nascem localizáveis; extração
completa das telas legadas é rastreada no ROADMAP R1.1.
