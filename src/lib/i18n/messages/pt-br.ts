import type { GameMessages } from "./en";

/**
 * Brazilian-Portuguese game-message catalog. Typed as `GameMessages`, so tsc
 * rejects any missing or extra key relative to the English source of truth.
 * "Called shot" stays untranslated — it is game jargon here, like "TP" or "run".
 *
 * @example ptBrGameMessages.diamonds.securedTitle(87) // "💎 87 diamantes garantidos"
 */
export const ptBrGameMessages: GameMessages = {
  nav: {
    inventory: "Inventário",
    missions: "Missões",
    trade: "Trade",
    ranking: "Ranking",
    shop: "Loja",
    comingSoonBadge: "Em breve",
    closeSheet: "Fechar",
    switchLanguage: "Trocar idioma",
    inventoryComingSoonBody:
      "Sabotagens e consumíveis que você possui vão morar aqui. Ganhe diamantes com called shots — gastar chega em uma atualização futura.",
    shopComingSoonBody:
      "A loja de sabotagens (spikes falsos, drenos de liquidez…) desbloqueia com o PvP. Acumule diamantes agora, gaste nos rivais depois.",
  },
  calledShot: {
    pickerTitle: "🎯 Called Shot",
    pickerHint: "preveja o movimento, ganhe 💎",
    noCallPill: "Sem call",
    armedTarget: (signedTargetPercent, leverage) =>
      `🎯 ${signedTargetPercent} @ ${leverage}x`,
    rewardPreview: (reward) => `→ ${reward} 💎 se acertar`,
    liveChip: (signedTargetPercent, leverage) =>
      `🎯 Called shot ativo: ${signedTargetPercent} @ ${leverage}x`,
    hitTitle: (reward) => `💎 CALLED SHOT! +${reward}`,
    hitStreakDescription: (streak) => `Sequência ×${streak} — o próximo acerto paga mais`,
    hitFirstDescription: "Previsão cravada — diamantes garantidos",
    hitNoPayoutTitle: "🎯 Called shot acertado",
    hitNoPayoutDescription: "Sem pagamento — cooldown de recompensa ou limite da run atingido",
    missedTitle: "🎯 Called shot errado",
    missedDescription: "Sequência zerada — chame o próximo",
    voidedTitle: "🎯 Called shot anulado",
    voidedDescription: "Saiu cedo ou mudou o TP — sem pagamento, sequência mantida",
  },
  diamonds: {
    counterTitle: "Diamantes — ganhe acertando called shots",
    streakTitle: (streak) => `Sequência de called shots ×${streak}`,
    securedTitle: (diamonds) => `💎 ${diamonds} diamantes garantidos`,
    securedDescription:
      "Seu loot de convidado agora está salvo na sua conta — seguro em qualquer aparelho.",
    restoredTitle: (diamonds) => `💎 Saldo da conta restaurado: ${diamonds}`,
    restoredDescription:
      "Sua conta mantém o saldo verificado pelo servidor em todos os aparelhos.",
  },
  auth: {
    genericFailure: "Falha na autenticação",
  },
  missions: {
    loading: "Carregando missões…",
    boardTitle: "Missões Diárias",
    boardSubtitle: "As mesmas 3 para todo mundo — reinicia à meia-noite UTC",
    loadError: "Não deu para carregar as missões",
    retry: "Tentar de novo",
    guestCta: "Missões precisam de uma conta — crie a sua para ganhar 💎",
    createAccount: "Criar conta",
    claim: "Resgatar",
    claiming: "Resgatando…",
    claimed: "Resgatada ✓",
    claimFailed: "Falha no resgate — tente de novo",
  },
  runRecap: {
    sectionTitle: "Called Shots",
    diamondEmojiAria: "diamante",
    emptyInvite: "Nenhum called shot nesta run — declare um alvo na próxima para ganhar 💎",
    diamondsEarned: "Diamantes Ganhos",
    hits: "Acertos",
    misses: "Erros",
    voided: "Anulados",
    hitRate: "Taxa de Acerto",
    bestStreak: "Melhor Sequência",
    runRank: "Rank da Run",
    rankStanding: (rank, totalRuns) => `#${rank} de ${totalRuns} — últimas 24h`,
  },
};
