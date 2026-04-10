import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  login,
  resetPasscode,
  verifyBiometric,
  verifyPasscode,
} from "../../configs/api";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from "../../constants/locales";
import { useIdleTimeout } from "../../context/IdleTimeoutContext";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";
import { authenticateWithDeviceBiometrics } from "../../utils/biometricAuth";
import { useResponsive } from "../../utils/responsive";
import Loader from "../Loader/Loader";

import ActivityModal from '../components/ActivityModal';
const GRADIENT_START = "#E15816";
const GRADIENT_END = "#F48F38";
const WHITE = "#FFFFFF";

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  onInteract?: () => void;
  title: string;
  message: string;
  type?: string;
  confirmText?: string;
  onConfirm?: (() => void) | null;
}

function MessageModal({
  visible,
  onClose,
  onInteract,
  title,
  message,
  confirmText = "OK",
  onConfirm,
}: MessageModalProps) {
  const { width } = useWindowDimensions();
  const { isTinyScreen, horizontalPadding } = useResponsive();
  if (!visible) return null;
  const padH = Math.max(12, horizontalPadding);
  return (
    <ActivityModal transparent animationType="fade" visible={visible}>
      <KeyboardAvoidingView
        style={msgStyles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
      >
        <Pressable
          style={[msgStyles.overlay, { paddingHorizontal: padH, paddingVertical: isTinyScreen ? 12 : 24 }]}
          onPress={() => {
            onInteract?.();
            onClose();
          }}
          onTouchStart={onInteract}
        >
          <View
            style={[
              msgStyles.box,
              isTinyScreen && { padding: 20, borderRadius: 16, maxWidth: Math.min(340, width - padH * 2) },
            ]}
          >
            <Text style={[msgStyles.title, isTinyScreen && { fontSize: 17, marginBottom: 8 }]}>
              {title}
            </Text>
            <Text style={[msgStyles.message, isTinyScreen && { fontSize: 14, marginBottom: 18, lineHeight: 20 }]}>
              {message}
            </Text>
            <TouchableOpacity
              style={[msgStyles.button, isTinyScreen && { paddingVertical: 12 }]}
              onPress={() => {
                onInteract?.();
                if (onConfirm) onConfirm();
                onClose();
              }}
            >
              <Text style={[msgStyles.buttonText, isTinyScreen && { fontSize: 15 }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </ActivityModal>
  );
}

const msgStyles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: GRADIENT_START,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    minWidth: 120,
    alignItems: "center",
  },
  buttonText: { color: WHITE, fontSize: 16, fontWeight: "600" },
});

const RESET_PIN_FIELD_BG = "#f9f9f9";
const PIN_LENGTH = 4;

const toAsciiDigit = (char: string): string | null => {
  if (char >= "0" && char <= "9") return char;
  const code = char.codePointAt(0);
  if (code === undefined) return null;

  // Support common Unicode decimal ranges produced by non-English keypads.
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  if (code >= 0x0966 && code <= 0x096f) return String(code - 0x0966);
  if (code >= 0xff10 && code <= 0xff19) return String(code - 0xff10);
  return null;
};

const normalizePinDigits = (value: string): string => {
  const normalized = value.normalize("NFKC");
  let out = "";
  for (const char of normalized) {
    const digit = toAsciiDigit(char);
    if (!digit) continue;
    out += digit;
    if (out.length === PIN_LENGTH) break;
  }
  return out;
};

type ResetPinDigitFieldProps = {
  value: string;
  onChangeDigits: (digits: string) => void;
  placeholder: string;
  returnKeyType: "next" | "done";
  isSmallScreen: boolean;
  isTinyScreen: boolean;
  /** When user taps IME Next/Done (Android) or hardware action. iOS `number-pad` has no return key. */
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  /** After 4 digits, move focus (works on all platforms). */
  onPinFilled?: () => void;
};

