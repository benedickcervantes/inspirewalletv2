/**
 * Wallet backend API helpers.
 * Uses EXPO_PUBLIC_WALLET_BACKEND_URL (InpireWalletv3_Backend).
 *
 * Per docs/backenddocs: Base URL is http://localhost:3000 (or deployed URL).
 * All paths are at root — NO /api prefix. Examples:
 *   GET /time-deposits, POST /time-deposits
 *   GET /wallets, POST /wallets/main
 *   GET /deposit-requests/top-up, POST /deposit-requests/top-up
 *   etc.
 * Do NOT set EXPO_PUBLIC_API_PREFIX unless your backend uses /api.
 */

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/$/, "");
};

const getWalletBackendUrl = getBaseUrl;

// Only set EXPO_PUBLIC_API_PREFIX=api if backend mounts ALL routes under /api (docs say no prefix)
const getApiPrefix = () => {
  const p = process.env.EXPO_PUBLIC_API_PREFIX;
  return p ? `/${p.replace(/^\/|\/$/g, "")}` : "";
};


// Custom fetch wrapper to inject API key
const _originalFetch = global.fetch || fetch;
async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  if (process.env.EXPO_PUBLIC_API_KEY) {
    headers['x-api-key'] = process.env.EXPO_PUBLIC_API_KEY;
  }
  return _originalFetch(url, { ...options, headers });
}

