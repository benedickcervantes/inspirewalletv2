import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOrCreateMainWallet } from "../../../configs/api";
import { auth, firestore } from "../../../configs/firebase";
import { useLanguage } from "../../../context/LanguageContext";
import ActivityModal from '../../components/ActivityModal';
import {
    formatAmountWithCommas,
    unformatNumberString,
} from "../../../utils/numberFormat";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const isValidEmail = (email: string) =>
  EMAIL_REGEX.test((email || "").trim().toLowerCase());

const filterEmailInput = (text: string) =>
  text.replace(/[^A-Za-z0-9.@\-_]/g, "");

const filterNameInput = (text: string) => text.replace(/[^A-Za-zÑñ ]/g, "");

const filterPhoneInput = (text: string) => text.replace(/[^0-9]/g, "");

const BANK_ACCOUNT_MAX_DIGITS = 16;

const formatBankAccountNumber = (digits: string) =>
  digits.replace(/(.{4})/g, "$1 ").trim();

const capitalizeWords = (text: string) =>
  text.replace(/\b\w/g, (char) => char.toUpperCase());

const OTHER_BANK_OPTION = "Others";

const BANK_OPTIONS = [
  "UNIONBANK",
  "BDO",
  "BPI",
  "SECURITY BANK",
  "METROBANK",
  OTHER_BANK_OPTION,
];

const BANK_FEE_THRESHOLD = 100000;

const getLocalBankTransactionFee = (amount: number, isUnionBank: boolean) => {
  if (Number.isNaN(amount) || amount <= 0) return 0;
  if (isUnionBank) return amount > BANK_FEE_THRESHOLD ? 250 : 0;
  return amount > BANK_FEE_THRESHOLD ? 150 : 50;
};