/** Numeric keypad; bullets on an opaque overlay — Android still paints digits when `color` is transparent under the previous layout. */
const ResetPinDigitField = forwardRef<TextInput, ResetPinDigitFieldProps>(
  function ResetPinDigitField(
    {
      value,
      onChangeDigits,
      placeholder,
      returnKeyType,
      isSmallScreen,
      isTinyScreen,
      onSubmitEditing,
      blurOnSubmit = returnKeyType === "done",
      onPinFilled,
    },
    ref,
  ) {
  const pv = isTinyScreen ? 9 : isSmallScreen ? 10 : 12;
  const ph = isTinyScreen ? 12 : 16;
  const fs = isTinyScreen ? 14 : isSmallScreen ? 15 : 16;
  /** Android `number-pad` often omits IME Next/Done; `phone-pad` still yields digits and shows the action key. */
  const keyboardType =
    Platform.OS === "android" ? "phone-pad" : "number-pad";
  return (
    <View
      style={[
        resetPinDigitStyles.shell,
        { minHeight: pv * 2 + fs + 6 },
      ]}
    >
      <TextInput
        ref={ref}
        style={[
          StyleSheet.absoluteFillObject,
          {
            paddingHorizontal: ph,
            paddingVertical: pv,
            fontSize: fs,
            /** Match field bg so any Android glyph peek-through is invisible. */
            color: RESET_PIN_FIELD_BG,
          },
        ]}
        selectionColor="transparent"
        underlineColorAndroid="transparent"
        value={value}
        onChangeText={(v) => {
          const d = normalizePinDigits(v);
          onChangeDigits(d);
          if (d.length === PIN_LENGTH && onPinFilled) {
            queueMicrotask(() => onPinFilled());
          }
        }}
        keyboardType={keyboardType}
        maxLength={PIN_LENGTH}
        caretHidden
        autoCorrect={false}
        spellCheck={false}
        importantForAutofill="no"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        enablesReturnKeyAutomatically
      />
      <View
        pointerEvents="none"
        collapsable={false}
        style={[
          StyleSheet.absoluteFillObject,
          {
            zIndex: 1,
            backgroundColor: RESET_PIN_FIELD_BG,
            paddingHorizontal: ph,
            paddingVertical: pv,
            justifyContent: "center",
          },
        ]}
      >
        <Text
          style={{
            fontSize: fs,
            color: value.length > 0 ? "#333" : "#666",
            letterSpacing: value.length > 0 ? 4 : 0,
          }}
        >
          {value.length > 0 ? "\u2022".repeat(value.length) : placeholder}
        </Text>
      </View>
    </View>
  );
});

ResetPinDigitField.displayName = "ResetPinDigitField";

const resetPinDigitStyles = StyleSheet.create({
  shell: {
    borderWidth: 2,
    borderColor: "rgba(225,88,22,0.3)",
    borderRadius: 12,
    backgroundColor: RESET_PIN_FIELD_BG,
    marginBottom: 16,
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
  },
});

interface ModalConfig {
  title: string;
  message: string;
  type: string;
  confirmText: string;
  onConfirm: (() => void) | null;
}

