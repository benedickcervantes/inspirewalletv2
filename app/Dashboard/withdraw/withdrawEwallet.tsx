import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOrCreateMainWallet } from "../../../configs/api";
import { auth, firestore } from "../../../configs/firebase";
import { useLanguage } from "../../../context/LanguageContext";
import {
  formatAmountWithCommas,
  unformatNumberString,
} from "../../../utils/numberFormat";
import {
  MIN_REMAINING_WALLET_BALANCE_PHP,
  MIN_WITHDRAWAL_PHP,
  parseWithdrawalAmountInput,
} from "../../../utils/withdrawalAmount";
import ActivityModal from '../../components/ActivityModal';
import FeatureMaintenanceModal from "../../components/FeatureMaintenanceModal";
import { isWithdrawalCombinationUnderMaintenance } from "../../../lib/maintenance";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const isValidEmail = (email: string) =>
  EMAIL_REGEX.test((email || "").trim().toLowerCase());

const filterEmailInput = (text: string) =>
  text.replace(/[^A-Za-z0-9.@\-_]/g, "");

const filterNameInput = (text: string) => text.replace(/[^A-Za-zÑñ ]/g, "");

const filterPhoneInput = (text: string) => text.replace(/[^0-9]/g, "");
const PH_PHONE_PREFIX = "+63";

const capitalizeWords = (text: string) =>
  text.replace(/\b\w/g, (char) => char.toUpperCase());

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

