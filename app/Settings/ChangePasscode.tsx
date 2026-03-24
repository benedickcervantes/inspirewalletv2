import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updatePasscode, verifyPasscode } from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";

const GRADIENT_START = "#E15816";
const GRADIENT_END = "#F48F38";
const WHITE = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.85)";

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: (() => void) | null;
  success?: boolean;
}

function MessageModal({
  visible,
  onClose,
  title,
  message,
  confirmText = "OK",
  onConfirm,
  success,
}: MessageModalProps) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable style={msgStyles.overlay} onPress={onClose}>
        <View style={msgStyles.box}>
          {success ? (
            <View style={msgStyles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
            </View>
          ) : null}
          <Text style={msgStyles.title}>{title}</Text>
          <Text style={msgStyles.message}>{message}</Text>
          <TouchableOpacity
            style={msgStyles.button}
            onPress={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={msgStyles.buttonText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const msgStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  box: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: GRADIENT_START,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 140,
    alignItems: "center",
  },
  buttonText: { color: WHITE, fontSize: 16, fontWeight: "600" },
});

type Step = "current" | "new" | "confirm";

export default function ChangePasscode() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const btnSize = width >= 768 ? 80 : Math.min(72, Math.max(56, width * 0.22));
  const delBtnSize =
    width >= 768 ? 80 : Math.min(72, Math.max(56, width * 0.22));
  const padWidth = width >= 768 ? "65%" : "88%";
  const maxPadWidth = width >= 768 ? 420 : Math.min(360, width - 48);

  const [step, setStep] = useState<Step>("current");
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: (() => void) | null;
    success?: boolean;
  }>({ title: "", message: "", confirmText: t("common.ok"), onConfirm: null });

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const currentPin =
    step === "current"
      ? currentPasscode
      : step === "new"
        ? newPasscode
        : confirmPasscode;

  const setCurrentPin = (v: string) => {
    if (step === "current") setCurrentPasscode(v);
    else if (step === "new") setNewPasscode(v);
    else setConfirmPasscode(v);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "current") {
        (navigation as unknown as NavProp).goBack();
        return true;
      }
      if (step === "new") {
        setStep("current");
        setNewPasscode("");
        setError("");
        return true;
      }
      setStep("new");
      setConfirmPasscode("");
      setError("");
      return true;
    });
    return () => sub.remove();
  }, [navigation, step]);

  const showModal = (config: Partial<typeof modalConfig>) => {
    setModalConfig({
      title: "",
      message: "",
      confirmText: t("common.ok"),
      onConfirm: null,
      success: false,
      ...config,
    });
    setModalVisible(true);
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

  const verifyCurrentAndAdvance = async (enteredPasscode: string) => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      showModal({
        title: t("common.sessionExpiredTitle"),
        message: t("common.sessionExpiredMessage"),
        onConfirm: () => (navigation as unknown as NavProp).replace("Login"),
      });
      return;
    }

    setLoading(true);
    const result = await verifyPasscode(accessToken, enteredPasscode);
    setLoading(false);

    if (!result.success) {
      setError(result.error || t("passcode.errorWrongCurrent"));
      setCurrentPasscode("");
      triggerShake();
      return;
    }

    setError("");
    setStep("new");
    setNewPasscode("");
  };

  const handlePress = async (value: string) => {
    if (value === "Del") {
      setCurrentPin(currentPin.slice(0, -1));
      setError("");
      return;
    }

    if (currentPin.length >= 4) return;
    const next = currentPin + value;
    setCurrentPin(next);
    setError("");

    if (next.length === 4) {
      if (step === "current") {
        await verifyCurrentAndAdvance(next);
      } else if (step === "new") {
        setStep("confirm");
        setConfirmPasscode("");
      } else {
        if (next !== newPasscode) {
          setError(t("passcode.errorMismatch"));
          setConfirmPasscode("");
          triggerShake();
          return;
        }
        await submitChange();
      }
    }
  };

  const submitChange = async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      showModal({
        title: t("common.sessionExpiredTitle"),
        message: t("common.sessionExpiredMessage"),
        onConfirm: () => (navigation as unknown as NavProp).replace("Login"),
      });
      return;
    }

    setLoading(true);
    const result = await updatePasscode(
      accessToken,
      currentPasscode,
      newPasscode,
    );
    setLoading(false);

    if (!result.success) {
      showModal({
        title: t("passcode.errorChangeFailed"),
        message: result.error || t("passcode.errorWrongCurrent"),
        onConfirm: () => {
          setStep("current");
          setCurrentPasscode("");
          setNewPasscode("");
          setConfirmPasscode("");
        },
      });
      return;
    }

    showModal({
      title: t("passcode.updatedTitle"),
      message: t("passcode.updatedMessage"),
      onConfirm: () => (navigation as unknown as NavProp).goBack(),
      success: true,
    });
  };

  const stepIndex = step === "current" ? 1 : step === "new" ? 2 : 3;
  const instruction =
    step === "current"
      ? t("passcode.instructionCurrent")
      : step === "new"
        ? t("passcode.instructionNew")
        : t("passcode.instructionConfirm");

  return (
    <>
      <LinearGradient
        colors={[GRADIENT_START, GRADIENT_END]}
        locations={[0, 1]}
        style={[
          styles.gradient,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => (navigation as unknown as NavProp).goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={26} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("passcode.headerTitle")}</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.stepIndicatorWrap}>
          <Text style={styles.stepLabel}>
            {t("passcode.stepIndicator").replace("{step}", String(stepIndex))}
          </Text>
          <View style={styles.stepDots}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.stepDot, stepIndex >= i && styles.stepDotActive]}
              />
            ))}
          </View>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.contentCard}>
            {error ? (
              <View style={styles.errorWrap}>
                <Ionicons name="warning-outline" size={20} color={WHITE} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Animated.View
              style={[
                styles.dotsWrap,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    currentPin.length > i && styles.dotFilled,
                  ]}
                />
              ))}
            </Animated.View>

            <Text style={styles.instructionText}>{instruction}</Text>

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
                <View key={ri} style={styles.padRow}>
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
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.padButtonText}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <View style={styles.padRowLast}>
                <View style={{ width: btnSize }} />
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
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.padButtonText}>0</Text>
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
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="backspace-outline" size={28} color={WHITE} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={WHITE} />
            <Text style={styles.loadingText}>{t("passcode.updating")}</Text>
          </View>
        )}
      </LinearGradient>

      <MessageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        success={modalConfig.success}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: "100%",
  },
  backBtn: {
    width: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WHITE,
    letterSpacing: 0.3,
  },
  stepIndicatorWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  stepDotActive: {
    backgroundColor: WHITE,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  contentCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: WHITE,
    fontSize: 15,
    fontWeight: "600",
  },
  dotsWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginBottom: 20,
    paddingVertical: 8,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: WHITE,
    borderColor: WHITE,
  },
  instructionText: {
    fontSize: 17,
    fontWeight: "600",
    color: WHITE,
    marginBottom: 32,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  padContainer: {
    marginTop: 4,
    marginBottom: 0,
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
  },
  padButton: {
    backgroundColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  padButtonDel: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
  },
  padButtonText: {
    fontSize: 28,
    fontWeight: "600",
    color: WHITE,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
  },
});
