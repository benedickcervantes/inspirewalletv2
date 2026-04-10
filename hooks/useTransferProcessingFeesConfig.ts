import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getTransferProcessingFees } from "../configs/api";
import {
  DEFAULT_TRANSFER_PROCESSING_FEES_CONFIG,
  feeConfigFromApiData,
  type TransferProcessingFeesConfig,
} from "../app/ServicesFunction/Transfer/transferProcessingFee";
import { subscribeTransferProcessingFeesUpdated } from "../lib/transferProcessingFeesEvents";

/**
 * Keeps transfer fee tiers in sync: refetch when the screen is focused, and apply
 * updates pushed over the socket when an admin saves new fees.
 */
export function useTransferProcessingFeesConfig(): TransferProcessingFeesConfig {
  const [feeConfig, setFeeConfig] = useState<TransferProcessingFeesConfig>(
    DEFAULT_TRANSFER_PROCESSING_FEES_CONFIG,
  );

  const refreshFromApi = useCallback(() => {
    getTransferProcessingFees().then((r) => {
      if (!r.success || !r.data?.brackets?.length) return;
      setFeeConfig(feeConfigFromApiData(r.data));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshFromApi();
    }, [refreshFromApi]),
  );

  useEffect(() => {
    return subscribeTransferProcessingFeesUpdated((config) => {
      setFeeConfig(config);
    });
  }, []);

  // If the socket missed an admin update (e.g. brief disconnect), refetch when the app is active again.
  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === "active") refreshFromApi();
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [refreshFromApi]);

  return feeConfig;
}
