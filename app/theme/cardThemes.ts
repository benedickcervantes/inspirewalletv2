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
  /** Background color for withdraw button. */
  withdrawButtonBg: string;
  /** Text color for withdraw button. */
  withdrawButtonText: string;
}

const CARD_THEMES: Record<CardDesignKey, CardTheme> = {
  DEFAULT: {
    primaryText: "#FFFFFF",
    secondaryText: "#F0F0F0",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
    withdrawButtonBg: "#FFFFFF",
    withdrawButtonText: "#FC821D",
  },
  DIAMOND_ELITE: {
    primaryText: "#FFFFFF",
    secondaryText: "#E5E7EB",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
    withdrawButtonBg: "#ffffffde",
    withdrawButtonText: "#000000",
  },
  GOLD_ELITE: {
    primaryText: "#4D3E20",
    secondaryText: "#4D3E20",
    actionButtonBg: "rgba(89, 68, 25, 0.35)",
    actionButtonText: "#FFFFFF",
    withdrawButtonBg: "#594419e1",
    withdrawButtonText: "#FFFFFF",
  },
  ORANGE_ELITE: {
    primaryText: "#FFFFFF",
    secondaryText: "#ebebebff",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
    withdrawButtonBg: "#ffffffde",
    withdrawButtonText: "#6E6E6E",
  },
  ROYAL_CURVE: {
    primaryText: "#FFFFFF",
    secondaryText: "#FFFFFF",
    actionButtonBg: "rgba(255, 255, 255, 0.3)",
    actionButtonText: "#FFFFFF",
    withdrawButtonBg: "#ffffffde",
    withdrawButtonText: "#D5AF58",
    },
};

export const getCardTheme = (design?: string | null): CardTheme => {
  const key = (design || "DEFAULT") as CardDesignKey;
  return CARD_THEMES[key] ?? CARD_THEMES.DEFAULT;
};

