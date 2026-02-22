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

export function getMe(
  accessToken: string
): Promise<{ success: boolean; user?: unknown; error?: string }>;

export function getOrCreateMainWallet(
  accessToken: string
): Promise<GetOrCreateMainWalletResult>;
export function getTimeDeposits(
  accessToken: string
): Promise<GetTimeDepositsResult>;

export function getTimeDepositInterestRates(
  accessToken: string,
  contractType?: string
): Promise<{ success: boolean; tiers?: Array<{ contractType: string; amount: string; interestRate: string }>; error?: string }>;
export function getTransactions(
  accessToken: string,
  opts?: { walletId?: string; limit?: number; cursor?: string; type?: string }
): Promise<GetTransactionsResult>;

export function getStockInvestmentDepositRequests(
  accessToken: string
): Promise<{ success: boolean; requests?: unknown[]; error?: string }>;

// Auth API
export function login(
  email: string,
  password: string
): Promise<{ success: boolean; access_token?: string; user?: object; error?: string }>;
export function register(body: object): Promise<{
  success: boolean;
  access_token?: string;
  user?: object;
  error?: string;
}>;
export function getMe(accessToken: string): Promise<{
  success: boolean;
  user?: object;
  error?: string;
}>;
export function setPasscode(
  accessToken: string,
  passcode: string
): Promise<{ success: boolean; error?: string }>;
export function verifyPasscode(
  accessToken: string,
  passcode: string
): Promise<{ success: boolean; error?: string }>;
export function verifyEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; error?: string }>;
export function resendVerification(email: string): Promise<{
  success: boolean;
  error?: string;
}>;