const buildUrl = (path) => {
  const base = getWalletBackendUrl();
  if (!base) return null;
  const prefix = getApiPrefix();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${prefix}${cleanPath}`;
};

/**
 * Fetch the current user's wallets.
 * GET /wallets
 * @param {string} accessToken - Backend JWT
 */
export async function getWallets(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  const url = `${base}/wallets`;
  try {
    const res = await apiFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, wallets: Array.isArray(data) ? data : (data.wallets ?? data.data ?? []) };
  } catch (e) {
    if (__DEV__) console.error('[Wallets API] Error', e);
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * Submit a time deposit request via the backend.
 * POST /time-deposits (no /api prefix)
 * @param {string} accessToken - Backend JWT from AsyncStorage
 * @param {Object} body - { contractPeriod, amount, depositMethod, walletId? (when available_balance) }
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitTimeDepositRequest(accessToken, body) {
  const base = getBaseUrl();
  if (!base)
    return {
      success: false,
      error:
        "Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env.",
    };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  const url = `${base}/time-deposits`;
  try {
    if (__DEV__) console.log("[Deposit API] POST", url, body);
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Deposit API] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Deposit API] Error", e);
    return {
      success: false,
      error:
        e.message ||
        "Network error. Is the backend running? Check EXPO_PUBLIC_WALLET_BACKEND_URL and network.",
    };
  }
}

function parseTimeDepositsResponse(data) {
  let list = Array.isArray(data) ? data : null;
  if (!list && data) {
    const raw = data.data ?? data.deposits ?? data.timeDeposits ?? data.items;
    list = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data);
    if (list && !Array.isArray(list)) list = [];
  }
  return Array.isArray(list) ? list : [];
}

/**
 * Get user's time deposits.
 * GET /time-deposits — requires JWT (no /api prefix, no /contracts).
 * Uses base URL + /time-deposits directly — same pattern as POST /wallets/main.
 * @param {string} accessToken - Backend JWT
 * @returns {{ success: boolean, deposits?: Array, error?: string }}
 */
export async function getTimeDeposits(accessToken) {
  const base = getBaseUrl();
  if (!base)
    return {
      success: false,
      error:
        "Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env.",
    };
  if (!accessToken) return { success: false, error: "Not authenticated" };

  const url = `${base}/time-deposits`;

  try {
    if (__DEV__) console.log("[TimeDeposits API] GET", url);
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__)
      console.log(
        "[TimeDeposits API] Response",
        res.status,
        Array.isArray(data) ? `array[${data.length}]` : typeof data,
      );

    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }

    const list = parseTimeDepositsResponse(data);
    const deposits = Array.isArray(list) ? list : [];
    if (__DEV__) {
      console.log(
        "[TimeDeposits API] Parsed count:",
        deposits.length,
        deposits[0]
          ? `first: status=${deposits[0].status} amount=${deposits[0].amount}`
          : "",
      );
      if (deposits[0]) {
        const d = deposits[0];
        console.log(
          "[TimeDeposits API] First deposit referrer:",
          d.referrer,
          "commission:",
          d.commission ? "present" : "absent",
          "keys:",
          d.referrer ? Object.keys(d.referrer) : [],
        );
      }
    }
    return { success: true, deposits };
  } catch (e) {
    if (__DEV__) console.error("[TimeDeposits API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Get interest rate tiers for time deposits.
 * GET /time-deposits/interest-rates — requires JWT.
 * @param {string} accessToken - Backend JWT
 * @param {string} [contractType] - Optional: "sixMonths" | "oneYear" | "twoYears"
 * @returns {{ success: boolean, tiers?: Array<{ contractType: string, amount: string, interestRate: string }>, error?: string }}
 */
export async function getTimeDepositInterestRates(accessToken, contractType) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured." };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  let url = `${base}/time-deposits/interest-rates`;
  if (contractType) {
    url += `?contractType=${encodeURIComponent(contractType)}`;
  }
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || data.error || `Request failed (${res.status})`,
      };
    }
    const tiers = Array.isArray(data) ? data : (data.tiers ?? data.data ?? []);
    return { success: true, tiers };
  } catch (e) {
    if (__DEV__) console.error("[InterestRates API] Error", e);
    return { success: false, error: e.message || "Network error" };
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
  const url = buildUrl("/deposit-requests/top-up");
  if (!url)
    return {
      success: false,
      error:
        "Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.",
    };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[Deposit API] POST", url, body);
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Deposit API] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Deposit API] Error", e);
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
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
  const url = buildUrl("/deposit-requests/stock-investment");
  if (!url)
    return {
      success: false,
      error:
        "Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.",
    };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[Deposit API] POST", url, body);
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Deposit API] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Deposit API] Error", e);
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
  }
}

/**
 * Get user's top-up deposit requests.
 * GET /deposit-requests/top-up
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, requests?: Array, error?: string }>}
 */
export async function getTopUpDepositRequests(accessToken) {
  const url = buildUrl("/deposit-requests/top-up");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    const list = Array.isArray(data)
      ? data
      : (data.data ?? data.requests ?? []);
    return { success: true, requests: list };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Get user's stock investment deposit requests.
 * GET /deposit-requests/stock-investment
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, requests?: Array, error?: string }>}
 */
export async function getStockInvestmentDepositRequests(accessToken) {
  const url = buildUrl("/deposit-requests/stock-investment");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    const list = Array.isArray(data)
      ? data
      : (data.data ?? data.requests ?? []);
    return { success: true, requests: list };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  const url = buildUrl("/withdrawal-requests");
  if (!url)
    return {
      success: false,
      error:
        "Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.",
    };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[Withdrawal API] POST", url, body);
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Withdrawal API] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Withdrawal API] Error", e);
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
  }
}

/**
 * Submit a banking application via the backend.
 * POST /applications/banking
 * Body: JSON with base64-encoded images (see FRONTEND-BANKING-EWALLET-INTEGRATION.md).
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - Full application payload (bank, sourceOfFund, grossMonthlyIncome, grossMonthlyIncomeCurrency, idType, personalInfo, contactInfo, addressInfo, passportPhoto/idFront/idBack as base64)
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitBankingApplication(accessToken, body) {
  const url = buildUrl("/applications/banking");
  if (!url)
    return {
      success: false,
      error:
        "Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env and restart the app.",
    };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__)
      console.log(
        "[Banking API] POST",
        url,
        "(payload keys:",
        Object.keys(body),
        ")",
      );
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Banking API] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Banking API] Error", e);
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
  }
}

/**
 * Submit a travel protection request via the backend.
 * POST /travel-protection
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - Full application payload
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitTravelProtection(accessToken, body) {
  const url = buildUrl("/travel-protection");
  if (!url) return { success: false, error: "Backend URL not configured." };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[TravelProtection API] POST", url);
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[TravelProtection API] Error", e);
    return { success: false, error: e.message || "Network error." };
  }
}

/**
 * Get user's withdrawal requests.
 * GET /withdrawal-requests
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, requests?: Array, error?: string }>}
 */
export async function getWithdrawalRequests(accessToken) {
  const url = buildUrl("/withdrawal-requests");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    const list = Array.isArray(data)
      ? data
      : (data.data ?? data.requests ?? []);
    return { success: true, requests: list };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

// --- Auth API ---

/**
 * POST /auth/login
 * @returns {{ success: boolean, access_token?: string, user?: object, error?: string }}
 */
export async function login(email, password) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  try {
    const res = await apiFetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return {
      success: true,
      access_token: data.access_token,
      user: data.user,
      requiresPasswordReset: data.requiresPasswordReset === true,
    };
  } catch (e) {
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
  }
}

/**
 * POST /auth/forgot-password
 * Sends a one-time password-reset link to the user's registered email.
 * @param {string} email
 * @returns {{ success: boolean, message?: string, error?: string }}
 */
export async function forgotPassword(email) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  try {
    const res = await apiFetch(`${base}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, message: data.message };
  } catch (e) {
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
  }
}