export default function BankWithdrawal() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [isOtherBank, setIsOtherBank] = useState(false);
  const [showBankOptionsModal, setShowBankOptionsModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userData, setUserData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [availableBalance, setAvailableBalance] = useState(0);
  const [agentCommission, setAgentCommission] = useState(0);
  
  const withdrawalType = (route.params as { type?: string })?.type || "available-balance";
  const isAgentWithdrawal = withdrawalType === "agent-withdrawal";
  const displayBalance = isAgentWithdrawal ? agentCommission : availableBalance;
  
  const normalizedBankName = bankName.trim().toUpperCase();
  const hasSelectedBank = normalizedBankName.length > 0;
  const isUnionBank = normalizedBankName === "UNIONBANK";
  const parsedWithdrawalAmount = parseFloat(
    unformatNumberString(withdrawalAmount).trim(),
  );
  const transactionFee = getLocalBankTransactionFee(
    parsedWithdrawalAmount,
    isUnionBank,
  );
  const hasValidAmount =
    !Number.isNaN(parsedWithdrawalAmount) && parsedWithdrawalAmount > 0;

  const clearBankNameError = () => {
    if (errors.bankName) {
      setErrors((prev) => {
        const { bankName, ...rest } = prev;
        return rest;
      });
    }
  };

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
          "Error fetching available balance for bank withdrawal",
          error,
        );
      }
    };

    fetchWalletBalance();
  }, []);

  const handleContinue = () => {
    const newErrors: Record<string, string> = {};
    const accountNumberDigits = filterPhoneInput(accountNumber);

    if (!accountNumberDigits)
      newErrors.accountNumber = t("withdraw.validation.accNumber");
    if (!accountHolderName.trim())
      newErrors.accountHolderName = t("withdraw.validation.accName");
    if (!bankName.trim())
      newErrors.bankName = t("withdraw.validation.bankName");
    if (!branchName.trim())
      newErrors.branchName = t("withdraw.validation.branchName");

    const amountStr = unformatNumberString(withdrawalAmount).trim();
    if (!amountStr) {
      newErrors.withdrawalAmount = t("withdraw.validation.amount");
    } else {
      const amountNum = parseFloat(amountStr);
      if (amountNum <= 0) {
        newErrors.withdrawalAmount = t("withdraw.validation.invalidAmount");
      } else {
        const walletBalance =
          displayBalance || (userData?.availBalanceAmount as number) || 0;
        if (amountNum > walletBalance) {
          newErrors.withdrawalAmount = t(
            "withdraw.validation.insufficient",
          ).replace("{balance}", walletBalance.toLocaleString());
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

    // Navigate to confirm screen with data
    navigation.navigate("WithdrawLocalBConfirm", {
      method: "local-bank",
      accountNumber: accountNumberDigits,
      accountHolderName,
      bankName,
      branchName,
      amount: unformatNumberString(withdrawalAmount),
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
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
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
                {t("dashboard.availableBalance")}
              </Text>
              <Text style={styles.subtitle}>
                {t("withdraw.fromAvailableBalance")}
              </Text>
            </View>

            {/* Withdrawal Amount Card */}
            <View style={styles.formCard}>
              <View style={styles.leftBorder} />

              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t("withdraw.details")}</Text>
                <Text style={styles.cardSubtitle}>
                  {t("withdraw.detailsSubtitle")}
                </Text>
              </View>

              {/* Withdrawal Amount */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithIcon}>
                  <MaterialCommunityIcons
                    name="cash"
                    size={18}
                    color="#E25A17"
                  />
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
                  <Text style={styles.errorText}>
                    {errors.withdrawalAmount}
                  </Text>
                )}
              </View>

              {/* Bank Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("withdraw.bankName")}</Text>
                {!isOtherBank ? (
                  <TouchableOpacity
                    style={[
                      styles.dropdownSelector,
                      errors.bankName && styles.inputError,
                    ]}
                    onPress={() => {
                      setShowBankOptionsModal(true);
                      clearBankNameError();
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !selectedBank && styles.dropdownPlaceholder,
                      ]}
                    >
                      {selectedBank || t("withdraw.placeholder.bankName")}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#999" />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.input, errors.bankName && styles.inputError]}
                    placeholder={t("withdraw.placeholder.bankName")}
                    placeholderTextColor="#CCC"
                    value={bankName}
                    onChangeText={(text) => {
                      setBankName(capitalizeWords(text));
                      clearBankNameError();
                    }}
                  />
                )}

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    const nextIsOther = !isOtherBank;
                    setIsOtherBank(nextIsOther);
                    setShowBankOptionsModal(false);
                    if (nextIsOther) {
                      setSelectedBank("");
                      setBankName("");
                    } else {
                      setBankName("");
                    }
                    clearBankNameError();
                  }}
                >
                  <Ionicons
                    name={isOtherBank ? "checkbox" : "square-outline"}
                    size={20}
                    color={isOtherBank ? "#E25A17" : "#999"}
                  />
                  <Text style={styles.checkboxLabel}>Others</Text>
                </TouchableOpacity>

                {hasSelectedBank && hasValidAmount && (
                  <Text
                    style={[
                      styles.processingFeeNote,
                      transactionFee === 0
                        ? styles.freeFeeText
                        : styles.paidFeeText,
                    ]}
                  >
                    {transactionFee === 0
                      ? "UNIONBANK transaction is free."
                      : `A processing fee of PHP ${transactionFee.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} applies for this bank.`}
                  </Text>
                )}

                {errors.bankName && (
                  <Text style={styles.errorText}>{errors.bankName}</Text>
                )}
              </View>
            </View>

            {/* Banking Information Card */}
            <View style={styles.formCard}>
              <View style={styles.leftBorder} />

              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t("withdraw.bankInfo")}</Text>
                <Text style={styles.cardSubtitle}>
                  {t("withdraw.bankInfoSubtitle")}
                </Text>
              </View>

              {/* Bank Account Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("withdraw.accNumber")}</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.accountNumber && styles.inputError,
                  ]}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#CCC"
                  value={accountNumber}
                  onChangeText={(text) => {
                    const digitsOnly = filterPhoneInput(text).slice(
                      0,
                      BANK_ACCOUNT_MAX_DIGITS,
                    );
                    setAccountNumber(formatBankAccountNumber(digitsOnly));
                    if (errors.accountNumber) {
                      setErrors((prev) => {
                        const { accountNumber, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={19}
                />
                {errors.accountNumber && (
                  <Text style={styles.errorText}>{errors.accountNumber}</Text>
                )}
              </View>

              {/* Account Holder Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("withdraw.accHolder")}</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.accountHolderName && styles.inputError,
                  ]}
                  placeholder={t("withdraw.placeholder.accHolder")}
                  placeholderTextColor="#CCC"
                  value={accountHolderName}
                  onChangeText={(text) => {
                    setAccountHolderName(
                      capitalizeWords(filterNameInput(text)),
                    );
                    if (errors.accountHolderName) {
                      setErrors((prev) => {
                        const { accountHolderName, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
                {errors.accountHolderName && (
                  <Text style={styles.errorText}>
                    {errors.accountHolderName}
                  </Text>
                )}
              </View>

              {/* Branch Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("withdraw.branchName")}
                </Text>
                <TextInput
                  style={[styles.input, errors.branchName && styles.inputError]}
                  placeholder={t("withdraw.placeholder.branchName")}
                  placeholderTextColor="#CCC"
                  value={branchName}
                  onChangeText={(text) => {
                    setBranchName(capitalizeWords(text));
                    if (errors.branchName) {
                      setErrors((prev) => {
                        const { branchName, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
                {errors.branchName && (
                  <Text style={styles.errorText}>{errors.branchName}</Text>
                )}
              </View>

              {/* Email Address */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithIcon}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={18}
                    color="#E25A17"
                  />
                  <Text style={styles.inputLabel}>{t("withdraw.email")}</Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    errors.emailAddress && styles.inputError,
                  ]}
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
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.continueGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueText}>
                  {t("withdraw.continue")}
                </Text>
                <Ionicons name="play" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>

          <ActivityModal
            visible={showBankOptionsModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBankOptionsModal(false)}
          >
            <View style={styles.bankModalOverlay}>
              <View style={styles.bankModalContainer}>
                {BANK_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.bankOptionRow}
                    onPress={() => {
                      if (option === OTHER_BANK_OPTION) {
                        setSelectedBank("");
                        setBankName("");
                        setIsOtherBank(true);
                      } else {
                        setSelectedBank(option);
                        setBankName(option);
                        setIsOtherBank(false);
                      }
                      setShowBankOptionsModal(false);
                      clearBankNameError();
                    }}
                  >
                    <Text style={styles.bankOptionText}>{option}</Text>
                    {(selectedBank === option ||
                      (option === OTHER_BANK_OPTION && isOtherBank)) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#E25A17"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ActivityModal>
        </KeyboardAvoidingView>
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
  formCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#E25A17",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  detailsFeeText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  dropdownPlaceholder: {
    color: "#CCC",
  },
  checkboxRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  processingFeeNote: {
    marginTop: 8,
    marginLeft: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  freeFeeText: {
    color: "#10B981",
  },
  paidFeeText: {
    color: "#FF3B30",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
  bankModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  bankModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 130,
  },
  bankOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bankOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
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
});
