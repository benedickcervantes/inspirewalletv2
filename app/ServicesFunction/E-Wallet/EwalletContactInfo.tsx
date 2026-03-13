import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";

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

  const currentStep = 2;

  const handleBack = () => {
    navigation.goBack();
  };

  const validateEmail = (emailStr: string) => {
    return /\S+@\S+\.\S+/.test(emailStr);
  };

  const validateMobile = (mobile: string) => {
    const cleaned = mobile.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const handleNext = () => {
    const newErrors: { email?: string; mobile?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!validateEmail(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!mobileNumber.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!validateMobile(mobileNumber.trim())) {
      newErrors.mobile = "Enter a valid 10-11 digit mobile number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    navigation.navigate("EwalletPersonalInfo", { 
      selectedProvider,
      applicationData: {
        contactInfo: {
          email: email.trim(),
          phone: mobileNumber.trim(),
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
              onPress={handleBack}
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
                <TextInput
                  style={[styles.input, errors.mobile && styles.inputError]}
                  placeholder={t("banking.placeholderMobile")}
                  placeholderTextColor="#9E9E9E"
                  value={mobileNumber}
                  onChangeText={(text) => {
                    setMobileNumber(text);
                    if (errors.mobile) setErrors({ ...errors, mobile: undefined });
                  }}
                  keyboardType="phone-pad"
                />
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
});