/**
 * POST /auth/register
 * @param {Object} body - { email, password, firstName, lastName, middleName?, phone?, dateOfBirth?, countryCode?, referralCode?, companyName?, lineAccountLink?, isAgent? }
 * @returns {{ success: boolean, access_token?: string, user?: object, error?: string }}
 */
export async function register(body) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  try {
    const res = await apiFetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, access_token: data.access_token, user: data.user };
  } catch (e) {
    return {
      success: false,
      error: e.message || "Network error. Is the backend running?",
    };
  }
}

/**
 * GET /auth/me — requires JWT
 * @param {string} accessToken
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function getMe(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Unauthorized" };
    }
    return { success: true, user: data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /auth/profile — requires JWT
 * Updates the authenticated user's profile. When user has passcode set, passcode must be included.
 * @param {string} accessToken
 * @param {Object} body - { firstName?, lastName?, middleName?, phone?, dateOfBirth?, countryCode?, passcode? (required when hasPasscode) }
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function updateProfile(accessToken, body) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || "Failed to update profile";
      return { success: false, error: msg };
    }
    return { success: true, user: data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /auth/passcode — requires JWT
 * Sets a 4-digit passcode for the authenticated user.
 * @param {string} accessToken
 * @param {string} passcode — exactly 4 digits
 * @returns {{ success: boolean, error?: string }}
 */
export async function setPasscode(accessToken, passcode) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/passcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || "Failed to set passcode";
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/verify-passcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Passcode incorrect" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /auth/passcode — requires JWT
 * Updates the user's passcode. Requires current passcode for verification.
 * @param {string} accessToken
 * @param {string} currentPasscode — exactly 4 digits
 * @param {string} newPasscode — exactly 4 digits
 * @returns {{ success: boolean, error?: string }}
 */
export async function updatePasscode(
  accessToken,
  currentPasscode,
  newPasscode,
) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/passcode`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPasscode, newPasscode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || "Failed to update passcode";
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  if (!base) return { success: false, error: "Backend URL not configured" };
  try {
    const res = await apiFetch(`${base}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), otp }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Verification failed" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  if (!base) return { success: false, error: "Backend URL not configured" };
  try {
    const res = await apiFetch(`${base}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to resend" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/referrals/code`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to get referral code",
      };
    }
    return { success: true, referralCode: data.referralCode };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * GET /referrals/qr-payload — requires JWT
 * Returns the information necessary for the frontend to generate a QR code.
 * @param {string} accessToken
 * @returns {{ success: boolean, payload?: object, error?: string }}
 */
export async function getReferralQrPayload(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/referrals/qr-payload`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to get referral QR payload",
      };
    }
    return { success: true, payload: data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * GET /referrals/tree — requires JWT
 * Returns the current user's referral tree (referralCode, referrer, ancestors, directReferralCount, totalDescendantCount).
 * @param {string} accessToken
 * @returns {{ success: boolean, tree?: object, error?: string }}
 */
export async function getReferralTree(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/referrals/tree`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to get referral tree",
      };
    }
    return { success: true, tree: data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/referrals/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to generate referral code",
      };
    }
    return { success: true, referralCode: data.referralCode };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

// --- Wallets API ---

/**
 * POST /wallets/main — requires JWT
 * Gets or creates the user's main (PHP) wallet. Idempotent.
 * @param {string} accessToken
 * @returns {{ success: boolean, wallet?: object, error?: string }}
 */
