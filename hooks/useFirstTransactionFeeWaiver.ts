import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { getTransactions } from "../configs/api";

type FeeWaiverMode = "transfer" | "withdrawal";

const TX_TYPE_BY_MODE: Record<FeeWaiverMode, string> = {
  transfer: "TRANSFER_OUT",
  withdrawal: "PAYMENT",
};

type RawApiTransaction = {
  type?: unknown;
  description?: unknown;
};

function normalizeType(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function isMatchingTransaction(
  tx: RawApiTransaction,
  mode: FeeWaiverMode,
): boolean {
  const type = normalizeType(tx?.type);
  if (mode === "transfer") return type === "TRANSFER_OUT";
  if (mode === "withdrawal") return type === "PAYMENT";

  const description = String(tx?.description ?? "").toLowerCase();
  if (mode === "transfer") return description.includes("transfer");
  return description.includes("withdraw");
}

/**
 * Returns true when the user has no prior transaction for the selected flow.
 * - transfer: no previous TRANSFER_OUT
 * - withdrawal: no previous PAYMENT
 */
export function useFirstTransactionFeeWaiver(mode: FeeWaiverMode): {
  isFirstTransactionFree: boolean;
  isCheckingEligibility: boolean;
} {
  const [isFirstTransactionFree, setIsFirstTransactionFree] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);

  const refreshEligibility = useCallback(async () => {
    setIsCheckingEligibility(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setIsFirstTransactionFree(false);
        return;
      }

      const targetType = TX_TYPE_BY_MODE[mode];
      const txRes = await getTransactions(accessToken, { type: targetType, limit: 1 });

      if (!txRes.success) {
        setIsFirstTransactionFree(false);
        return;
      }

      const list = Array.isArray(txRes.transactions)
        ? (txRes.transactions as RawApiTransaction[])
        : [];

      const hasPriorMatch = list.some((tx) => isMatchingTransaction(tx, mode));
      setIsFirstTransactionFree(!hasPriorMatch);
    } catch {
      setIsFirstTransactionFree(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      void refreshEligibility();
    }, [refreshEligibility]),
  );

  return { isFirstTransactionFree, isCheckingEligibility };
}
