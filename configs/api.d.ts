export interface ApiWallet {
  id?: string;
  balance?: number | string;
  [key: string]: unknown;
}

export interface GetOrCreateMainWalletResult {
  success: boolean;
  wallet?: ApiWallet;
  error?: string;
}

export interface GetTimeDepositsResult {
  success: boolean;
  deposits?: unknown[];
  error?: string;
}

export interface GetTransactionsResult {
  success: boolean;
  transactions?: unknown[];
  error?: string;
}

export function getOrCreateMainWallet(
  accessToken: string
): Promise<GetOrCreateMainWalletResult>;
export function getTimeDeposits(
  accessToken: string
): Promise<GetTimeDepositsResult>;
export function getTransactions(
  accessToken: string,
  opts?: { walletId?: string; limit?: number; cursor?: string; type?: string }
): Promise<GetTransactionsResult>;

export function getStockInvestmentDepositRequests(
  accessToken: string
): Promise<{ success: boolean; requests?: unknown[]; error?: string }>;
