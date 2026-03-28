import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { unregisterIndieDevice } from "native-notify";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  disableBiometric,
  enableBiometric,
  getReferralCode,
  resendVerification,
  verifyEmail,
} from "../../configs/api";
import { useIdleTimeout } from "../../context/IdleTimeoutContext";
import { useLanguage } from "../../context/LanguageContext";
import { useLanguageModal } from "../../context/LanguageModalContext";
import { authenticateWithDeviceBiometrics } from "../../utils/biometricAuth";
import { useResponsive } from "../../utils/responsive";
import AccountDeletionModal from "../AccountDeletion/AccountDeletionModal";
import ActivityModal from '../components/ActivityModal';
interface UserData {
  email?: string;
  emailVerified?: boolean;
  biometricEnabled?: boolean;
}

const Settings = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { stopIdleSession, registerActivity, getActivityProps } = useIdleTimeout();
  const activityProps = getActivityProps();
  const { width: screenWidth, scale: scaleFn } = useResponsive();
  const scaled = (n: number) => Math.round(scaleFn(n));

  const [userData, setUserData] = useState<UserData | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [emailVerifyModalVisible, setEmailVerifyModalVisible] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Biometric state
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState("");
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [biometricToggleBusy, setBiometricToggleBusy] = useState(false);
  const [biometricShowPassword, setBiometricShowPassword] = useState(false);

  // Language state
  const { language } = useLanguage();
  const { openLanguageModal } = useLanguageModal();

  const loadUser = useCallback(async () => {
    const userJson = await AsyncStorage.getItem("user");
    let hasBioToken = false;
    try {
      hasBioToken = !!(await SecureStore.getItemAsync("biometricToken"));
    } catch {
      hasBioToken = false;
    }

    const lastLoggedEmail = (await AsyncStorage.getItem("lastLoggedEmail"))
      ?.trim()
      .toLowerCase();

    if (userJson) {
      try {
        const user = JSON.parse(userJson) as UserData & Record<string, unknown>;
        // Other screens often overwrite `user` with API payloads that omit biometricEnabled.
        const explicit = user.biometricEnabled;
        let biometricEnabled: boolean;
        if (explicit === false) {
          biometricEnabled = false;
        } else if (explicit === true) {
          biometricEnabled = true;
        } else {
          biometricEnabled = hasBioToken;
        }
        if (
          hasBioToken &&
          explicit !== false &&
          explicit !== true
        ) {
          try {
            await AsyncStorage.setItem(
              "user",
              JSON.stringify({ ...user, biometricEnabled: true }),
            );
          } catch {
            /* ignore */
          }
        }
        const emailFromUser =
          typeof user.email === "string" && user.email.trim()
            ? user.email.trim()
            : "";
        const resolvedEmail = emailFromUser || lastLoggedEmail || undefined;
        setUserData({
          email: resolvedEmail,
          emailVerified: user.emailVerified,
          biometricEnabled,
        });
      } catch (_) {}
    } else {
      setUserData({
        email: lastLoggedEmail || undefined,
        emailVerified: false,
        biometricEnabled: hasBioToken,
      });
    }
  }, []);

  const loadReferralCode = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) return;
    setReferralError(null);
    setReferralLoading(true);
    try {
      const result = await getReferralCode(accessToken);
      if (result.success && result.referralCode) {
        setReferralCode(result.referralCode);
      } else if (result.error) {
        setReferralError(result.error);
      }
    } catch (_) {
      setReferralError(t("settings.failedToLoadReferral"));
    } finally {
      setReferralLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUser();

    // Check if user is still authenticated
    const checkAuth = async () => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        // User is not authenticated, redirect to Passcode
        (navigation as any).reset({
          index: 0,
          routes: [{ name: "Passcode" }],
        });
      }
    };

    checkAuth();
  }, [loadUser, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  useEffect(() => {
    loadReferralCode();
  }, [loadReferralCode]);

  useEffect(() => {
    // Check if device supports biometrics
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes =
          await LocalAuthentication.supportedAuthenticationTypesAsync();

        setHasBiometricHardware(compatible && enrolled);

        if (
          supportedTypes.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          setBiometricType("Face ID");
        } else if (
          supportedTypes.includes(
            LocalAuthentication.AuthenticationType.FINGERPRINT,
          )
        ) {
          setBiometricType(Platform.OS === "ios" ? "Touch ID" : "Biometrics");
        } else if (
          supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
        ) {
          setBiometricType("Iris Scanner");
        }
      } catch (e) {
        console.error("LocalAuthentication Error:", e);
      }
    };
    checkBiometrics();
  }, []);

  /** Sign out: navigate to Passcode page while keeping session active (tokens remain). */
  const handleSignOut = async () => {
    // Stop the idle session timer
    await stopIdleSession();

    try {
      // Clear the passcode login flag
      await AsyncStorage.removeItem("passcodeLoginComplete");

      // Unregister Push Notifications and save email
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj?.email) {
          await AsyncStorage.setItem(
            "lastLoggedEmail",
            userObj.email.toLowerCase(),
          );
        }

        const userId = userObj?.id || userObj?._id;
        const appId = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID;
        const appToken = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN;
        if (userId && appId && appToken) {
          unregisterIndieDevice(String(userId), Number(appId), appToken);
        }
      }

      // Clear user data
      await AsyncStorage.removeItem("user");
    } catch (_) {}

    // Navigate to Passcode screen
    (navigation as any).reset({
      index: 0,
      routes: [{ name: "Passcode" }],
    });
  };

  const handleReferralCodeAction = async () => {
    if (referralLoading) return;
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
      if (Platform.OS === "android") {
        ToastAndroid.show(t("settings.copySuccess"), ToastAndroid.SHORT);
      }
      return;
    }
    loadReferralCode();
  };

  const handleVerifyEmail = async () => {
    const email = userData?.email?.trim();
    if (!email) {
      setEmailVerifyError(t("settings.emailNotFound"));
      return;
    }
    const otp = emailOtp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setEmailVerifyError(t("settings.enter6DigitCode"));
      return;
    }
    setEmailVerifyError(null);
    setEmailVerifyLoading(true);
    try {
      const result = await verifyEmail(email, otp);
      if (result.success) {
        setEmailVerifySuccess(true);
        setUserData((prev) => (prev ? { ...prev, emailVerified: true } : null));
        const userJson = await AsyncStorage.getItem("user");
        if (userJson) {
          const user = JSON.parse(userJson) as UserData;
          await AsyncStorage.setItem(
            "user",
            JSON.stringify({ ...user, emailVerified: true }),
          );
        }
      } else {
        setEmailVerifyError(result.error || t("settings.verificationFailed"));
      }
    } catch (_) {
      setEmailVerifyError(t("settings.unexpectedError"));
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = userData?.email?.trim();
    if (!email) return;
    setEmailVerifyError(null);
    setResendLoading(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        setEmailVerifyError(null);
        setEmailOtp("");
      } else {
        setEmailVerifyError(result.error || t("settings.failedToResend"));
      }
    } catch (_) {
      setEmailVerifyError(t("settings.failedToResend"));
    } finally {
      setResendLoading(false);
    }
  };

  const openEmailVerifyModal = () => {
    setEmailVerifyModalVisible(true);
    setEmailOtp("");
    setEmailVerifyError(null);
    setEmailVerifySuccess(false);
  };

  const closeEmailVerifyModal = () => {
    setEmailVerifyModalVisible(false);
    setEmailOtp("");
    setEmailVerifyError(null);
    setEmailVerifySuccess(false);
  };

  const handleEmailVerifyDone = () => {
    closeEmailVerifyModal();
  };

  const showBiometricMessage = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert(t("settings.title"), message);
    }
  };

  const handleToggleBiometric = async () => {
    if (biometricToggleBusy || biometricLoading) return;

    if (userData?.biometricEnabled) {
      setBiometricToggleBusy(true);
      setBiometricError(null);
      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) {
          showBiometricMessage(t("settings.unexpectedError"));
          return;
        }
        const res = await disableBiometric(accessToken);
        if (!res.success) {
          showBiometricMessage(
            res.error || "Could not disable biometric login on the server.",
          );
          return;
        }
        try {
          await SecureStore.deleteItemAsync("biometricToken");
        } catch {
          /* ignore missing key */
        }
        await AsyncStorage.removeItem("biometricEmail");

        setUserData((prev) =>
          prev ? { ...prev, biometricEnabled: false } : null,
        );
        const userJson = await AsyncStorage.getItem("user");
        if (userJson) {
          const user = JSON.parse(userJson);
          await AsyncStorage.setItem(
            "user",
            JSON.stringify({ ...user, biometricEnabled: false }),
          );
        }
      } catch (e) {
        console.error("Failed to disable biometric", e);
        showBiometricMessage(t("settings.unexpectedError"));
      } finally {
        setBiometricToggleBusy(false);
      }
    } else {
      // If we still have a device token from before a successful disable, the server may
      // still have biometrics enabled — verifyBiometric on Passcode remains authoritative.
      // Re-enabling here only restores local UI + passcode button; invalid tokens fail at verify.
      try {
        const savedToken = await SecureStore.getItemAsync("biometricToken");
        if (savedToken) {
          const authResult = await authenticateWithDeviceBiometrics({
            promptMessage: t("settings.biometricConfirmPrompt", {
              type: biometricType,
            }),
            fallbackLabel: t("passcode.useFallback"),
            cancelLabel: t("common.cancel"),
          });

          if (!authResult.success) {
            setBiometricError(t("settings.biometricLocalAuthFailed"));
            return;
          }

          setUserData((prev) =>
            prev ? { ...prev, biometricEnabled: true } : null,
          );
          const userJson = await AsyncStorage.getItem("user");
          if (userJson) {
            const user = JSON.parse(userJson);
            await AsyncStorage.setItem(
              "user",
              JSON.stringify({ ...user, biometricEnabled: true }),
            );
          }
          return;
        }
      } catch (e) {
        console.error("Failed to re-enable biometric with existing token", e);
      }

      setBiometricPassword("");
      setBiometricError(null);
      setBiometricShowPassword(false);
      setBiometricModalVisible(true);
    }
  };

  const handleEnableBiometric = async () => {
    const trimmedPassword = biometricPassword.trim();
    const lastLogged = (await AsyncStorage.getItem("lastLoggedEmail"))
      ?.trim()
      .toLowerCase();
    let accountEmail =
      (userData?.email && userData.email.trim().toLowerCase()) || lastLogged || "";

    if (!accountEmail) {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw) as { email?: string };
          if (u?.email && String(u.email).trim()) {
            accountEmail = String(u.email).trim().toLowerCase();
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (!trimmedPassword) {
      setBiometricError(t("settings.biometricPasswordRequired"));
      return;
    }

    if (!accountEmail) {
      setBiometricError(t("settings.biometricEmailMissing"));
      return;
    }

    if (trimmedPassword.length < 6) {
      setBiometricError(t("settings.biometricPasswordMinLength"));
      return;
    }

    setBiometricLoading(true);
    setBiometricError(null);

    try {
      // 1. Authenticate with local biometrics first
      const authResult = await authenticateWithDeviceBiometrics({
        promptMessage: t("settings.biometricConfirmPrompt", {
          type: biometricType,
        }),
        fallbackLabel: t("passcode.useFallback"),
        cancelLabel: t("common.cancel"),
      });

      if (!authResult.success) {
        setBiometricError(t("settings.biometricLocalAuthFailed"));
        setBiometricLoading(false);
        return;
      }

      // 2. Call backend to enable
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) throw new Error("No access token");

      const res = await enableBiometric(
        accessToken,
        accountEmail,
        trimmedPassword,
      );

      if (res.success && res.token) {
        // 3. Store token securely
        await SecureStore.setItemAsync("biometricToken", res.token);
        await AsyncStorage.setItem("biometricEmail", accountEmail);

        // 4. Update UI state
        setUserData((prev) =>
          prev
            ? { ...prev, email: accountEmail, biometricEnabled: true }
            : null,
        );

        // 5. Update async storage (preserve email if API-cached user dropped it)
        const userJson = await AsyncStorage.getItem("user");
        if (userJson) {
          const user = JSON.parse(userJson) as Record<string, unknown>;
          await AsyncStorage.setItem(
            "user",
            JSON.stringify({
              ...user,
              email: user.email || accountEmail,
              biometricEnabled: true,
            }),
          );
        }

        setBiometricShowPassword(false);
        setBiometricModalVisible(false);
      } else {
        const raw = (res.error || "").trim();
        const lower = raw.toLowerCase();
        if (!raw) {
          setBiometricError(t("settings.biometricEnableServerError"));
        } else if (lower === "invalid credentials") {
          setBiometricError(t("settings.biometricInvalidCredentials"));
        } else {
          setBiometricError(raw);
        }
      }
    } catch (e: any) {
      setBiometricError(e.message || "An unexpected error occurred.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const securityOptions = [
    {
      id: 1,
      icon: "lock-closed-outline" as const,
      titleKey: "settings.changePasscode",
      subtitleKey: "settings.updatePinSubtitle",
      onPress: () =>
        (navigation as { navigate: (name: string) => void }).navigate(
          "ChangePasscode",
        ),
    },
    {
      id: 2,
      icon: "close-circle-outline" as const,
      titleKey: "settings.deleteAccount",
      subtitleKey: "",
      onPress: () =>
        (navigation as { navigate: (name: string) => void }).navigate(
          "DeleteAccount",
        ),
    },
  ];

  const supportOptions = [
    {
      id: 1,
      icon: "information-circle-outline" as const,
      titleKey: "settings.aboutUs",
      onPress: () =>
        (navigation as { navigate: (name: string) => void }).navigate(
          "Aboutus",
        ),
    },
    {
      id: 2,
      icon: "shield-outline" as const,
      titleKey: "settings.privacyPolicy",
      onPress: () =>
        (navigation as { navigate: (name: string) => void }).navigate(
          "PrivacyPolicy",
        ),
    },
    {
      id: 3,
      icon: "document-text-outline" as const,
      titleKey: "settings.termsAndCondition",
      onPress: () =>
        (navigation as { navigate: (name: string) => void }).navigate(
          "TermsConditions",
        ),
    },
  ];

  const preferencesOptions = [
    {
      id: 4,
      icon: "calculator-outline" as const,
      titleKey: "settings.currencyCalculator",
      subtitleKey: "settings.currencyCalculatorSubtitle",
      onPress: () =>
        (navigation as { navigate: (name: string) => void }).navigate(
          "CurrencyCalculator",
        ),
    },
    {
      id: 5,
      icon: "language-outline" as const,
      titleKey: "profile.language",
      subtitleKey: "",
      onPress: openLanguageModal,
    },
  ];

  const securityOptionsWithLabels = securityOptions.map((o) => {
    const opt = o as { title?: string; titleKey?: string };
    return {
      ...o,
      title: opt.title ?? (opt.titleKey ? t(opt.titleKey) : ""),
      subtitle: o.subtitleKey ? t(o.subtitleKey) : "",
    };
  });

  const supportOptionsWithLabels = supportOptions.map((o) => ({
    ...o,
    title: t(o.titleKey ?? ""),
  }));

  const preferencesOptionsWithLabels = preferencesOptions.map((o) => {
    let titleStr = t(o.titleKey ?? "");
    // Capitalize the first letter of the Language option and lowercase the rest
    if (o.id === 5 && titleStr) {
      titleStr =
        titleStr.charAt(0).toUpperCase() + titleStr.slice(1).toLowerCase();
    }
    return {
      ...o,
      title: titleStr,
      subtitle: o.id === 5 ? language : t(o.subtitleKey ?? ""), // Show selected language explicitly
    };
  });

  const r = {
    header: {
      paddingHorizontal: scaled(16),
      paddingTop: scaled(14),
      paddingBottom: scaled(16),
    },
    backButton: {
      padding: scaled(8),
      minWidth: scaled(44),
      minHeight: scaled(44),
    },
    headerTitle: { fontSize: scaled(18) },
    headerSpacer: { width: scaled(44) },
    content: { paddingHorizontal: scaled(16) },
    contentContainer: { paddingBottom: scaled(40) },
    sectionTitle: {
      fontSize: scaled(18),
      marginBottom: scaled(12),
      marginTop: scaled(8),
    },
    sectionCard: { borderRadius: scaled(12), marginBottom: scaled(18) },
    optionItem: { paddingVertical: scaled(14), paddingHorizontal: scaled(16) },
    optionText: { marginRight: scaled(8) },
    iconContainer: {
      width: scaled(40),
      height: scaled(40),
      borderRadius: scaled(12),
      marginRight: scaled(12),
    },
    optionTitle: { fontSize: scaled(15) },
    optionSubtitle: { fontSize: scaled(12), marginTop: scaled(2) },
    referralOptionItem: {
      paddingVertical: scaled(14),
      paddingHorizontal: scaled(16),
    },
    generateButtonText: { fontSize: scaled(14) },
    referralError: { paddingHorizontal: scaled(16), paddingBottom: scaled(12) },
    referralErrorText: { fontSize: scaled(12) },
    signOutButton: {
      borderRadius: scaled(12),
      paddingVertical: scaled(16),
      marginBottom: scaled(32),
    },
    signOutText: { fontSize: scaled(14), marginLeft: scaled(8) },
    modalOverlay: { padding: scaled(20) },
    modalContent: {
      padding: scaled(20),
      borderRadius: scaled(16),
      width: Math.min(screenWidth - scaled(40), 400),
    },
    modalHeader: { marginBottom: scaled(16) },
    modalTitle: { fontSize: scaled(18) },
    modalSubtitle: { fontSize: scaled(14), marginBottom: scaled(12) },
    otpInputWrapper: {
      marginBottom: scaled(12),
      borderRadius: scaled(8),
    },
    otpInput: {
      paddingHorizontal: scaled(16),
      paddingVertical: scaled(14),
      fontSize: scaled(18),
    },
    otpPlaceholderText: {
      fontSize: scaled(18),
    },
    modalButton: {
      borderRadius: scaled(8),
      paddingVertical: scaled(14),
      marginBottom: scaled(8),
    },
    modalButtonText: { fontSize: scaled(16) },
    resendButton: { paddingVertical: scaled(12) },
    resendButtonText: { fontSize: scaled(14) },
    emailVerifySuccess: { paddingVertical: scaled(20) },
    emailVerifySuccessText: {
      fontSize: scaled(16),
      marginTop: scaled(12),
      marginBottom: scaled(20),
    },
    iconSize: scaled(24),
    iconSizeSmall: scaled(20),
    iconSizeLarge: scaled(48),
    backIconSize: scaled(28),
    passwordInput: {
      paddingHorizontal: scaled(16),
      paddingVertical: scaled(14),
      fontSize: scaled(16),
      marginBottom: scaled(16),
      borderRadius: scaled(8),
    },
    biometricPasswordRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E0E0E0",
      borderRadius: scaled(8),
      marginBottom: scaled(16),
    },
    biometricPasswordField: {
      flex: 1,
      paddingHorizontal: scaled(16),
      paddingVertical: scaled(14),
      fontSize: scaled(16),
      color: "#333",
    },
    biometricEyeButton: {
      paddingHorizontal: scaled(12),
      paddingVertical: scaled(12),
    },
  };

  const isInitialLoading = !userData;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#DE5212" />
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <LinearGradient
          colors={["#DE5212", "#F38B35"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0.01, 1]}
          style={[styles.header, r.header]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Main")}
              style={[styles.backButton, r.backButton]}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="arrow-back"
                size={r.backIconSize}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, r.headerTitle]} numberOfLines={1}>
              {t("settings.title")}
            </Text>
            <View style={[styles.headerSpacer, r.headerSpacer]} />
          </View>
        </LinearGradient>

        <ScrollView
          style={[styles.content, r.content]}
          contentContainerStyle={r.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, r.sectionTitle]}>
            {t("settings.referral")}
          </Text>
          <View style={[styles.sectionCard, r.sectionCard]}>
            <TouchableOpacity
              style={[styles.referralOptionItem, r.referralOptionItem]}
              onPress={handleReferralCodeAction}
              disabled={referralLoading || isInitialLoading}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconContainer, r.iconContainer]}>
                  <Ionicons
                    name="gift-outline"
                    size={r.iconSize}
                    color="#F38B35"
                  />
                </View>
                <View style={[styles.optionText, r.optionText]}>
                  <Text
                    style={[styles.optionTitle, r.optionTitle]}
                    numberOfLines={1}
                  >
                    {t("settings.myReferralCode")}
                  </Text>
                  <Text
                    style={[styles.optionSubtitle, r.optionSubtitle]}
                    numberOfLines={1}
                  >
                    {isInitialLoading
                      ? t("settings.loading")
                      : referralLoading
                        ? t("settings.loading")
                        : referralCode || t("settings.tapToRefresh")}
                  </Text>
                </View>
              </View>
              {referralLoading ? (
                <ActivityIndicator size="small" color="#F38B35" />
              ) : (
                <Text style={[styles.generateButtonText, r.generateButtonText]}>
                  {copySuccess ? t("settings.copySuccess") : t("settings.copy")}
                </Text>
              )}
            </TouchableOpacity>
            {referralError ? (
              <View style={[styles.referralError, r.referralError]}>
                <Text style={[styles.referralErrorText, r.referralErrorText]}>
                  {referralError}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, r.sectionTitle]}>
            {t("settings.emailVerification")}
          </Text>
          <View style={[styles.sectionCard, r.sectionCard]}>
            <View style={[styles.referralOptionItem, r.referralOptionItem]}>
              <View style={styles.optionLeft}>
                <View style={[styles.iconContainer, r.iconContainer]}>
                  <Ionicons
                    name="mail-outline"
                    size={r.iconSize}
                    color="#F38B35"
                  />
                </View>
                <View style={[styles.optionText, r.optionText]}>
                  <Text
                    style={[styles.optionTitle, r.optionTitle]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {userData?.email || t("settings.loading")}
                  </Text>
                  <Text style={[styles.optionSubtitle, r.optionSubtitle]}>
                    {userData?.emailVerified
                      ? t("settings.verified")
                      : t("settings.notVerified")}
                  </Text>
                </View>
              </View>
              {!isInitialLoading &&
              !userData?.emailVerified &&
              userData?.email ? (
                <TouchableOpacity onPress={() => openEmailVerifyModal()}>
                  <Text
                    style={[styles.generateButtonText, r.generateButtonText]}
                  >
                    {t("settings.verify")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name="checkmark-circle"
                  size={r.iconSize}
                  color="#22C55E"
                />
              )}
            </View>
          </View>

          <Text style={[styles.sectionTitle, r.sectionTitle]}>
            {t("settings.security")}
          </Text>
          <View style={[styles.sectionCard, r.sectionCard]}>
            {securityOptionsWithLabels.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  r.optionItem,
                  (index !== securityOptions.length - 1 ||
                    hasBiometricHardware) &&
                    styles.optionBorder,
                ]}
                onPress={option.onPress}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, r.iconContainer]}>
                    <Ionicons
                      name={option.icon}
                      size={r.iconSize}
                      color="#F38B35"
                    />
                  </View>
                  <View style={[styles.optionText, r.optionText]}>
                    <Text
                      style={[styles.optionTitle, r.optionTitle]}
                      numberOfLines={1}
                    >
                      {option.title}
                    </Text>
                    {option.subtitle ? (
                      <Text
                        style={[styles.optionSubtitle, r.optionSubtitle]}
                        numberOfLines={1}
                      >
                        {option.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={r.iconSizeSmall}
                  color="#CCC"
                />
              </TouchableOpacity>
            ))}

            {hasBiometricHardware && (
              <TouchableOpacity
                style={[styles.optionItem, r.optionItem]}
                onPress={handleToggleBiometric}
                disabled={biometricToggleBusy || biometricLoading}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, r.iconContainer]}>
                    <Ionicons
                      name={Platform.OS === "ios" ? "scan" : "finger-print"}
                      size={r.iconSize}
                      color="#F38B35"
                    />
                  </View>
                  <View style={[styles.optionText, r.optionText]}>
                    <Text
                      style={[styles.optionTitle, r.optionTitle]}
                      numberOfLines={1}
                    >
                      {t("settings.biometricLogin", { type: biometricType })}
                    </Text>
                    <Text
                      style={[styles.optionSubtitle, r.optionSubtitle]}
                      numberOfLines={2}
                    >
                      {t("settings.biometricSubtitle", { type: biometricType })}
                    </Text>
                  </View>
                </View>
                {biometricToggleBusy ? (
                  <ActivityIndicator size="small" color="#F38B35" />
                ) : (
                  <View
                    style={[
                      styles.toggleSwitch,
                      userData?.biometricEnabled && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        userData?.biometricEnabled && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.sectionTitle, r.sectionTitle]}>
            {t("settings.preferences")}
          </Text>
          <View style={[styles.sectionCard, r.sectionCard]}>
            {preferencesOptionsWithLabels.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  r.optionItem,
                  index !== preferencesOptions.length - 1 &&
                    styles.optionBorder,
                ]}
                onPress={option.onPress}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, r.iconContainer]}>
                    <Ionicons
                      name={option.icon}
                      size={r.iconSize}
                      color="#F38B35"
                    />
                  </View>
                  <View style={[styles.optionText, r.optionText]}>
                    <Text
                      style={[styles.optionTitle, r.optionTitle]}
                      numberOfLines={1}
                    >
                      {option.title}
                    </Text>
                    {option.subtitle ? (
                      <Text
                        style={[styles.optionSubtitle, r.optionSubtitle]}
                        numberOfLines={1}
                      >
                        {option.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={r.iconSizeSmall}
                  color="#CCC"
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, r.sectionTitle]}>
            {t("settings.supportAndLegal")}
          </Text>

          <View style={[styles.sectionCard, r.sectionCard]}>
            {supportOptionsWithLabels.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  r.optionItem,
                  index !== supportOptions.length - 1 && styles.optionBorder,
                ]}
                onPress={option.onPress}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, r.iconContainer]}>
                    <Ionicons
                      name={option.icon}
                      size={r.iconSize}
                      color="#F38B35"
                    />
                  </View>
                  <View style={[styles.optionText, r.optionText]}>
                    <Text
                      style={[styles.optionTitle, r.optionTitle]}
                      numberOfLines={1}
                    >
                      {option.title}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={r.iconSizeSmall}
                  color="#CCC"
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.signOutButton, r.signOutButton]}
            onPress={handleSignOut}
          >
            <Ionicons
              name="log-out-outline"
              size={r.iconSizeSmall}
              color="#666"
            />
            <Text style={[styles.signOutText, r.signOutText]}>
              {t("settings.signOut")}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <ActivityModal
          visible={emailVerifyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeEmailVerifyModal}
        >
          <View style={[styles.modalOverlay, r.modalOverlay]} {...activityProps}>
            <View style={[styles.emailVerifyModalContent, r.modalContent]} {...activityProps}>
              <View style={[styles.modalHeader, r.modalHeader]}>
                <Text
                  style={[styles.modalTitle, r.modalTitle]}
                  numberOfLines={1}
                >
                  {t("settings.verifyEmail")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    registerActivity();
                    closeEmailVerifyModal();
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={r.iconSize} color="#333" />
                </TouchableOpacity>
              </View>
              {emailVerifySuccess ? (
                <View style={[styles.emailVerifySuccess, r.emailVerifySuccess]}>
                  <Ionicons
                    name="checkmark-circle"
                    size={r.iconSizeLarge}
                    color="#22C55E"
                  />
                  <Text
                    style={[
                      styles.emailVerifySuccessText,
                      r.emailVerifySuccessText,
                    ]}
                  >
                    {t("settings.emailVerifiedSuccess")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      r.modalButton,
                      styles.modalDoneButton,
                    ]}
                    onPress={() => {
                      registerActivity();
                      handleEmailVerifyDone();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modalButtonText,
                        r.modalButtonText,
                        styles.modalDoneButtonText,
                      ]}
                    >
                      {t("settings.done")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text
                    style={[styles.modalSubtitle, r.modalSubtitle]}
                    numberOfLines={2}
                  >
                    {t("settings.enterCodeSentTo")} {userData?.email}
                  </Text>
                  <View style={[styles.otpInputWrapper, r.otpInputWrapper]}>
                    <TextInput
                      style={[styles.otpInput, r.otpInput]}
                      placeholder=""
                      value={emailOtp}
                      onChangeText={(val) => {
                        registerActivity();
                        setEmailOtp(val.replace(/\D/g, "").slice(0, 6));
                        setEmailVerifyError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      underlineColorAndroid="transparent"
                    />
                    {emailOtp.length === 0 ? (
                      <View
                        style={styles.otpPlaceholderOverlay}
                        pointerEvents="none"
                      >
                        <Text
                          style={[
                            styles.otpPlaceholderText,
                            r.otpPlaceholderText,
                          ]}
                        >
                          {t("settings.otpPlaceholder")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {emailVerifyError ? (
                    <Text
                      style={[styles.referralErrorText, r.referralErrorText]}
                    >
                      {emailVerifyError}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      r.modalButton,
                      emailVerifyLoading && styles.modalButtonDisabled,
                    ]}
                    onPress={() => {
                      registerActivity();
                      handleVerifyEmail();
                    }}
                    disabled={emailVerifyLoading || emailOtp.length !== 6}
                  >
                    {emailVerifyLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.modalButtonText, r.modalButtonText]}>
                        {t("settings.verify")}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resendButton, r.resendButton]}
                    onPress={() => {
                      registerActivity();
                      handleResendVerification();
                    }}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <ActivityIndicator size="small" color="#F38B35" />
                    ) : (
                      <Text
                        style={[styles.resendButtonText, r.resendButtonText]}
                      >
                        {t("settings.resendVerificationEmail")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ActivityModal>

        {/* Biometric Setup Modal */}
        <ActivityModal
          visible={biometricModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setBiometricShowPassword(false);
            setBiometricModalVisible(false);
          }}
        >
          <View style={[styles.modalOverlay, r.modalOverlay]} {...activityProps}>
            <View style={[styles.emailVerifyModalContent, r.modalContent]} {...activityProps}>
              <View style={[styles.modalHeader, r.modalHeader]}>
                <Text
                  style={[styles.modalTitle, r.modalTitle]}
                  numberOfLines={1}
                >
                  {t("settings.enableBiometric", { type: biometricType })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    registerActivity();
                    setBiometricShowPassword(false);
                    setBiometricModalVisible(false);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={r.iconSize} color="#333" />
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.modalSubtitle, r.modalSubtitle]}
                numberOfLines={3}
              >
                {t("settings.biometricEnablePasswordSubtitle", {
                  type: biometricType,
                })}
              </Text>

              <View style={[styles.biometricPasswordRow, r.biometricPasswordRow]}>
                <TextInput
                  style={[styles.biometricPasswordField, r.biometricPasswordField]}
                  placeholder={t("settings.enableBiometricPasswordPlaceholder", {
                    type: biometricType,
                  })}
                  placeholderTextColor="#999"
                  value={biometricPassword}
                  onChangeText={(val) => {
                    registerActivity();
                    setBiometricPassword(val);
                    setBiometricError(null);
                  }}
                  secureTextEntry={!biometricShowPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  editable={!biometricLoading}
                />
                <TouchableOpacity
                  style={[styles.biometricEyeButton, r.biometricEyeButton]}
                  onPress={() => {
                    registerActivity();
                    setBiometricShowPassword((s) => !s);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    biometricShowPassword
                      ? t("settings.hidePassword")
                      : t("settings.showPassword")
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={
                      biometricShowPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={r.iconSizeSmall}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {biometricError ? (
                <Text
                  style={[
                    styles.referralErrorText,
                    r.referralErrorText,
                    { marginBottom: 12 },
                  ]}
                >
                  {biometricError}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  r.modalButton,
                  biometricLoading && styles.modalButtonDisabled,
                ]}
                onPress={() => {
                  registerActivity();
                  handleEnableBiometric();
                }}
                disabled={biometricLoading || !biometricPassword}
              >
                {biometricLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, r.modalButtonText]}>
                    {t("settings.enable")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ActivityModal>

        <AccountDeletionModal />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    minWidth: 0,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#FFF1E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    opacity: 0.7,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  referralOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  generateButtonText: {
    fontSize: 14,
    color: "#F38B35",
    fontWeight: "600",
  },
  referralError: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  referralErrorText: {
    fontSize: 12,
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emailVerifyModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  otpInputWrapper: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 12,
  },
  otpInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: "center",
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  otpPlaceholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  otpPlaceholderText: {
    fontSize: 18,
    color: "#999",
  },
  modalButton: {
    backgroundColor: "#F38B35",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalDoneButton: {
    width: "100%",
    minHeight: 52,
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 20,
  },
  modalDoneButtonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  recentTransactionText: {
    color: "#8e8e93",
    fontSize: 14,
    fontFamily: "SF-Pro-Rounded-Medium",
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  resendButtonText: {
    fontSize: 14,
    color: "#F38B35",
    fontWeight: "500",
  },
  emailVerifySuccess: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emailVerifySuccessText: {
    fontSize: 16,
    color: "#22C55E",
    marginTop: 12,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: "#E8E8E8",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginLeft: 8,
    letterSpacing: 1,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: "#DE5212", // Orange theme
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: "#333",
  },
  biometricPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 16,
  },
  biometricPasswordField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  biometricEyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});

export default Settings;
