/**
 * Wallet backend API helpers.
 * Uses EXPO_PUBLIC_WALLET_BACKEND_URL (InpireWalletv3_Backend).
 * Auth endpoints use {base}/auth (no /api prefix).
 */

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
};

const getWalletBackendUrl = getBaseUrl;

// Optional: set EXPO_PUBLIC_API_PREFIX=api if backend mounts routes under /api
const getApiPrefix = () => {
  const p = process.env.EXPO_PUBLIC_API_PREFIX;
  return p ? `/${p.replace(/^\/|\/$/g, '')}` : '';
};

const buildUrl = (path) => {
  const base = getWalletBackendUrl();
  if (!base) return null;
  const prefix = getApiPrefix();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${prefix}${cleanPath}`;
};

/**
 * Submit a time deposit request via the backend.
 * POST /time-deposits
 * @param {string} accessToken - Backend JWT from AsyncStorage
 * @param {Object} body - { amount, contractPeriod, depositMethod, walletId? (when Available Balance) }
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitTimeDepositRequest(accessToken, body) {
  const url = buildUrl('/time-deposits');
  if (!url) return { success: false, error: 'Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    if (__DEV__) console.log('[Deposit API] POST', url, body);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log('[Deposit API] Response', res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error('[Deposit API] Error', e);
    return { success: false, error: e.message || 'Network error. Is the backend running? Check EXPO_PUBLIC_WALLET_BACKEND_URL and network.' };
  }
}

/**
 * Submit a top-up request via the backend.
 * POST /deposit-requests/top-up
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - { walletId, amount, reference? }
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitTopUpRequest(accessToken, body) {
  const url = buildUrl('/deposit-requests/top-up');
  if (!url) return { success: false, error: 'Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    if (__DEV__) console.log('[Deposit API] POST', url, body);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log('[Deposit API] Response', res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error('[Deposit API] Error', e);
    return { success: false, error: e.message || 'Network error. Is the backend running?' };
  }
}

/**
 * Submit a stock investment request via the backend.
 * POST /deposit-requests/stock-investment
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - { walletId, amount, stockSymbol? }
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitStockInvestmentRequest(accessToken, body) {
  const url = buildUrl('/deposit-requests/stock-investment');
  if (!url) return { success: false, error: 'Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    if (__DEV__) console.log('[Deposit API] POST', url, body);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log('[Deposit API] Response', res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error('[Deposit API] Error', e);
    return { success: false, error: e.message || 'Network error. Is the backend running?' };
  }
}

/**
 * Get user's top-up deposit requests.
 * GET /deposit-requests/top-up
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, requests?: Array, error?: string }>}
 */
export async function getTopUpDepositRequests(accessToken) {
  const url = buildUrl('/deposit-requests/top-up');
  if (!url) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    const list = Array.isArray(data) ? data : data.data ?? data.requests ?? [];
    return { success: true, requests: list };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * Get user's stock investment deposit requests.
 * GET /deposit-requests/stock-investment
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, requests?: Array, error?: string }>}
 */
export async function getStockInvestmentDepositRequests(accessToken) {
  const url = buildUrl('/deposit-requests/stock-investment');
  if (!url) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    const list = Array.isArray(data) ? data : data.data ?? data.requests ?? [];
    return { success: true, requests: list };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// --- Withdrawal Requests API ---

/**
 * Submit a withdrawal request via the backend.
 * POST /withdrawal-requests
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - Local Bank: { walletId, amount, method: "local_bank", email?, accountNumber, accountHolderName, bankName, branchName? }
 *                       E-Wallet: { walletId, amount, method: "e_wallet", email?, walletType: "gcash"|"maya", accountNumber, accountName }
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitWithdrawalRequest(accessToken, body) {
  const url = buildUrl('/withdrawal-requests');
  if (!url) return { success: false, error: 'Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    if (__DEV__) console.log('[Withdrawal API] POST', url, body);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log('[Withdrawal API] Response', res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error('[Withdrawal API] Error', e);
    return { success: false, error: e.message || 'Network error. Is the backend running?' };
  }
}

/**
 * Get user's withdrawal requests.
 * GET /withdrawal-requests
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, requests?: Array, error?: string }>}
 */
export async function getWithdrawalRequests(accessToken) {
  const url = buildUrl('/withdrawal-requests');
  if (!url) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    const list = Array.isArray(data) ? data : data.data ?? data.requests ?? [];
    return { success: true, requests: list };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// --- Auth API ---

/**
 * POST /auth/login
 * @returns {{ success: boolean, access_token?: string, user?: object, error?: string }}
 */
export async function login(email, password) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  try {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, access_token: data.access_token, user: data.user };
  } catch (e) {
    return { success: false, error: e.message || 'Network error. Is the backend running?' };
  }
}

/**
 * POST /auth/register
 * @param {Object} body - { email, password, firstName, lastName, middleName?, phone?, dateOfBirth?, countryCode?, referralCode?, companyName?, lineAccountLink?, isAgent? }
 * @returns {{ success: boolean, access_token?: string, user?: object, error?: string }}
 */
export async function register(body) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  try {
    const res = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, access_token: data.access_token, user: data.user };
  } catch (e) {
    return { success: false, error: e.message || 'Network error. Is the backend running?' };
  }
}

/**
 * GET /auth/me — requires JWT
 * @param {string} accessToken
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function getMe(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const res = await fetch(`${base}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Unauthorized' };
    }
    return { success: true, user: data };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * POST /auth/verify-passcode — requires JWT
 * @param {string} accessToken
 * @param {string} passcode
 * @returns {{ success: boolean, error?: string }}
 */
