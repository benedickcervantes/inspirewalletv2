import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle } from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { isServiceUnderMaintenance } from "../../../lib/maintenance";
import type { RootStackParamList } from "../../../types/navigation";

import ActivityModal from '../../components/ActivityModal';
import {
  applyAgentRequest,
  getReferralCode,
  getMe,
  lookupReferralCode,
} from "../../../configs/api";
// Static theme - no backend
const THEME_COLOR = "#E15816";

// Types
interface AgentUser {
  id: string;
  firstName: string;
  lastName: string;
  referralCode: string;
}

type ModalType = "success" | "error" | "warning" | "info";

interface ModalConfig {
  title: string;
  message: string;
  type: ModalType;
  showCloseButton: boolean;
  onConfirm: (() => void) | null;
  confirmText: string;
  showCancelButton: boolean;
  cancelText: string;
}

interface ProfessionalModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: ModalType;
  showCloseButton?: boolean;
  onConfirm?: (() => void) | null;
  confirmText?: string;
  showCancelButton?: boolean;
  cancelText?: string;
}

// No RTL - returns empty object (TextStyle for Text/TextInput compatibility)
const getRTLStyles = (_lang?: string): TextStyle => ({});

// Professional Modal Component (static, no BlurView dependency)
const ProfessionalModal = ({
  visible,
  onClose,
  title,
  message,
  type = "info",
  showCloseButton = true,
  onConfirm = null,
  confirmText = "OK",
  showCancelButton = false,
  cancelText = "Cancel",
}: ProfessionalModalProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      const timeoutId = setTimeout(() => {
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, iconScaleAnim]);

  const getIconAndColor = (): {
    icon: string;
    color: string;
    bgColor: string;
  } => {
    switch (type) {
      case "success":
        return { icon: "✓", color: "#10B981", bgColor: "#ECFDF5" };
      case "error":
        return { icon: "!", color: "#EF4444", bgColor: "#FEF2F2" };
      case "warning":
        return { icon: "!", color: "#F59E0B", bgColor: "#FFFBEB" };
      default:
        return { icon: "i", color: "#3B82F6", bgColor: "#EFF6FF" };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  if (!visible) return null;

  return (
    <ActivityModal transparent={true} animationType="none" visible={visible}>
      <Animated.View style={[modalStyles.modalOverlay, { opacity: fadeAnim }]}>
        <View style={modalStyles.androidModalOverlay}>
          <Animated.View
            style={[
              modalStyles.modalContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View
              style={[modalStyles.iconContainer, { backgroundColor: bgColor }]}
            >
              <Animated.Text
                style={[
                  modalStyles.iconText,
                  { color, transform: [{ scale: iconScaleAnim }] },
                ]}
              >
                {icon}
              </Animated.Text>
            </View>

            <Text style={modalStyles.modalTitle}>{title}</Text>
            <Text style={modalStyles.modalMessage}>{message}</Text>

            <View style={modalStyles.buttonContainer}>
              {showCloseButton && (
                <TouchableOpacity
                  style={[modalStyles.modalButton, { backgroundColor: color }]}
                  onPress={onConfirm ?? onClose}
                >
                  <Text style={modalStyles.confirmButtonText}>
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              )}

              {showCancelButton && (
                <TouchableOpacity
                  style={[modalStyles.modalButton, modalStyles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={modalStyles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </ActivityModal>
  );
};

export default function AgentServices() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "AgentRequest">
    >();
  const { t, language } = useLanguage();
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Check maintenance status on focus
  useFocusEffect(
    useCallback(() => {
      setCheckingMaintenance(true);
      const checkMaintenance = async () => {
        try {
          const isMaintenance = await isServiceUnderMaintenance("agent");
          setIsUnderMaintenance(isMaintenance);
          if (!isMaintenance) {
            await loadCurrentUser();
          }
        } catch (error) {
          console.error("Error checking maintenance:", error);
        } finally {
          setCheckingMaintenance(false);
        }
      };
      checkMaintenance();
    }, [loadCurrentUser]),
  );

  const [fullName, setFullName] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [hierarchicalAgentCode, setHierarchicalAgentCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AgentUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AgentUser | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    title: "",
    message: "",
    type: "info",
    showCloseButton: true,
    onConfirm: null,
    confirmText: "OK",
    showCancelButton: false,
    cancelText: "Cancel",
  });

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t("agentRequest.header.title"),
      headerTransparent: false,
    });
  }, [language, navigation, t]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        showModal({
          title: t("agentRequest.modals.accessRestricted.title"),
          message: t("agentRequest.modals.accessRestricted.message"),
          type: "warning",
          onConfirm: () => {
            hideModal();
            navigation.navigate("Main");
          },
        });
        return;
      }
      setAccessToken(token);

      const meRes = await getMe(token);
      if (!meRes.success || !meRes.user) {
        throw new Error(meRes.error || t("agentRequest.modals.error.message"));
      }

      const user = meRes.user as {
        firstName?: string;
        lastName?: string;
        isAgent?: boolean;
      };
      const composedName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      setFullName(composedName);

      const codeRes = await getReferralCode(token);
      if (codeRes.success && codeRes.referralCode) {
        setReferralCode(codeRes.referralCode);
        setHierarchicalAgentCode(codeRes.referralCode);
      }

      if (user.isAgent) {
        showModal({
          title: t("agentRequest.modals.alreadyAgent.title"),
          message: t("agentRequest.modals.alreadyAgent.message"),
          type: "info",
          onConfirm: () => {
            hideModal();
            navigation.goBack();
          },
        });
      }
    } catch (error) {
      showModal({
        title: t("agentRequest.modals.error.title"),
        message:
          error instanceof Error
            ? error.message
            : t("agentRequest.modals.error.message"),
        type: "error",
      });
    }
  }, [navigation, t]);

  const showModal = (config: Partial<ModalConfig>) => {
    setModalConfig({
      title: "",
      message: "",
      type: "info",
      showCloseButton: true,
      onConfirm: null,
      confirmText: "OK",
      showCancelButton: false,
      cancelText: "Cancel",
      ...config,
    });
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
  };

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const lookup = await lookupReferralCode(searchTerm.trim());
      if (!lookup.success || !lookup.exists || !lookup.referralCode || !lookup.userId) {
        setSearchResults([]);
        return;
      }

      const foundAgent: AgentUser = {
        id: lookup.userId,
        firstName: lookup.firstName || "",
        lastName: lookup.lastName || "",
        referralCode: lookup.referralCode,
      };
      setSearchResults([foundAgent]);
      selectUser(foundAgent);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setSearchResults([]);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.trim()) {
      searchTimeout.current = setTimeout(() => {
        searchUsers(text);
      }, 500);
    }
  };

  const selectUser = (user: AgentUser) => {
    setSelectedUser(user);
    setSearchResults([]);

    showModal({
      title: t("agentRequest.modals.agentFound.title"),
      message: t("agentRequest.modals.agentFound.message")
        .replace("{firstName}", user.firstName)
        .replace("{lastName}", user.lastName)
        .replace("{agentNumber}", user.referralCode),
      type: "success",
    });

    if (referralCode && user.referralCode) {
      setHierarchicalAgentCode(referralCode);
    }
  };

  const submitAgentRequest = async () => {
    if (!referralCode) {
      showModal({
        title: t("agentRequest.modals.missingAgentNumber.title"),
        message: t("agentRequest.modals.missingAgentNumber.message"),
        type: "warning",
      });
      return;
    }
    if (!accessToken) {
      showModal({
        title: t("agentRequest.modals.accessRestricted.title"),
        message: t("agentRequest.modals.accessRestricted.message"),
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await applyAgentRequest(accessToken, {
        parentReferralCode: selectedUser?.referralCode,
      });
      if (!result.success) {
        throw new Error(
          result.error || t("agentRequest.modals.error.submitFailed"),
        );
      }
      showModal({
        title: t("agentRequest.modals.requestSubmitted.title"),
        message: t("agentRequest.modals.requestSubmitted.message").replace(
          "{requestId}",
          result.referralCode || referralCode,
        ),
        type: "success",
        onConfirm: () => {
          hideModal();
          navigation.navigate("Main");
        },
      });
    } catch (error) {
      showModal({
        title: t("agentRequest.modals.error.title"),
        message:
          error instanceof Error
            ? error.message
            : t("agentRequest.modals.error.submitFailed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingMaintenance) {
    return (
      <View style={styles.inlineLoadingScreen}>
        <View style={styles.inlineSkeletonCard}>
          <View style={styles.inlineSkeletonLineWide} />
          <View style={styles.inlineSkeletonLineShort} />
          <View style={styles.inlineSkeletonLineWide} />
        </View>
      </View>
    );
  }

  if (isUnderMaintenance) {
    return (
      <View style={styles.inlineLoadingScreen}>
        <View style={styles.inlineSkeletonCard}>
          <Text style={styles.maintenanceText}>{t("support.serviceMaintenance")}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.inlineLoadingScreen}>
        <View style={styles.inlineSkeletonCard}>
          <View style={styles.inlineSkeletonLineWide} />
          <View style={styles.inlineSkeletonLineShort} />
          <View style={styles.inlineSkeletonLineWide} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.androidSafeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.headerContent}>
                <Ionicons
                  name="person-add"
                  size={32}
                  color={THEME_COLOR}
                  style={styles.headerIcon}
                />
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.headerTitle, getRTLStyles(language)]}>
                    {t("agentRequest.content.headerTitle")}
                  </Text>
                  <Text style={[styles.headerSubtitle, getRTLStyles(language)]}>
                    {t("agentRequest.content.headerSubtitle")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={THEME_COLOR}
                />
                <Text style={[styles.infoTitle, getRTLStyles(language)]}>
                  {t("agentRequest.content.requestInformation.title")}
                </Text>
              </View>
              <Text style={[styles.infoText, getRTLStyles(language)]}>
                {t("agentRequest.content.requestInformation.text")}
              </Text>
            </View>

            {/* Request Form Card */}
            <View style={styles.formCard}>
              <Text style={[styles.sectionTitle, getRTLStyles(language)]}>
                {t("agentRequest.content.form.title")}
              </Text>

              {/* Personal Information Section */}
              <View style={styles.formSection}>
                <Text style={[styles.subsectionTitle, getRTLStyles(language)]}>
                  {t("agentRequest.content.form.personalInformation.title")}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, getRTLStyles(language)]}>
                    {t(
                      "agentRequest.content.form.personalInformation.fullNameLabel",
                    )}
                  </Text>
                  <View style={styles.readOnlyInput}>
                    <Text style={[styles.readOnlyText, getRTLStyles(language)]}>
                      {fullName || "—"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Referral Code Section */}
              <View style={styles.formSection}>
                <Text style={[styles.subsectionTitle, getRTLStyles(language)]}>
                  {t("agentRequest.content.form.agentNumber.title")}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, getRTLStyles(language)]}>
                    {t("agentRequest.content.form.agentNumber.generateLabel")}
                  </Text>
                  <View style={styles.agentCodeContainer}>
                    <View
                      style={[
                        styles.agentCodeDisplay,
                        !referralCode && styles.agentCodeDisplayEmpty,
                      ]}
                    >
                      <Text
                        style={[
                          styles.agentCodeText,
                          !referralCode && styles.agentCodeTextEmpty,
                          getRTLStyles(language),
                        ]}
                      >
                        {referralCode ||
                          t(
                            "agentRequest.content.form.agentNumber.placeholder",
                          )}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.agentCodeHint, getRTLStyles(language)]}>
                    {t("agentRequest.content.form.agentNumber.hint")}
                  </Text>
                </View>
              </View>

              {/* Agent Search Section */}
              <View style={styles.formSection}>
                <Text style={[styles.subsectionTitle, getRTLStyles(language)]}>
                  {t("agentRequest.content.form.parentAgent.title")}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, getRTLStyles(language)]}>
                    {t("agentRequest.content.form.parentAgent.searchLabel")}
                  </Text>
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={[styles.searchInput, getRTLStyles(language)]}
                      placeholder={t(
                        "agentRequest.content.form.parentAgent.searchPlaceholder",
                      )}
                      placeholderTextColor="#999"
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                    />
                    {isSearching && (
                      <ActivityIndicator
                        size="small"
                        color={THEME_COLOR}
                        style={styles.searchLoading}
                      />
                    )}
                  </View>
                  <Text style={[styles.searchHint, getRTLStyles(language)]}>
                    {t("agentRequest.content.form.parentAgent.searchHint")}
                  </Text>
                  {selectedUser && (
                    <View style={styles.selectedUserContainer}>
                      <View style={styles.selectedUserHeader}>
                        <Ionicons name="person" size={16} color={THEME_COLOR} />
                        <Text
                          style={[
                            styles.selectedUserTitle,
                            getRTLStyles(language),
                          ]}
                        >
                          {t(
                            "agentRequest.content.form.parentAgent.selectedAgent",
                          )}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.selectedUserName,
                          getRTLStyles(language),
                        ]}
                      >
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Text>
                      <Text
                        style={[
                          styles.selectedUserAgentCode,
                          getRTLStyles(language),
                        ]}
                      >
                        {t(
                          "agentRequest.content.form.parentAgent.parentAgentCode",
                        )}{" "}
                        {selectedUser.referralCode}
                      </Text>
                      {hierarchicalAgentCode ? (
                        <Text
                          style={[
                            styles.hierarchicalAgentCode,
                            getRTLStyles(language),
                          ]}
                        >
                          {t(
                            "agentRequest.content.form.parentAgent.yourAgentCode",
                          )}{" "}
                          {hierarchicalAgentCode}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {searchQuery &&
                    searchResults.length === 0 &&
                    !isSearching && (
                      <View style={styles.noResultsContainer}>
                        <Text
                          style={[styles.noResultsText, getRTLStyles(language)]}
                        >
                          {t(
                            "agentRequest.content.form.parentAgent.noResults",
                          ).replace("{query}", searchQuery)}
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={submitAgentRequest}
              disabled={loading}
            >
              <View style={styles.submitButtonContent}>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="white"
                    style={styles.loadingIcon}
                  />
                ) : (
                  <Ionicons
                    name="send-outline"
                    size={20}
                    color="white"
                    style={styles.submitIcon}
                  />
                )}
                <Text style={styles.submitButtonText}>
                  {loading
                    ? t("agentRequest.content.submitButton.submitting")
                    : t("agentRequest.content.submitButton.submit")}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCloseButton={modalConfig.showCloseButton}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText || t("common.ok")}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText || t("common.cancel")}
      />
    </View>
  );
}

