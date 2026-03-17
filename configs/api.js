import { Platform } from "react-native";

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

const inferMimeTypeFromUri = (imageUri, fallback = "image/jpeg") => {
  const uriLower = String(imageUri ?? "").toLowerCase();
  if (uriLower.endsWith(".png")) return "image/png";
  if (uriLower.endsWith(".gif")) return "image/gif";
  if (uriLower.endsWith(".webp")) return "image/webp";
  return fallback;
};

async function appendReceiptFile(formData, imageUri, mimeType = "image/jpeg") {
  if (!imageUri) {
    throw new Error("No image selected for receipt upload.");
  }

  const fallbackMimeType = inferMimeTypeFromUri(imageUri, mimeType);

  if (Platform.OS === "web") {
    const fileResponse = await _originalFetch(imageUri);
    if (!fileResponse.ok) {
      throw new Error(`Failed to read selected receipt (${fileResponse.status})`);
    }

    const blob = await fileResponse.blob();
    const resolvedMimeType = blob.type || fallbackMimeType;
    const ext = resolvedMimeType.split("/")[1] ?? "jpg";
    const webFile =
      blob.type === resolvedMimeType ? blob : new Blob([blob], { type: resolvedMimeType });

    formData.append("file", webFile, `receipt.${ext}`);
    return resolvedMimeType;
  }

  const ext = fallbackMimeType.split("/")[1] ?? "jpg";
  formData.append("file", {
    uri: imageUri,
    name: `receipt.${ext}`,
    type: fallbackMimeType,
  });
  return fallbackMimeType;
}

async function appendImageFile(
  formData,
  imageUri,
  filenameBase,
  mimeType = "image/jpeg",
) {
  if (!imageUri) {
    throw new Error("No image selected.");
  }
  const fallbackMimeType = inferMimeTypeFromUri(imageUri, mimeType);

  if (Platform.OS === "web") {
    const fileResponse = await _originalFetch(imageUri);
    if (!fileResponse.ok) {
      throw new Error(`Failed to read selected file (${fileResponse.status})`);
    }

    const blob = await fileResponse.blob();
    const resolvedMimeType = blob.type || fallbackMimeType;
    const ext = resolvedMimeType.split("/")[1] ?? "jpg";
    const webFile =
      blob.type === resolvedMimeType
        ? blob
        : new Blob([blob], { type: resolvedMimeType });

    formData.append("file", webFile, `${filenameBase}.${ext}`);
    return resolvedMimeType;
  }

  const ext = fallbackMimeType.split("/")[1] ?? "jpg";
  formData.append("file", {
    uri: imageUri,
    name: `${filenameBase}.${ext}`,
    type: fallbackMimeType,
  });
  return fallbackMimeType;
}

/**
 * POST /auth/qr/decode (multipart/form-data, field: "file")
 * @param {string} imageUri - Local file URI from ImagePicker (file://...)
 * @param {"line"|"viber"|"whatsapp"|undefined} provider
 * @param {string} mimeType
 * @returns {{ success: boolean, text?: string, normalizedLink?: string, error?: string }}
 */
