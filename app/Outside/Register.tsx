import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { decodeQrImage, register as registerApi } from "../../configs/api";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from "../../constants/locales";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";
import { useResponsive } from "../../utils/responsive";
import * as SecureStore from 'expo-secure-store';

const getScreenWidth = () => {
  try {
    const D = require("react-native").Dimensions;
    return D?.get?.("window")?.width ?? 375;
  } catch {
    return 375;
  }
};

const USER_PREFERRED_LANGUAGE_KEY = "user_preferred_language";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const filterCompanyInput = (text: string) =>
  text.replace(/[^A-Za-zÑñ0-9 ]/g, "");
const isValidEmail = (email: string) =>
  EMAIL_REGEX.test((email || "").trim().toLowerCase());

const filterEmailInput = (text: string) =>
  text.replace(/[^A-Za-z0-9.@\-_]/g, "");

// Allow only English letters (A–Z, a–z), Ñ/ñ, and spaces for name fields
const filterNameInput = (text: string) => text.replace(/[^A-Za-zÑñ ]/g, "");

// Allow digits only for phone number
const filterPhoneInput = (text: string) => text.replace(/[^0-9]/g, "");

// Referral code: English letters and numbers only, max 5 chars
const filterReferralInput = (text: string) =>
  text
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5);

// Password: English letters, numbers, and common safe symbols (blocks non-Latin scripts)
const filterPasswordInput = (text: string) =>
  text.replace(/[^A-Za-z0-9!@#$%^&*()\-_=+[\]{}|;:'",.<>?/~`\\]/g, "");

const capitalizeWords = (text: string) =>
  text.replace(/\b\w/g, (char) => char.toUpperCase());

const COUNTRY_OPTIONS = [
  {
    code: "+63",
    label: "Philippines",
    flag: "🇵🇭",
    iso: "PH",
    mask: "#### ### ###",
    maxLength: 10,
  },
  {
    code: "+81",
    label: "Japan",
    flag: "🇯🇵",
    iso: "JP",
    mask: "## #### ####",
    maxLength: 10,
  },
  {
    code: "+966",
    label: "Saudi Arabia",
    flag: "🇸🇦",
    iso: "SA",
    mask: "## ### ####",
    maxLength: 9,
  },
  {
    code: "+82",
    label: "Korea",
    flag: "🇰🇷",
    iso: "KR",
    mask: "## #### ####",
    maxLength: 10,
  },
  {
    code: "+1",
    label: "United States",
    flag: "🇺🇸",
    iso: "US",
    mask: "### ### ####",
    maxLength: 10,
  },
];

const formatWithMask = (text: string, mask: string, maxDigits?: number) => {
  let digits = text.replace(/\D/g, "");
  if (maxDigits != null) {
    digits = digits.slice(0, maxDigits);
  }
  let formatted = "";
  let digitIndex = 0;
  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === "#") {
      formatted += digits[digitIndex++];
    } else {
      formatted += mask[i];
    }
  }
  return formatted;
};

