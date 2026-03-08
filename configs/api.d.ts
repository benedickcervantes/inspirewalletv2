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
  accessToken: string,
): Promise<{ success: boolean; user?: unknown; error?: string }>;

export function getOrCreateMainWallet(
  accessToken: string,
): Promise<GetOrCreateMainWalletResult>;
export function getRecipientByAccountNumber(
  accessToken: string,
  accountNumber: string,
): Promise<{
  success: boolean;
  data?: {
    mainWalletId?: string;
    firstName?: string;
    lastName?: string;
    accountNumber?: string;
  };
  error?: string;
  notFound?: boolean;
}>;
export function getBeneficiaries(
  accessToken: string,
): Promise<{ success: boolean; beneficiaries?: unknown[]; error?: string }>;
export function createBeneficiary(
  accessToken: string,
  body: object,
): Promise<{ success: boolean; data?: unknown; error?: string }>;
export function submitTransfer(
  accessToken: string,
  body: object,
): Promise<{ success: boolean; data?: unknown; error?: string }>;
export function submitWithdrawalRequest(
  accessToken: string,
  body: Record<string, string | undefined>,
): Promise<{ success: boolean; data?: unknown; error?: string }>;
export function submitBankingApplication(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }>;
export function getTimeDeposits(
  accessToken: string,
): Promise<GetTimeDepositsResult>;

export function getTimeDepositInterestRates(
  accessToken: string,
  contractType?: string,
): Promise<{
  success: boolean;
  tiers?: { contractType: string; amount: string; interestRate: string }[];
  error?: string;
}>;
export function getTransactions(
  accessToken: string,
  opts?: { walletId?: string; limit?: number; cursor?: string; type?: string },
): Promise<GetTransactionsResult>;

export function getStockInvestmentDepositRequests(
  accessToken: string,
): Promise<{ success: boolean; requests?: unknown[]; error?: string }>;

// Auth API
export function login(
  email: string,
  password: string,
): Promise<{
  success: boolean;
  access_token?: string;
  user?: object;
  requiresPasswordReset?: boolean;
  error?: string;
}>;
export function forgotPassword(
  email: string,
): Promise<{ success: boolean; message?: string; error?: string }>;
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
export function updateProfile(
  accessToken: string,
  body: Record<string, string | undefined | null>,
): Promise<{ success: boolean; user?: object; error?: string }>;
export function setPasscode(
  accessToken: string,
  passcode: string,
): Promise<{ success: boolean; error?: string }>;
export function verifyPasscode(
  accessToken: string,
  passcode: string,
): Promise<{ success: boolean; error?: string }>;
export function updatePasscode(
  accessToken: string,
  currentPasscode: string,
  newPasscode: string,
): Promise<{ success: boolean; error?: string }>;
export function verifyEmail(
  email: string,
  otp: string,
): Promise<{ success: boolean; error?: string }>;
export function resendVerification(email: string): Promise<{
  success: boolean;
  error?: string;
}>;

// Messaging API (Client)
export function sendMessage(
  accessToken: string,
  content: string,
): Promise<{ success: boolean; id?: string; error?: string }>;
export function getMessages(
  accessToken: string,
  opts?: { page?: number; limit?: number },
): Promise<{
  success: boolean;
  messages?: {
    id: string;
    content: string;
    createdAt: string;
    status: string;
    senderName?: string;
    direction?: "ADMIN_TO_USER" | "USER_TO_ADMIN";
  }[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  error?: string;
}>;
export function markMessageAsRead(
  accessToken: string,
  messageId: string,
): Promise<{ success: boolean; error?: string }>;

// Notifications API
export function getNotifications(
  accessToken: string,
  opts?: { limit?: number }
): Promise<{
  success: boolean;
  data?: {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }[];
  error?: string;
}>;

export function markNotificationAsRead(
  accessToken: string,
  notificationId: string,
): Promise<{ success: boolean; error?: string }>;
export function markAllNotificationsAsRead(
  accessToken: string,
): Promise<{ success: boolean; error?: string }>;
export function markAllMessagesAsRead(
  accessToken: string,
): Promise<{ success: boolean; count?: number; error?: string }>;
export function editMessage(
  accessToken: string,
  messageId: string,
  content: string,
): Promise<{ success: boolean; error?: string }>;
export function deleteMessage(
  accessToken: string,
  messageId: string,
  deleteForEveryone?: boolean,
): Promise<{ success: boolean; error?: string }>;

// User Activity API (Admin)
export function getUserActivity(
  adminToken: string,
  userId: string,
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
  userIds: string[],
): Promise<{
  success: boolean;
  activities?: Record<
    string,
    {
      isOnline: boolean;
      status: string;
      lastActiveAt: string;
      lastLoginAt: string;
    } | null
  >;
  error?: string;
}>;

// Referral API
export function getReferralCode(
  accessToken: string,
): Promise<{ success: boolean; referralCode?: string; error?: string }>;

export function generateReferralCode(
  accessToken: string,
): Promise<{ success: boolean; referralCode?: string; error?: string }>;

export function getReferralQrPayload(accessToken: string): Promise<{
  success: boolean;
  payload?: {
    referralCode: string;
    referralUrl: string;
    referrerName: string;
  };
  error?: string;
}>;

export function getReferralTree(accessToken: string): Promise<{
  success: boolean;
  tree?: {
    referralCode?: string;
    directReferralCount?: number;
    totalDescendantCount?: number;
    directReferrals?: {
      userId: string;
      referralCode?: string;
      firstName?: string;
      lastName?: string;
    }[];
  };
  error?: string;
}>;

export function submitTravelProtection(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }>;

// Card Collection API
export interface CardCatalogItem {
  design: string;
  category?: string;
  price?: number | null;
  isOwned?: boolean;
  isActive?: boolean;
  isEligible?: boolean;
  [key: string]: unknown;
}

export interface CardCollectionResponse {
  cardDisplayData?: Record<string, unknown>;
  collection?: unknown[];
  activeCard?: unknown | null;
  [key: string]: unknown;
}

export function getCardCatalog(
  accessToken: string,
): Promise<{ success: boolean; catalog?: CardCatalogItem[]; error?: string }>;

export function getMyCardCollection(
  accessToken: string,
): Promise<{ success: boolean; data?: CardCollectionResponse; error?: string }>;

export function buyCard(
  accessToken: string,
  design: string,
): Promise<{ success: boolean; data?: unknown; error?: string }>;

export function setActiveCard(
  accessToken: string,
  cardCollectionItemId: string,
): Promise<{ success: boolean; data?: CardCollectionResponse; error?: string }>;

export function renewCard(
  accessToken: string,
  design: string,
): Promise<{ success: boolean; data?: unknown; error?: string }>;

export function cancelAutoRenewal(
  accessToken: string,
  design: string,
): Promise<{ success: boolean; data?: unknown; error?: string }>;

export interface ApiWalletFull {
  id: string;
  balance?: string;
  currency?: { code?: string };
  currencyCode?: string;
  [key: string]: unknown;
}

export function getWallets(
  accessToken: string
): Promise<{ success: boolean; wallets?: ApiWalletFull[]; error?: string }>;

export function submitStockSellRequest(
  accessToken: string,
  body: { walletId: string; stocksToSell: number }
): Promise<{ success: boolean; data?: unknown; error?: string }>;

export function getStockSellRequests(
  accessToken: string
): Promise<{ success: boolean; data?: unknown[]; error?: string }>;

