import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getOrCreateMainWallet,
    submitWithdrawalRequest,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import {
    isEligibleForFirstTransactionFreeFee,
    markFirstTransactionFeeWaived,
} from "../../../utils/firstTransactionFee";
import PasscodeModal from "../../components/PasscodeModal";

import ActivityModal from "../../components/ActivityModal";
import FeatureMaintenanceModal from "../../components/FeatureMaintenanceModal";
import { isWithdrawalCombinationUnderMaintenance } from "../../../lib/maintenance";
import {
    MIN_REMAINING_WALLET_BALANCE_PHP,
    MIN_WITHDRAWAL_AVAILABLE_BALANCE_PHP,
    MIN_WITHDRAWAL_PHP,
    parseWithdrawalAmountInput,
} from "../../../utils/withdrawalAmount";
const getEwalletTransactionFee = (amount: number) => {
  if (Number.isNaN(amount) || amount <= 0) return 0;
  if (amount <= 10000) return 25;
  if (amount <= 20000) return 50;
  if (amount <= 30000) return 75;
  if (amount <= 40000) return 100;
  if (amount <= 50000) return 125;
  if (amount <= 60000) return 150;
  if (amount <= 70000) return 175;
  if (amount <= 80000) return 200;
  if (amount <= 90000) return 225;
  if (amount <= 100000) return 250;
  return 275;
};