export default function Register() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    horizontalPadding,
    moderateScale,
    isShortScreen,
    isSmallScreen,
    isTinyScreen,
    isLargeScreen,
  } = useResponsive();
  const isCompact = isShortScreen || isTinyScreen;
  const footerBottomPadding = insets.bottom || 16;
  const scrollPaddingBottom =
    (isCompact || isSmallScreen ? 20 : 24) + footerBottomPadding;
  const { t, language: contextLanguage, setLanguage } = useLanguage();
  const language = normalizeLanguage(contextLanguage ?? DEFAULT_LANGUAGE);
  const [currentStep, setCurrentStep] = useState(1);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] = useState("+63");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lineContact, setLineContact] = useState("");
  const [viberContact, setViberContact] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [appAlertVisible, setAppAlertVisible] = useState(false);
  const [appAlertMessage, setAppAlertMessage] = useState("");

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const normalizeMessagingLink = (
    raw: string,
    provider: "line" | "viber" | "whatsapp" | null,
  ): string => {
    const v = raw.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) {
      return v;
    }
    if (/^www\./i.test(v)) {
      return `https://${v}`;
    }

    const lowered = v.toLowerCase();

    if (provider === "line") {
      if (lowered.startsWith("line.me/") || lowered.startsWith("liff.line.me/")) {
        return `https://${v}`;
      }
      if (lowered.startsWith("line://")) {
        return v;
      }
    }

    if (provider === "whatsapp") {
      if (
        lowered.startsWith("wa.me/") ||
        lowered.startsWith("chat.whatsapp.com/")
      ) {
        return `https://${v}`;
      }
      if (lowered.startsWith("whatsapp://")) {
        return v;
      }
    }

    if (provider === "viber") {
      if (
        lowered.startsWith("viber.me/") ||
        lowered.startsWith("vb.me/") ||
        lowered.startsWith("invite.viber.com/") ||
        lowered.startsWith("chats.viber.com/")
      ) {
        return `https://${v}`;
      }
      if (lowered.startsWith("viber://")) {
        return v;
      }
    }

    // Fallback: if it looks like a bare domain/path, make it https
    if (/^[a-z0-9.-]+\.[a-z]{2,}\/?/i.test(v)) {
      return `https://${v}`;
    }

    return v;
  };

  const isProbablyLink = (value: string): boolean => {
    const v = value.trim();
    if (!v) return true; // optional
    if (v.length > 500) return false;
    if (/^https?:\/\//i.test(v)) return true;
    if (/^www\./i.test(v)) return true;
    // Allow common messaging domains and app schemes after normalization
    if (
      /^(line\.me\/|liff\.line\.me\/|wa\.me\/|chat\.whatsapp\.com\/|viber\.me\/|vb\.me\/|invite\.viber\.com\/|chats\.viber\.com\/)/i.test(
        v,
      )
    ) {
      return true;
    }
    if (/^(viber:\/\/|whatsapp:\/\/|line:\/\/)/i.test(v)) {
      return true;
    }
    return false;
  };
  const detectMessagingProviderFromLink = (
    raw: string,
  ): "line" | "viber" | "whatsapp" | null => {
    const v = raw.trim().toLowerCase();
    if (!v) return null;

    if (
      v.startsWith("line://") ||
      v.includes("line.me/") ||
      v.includes("liff.line.me/")
    ) {
      return "line";
    }
    if (
      v.startsWith("whatsapp://") ||
      v.includes("wa.me/") ||
      v.includes("chat.whatsapp.com/")
    ) {
      return "whatsapp";
    }
    if (
      v.startsWith("viber://") ||
      v.includes("viber.me/") ||
      v.includes("vb.me/") ||
      v.includes("invite.viber.com/") ||
      v.includes("chats.viber.com/")
    ) {
      return "viber";
    }

    return null;
  };
  const isLinkMatchingMessagingProvider = (
    raw: string,
    provider: "line" | "viber" | "whatsapp",
  ): boolean => {
    const detected = detectMessagingProviderFromLink(raw);
    return detected === null || detected === provider;
  };

  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [activeQRField, setActiveQRField] = useState<
    "referral" | "line" | "viber" | "whatsapp" | null
  >(null);
  const [permission, requestPermission] = useCameraPermissions();
  const clearMessagingContactErrors = () => {
    if (errors.lineContact || errors.viberContact || errors.whatsappContact) {
      setErrors((prev) => {
        const {
          lineContact: _lineContact,
          viberContact: _viberContact,
          whatsappContact: _whatsappContact,
          ...rest
        } = prev;
        return rest;
      });
    }
  };
  const showAppAlert = (message: string) => {
    setAppAlertMessage(message);
    setAppAlertVisible(true);
  };

  const handleNextStep = () => {
    if (isProcessingQR) return;
    setRegisterError("");
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!firstName.trim()) {
        newErrors.firstName = t("register.errorFirstName");
      }
      if (!lastName.trim()) {
        newErrors.lastName = t("register.errorLastName");
      }
      const phoneDigits = phoneNumber.replace(/\D/g, "");
      const country = COUNTRY_OPTIONS.find(
        (c) => c.code === selectedCountryCode,
      );
      if (
        phoneDigits.length > 0 &&
        country &&
        phoneDigits.length !== country.maxLength
      ) {
        newErrors.phoneNumber = t("register.errorPhoneInvalid").replace(
          "{digits}",
          String(country.maxLength),
        );
      }
      if (hasCompany && !companyName.trim()) {
        newErrors.companyName = t("register.errorCompanyName");
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const hasAtLeastOneMessagingContact =
        lineContact.trim() || viberContact.trim() || whatsappContact.trim();
      if (!hasAtLeastOneMessagingContact) {
        const requiredContactError = t("register.errorAtLeastOneMessagingContact");
        newErrors.whatsappContact = requiredContactError;
      }
      if (lineContact.trim() && !isProbablyLink(lineContact)) {
        newErrors.lineContact = t("register.invalidLink");
      }
      if (viberContact.trim() && !isProbablyLink(viberContact)) {
        newErrors.viberContact = t("register.invalidLink");
      }
      if (whatsappContact.trim() && !isProbablyLink(whatsappContact)) {
        newErrors.whatsappContact = t("register.invalidLink");
      }
      if (isAgent === null) {
        newErrors.isAgent = t("register.errorAgentSelection");
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const email = emailAddress.trim();
      if (!email) {
        newErrors.emailAddress = t("register.errorEmail");
      } else if (!isValidEmail(email)) {
        newErrors.emailAddress = t("register.errorValidEmail");
      }
      if (!password.trim()) {
        newErrors.password = t("register.errorPassword");
      } else if (password.length < 8) {
        newErrors.password = t("register.errorPasswordLength");
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = t("register.errorPasswordMismatch");
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setRegisterError("");
    setRegisterLoading(true);
    try {
      const country = COUNTRY_OPTIONS.find(
        (c) => c.code === selectedCountryCode,
      );
      // Strip non-digits from phoneNumber before prepending country code
      const phoneDigits = phoneNumber.replace(/\D/g, "");
      const phone = phoneDigits ? selectedCountryCode + phoneDigits : "";
      const body: Record<string, unknown> = {
        email: emailAddress.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.length > 0 && phone.length <= 30 ? phone : undefined,
        countryCode: country?.iso,
        referralCode: referralCode.trim() || undefined,
        companyName:
          hasCompany && companyName.trim() ? companyName.trim() : undefined,
        lineContact: lineContact.trim() || undefined,
        viberContact: viberContact.trim() || undefined,
        whatsappContact: whatsappContact.trim() || undefined,
        isAgent: isAgent ?? false,
      };
      const result = await registerApi(body);

      if (!result.success) {
        setRegisterError(result.error || t("register.errorRegistrationFailed"));
        return;
      }

      // Clear any old biometric token from the previous user
      try {
        await SecureStore.deleteItemAsync('biometricToken');
        await AsyncStorage.removeItem('biometricEmail');
        await AsyncStorage.setItem('lastLoggedEmail', emailAddress.trim().toLowerCase());
      } catch (e) {
        console.warn("Failed to clear old biometricToken on register", e);
      }

      await AsyncStorage.setItem("access_token", result.access_token || "");
      await AsyncStorage.setItem("user", JSON.stringify(result.user || {}));
      await AsyncStorage.setItem("registrationPasscodePending", "true");
      (navigation as unknown as NavProp).replace("CreatePasscode");
    } catch {
      setRegisterError(t("register.errorUnexpected"));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      (navigation as unknown as NavProp).replace("Welcome");
    }
  };

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    await AsyncStorage.setItem(USER_PREFERRED_LANGUAGE_KEY, selectedLabel);
    setLanguageModalVisible(false);
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    setIsQRScannerVisible(false);

    // Handle based on which field's QR scanner was opened
    if (activeQRField === "referral") {
      // Check if the scanned data is a URL with a 'ref' parameter
      try {
        if (data.includes("ref=")) {
          // e.g. http://localhost:3000/register?ref=ABCDE
          const urlParams = new URL(data);
          const ref = urlParams.searchParams.get("ref");
          if (ref) {
            setReferralCode(ref.toUpperCase());
            setActiveQRField(null);
            return;
          }
        }
      } catch {
        // Not a valid URL, ignore URL parsing error
      }
      // fallback to setting exactly what was scanned
      setReferralCode(data.toUpperCase());
    } else if (activeQRField === "line") {
      if (!isLinkMatchingMessagingProvider(data, "line")) {
        showAppAlert(t("register.lineQRMismatch"));
        setActiveQRField(null);
        return;
      }
      setLineContact(normalizeMessagingLink(data, "line"));
    } else if (activeQRField === "viber") {
      if (!isLinkMatchingMessagingProvider(data, "viber")) {
        showAppAlert(t("register.viberQRMismatch"));
        setActiveQRField(null);
        return;
      }
      setViberContact(normalizeMessagingLink(data, "viber"));
    } else if (activeQRField === "whatsapp") {
      if (!isLinkMatchingMessagingProvider(data, "whatsapp")) {
        showAppAlert(t("register.whatsappQRMismatch"));
        setActiveQRField(null);
        return;
      }
      setWhatsappContact(normalizeMessagingLink(data, "whatsapp"));
    }

    setActiveQRField(null);
  };

  const openScanner = async (
    fieldType: "referral" | "line" | "viber" | "whatsapp",
  ) => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        showAppAlert(t("register.cameraPermissionRequired"));
        return;
      }
    }
    setActiveQRField(fieldType);
    setIsQRScannerVisible(true);
  };

  const handleUploadImage = async (
    fieldType: "referral" | "line" | "viber" | "whatsapp",
  ) => {
    try {
      setIsProcessingQR(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const provider =
        fieldType === "line" || fieldType === "viber" || fieldType === "whatsapp"
          ? fieldType
          : undefined;

      const decoded = await decodeQrImage(asset.uri, provider, asset.mimeType);
      if (!decoded.success) {
        showAppAlert(decoded.error || t("register.errorUnexpected"));
        return;
      }

      const raw = (decoded.normalizedLink || decoded.text || "").trim();
      if (!raw) {
        showAppAlert(
          t("register.noQRFound") ||
            "No QR code found in the image. Please pick a clearer QR code image.",
        );
        return;
      }

      const normalized =
        fieldType === "line" || fieldType === "viber" || fieldType === "whatsapp"
          ? normalizeMessagingLink(raw, fieldType)
          : raw;

      if (fieldType === "referral") {
        try {
          if (normalized.includes("ref=")) {
            const urlParams = new URL(normalized);
            const ref = urlParams.searchParams.get("ref");
            if (ref) {
              setReferralCode(ref.toUpperCase());
              return;
            }
          }
        } catch {
          // ignore url parsing error
        }
        setReferralCode(normalized.toUpperCase().slice(0, 5));
      } else if (fieldType === "line") {
        if (!isLinkMatchingMessagingProvider(normalized, "line")) {
          showAppAlert(t("register.lineQRMismatch"));
          return;
        }
        setLineContact(normalized);
      } else if (fieldType === "viber") {
        if (!isLinkMatchingMessagingProvider(normalized, "viber")) {
          showAppAlert(t("register.viberQRMismatch"));
          return;
        }
        setViberContact(normalized);
      } else if (fieldType === "whatsapp") {
        if (!isLinkMatchingMessagingProvider(normalized, "whatsapp")) {
          showAppAlert(t("register.whatsappQRMismatch"));
          return;
        }
        setWhatsappContact(normalized);
      }
    } catch (error) {
      console.log("Error scanning from image:", error);
      showAppAlert(t("register.errorUnexpected"));
    } finally {
      setIsProcessingQR(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <View style={styles.keyboardView}>
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: horizontalPadding,
                paddingVertical: isLargeScreen
                  ? 12
                  : isCompact || isSmallScreen
                    ? 10
                    : 14,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.backButton,
                isTinyScreen && { width: 36, height: 36 },
              ]}
              onPress={handleBackStep}
            >
              <Ionicons
                name="arrow-back"
                size={isTinyScreen ? 20 : 24}
                color="#E25A17"
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.headerTitle,
                isTinyScreen && { fontSize: 14 },
                isSmallScreen && !isTinyScreen && { fontSize: 16 },
                isLargeScreen && { fontSize: 16 },
              ]}
              numberOfLines={1}
            >
              {t("register.title")}
            </Text>
            {currentStep === 1 ? (
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  {
                    width: isTinyScreen ? 40 : isSmallScreen ? 44 : 48,
                    height: isTinyScreen ? 40 : isSmallScreen ? 44 : 48,
                    borderRadius: isTinyScreen ? 20 : isSmallScreen ? 22 : 24,
                  },
                ]}
                onPress={() => setLanguageModalVisible(true)}
                accessibilityLabel={t("profile.selectLanguage")}
                accessibilityRole="button"
              >
                <Ionicons
                  name="language-outline"
                  size={isTinyScreen ? 22 : isSmallScreen ? 26 : 28}
                  color="#E25A17"
                />
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  width: isTinyScreen ? 40 : isSmallScreen ? 44 : 48,
                  height: isTinyScreen ? 40 : isSmallScreen ? 44 : 48,
                }}
              />
            )}
          </View>

          <View style={styles.keyboardAvoidWrap}>
            <KeyboardAwareScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingTop: isCompact || isSmallScreen ? 12 : 20,
                  paddingHorizontal: horizontalPadding,
                  paddingBottom: scrollPaddingBottom,
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              enableOnAndroid
              enableAutomaticScroll
              extraScrollHeight={Platform.OS === "ios" ? 60 : 40}
              extraHeight={Platform.OS === "android" ? 80 : 60}
            >
              <View
                style={[
                  styles.progressContainer,
                  {
                    paddingVertical:
                      isCompact || isSmallScreen ? 8 : isLargeScreen ? 10 : 12,
                    paddingHorizontal:
                      isTinyScreen ? 12 : isSmallScreen ? 18 : 24,
                  },
                ]}
              >
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      styles.stepActive,
                      isTinyScreen && { width: 32, height: 32, borderRadius: 16 },
                      isSmallScreen &&
                        !isTinyScreen && {
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                        },
                    ]}
                  >
                    {currentStep > 1 ? (
                      <Ionicons
                        name="checkmark"
                        size={isTinyScreen ? 16 : isSmallScreen ? 17 : 20}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Ionicons
                        name="person"
                        size={isTinyScreen ? 14 : isSmallScreen ? 15 : 18}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  <View
                    style={[
                      styles.stepLine,
                      currentStep > 1 && styles.stepLineActive,
                      isTinyScreen && { width: 28 },
                      isSmallScreen && !isTinyScreen && { width: 36 },
                    ]}
                  />
                </View>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep >= 2 && styles.stepActive,
                      isTinyScreen && { width: 32, height: 32, borderRadius: 16 },
                      isSmallScreen &&
                        !isTinyScreen && {
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                        },
                    ]}
                  >
                    {currentStep > 2 ? (
                      <Ionicons
                        name="checkmark"
                        size={isTinyScreen ? 16 : isSmallScreen ? 17 : 20}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Ionicons
                        name="call"
                        size={isTinyScreen ? 14 : isSmallScreen ? 15 : 18}
                        color={currentStep >= 2 ? "#FFFFFF" : "#E25A17"}
                      />
                    )}
                  </View>
                  <View
                    style={[
                      styles.stepLine,
                      currentStep > 2 && styles.stepLineActive,
                      isTinyScreen && { width: 28 },
                      isSmallScreen && !isTinyScreen && { width: 36 },
                    ]}
                  />
                </View>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep >= 3 && styles.stepActive,
                      isTinyScreen && { width: 32, height: 32, borderRadius: 16 },
                      isSmallScreen &&
                        !isTinyScreen && {
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                        },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={isTinyScreen ? 14 : isSmallScreen ? 15 : 18}
                      color={currentStep >= 3 ? "#FFFFFF" : "#E25A17"}
                    />
                  </View>
                </View>
              </View>

              {currentStep === 1 && (
                <>
                  <Text
                    style={[
                      styles.welcomeText,
                      isTinyScreen && { fontSize: 18, marginBottom: 10 },
                      isSmallScreen &&
                        !isTinyScreen && { fontSize: 20, marginBottom: 12 },
                      isLargeScreen && { fontSize: 22 },
                    ]}
                  >
                    {t("register.welcomeInvestor")}
                  </Text>
                  <View
                    style={[
                      styles.infoBanner,
                      isTinyScreen && { padding: 10, marginBottom: 12 },
                      (isCompact || isSmallScreen) && {
                        marginBottom: 12,
                        padding: 12,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="office-building"
                      size={isTinyScreen ? 20 : isSmallScreen ? 22 : 24}
                      color="#E25A17"
                    />
                    <View style={styles.infoBannerTextContainer}>
                      <Text
                        style={[
                          styles.infoBannerText,
                          isTinyScreen && { fontSize: 11, lineHeight: 17 },
                          isSmallScreen &&
                            !isTinyScreen && { fontSize: 12, lineHeight: 18 },
                        ]}
                      >
                        {t("register.startInvestment")}{" "}
                        <Text style={styles.infoBannerBold}>
                          {t("register.inspireWallet")}
                        </Text>
                      </Text>
                      <Text
                        style={[
                          styles.infoBannerText,
                          isTinyScreen && { fontSize: 11, lineHeight: 17 },
                          isSmallScreen &&
                            !isTinyScreen && { fontSize: 12, lineHeight: 18 },
                        ]}
                      >
                        {t("register.completeProfile")}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.section,
                      isTinyScreen && { padding: 12, borderRadius: 12 },
                      (isCompact || isSmallScreen) && { padding: 14 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        isTinyScreen && { fontSize: 13, marginBottom: 4 },
                        isCompact && !isTinyScreen && { marginBottom: 6 },
                      ]}
                    >
                      {t("register.personalInfo")}
                    </Text>
                    <View
                      style={[
                        styles.sectionUnderline,
                        isTinyScreen && { marginBottom: 10 },
                        isCompact && !isTinyScreen && { marginBottom: 14 },
                      ]}
                    />
                    <View
                      style={[
                        styles.inputGroup,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.firstName")}{" "}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          errors.firstName && styles.inputError,
                          (isTinyScreen || isSmallScreen) && {
                            minHeight: 44,
                            paddingVertical: 10,
                            fontSize: 14,
                          },
                        ]}
                        placeholder={t("register.placeholderFirstName")}
                        placeholderTextColor="#999"
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="off"
                        value={firstName}
                        onChangeText={(text) => {
                          setFirstName(capitalizeWords(filterNameInput(text)));
                          if (errors.firstName) {
                            setErrors((prev) => {
                              const { firstName, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                      />
                      {errors.firstName && (
                        <Text style={styles.errorText}>{errors.firstName}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputGroup,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.lastName")}{" "}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          errors.lastName && styles.inputError,
                          (isTinyScreen || isSmallScreen) && {
                            minHeight: 44,
                            paddingVertical: 10,
                            fontSize: 14,
                          },
                        ]}
                        placeholder={t("register.placeholderLastName")}
                        placeholderTextColor="#999"
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="off"
                        value={lastName}
                        onChangeText={(text) => {
                          setLastName(capitalizeWords(filterNameInput(text)));
                          if (errors.lastName) {
                            setErrors((prev) => {
                              const { lastName, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                      />
                      {errors.lastName && (
                        <Text style={styles.errorText}>{errors.lastName}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputGroup,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.phoneNumber")}
                      </Text>
                      <View style={styles.phoneInputContainer}>
                        <TouchableOpacity
                          style={[
                            styles.countrySelector,
                            (isTinyScreen || isSmallScreen) && {
                              paddingHorizontal: 10,
                              paddingVertical: 10,
                            },
                          ]}
                          onPress={() => setIsCountryModalVisible(true)}
                        >
                          <Text
                            style={[
                              styles.countryFlag,
                              (isTinyScreen || isSmallScreen) && {
                                fontSize: 18,
                              },
                            ]}
                          >
                            {
                              COUNTRY_OPTIONS.find(
                                (c) => c.code === selectedCountryCode,
                              )?.flag
                            }
                          </Text>
                          <Text
                            style={[
                              styles.countryCode,
                              (isTinyScreen || isSmallScreen) && {
                                fontSize: 13,
                              },
                            ]}
                          >
                            {selectedCountryCode}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={isTinyScreen ? 14 : 16}
                            color="#666"
                          />
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.phoneInput,
                            errors.phoneNumber && styles.inputError,
                            (isTinyScreen || isSmallScreen) && {
                              minHeight: 44,
                              paddingVertical: 10,
                              fontSize: 14,
                            },
                          ]}
                          placeholder={
                            COUNTRY_OPTIONS.find(
                              (c) => c.code === selectedCountryCode,
                            )?.mask.replace(/#/g, "0") || "000 000 0000"
                          }
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                          value={phoneNumber}
                          onChangeText={(text) => {
                            const digits = filterPhoneInput(text);
                            const country = COUNTRY_OPTIONS.find(
                              (c) => c.code === selectedCountryCode,
                            );
                            if (country) {
                              setPhoneNumber(
                                formatWithMask(
                                  digits,
                                  country.mask,
                                  country.maxLength,
                                ),
                              );
                            } else {
                              setPhoneNumber(digits.slice(0, 15));
                            }
                            if (errors.phoneNumber) {
                              setErrors((prev) => {
                                const { phoneNumber: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          maxLength={
                            COUNTRY_OPTIONS.find(
                              (c) => c.code === selectedCountryCode,
                            )?.mask.length ?? 15
                          }
                        />
                      </View>
                      {errors.phoneNumber && (
                        <Text style={styles.errorText}>
                          {errors.phoneNumber}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.checkboxContainer,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                      onPress={() => setHasCompany(!hasCompany)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          hasCompany && styles.checkboxChecked,
                        ]}
                      >
                        {hasCompany && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#E25A17"
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          (isTinyScreen || isSmallScreen) && { fontSize: 13 },
                        ]}
                      >
                        {t("register.iHaveCompany")}
                      </Text>
                    </TouchableOpacity>
                    {hasCompany && (
                      <View
                        style={[
                          styles.inputGroup,
                          (isTinyScreen || isSmallScreen) && {
                            marginBottom: 14,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.inputLabel,
                            (isTinyScreen || isSmallScreen) && {
                              fontSize: 12,
                              marginBottom: 6,
                            },
                          ]}
                        >
                          {t("register.companyName")}{" "}
                          <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            errors.companyName && styles.inputError,
                            (isTinyScreen || isSmallScreen) && {
                              minHeight: 44,
                              paddingVertical: 10,
                              fontSize: 14,
                            },
                          ]}
                          placeholder={t("register.placeholderCompanyName")}
                          placeholderTextColor="#999"
                          autoCapitalize="words"
                          autoCorrect={false}
                          autoComplete="off"
                          value={companyName}
                          onChangeText={(text) => {
                            setCompanyName(
                              capitalizeWords(filterCompanyInput(text)),
                            );
                            if (errors.companyName) {
                              setErrors((prev) => {
                                const { companyName, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        {errors.companyName && (
                          <Text style={styles.errorText}>
                            {errors.companyName}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <View
                    style={[
                      styles.section,
                      isTinyScreen && { padding: 12, borderRadius: 12 },
                      (isCompact || isSmallScreen) && { padding: 14 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        isTinyScreen && { fontSize: 13, marginBottom: 4 },
                        isSmallScreen && !isTinyScreen && { marginBottom: 6 },
                      ]}
                    >
                      {t("register.contactInfo")}
                    </Text>
                    <View style={[styles.sectionUnderline, { marginBottom: 4 }]} />
                    <Text style={[styles.helperText, { marginTop: 0, marginBottom: 14 }]}>
                      You are required to input at least 1 account link in contact
                      information.
                    </Text>
                    <View style={styles.inputGroup}>
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.lineAccountLink")}
                      </Text>
                      <View style={styles.scannerInputContainer}>
                        <TextInput
                          style={[
                            styles.scannerInput,
                            errors.lineContact && styles.inputError,
                          ]}
                          placeholder={t("register.placeholderLine")}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          autoComplete="off"
                          value={lineContact}
                          onChangeText={(text) => {
                            setLineContact(text);
                            clearMessagingContactErrors();
                          }}
                          autoCapitalize="none"
                          keyboardType="url"
                          maxLength={500}
                        />
                        {isProcessingQR ? (
                          <View
                            style={[
                              styles.scannerButton,
                              { paddingHorizontal: 16 },
                            ]}
                          >
                            <ActivityIndicator size="small" color="#E25A17" />
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => handleUploadImage("line")}
                            >
                              <Ionicons
                                name="image-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => openScanner("line")}
                            >
                              <Ionicons
                                name="qr-code-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                      {errors.lineContact && (
                        <Text style={styles.errorText}>{errors.lineContact}</Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.viber")}
                      </Text>
                      <View style={styles.scannerInputContainer}>
                        <TextInput
                          style={[
                            styles.scannerInput,
                            errors.viberContact && styles.inputError,
                          ]}
                          placeholder={t("register.placeholderViber")}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          autoComplete="off"
                          value={viberContact}
                          onChangeText={(text) => {
                            setViberContact(text);
                            clearMessagingContactErrors();
                          }}
                          autoCapitalize="none"
                          keyboardType="url"
                          maxLength={500}
                        />
                        {isProcessingQR ? (
                          <View
                            style={[
                              styles.scannerButton,
                              { paddingHorizontal: 16 },
                            ]}
                          >
                            <ActivityIndicator size="small" color="#E25A17" />
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => handleUploadImage("viber")}
                            >
                              <Ionicons
                                name="image-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => openScanner("viber")}
                            >
                              <Ionicons
                                name="qr-code-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                      {errors.viberContact && (
                        <Text style={styles.errorText}>
                          {errors.viberContact}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.whatsapp")}
                      </Text>
                      <View style={styles.scannerInputContainer}>
                        <TextInput
                          style={[
                            styles.scannerInput,
                            errors.whatsappContact && styles.inputError,
                          ]}
                          placeholder={t("register.placeholderWhatsapp")}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          autoComplete="off"
                          value={whatsappContact}
                          onChangeText={(text) => {
                            setWhatsappContact(text);
                            clearMessagingContactErrors();
                          }}
                          autoCapitalize="none"
                          keyboardType="url"
                          maxLength={500}
                        />
                        {isProcessingQR ? (
                          <View
                            style={[
                              styles.scannerButton,
                              { paddingHorizontal: 16 },
                            ]}
                          >
                            <ActivityIndicator size="small" color="#E25A17" />
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => handleUploadImage("whatsapp")}
                            >
                              <Ionicons
                                name="image-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => openScanner("whatsapp")}
                            >
                              <Ionicons
                                name="qr-code-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                      {errors.whatsappContact && (
                        <Text style={styles.errorText}>
                          {errors.whatsappContact}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.section,
                      {
                        marginTop: isCompact || isSmallScreen ? 14 : 20,
                        padding: isTinyScreen
                          ? 12
                          : isCompact || isSmallScreen
                            ? 14
                            : 20,
                        borderRadius: isTinyScreen || isSmallScreen ? 12 : 16,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        isTinyScreen && { fontSize: 13, marginBottom: 4 },
                        isSmallScreen && !isTinyScreen && { marginBottom: 6 },
                      ]}
                    >
                      {t("register.accountType")}
                    </Text>
                    <View style={styles.sectionUnderline} />
                    <Text
                      style={[
                        styles.inputLabel,
                        (isTinyScreen || isSmallScreen) && {
                          fontSize: 12,
                          marginBottom: 6,
                        },
                      ]}
                    >
                      {t("register.agentOrInvestor")}{" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.radioContainer,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 12 },
                      ]}
                      onPress={() => setIsAgent(true)}
                    >
                      <View
                        style={[
                          styles.radio,
                          isAgent === true && styles.radioChecked,
                        ]}
                      >
                        {isAgent === true && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>
                        {t("register.imAgent")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioContainer}
                      onPress={() => setIsAgent(false)}
                    >
                      <View
                        style={[
                          styles.radio,
                          isAgent === false && styles.radioChecked,
                        ]}
                      >
                        {isAgent === false && <View style={styles.radioDot} />}
                      </View>
                      <Text
                        style={[
                          styles.radioLabel,
                          (isTinyScreen || isSmallScreen) && { fontSize: 13 },
                        ]}
                      >
                        {t("register.imInvestor")}
                      </Text>
                    </TouchableOpacity>
                    {errors.isAgent && (
                      <Text style={styles.errorText}>{errors.isAgent}</Text>
                    )}
                    {isAgent !== null && (
                      <View style={styles.agentQRSection}>
                        <View style={styles.agentQRHeader}>
                          <MaterialCommunityIcons
                            name="shield-star"
                            size={24}
                            color="#E25A17"
                          />
                          <Text style={styles.agentQRTitle}>
                            {t("register.referralCode")}
                          </Text>
                        </View>
                        <Text style={styles.agentNumberSubtext}>
                          {t("register.referralCodeSubtext")}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.inputGroup, { marginTop: 20 }]}>
                      <Text style={styles.inputLabel}>
                        {t("register.referrersCode")}
                      </Text>
                      <View style={styles.scannerInputContainer}>
                        <TextInput
                          style={styles.scannerInput}
                          placeholder={t("register.placeholderReferralCode")}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          autoComplete="off"
                          value={referralCode}
                          onChangeText={(text) =>
                            setReferralCode(filterReferralInput(text))
                          }
                          autoCapitalize="characters"
                          maxLength={5}
                        />
                        {isProcessingQR ? (
                          <View
                            style={[
                              styles.scannerButton,
                              { paddingHorizontal: 16 },
                            ]}
                          >
                            <ActivityIndicator size="small" color="#E25A17" />
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => handleUploadImage("referral")}
                            >
                              <Ionicons
                                name="image-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.scannerButton}
                              onPress={() => openScanner("referral")}
                            >
                              <Ionicons
                                name="qr-code-outline"
                                size={20}
                                color="#E25A17"
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                      <Text style={styles.helperText}>
                        {t("register.referralCodeHint")}
                      </Text>
                      <Text style={[styles.helperText, { marginTop: 4 }]}>
                        {t("register.maxChars")}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <View
                    style={[
                      styles.section,
                      isTinyScreen && { padding: 12, borderRadius: 12 },
                      (isCompact || isSmallScreen) && { padding: 14 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        isTinyScreen && { fontSize: 13, marginBottom: 4 },
                        isSmallScreen && !isTinyScreen && { marginBottom: 6 },
                      ]}
                    >
                      {t("register.accountCredentials")}
                    </Text>
                    <View style={styles.sectionUnderline} />
                    <View
                      style={[
                        styles.inputGroup,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.emailAddress")}{" "}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          errors.emailAddress && styles.inputError,
                          (isTinyScreen || isSmallScreen) && {
                            minHeight: 44,
                            paddingVertical: 10,
                            fontSize: 14,
                          },
                        ]}
                        placeholder={t("register.placeholderEmail")}
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
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
                      />
                      {errors.emailAddress && (
                        <Text style={styles.errorText}>
                          {errors.emailAddress}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputGroup,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.password")}{" "}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          styles.passwordContainer,
                          errors.password && styles.inputError,
                          (isTinyScreen || isSmallScreen) && {
                            minHeight: 44,
                          },
                        ]}
                      >
                        <TextInput
                          style={[
                            styles.passwordInput,
                            (isTinyScreen || isSmallScreen) && {
                              fontSize: 14,
                              paddingVertical: 10,
                            },
                          ]}
                          placeholder={t("register.placeholderPassword")}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          autoComplete="new-password"
                          secureTextEntry={!showPassword}
                          value={password}
                          onChangeText={(text) => {
                            setPassword(filterPasswordInput(text));
                            if (errors.password) {
                              setErrors((prev) => {
                                const { password, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off" : "eye"}
                            size={20}
                            color="#666"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.inputGroup,
                        (isTinyScreen || isSmallScreen) && { marginBottom: 14 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inputLabel,
                          (isTinyScreen || isSmallScreen) && {
                            fontSize: 12,
                            marginBottom: 6,
                          },
                        ]}
                      >
                        {t("register.confirmPassword")}{" "}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          styles.passwordContainer,
                          errors.confirmPassword && styles.inputError,
                          (isTinyScreen || isSmallScreen) && {
                            minHeight: 44,
                          },
                        ]}
                      >
                        <TextInput
                          style={[
                            styles.passwordInput,
                            (isTinyScreen || isSmallScreen) && {
                              fontSize: 14,
                              paddingVertical: 10,
                            },
                          ]}
                          placeholder={t("register.placeholderConfirmPassword")}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          autoComplete="off"
                          secureTextEntry={!showConfirmPassword}
                          value={confirmPassword}
                          onChangeText={(text) => {
                            setConfirmPassword(filterPasswordInput(text));
                            if (errors.confirmPassword) {
                              setErrors((prev) => {
                                const { confirmPassword, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          <Ionicons
                            name={showConfirmPassword ? "eye-off" : "eye"}
                            size={20}
                            color="#666"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.confirmPassword && (
                        <Text style={styles.errorText}>
                          {errors.confirmPassword}
                        </Text>
                      )}
                      {errors.password && (
                        <Text style={styles.errorText}>{errors.password}</Text>
                      )}
                    </View>
                  </View>
                  {registerError ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorBannerText}>
                        {registerError}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </KeyboardAwareScrollView>
            <View
              style={[
                styles.footer,
                {
                  marginHorizontal: -horizontalPadding,
                  paddingHorizontal: horizontalPadding,
                  paddingVertical: isLargeScreen
                    ? 12
                    : isCompact || isSmallScreen
                      ? 10
                      : 14,
                  paddingBottom:
                    (isLargeScreen
                      ? 12
                      : isCompact || isSmallScreen
                        ? 10
                        : 14) + footerBottomPadding,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (registerLoading || isProcessingQR) &&
                    styles.nextButtonDisabled,
                ]}
                onPress={handleNextStep}
                activeOpacity={0.8}
                disabled={registerLoading || isProcessingQR}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={[
                    styles.nextButtonGradient,
                    (isCompact || isSmallScreen) && { paddingVertical: 10 },
                  ]}
                >
                  {registerLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.nextButtonText,
                        isTinyScreen && { fontSize: 14 },
                      ]}
                    >
                      {currentStep === 3
                        ? t("register.registerButton")
                        : t("register.nextStep")}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.termsText}>{t("register.termsText")}</Text>
            </View>
          </View>
        </View>

        <Modal
          visible={isCountryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("register.selectCountry")}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsCountryModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {COUNTRY_OPTIONS.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={styles.countryOption}
                    onPress={() => {
                      setSelectedCountryCode(country.code);
                      setPhoneNumber("");
                      setErrors((prev) => {
                        const { phoneNumber: _, ...rest } = prev;
                        return rest;
                      });
                      setIsCountryModalVisible(false);
                    }}
                  >
                    <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                    <Text style={styles.countryOptionLabel}>
                      {country.label}
                    </Text>
                    <Text style={styles.countryOptionCode}>{country.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* QR Scanner Modal */}
        <Modal
          visible={isQRScannerVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsQRScannerVisible(false)}
        >
          <View style={styles.qrScannerContainer}>
            {!permission?.granted ? (
              <View style={styles.qrPermissionContainer}>
                <Ionicons name="camera-outline" size={64} color="#666" />
                <Text style={styles.qrPermissionText}>
                  {t("register.cameraAccessRequired")}
                </Text>
                <Text style={styles.qrPermissionSubText}>
                  {t("register.cameraPermissionHint")}
                </Text>
                <TouchableOpacity
                  style={styles.qrCloseButton}
                  onPress={() => setIsQRScannerVisible(false)}
                >
                  <Text style={styles.qrCloseButtonText}>
                    {t("register.goBack")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={styles.qrCamera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={handleBarCodeScanned}
              >
                <View style={styles.qrOverlay}>
                  <View style={styles.qrTopOverlay}>
                    <Text style={styles.qrInstructionText}>
                      {activeQRField === "referral" &&
                        t("register.scanReferralQR")}
                      {activeQRField === "line" && t("register.scanLineQR")}
                      {activeQRField === "viber" && t("register.scanViberQR")}
                      {activeQRField === "whatsapp" &&
                        t("register.scanWhatsappQR")}
                    </Text>
                  </View>
                  <View style={styles.qrCenterRow}>
                    <View style={styles.qrSideOverlay} />
                    <View style={styles.qrFrameContainer}>
                      <View style={[styles.qrCorner, styles.qrTopLeft]} />
                      <View style={[styles.qrCorner, styles.qrTopRight]} />
                      <View style={[styles.qrCorner, styles.qrBottomLeft]} />
                      <View style={[styles.qrCorner, styles.qrBottomRight]} />
                    </View>
                    <View style={styles.qrSideOverlay} />
                  </View>
                  <View
                    style={[
                      styles.qrBottomOverlay,
                      { flexDirection: "row", gap: 16 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.qrCancelButton}
                      onPress={() => {
                        setIsQRScannerVisible(false);
                        if (activeQRField) {
                          handleUploadImage(activeQRField);
                        }
                        setActiveQRField(null);
                      }}
                    >
                      <Text style={styles.qrCancelButtonText}>
                        <Ionicons
                          name="image-outline"
                          size={16}
                          color="#E25A17"
                        />{" "}
                        {t("register.uploadImage") || "Upload"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.qrCancelButton}
                      onPress={() => {
                        setIsQRScannerVisible(false);
                        setActiveQRField(null);
                      }}
                    >
                      <Text style={styles.qrCancelButtonText}>
                        {t("register.cancel")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>
            )}
          </View>
        </Modal>

        {/* Language Modal - matches Welcome language options design */}
        <Modal
          visible={languageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <TouchableOpacity
            style={[
              styles.languageModalOverlay,
              { paddingHorizontal: Math.max(16, horizontalPadding) },
            ]}
            activeOpacity={1}
            onPress={() => setLanguageModalVisible(false)}
          >
            <View
              style={[
                styles.languageModalContent,
                {
                  maxWidth: Math.min(360, width - 32),
                  maxHeight: isShortScreen ? height * 0.85 : undefined,
                  padding: isSmallScreen ? 18 : 24,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.languageModalHeader}>
                <Ionicons
                  name="globe-outline"
                  size={isSmallScreen ? 32 : 40}
                  color="#E25A17"
                />
                <Text
                  style={[
                    styles.languageModalTitle,
                    isSmallScreen && { fontSize: 16 },
                  ]}
                >
                  {t("profile.selectLanguage")}
                </Text>
                <Text
                  style={[
                    styles.languageModalSubtitle,
                    isSmallScreen && { fontSize: 12 },
                  ]}
                >
                  {t("profile.defaultIsEnglish")}
                </Text>
              </View>
              <ScrollView
                style={isShortScreen ? { maxHeight: 200 } : undefined}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.languageOption,
                      (isSmallScreen || isTinyScreen) && {
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                      },
                      language === label && styles.languageOptionSelected,
                    ]}
                    onPress={() => handleSelectLanguage(label)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.languageOptionFlag,
                        (isSmallScreen || isTinyScreen) && { fontSize: 20 },
                      ]}
                    >
                      {flag}
                    </Text>
                    <Text
                      style={[
                        styles.languageOptionText,
                        (isSmallScreen || isTinyScreen) && { fontSize: 15 },
                        language === label && styles.languageOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {language === label && (
                      <Ionicons
                        name="checkmark-circle"
                        size={isSmallScreen || isTinyScreen ? 20 : 22}
                        color="#E25A17"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.languageModalCancel,
                  (isSmallScreen || isTinyScreen) && { marginTop: 8 },
                ]}
                onPress={() => setLanguageModalVisible(false)}
              >
                <Text
                  style={[
                    styles.languageModalCancelText,
                    (isSmallScreen || isTinyScreen) && { fontSize: 15 },
                  ]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={appAlertVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAppAlertVisible(false)}
        >
          <View style={styles.appAlertOverlay}>
            <View style={styles.appAlertCard}>
              <View style={styles.appAlertIconWrap}>
                <Ionicons name="alert-circle" size={22} color="#E25A17" />
              </View>
              <Text style={styles.appAlertTitle}>{t("register.notice")}</Text>
              <Text style={styles.appAlertMessage}>{appAlertMessage}</Text>
              <TouchableOpacity
                style={styles.appAlertButton}
                onPress={() => setAppAlertVisible(false)}
              >
                <Text style={styles.appAlertButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  keyboardView: { flex: 1 },
  keyboardAvoidWrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#E25A17" },
  languageButton: {
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 90, 23, 0.2)",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E25A17",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: { backgroundColor: "#E25A17" },
  stepLine: { width: 40, height: 2, backgroundColor: "#E0E0E0" },
  stepLineActive: { backgroundColor: "#E25A17" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  infoBannerTextContainer: { flex: 1, marginLeft: 12 },
  infoBannerText: { fontSize: 13, color: "#666", lineHeight: 20 },
  infoBannerBold: { fontWeight: "700", color: "#E25A17" },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sectionUnderline: {
    height: 2,
    backgroundColor: "#E25A17",
    width: 60,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  required: { color: "#E25A17" },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
    minHeight: 50,
  },
  phoneInputContainer: { flexDirection: "row", gap: 8 },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    gap: 6,
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 14, color: "#333", fontWeight: "500" },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
    minHeight: 50,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#E25A17",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#FFF5F0" },
  checkboxLabel: { fontSize: 14, color: "#333" },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E25A17",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  radioChecked: { borderColor: "#E25A17" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E25A17",
  },
  radioLabel: { fontSize: 14, color: "#333" },
  searchInputContainer: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  scannerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
  },
  scannerInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  scannerButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scanUploadButtonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  helperText: { fontSize: 12, color: "#999", marginTop: 8, lineHeight: 16 },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  eyeButton: { padding: 12 },
  footer: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    alignSelf: "center",
    maxWidth: 320,
    width: "85%",
  },
  nextButtonDisabled: { opacity: 0.7 },
  nextButtonGradient: { paddingVertical: 16, alignItems: "center" },
  nextButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  errorBannerText: { fontSize: 14, color: "#DC2626" },
  termsText: { fontSize: 12, color: "#999", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  countryOptionFlag: { fontSize: 24, marginRight: 12 },
  countryOptionLabel: { flex: 1, fontSize: 14, color: "#333" },
  countryOptionCode: { fontSize: 14, color: "#666", fontWeight: "500" },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successModalGradient: { padding: 32, alignItems: "center" },
  successIconContainer: { marginBottom: 20 },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.95,
  },
  successButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  successButtonText: { fontSize: 16, fontWeight: "700", color: "#E25A17" },
  successButtonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  successButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  qrScannerContainer: { flex: 1, backgroundColor: "#000" },
  qrPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  qrPermissionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
  },
  qrPermissionSubText: {
    color: "#999",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  qrCloseButton: {
    backgroundColor: "#E25A17",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
  },
  qrCloseButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  qrCamera: { flex: 1, width: "100%" },
  qrOverlay: { flex: 1, backgroundColor: "transparent" },
  qrTopOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  qrCenterRow: {
    flexDirection: "row",
    height: getScreenWidth() * 0.7,
  },
  qrSideOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)" },
  qrFrameContainer: {
    width: getScreenWidth() * 0.7,
    height: getScreenWidth() * 0.7,
    position: "relative" as const,
    justifyContent: "center",
    alignItems: "center",
  },
  qrCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#E25A17",
  },
  qrTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  qrTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  qrBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  qrBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  qrBottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  qrInstructionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  qrCancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  qrCancelButtonText: { color: "#E25A17", fontSize: 16, fontWeight: "600" },
  qrScannedOverlay: { alignItems: "center" },
  qrScannedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  agentQRSection: {
    marginTop: 24,
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E25A17",
  },
  agentQRHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  agentQRTitle: { fontSize: 16, fontWeight: "700", color: "#E25A17" },
  agentNumberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  agentNumberLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  agentNumberValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 8,
  },
  agentNumberSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  viewQRButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E25A17",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  viewQRButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  agentQRModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  agentQRModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  agentQRModalGradient: { padding: 24, alignItems: "center" },
  agentQRCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  agentQRIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  agentQRModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  agentQRModalSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 24,
    textAlign: "center",
  },
  qrCodeContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agentQRInfoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  agentQRInfoLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    marginBottom: 4,
  },
  agentQRInfoValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  agentQRInfoName: { fontSize: 14, color: "#FFFFFF", opacity: 0.9 },
  agentQRShareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  agentQRShareButtonText: { fontSize: 16, fontWeight: "700", color: "#E25A17" },
  agentQRHelpText: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 18,
  },
  contactFieldsContainerMobile: {
    flexDirection: "column",
    gap: 16,
  },
  contactFieldsContainerDesktop: {
    flexDirection: "row",
    gap: 12,
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
  // Language Modal
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  languageModalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#E25A17",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  languageModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  languageModalSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "transparent",
  },
  languageOptionSelected: {
    backgroundColor: "#FFF0E8",
    borderWidth: 2,
    borderColor: "#E25A17",
  },
  languageOptionFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  languageOptionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  languageOptionTextSelected: {
    fontWeight: "600",
    color: "#E25A17",
  },
  languageModalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  languageModalCancelText: {
    fontSize: 16,
    color: "#666",
  },
  appAlertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  appAlertCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE4D6",
    ...Platform.select({
      ios: {
        shadowColor: "#E25A17",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  appAlertIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF2EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  appAlertTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 8,
  },
  appAlertMessage: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  appAlertButton: {
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#E25A17",
    alignItems: "center",
  },
  appAlertButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  comingSoonBanner: {
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  comingSoonBannerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
