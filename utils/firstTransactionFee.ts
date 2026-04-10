import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTransactions } from "../configs/api";

const FIRST_TX_FEE_WAIVED_KEY = "first_tx_fee_waived_v1";

const CHARGEABLE_TRANSACTION_TYPES = ["TRANSFER_OUT", "PAYMENT"] as const;

export const markFirstTransactionFeeWaived = async (): Promise<void> => {
  await AsyncStorage.setItem(FIRST_TX_FEE_WAIVED_KEY, "1");
};

export const isEligibleForFirstTransactionFreeFee = async (): Promise<boolean> => {
  const localWaived = await AsyncStorage.getItem(FIRST_TX_FEE_WAIVED_KEY);
  if (localWaived === "1") return false;

  const accessToken = await AsyncStorage.getItem("access_token");
  if (!accessToken) return false;

  for (const txType of CHARGEABLE_TRANSACTION_TYPES) {
    const result = await getTransactions(accessToken, { limit: 1, type: txType });
    if (result.success && Array.isArray(result.transactions) && result.transactions.length > 0) {
      return false;
    }
  }

  return true;
};
