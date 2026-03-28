import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from 'expo-secure-store';
import { registerIndieID } from 'native-notify';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { forgotPassword, login } from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import { useLanguageModal } from "../../context/LanguageModalContext";
import type { NavProp } from "../../types/navigation";
import { useResponsive } from "../../utils/responsive";
import Loader from "../Loader/Loader";

import ActivityModal from '../components/ActivityModal';
const GRADIENT_START = "#E15816";
const GRADIENT_END = "#F48F38";
const WHITE = "#FFFFFF";

// ---------------------------------------------------------------------------
// PasswordResetRequiredModal
// Shown when the backend signals requiresPasswordReset = true after login.
// ---------------------------------------------------------------------------
interface PasswordResetRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onSentOk: () => void;
  email: string;
}

function PasswordResetRequiredModal({
  visible,
  onClose,
  onSentOk,
  email,
}: PasswordResetRequiredModalProps) {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [phase, setPhase] = useState<"prompt" | "sending" | "sent" | "error">(
    "prompt",
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (visible) {
      setPhase("prompt");
      setErrorMsg("");
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleSend = async () => {
    setPhase("sending");
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setPhase("sent");
      } else {
        setErrorMsg(
          result.error || t("login.resetEmailFailed"),
        );
        setPhase("error");
      }
    } catch {
      setErrorMsg(t("login.networkError"));
      setPhase("error");
    }
  };

  const content = {
    prompt: {
      icon: "!",
      title: t("auth.passwordUpdateRequired"),
      message: t("auth.passwordUpdateMessage").replace("{email}", email),
      primaryText: t("auth.sendResetEmail"),
      primaryAction: handleSend,
      secondaryText: null,
      secondaryAction: null,
    },
    sending: {
      icon: "…",
      title: t("auth.sendingEmail"),
      message: t("auth.sendingEmailMessage").replace("{email}", email),
      primaryText: null,
      primaryAction: null,
      secondaryText: null,
      secondaryAction: null,
    },
    sent: {
      icon: "✓",
      title: t("auth.emailSentTitle"),
      message: t("auth.emailSentMessage").replace("{email}", email),
      primaryText: t("auth.backToLogin"),
      primaryAction: onSentOk,
      secondaryText: null,
      secondaryAction: null,
    },
    error: {
      icon: "!",
      title: t("auth.couldNotSendEmail"),
      message: errorMsg,
      primaryText: t("auth.tryAgain"),
      primaryAction: () => setPhase("prompt"),
      secondaryText: null,
      secondaryAction: null,
    },
  }[phase];

  return (
    <ActivityModal transparent animationType="none" visible={visible}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[modalStyles.box, { transform: [{ scale: scaleAnim }] }]}
        >
          <View
            style={[
              modalStyles.iconWrap,
              phase === "sent" && { backgroundColor: "rgba(34,197,94,0.18)" },
            ]}
          >
            <Text
              style={[
                modalStyles.iconText,
                phase === "sent" && { color: "#22c55e" },
              ]}
            >
              {content.icon}
            </Text>
          </View>
          <Text style={modalStyles.title}>{content.title}</Text>
          <Text style={modalStyles.message}>{content.message}</Text>
          {phase === "sending" ? (
            <ActivityIndicator
              color={GRADIENT_START}
              size="large"
              style={{ marginTop: 4 }}
            />
          ) : (
            <View style={modalStyles.buttonsRow}>
              {content.secondaryText && content.secondaryAction ? (
                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.buttonSecondary]}
                  onPress={content.secondaryAction}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.buttonSecondaryText}>
                    {content.secondaryText}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {content.primaryText && content.primaryAction ? (
                <TouchableOpacity
                  style={modalStyles.button}
                  onPress={content.primaryAction}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.buttonText}>
                    {content.primaryText}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </ActivityModal>
  );
}

// ---------------------------------------------------------------------------
// ForgotPasswordInputModal
// Shown when user taps "Forgot Password?" — lets them enter email and send
// the reset link without needing to first type in the Login email field.
// ---------------------------------------------------------------------------
interface ForgotPasswordInputModalProps {
  visible: boolean;
  initialEmail: string;
  onClose: () => void;
}

function ForgotPasswordInputModal({
  visible,
  initialEmail,
  onClose,
}: ForgotPasswordInputModalProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "Arabic";
  const { height: windowHeight } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [inputEmail, setInputEmail] = useState(initialEmail);
  const [phase, setPhase] = useState<'input' | 'sending' | 'sent' | 'error'>('input');
  const [errorMsg, setErrorMsg] = useState('');

  const mapForgotPasswordError = (message?: string) => {
    if (!message) return "";
    const normalized = message.toLowerCase();
    if (normalized.includes("must be an email")) {
      return "please enter a valid email";
    }
    return message;
  };

  // Sync initialEmail when modal opens
  useEffect(() => {
    if (visible) {
      setInputEmail(initialEmail);
      setPhase('input');
      setErrorMsg('');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleSend = async () => {
    const trimmed = inputEmail.trim();
    if (!trimmed) {
      setErrorMsg(t("auth.pleaseEnterEmail"));
      setPhase('error');
      return;
    }
    setPhase('sending');
    try {
      const result = await forgotPassword(trimmed);
      if (result.success) {
        setPhase('sent');
      } else {
        setErrorMsg(mapForgotPasswordError(result.error) || t("login.resetEmailFailed"));
        setPhase('error');
      }
    } catch {
      setErrorMsg(t("auth.networkError"));
      setPhase('error');
    }
  };

  return (
    <ActivityModal transparent animationType="none" visible={visible}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'sent' ? onClose : undefined} />
          <Animated.View
            style={[
              modalStyles.box,
              forgotInputStyles.responsiveBox,
              {
                maxHeight: Math.min(520, windowHeight * 0.82),
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={forgotInputStyles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {phase === 'sent' ? (
                <>
                  <View style={[modalStyles.iconWrap, { backgroundColor: 'rgba(34,197,94,0.18)' }]}>
                    <Text style={[modalStyles.iconText, { color: '#22c55e' }]}>✓</Text>
                  </View>
                  <Text style={modalStyles.title}>{t("auth.emailSentTitle")}</Text>
                  <Text style={modalStyles.message}>
                    {t("auth.emailSentMessage").replace("{email}", inputEmail.trim())}
                  </Text>
                  <View style={modalStyles.buttonsRow}>
                    <TouchableOpacity style={modalStyles.button} onPress={onClose} activeOpacity={0.8}>
                      <Text style={modalStyles.buttonText}>{t("auth.backToLogin")}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : phase === 'sending' ? (
                <>
                  <View style={modalStyles.iconWrap}>
                    <Text style={modalStyles.iconText}>…</Text>
                  </View>
                  <Text style={modalStyles.title}>{t("auth.sendingEmail")}</Text>
                  <Text style={modalStyles.message}>{t("auth.sendingEmailMessage").replace("{email}", inputEmail.trim())}</Text>
                  <ActivityIndicator color={GRADIENT_START} size="large" style={{ marginTop: 4 }} />
                </>
              ) : (
                <>
                  <View style={modalStyles.iconWrap}>
                    <Text style={modalStyles.iconText}>🔑</Text>
                  </View>
                  <Text style={modalStyles.title}>{t("auth.forgotPasswordTitle")}</Text>
                  <Text style={[modalStyles.message, { marginBottom: 12 }]}>
                    {t("auth.forgotPasswordMessage")}
                  </Text>
                  {phase === 'error' && (
                    <Text style={forgotInputStyles.errorText}>{errorMsg}</Text>
                  )}
                  <TextInput
                    style={forgotInputStyles.emailInput}
                    placeholder={t("auth.emailPlaceholder")}
                    placeholderTextColor="#AAAAAA"
                    value={inputEmail}
                    onChangeText={(val) => { setInputEmail(val); if (phase === 'error') setPhase('input'); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    editable
                    returnKeyType="done"
                  />
                  <View style={[modalStyles.buttonsRow, { marginTop: 4 }]}>
                    <TouchableOpacity
                      style={[modalStyles.button, modalStyles.buttonSecondary]}
                      onPress={onClose}
                      activeOpacity={0.8}
                    >
                      <Text style={modalStyles.buttonSecondaryText}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={modalStyles.button}
                      onPress={handleSend}
                      activeOpacity={0.8}
                    >
                      <Text style={modalStyles.buttonText}>{t("auth.sendLink")}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </ActivityModal>
  );
}

const forgotInputStyles = StyleSheet.create({
  responsiveBox: {
    width: "100%",
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emailInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    textAlign: 'left',
  },
  errorText: {
    fontSize: 13,
    color: '#E53E3E',
    marginBottom: 10,
    textAlign: 'center',
  },
});

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "info" | "success" | "error" | "warning";
  confirmText?: string;
  onConfirm?: (() => void) | null;
  secondaryText?: string;
  onSecondary?: (() => void) | null;
}

function MessageModal({
  visible,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "OK",
  onConfirm,
  secondaryText,
  onSecondary,
}: MessageModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const icon = type === "success" ? "✓" : type === "error" ? "!" : "i";

  return (
    <ActivityModal transparent animationType="none" visible={visible}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[modalStyles.box, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={modalStyles.iconWrap}>
            <Text style={modalStyles.iconText}>{icon}</Text>
          </View>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.buttonsRow}>
            {secondaryText && onSecondary ? (
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.buttonSecondary]}
                onPress={() => {
                  onSecondary();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.buttonSecondaryText}>
                  {secondaryText}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={modalStyles.button}
              onPress={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </ActivityModal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  box: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(225,88,22,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
    fontWeight: "800",
    color: GRADIENT_START,
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
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    backgroundColor: GRADIENT_START,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    minWidth: 120,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: GRADIENT_START,
  },
  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: GRADIENT_START,
    fontSize: 16,
    fontWeight: "600",
  },
});

interface ModalConfig {
  title: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  confirmText: string;
  onConfirm: (() => void) | null;
  secondaryText?: string;
  onSecondary?: (() => void) | null;
}

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { scale, verticalScale, horizontalPadding, isShortScreen, isSmallScreen } =
    useResponsive();
  const { height: windowHeight } = useWindowDimensions();
  const fromSignOut = (route.params as { fromSignOut?: boolean } | undefined)
    ?.fromSignOut;

  useEffect(() => {
    if (!fromSignOut) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [fromSignOut]);

  const [email, setEmail] = useState("");

  useEffect(() => {
    const purgeSessionAndLoadEmail = async () => {
      try {
        await AsyncStorage.multiRemove([
          "access_token",
          "user",
          "passcodeLoginComplete",
          "registrationPasscodePending",
        ]);
        const savedEmail = await AsyncStorage.getItem("lastLoggedEmail");
        if (savedEmail) {
          setEmail(savedEmail);
        }
      } catch (e) {
        // ignore
      }
    };
    purgeSessionAndLoadEmail();
  }, []);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
    onConfirm: null,
    secondaryText: undefined,
    onSecondary: undefined,
  });
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetModalEmail, setResetModalEmail] = useState("");
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const { t } = useLanguage();
  const { openLanguageModal } = useLanguageModal();

  const showModal = (config: Partial<ModalConfig>) => {
    setModalConfig({
      title: "",
      message: "",
      type: "info",
      confirmText: t("common.ok"),
      onConfirm: null,
      secondaryText: undefined,
      onSecondary: undefined,
      ...config,
    });
    setModalVisible(true);
  };

  const hideModal = () => setModalVisible(false);

  // Stores user/nav info to execute after the reset modal closes
  const pendingNavRef = useRef<{ hasPasscode: boolean } | null>(null);

  const doNavigate = (hasPasscode: boolean) => {
    if (hasPasscode) {
      (navigation as unknown as NavProp).replace("Passcode");
    } else {
      AsyncStorage.setItem("registrationPasscodePending", "true").then(() => {
        (navigation as unknown as NavProp).replace("CreatePasscode");
      });
    }
  };

  const SignIn = async () => {
    Keyboard.dismiss();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showModal({
        title: t("auth.missingInfo"),
        message: t("auth.enterEmail"),
        type: "warning",
      });
      return;
    }
    if (!password) {
      showModal({
        title: t("auth.missingInfo"),
        message: t("auth.enterPassword"),
        type: "warning",
      });
      return;
    }

    setLoading(true);
    const loaderStart = Date.now();
    const MIN_LOADER_MS = 500; // Brief feedback only; Dashboard will show its own loader

    try {
      const result = await login(trimmedEmail, password);

      if (!result.success) {
        setLoading(false);
        showModal({
          title: t("auth.loginFailed"),
          message: result.error || t("auth.invalidCredentials"),
          type: "error",
        });
        return;
      }

      // Clear biometric token only when switching to a different account — not when
      // lastLoggedEmail is missing (e.g. after Welcome/Login purge) but the same user
      // re-authenticates; use biometricEmail from enrollment as a fallback.
      try {
        const lastEmail = await AsyncStorage.getItem("lastLoggedEmail");
        const enrolledEmail = await AsyncStorage.getItem("biometricEmail");
        const currentEmail = trimmedEmail.toLowerCase();
        const priorAccountEmail =
          lastEmail?.toLowerCase() ?? enrolledEmail?.toLowerCase() ?? null;

        if (
          priorAccountEmail &&
          priorAccountEmail !== currentEmail
        ) {
          await SecureStore.deleteItemAsync("biometricToken");
          await AsyncStorage.removeItem("biometricEmail");
        }
        await AsyncStorage.setItem("lastLoggedEmail", currentEmail);
      } catch (e) {
        console.warn("Failed to check biometricToken mismatch", e);
      }

      await AsyncStorage.setItem("access_token", result.access_token || "");
      await AsyncStorage.setItem("user", JSON.stringify(result.user || {}));
      await AsyncStorage.removeItem("passcodeLoginComplete");

      // Save password securely for silent auto-login on next app launch.
      // Also record the timestamp so it can be expired after 2 days.
      try {
        await SecureStore.setItemAsync("savedPassword", password);
        await AsyncStorage.setItem("savedPasswordAt", String(Date.now()));
      } catch (e) {
        console.warn("Failed to save password to SecureStore", e);
      }

      // Register device for Indie Push Notifications
      const userObj = result.user as any;
      const userId = userObj?.id || userObj?._id;
      const appId = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID;
      const appToken = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN;

      if (userId && appId && appToken) {
        registerIndieID(String(userId), Number(appId), appToken);
      }

      const elapsed = Date.now() - loaderStart;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      const user = result.user as
        | { hasPasscode?: boolean; requiresPasswordReset?: boolean }
        | undefined;
      setLoading(false);

      // If the account is flagged to require a password reset, show the modal
      if (result.requiresPasswordReset || user?.requiresPasswordReset) {
        pendingNavRef.current = { hasPasscode: !!user?.hasPasscode };
        setResetModalEmail(trimmedEmail);
        setResetModalVisible(true);
        return;
      }

      doNavigate(!!user?.hasPasscode);
    } catch (_) {
      setLoading(false);
      showModal({
        title: t("auth.loginError"),
        message: t("auth.unexpectedError"),
        type: "error",
      });
    }
  };

  const isWeb = Platform.OS === "web";

  if (loading) {
    return <Loader text={t("auth.loggingIn")} />;
  }

  // Responsive logo/form sizes for smaller screens
  const logoWidth = isSmallScreen ? scale(220) : scale(260);
  const logoHeight = isSmallScreen ? scale(118) : scale(140);
  const logoMarginBottom = isShortScreen ? verticalScale(20) : verticalScale(32);
  const formPaddingBottom = isShortScreen ? verticalScale(60) : verticalScale(100);

  return (
    <>
      <View style={styles.flex1}>
        {/* Fixed gradient background - does not move when keyboard opens */}
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View
          style={[
            styles.contentWrapper,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            {fromSignOut ? (
              <View
                style={[
                  styles.backButton,
                  {
                    width: scale(44),
                    height: scale(44),
                    borderRadius: scale(22),
                  },
                ]}
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.backButton,
                  {
                    width: scale(44),
                    height: scale(44),
                    borderRadius: scale(22),
                  },
                ]}
                onPress={() =>
                  (navigation as unknown as NavProp).replace("Welcome")
                }
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={26} color={WHITE} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.languageButton,
                {
                  width: scale(44),
                  height: scale(44),
                  borderRadius: scale(22),
                },
              ]}
              onPress={openLanguageModal}
              accessibilityLabel={t("profile.selectLanguage")}
              accessibilityRole="button"
            >
              <Ionicons name="language-outline" size={26} color={WHITE} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: horizontalPadding,
                paddingBottom: formPaddingBottom,
                minHeight: isWeb ? undefined : Math.max(400, windowHeight - insets.top - insets.bottom - 160),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === "ios" ? 80 : 60}
            extraHeight={Platform.OS === "android" ? 100 : 80}
            keyboardOpeningTime={0}
            viewIsInsideTabBar={false}
          >
            <View
              style={[styles.logoWrap, { marginBottom: logoMarginBottom }]}
            >
              <Image
                source={require("../../assets/images/InpireLogo.png")}
                style={[styles.logo, { width: logoWidth, height: logoHeight }]}
                contentFit="contain"
                accessible={true}
                accessibilityLabel="Inspire company logo"
              />
            </View>

            <View style={[styles.form, isShortScreen && { gap: 0 }]}>
              <TextInput
                style={[styles.input, isShortScreen && { minHeight: 48, paddingVertical: 12 }]}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor="rgba(255,255,255,0.85)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                autoComplete="email"
              />

              <View style={[styles.passwordRow, isShortScreen && { minHeight: 48 }]}>
                <TextInput
                  style={[styles.passwordInput, isShortScreen && { paddingVertical: 12 }]}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.85)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((s) => !s)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={WHITE}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.passcodeLinkWrap, isShortScreen && { marginBottom: 16 }]}
                onPress={async () => {
                  const token = await AsyncStorage.getItem("access_token");
                  const userJson = await AsyncStorage.getItem("user");
                  const user = userJson
                    ? (JSON.parse(userJson) as { hasPasscode?: boolean })
                    : null;
                  if (token && user?.hasPasscode) {
                    (navigation as unknown as NavProp).replace("Passcode");
                  } else if (!token) {
                    showModal({
                      title: t("auth.passcodeLoginTitle"),
                      message: t("auth.passcodeLoginMessage"),
                      type: "info",
                      confirmText: t("common.ok"),
                      secondaryText: t("auth.register"),
                      onSecondary: () =>
                        (navigation as unknown as NavProp).replace("Register"),
                    });
                  } else {
                    showModal({
                      title: t("auth.noPasscodeSetTitle"),
                      message: t("auth.noPasscodeSetMessage"),
                      type: "info",
                    });
                  }
                }}
              >
                <Text style={styles.passcodeLinkText}>
                  {t("auth.usePasscodeInstead")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isShortScreen && { minHeight: 48 },
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={SignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>{t("auth.login")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotWrap}
                onPress={() => setForgotModalVisible(true)}
              >
                <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerWrap}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.registerText}>{t("auth.noAccount")}</Text>
                <Text style={styles.registerLink}>{t("auth.register")}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>

          <Text style={styles.footer}>{t("auth.createdByInspire")}</Text>
        </View>
      </View>

      <MessageModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText || t("common.ok")}
        onConfirm={modalConfig.onConfirm}
        secondaryText={modalConfig.secondaryText}
        onSecondary={modalConfig.onSecondary}
      />

      <PasswordResetRequiredModal
        visible={resetModalVisible}
        onClose={() => {
          setResetModalVisible(false);
          pendingNavRef.current = null;
        }}
        onSentOk={() => {
          setResetModalVisible(false);
          pendingNavRef.current = null;
          // Clear password so the user must type their new password on next attempt
          setPassword('');
        }}
        email={resetModalEmail}
      />

      <ForgotPasswordInputModal
        visible={forgotModalVisible}
        initialEmail={email.trim()}
        onClose={() => setForgotModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: GRADIENT_END },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  languageButton: {
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    alignSelf: "center",
  },
  logo: {},
  form: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: WHITE,
    marginBottom: 14,
    minHeight: 54,
    textAlign: "left",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    minHeight: 54,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: WHITE,
    textAlign: "left",
  },
  eyeButton: {
    padding: 14,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  passcodeLinkWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    width: "100%",
  },
  passcodeLinkText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: GRADIENT_START,
    borderRadius: 999,
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  forgotWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    width: "100%",
  },
  forgotText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  registerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    width: "100%",
    paddingHorizontal: 8,
  },
  registerText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
  },
  registerLink: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  footer: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    textAlign: "center",
    paddingVertical: 16,
  },
});
