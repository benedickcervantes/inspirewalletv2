export interface FormulaScheduleItem {
  payoutIndex?: number;
  expectedDate?: string;
  status?: "PENDING" | "PAID";
  isLastPayout?: boolean;
  principalReturned?: string | number;
  principal_returned?: string | number;
}

interface FormulaInput {
  amount: string | number;
  interestRate: string | number;
  contractType: string;
  payoutSchedule?: FormulaScheduleItem[];
  payout_schedule?: FormulaScheduleItem[];
}

const TAX_RATE = 0.2;

function parseAmount(value: string | number | undefined | null): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getPayoutCycles(contractType: string): number {
  if (contractType === "sixMonths") return 1;
  if (contractType === "oneYear") return 2;
  if (contractType === "twoYears") return 4;
  return 0;
}

export function computeNetPayoutPerCycle(
  principal: number,
  interestRatePercent: number,
): number {
  const gross = principal * (interestRatePercent / 100);
  return gross * (1 - TAX_RATE);
}

export function buildProjectedPayoutSchedule(input: FormulaInput): Array<{
  payoutIndex: number;
  expectedDate?: string;
  amount: number;
  status: "PENDING" | "PAID";
  isLastPayout: boolean;
  principalReturned: number;
  principal_returned: number;
}> {
  const cycles = getPayoutCycles(input.contractType);
  const principal = parseAmount(input.amount);
  const rate = parseAmount(input.interestRate);
  const netPayout = computeNetPayoutPerCycle(principal, rate);
  const sourceSchedule = (input.payoutSchedule ?? input.payout_schedule ?? []) as FormulaScheduleItem[];

  if (cycles <= 0) return [];

  return Array.from({ length: cycles }, (_, idx) => {
    const source = sourceSchedule[idx];
    const payoutIndex = idx + 1;
    const isLastPayout = payoutIndex === cycles;
    return {
      payoutIndex,
      expectedDate: source?.expectedDate,
      amount: netPayout,
      status: source?.status ?? "PENDING",
      isLastPayout,
      principalReturned: isLastPayout ? principal : 0,
      principal_returned: isLastPayout ? principal : 0,
    };
  });
}

export function computeProjectedTotalDividend(input: FormulaInput): number {
  const cycles = getPayoutCycles(input.contractType);
  const principal = parseAmount(input.amount);
  const rate = parseAmount(input.interestRate);
  if (cycles <= 0 || principal <= 0 || rate <= 0) return 0;
  return computeNetPayoutPerCycle(principal, rate) * cycles;
}
