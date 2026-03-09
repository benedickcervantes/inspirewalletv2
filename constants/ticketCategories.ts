/**
 * Common fintech support ticket categories for dropdown selection.
 * Value is sent to API; labelKey is used for i18n in the app.
 */
export const TICKET_CATEGORIES = [
  { value: "Account & Login", labelKey: "tickets.category.accountLogin" },
  { value: "Transactions", labelKey: "tickets.category.transactions" },
  { value: "Deposits & Top-up", labelKey: "tickets.category.depositsTopup" },
  { value: "Withdrawals", labelKey: "tickets.category.withdrawals" },
  { value: "Transfers", labelKey: "tickets.category.transfers" },
  { value: "Balance & Statement", labelKey: "tickets.category.balanceStatement" },
  { value: "Cards", labelKey: "tickets.category.cards" },
  { value: "KYC & Verification", labelKey: "tickets.category.kycVerification" },
  { value: "Security", labelKey: "tickets.category.security" },
  { value: "App & Technical", labelKey: "tickets.category.appTechnical" },
  { value: "Other", labelKey: "tickets.category.other" },
] as const;

export type TicketCategoryValue = (typeof TICKET_CATEGORIES)[number]["value"];
