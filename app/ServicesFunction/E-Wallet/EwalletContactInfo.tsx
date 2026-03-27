import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";

import ActivityModal from '../../components/ActivityModal';
const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";
const PHONE_PREFIX = "+63";
const PHONE_SUFFIX_MAX_LENGTH = 10;

export default function EwalletContactInfo() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "EwalletContactInfo">
    >();
  const route =
    useRoute<RouteProp<RootStackParamList, "EwalletContactInfo">>();
  const { t } = useLanguage();
  const selectedProvider = route.params?.selectedProvider ?? "";

  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [landlineNumber, setLandlineNumber] = useState("");
  const [errors, setErrors] = useState<{ email?: string; mobile?: string }>({});
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const currentStep = 2;

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

  const validateEmail = (emailStr: string) => {
    return /\S+@\S+\.\S+/.test(emailStr);
  };

  const validateMobile = (mobile: string) => {
    const cleaned = mobile.replace(/\D/g, "");
    return cleaned.length > 0 && cleaned.length <= PHONE_SUFFIX_MAX_LENGTH;
  };

  const handleNext = () => {
    const newErrors: { email?: string; mobile?: string } = {};

    if (!email.trim()) {
      newErrors.email = t("ewallet.emailRequired");
    } else if (!validateEmail(email.trim())) {
      newErrors.email = t("ewallet.emailInvalid");
    }

    if (!mobileNumber.trim()) {
      newErrors.mobile = t("ewallet.mobileRequired");
    } else if (!validateMobile(mobileNumber.trim())) {
      newErrors.mobile = t("ewallet.mobileInvalid");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const fullPhoneNumber = `${PHONE_PREFIX}${mobileNumber.replace(/\D/g, "")}`;
    navigation.navigate("EwalletPersonalInfo", { 
      selectedProvider,
      applicationData: {
        contactInfo: {
          email: email.trim(),
          phone: fullPhoneNumber,
          landline: landlineNumber.trim(),
        }
      }
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

          {/* Progress Stepper - 5 steps, Step 1 complete, Step 2 active */}
          <View style={styles.progressContainer}>
            <View style={styles.stepRow}>
              {[1, 2, 3, 4, 5, 6].map((step) => (
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
                  {step < 6 && (
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
            {/* Main Content Card - Contact Information */}
            <View style={styles.contentCard}>
              <View style={styles.stepIconWrapper}>
                <Ionicons name="call" size={28} color={THEME_COLOR} />
              </View>
              <Text style={styles.contentTitle}>{t("banking.contactInfo")}</Text>
              <Text style={styles.contentDescription}>
                {t("banking.contactInfoDesc")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("banking.emailAddress")}<Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder={t("banking.placeholderEmail")}
                  placeholderTextColor="#9E9E9E"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("banking.mobileNumber")}<Text style={styles.required}>*</Text>
                </Text>
                <View
                  style={[
                    styles.phoneFieldShell,
                    errors.mobile && styles.phoneFieldShellError,
                  ]}
                >
                  <View style={styles.phonePrefixBox}>
                    <Ionicons name="call-outline" size={16} color={THEME_COLOR} />
                    <Text style={styles.phonePrefixText}>{PHONE_PREFIX}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter mobile number"
                    placeholderTextColor="#9E9E9E"
                    value={mobileNumber}
                    onChangeText={(text) => {
                      const digitsOnly = text.replace(/\D/g, "").slice(0, PHONE_SUFFIX_MAX_LENGTH);
                      setMobileNumber(digitsOnly);
                      if (errors.mobile) setErrors({ ...errors, mobile: undefined });
                    }}
                    keyboardType="phone-pad"
                    maxLength={PHONE_SUFFIX_MAX_LENGTH}
                  />
                </View>
                {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("banking.landlineNumber")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("banking.placeholderLandline")}
                  placeholderTextColor="#9E9E9E"
                  value={landlineNumber}
                  onChangeText={setLandlineNumber}
                  keyboardType="phone-pad"
                />
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

          {/* Back & Next Buttons */}
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
                  <Text style={styles.nextButtonText}>{t("ewallet.next")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ActivityModal
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
      </ActivityModal>
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
  phoneInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  phoneFieldShell: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingLeft: 12,
    paddingRight: 2,
  },
  phoneFieldShellError: {
    borderColor: "#EF4444",
  },
  phonePrefixBox: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 14,
    paddingRight: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  phonePrefixText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
