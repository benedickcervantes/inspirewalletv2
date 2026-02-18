/**
 * Shared theme and layout constants for Deposit flow.
 * Use these across all deposit screens for consistent UI.
 */
export const DepositTheme = {
  colors: {
    primary: "#E25A17",
    primaryLight: "#F28934",
    tint: "#FFF5F0",
    background: "#F5F5F5",
    card: "#FFFFFF",
    inputBg: "#F9F9F9",
    border: "#E0E0E0",
    borderLight: "#F0F0F0",
    text: "#333333",
    textSecondary: "#666666",
    textMuted: "#999999",
    white: "#FFFFFF",
  },
  spacing: {
    screenPadding: 20,
    cardPadding: 20,
    sectionGap: 24,
    elementGap: 12,
  },
  radius: {
    card: 16,
    input: 8,
    button: 12,
    buttonPill: 30,
    modal: 20,
  },
  typography: {
    headerTitle: { fontSize: 18, fontWeight: "700" },
    pageTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
    pageSubtitle: { fontSize: 14, color: "#999" },
    sectionTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
    body: { fontSize: 14, color: "#333" },
    label: { fontSize: 13, color: "#999" },
    value: { fontSize: 15, fontWeight: "600", color: "#333" },
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gradient: ["#E25A17", "#F28934"],
  },
  progress: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    circleSize: 32,
    lineHeight: 2,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    button: {
      shadowColor: "#E25A17",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
  },
};