export async function decodeQrImage(imageUri, provider, mimeType = "image/jpeg") {
  const url = buildUrl("/auth/qr/decode");
  if (!url) return { success: false, error: "Backend URL not configured" };
  try {
    const formData = new FormData();
    await appendImageFile(formData, imageUri, "qrcode", mimeType);
    if (provider) {
      formData.append("provider", provider);
    }

    const res = await apiFetch(url, {
      method: "POST",
      // IMPORTANT: Do NOT set Content-Type manually for FormData in React Native.
      body: formData,
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
      text: typeof data.text === "string" ? data.text : undefined,
      normalizedLink:
        typeof data.normalizedLink === "string" ? data.normalizedLink : undefined,
    };
  } catch (e) {
    if (__DEV__) console.error("[QR Decode API] Error", e);
    return { success: false, error: e.message || "Network error decoding QR." };
  }
}

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
 * Submit an account deletion request.
 * POST /account-deletion-requests — requires JWT
 * @param {string} accessToken - Backend JWT
 * @param {{ reason: string, notes?: string }} body
 */
export async function submitAccountDeletionRequest(accessToken, body) {
  const url = buildUrl("/account-deletion-requests");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
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
    if (__DEV__) console.error("[AccountDeletion API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Get the authenticated user's account deletion requests.
 * GET /account-deletion-requests/me — requires JWT
 * @param {string} accessToken - Backend JWT
 */
export async function getMyAccountDeletionRequests(accessToken) {
  const url = buildUrl("/account-deletion-requests/me");
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
    return { success: true, data: Array.isArray(data) ? data : (data.data ?? []) };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
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
 * Calculate exchange rate (real-time currency conversion).
 * POST /exchange-rate/calculate — no auth required.
 * Per docs/exchange-calculator-api.md: User deposits foreign currency to acquire PHP.
 * @param {Object} params
 * @param {string} params.currency - 3-letter currency code (e.g. "JPY", "USD", "SAR", "KRW")
 * @param {number} params.amount - The amount the user typed
 * @param {string} [params.action="BUY_PHP"] - "BUY_PHP" (deposit) or "SELL_PHP" (withdraw)
 * @param {string} [params.amountType="SOURCE_FOREIGN"] - "SOURCE_FOREIGN" (user typed in foreign currency) or "TARGET_PHP"
 * @returns {Promise<{ success: boolean, targetAmount?: number, sourceAmount?: number, error?: string }>}
 */
export async function calculateExchange({
  currency,
  amount,
  action = "BUY_PHP",
  amountType = "SOURCE_FOREIGN",
}) {
  const base = getBaseUrl();
  if (!base) {
    if (__DEV__) console.warn("[ExchangeRate API] Backend URL not configured. Set EXPO_PUBLIC_WALLET_BACKEND_URL.");
    return { success: false, error: "Backend URL not configured." };
  }
  if (!currency || amount == null || amount < 0)
    return { success: false, error: "Invalid params" };
  const url = `${base}/exchange-rate/calculate`;
  try {
    if (__DEV__) console.log("[ExchangeRate API] POST", url, { currency, amount, action, amountType });
    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        currency,
        amount: Number(amount),
        amountType,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[ExchangeRate API] Response", res.status, data);
    if (!res.ok) {
      const msg =
        data.message || data.error || `Exchange rate not available for ${currency}`;
      return { success: false, error: msg };
    }
    return {
      success: true,
      targetAmount: data.targetAmount,
      sourceAmount: data.sourceAmount,
      rateUsed: data.rateUsed,
    };
  } catch (e) {
    if (__DEV__) console.error("[ExchangeRate API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Convert between any two currencies using live backend rates.
 * Uses PHP as intermediary for non-PHP pairs (e.g. USD→EUR = USD→PHP→EUR).
 * @param {Object} params
 * @param {string} params.fromCurrency - 3-letter source currency (e.g. "USD", "PHP")
 * @param {string} params.toCurrency - 3-letter target currency (e.g. "EUR", "JPY")
 * @param {number} params.amount - Amount in fromCurrency
 * @returns {Promise<{ success: boolean, convertedAmount?: number, rateUsed?: number, error?: string }>}
 */
export async function calculateExchangePair({
  fromCurrency,
  toCurrency,
  amount,
}) {
  const base = getBaseUrl();
  if (!base) {
    return { success: false, error: "Backend URL not configured." };
  }
  if (!fromCurrency || !toCurrency || amount == null || amount < 0) {
    return { success: false, error: "Invalid params" };
  }
  const from = String(fromCurrency).toUpperCase();
  const to = String(toCurrency).toUpperCase();
  if (from === to) {
    return { success: true, convertedAmount: amount, rateUsed: 1 };
  }

  try {
    if (from === "PHP") {
      const res = await calculateExchange({
        action: "SELL_PHP",
        currency: to,
        amount: Number(amount),
        amountType: "TARGET_PHP",
      });
      if (!res.success) return res;
      return {
        success: true,
        convertedAmount: res.targetAmount,
        rateUsed: res.rateUsed,
      };
    }
    if (to === "PHP") {
      const res = await calculateExchange({
        action: "BUY_PHP",
        currency: from,
        amount: Number(amount),
        amountType: "SOURCE_FOREIGN",
      });
      if (!res.success) return res;
      return {
        success: true,
        convertedAmount: res.targetAmount,
        rateUsed: res.rateUsed,
      };
    }
    const step1 = await calculateExchange({
      action: "BUY_PHP",
      currency: from,
      amount: Number(amount),
      amountType: "SOURCE_FOREIGN",
    });
    if (!step1.success) return step1;
    const phpAmount = step1.targetAmount;
    const step2 = await calculateExchange({
      action: "SELL_PHP",
      currency: to,
      amount: phpAmount,
      amountType: "TARGET_PHP",
    });
    if (!step2.success) return step2;
    return {
      success: true,
      convertedAmount: step2.targetAmount,
      rateUsed: step2.rateUsed,
    };
  } catch (e) {
    if (__DEV__) console.error("[ExchangePair API] Error", e);
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
 * Upload a payment receipt image for an existing top-up request.
 * POST /deposit-requests/top-up/:id/receipt (multipart/form-data, field: "file")
 * Called AFTER creating the top-up request to attach the receipt.
 * @param {string} accessToken - Backend JWT
 * @param {string} requestId - ID returned from submitTopUpRequest
 * @param {string} imageUri - Local file URI from ImagePicker (file://...)
 * @param {string} [mimeType] - MIME type (default: image/jpeg)
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function uploadTopUpReceiptFile(accessToken, requestId, imageUri, mimeType = "image/jpeg") {
  const url = buildUrl(`/deposit-requests/top-up/${requestId}/receipt`);
  if (!url) return { success: false, error: "Backend URL not configured." };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[Receipt Upload] POST", url, "imageUri:", imageUri, "mimeType:", mimeType);
    const formData = new FormData();
    const resolvedMimeType = await appendReceiptFile(formData, imageUri, mimeType);
    // IMPORTANT: Do NOT set Content-Type manually for FormData in React Native.
    // The native fetch sets multipart/form-data WITH the boundary automatically.
    // Setting it manually removes the boundary and breaks multipart parsing on the server.
    const apiKey = process.env.EXPO_PUBLIC_API_KEY;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (apiKey) headers["x-api-key"] = apiKey;
    if (__DEV__) console.log("[Receipt Upload] Prepared multipart file with mimeType:", resolvedMimeType);
    const res = await _originalFetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Receipt Upload] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Upload failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Receipt Upload] Error", e);
    return { success: false, error: e.message || "Network error uploading receipt." };
  }
}

/**
 * Upload a payment receipt image for an existing time deposit request.
 * POST /time-deposits/:id/receipt (multipart/form-data, field: "file")
 * Called AFTER creating the time deposit request to attach the receipt.
 * @param {string} accessToken - Backend JWT
 * @param {string} requestId - ID returned from submitTimeDepositRequest
 * @param {string} imageUri - Local file URI from ImagePicker (file://...)
 * @param {string} [mimeType] - MIME type (default: image/jpeg)
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function uploadTimeDepositReceiptFile(accessToken, requestId, imageUri, mimeType = "image/jpeg") {
  const url = buildUrl(`/time-deposits/${requestId}/receipt`);
  if (!url) return { success: false, error: "Backend URL not configured." };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[TimeDeposit Receipt Upload] POST", url, "imageUri:", imageUri, "mimeType:", mimeType);
    const formData = new FormData();
    const resolvedMimeType = await appendReceiptFile(formData, imageUri, mimeType);
    const apiKey = process.env.EXPO_PUBLIC_API_KEY;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (apiKey) headers["x-api-key"] = apiKey;
    if (__DEV__) console.log("[TimeDeposit Receipt Upload] Prepared multipart file with mimeType:", resolvedMimeType);
    const res = await _originalFetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[Receipt Upload] Response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Upload failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Receipt Upload] Error", e);
    return { success: false, error: e.message || "Network error uploading receipt." };
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
 * POST /auth/reset-passcode — requires JWT
 * Resets passcode without verifying old one. Use when user verified identity via email+password.
 * @param {string} accessToken
 * @param {string} passcode — exactly 4 digits
 * @returns {{ success: boolean, error?: string }}
 */
export async function resetPasscode(accessToken, passcode) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/reset-passcode`, {
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
        : data.message || "Failed to reset passcode";
      return { success: false, error: msg };
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
 * POST /auth/biometric/enable — requires JWT
 * Enables biometric login. Requires user to verify identity with email & password.
 * @param {string} accessToken
 * @param {string} email
 * @param {string} password
 * @returns {{ success: boolean, token?: string, error?: string }}
 */
export async function enableBiometric(accessToken, email, password) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/biometric/enable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || "Failed to enable biometric";
      return { success: false, error: msg };
    }
    return { success: true, token: data.token }; // Token string to be saved to SecureStore
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /auth/biometric/disable — requires JWT
 * Disables biometric login for the current user.
 * @param {string} accessToken
 * @returns {{ success: boolean, message?: string, error?: string }}
 */
export async function disableBiometric(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "No token" };
  try {
    const res = await apiFetch(`${base}/auth/biometric/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || "Failed to disable biometric";
      return { success: false, error: msg };
    }
    return { success: true, message: data.message };
  } catch (e) {
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /auth/biometric/verify — NO JWT REQUIRED
 * Used during login. Transmits the secure biometric token to get an access_token.
 * @param {string} token — The token from SecureStore
 * @returns {{ success: boolean, access_token?: string, user?: object, requiresPasswordReset?: boolean, error?: string }}
 */
export async function verifyBiometric(token) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  try {
    const res = await apiFetch(`${base}/auth/biometric/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
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
 * GET /notifications — requires JWT
 * Fetch the current user's push notification history.
 * @param {string} accessToken
 * @param {{ limit?: number }} opts
 */
export async function getNotifications(accessToken, opts = {}) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const url = `${base}/notifications${qs ? `?${qs}` : ""}`;
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
      data: Array.isArray(data) ? data : [],
    };
  } catch (e) {
    if (__DEV__) console.error("[Notifications API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * GET /announcements/active — requires JWT
 * Fetch active announcements for the current user.
 * @param {string} accessToken
 */
export async function getActiveAnnouncements(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/announcements/active`;
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
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (e) {
    if (__DEV__) console.error("[Announcements API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /notifications/read-all — requires JWT
 * Mark all notifications as read.
 * @param {string} accessToken
 */
export async function markAllNotificationsAsRead(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/notifications/read-all`;
    const res = await apiFetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || 'Failed';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Notifications API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * PATCH /notifications/:id/read — requires JWT
 * Mark notification as read.
 * @param {string} accessToken
 * @param {string} notificationId
 */
export async function markNotificationAsRead(accessToken, notificationId) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/notifications/${encodeURIComponent(notificationId)}/read`;
    const res = await apiFetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || 'Failed';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Notifications API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * DELETE /notifications/:id — requires JWT
 * Delete a single notification.
 * @param {string} accessToken
 * @param {string} notificationId
 */
export async function deleteNotification(accessToken, notificationId) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/notifications/${encodeURIComponent(notificationId)}`;
    const res = await apiFetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || 'Failed';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Notifications API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * DELETE /notifications/all — requires JWT
 * Delete all notifications for the user.
 * @param {string} accessToken
 */
export async function deleteAllNotifications(accessToken) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/notifications/all`;
    const res = await apiFetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || 'Failed';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Notifications API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /notifications/delete-batch — requires JWT
 * Delete multiple notifications.
 * @param {string} accessToken
 * @param {string[]} ids
 */
export async function deleteNotificationBatch(accessToken, ids) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const url = `${base}/notifications/delete-batch`;
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ids: ids || [] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || 'Failed';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    if (__DEV__) console.error("[Notifications API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /notifications/:id/referral/accept — requires JWT
 * Accept a new referral (keep the user under your referral code).
 * @param {string} accessToken
 * @param {string} notificationId
 */
export async function acceptReferralRequest(accessToken, notificationId) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!notificationId) return { success: false, error: "Notification ID required" };
  try {
    const url = `${base}/notifications/${encodeURIComponent(notificationId)}/referral/accept`;
    const res = await apiFetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || "Failed";
      return { success: false, error: msg };
    }
    return { success: true, data };
  } catch (e) {
    if (__DEV__) console.error("[Referral API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /notifications/:id/referral/decline — requires JWT
 * Decline a new referral (remove the user from your referral).
 * @param {string} accessToken
 * @param {string} notificationId
 */
export async function declineReferralRequest(accessToken, notificationId) {
  const base = getBaseUrl();
  if (!base) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!notificationId) return { success: false, error: "Notification ID required" };
  try {
    const url = `${base}/notifications/${encodeURIComponent(notificationId)}/referral/decline`;
    const res = await apiFetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || "Failed";
      return { success: false, error: msg };
    }
    return { success: true, data };
  } catch (e) {
    if (__DEV__) console.error("[Referral API] Error", e);
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
// --- Stock Rate & Marketplace API ---

/**
 * Fetch the current admin-configured stock rate (PHP per 1 stock unit).
 * GET /system-settings/stock-rate — no auth required.
 * @returns {Promise<{ success: boolean, phpPerStock?: number, error?: string }>}
 */
export async function getStockRate() {
  const url = buildUrl('/system-settings/stock-rate');
  if (!url) return { success: false, phpPerStock: 2_000_000, error: 'Backend URL not configured' };
  try {
    const res = await apiFetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, phpPerStock: 2_000_000 };
    return { success: true, phpPerStock: data.phpPerStock ?? 2_000_000 };
  } catch {
    return { success: false, phpPerStock: 2_000_000 };
  }
}

/**
 * Fetch all active stock sell listings in the marketplace (excludes own listings).
 * GET /deposit-requests/stock-sell/marketplace
 * @param {string} accessToken - Backend JWT
 * @returns {Promise<{ success: boolean, data?: Array<{id, stocksToSell, phpAmount, createdAt}>, error?: string }>}
 */
export async function getStockMarketplaceListings(accessToken) {
  const url = buildUrl('/deposit-requests/stock-sell/marketplace');
  if (!url) return { success: false, data: [], error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, data: [], error: 'Not authenticated' };
  try {
    const res = await apiFetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, data: [], error: msg };
    }
    return { success: true, data: Array.isArray(data) ? data : (data.data ?? []) };
  } catch (e) {
    if (__DEV__) console.error('[StockMarketplace API] Error', e);
    return { success: false, data: [], error: e.message || 'Network error' };
  }
}

/**
 * Purchase a stock sell listing from the marketplace (P2P, no admin approval).
 * POST /deposit-requests/stock-sell/:id/purchase
 * @param {string} accessToken - Backend JWT
 * @param {string} sellRequestId - ID of the StockSellRequest to purchase
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function purchaseStockListing(accessToken, sellRequestId) {
  const url = buildUrl(`/deposit-requests/stock-sell/${sellRequestId}/purchase`);
  if (!url) return { success: false, error: 'Backend URL not configured' };
  if (!accessToken) return { success: false, error: 'Not authenticated' };
  try {
    if (__DEV__) console.log('[StockMarketplace API] POST purchase', url);
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error('[StockMarketplace API] Error', e);
    return { success: false, error: e.message || 'Network error' };
  }
}

// --- Card Collection API ---


/**
 * Get card catalog with per-user eligibility/ownership flags.
 * GET /card-collection/catalog
 * @param {string} accessToken - Backend JWT
 */
export async function getCardCatalog(accessToken) {
  const url = buildUrl("/card-collection/catalog");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
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
    const catalog = Array.isArray(data.catalog)
      ? data.catalog
      : Array.isArray(data)
        ? data
        : [];
    return { success: true, catalog };
  } catch (e) {
    if (__DEV__) console.error("[CardCollection API] getCardCatalog error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Get current user's card collection and active card.
 * GET /card-collection/my-collection
 * @param {string} accessToken - Backend JWT
 */
export async function getMyCardCollection(accessToken) {
  const url = buildUrl("/card-collection/my-collection");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
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
    return { success: true, data };
  } catch (e) {
    if (__DEV__) console.error("[CardCollection API] getMyCardCollection error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Buy or unlock a card design.
 * POST /card-collection/buy
 * @param {string} accessToken - Backend JWT
 * @param {string} design - Card design slug (e.g. DIAMOND_ELITE)
 */
export async function buyCard(accessToken, design) {
  const url = buildUrl("/card-collection/buy");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!design) return { success: false, error: "Design is required" };
  try {
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ design }),
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
    if (__DEV__) console.error("[CardCollection API] buyCard error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Select which owned card should be treated as the active design.
 * POST /card-collection/set-active
 * @param {string} accessToken - Backend JWT
 * @param {string} cardCollectionItemId - ID from my-collection.collection[].id
 */
export async function setActiveCard(accessToken, cardCollectionItemId) {
  const url = buildUrl("/card-collection/set-active");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!cardCollectionItemId) return { success: false, error: "Card ID is required" };
  try {
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ cardCollectionItemId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data };
  } catch (e) {
    if (__DEV__) console.error("[CardCollection API] setActiveCard error", e);
    return { success: false, error: e.message || "Network error" };
  }
}


/**
 * Renew an expiring Gold Elite subscription.
 * Only allowed when subscription expires within 3 days.
 * POST /card-collection/renew
 * @param {string} accessToken - Backend JWT
 * @param {string} design - Card design to renew (e.g., "GOLD_ELITE")
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function renewCard(accessToken, design) {
  const url = buildUrl("/card-collection/renew");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  if (!design) return { success: false, error: "Design is required" };
  try {
    if (__DEV__) console.log("[CardCollection API] renewCard POST", url, { design });
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ design }),
    });
    const data = await res.json().catch(() => ({}));
    if (__DEV__) console.log("[CardCollection API] renewCard response", res.status, data);
    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message[0]
        : data.message || data.error || `Request failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[CardCollection API] renewCard error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * POST /card-collection/cancel-renewal — requires JWT
 * Cancels auto-renewal for Gold Elite subscription.
 * @param {string} accessToken - Backend JWT
 * @param {string} design - Card design (should be "GOLD_ELITE")
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export async function cancelAutoRenewal(accessToken, design) {
  const url = buildUrl("/card-collection/cancel-renewal");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ design }),
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
    if (__DEV__) console.error("[CardCollection API] cancelAutoRenewal error", e);
    return { success: false, error: e.message || "Network error" };
  }
}
/**
 * Submit an e-wallet application via the backend.
 * POST /ewallet-applications
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - { provider, sourceOfFund, grossMonthlyIncome, grossMonthlyIncomeCurrency, personalInfo?, contactInfo?, addressInfo? }
 */
export async function submitEwalletApplication(accessToken, body) {
  const url = buildUrl("/ewallet-applications");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
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
        : data.message || data.error || `Submission failed (${res.status})`;
      return { success: false, error: msg };
    }
    return { success: true, data: data.data ?? data };
  } catch (e) {
    if (__DEV__) console.error("[Ewallet API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Submit a personal KYC request via the backend.
 * POST /kyc-requests
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - { userName?, personalInfo?, addressInfo?, documents?, status? }
 */
export async function submitPersonalKyc(accessToken, body) {
  const url = buildUrl("/kyc-requests");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__) console.log("[KYC API] POST", url, "(keys:", Object.keys(body || {}), ")");
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body || {}),
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
    if (__DEV__) console.error("[KYC API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}

/**
 * Submit a company KYC request via the backend.
 * POST /kyc-requests/company
 * @param {string} accessToken - Backend JWT
 * @param {Object} body - { companyName: string, documents: { commercialRegister, bankStatement, proofOfBilling } }
 */
export async function submitCompanyKyc(accessToken, body) {
  const url = buildUrl("/kyc-requests/company");
  if (!url) return { success: false, error: "Backend URL not configured" };
  if (!accessToken) return { success: false, error: "Not authenticated" };
  try {
    if (__DEV__)
      console.log(
        "[Company KYC API] POST",
        url,
        "(keys:",
        Object.keys(body || {}),
        ")",
      );
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body || {}),
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
    if (__DEV__) console.error("[Company KYC API] Error", e);
    return { success: false, error: e.message || "Network error" };
  }
}