export default function EWalletWithdrawal() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userData, setUserData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [availableBalance, setAvailableBalance] = useState(0);
  const [agentCommission, setAgentCommission] = useState(0);
  const [minBalanceBlockReason, setMinBalanceBlockReason] = useState<
    "below_min" | "remaining" | null
  >(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(false);

  const withdrawalType = (route.params as { type?: string })?.type || "available-balance";
  const isAgentWithdrawal = withdrawalType === "agent-withdrawal";
  const displayBalance = isAgentWithdrawal ? agentCommission : availableBalance;
  const minBalanceModalBalanceStr = displayBalance.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const parsedWithdrawalAmount = parseFloat(
    unformatNumberString(withdrawalAmount).trim(),
  );
  const transactionFee = getEwalletTransactionFee(parsedWithdrawalAmount);
  const hasValidAmount =
    !Number.isNaN(parsedWithdrawalAmount) && parsedWithdrawalAmount > 0;

  const walletTypes = [
    {
      id: "gcash",
      name: "GCash",
      icon: "cellphone" as const,
      useImage: true,
      image: require("../../../assets/images/gcashlogo.png"),
    },
    {
      id: "maya",
      name: "Maya",
      icon: "wallet" as const,
      useImage: true,
      image: require("../../../assets/images/maya2.0.png"),
    },
  ];

  const fetchUserData = useCallback(async () => {
    if (!auth || !firestore) return;
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as Record<string, unknown> & {
            email?: string;
          };
          setUserData(data);
          setEmailAddress(data.email || "");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) return;
        const { success, wallet } = await getOrCreateMainWallet(accessToken);
        if (success && wallet) {
          if (wallet.balance != null) {
            const bal = parseFloat(String(wallet.balance));
            setAvailableBalance(Number.isNaN(bal) ? 0 : bal);
          }
          if (wallet.agentCommission != null) {
            const commission = parseFloat(String(wallet.agentCommission));
            setAgentCommission(Number.isNaN(commission) ? 0 : commission);
          }
        }
      } catch (error) {
        console.error(
          "Error fetching available balance for e-wallet withdrawal",
          error,
        );
      }
    };

    fetchWalletBalance();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const offline = await isWithdrawalCombinationUnderMaintenance({
          source: isAgentWithdrawal ? "agent-withdrawal" : "available-balance",
          method: "e_wallet",
        });
        if (!cancelled) {
          setShowMaintenanceModal(offline);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAgentWithdrawal]),
  );

  const handleContinue = async () => {
    const newErrors: Record<string, string> = {};
    const trimmedAccountNumber = accountNumber.trim();
    const prefixedAccountNumber = `${PH_PHONE_PREFIX}${trimmedAccountNumber}`;

    if (!selectedWallet) {
      newErrors.selectedWallet = t("withdraw.validation.walletType");
    }

    if (!trimmedAccountNumber)
      newErrors.accountNumber = t("withdraw.validation.walletAccNumber");
    else if (trimmedAccountNumber.length !== 10)
      newErrors.accountNumber = t("withdraw.mobileInvalid");
    else if (!trimmedAccountNumber.startsWith("9"))
      newErrors.accountNumber = t(
        "withdraw.validation.walletNumberMustStartWith9",
      );
    if (!accountName.trim())
      newErrors.accountName = t("withdraw.validation.walletAccName");

    const parsed = parseWithdrawalAmountInput(withdrawalAmount);
    if (!parsed.ok || parsed.value <= 0) {
      newErrors.withdrawalAmount = parsed.value <= 0 && parsed.ok
        ? t("withdraw.validation.invalidAmount")
        : t("withdraw.validation.invalidAmountFormat");
    } else {
      const amountNum = parsed.value;
      if (amountNum < MIN_WITHDRAWAL_PHP) {
        newErrors.withdrawalAmount = t("withdraw.validation.minAmount").replace(
          "{min}",
          MIN_WITHDRAWAL_PHP.toFixed(2),
        );
      } else {
        const feeForAmount = getEwalletTransactionFee(amountNum);
        if (amountNum <= feeForAmount) {
          newErrors.withdrawalAmount = t(
            "withdraw.validation.amountMustExceedFee",
          ).replace("{fee}", feeForAmount.toFixed(2));
        } else {
          const walletBalance = isAgentWithdrawal
            ? agentCommission
            : displayBalance ||
              (userData?.availBalanceAmount as number) ||
              0;
          if (amountNum > walletBalance) {
            newErrors.withdrawalAmount = t(
              "withdraw.validation.insufficient",
            ).replace("{balance}", walletBalance.toLocaleString());
          }
        }
      }
    }

    const email = emailAddress.trim();
    if (!email) {
      newErrors.emailAddress = t("withdraw.validation.email");
    } else if (!isValidEmail(email)) {
      newErrors.emailAddress = t("withdraw.validation.invalidEmail");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const currentBalance = isAgentWithdrawal ? agentCommission : availableBalance;
    const parsedAmount = parseWithdrawalAmountInput(withdrawalAmount);
    const amountNum = parsedAmount.ok ? parsedAmount.value : 0;

    if (currentBalance < MIN_REMAINING_WALLET_BALANCE_PHP) {
      setMinBalanceBlockReason("below_min");
      return;
    }

    const remainingBalance = currentBalance - amountNum;
    if (remainingBalance < MIN_REMAINING_WALLET_BALANCE_PHP) {
      setMinBalanceBlockReason("remaining");
      return;
    }

    setCheckingMaintenance(true);
    try {
      const offline = await isWithdrawalCombinationUnderMaintenance({
        source: isAgentWithdrawal ? "agent-withdrawal" : "available-balance",
        method: "e_wallet",
      });
      if (offline) {
        setShowMaintenanceModal(true);
        return;
      }
    } finally {
      setCheckingMaintenance(false);
    }

    const { value: confirmedAmount } = parsedAmount;
    navigation.navigate("WithdrawEwalletConfirm", {
      method: "e-wallet",
      walletType: selectedWallet,
      accountNumber: prefixedAccountNumber,
      accountName,
      amount: confirmedAmount.toFixed(2),
      email: emailAddress,
      type: withdrawalType,
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
            <View style={[styles.stepCircle, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepCircle} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {t("withdraw.walletInformation")}
              </Text>
              <Text style={styles.subtitle}>
                {t(
                  isAgentWithdrawal
                    ? "withdraw.fromAgentWallet"
                    : "withdraw.fromAvailableBalance",
                )}
              </Text>
            </View>

            {/* Select E-Wallet Type */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {t("withdraw.selectEwalletType")}
              </Text>

              <View style={styles.walletOptionsContainer}>
                {walletTypes.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletOption,
                      selectedWallet === wallet.id &&
                        styles.walletOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedWallet(wallet.id);
                      if (errors.selectedWallet) {
                        setErrors((prev) => {
                          const { selectedWallet, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.walletIconBox}>
                      {wallet.useImage && wallet.image ? (
                        <Image
                          source={wallet.image}
                          style={
                            wallet.id === "maya"
                              ? styles.walletIconMaya
                              : styles.walletIcon
                          }
                          resizeMode="contain"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={wallet.icon}
                          size={32}
                          color="#E25A17"
                        />
                      )}
                    </View>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.selectedWallet && (
                <Text style={styles.errorText}>{errors.selectedWallet}</Text>
              )}
            </View>

            {/* Wallet Account Number */}
            <View style={styles.inputContainer}>
              <View style={styles.labelWithIcon}>
                <MaterialCommunityIcons
                  name="wallet"
                  size={20}
                  color="#E25A17"
                />
                <Text style={styles.inputLabel}>
                  {t("withdraw.walletAccNumber")}
                </Text>
              </View>
              <View
                style={[
                  styles.phoneInputContainer,
                  errors.accountNumber && styles.inputError,
                ]}
              >
                <Text style={styles.phonePrefix}>{PH_PHONE_PREFIX}</Text>
                <TextInput
                  style={styles.phoneInputField}
                  placeholder="9XXXXXXXXX"
                  placeholderTextColor="#CCC"
                  value={accountNumber}
                  onChangeText={(text) => {
                    setAccountNumber(filterPhoneInput(text).slice(0, 10));
                    if (errors.accountNumber) {
                      setErrors((prev) => {
                        const { accountNumber, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              {errors.accountNumber && (
                <Text style={styles.errorText}>{errors.accountNumber}</Text>
              )}
            </View>

            {/* Wallet Account Name */}
            <View style={styles.inputContainer}>
              <View style={styles.labelWithIcon}>
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color="#E25A17"
                />
                <Text style={styles.inputLabel}>
                  {t("withdraw.walletAccName")}
                </Text>
              </View>
              <TextInput
                style={[styles.input, errors.accountName && styles.inputError]}
                placeholder={t("withdraw.placeholder.walletAccName")}
                placeholderTextColor="#CCC"
                value={accountName}
                onChangeText={(text) => {
                  setAccountName(capitalizeWords(filterNameInput(text)));
                  if (errors.accountName) {
                    setErrors((prev) => {
                      const { accountName, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              />
              {errors.accountName && (
                <Text style={styles.errorText}>{errors.accountName}</Text>
              )}
            </View>

            {/* Withdrawal Amount */}
            <View style={styles.inputContainer}>
              <View style={styles.labelWithIcon}>
                <MaterialCommunityIcons name="cash" size={20} color="#E25A17" />
                <Text style={styles.inputLabel}>
                  {t("withdraw.amountLabel")}
                </Text>
              </View>
              <View
                style={[
                  styles.amountInputContainer,
                  errors.withdrawalAmount && styles.inputError,
                ]}
              >
                <Text style={styles.currencySymbol}>₱</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#CCC"
                  value={withdrawalAmount}
                  onChangeText={(text) => {
                    setWithdrawalAmount(formatAmountWithCommas(text));
                    if (errors.withdrawalAmount) {
                      setErrors((prev) => {
                        const { withdrawalAmount, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>
              {errors.withdrawalAmount && (
                <Text style={styles.errorText}>{errors.withdrawalAmount}</Text>
              )}
              {hasValidAmount && (
                <Text style={styles.feeNoteText}>
                  {`E-wallet transaction fee: PHP ${transactionFee.toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}.`}
                </Text>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.inputContainer}>
              <View style={styles.labelWithIcon}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color="#E25A17"
                />
                <Text style={styles.inputLabel}>{t("withdraw.email")}</Text>
              </View>
              <TextInput
                style={[styles.input, errors.emailAddress && styles.inputError]}
                placeholder={t("withdraw.placeholder.email")}
                placeholderTextColor="#CCC"
                value={emailAddress}
                onChangeText={(text) => {
                  setEmailAddress(filterEmailInput(text));
                  if (errors.emailAddress) {
                    setErrors((prev) => {
                      const { emailAddress, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.emailAddress && (
                <Text style={styles.errorText}>{errors.emailAddress}</Text>
              )}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => void handleContinue()}
              disabled={checkingMaintenance}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.continueGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {checkingMaintenance ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.continueText}>
                      {t("withdraw.continue")}
                    </Text>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Minimum balance: same alert pattern as withdraw confirm / withdraw type */}
        <ActivityModal
          visible={minBalanceBlockReason !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setMinBalanceBlockReason(null)}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>
                {t("withdraw.minimumBalanceBlockedTitle")}
              </Text>
              <Text style={styles.alertMessage}>
                {(minBalanceBlockReason === "below_min"
                  ? t("withdraw.minimumBalanceWalletBelow")
                  : t("withdraw.minimumBalanceAfterWithdraw")) +
                  "\n\n" +
                  t("withdraw.minimumBalanceModalDetails", {
                    min: MIN_REMAINING_WALLET_BALANCE_PHP.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    ),
                    balance: minBalanceModalBalanceStr,
                  })}
              </Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setMinBalanceBlockReason(null)}
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
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
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  walletOptionsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  walletOption: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  walletOptionSelected: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF5F0",
  },
  walletIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  walletIcon: {
    width: 40,
    height: 40,
  },
  walletIconMaya: {
    width: 70,
    height: 70,
  },
  walletName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  inputContainer: {
    marginBottom: 24,
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 14,
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E25A17",
    marginRight: 10,
  },
  phoneInputField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: "#333",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 0,
  },
  feeNoteText: {
    marginTop: 8,
    fontSize: 12,
    color: "#FF3B30",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currencySymbol: {
    fontSize: 18,
    color: "#E25A17",
    fontWeight: "600",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  continueButton: {
    marginTop: 8,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  continueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 40,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
});
