/**
 * Currency and deposit configuration
 * Fetches from backend API with fallback to defaults
 */

/**
 * Get base URL for API calls
 */
function getBaseUrl() {
  const url = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
}

const EXPO_PUBLIC_API_KEY = process.env.EXPO_PUBLIC_API_KEY;

/**
 * Get available currencies for stock investment
 * @returns {Promise<Array<{code: string, name: string, flag: string, symbol: string}>>}
 */
export async function getAvailableCurrencies() {
  return [
    { code: "PHP", name: "Philippine Peso", flag: "🇵🇭", symbol: "₱" },
    { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", symbol: "¥" },
    { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", symbol: "﷼" },
    { code: "KRW", name: "Korean Won", flag: "🇰🇷", symbol: "₩" },
  ];
}

/**
 * Get currency by code
 * @param {string} code - Currency code (e.g., "PHP")
 * @returns {Promise<{code: string, name: string, flag: string, symbol: string} | undefined>}
 */
export async function getCurrencyByCode(code) {
  const currencies = await getAvailableCurrencies();
  return currencies.find((c) => c.code === code);
}

/**
 * Get the admin-configured stock rate from the backend.
 * Calls GET /system-settings/stock-rate (no auth required).
 * Falls back to 2,000,000 if the API is unreachable.
 * @returns {Promise<number>} PHP pesos per 1 stock unit
 */
export async function getStockInvestmentMinAmount() {
  try {
    const base = getBaseUrl();
    if (!base) return 2_000_000;

    const headers = { 'Content-Type': 'application/json' };
    if (EXPO_PUBLIC_API_KEY) headers['x-api-key'] = EXPO_PUBLIC_API_KEY;

    const response = await fetch(`${base}/system-settings/stock-rate`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rate = data?.phpPerStock;
    if (typeof rate === 'number' && rate > 0) return rate;

    return 2_000_000;
  } catch (error) {
    console.log('[currencies] Using default stock rate (2,000,000):', error.message);
    return 2_000_000;
  }
}

/**
 * @deprecated Use getStockInvestmentMinAmount() directly.
 * Kept for backwards-compatibility with stockInvestDepo.tsx which calls getDepositConfig().
 */
export async function getDepositConfig() {
  const stockRate = await getStockInvestmentMinAmount();
  return {
    stockInvestment: { minAmount: stockRate },
    timeDeposit: { minAmount: 50000 },
    topUp: { minAmount: 0 },
  };
}
