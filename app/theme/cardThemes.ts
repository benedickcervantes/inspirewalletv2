export type CardDesignKey =
  | "DEFAULT"
  | "DIAMOND_ELITE"
  | "GOLD_ELITE"
  | "ORANGE_ELITE"
  | "ROYAL_CURVE";

interface CardTheme {
  /** Main text color on top of the card image (labels, balance, name). */
  primaryText: string;
  /** Secondary / subtle text on the card. */
  secondaryText: string;
  /** Background color for primary action buttons shown on top of the card (e.g. Deposit). */
  actionButtonBg: string;
  /** Text color for primary action buttons. */
  actionButtonText: string;
}

const CARD_THEMES: Record<CardDesignKey, CardTheme> = {
  DEFAULT: {
    primaryText: "#FFFFFF",
    secondaryText: "#F0F0F0",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
  },
  DIAMOND_ELITE: {
    primaryText: "#FFFFFF",
    secondaryText: "#E5E7EB",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
  },
  GOLD_ELITE: {
    primaryText: "#1F2933",
    secondaryText: "#374151",
    // Darker overlay so white text is readable on bright gold background
    actionButtonBg: "rgba(0, 0, 0, 0.45)",
    actionButtonText: "#FFFFFF",
  },
  ORANGE_ELITE: {
    primaryText: "#FFFFFF",
    secondaryText: "#FFE8D6",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
  },
  ROYAL_CURVE: {
    primaryText: "#FFFFFF",
    secondaryText: "#E5E7EB",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
  },
};

export const getCardTheme = (design?: string | null): CardTheme => {
  const key = (design || "DEFAULT") as CardDesignKey;
  return CARD_THEMES[key] ?? CARD_THEMES.DEFAULT;
};

