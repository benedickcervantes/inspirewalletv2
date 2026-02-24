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

// Messaging API (Client)
export function sendMessage(
  accessToken: string,
  content: string
): Promise<{ success: boolean; id?: string; error?: string }>;
export function getMessages(
  accessToken: string,
  opts?: { page?: number; limit?: number }
): Promise<{
  success: boolean;
  messages?: Array<{
    id: string;
    content: string;
    createdAt: string;
    status: string;
    senderName?: string;
    direction?: "ADMIN_TO_USER" | "USER_TO_ADMIN";
  }>;
  pagination?: { total?: number; page?: number; limit?: number; totalPages?: number };
  error?: string;
}>;
export function markMessageAsRead(
  accessToken: string,
  messageId: string
): Promise<{ success: boolean; error?: string }>;
export function markAllMessagesAsRead(
  accessToken: string
): Promise<{ success: boolean; count?: number; error?: string }>;

// User Activity API (Admin)
export function getUserActivity(
  adminToken: string,
  userId: string
): Promise<{
  success: boolean;
  isOnline?: boolean;
  status?: "online" | "offline";
  lastActiveAt?: string;
  lastLoginAt?: string;
  error?: string;
}>;
export function getBulkUserActivity(
  adminToken: string,
  userIds: string[]
): Promise<{
  success: boolean;
  activities?: Record<
    string,
    { isOnline: boolean; status: string; lastActiveAt: string; lastLoginAt: string } | null
  >;
  error?: string;
}>;

// Referral API
export function getReferralTree(
  accessToken: string
): Promise<{
  success: boolean;
  tree?: {
    referralCode?: string;
    directReferralCount?: number;
    totalDescendantCount?: number;
    directReferrals?: Array<{
      userId: string;
      referralCode?: string;
      firstName?: string;
      lastName?: string;
    }>;
  };
  error?: string;
}>;
