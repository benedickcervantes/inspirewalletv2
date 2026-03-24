import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";
import { formatAmountWithCommas } from "../../../utils/numberFormat";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";

const filterIncomeInput = (text: string) => formatAmountWithCommas(text);

const SOURCE_OF_FUND_OPTIONS = [
  "Employment",
  "Business",
  "Investment",
  "Inheritance",
  "Pension",
  "Other",
];
const SOURCE_OF_FUND_KEY: Record<string, string> = {
  Employment: "banking.sourceEmployment",
  Business: "banking.sourceBusiness",
  Investment: "banking.sourceInvestment",
  Inheritance: "banking.sourceInheritance",
  Pension: "banking.sourcePension",
  Other: "banking.sourceOther",
};
const CURRENCY_OPTIONS = ["PHP", "USD", "EUR", "KRW"];
const CURRENCY_KEY: Record<string, string> = {
  PHP: "banking.currencyPHP",
  USD: "banking.currencyUSD",
  EUR: "banking.currencyEUR",
  KRW: "banking.currencyKRW",
};

export default function BankingFinancialInfo() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "BankingFinancialInfo">
    >();
  const route =
    useRoute<RouteProp<RootStackParamList, "BankingFinancialInfo">>();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isXSScreen = width <= 320;
  const isSmallScreen = width < 375;
  const selectedBank = route.params?.selectedBank ?? "UnionBank";
  const applicationData = route.params?.applicationData ?? {};

  const [sourceOfFund, setSourceOfFund] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [grossMonthlyIncomeCurrency, setGrossMonthlyIncomeCurrency] =
    useState("");
  const [showSourceOfFundModal, setShowSourceOfFundModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

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

  const handleNext = () => {
    const newErrors: { [key: string]: string } = {};
    if (!sourceOfFund.trim())
      newErrors.sourceOfFund = t("banking.errorSourceOfFund");
    if (!grossMonthlyIncome.trim())
      newErrors.grossMonthlyIncome = t("banking.errorMonthlyIncome");
    if (!grossMonthlyIncomeCurrency)
      newErrors.grossMonthlyIncomeCurrency = t("banking.selectCurrency");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    navigation.navigate("BankingRequiredInfo", {
      selectedBank,
      applicationData: {
        ...applicationData,
        financialInfo: {
          sourceOfFund,
          grossMonthlyIncome: grossMonthlyIncome.trim(),
          grossMonthlyIncomeCurrency,
        },
      },
    });
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
              <Ionicons
                name="arrow-back"
                size={isXSScreen ? 24 : 28}
                color={THEME_COLOR}
              />
            </TouchableOpacity>

            <View style={styles.headerCard}>
              <LinearGradient
                colors={ORANGE_GRADIENT}
                style={[
                  styles.headerGradient,
                  isXSScreen && styles.headerGradientXS,
                  isSmallScreen && styles.headerGradientSmall,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="bank"
                  size={isXSScreen ? 32 : isSmallScreen ? 36 : 40}
                  color="#FFFFFF"
                  style={styles.headerIcon}
                />
                <Text style={[styles.headerTitle, isXSScreen && styles.headerTitleXS]}>
                  {t("banking.headerTitle")}
                </Text>
                <Text
                  style={[styles.headerSubtitle, isXSScreen && styles.headerSubtitleXS]}
                >
                  {t("banking.headerSubtitle")}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Progress Stepper - Steps 1–4 complete (green), Step 5 active */}
          <View
            style={[
              styles.progressContainer,
              isXSScreen && styles.progressContainerXS,
              isSmallScreen && styles.progressContainerSmall,
            ]}
          >
            <View style={styles.stepRow}>
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <React.Fragment key={step}>
                  <View
                    style={[
                      styles.stepCircle,
                      isXSScreen && styles.stepCircleXS,
                      step < currentStep && styles.stepCircleComplete,
                      step === currentStep && styles.stepCircleActive,
                    ]}
                  >
                    {step < currentStep ? (
                      <Ionicons
                        name="checkmark"
                        size={isXSScreen ? 14 : 16}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          isXSScreen && styles.stepNumberXS,
                          step === currentStep && styles.stepNumberActive,
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                  {step < 6 && (
                    <View
                      style={[
                        styles.stepLine,
                        isXSScreen && styles.stepLineXS,
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
                  name="cash-multiple"
                  size={isXSScreen ? 24 : 28}
                  color={THEME_COLOR}
                />
              </View>
              <Text style={[styles.contentTitle, isXSScreen && styles.contentTitleXS]}>
                {t("banking.financialInfo")}
              </Text>
              <Text
                style={[styles.contentDescription, isXSScreen && styles.contentDescriptionXS]}
              >
                {t("banking.financialInfoDesc")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isXSScreen && styles.inputLabelXS]}>
                  {t("banking.sourceOfFund")}
                  <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    isXSScreen && styles.dropdownXS,
                    errors.sourceOfFund && styles.inputError,
                  ]}
                  onPress={() => {
                    setShowSourceOfFundModal(true);
                    if (errors.sourceOfFund) {
                      setErrors((prev) => {
                        const { sourceOfFund, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      isXSScreen && styles.dropdownTextXS,
                      !sourceOfFund && styles.dropdownPlaceholder,
                    ]}
                  >
                    {sourceOfFund
                      ? t(SOURCE_OF_FUND_KEY[sourceOfFund])
                      : t("banking.selectSourceOfFund")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
                {errors.sourceOfFund && (
                  <Text style={styles.errorText}>{errors.sourceOfFund}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isXSScreen && styles.inputLabelXS]}>
                  {t("banking.grossMonthlyIncome")}
                  <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.incomeRow, isXSScreen && styles.incomeRowXS]}>
                  <TouchableOpacity
                    style={[
                      styles.dropdown,
                      styles.currencyDropdown,
                      isXSScreen && styles.dropdownXS,
                      errors.grossMonthlyIncomeCurrency && styles.inputError,
                    ]}
                    onPress={() => {
                      setShowCurrencyModal(true);
                      if (errors.grossMonthlyIncomeCurrency)
                        setErrors((prev) => ({
                          ...prev,
                          grossMonthlyIncomeCurrency: "",
                        }));
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        isXSScreen && styles.dropdownTextXS,
                        !grossMonthlyIncomeCurrency &&
                          styles.dropdownPlaceholder,
                      ]}
                    >
                      {grossMonthlyIncomeCurrency
                        ? t(CURRENCY_KEY[grossMonthlyIncomeCurrency])
                        : t("banking.selectCurrency")}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                  <View style={styles.amountInputContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        isXSScreen && styles.inputXS,
                        errors.grossMonthlyIncome && styles.inputError,
                      ]}
                      placeholder="0"
                      placeholderTextColor="#9E9E9E"
                      value={grossMonthlyIncome}
                      onChangeText={(text) => {
                        setGrossMonthlyIncome(filterIncomeInput(text));
                        if (errors.grossMonthlyIncome) {
                          setErrors((prev) => {
                            const { grossMonthlyIncome, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                {errors.grossMonthlyIncomeCurrency ? (
                  <Text style={styles.errorText}>
                    {errors.grossMonthlyIncomeCurrency}
                  </Text>
                ) : errors.grossMonthlyIncome ? (
                  <Text style={styles.errorText}>
                    {errors.grossMonthlyIncome}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, isXSScreen && styles.infoBoxXS]}>
              <View style={styles.infoIconCircle}>
                <Text style={styles.infoIconText}>i</Text>
              </View>
              <Text style={[styles.infoText, isXSScreen && styles.infoTextXS]}>
                {t("banking.infoNote")}
              </Text>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Back & Next Buttons */}
          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButtonFooter}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>{t("banking.back")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={ORANGE_GRADIENT}
                  style={styles.nextGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextButtonText}>{t("banking.next")}</Text>
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
              <Text style={styles.modalTitle}>
                {t("banking.modalSelectSourceOfFund")}
              </Text>
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
                    setShowSourceOfFundModal(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {t(SOURCE_OF_FUND_KEY[opt])}
                  </Text>
                  {sourceOfFund === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
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
              <Text style={styles.modalTitle}>
                {t("banking.modalSelectCurrency")}
              </Text>
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
                    grossMonthlyIncomeCurrency === opt &&
                      styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setGrossMonthlyIncomeCurrency(opt);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(CURRENCY_KEY[opt])}</Text>
                  {grossMonthlyIncomeCurrency === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
              {t("banking.cancelApplicationMessage")}
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
  headerGradientSmall: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerGradientXS: {
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  headerTitleXS: {
    fontSize: 17,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  headerSubtitleXS: {
    fontSize: 12,
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  progressContainerSmall: {
    paddingHorizontal: 16,
  },
  progressContainerXS: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  stepCircleXS: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  stepNumberXS: {
    fontSize: 11,
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
  stepLineXS: {
    width: 12,
    marginHorizontal: 2,
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
  contentTitleXS: {
    fontSize: 16,
  },
  contentDescription: {
    fontSize: 14,
    color: "#9E9E9E",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  contentDescriptionXS: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
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
  inputLabelXS: {
    fontSize: 13,
    marginBottom: 8,
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
    flexShrink: 1,
    maxWidth: "100%",
  },
  inputXS: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
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
  dropdownXS: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  dropdownTextXS: {
    fontSize: 14,
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
  incomeRow: {
    flexDirection: "row",
    gap: 12,
  },
  incomeRowXS: {
    gap: 8,
  },
  currencyDropdown: {
    flex: 0,
    minWidth: 100,
  },
  amountInputContainer: {
    flex: 1,
  },
  amountInput: {
    flex: 1,
    flexShrink: 1,
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
  infoBoxXS: {
    padding: 12,
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
  infoTextXS: {
    fontSize: 12,
    lineHeight: 18,
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
  nextButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
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
