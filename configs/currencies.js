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

/**
 * Get available currencies for stock investment
 * @returns {Promise<Array<{code: string, name: string, flag: string, symbol: string}>>}
 */
export async function getAvailableCurrencies() {
  // TODO: Replace with API call when backend endpoint is available
  // const base = getBaseUrl();
  // const res = await fetch(`${base}/currencies`);
  // return await res.json();
  
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
 * Get deposit configuration (minimum amounts, limits, etc.)
 * Fetches from backend API with fallback to defaults
 * @returns {Promise<{stockInvestment: {minAmount: number}, timeDeposit: {minAmount: number}, topUp: {minAmount: number}}>}
 */
export async function getDepositConfig() {
  try {
    const base = getBaseUrl();
    if (!base) {
      throw new Error("Backend URL not configured");
    }

    const response = await fetch(`${base}/api/settings/deposit-limits`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch deposit config");
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.log("Using default deposit limits:", error.message);
    // Fallback to defaults if API call fails
    return {
      stockInvestment: {
        minAmount: 2000000,
      },
      timeDeposit: {
        minAmount: 50000,
      },
      topUp: {
        minAmount: 0,
      },
    };
  }
}

/**
 * Get minimum amount for stock investment
 * @returns {Promise<number>}
 */
export async function getStockInvestmentMinAmount() {
  const config = await getDepositConfig();
  return config.stockInvestment.minAmount;
}