export default function Passcode() {
  const navigation = useNavigation();
  const { startIdleSession, registerActivity, getActivityProps } = useIdleTimeout();
  const activityProps = getActivityProps();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { horizontalPadding, isShortScreen, isSmallScreen, isTinyScreen } = useResponsive();
  const isSmallPhone = width < 380;
  const isLargeScreen = width >= 768;
  const compact = isShortScreen || height < 650;
  const tiny = height < 600;
  
  // Responsive button sizes
  const btnSize = isLargeScreen
    ? 90
    : tiny
      ? Math.min(60, Math.max(50, width * 0.14))
      : compact
        ? Math.min(70, Math.max(58, width * 0.17))
        : Math.min(80, Math.max(64, width * 0.20));
  
  const delBtnSize = btnSize;
  
  // Responsive container width
  const padWidth = isLargeScreen ? "70%" : width < 340 ? "95%" : "90%";
  const maxPadWidth = isLargeScreen ? 480 : Math.min(380, width - horizontalPadding * 2);
  
  // Responsive logo size
  const logoWidth = isLargeScreen
    ? 240
    : tiny
      ? Math.min(100, Math.max(80, width * 0.30))
      : compact
        ? Math.min(140, Math.max(110, width * 0.36))
        : Math.min(180, Math.max(140, width * 0.45));
  const logoHeight = Math.round(logoWidth * (72 / 200));
  
  // Responsive dot size
  const dotSize = isLargeScreen ? 26 : tiny ? 16 : compact ? 20 : isSmallPhone ? 22 : 24;
  const dotGap = isLargeScreen ? 28 : tiny ? 12 : compact ? 16 : isSmallPhone ? 20 : 24;
  
  // Responsive text sizes
  const enterTextSize = isLargeScreen ? 22 : tiny ? 14 : compact ? 16 : isSmallPhone ? 17 : 19;
  const padButtonTextSize = isLargeScreen ? 36 : tiny ? 22 : compact ? 26 : isSmallPhone ? 28 : 32;
  
  // Responsive margins
  const logoTopMargin = isLargeScreen
    ? 20
    : tiny
      ? Math.min(8, Math.round(height * 0.01))
      : compact
        ? Math.min(16, Math.round(height * 0.02))
        : Math.min(32, Math.round(height * 0.04));
  
  const backspaceIconSize = isLargeScreen ? 32 : tiny ? 18 : compact ? 22 : isSmallPhone ? 26 : 30;
  const logoWrapMarginBottom = isLargeScreen ? 40 : tiny ? 8 : compact ? 14 : 28;
  const dotsWrapMarginBottom = isLargeScreen ? 24 : tiny ? 8 : compact ? 12 : 18;
  const enterTextMarginBottom = isLargeScreen ? 48 : tiny ? 12 : compact ? 20 : 36;
  const padRowMarginBottom = isLargeScreen ? 24 : tiny ? 6 : compact ? 12 : 18;
  const bottomRowMarginTop = isLargeScreen ? 20 : tiny ? 6 : compact ? 10 : 14;
  
  // Layout scale for overall adjustment
  const layoutScale = isLargeScreen
    ? 1.0
    : Math.max(0.85, Math.min(1.1, Math.min(width / 390, height / 844)));

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
    onConfirm: null,
  });
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<"auth" | "newPasscode">("auth");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmNewPasscode, setConfirmNewPasscode] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [loadingPasscode, setLoadingPasscode] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [resetKeyboardHeight, setResetKeyboardHeight] = useState(0);
  const { t, language: contextLanguage, setLanguage } = useLanguage();
  const language = normalizeLanguage(contextLanguage ?? DEFAULT_LANGUAGE);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  const goToMainWithSession = async () => {
    await startIdleSession();
    (navigation as unknown as NavProp).replace("Main");
  };

  // Biometric state
  const [hasBiometricToken, setHasBiometricToken] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");

  /** Server + SecureStore are source of truth; cached user may be cleared after idle/sign-out. */
  const refreshBiometricAvailability = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("biometricToken");
      if (!token) {
        setHasBiometricToken(false);
        return;
      }
      const userJson = await AsyncStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      if (user && user.biometricEnabled === false) {
        setHasBiometricToken(false);
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        setHasBiometricToken(false);
        return;
      }
      setHasBiometricToken(true);
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
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
        setBiometricType(
          Platform.OS === "ios" ? "Touch ID" : "fingerprint",
        );
      } else if (
        supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
      ) {
        setBiometricType("Iris");
      } else {
        setBiometricType("Biometrics");
      }
    } catch (e) {
      console.error("Biometric init error:", e);
      setHasBiometricToken(false);
    }
  }, []);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const newPinFieldRef = useRef<TextInput>(null);
  const confirmPinFieldRef = useRef<TextInput>(null);

  const showModal = (config: Partial<ModalConfig>) => {
    setModalConfig({
      title: "",
      message: "",
      type: "info",
      confirmText: t("common.ok"),
      onConfirm: null,
      ...config,
    });
    setModalVisible(true);
  };
  const hideModal = () => setModalVisible(false);

  useEffect(() => {
    const backAction = () => true;
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPasscode = async () => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (cancelled) return;
      if (!accessToken) {
        setNeedsAuth(true);
        setHasBiometricToken(false);
      } else {
        setNeedsAuth(false);
        await refreshBiometricAvailability();
      }
      setLoadingPasscode(false);
    };

    loadPasscode();
    return () => {
      cancelled = true;
    };
  }, [navigation, refreshBiometricAvailability]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken || !active) return;
        await refreshBiometricAvailability();
      })();
      return () => {
        active = false;
      };
    }, [refreshBiometricAvailability]),
  );

  // Handle Biometric Login Flow
  const handleBiometricAuth = async () => {
    try {
      setVerifyingPasscode(true);
      setError("");

      const token = await SecureStore.getItemAsync("biometricToken");
      if (!token) {
        throw new Error(t("passcode.noTokenFound"));
      }

      const authResult = await authenticateWithDeviceBiometrics({
        promptMessage: t("passcode.biometricPrompt", { type: biometricType }),
        fallbackLabel: t("passcode.useFallback"),
        cancelLabel: t("common.cancel"),
      });

      if (authResult.success) {
        const result = await verifyBiometric(token);

        if (result.success && result.access_token) {
          await AsyncStorage.setItem("access_token", result.access_token);
          if (result.user) {
            await AsyncStorage.setItem("user", JSON.stringify(result.user));
            if ((result.user as any).email) {
              await AsyncStorage.setItem(
                "lastLoggedEmail",
                (result.user as any).email.toLowerCase(),
              );
            }
          }
          await AsyncStorage.setItem("passcodeLoginComplete", "true");
          await goToMainWithSession();
        } else {
          setError(result.error || t("passcode.biometricLoginFailed"));
          setVerifyingPasscode(false);
          triggerShake();
        }
      } else {
        // User cancelled or failed local auth
        setVerifyingPasscode(false);
      }
    } catch (e: any) {
      console.error("Biometric auth error:", e);
      setError(t("passcode.biometricAuthError"));
      setVerifyingPasscode(false);
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async (value: string) => {
    if (value === "Del") {
      setPasscode((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (passcode.length >= 4) return;
    const next = passcode + value;
    setPasscode(next);
    setError("");
    if (next.length === 4) {
      setVerifyingPasscode(true);
      const loaderStart = Date.now();
      const MIN_LOADER_MS = 3000;

      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setVerifyingPasscode(false);
        (navigation as unknown as NavProp).replace("Login");
        return;
      }

      const result = await verifyPasscode(accessToken, next);

      const elapsed = Date.now() - loaderStart;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      if (result.success) {
        setPasscode("");
        AsyncStorage.setItem("passcodeLoginComplete", "true").catch(() => {});
        await goToMainWithSession();
      } else {
        setVerifyingPasscode(false);
        setError(t("passcode.incorrect"));
        setPasscode("");
        triggerShake();
      }
    }
  };

  const handleResetPasscode = async () => {
    if (resetStep === "auth") {
      if (!resetEmail.trim() || !resetPassword.trim()) {
        showModal({
          title: t("auth.missingInfo"),
          message: t("passcode.enterBothEmailPassword"),
          type: "warning",
        });
        return;
      }
      setResetLoading(true);
      const result = await login(resetEmail.trim(), resetPassword);
      setResetLoading(false);
      if (result.success && result.access_token) {
        await AsyncStorage.setItem("access_token", result.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(result.user || {}));
        setResetStep("newPasscode");
      } else {
        showModal({
          title: t("passcode.authFailed"),
          message: result.error || t("auth.invalidCredentials"),
          type: "error",
        });
      }
      return;
    }
    if (resetStep === "newPasscode") {
      if (!newPasscode.trim() || !confirmNewPasscode.trim()) {
        showModal({
          title: t("auth.missingInfo"),
          message: t("passcode.enterConfirmPasscode"),
          type: "warning",
        });
        return;
      }
      const normalizedNewPasscode = normalizePinDigits(newPasscode);
      const normalizedConfirmPasscode = normalizePinDigits(confirmNewPasscode);
      if (
        normalizedNewPasscode !== newPasscode ||
        normalizedConfirmPasscode !== confirmNewPasscode
      ) {
        setNewPasscode(normalizedNewPasscode);
        setConfirmNewPasscode(normalizedConfirmPasscode);
      }
      if (
        normalizedNewPasscode.length !== PIN_LENGTH ||
        normalizedConfirmPasscode.length !== PIN_LENGTH
      ) {
        showModal({
          title: t("passcode.invalidTitle"),
          message: t("passcode.invalidPasscodeLength"),
          type: "warning",
        });
        return;
      }
      if (normalizedNewPasscode !== normalizedConfirmPasscode) {
        showModal({
          title: t("passcode.mismatchTitle"),
          message: t("passcode.passcodesDoNotMatch"),
          type: "error",
        });
        return;
      }
      setResetLoading(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setResetLoading(false);
        showModal({
          title: t("common.sessionExpiredTitle"),
          message: t("common.sessionExpiredMessage"),
          onConfirm: () => {
            closeResetModal();
            (navigation as unknown as NavProp).replace("Login");
          },
        });
        return;
      }
      const result = await resetPasscode(accessToken, normalizedNewPasscode);
      setResetLoading(false);
      if (!result.success) {
        showModal({
          title: t("passcode.authFailed"),
          message: result.error || t("passcode.errorChangeFailed"),
          type: "error",
        });
        return;
      }
      const userJson = await AsyncStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : {};
      user.hasPasscode = true;
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem("passcodeLoginComplete", "true");
      setResetModalVisible(false);
      setResetEmail("");
      setResetPassword("");
      setNewPasscode("");
      setConfirmNewPasscode("");
      setResetStep("auth");
      await goToMainWithSession();
    }
  };

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    await AsyncStorage.setItem("user_preferred_language", selectedLabel);
    setLanguageModalVisible(false);
  };

  const closeResetModal = () => {
    Keyboard.dismiss();
    setResetModalVisible(false);
    setResetStep("auth");
    setResetEmail("");
    setResetPassword("");
    setNewPasscode("");
    setConfirmNewPasscode("");
    setResetKeyboardHeight(0);
  };

  useEffect(() => {
    if (!resetModalVisible) {
      setResetKeyboardHeight(0);
      return;
    }
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setResetKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setResetKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      setResetKeyboardHeight(0);
    };
  }, [resetModalVisible]);

  const modalEdgePad = Math.max(12, horizontalPadding);
  /** Modal window often stays full-height on Android; subtract keyboard so ScrollView can shrink above it. */
  const resetScrollMaxHeight =
    resetKeyboardHeight > 0
      ? Math.max(
          200,
          height - resetKeyboardHeight - insets.top - insets.bottom - 40,
        )
      : isShortScreen
        ? Math.min(height * 0.72, height - (isTinyScreen ? 48 : 72))
        : undefined;

  const resetModalKeyboardPad =
    Platform.OS === "android" && resetKeyboardHeight > 0
      ? resetKeyboardHeight
      : 0;

  return (
    <>
      {loadingPasscode || verifyingPasscode ? (
        <Loader text={t("auth.loggingIn")} />
      ) : (
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          locations={[0, 1]}
          style={[
            styles.gradient,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <View
            style={[
              styles.topBar,
              {
                top: insets.top + 12,
                left: horizontalPadding,
                right: horizontalPadding,
              },
            ]}
          >
            {!needsAuth ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() =>
                  (navigation as unknown as NavProp).replace("Login")
                }
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={26} color={WHITE} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setLanguageModalVisible(true)}
              accessibilityLabel={t("profile.selectLanguage")}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="language-outline"
                size={isSmallScreen ? 24 : 26}
                color={WHITE}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.contentFrame}>
            <View
              style={[
                styles.centerContent,
                {
                  transform: [{ scale: layoutScale }],
                  width: "100%",
                  maxWidth: isLargeScreen ? 520 : 460,
                },
              ]}
            >
              <View
                style={[
                  styles.logoWrap,
                  {
                    marginTop: logoTopMargin,
                    marginBottom: logoWrapMarginBottom,
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/InpireLogo.png")}
                  style={[
                    styles.logo,
                    { width: logoWidth, height: logoHeight },
                  ]}
                  contentFit="contain"
                />
              </View>

              {needsAuth ? (
                <View
                  style={[
                    styles.needsAuthWrap,
                    isSmallScreen && { paddingHorizontal: 16 },
                    (compact || tiny) && { marginTop: tiny ? -16 : -20 },
                  ]}
                >
                  <Text
                    style={[
                      styles.needsAuthTitle,
                      isLargeScreen && { fontSize: 26 },
                      isSmallScreen && { fontSize: 20 },
                      compact && { fontSize: 18, marginBottom: 12 },
                      tiny && { fontSize: 16, marginBottom: 8 },
                    ]}
                  >
                    {t("passcode.loginTitle")}
                  </Text>
                  <Text
                    style={[
                      styles.needsAuthMessage,
                      isLargeScreen && { fontSize: 17, lineHeight: 26 },
                      isSmallScreen && { fontSize: 15 },
                      compact && { marginBottom: 20, lineHeight: 22 },
                      tiny && {
                        fontSize: 14,
                        marginBottom: 12,
                        lineHeight: 20,
                      },
                    ]}
                  >
                    {t("passcode.loginMessage")}
                  </Text>
                  <View
                    style={[
                      styles.needsAuthButtons,
                      isLargeScreen && { maxWidth: 320, gap: 14 },
                      isSmallScreen && { maxWidth: 260 },
                      compact && { gap: 10 },
                      tiny && { gap: 8 },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.needsAuthBtn,
                        styles.needsAuthBtnSecondary,
                        isLargeScreen && { minHeight: 56, paddingVertical: 16 },
                        isSmallScreen && { minHeight: 48 },
                        tiny && { minHeight: 40, paddingVertical: 10 },
                      ]}
                      onPress={() =>
                        (navigation as unknown as NavProp).replace("Register")
                      }
                    >
                      <Text
                        style={[
                          styles.needsAuthBtnText,
                          isLargeScreen && { fontSize: 18 },
                          isSmallScreen && { fontSize: 16 },
                          tiny && { fontSize: 14 },
                        ]}
                      >
                        {t("auth.register")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.needsAuthBtn,
                        styles.needsAuthBtnPrimary,
                        isLargeScreen && { minHeight: 56, paddingVertical: 16 },
                        isSmallScreen && { minHeight: 48 },
                        tiny && { minHeight: 40, paddingVertical: 10 },
                      ]}
                      onPress={() =>
                        (navigation as unknown as NavProp).replace("Login")
                      }
                    >
                      <Text
                        style={[
                          styles.needsAuthBtnText,
                          isLargeScreen && { fontSize: 18 },
                          isSmallScreen && { fontSize: 16 },
                          tiny && { fontSize: 14 },
                        ]}
                      >
                        {t("auth.login")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {error ? (
                    <Text
                      style={[
                        styles.errorText,
                        isLargeScreen && { fontSize: 16, marginBottom: 18 },
                        compact && { marginBottom: 14, paddingVertical: 8 },
                        tiny && {
                          marginBottom: 6,
                          paddingVertical: 4,
                          fontSize: 13,
                        },
                      ]}
                    >
                      {error}
                    </Text>
                  ) : null}

                  <Animated.View
                    style={[
                      styles.dotsWrap,
                      {
                        gap: dotGap,
                        marginBottom: dotsWrapMarginBottom,
                        transform: [{ translateX: shakeAnim }],
                      },
                    ]}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          {
                            width: dotSize,
                            height: dotSize,
                            borderRadius: dotSize / 2,
                          },
                          passcode.length > i && styles.dotFilled,
                        ]}
                      />
                    ))}
                  </Animated.View>

                  <Text
                    style={[
                      styles.enterText,
                      {
                        fontSize: enterTextSize,
                        marginBottom: enterTextMarginBottom,
                      },
                    ]}
                  >
                    {t("passcode.enterPasscode")}
                  </Text>

                  <View
                    style={[
                      styles.padContainer,
                      { width: padWidth, maxWidth: maxPadWidth },
                    ]}
                  >
                    {[
                      ["1", "2", "3"],
                      ["4", "5", "6"],
                      ["7", "8", "9"],
                    ].map((row, ri) => (
                      <View
                        key={ri}
                        style={[
                          styles.padRow,
                          { marginBottom: padRowMarginBottom },
                        ]}
                      >
                        {row.map((key) => (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.padButton,
                              {
                                width: btnSize,
                                height: btnSize,
                                borderRadius: btnSize / 2,
                              },
                            ]}
                            onPress={() => handlePress(key)}
                          >
                            <Text
                              style={[
                                styles.padButtonText,
                                { fontSize: padButtonTextSize },
                              ]}
                            >
                              {key}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                    <View
                      style={[
                        styles.padRowLast,
                        { marginBottom: isLargeScreen ? 24 : tiny ? 4 : compact ? 8 : 16 },
                      ]}
                    >
                      {hasBiometricToken ? (
                        <TouchableOpacity
                          style={[
                            styles.padButton,
                            styles.padButtonBiometric,
                            {
                              width: btnSize,
                              height: btnSize,
                              borderRadius: btnSize / 2,
                            },
                          ]}
                          onPress={handleBiometricAuth}
                        >
                          <Ionicons
                            name={
                              Platform.OS === "ios" ? "scan" : "finger-print"
                            }
                            size={backspaceIconSize + 4}
                            color={WHITE}
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={{ width: btnSize }} />
                      )}
                      <TouchableOpacity
                        style={[
                          styles.padButton,
                          {
                            width: btnSize,
                            height: btnSize,
                            borderRadius: btnSize / 2,
                          },
                        ]}
                        onPress={() => handlePress("0")}
                      >
                        <Text
                          style={[
                            styles.padButtonText,
                            { fontSize: padButtonTextSize },
                          ]}
                        >
                          0
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.padButton,
                          styles.padButtonDel,
                          {
                            width: delBtnSize,
                            height: delBtnSize,
                            borderRadius: delBtnSize / 2,
                          },
                        ]}
                        onPress={() => handlePress("Del")}
                      >
                        <Ionicons
                          name="backspace-outline"
                          size={backspaceIconSize}
                          color={WHITE}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.bottomRow,
                      { marginTop: bottomRowMarginTop },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.bottomButton,
                        styles.bottomButtonPrimary,
                        isLargeScreen && { minHeight: 56, paddingVertical: 16 },
                        isSmallScreen && { minHeight: 48 },
                        tiny && { minHeight: 40, paddingVertical: 8 },
                      ]}
                      onPress={() =>
                        (navigation as unknown as NavProp).replace("Login")
                      }
                    >
                      <Text
                        style={[
                          styles.bottomButtonTextPrimary,
                          isLargeScreen && { fontSize: 18 },
                          isSmallScreen && { fontSize: 16 },
                          tiny && { fontSize: 14 },
                        ]}
                      >
                        {t("passcode.useEmail")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.forgotLinkWrap,
                        isLargeScreen && { paddingVertical: 14, marginBottom: 40 },
                        Platform.OS === 'ios' && { 
                          paddingVertical: 16, 
                          marginBottom: Math.max(32, insets.bottom + 16)
                        },
                        tiny && { 
                          marginTop: 4, 
                          paddingVertical: 10, 
                          marginBottom: Platform.OS === 'ios' ? Math.max(28, insets.bottom + 12) : 8 
                        }
                      ]}
                      onPress={() => setResetModalVisible(true)}
                    >
                      <Text
                        style={[
                          styles.forgotLink,
                          isLargeScreen && { fontSize: 17 },
                          isSmallScreen && { fontSize: 15 },
                          tiny && { fontSize: 13 },
                        ]}
                      >
                        {t("passcode.forgotPasscode")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </LinearGradient>
      )}

      <MessageModal
        visible={modalVisible}
        onClose={hideModal}
        onInteract={registerActivity}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
      />

      <ActivityModal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={passcodeLanguageStyles.keyboardRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <TouchableOpacity
            style={[
              passcodeLanguageStyles.overlay,
              {
                paddingHorizontal: modalEdgePad,
                paddingVertical: isTinyScreen ? 8 : isShortScreen ? 12 : 20,
              },
            ]}
            activeOpacity={1}
            onPress={() => {
              registerActivity();
              setLanguageModalVisible(false);
            }}
            {...activityProps}
          >
            <View
              style={[
                passcodeLanguageStyles.content,
                {
                  maxWidth: Math.min(360, width - modalEdgePad * 2),
                  maxHeight:
                    isShortScreen || isTinyScreen
                      ? height * (isTinyScreen ? 0.78 : 0.85)
                      : undefined,
                  padding: isTinyScreen ? 14 : isSmallScreen ? 18 : 24,
                },
              ]}
              onStartShouldSetResponder={() => true}
              {...activityProps}
            >
            <View style={passcodeLanguageStyles.header}>
              <Ionicons
                name="globe-outline"
                size={isTinyScreen ? 28 : isSmallScreen ? 32 : 40}
                color={GRADIENT_START}
              />
              <Text
                style={[
                  passcodeLanguageStyles.title,
                  (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 15 : 16 },
                ]}
              >
                {t("profile.selectLanguage")}
              </Text>
              <Text
                style={[
                  passcodeLanguageStyles.subtitle,
                  (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 11 : 12 },
                ]}
              >
                {t("profile.defaultIsEnglish")}
              </Text>
            </View>
            <ScrollView
              style={
                isShortScreen || isTinyScreen
                  ? { maxHeight: isTinyScreen ? 160 : 200 }
                  : undefined
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    passcodeLanguageStyles.option,
                    (isSmallScreen || isTinyScreen) && {
                      paddingVertical: isTinyScreen ? 10 : 12,
                      paddingHorizontal: isTinyScreen ? 12 : 14,
                    },
                    language === label && passcodeLanguageStyles.optionSelected,
                  ]}
                  onPress={() => {
                    registerActivity();
                    handleSelectLanguage(label);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      passcodeLanguageStyles.flag,
                      (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 18 : 20 },
                    ]}
                  >
                    {flag}
                  </Text>
                  <Text
                    style={[
                      passcodeLanguageStyles.optionText,
                      (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 14 : 15 },
                      language === label &&
                        passcodeLanguageStyles.optionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  {language === label && (
                    <Ionicons
                      name="checkmark-circle"
                      size={isTinyScreen ? 18 : isSmallScreen ? 20 : 22}
                      color={GRADIENT_START}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[
                passcodeLanguageStyles.cancelBtn,
                (isSmallScreen || isTinyScreen) && { marginTop: isTinyScreen ? 6 : 8 },
              ]}
              onPress={() => {
                registerActivity();
                setLanguageModalVisible(false);
              }}
            >
              <Text
                style={[
                  passcodeLanguageStyles.cancelText,
                  (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 14 : 15 },
                ]}
              >
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ActivityModal>

      <ActivityModal
        transparent
        animationType="fade"
        visible={resetModalVisible}
        onRequestClose={closeResetModal}
      >
        <KeyboardAvoidingView
          style={[
            resetStyles.keyboardRoot,
            resetModalKeyboardPad > 0 && { paddingBottom: resetModalKeyboardPad },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <TouchableOpacity
            style={[
              resetStyles.overlay,
              {
                paddingHorizontal: modalEdgePad,
                paddingVertical: isTinyScreen ? 8 : 16,
                justifyContent: "center",
              },
            ]}
            activeOpacity={1}
            onPress={() => {
              registerActivity();
              closeResetModal();
            }}
            {...activityProps}
          >
          <View
            onStartShouldSetResponder={() => true}
            {...activityProps}
            style={[
              resetStyles.box,
              {
                maxWidth: Math.min(400, width - modalEdgePad * 2),
                maxHeight:
                  resetKeyboardHeight > 0
                    ? undefined
                    : isShortScreen || isTinyScreen
                      ? height * (isTinyScreen ? 0.88 : 0.9)
                      : undefined,
                padding: isTinyScreen ? 14 : isSmallScreen ? 18 : 24,
              },
            ]}
          >
            <ScrollView
              style={resetScrollMaxHeight !== undefined ? { maxHeight: resetScrollMaxHeight } : undefined}
              contentContainerStyle={{
                paddingBottom: resetKeyboardHeight > 0 ? 20 : 0,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={false}
            >
              <Text
                style={[
                  resetStyles.title,
                  (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 18 : 20 },
                  (isShortScreen || isTinyScreen) && { marginBottom: isTinyScreen ? 8 : 10 },
                ]}
              >
                {resetStep === "auth"
                  ? t("passcode.resetTitle")
                  : t("passcode.setNewTitle")}
              </Text>
              <Text
                style={[
                  resetStyles.message,
                  (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 14 : 15 },
                  (isShortScreen || isTinyScreen) && { marginBottom: isTinyScreen ? 12 : 16 },
                ]}
              >
                {resetStep === "auth"
                  ? t("passcode.resetMessage")
                  : t("passcode.setNewMessage")}
              </Text>
              {resetStep === "auth" ? (
                <>
                  <TextInput
                    style={[
                      resetStyles.input,
                      (isSmallScreen || isTinyScreen) && {
                        paddingVertical: isTinyScreen ? 9 : 10,
                        fontSize: isTinyScreen ? 14 : 15,
                        paddingHorizontal: isTinyScreen ? 12 : 16,
                      },
                    ]}
                    placeholder={t("auth.emailPlaceholder")}
                    placeholderTextColor="#666"
                    value={resetEmail}
                    onChangeText={(value) => {
                      registerActivity();
                      setResetEmail(value);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                  />
                  <TextInput
                    style={[
                      resetStyles.input,
                      (isSmallScreen || isTinyScreen) && {
                        paddingVertical: isTinyScreen ? 9 : 10,
                        fontSize: isTinyScreen ? 14 : 15,
                        paddingHorizontal: isTinyScreen ? 12 : 16,
                      },
                    ]}
                    placeholder={t("auth.passwordPlaceholder")}
                    placeholderTextColor="#666"
                    secureTextEntry
                    value={resetPassword}
                    onChangeText={(value) => {
                      registerActivity();
                      setResetPassword(value);
                    }}
                    autoComplete="password"
                    returnKeyType="next"
                  />
                </>
              ) : (
                <>
                  <ResetPinDigitField
                    ref={newPinFieldRef}
                    value={newPasscode}
                    onChangeDigits={(digits) => {
                      registerActivity();
                      setNewPasscode(digits);
                    }}
                    placeholder={t("passcode.newPasscodePlaceholder")}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() =>
                      confirmPinFieldRef.current?.focus()
                    }
                    onPinFilled={() => confirmPinFieldRef.current?.focus()}
                    isSmallScreen={isSmallScreen}
                    isTinyScreen={isTinyScreen}
                  />
                  <ResetPinDigitField
                    ref={confirmPinFieldRef}
                    value={confirmNewPasscode}
                    onChangeDigits={(digits) => {
                      registerActivity();
                      setConfirmNewPasscode(digits);
                    }}
                    placeholder={t("passcode.confirmPasscodePlaceholder")}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    isSmallScreen={isSmallScreen}
                    isTinyScreen={isTinyScreen}
                  />
                </>
              )}
              <View
                style={[
                  resetStyles.buttons,
                  (isSmallScreen || isTinyScreen) && { gap: isTinyScreen ? 8 : 10 },
                ]}
              >
                <TouchableOpacity
                  style={[
                    resetStyles.btn,
                    resetStyles.cancelBtn,
                    (isSmallScreen || isTinyScreen) && { minHeight: isTinyScreen ? 42 : 44 },
                  ]}
                  onPress={() => {
                    registerActivity();
                    closeResetModal();
                  }}
                >
                  <Text
                    style={[
                      resetStyles.cancelBtnText,
                      (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 14 : 15 },
                    ]}
                  >
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    resetStyles.btn,
                    resetStyles.confirmBtn,
                    (isSmallScreen || isTinyScreen) && { minHeight: isTinyScreen ? 42 : 44 },
                  ]}
                  onPress={handleResetPasscode}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <Text
                      style={[
                        resetStyles.confirmBtnText,
                        (isSmallScreen || isTinyScreen) && { fontSize: isTinyScreen ? 14 : 15 },
                      ]}
                    >
                      {resetStep === "auth"
                        ? t("passcode.verify")
                        : t("passcode.updatePasscode")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </ActivityModal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  topBar: {
    position: "absolute",
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  languageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { flex: 1, width: "100%" },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  contentFrame: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 12,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  logoWrap: {
    alignItems: "center",
  },
  logo: {
    /* width/height set inline for responsiveness */
  },
  loadingWrap: {
    alignItems: "center",
    marginVertical: 40,
  },
  loadingText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    marginTop: 12,
  },
  needsAuthWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  needsAuthTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: WHITE,
    marginBottom: 16,
    textAlign: "center",
  },
  needsAuthMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  needsAuthButtons: {
    width: "100%",
    maxWidth: 280,
    gap: 14,
  },
  needsAuthBtn: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    minHeight: 52,
  },
  needsAuthBtnPrimary: {
    backgroundColor: GRADIENT_START,
  },
  needsAuthBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  needsAuthBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: WHITE,
  },
  errorText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  dotsWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  dot: {
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: WHITE,
    borderColor: WHITE,
    transform: [{ scale: 1.1 }],
  },
  enterText: {
    fontSize: 18,
    fontWeight: "500",
    color: WHITE,
    letterSpacing: 0.5,
  },
  padContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  padRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  padRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  padButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  padButtonBiometric: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  padButtonDel: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  padButtonText: {
    fontSize: 30,
    fontWeight: "500",
    color: WHITE,
  },
  bottomRow: {
    width: "100%",
    maxWidth: "100%",
    marginTop: 8,
    alignSelf: "stretch",
    alignItems: "stretch",
    gap: 16,
  },
  bottomButton: {
    width: "100%",
    alignSelf: "stretch",
    paddingVertical: 16,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 5,
  },
  bottomButtonPrimary: {
    backgroundColor: GRADIENT_START,
  },
  bottomButtonTextPrimary: {
    fontSize: 17,
    fontWeight: "600",
    color: WHITE,
  },
  forgotLinkWrap: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    width: "100%",
    alignItems: "center",
    marginBottom: Platform.OS === 'ios' ? 32 : 8,
  },
  forgotLink: {
    fontSize: 16,
    fontWeight: "500",
    color: WHITE,
    textAlign: "center",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(255,255,255,0.8)",
  },
});

const resetStyles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 20,
  },
  box: {
    backgroundColor: WHITE,
    borderRadius: 20,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: GRADIENT_START,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    borderWidth: 2,
    borderColor: "rgba(225,88,22,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
    marginBottom: 16,
  },
  buttons: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 48,
  },
  cancelBtn: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  confirmBtn: { backgroundColor: GRADIENT_START },
  cancelBtnText: { color: "#666", fontSize: 16, fontWeight: "600" },
  confirmBtnText: { color: WHITE, fontSize: 16, fontWeight: "600" },
});

const passcodeLanguageStyles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  content: {
    width: "100%",
    backgroundColor: WHITE,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: GRADIENT_START,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  header: { alignItems: "center", marginBottom: 20 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: { fontSize: 13, color: "#666", textAlign: "center" },
  option: {
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
  optionSelected: {
    backgroundColor: "#FFF0E8",
    borderWidth: 2,
    borderColor: GRADIENT_START,
  },
  flag: { fontSize: 22, marginRight: 12 },
  optionText: { fontSize: 16, color: "#333", flex: 1 },
  optionTextSelected: { fontWeight: "600", color: GRADIENT_START },
  cancelBtn: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 16, color: "#666" },
});