// Modal Styles
const modalStyles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  androidModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 320,
    width: "90%",
    maxWidth: 360,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 35,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 32,
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  modalMessage: {
    fontSize: 17,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 36,
    paddingHorizontal: 12,
    fontWeight: "400",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  modalButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 56,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  inlineLoadingScreen: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  inlineSkeletonCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  inlineSkeletonLineWide: {
    height: 14,
    borderRadius: 8,
    backgroundColor: "#ECECEC",
    width: "100%",
  },
  inlineSkeletonLineShort: {
    height: 14,
    borderRadius: 8,
    backgroundColor: "#ECECEC",
    width: "65%",
  },
  maintenanceText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    fontWeight: "600",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  androidSafeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 5,
    borderLeftColor: THEME_COLOR,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 16,
    backgroundColor: "rgba(229, 88, 22, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: THEME_COLOR,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME_COLOR,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME_COLOR,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME_COLOR,
    marginBottom: 20,
    textAlign: "center",
  },
  formSection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.2)",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  readOnlyInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  agentCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentCodeDisplay: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
  },
  agentCodeDisplayEmpty: {
    backgroundColor: "#f8f9fa",
    borderColor: "#d1d5db",
  },
  agentCodeText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  agentCodeTextEmpty: {
    color: "#6b7280",
    fontWeight: "400",
    fontStyle: "italic",
  },
  generateButton: {
    backgroundColor: THEME_COLOR,
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
  },
  generateButtonDisabled: {
    backgroundColor: "#999",
  },
  generateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  agentCodeHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  searchHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  searchContainer: {
    position: "relative",
  },
  searchInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    paddingRight: 50,
    fontSize: 16,
    color: "#333",
  },
  searchLoading: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  noResultsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noResultsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  selectedUserContainer: {
    marginTop: 12,
    backgroundColor: "rgba(225, 88, 22, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.2)",
  },
  selectedUserHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedUserTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLOR,
    marginLeft: 6,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  selectedUserAgentCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  hierarchicalAgentCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  submitButton: {
    backgroundColor: THEME_COLOR,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  bottomSpacing: {
    height: 40,
  },
});