export async function verifyPasscode(accessToken, passcode) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const res = await fetch(`${base}/auth/verify-passcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Passcode incorrect' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * POST /auth/verify-email
 * Verifies email with 6-digit OTP.
 * @param {string} email
 * @param {string} otp — exactly 6 digits
 * @returns {{ success: boolean, error?: string }}
 */
export async function verifyEmail(email, otp) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  try {
    const res = await fetch(`${base}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), otp }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Verification failed' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * POST /auth/resend-verification
 * Sends a new OTP verification email.
 * @param {string} email
 * @returns {{ success: boolean, error?: string }}
 */
export async function resendVerification(email) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  try {
    const res = await fetch(`${base}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Failed to resend' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// --- Referrals API ---

/**
 * GET /referrals/code — requires JWT
 * Returns the user's referral code. Creates it if missing.
 * @param {string} accessToken
 * @returns {{ success: boolean, referralCode?: string, error?: string }}
 */
export async function getReferralCode(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const res = await fetch(`${base}/referrals/code`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Failed to get referral code' };
    }
    return { success: true, referralCode: data.referralCode };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * POST /referrals/generate — requires JWT
 * Generates the user's referral code. Returns existing if already present.
 * @param {string} accessToken
 * @returns {{ success: boolean, referralCode?: string, error?: string }}
 */
export async function generateReferralCode(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const res = await fetch(`${base}/referrals/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Failed to generate referral code' };
    }
    return { success: true, referralCode: data.referralCode };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// --- Wallets API ---

/**
 * GET /wallets — requires JWT
 * Returns all wallets for the authenticated user.
 * @param {string} accessToken
 * @returns {{ success: boolean, wallets?: Array, error?: string }}
 */
export async function getWallets(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const res = await fetch(`${base}/wallets`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Failed to get wallets' };
    }
    return { success: true, wallets: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * POST /wallets/main — requires JWT
 * Gets or creates the user's main (PHP) wallet. Idempotent.
 * @param {string} accessToken
 * @returns {{ success: boolean, wallet?: object, error?: string }}
 */
export async function getOrCreateMainWallet(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const res = await fetch(`${base}/wallets/main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Failed to get wallet' };
    }
    return { success: true, wallet: data };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// --- Transactions API ---

/**
 * GET /transactions — requires JWT
 * Returns transactions for the authenticated user.
 * @param {string} accessToken
 * @param {{ walletId?: string, limit?: number, cursor?: string }} opts
 * @returns {{ success: boolean, transactions?: Array, error?: string }}
 */
export async function getTransactions(accessToken, opts = {}) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'No token' };
  try {
    const params = new URLSearchParams();
    if (opts.walletId) params.set('walletId', opts.walletId);
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.cursor) params.set('cursor', opts.cursor);
    const qs = params.toString();
    const url = `${base}/transactions${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || 'Failed to get transactions' };
    }
    return { success: true, transactions: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}
