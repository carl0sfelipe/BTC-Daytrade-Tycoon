/**
 * English game-message catalog — the default locale and the source of truth
 * for the `GameMessages` shape (Boss decision 2026-08-12: i18n from day one,
 * EN default + PT-BR). Parameterized messages are plain typed functions, so
 * translations stay type-checked without a template engine.
 *
 * Deliberately NOT `as const`: widening literals to `string` is what lets
 * `pt-br.ts` satisfy `GameMessages` with different text while tsc still
 * enforces full structural parity (same keys, same function signatures).
 *
 * @example enGameMessages.diamonds.securedTitle(87) // "💎 87 diamonds secured"
 */
export const enGameMessages = {
  nav: {
    inventory: "Inventory",
    missions: "Missions",
    trade: "Trade",
    ranking: "Ranking",
    shop: "Shop",
    comingSoonBadge: "Coming soon",
    closeSheet: "Close",
    switchLanguage: "Switch language",
    inventoryComingSoonBody:
      "Sabotages and consumables you own will live here. Earn diamonds with called shots — spending them arrives in a future update.",
    shopComingSoonBody:
      "The sabotage shop (fake spikes, liquidity drains…) unlocks with PvP. Stack diamonds now, spend them on rivals later.",
  },
  calledShot: {
    pickerTitle: "🎯 Called Shot",
    pickerHint: "predict the move, earn 💎",
    noCallPill: "No call",
    armedTarget: (signedTargetPercent: string, leverage: number) =>
      `🎯 ${signedTargetPercent} @ ${leverage}x`,
    rewardPreview: (reward: number) => `→ ${reward} 💎 if it hits`,
    liveChip: (signedTargetPercent: string, leverage: number) =>
      `🎯 Called shot live: ${signedTargetPercent} @ ${leverage}x`,
    hitTitle: (reward: number) => `💎 CALLED SHOT! +${reward}`,
    hitStreakDescription: (streak: number) => `Streak ×${streak} — next hit pays more`,
    hitFirstDescription: "Prediction nailed — diamonds banked",
    hitNoPayoutTitle: "🎯 Called shot hit",
    hitNoPayoutDescription: "No payout — reward cooldown or run cap reached",
    missedTitle: "🎯 Called shot missed",
    missedDescription: "Streak reset — call the next one",
    voidedTitle: "🎯 Called shot voided",
    voidedDescription: "Exited early or moved the TP — no payout, streak kept",
  },
  diamonds: {
    counterTitle: "Diamonds — earn them by hitting called shots",
    streakTitle: (streak: number) => `Called-shot streak ×${streak}`,
    securedTitle: (diamonds: number) => `💎 ${diamonds} diamonds secured`,
    securedDescription:
      "Your guest loot is now saved to your account — safe on any device.",
    restoredTitle: (diamonds: number) => `💎 Account balance restored: ${diamonds}`,
    restoredDescription:
      "Your account keeps the server-verified balance across devices.",
  },
  auth: {
    genericFailure: "Authentication failed",
  },
  // Mission titles/descriptions come from the server (DAILY_MISSIONS) and stay
  // EN-only in v1 — translating server content is registered debt, not mixed here.
  missions: {
    loading: "Loading missions…",
    boardTitle: "Daily Missions",
    boardSubtitle: "Same 3 for everyone — resets at midnight UTC",
    loadError: "Couldn't load missions",
    retry: "Retry",
    guestCta: "Missions need an account — create one to earn 💎",
    createAccount: "Create account",
    claim: "Claim",
    claiming: "Claiming…",
    claimed: "Claimed ✓",
    claimFailed: "Claim failed — try again",
  },
  runRecap: {
    sectionTitle: "Called Shots",
    diamondEmojiAria: "diamond",
    emptyInvite: "No called shots this run — declare a target next run to earn 💎",
    diamondsEarned: "Diamonds Earned",
    hits: "Hits",
    misses: "Misses",
    voided: "Voided",
    hitRate: "Hit Rate",
    bestStreak: "Best Streak",
    runRank: "Run Rank",
    rankStanding: (rank: number, totalRuns: number) =>
      `#${rank} of ${totalRuns} — last 24h`,
  },
};

export type GameMessages = typeof enGameMessages;
