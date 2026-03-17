/**
 * CoinGecko API helper for historical price chart data.
 * Used by Play & Earn price graph.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
};

export type CoinGeckoPricePoint = [number, number]; // [timestamp_ms, price]

export interface MarketChartResponse {
  prices: CoinGeckoPricePoint[];
}

/**
 * Fetch market chart (historical prices) for a coin.
 * @param coinId - CoinGecko id: bitcoin | ethereum | tether
 * @param days - 1, 7, etc. (1 = 24h granularity; 7 = 7d)
 * @param vsCurrency - e.g. "php"
 */
export async function fetchCoinGeckoMarketChart(
  coinId: string,
  days: number,
  vsCurrency: string = "php"
): Promise<MarketChartResponse | null> {
  const apiKey = process.env.EXPO_PUBLIC_COINGECKO_API_KEY?.trim() || "";
  const url = new URL(`${COINGECKO_BASE}/coins/${coinId}/market_chart`);
  url.searchParams.set("vs_currency", vsCurrency);
  url.searchParams.set("days", String(days));
  if (apiKey) {
    url.searchParams.set("x_cg_demo_api_key", apiKey);
  }

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as MarketChartResponse;
    return data?.prices ? data : null;
  } catch {
    return null;
  }
}