export default function EWalletConfirm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params || {}) as {
    method?: string;
    walletType?: string;
    accountNumber?: string;
    accountName?: string;
    amount?: string;
    email?: string;
    type?: string;
    isFirstTransactionFree?: boolean;
  };
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
  }>({ title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [isFirstTransactionFree, setIsFirstTransactionFree] = useState(
    Boolean(params.isFirstTransactionFree),
  );

  const method = params.method || "e-wallet";
  const walletType = params.walletType || "";
  const accountNumber = params.accountNumber || "";
  const accountName = params.accountName || "";
  const amount = params.amount || "0";
  const email = params.email || "";
  const withdrawalType = params.type || "available-balance";
  const isAgentWithdrawal = withdrawalType === "agent-withdrawal";
  const parsedAmount = parseFloat(amount);
  const transactionFee = isFirstTransactionFree
    ? 0
    : getEwalletTransactionFee(parsedAmount);
  const netWithdrawalAmount = Math.max(
    0,
    (Number.isNaN(parsedAmount) ? 0 : parsedAmount) - transactionFee,
  );

  useEffect(() => {
    void (async () => {
      const eligible = await isEligibleForFirstTransactionFreeFee();
      setIsFirstTransactionFree(eligible);
    })();
  }, []);

  const submitWithdrawal = async (passcodeToSend?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setAlertConfig({ title: "", message: "" });
    try {
      const parsedSubmit = parseWithdrawalAmountInput(amount);
      if (!parsedSubmit.ok || parsedSubmit.value <= 0) {
        setAlertConfig({
          title: t("common.error"),
          message: t("withdraw.validation.invalidAmountFormat"),
        });
        setShowAlertModal(true);
        return;
      }
      const amountNum = parsedSubmit.value;
      const minGross = isAgentWithdrawal
        ? MIN_WITHDRAWAL_PHP
        : MIN_WITHDRAWAL_AVAILABLE_BALANCE_PHP;
      if (amountNum < minGross) {
        setAlertConfig({
          title: t("common.error"),
          message: t("withdraw.validation.minAmount").replace(
            "{min}",
            minGross.toFixed(2),
          ),
        });
        setShowAlertModal(true);
        return;
      }
      const submitFee = isFirstTransactionFree
        ? 0
        : getEwalletTransactionFee(amountNum);
      if (amountNum <= submitFee) {
        setAlertConfig({
          title: t("common.error"),
          message: t("withdraw.validation.amountMustExceedFee").replace(
            "{fee}",
            submitFee.toFixed(2),
          ),
        });
        setShowAlertModal(true);
        return;
      }

      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setAlertConfig({
          title: t("common.error"),
          message: t("withdraw.errorLogin"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }
      const { success: walletSuccess, wallet } =
        await getOrCreateMainWallet(accessToken);
      if (!walletSuccess || !wallet?.id) {
        setAlertConfig({
          title: t("common.error"),
          message: t("withdraw.errorLoadWallet"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }
      const source =
        withdrawalType === "agent-withdrawal"
          ? "agent_commission"
          : "available_balance";
      const w = wallet as Record<string, unknown>;
      const rawSourceBal =
        source === "agent_commission" ? w.agentCommission : w.balance;
      const bal = parseFloat(String(rawSourceBal ?? "0"));
      if (Number.isNaN(bal)) {
        setAlertConfig({
          title: t("common.error"),
          message: t("withdraw.errorLoadWallet"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }
      if (bal < MIN_REMAINING_WALLET_BALANCE_PHP) {
        setAlertConfig({
          title: t("withdraw.minimumBalanceBlockedTitle"),
          message: t("withdraw.minimumBalanceWalletBelow"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }
      if (bal - amountNum < MIN_REMAINING_WALLET_BALANCE_PHP) {
        setAlertConfig({
          title: t("withdraw.minimumBalanceBlockedTitle"),
          message: t("withdraw.minimumBalanceAfterWithdraw"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }

      const offline = await isWithdrawalCombinationUnderMaintenance({
        source:
          withdrawalType === "agent-withdrawal"
            ? "agent-withdrawal"
            : "available-balance",
        method: "e_wallet",
      });
      if (offline) {
        setShowPasscodeModal(false);
        setShowMaintenanceModal(true);
        return;
      }

      const body: Record<string, string | undefined> = {
        walletId: wallet.id as string,
        amount: amountNum.toFixed(2),
        method: "e_wallet",
        source,
        email: email || undefined,
        walletType: walletType.toLowerCase() as "gcash" | "maya",
        accountNumber,
        accountName,
      };
      if (passcodeToSend && /^\d{4}$/.test(passcodeToSend)) {
        body.passcode = passcodeToSend;
      }
      const result = await submitWithdrawalRequest(accessToken, body);

      if (result.success) {
        if (isFirstTransactionFree) {
          await markFirstTransactionFeeWaived();
          setIsFirstTransactionFree(false);
        }
        setShowPasscodeModal(false);
        setPasscode("");

        const txId = (result.data as any)?.id || t("investment.pending");
        (navigation as any).navigate("depositReceipt", {
          transactionId: txId,
          // Receipt should reflect net amount after transaction fee.
          amount: String(netWithdrawalAmount),
          currency: "PHP",
          depositMethod: t("withdraw.ewallet"),
          type: "Withdrawal",
          successMessage: t("withdraw.successMessage"),
          date: new Date().toLocaleString(),
        });
      } else {
        setAlertConfig({
          title: t("common.error"),
          message: result.error || t("withdraw.errorSubmit"),
        });
        setShowAlertModal(true);
        if (passcodeToSend) setPasscode("");
      }
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      setAlertConfig({
        title: t("common.error"),
        message:
          t("deposit.unexpectedError") ||
          "An unexpected error occurred. Please try again.",
      });
      setShowAlertModal(true);
      if (passcodeToSend) setPasscode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = () => {
    // Backend requires a passcode for withdrawal requests.
    setShowPasscodeModal(true);
  };

  const handlePasscodeConfirm = () => {
    if (passcode.length !== 4) return;
    submitWithdrawal(passcode);
  };

  const formatAmount = (value: string) => {
    return parseFloat(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("withdraw.title")}</Text>

          <View style={styles.refreshButton} />
        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("withdraw.reviewConfirm")}</Text>
            <Text style={styles.subtitle}>{t("withdraw.details")}</Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.orangeHeader}>
              <Text style={styles.orangeHeaderText}>
                {t("withdraw.details")}
              </Text>
            </View>

            {/* Withdrawal Method */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {t("withdraw.withdrawalMethod")}
                </Text>
                <Text style={styles.detailValue}>{t("withdraw.ewallet")}</Text>
              </View>
            </View>

            {/* E-Wallet Type */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {t("withdraw.ewalletType")}
                </Text>
                <Text style={styles.detailValue}>
                  {walletType.charAt(0).toUpperCase() + walletType.slice(1)}
                </Text>
              </View>
            </View>

            {/* Wallet Account Number */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {t("withdraw.walletAccNumber")}
                </Text>
                <Text style={styles.detailValue}>{accountNumber}</Text>
              </View>
            </View>

            {/* Wallet Account Name */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {t("withdraw.walletAccName")}
                </Text>
                <Text style={styles.detailValue}>{accountName}</Text>
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t("withdraw.email")}</Text>
                <Text style={styles.detailValue}>{email}</Text>
              </View>
            </View>

            {/* Transaction Fee */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Transaction Fee</Text>
                <Text style={styles.detailValue}>
                  {isFirstTransactionFree
                    ? "First transaction fee waived (PHP 0.00)"
                    : `PHP ${transactionFee.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Withdrawal Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>{t("withdraw.amountLabel")}</Text>
            <View style={styles.amountBox}>
              <Text style={styles.amountValue}>
                ₱{" "}
                {netWithdrawalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <Text style={styles.feeNoteText}>
              {isFirstTransactionFree
                ? "First transaction fee waived. No e-wallet transaction fee applied."
                : `E-wallet transaction fee: PHP ${transactionFee.toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}.`}
            </Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.confirmGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting && !showPasscodeModal ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.confirmText}>
                    {t("withdraw.confirm")}
                  </Text>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Shared passcode modal */}
        <PasscodeModal
          visible={showPasscodeModal}
          passcode={passcode}
          title={t("withdraw.enterPasscode")}
          confirmLabel={t("withdraw.confirm")}
          cancelLabel={t("common.cancel")}
          loading={isSubmitting}
          onChangePasscode={setPasscode}
          onConfirm={handlePasscodeConfirm}
          onCancel={() => {
            setShowPasscodeModal(false);
            setPasscode("");
          }}
        />

        {/* Custom Alert Modal */}
        <ActivityModal
          visible={showAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowAlertModal(false)}
              >
                <Text style={styles.alertButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ActivityModal>

        <FeatureMaintenanceModal
          visible={showMaintenanceModal}
          onDismiss={() => {
            setShowMaintenanceModal(false);
            navigation.goBack();
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingVertical: 24,
    paddingHorizontal: 60,
    backgroundColor: "#FFFFFF",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#E25A17",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  orangeHeader: {
    backgroundColor: "#E25A17",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  orangeHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailRow: {
    position: "relative",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#E25A17",
  },
  detailContent: {
    paddingLeft: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: "#999",
  },
  amountCard: {
    backgroundColor: "#E25A17",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  amountBox: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  feeNoteText: {
    marginTop: 10,
    fontSize: 12,
    color: "#FF3B30",
    textAlign: "center",
  },
  confirmButton: {
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 20,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  passcodeModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  /* Transparent overlay - walang dark background, outer glow na lang sa modal */
  passcodeOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.95,
  },
  alertButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
  /* Standard passcode modal: may background, outer glow (palit sa dark overlay) */
  passcodeModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 340,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  passcodeModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  passcodeInput: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E25A17",
    borderRadius: 8,
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    writingDirection: "ltr",
    // NOTE: secureTextEntry + letterSpacing can render as blank spaces on Android.
    letterSpacing: 0,
    marginBottom: 20,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    color: "#111827",
  },
  passcodeIndicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: -8,
    marginBottom: 18,
  },
  passcodeIndicatorBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  passcodeIndicatorBoxFilled: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF7ED",
  },
  passcodeIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E25A17",
  },
  passcodeModalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  passcodeModalButton: {
    minWidth: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  passcodeModalButtonCancel: {
    backgroundColor: "#E8E8E8",
    paddingVertical: 12,
    alignItems: "center",
  },
  passcodeModalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  passcodeModalButtonConfirm: {
    minWidth: 120,
    minHeight: 52,
  },
  passcodeModalButtonGradient: {
    flexDirection: "row",
    minWidth: 120,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  passcodeModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
