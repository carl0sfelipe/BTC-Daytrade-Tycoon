export const DIFFICULTY_PRESETS = {
  easy: {
    label: "Easy",
    wallet: 50_000,
    maxLeverage: 10,
    emoji: "🟢",
    description: "Larger wallet, lower max leverage",
  },
  normal: {
    label: "Normal",
    wallet: 10_000,
    maxLeverage: 50,
    emoji: "🟡",
    description: "Standard challenge",
  },
  hard: {
    label: "Hard",
    wallet: 5_000,
    maxLeverage: 100,
    emoji: "🔴",
    description: "Small wallet, high stakes",
  },
  extreme: {
    label: "Extreme",
    wallet: 1_000,
    maxLeverage: 125,
    emoji: "💀",
    description: "Maximum risk, maximum reward",
  },
} as const;

export type DifficultyKey = keyof typeof DIFFICULTY_PRESETS;
