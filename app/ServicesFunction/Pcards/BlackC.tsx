import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    type ImageSourcePropType,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { submitPhysicalCardRequest, updateProfile } from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";

const THEME_COLOR = "#E15816";
const STOCK_HEADER_GRADIENT = ["#E25A17", "#F28934"] as const;
const AUTO_ROTATE_DELAY_MS = 2000;
/** One full 360° spin in milliseconds — lower = faster (e.g. 4000 = 4s per rotation) */
const GLOBE_SPIN_DURATION_MS = 6000;
const GOLD_ACCENT = "#C9A227";
const MODAL_SCROLL_MAX_H = Math.round(Dimensions.get("window").height * 0.72);
const FRONT_CARD_IMAGE_CROP_SCALE = 1;
const BACK_CARD_IMAGE_CROP_SCALE = 1;

const FRONT_CARD_IMAGE: ImageSourcePropType = require("../../../assets/cards/p-cards/Pcard-front.png");
const BACK_CARD_IMAGE: ImageSourcePropType = require("../../../assets/cards/p-cards/Pcard-back.png");

export default function BlackC() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const globeAnim = useRef(new Animated.Value(0)).current;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globeLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const totalRotate = Animated.add(flipAnim, globeAnim);
  const frontRotateY = totalRotate.interpolate({
    inputRange: [0, 540],
    outputRange: ["0deg", "540deg"],
    extrapolate: "extend",
  });
  const backRotateY = totalRotate.interpolate({
    inputRange: [0, 540],
    outputRange: ["180deg", "720deg"],
    extrapolate: "extend",
  });

  const stopGlobeSpin = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (globeLoopRef.current) {
      globeLoopRef.current.stop();
      globeLoopRef.current = null;
    }
  }, []);

  const startGlobeSpin = useCallback(() => {
    stopGlobeSpin();
    globeAnim.setValue(0);
    globeLoopRef.current = Animated.loop(
      Animated.timing(globeAnim, {
        toValue: 360,
        duration: GLOBE_SPIN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    globeLoopRef.current.start();
  }, [globeAnim, stopGlobeSpin]);

  const scheduleGlobeAfterIdle = useCallback(() => {
    stopGlobeSpin();
    idleTimerRef.current = setTimeout(() => {
      startGlobeSpin();
    }, AUTO_ROTATE_DELAY_MS);
  }, [startGlobeSpin, stopGlobeSpin]);

  const handleFlip = () => {
    stopGlobeSpin();
    globeAnim.stopAnimation(() => {
      Animated.timing(globeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        flipAnim.stopAnimation((currentValue) => {
          const normalized = ((currentValue % 360) + 360) % 360;
          const isFrontVisible = normalized < 90 || normalized >= 270;
          const nextValue = isFrontVisible ? 180 : 0;

          Animated.timing(flipAnim, {
            toValue: nextValue,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            scheduleGlobeAfterIdle();
          });
        });
      });
    });
  };

  const closeApplyModal = () => {
    setApplyModalVisible(false);
    setApplyName("");
    setApplyEmail("");
    setApplyPhone("");
    Keyboard.dismiss();
  };

  /** Prefill name, email, phone from logged-in user (AsyncStorage). */
  useEffect(() => {
    if (!applyModalVisible) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (!raw) return;
        const u = JSON.parse(raw) as Record<string, unknown>;
        const firstName =
          typeof u.firstName === "string" ? u.firstName.trim() : "";
        const lastName =
          typeof u.lastName === "string" ? u.lastName.trim() : "";
        const singleName = typeof u.name === "string" ? u.name.trim() : "";
        const displayName =
          singleName || [firstName, lastName].filter(Boolean).join(" ").trim();
        if (displayName) setApplyName(displayName);
        const em = typeof u.email === "string" ? u.email.trim() : "";
        if (em) setApplyEmail(em);
        const phRaw =
          typeof u.phone === "string"
            ? u.phone
            : typeof u.mobileNumber === "string"
              ? u.mobileNumber
              : "";
        const ph = String(phRaw).trim();
        if (ph) setApplyPhone(ph);
      } catch {
        // non-fatal
      }
    })();
  }, [applyModalVisible]);

  const splitFullName = (full: string) => {
    const trimmed = full.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;
    return { firstName, lastName };
  };

  const handleApplySubmit = async () => {
    Keyboard.dismiss();
    const name = applyName.trim();
    const email = applyEmail.trim();
    const phone = applyPhone.trim();
    if (!name) {
      Alert.alert(t("auth.missingInfo"), t("pcard.enterName"));
      return;
    }
    if (!email) {
      Alert.alert(t("auth.missingInfo"), t("auth.enterEmail"));
      return;
    }
    if (!phone) {
      Alert.alert(t("auth.missingInfo"), t("pcard.enterPhone"));
      return;
    }

    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      Alert.alert(t("common.error"), t("pcard.notAuthenticated"));
      return;
    }

    const { firstName, lastName } = splitFullName(name);
    const body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    } = {
      firstName,
      lastName,
      email,
      phone,
    };

    setSubmitting(true);
    try {
      const requestResult = await submitPhysicalCardRequest(accessToken, body);
      if (!requestResult.success) {
        setSubmitting(false);
        Alert.alert(
          t("common.error"),
          requestResult.error || t("pcard.applyError"),
        );
        return;
      }

      const result = await updateProfile(accessToken, body);
      setSubmitting(false);
      if (result.success && result.user) {
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        Alert.alert(t("pcard.applySuccessTitle"), t("pcard.applySuccess"), [
          { text: t("common.ok"), onPress: closeApplyModal },
        ]);
      } else if (result.success) {
        Alert.alert(t("pcard.applySuccessTitle"), t("pcard.applySuccess"), [
          { text: t("common.ok"), onPress: closeApplyModal },
        ]);
      } else {
        // Card request is already saved in backend; profile update failed only.
        Alert.alert(
          t("pcard.applySuccessTitle"),
          `${t("pcard.applySuccess")}\n\n${result.error || "Profile sync failed."}`,
          [{ text: t("common.ok"), onPress: closeApplyModal }],
        );
      }
    } catch {
      setSubmitting(false);
      Alert.alert(t("common.error"), t("auth.unexpectedError"));
    }
  };

  useEffect(() => {
    scheduleGlobeAfterIdle();
    return () => {
      stopGlobeSpin();
    };
  }, [scheduleGlobeAfterIdle, stopGlobeSpin]);

  const benefits = [
    t("pcard.benefit1"),
    t("pcard.benefit2"),
    t("pcard.benefit3"),
    t("pcard.benefit4"),
    t("pcard.benefit5"),
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Sticky header — gradient bar only; subtext sits above the card below */}
        <View style={styles.stickyHeader}>
          <LinearGradient
            colors={STOCK_HEADER_GRADIENT}
            style={styles.headerBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("pcard.title")}</Text>
            <View style={styles.rightSpacer} />
          </LinearGradient>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSubWrap}>
            <Text style={styles.headerSubText}>{t("pcard.subtitle")}</Text>
            <Text style={styles.headerSubHint}>{t("pcard.hint")}</Text>
          </View>

          <View style={styles.cardSection}>
            <Pressable onPress={handleFlip} style={styles.perspectiveWrap}>
              <Animated.View
                style={[
                  styles.globeSpinWrap,
                  {
                    transform: [{ perspective: 1400 }],
                  },
                ]}
              >
                <View style={styles.cardStack}>
                  <Animated.View
                    style={[
                      styles.cardFace,
                      {
                        transform: [
                          { perspective: 1300 },
                          { rotateY: frontRotateY },
                        ],
                      },
                    ]}
                  >
                    {FRONT_CARD_IMAGE ? (
                      <Image
                        source={FRONT_CARD_IMAGE}
                        style={[
                          styles.cardImageCropped,
                          {
                            transform: [{ scale: FRONT_CARD_IMAGE_CROP_SCALE }],
                          },
                        ]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={36}
                          color="#A3A3A3"
                        />
                        <Text style={styles.placeholderTitle}>
                          Front Card Image
                        </Text>
                        <Text style={styles.placeholderSubtext}>
                          Set FRONT_CARD_IMAGE in this file
                        </Text>
                      </View>
                    )}
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.cardFace,
                      styles.backFace,
                      {
                        transform: [
                          { perspective: 1300 },
                          { rotateY: backRotateY },
                        ],
                      },
                    ]}
                  >
                    {BACK_CARD_IMAGE ? (
                      <>
                        <Image
                          source={BACK_CARD_IMAGE}
                          style={[
                            styles.cardImageCropped,
                            {
                              transform: [
                                { scale: BACK_CARD_IMAGE_CROP_SCALE },
                              ],
                            },
                          ]}
                          resizeMode="cover"
                        />
                        <View pointerEvents="none" style={styles.edgeMask} />
                      </>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={36}
                          color="#A3A3A3"
                        />
                        <Text style={styles.placeholderTitle}>
                          Back Card Image
                        </Text>
                        <Text style={styles.placeholderSubtext}>
                          Set BACK_CARD_IMAGE in this file
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                </View>
              </Animated.View>
            </Pressable>
          </View>

          {/* Exclusive benefits — Inspire Wallet context */}
          <View style={styles.exclusiveSection}>
            <Text style={styles.exclusiveTitle}>
              {t("pcard.exclusiveTitle")}
            </Text>

            <View style={styles.starDivider}>
              <View style={styles.starLine} />
              <Ionicons name="star" size={18} color={GOLD_ACCENT} />
              <View style={styles.starLine} />
            </View>

            <Text style={styles.exclusiveBody}>
              {t("pcard.exclusiveBody1")}
            </Text>
            <Text style={styles.exclusiveBodySecondary}>
              {t("pcard.exclusiveBody2")}
            </Text>

            <View style={styles.benefitsRow}>
              {benefits.map((label, index) => (
                <View key={`pcard-benefit-${index}`} style={styles.benefitChip}>
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color={GOLD_ACCENT}
                  />
                  <Text style={styles.benefitChipText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setApplyModalVisible(true)}
            style={styles.signInBtnWrap}
          >
            <LinearGradient
              colors={STOCK_HEADER_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInGradient}
            >
              <Text style={styles.signInBtnText}>{t("pcard.apply")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={applyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeApplyModal}
      >
        <View style={styles.modalRoot}>
          <Pressable onPress={Keyboard.dismiss} style={styles.modalBackdrop} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalCard}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.paymentAmountCard}>
                  <Text style={styles.paymentAmountLabel}>Amount to pay</Text>
                  <Text style={styles.paymentAmountValue}>₱1000</Text>
                </View>
                <Text style={styles.modalTitle}>{t("pcard.modalTitle")}</Text>
                <Text style={styles.modalHint}>{t("pcard.modalHint")}</Text>

                <Text style={styles.inputLabel}>{t("pcard.fullName")}</Text>
                <TextInput
                  style={styles.input}
                  value={applyName}
                  onChangeText={setApplyName}
                  placeholder={t("pcard.fullNamePlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                />

                <Text style={styles.inputLabel}>{t("pcard.email")}</Text>
                <TextInput
                  style={styles.input}
                  value={applyEmail}
                  onChangeText={setApplyEmail}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />

                <Text style={styles.inputLabel}>{t("pcard.phone")}</Text>
                <TextInput
                  style={styles.input}
                  value={applyPhone}
                  onChangeText={setApplyPhone}
                  placeholder={t("pcard.phonePlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalBtnCancel}
                    onPress={closeApplyModal}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalBtnCancelText}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalBtnSubmit}
                    onPress={handleApplySubmit}
                    disabled={submitting}
                    activeOpacity={0.88}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalBtnSubmitText}>
                        {t("pcard.apply")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  stickyHeader: {
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  rightSpacer: {
    width: 40,
    height: 40,
  },
  headerSubWrap: {
    backgroundColor: "transparent",
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerSubText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  headerSubHint: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 0.2,
    maxWidth: 320,
  },
  globeSpinWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: "center",
  },
  perspectiveWrap: {
    width: "100%",
    alignItems: "center",
  },
  cardStack: {
    width: 350,
    height: 224,
    maxWidth: "100%",
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 22,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  backFace: {
    backgroundColor: "#000000",
    borderWidth: 2.6,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageCropped: {
    width: "100%",
    height: "100%",
  },
  edgeMask: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "#000000",
    borderRadius: 22,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D4D4D4",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  placeholderTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#737373",
    textAlign: "center",
  },
  placeholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#A3A3A3",
    textAlign: "center",
  },
  exclusiveSection: {
    marginTop: 28,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  exclusiveTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  starDivider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 280,
    marginBottom: 18,
  },
  starLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#D1D5DB",
  },
  exclusiveBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 14,
  },
  exclusiveBodySecondary: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 22,
  },
  benefitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  benefitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  benefitChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  signInBtnWrap: {
    marginTop: 28,
    marginHorizontal: 24,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  signInGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboard: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    zIndex: 1,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalScroll: {
    maxHeight: MODAL_SCROLL_MAX_H,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  paymentAmountCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  paymentAmountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  paymentAmountValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E15816",
    letterSpacing: 0.2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  modalBtnSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLOR,
  },
  modalBtnSubmitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
