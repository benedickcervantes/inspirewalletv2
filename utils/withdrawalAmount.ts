/** Minimum gross e-wallet withdrawal in PHP when withdrawing from agent commission. */
export const MIN_WITHDRAWAL_PHP = 25;

/** Minimum gross withdrawal in PHP when withdrawing from available balance. */
export const MIN_WITHDRAWAL_AVAILABLE_BALANCE_PHP = 1000;

/** PHP that must stay in available balance or agent commission after a withdrawal. */
export const MIN_REMAINING_WALLET_BALANCE_PHP = 1000;

/**
 * Parses formatted withdrawal input (may include commas).
 * Rejects incomplete values like "", ".", "1.", or more than 2 decimal places.
 */
export function parseWithdrawalAmountInput(raw: string): {
  ok: boolean;
  value: number;
} {
  const s = (raw || "").replace(/,/g, "").trim();
  if (!s) return { ok: false, value: NaN };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, value: NaN };
  const v = parseFloat(s);
  if (Number.isNaN(v)) return { ok: false, value: NaN };
  return { ok: true, value: v };
}