export async function getOrCreateMainWallet(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/wallets/main`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to get wallet" };
    }
    return { success: true, wallet: data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

// --- Transfers & Beneficiaries API ---

/**
 * GET /transfers/recipient-by-account-number?accountNumber=xxx — requires JWT
 * Optional backend endpoint: resolve recipient by account number for transfer flow.
 * Returns minimal recipient info (e.g. userId, mainWalletId, firstName, lastName) or 404.
 * @param {string} accessToken
 * @param {string} accountNumber — 12-digit with or without spaces
 * @returns {{ success: boolean, data?: { userId, mainWalletId, accountNumber, firstName?, lastName? }, error?: string }}
 */
export async function getRecipientByAccountNumber(accessToken, accountNumber) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  const normalized = String(accountNumber || "")
    .replace(/\s/g, "")
    .trim();
  if (!normalized)
    return { success: false, error: "Account number is required" };
  try {
    const url = `${base}/transfers/recipient-by-account-number?accountNumber=${encodeURIComponent(normalized)}`;
    const res = await apiFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      return { success: false, error: "Recipient not found", notFound: true };
    }
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || "Failed to lookup recipient";
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * GET /beneficiaries — requires JWT
 * @param {string} accessToken
 * @returns {{ success: boolean, beneficiaries?: Array, error?: string }}
 */
export async function getBeneficiaries(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/beneficiaries`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to get beneficiaries",
      };
    }
    const list = Array.isArray(data)
      ? data
      : (data.data ?? data.beneficiaries ?? []);
    return { success: true, beneficiaries: list };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /beneficiaries — requires JWT. When user has passcode, include passcode in body.
 * @param {string} accessToken
 * @param {Object} body — { nickname, accountIdentifier, type: 'PHONE'|'EMAIL'|'WALLET_ID', isVerified?, passcode? }
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export async function createBeneficiary(accessToken, body) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/beneficiaries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || "Failed to create beneficiary";
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /transfers — requires JWT. When user has passcode, include passcode in body.
 * @param {string} accessToken
 * @param {Object} body — { beneficiaryId, fromWalletId?, amount, description?, passcode? }
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export async function submitTransfer(accessToken, body) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || "Transfer failed";
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const params = new URLSearchParams();
    if (opts.walletId) params.set("walletId", opts.walletId);
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.cursor) params.set("cursor", opts.cursor);
    if (opts.type) params.set("type", opts.type);
    const qs = params.toString();
    const url = `${base}/transactions${qs ? `?${qs}` : ""}`;
    const res = await apiFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to get transactions",
      };
    }
    return { success: true, transactions: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

// --- Messaging API (Client) ---

/**
 * POST /messages — requires JWT
 * Send a message to support. Start a new conversation or reply.
 * @param {string} accessToken
 * @param {string} content — Message content (1–10000 chars)
 * @returns {{ success: boolean, id?: string, error?: string }}
 */
export async function sendMessage(accessToken, content) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) return { success: false, error: "Message content is required" };
  try {
    const url = `${base}/messages`;
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, id: data.id };
  } catch (e) {
    if (__DEV__) console.error("[Messages API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * GET /messages — requires JWT
 * List the current user's support messages. Ordered newest first.
 * @param {string} accessToken
 * @param {{ page?: number, limit?: number }} opts
 * @returns {{ success: boolean, messages?: Array, pagination?: object, error?: string }}
 */
export async function getMessages(accessToken, opts = {}) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const params = new URLSearchParams();
    if (opts.page != null) params.set("page", String(opts.page));
    if (opts.limit != null) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const url = `${base}/messages${qs ? `?${qs}` : ""}`;
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return {
      success: true,
      messages: data.messages ?? [],
      pagination: data.pagination ?? {},
    };
  } catch (e) {
    if (__DEV__) console.error("[Messages API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /messages/:id/read — requires JWT
 * Mark a single message as read.
 * @param {string} accessToken
 * @param {string} messageId
 * @returns {{ success: boolean, error?: string }}
 */
export async function markMessageAsRead(accessToken, messageId) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!messageId) return { success: false, error: "Message ID required" };
  try {
    const url = `${base}/messages/${encodeURIComponent(messageId)}/read`;
    const res = await apiFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Messages API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /messages/read-all — requires JWT
 * Mark all unread support messages as read.
 * @param {string} accessToken
 * @returns {{ success: boolean, count?: number, error?: string }}
 */
export async function markAllMessagesAsRead(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/messages/read-all`;
    const res = await apiFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, count: data.count ?? 0 };
  } catch (e) {
    if (__DEV__) console.error("[Messages API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /messages/:id — requires JWT
 * Edit a message content.
 * @param {string} accessToken
 * @param {string} messageId
 * @param {string} content — New message content (1–10000 chars)
 * @returns {{ success: boolean, error?: string }}
 */
export async function editMessage(accessToken, messageId, content) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!messageId) return { success: false, error: "Message ID required" };
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) return { success: false, error: "Message content is required" };
  try {
    const url = `${base}/messages/${encodeURIComponent(messageId)}`;
    const res = await apiFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Messages API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * DELETE /messages/:id — requires JWT
 * Delete a message. Can specify deleteForEveryone flag.
 * @param {string} accessToken
 * @param {string} messageId
 * @param {boolean} deleteForEveryone — If true, deletes for all users; if false, only for sender
 * @returns {{ success: boolean, error?: string }}
 */
export async function deleteMessage(
  accessToken,
  messageId,
  deleteForEveryone = false,
) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!messageId) return { success: false, error: "Message ID required" };
  try {
    const url = `${base}/messages/${encodeURIComponent(messageId)}`;
    const res = await apiFetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ deleteForEveryone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Messages API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

// --- User Activity API (Admin) ---

/**
 * GET /user-activity/:userId — requires Admin JWT
 * Returns activity status for a single user (online/offline, lastActiveAt, lastLoginAt).
 * @param {string} adminToken — Admin JWT
 * @param {string} userId
 * @returns {{ success: boolean, isOnline?: boolean, status?: string, lastActiveAt?: string, lastLoginAt?: string, error?: string }}
 */
export async function getUserActivity(adminToken, userId) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!adminToken) return { success: false, error: "Not authenticated" };
  if (!userId) return { success: false, error: "User ID required" };
  try {
    const url = `${base}/user-activity/${encodeURIComponent(userId)}`;
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return {
      success: true,
      isOnline: data.isOnline,
      status: data.status,
      lastActiveAt: data.lastActiveAt,
      lastLoginAt: data.lastLoginAt,
    };
  } catch (e) {
    if (__DEV__) console.error("[UserActivity API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * GET /user-activity/bulk?userIds=id1,id2,id3 — requires Admin JWT
 * Returns activity status for multiple users. Users without a record return null.
 * @param {string} adminToken — Admin JWT
 * @param {string[]} userIds
 * @returns {{ success: boolean, activities?: Record<string, { isOnline: boolean, status: string, lastActiveAt: string, lastLoginAt: string } | null>, error?: string }}
 */
export async function getBulkUserActivity(adminToken, userIds) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!adminToken) return { success: false, error: "Not authenticated" };
  if (!Array.isArray(userIds) || userIds.length === 0)
    return { success: false, error: "User IDs required" };
  try {
    const idsParam = userIds.filter(Boolean).join(",");
    if (!idsParam) return { success: false, error: "User IDs required" };
    const url = `${base}/user-activity/bulk?userIds=${encodeURIComponent(idsParam)}`;
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, activities: data };
  } catch (e) {
    if (__DEV__) console.error("[UserActivity API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Submit a stock sell request.
 * POST /deposit-requests/stock-sell
 * @param {string} accessToken - Backend JWT
 * @param {{ walletId: string, stocksToSell: number }} body
 */
export async function submitStockSellRequest(accessToken, body) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL in .env.' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  const url = buildUrl('/deposit-requests/stock-sell');
  try {
    if (__DEV__) console.log('[StockSell API] POST', url, body);
    const res = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log('[StockSell API] Response', res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error('[StockSell API] Error', e);
    return { success: false, error: e.message || 'Network error. Check EXPO_PUBLIC_WALLET_BACKEND_URL.' };
  }
}

/**
 * Fetch the current user's stock sell requests.
 * GET /deposit-requests/stock-sell
 * @param {string} accessToken - Backend JWT
 */
export async function getStockSellRequests(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  const url = buildUrl('/deposit-requests/stock-sell');
  try {
    const res = await apiFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: Array.isArray(data) ? data : (data.data ?? []) };
  } catch (e) {
    if (__DEV__) console.error('[StockSell API] Error', e);
    return { success: false, error: e.message || 'Network error' };
  }
}

