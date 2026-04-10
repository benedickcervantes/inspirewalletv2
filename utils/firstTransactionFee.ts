import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTransactions } from "../configs/api";

const FIRST_TX_FEE_WAIVED_KEY_PREFIX = "first_tx_fee_waived_v2_user_";

/**
 * Backend GET /transactions does not filter by `type` (the query param is ignored).
 * We must load a page of transactions and filter by `type` on the client.
 *
 * Outgoing transfers use TRANSFER_OUT for the sender. Receivers see TRANSFER_IN instead.
 * Withdrawals are typically PAYMENT in this app.
 */
const TYPES_CONSUMING_FIRST_FEE_WAIVER = new Set([
  "TRANSFER_OUT",
  "PAYMENT",
  "WITHDRAWAL",
  "WITHDRAWAL_REQUEST",
]);

const TX_FETCH_LIMIT = 100;

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob !== "function") return null;
    const json = atob(padded);
    const payload = JSON.parse(json) as { sub?: string };
    const sub = payload?.sub;
    return typeof sub === "string" && sub.trim() ? sub.trim() : null;
  } catch {
    return null;
  }
}

function normalizeScope(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.@-]/g, "_");
}

async function resolveCurrentUserScope(): Promise<string | null> {
  try {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (accessToken) {
      const sub = decodeJwtSub(accessToken);
      if (sub) return normalizeScope(sub);
    }

    const userRaw = await AsyncStorage.getItem("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as Record<string, unknown>;
    const candidates = [
      user?.id,
      user?.uid,
      user?.userId,
      user?.accountNumber,
      user?.accountNo,
      user?.account_number,
      user?.email,
      user?.phoneNumber,
    ];
    for (const candidate of candidates) {
      const scoped = String(candidate ?? "").trim();
      if (scoped) return normalizeScope(scoped);
    }
  } catch {
    return null;
  }
  return null;
}

const getScopedWaivedKey = async (): Promise<string> => {
  const scope = await resolveCurrentUserScope();
  if (!scope) {
    const token = await AsyncStorage.getItem("access_token");
    const tail = token ? token.slice(-32) : "anon";
    return `${FIRST_TX_FEE_WAIVED_KEY_PREFIX}fallback_${tail}`;
  }
  return `${FIRST_TX_FEE_WAIVED_KEY_PREFIX}${scope}`;
};

function hasConsumedFirstFeeWaiver(transactions: unknown): boolean {
  if (!Array.isArray(transactions)) return false;
  return transactions.some((tx) => {
    const t = String((tx as { type?: string })?.type ?? "")
      .trim()
      .toUpperCase();
    return TYPES_CONSUMING_FIRST_FEE_WAIVER.has(t);
  });
}

export const markFirstTransactionFeeWaived = async (): Promise<void> => {
  const key = await getScopedWaivedKey();
  await AsyncStorage.setItem(key, "1");
};

export const isEligibleForFirstTransactionFreeFee = async (): Promise<boolean> => {
  const key = await getScopedWaivedKey();
  const localWaived = await AsyncStorage.getItem(key);
  if (localWaived === "1") return false;

  const accessToken = await AsyncStorage.getItem("access_token");
  if (!accessToken) return false;

  try {
    const result = await getTransactions(accessToken, {
      limit: TX_FETCH_LIMIT,
    });
    if (!result.success || !Array.isArray(result.transactions)) {
      // Cannot verify history — allow waived fee in UI; backend remains source of truth for charges.
      return true;
    }
    if (hasConsumedFirstFeeWaiver(result.transactions)) return false;
    return true;
  } catch {
    return true;
  }
};
