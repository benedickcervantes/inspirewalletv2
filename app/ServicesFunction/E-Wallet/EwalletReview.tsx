import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Alert, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { submitEwalletApplication } from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";

import ActivityModal from '../../components/ActivityModal';
const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";

const SOURCE_OF_FUND_KEY: Record<string, string> = {
  Employment: "banking.sourceEmployment",
  Business: "banking.sourceBusiness",
  Investment: "banking.sourceInvestment",
  Inheritance: "banking.sourceInheritance",
  Pension: "banking.sourcePension",
  Other: "banking.sourceOther",
};
const CURRENCY_KEY: Record<string, string> = {
  PHP: "banking.currencyPHP",
  USD: "banking.currencyUSD",
  EUR: "banking.currencyEUR",
};

export default function EwalletReview() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "EwalletReview">>();
  const route = useRoute<RouteProp<RootStackParamList, "EwalletReview">>();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const currentStep = 6;
  const selectedProvider = route.params?.selectedProvider ?? "";
  const applicationData = route.params?.applicationData;

  const display = useMemo(() => {
    const sourceKey = applicationData?.financialInfo?.sourceOfFund || "";
    const currencyKey = applicationData?.financialInfo?.grossMonthlyIncomeCurrency || "";
    return {
      sourceOfFund: sourceKey ? t(SOURCE_OF_FUND_KEY[sourceKey] || sourceKey) : "-",
      currency: currencyKey ? t(CURRENCY_KEY[currencyKey] || currencyKey) : "-",
    };
  }, [applicationData?.financialInfo?.grossMonthlyIncomeCurrency, applicationData?.financialInfo?.sourceOfFund, t]);

  const formatReviewValue = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : "-";
  };

  const formatReviewDate = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  };

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
    if (!applicationData?.financialInfo) {
      Alert.alert(t("common.error"), t("ewallet.incomeRequired"));
      return;
    }

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
        sourceOfFund: applicationData.financialInfo.sourceOfFund,
        grossMonthlyIncome: applicationData.financialInfo.grossMonthlyIncome,
        grossMonthlyIncomeCurrency: applicationData.financialInfo.grossMonthlyIncomeCurrency,
        personalInfo: applicationData.personalInfo,
        contactInfo: applicationData.contactInfo,
        addressInfo: applicationData.addressInfo,
      };

      const result = await submitEwalletApplication(token, payload);
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        Alert.alert(t("common.error"), result.error || t("travel.submitFailed"));
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          <TouchableOpacity style={styles.backButton} onPress={handleTopBackPress}>
            <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
          </TouchableOpacity>

          <View style={styles.headerCard}>
            <LinearGradient colors={ORANGE_GRADIENT} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.headerIconWrapper}>
                <MaterialCommunityIcons name="wallet" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>{t("ewallet.headerTitle")}</Text>
              <Text style={styles.headerSubtitle}>{t("ewallet.headerSubtitle")}</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <View style={[styles.stepCircle, step < currentStep && styles.stepCircleComplete, step === currentStep && styles.stepCircleActive]}>
                  {step < currentStep ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumber, step === currentStep && styles.stepNumberActive]}>{step}</Text>
                  )}
                </View>
                {step < 6 && <View style={[styles.stepLine, step < currentStep && styles.stepLineComplete]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            <View style={styles.stepIconWrapper}>
              <Ionicons name="document-text-outline" size={28} color={THEME_COLOR} />
            </View>
            <Text style={styles.contentTitle}>Review details</Text>
            <Text style={styles.contentDescription}>Please check all details before submitting.</Text>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>E-Wallet</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Provider</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(selectedProvider)}</Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>{t("banking.contactInfo")}</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.emailAddress")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.contactInfo?.email)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.mobileNumber")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.contactInfo?.phone)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.landlineNumber")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.contactInfo?.landline)}</Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>{t("banking.personalDetails")}</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.gender")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.personalInfo?.gender)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.dateOfBirth")}</Text>
                <Text style={styles.reviewValue}>{formatReviewDate(applicationData?.personalInfo?.dateOfBirth)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.civilStatus")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.personalInfo?.civilStatus)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.citizenship")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.personalInfo?.citizenship)}</Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>{t("banking.addressInfo")}</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.completeAddress")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.addressInfo?.completeAddress)}</Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>{t("banking.financialInfo")}</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.sourceOfFund")}</Text>
                <Text style={styles.reviewValue}>{display.sourceOfFund}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Currency</Text>
                <Text style={styles.reviewValue}>{display.currency}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("banking.grossMonthlyIncome")}</Text>
                <Text style={styles.reviewValue}>{formatReviewValue(applicationData?.financialInfo?.grossMonthlyIncome)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.bottomSpacing} />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backButtonText}>{t("ewallet.back")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9} disabled={loading}>
              <LinearGradient colors={ORANGE_GRADIENT} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.submitButtonText}>{loading ? "Submitting..." : t("ewallet.submit")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ActivityModal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.reset({ index: 0, routes: [{ name: "Main" as never }] });
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <LinearGradient colors={["#E15816", "#F48F38"]} style={styles.successModalGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
              <Text style={styles.successTitle}>{t("common.success") || "Success"}</Text>
              <Text style={styles.successMessage}>Your application has been submitted successfully.</Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.reset({ index: 0, routes: [{ name: "Main" as never }] });
                }}
              >
                <Text style={styles.successButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </ActivityModal>

      <ActivityModal transparent animationType="fade" visible={showExitConfirmModal} onRequestClose={() => setShowExitConfirmModal(false)}>
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContainer}>
            <View style={styles.exitModalIconWrap}>
              <Ionicons name="warning-outline" size={28} color={THEME_COLOR} />
            </View>
            <Text style={styles.exitModalTitle}>{t("common.cancelApplication")}</Text>
            <Text style={styles.exitModalMessage}>{t("ewallet.cancelApplicationMessage")}</Text>
            <View style={styles.exitModalButtons}>
              <TouchableOpacity style={[styles.exitModalButton, styles.exitModalKeepEditingButton]} onPress={() => setShowExitConfirmModal(false)}>
                <Text style={[styles.exitModalButtonText, styles.exitModalKeepEditingButtonText]}>{t("common.keepEditing")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exitModalButton, styles.exitModalDiscardButton]} onPress={handleConfirmExit}>
                <Text style={[styles.exitModalButtonText, styles.exitModalDiscardButtonText]}>{t("common.discardExit")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ActivityModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0 },
  topSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backButton: { marginBottom: 12, padding: 4 },
  headerCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerGradient: { paddingVertical: 24, paddingHorizontal: 20, alignItems: "center" },
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 4, textAlign: "center" },
  headerSubtitle: { fontSize: 14, color: "rgba(255, 255, 255, 0.95)", fontWeight: "500" },
  progressContainer: { paddingVertical: 16, paddingHorizontal: 24, backgroundColor: "#FFFFFF" },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
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
  stepCircleComplete: { backgroundColor: GREEN_COMPLETE, borderColor: GREEN_COMPLETE },
  stepCircleActive: { backgroundColor: "#FFFFFF", borderColor: "#9E9E9E" },
  stepNumber: { fontSize: 12, fontWeight: "600", color: "#9E9E9E" },
  stepNumberActive: { color: "#757575" },
  stepLine: { width: 20, height: 2, backgroundColor: "#E0E0E0", marginHorizontal: 3 },
  stepLineComplete: { backgroundColor: GREEN_COMPLETE },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
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
  contentTitle: { fontSize: 18, fontWeight: "700", color: "#000000", textAlign: "center", marginBottom: 10 },
  contentDescription: { fontSize: 14, color: "#6B7280", lineHeight: 20, textAlign: "center", marginBottom: 8 },
  reviewSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  reviewSectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 7 },
  reviewLabel: { flex: 1, fontSize: 13, color: "#6B7280", fontWeight: "500" },
  reviewValue: { flex: 1, fontSize: 13, color: "#111827", textAlign: "right" },
  bottomSpacing: { height: 20 },
  footer: { padding: 16, paddingBottom: Platform.OS === "ios" ? 24 : 20, backgroundColor: "#FFFFFF" },
  buttonRow: { flexDirection: "row", gap: 12 },
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
  backButtonText: { fontSize: 18, fontWeight: "700", color: THEME_COLOR },
  submitButton: { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  submitGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  submitButtonText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  successModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
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
  successModalGradient: { padding: 32, alignItems: "center" },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", marginTop: 12, marginBottom: 12 },
  successMessage: { fontSize: 15, color: "#FFFFFF", textAlign: "center", lineHeight: 22, marginBottom: 24, opacity: 0.95 },
  successButton: { backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  successButtonText: { fontSize: 16, fontWeight: "600", color: "#E15816" },
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
  exitModalTitle: { fontSize: 21, fontWeight: "700", color: "#0F172A", marginBottom: 8, textAlign: "center" },
  exitModalMessage: { fontSize: 14, color: "#64748B", lineHeight: 20, textAlign: "center", marginBottom: 16 },
  exitModalButtons: { width: "100%" },
  exitModalButton: { width: "100%", borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  exitModalDiscardButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F3C3B1" },
  exitModalKeepEditingButton: { backgroundColor: THEME_COLOR, marginBottom: 10 },
  exitModalButtonText: { fontSize: 15, fontWeight: "700" },
  exitModalDiscardButtonText: { color: "#D9480F" },
  exitModalKeepEditingButtonText: { color: "#FFFFFF" },
});
