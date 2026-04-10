/**
 * Transfer processing fee (PHP), driven by tier config from the wallet backend
 * (GET /system-settings/transfer-processing-fees). Defaults match seeded server values.
 */

export type TransferProcessingFeesConfig = {
  brackets: { maxAmount: number; feePhp: number }[];
  overflowFeePhp: number;
};

/** Map API / WebSocket payload into local config (numbers). */
export function feeConfigFromApiData(data: {
  brackets: { maxAmount: number; feePhp: number }[];
  overflowFeePhp: number;
}): TransferProcessingFeesConfig {
  return {
    brackets: data.brackets.map((b) => ({
      maxAmount: Number(b.maxAmount),
      feePhp: Number(b.feePhp),
    })),
    overflowFeePhp: Number(data.overflowFeePhp),
  };
}

export const DEFAULT_TRANSFER_PROCESSING_FEES_CONFIG: TransferProcessingFeesConfig =
  {
    brackets: [
      { maxAmount: 10_000, feePhp: 50 },
      { maxAmount: 20_000, feePhp: 100 },
      { maxAmount: 30_000, feePhp: 150 },
      { maxAmount: 40_000, feePhp: 200 },
      { maxAmount: 50_000, feePhp: 250 },
      { maxAmount: 60_000, feePhp: 300 },
      { maxAmount: 70_000, feePhp: 350 },
      { maxAmount: 80_000, feePhp: 400 },
      { maxAmount: 90_000, feePhp: 450 },
      { maxAmount: 100_000, feePhp: 500 },
    ],
    overflowFeePhp: 1_000,
  };

/**
 * Fee in PHP for a transfer amount, using admin-configurable brackets (sorted by maxAmount).
 */
export function computeTransferProcessingFeePhp(
  transferAmountPhp: number,
  config: TransferProcessingFeesConfig = DEFAULT_TRANSFER_PROCESSING_FEES_CONFIG,
): number {
  const a = Number(transferAmountPhp);
  if (!Number.isFinite(a) || a <= 0) return 0;
  const brackets = [...config.brackets].sort((x, y) => x.maxAmount - y.maxAmount);
  for (const tier of brackets) {
    if (a <= tier.maxAmount) return tier.feePhp;
  }
  return config.overflowFeePhp;
}

/** Uses built-in defaults only (no server fetch). Prefer {@link computeTransferProcessingFeePhp} with API-loaded config. */
export function getTransferProcessingFeePhp(transferAmountPhp: number): number {
  return computeTransferProcessingFeePhp(
    transferAmountPhp,
    DEFAULT_TRANSFER_PROCESSING_FEES_CONFIG,
  );
}
