import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { submitEwalletApplication } from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";
import {
    formatAmountWithCommas,
    unformatNumberString,
} from "../../../utils/numberFormat";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";

const SOURCE_OF_FUND_OPTIONS = ["Employment", "Business", "Investment", "Inheritance", "Pension", "Other"];
const SOURCE_OF_FUND_KEY: Record<string, string> = {
  Employment: "banking.sourceEmployment",
  Business: "banking.sourceBusiness",
  Investment: "banking.sourceInvestment",
  Inheritance: "banking.sourceInheritance",
  Pension: "banking.sourcePension",
  Other: "banking.sourceOther",
};
const CURRENCY_OPTIONS = ["PHP", "USD", "EUR"];
const CURRENCY_KEY: Record<string, string> = {
  PHP: "banking.currencyPHP",
  USD: "banking.currencyUSD",
  EUR: "banking.currencyEUR",
};

export default function EwalletFinancialInfo() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "EwalletFinancialInfo">
    >();
  const route =
    useRoute<RouteProp<RootStackParamList, "EwalletFinancialInfo">>();
  const { t } = useLanguage();
  const selectedProvider = route.params?.selectedProvider ?? "";

  const [sourceOfFund, setSourceOfFund] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [grossMonthlyIncomeCurrency, setGrossMonthlyIncomeCurrency] = useState("");
  const [errors, setErrors] = useState<{ source?: string; income?: string; currency?: string }>({});
  const [showSourceOfFundModal, setShowSourceOfFundModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const [loading, setLoading] = useState(false);

  const currentStep = 5;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTopBackPress = () => {
    setShowExitConfirmModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    navigation.navigate("Main");
  };

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    if (!sourceOfFund.trim()) newErrors.source = t("ewallet.sourceOfFundRequired");
    if (!grossMonthlyIncome.trim()) {
      newErrors.income = t("ewallet.incomeRequired");
    } else {
      const n = parseFloat(unformatNumberString(grossMonthlyIncome));
      if (Number.isNaN(n) || n <= 0) {
        newErrors.income = t("ewallet.incomeInvalid");
      }
    }
    if (!grossMonthlyIncomeCurrency) newErrors.currency = t("ewallet.currencyRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        Alert.alert(t("common.error"), t("common.authTokenNotFound"));
        setLoading(false);
        return;
      }

      const payload = {
        provider: selectedProvider,
        sourceOfFund: sourceOfFund,
        grossMonthlyIncome: unformatNumberString(grossMonthlyIncome),
        grossMonthlyIncomeCurrency: grossMonthlyIncomeCurrency,
        personalInfo: route.params?.applicationData?.personalInfo,
        contactInfo: route.params?.applicationData?.contactInfo,
        addressInfo: route.params?.applicationData?.addressInfo,
      };

      const result = await submitEwalletApplication(token, payload);

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        Alert.alert(t("common.error"), result.error || t("travel.submitFailed"));
      }
    } catch (error: any) {
      console.error("[EwalletFinancialinfo] Submit error:", error);
      Alert.alert(t("common.error"), error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Top: Back arrow + Header card */}
          <View style={styles.topSection}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleTopBackPress}
            >
              <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
            </TouchableOpacity>

            <View style={styles.headerCard}>
              <LinearGradient
                colors={ORANGE_GRADIENT}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.headerIconWrapper}>
                  <MaterialCommunityIcons
                    name="wallet"
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.headerTitle}>{t("ewallet.headerTitle")}</Text>
                <Text style={styles.headerSubtitle}>
                  {t("ewallet.headerSubtitle")}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Progress Stepper - 5 steps, Steps 1-4 complete, Step 5 active */}
          <View style={styles.progressContainer}>
            <View style={styles.stepRow}>
              {[1, 2, 3, 4, 5].map((step) => (
                <React.Fragment key={step}>
                  <View
                    style={[
                      styles.stepCircle,
                      step < currentStep && styles.stepCircleComplete,
                      step === currentStep && styles.stepCircleActive,
                    ]}
                  >
                    {step < currentStep ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          step === currentStep && styles.stepNumberActive,
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                  {step < 5 && (
                    <View
                      style={[
                        styles.stepLine,
                        step < currentStep && styles.stepLineComplete,
                      ]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Main Content Card - Financial Information */}
            <View style={styles.contentCard}>
              <View style={styles.stepIconWrapper}>
                <MaterialCommunityIcons
                  name="piggy-bank-outline"
                  size={28}
                  color={THEME_COLOR}
                />
              </View>
              <Text style={styles.contentTitle}>{t("banking.financialInfo")}</Text>
              <Text style={styles.contentDescription}>
                {t("banking.financialInfoDesc")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("banking.sourceOfFund")}<Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dropdown, errors.source && styles.inputError]}
                  onPress={() => setShowSourceOfFundModal(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !sourceOfFund && styles.dropdownPlaceholder,
                    ]}
                  >
                    {sourceOfFund ? t(SOURCE_OF_FUND_KEY[sourceOfFund]) : t("banking.selectSourceOfFund")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
                {errors.source && <Text style={styles.errorText}>{errors.source}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("banking.grossMonthlyIncome")}<Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.incomeRow}>
                  <TouchableOpacity
                    style={[styles.dropdown, styles.currencyDropdown, errors.currency && styles.inputError]}
                    onPress={() => setShowCurrencyModal(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !grossMonthlyIncomeCurrency && styles.dropdownPlaceholder,
                      ]}
                    >
                      {grossMonthlyIncomeCurrency ? t(CURRENCY_KEY[grossMonthlyIncomeCurrency]) : t("banking.selectCurrency")}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.amountInput, errors.income && styles.inputError]}
                    placeholder="0"
                    placeholderTextColor="#9E9E9E"
                    value={grossMonthlyIncome}
                    onChangeText={(text) => {
                      setGrossMonthlyIncome(formatAmountWithCommas(text));
                      if (errors.income) setErrors({ ...errors, income: undefined });
                    }}
                    keyboardType="numeric"
                  />
                </View>
                {errors.currency && <Text style={styles.errorText}>{errors.currency}</Text>}
                {errors.income && <Text style={styles.errorText}>{errors.income}</Text>}
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <View style={styles.infoIconCircle}>
                <Text style={styles.infoIconText}>i</Text>
              </View>
              <Text style={styles.infoText}>
                {t("ewallet.infoNote")}
              </Text>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Back & Submit Buttons */}
          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButtonFooter}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>{t("ewallet.back")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={ORANGE_GRADIENT}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>{t("ewallet.submit")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Source of Fund Modal */}
      <Modal
        visible={showSourceOfFundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourceOfFundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectSourceOfFund")}</Text>
              <TouchableOpacity onPress={() => setShowSourceOfFundModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {SOURCE_OF_FUND_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    sourceOfFund === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setSourceOfFund(opt);
                    if (errors.source) setErrors({ ...errors, source: undefined });
                    setShowSourceOfFundModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(SOURCE_OF_FUND_KEY[opt])}</Text>
                  {sourceOfFund === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectCurrency")}</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {CURRENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    grossMonthlyIncomeCurrency === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setGrossMonthlyIncomeCurrency(opt);
                    if (errors.currency) setErrors({ ...errors, currency: undefined });
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(CURRENCY_KEY[opt])}</Text>
                  {grossMonthlyIncomeCurrency === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.reset({
            index: 0,
            routes: [{ name: "Main" as never }],
          });
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.successModalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>
                {t("common.success") || "Success"}
              </Text>
              <Text style={styles.successMessage}>
                {"Your application has been submitted successfully."}
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Main" as never }],
                  });
                }}
              >
                <Text style={styles.successButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Exit confirmation modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showExitConfirmModal}
        onRequestClose={() => setShowExitConfirmModal(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContainer}>
            <View style={styles.exitModalIconWrap}>
              <Ionicons name="warning-outline" size={28} color={THEME_COLOR} />
            </View>
            <Text style={styles.exitModalTitle}>{t("common.cancelApplication")}</Text>
            <Text style={styles.exitModalMessage}>
              {t("ewallet.cancelApplicationMessage")}
            </Text>
            <View style={styles.exitModalButtons}>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.exitModalKeepEditingButton]}
                onPress={() => setShowExitConfirmModal(false)}
              >
                <Text
                  style={[
                    styles.exitModalButtonText,
                    styles.exitModalKeepEditingButtonText,
                  ]}
                >
                  {t("common.keepEditing")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.exitModalDiscardButton]}
                onPress={handleConfirmExit}
              >
                <Text
                  style={[styles.exitModalButtonText, styles.exitModalDiscardButtonText]}
                >
                  {t("common.discardExit")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  keyboardView: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    marginBottom: 12,
    padding: 4,
  },
  headerCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
    borderWidth: 2,
    borderColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleComplete: {
    backgroundColor: GREEN_COMPLETE,
    borderColor: GREEN_COMPLETE,
  },
  stepCircleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#9E9E9E",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9E9E9E",
  },
  stepNumberActive: {
    color: "#757575",
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  stepLineComplete: {
    backgroundColor: GREEN_COMPLETE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stepIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  contentDescription: {
    fontSize: 14,
    color: "#9E9E9E",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  required: {
    color: THEME_COLOR,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
  },
  incomeRow: {
    flexDirection: "row",
    gap: 12,
  },
  currencyDropdown: {
    flex: 0,
    minWidth: 100,
  },
  amountInput: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  optionRowSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 235, 205, 0.9)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.35)",
  },
  infoIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#333333",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    backgroundColor: "#FFFFFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonFooter: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  submitButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successModalGradient: {
    padding: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.95,
  },
  successButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  exitModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ECEFF4",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  exitModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF7E9",
    borderWidth: 1,
    borderColor: "#FFE2AF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  exitModalTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  exitModalMessage: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  exitModalButtons: {
    width: "100%",
  },
  exitModalButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  exitModalDiscardButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3C3B1",
  },
  exitModalKeepEditingButton: {
    backgroundColor: THEME_COLOR,
    marginBottom: 10,
  },
  exitModalButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  exitModalDiscardButtonText: {
    color: "#D9480F",
  },
  exitModalKeepEditingButtonText: {
    color: "#FFFFFF",
  },
});
