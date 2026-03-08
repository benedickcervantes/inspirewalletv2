import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getMe, updateProfile } from "../../configs/api";
import { auth, firestore } from "../../configs/firebase";
import { useResponsive } from "../../utils/responsive";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from "../../constants/locales";
import { useLanguage } from "../../context/LanguageContext";
import CustomLoader from "../Loader/CustomLoader";

const THEME_COLOR = "#E15816";
const USER_PREFERRED_LANGUAGE_KEY = "user_preferred_language";

export default function Placeholder() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { horizontalPadding, isShortScreen, isSmallScreen, isTinyScreen } =
    useResponsive();
  const { t, language: contextLanguage, setLanguage } = useLanguage();
  const isSmallDevice = width < 375;
  const scale = Math.min(width / 375, 1.25);
  const headerPaddingTop =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight ?? 0, 12)
      : Math.max(insets.top, 12);
  const headerPaddingHorizontal = isSmallDevice ? 16 : 20;
  const sectionMarginHorizontal = isSmallDevice ? 12 : 16;
  const sectionPadding = isSmallDevice ? 12 : 16;
  const avatarSize = Math.round(72 * scale);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [passcode, setPasscode] = useState("");

  const fetchUserData = useCallback(async () => {
    try {
      const preferredLang = await AsyncStorage.getItem(
        USER_PREFERRED_LANGUAGE_KEY,
      );
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        const result = await getMe(accessToken);
        if (result.success && result.user) {
          const u = result.user as Record<string, unknown>;
          const merged = {
            ...u,
            language:
              (u.language as string) ?? preferredLang ?? DEFAULT_LANGUAGE,
          };
          setUserData(merged);
          setLoading(false);
          return;
        }
      }

      const user = auth?.currentUser;
      if (user && firestore) {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            ...data,
            language: normalizeLanguage(
              (data?.language as string) ?? preferredLang,
            ),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const hasPasscode = !!userData?.hasPasscode;

  const handleSaveName = async () => {
    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    if (!firstName || !lastName) {
      Alert.alert("Validation", "First name and last name are required.");
      return;
    }
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      Alert.alert("Error", "Not authenticated.");
      return;
    }
    setSaving(true);
    const body: Record<string, string> = { firstName, lastName };
    if (editMiddleName.trim()) body.middleName = editMiddleName.trim();
    if (hasPasscode) {
      if (!passcode || !/^\d{4}$/.test(passcode)) {
        Alert.alert("Passcode Required", "Enter your 4-digit passcode.");
        setSaving(false);
        return;
      }
      body.passcode = passcode;
    }
    const result = await updateProfile(accessToken, body);
    setSaving(false);
    if (result.success && result.user) {
      setUserData(result.user);
      setShowNameModal(false);
      setPasscode("");
    } else {
      Alert.alert("Error", result.error || "Failed to update profile.");
    }
  };

  const handleSavePhone = async () => {
    const phone = editPhone.trim();
    if (!phone) {
      Alert.alert("Validation", "Contact number is required.");
      return;
    }
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      Alert.alert("Error", "Not authenticated.");
      return;
    }
    setSaving(true);
    const body: Record<string, string> = { phone };
    if (hasPasscode) {
      if (!passcode || !/^\d{4}$/.test(passcode)) {
        Alert.alert("Passcode Required", "Enter your 4-digit passcode.");
        setSaving(false);
        return;
      }
      body.passcode = passcode;
    }
    const result = await updateProfile(accessToken, body);
    setSaving(false);
    if (result.success && result.user) {
      setUserData(result.user);
      setShowPhoneModal(false);
      setPasscode("");
    } else {
      Alert.alert("Error", result.error || "Failed to update profile.");
    }
  };

  const openNameModal = () => {
    setEditFirstName(userData?.firstName ?? "");
    setEditLastName(userData?.lastName ?? "");
    setEditMiddleName(userData?.middleName ?? "");
    setPasscode("");
    setShowNameModal(true);
  };

  const openPhoneModal = () => {
    setEditPhone(userData?.phone ?? userData?.phoneNumber ?? "");
    setPasscode("");
    setShowPhoneModal(true);
  };

  const openCompanyModal = () => {
    (navigation as any).navigate("KYCcompany");
  };

  const fullName =
    userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : userData?.displayName || userData?.name || t("common.user");
  const email = userData?.email || "user@example.com";
  const isAgent = userData?.isAgent || userData?.role === "agent" || false;
  const isPremium =
    userData?.isPremium || userData?.accountLevel === "premium" || false;
  const accountNumber =
    userData?.accountNumber || userData?.id || "000053126300";
  const companyName =
    userData?.companyName ||
    t("Tap to add company name") ||
    "Tap to add company name";
  const companyKycStatus: string | undefined =
    userData?.companyKycStatus ?? userData?.company_kyc_status ?? undefined;
  const contactNumber =
    userData?.phone ??
    userData?.phoneNumber ??
    t("Tap to add phone number") ??
    "Tap to add phone number";
  const lineLink =
    userData?.lineAccountLink ?? userData?.lineLink ?? t("common.notProvided");
  const viberLink = userData?.viberLink || t("common.notProvided");
  const whatsappLink = userData?.whatsappLink || t("common.notProvided");
  const accountLevelLabel = isPremium
    ? t("profile.premium")
    : t("profile.basic");
  const referrerName =
    userData?.referrerName ??
    userData?.agentReferrer ??
    userData?.referredBy ??
    null;
  const agentReferrer = referrerName ?? t("common.notProvided");
  const language = normalizeLanguage(userData?.language ?? contextLanguage);

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    setUserData((prev: any) =>
      prev ? { ...prev, language: selectedLabel } : null,
    );
    await AsyncStorage.setItem(USER_PREFERRED_LANGUAGE_KEY, selectedLabel);
    const userJson = await AsyncStorage.getItem("user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({ ...user, language: selectedLabel }),
        );
      } catch (_) {}
    }
    setLanguageModalVisible(false);
  };

  const memberSince =
    userData?.createdAt || userData?.joinedAt
      ? new Date(
          userData.createdAt?.seconds
            ? userData.createdAt.seconds * 1000
            : userData.joinedAt?.seconds
              ? userData.joinedAt.seconds * 1000
              : userData.createdAt || userData.joinedAt,
        ).toLocaleDateString()
      : "—";
  const statusRaw = userData?.status || "Active";
  const status = statusRaw === "Active" ? t("profile.active") : statusRaw;

  if (loading) {
    return <CustomLoader text={t("common.loading")} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 40),
          paddingHorizontal: 0,
        }}
        style={styles.scrollView}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={[
            styles.header,
            {
              paddingTop: headerPaddingTop,
              paddingHorizontal: headerPaddingHorizontal,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={[
              styles.backButton,
              { top: headerPaddingTop, left: headerPaddingHorizontal },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonTouchTarget}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <Ionicons
                name="person"
                size={Math.round(40 * scale)}
                color="#E15816"
              />
            </View>
          </View>

          {/* User Info */}
          <Text
            style={[styles.userName, { fontSize: Math.round(22 * scale) }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {fullName}
          </Text>
          <Text
            style={[styles.userEmail, { fontSize: Math.round(14 * scale) }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {email}
          </Text>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {isAgent ? (
              <View style={styles.agentBadge}>
                <MaterialCommunityIcons
                  name="shield-account"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.badgeText}>
                  {t("profile.agent").toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.investorBadge}>
                <MaterialCommunityIcons
                  name="shield-account"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.badgeText}>
                  {t("profile.investor").toUpperCase()}
                </Text>
              </View>
            )}
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={16} color="#333" />
                <Text style={styles.premiumBadgeText}>
                  {t("profile.premium").toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Account Details Section */}
        <View
          style={[
            styles.section,
            {
              marginHorizontal: sectionMarginHorizontal,
              padding: sectionPadding,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={22} color="#E15816" />
            <Text
              style={[
                styles.sectionTitle,
                { fontSize: Math.round(16 * scale) },
              ]}
            >
              {t("profile.accountDetails")}
            </Text>
          </View>

          <DetailItem
            icon="person-outline"
            label={t("profile.name")}
            value={fullName}
            editable
            onEdit={openNameModal}
          />
          <DetailItem
            icon="business-outline"
            label={t("profile.companyName")}
            value={companyName}
            editable
            onEdit={openCompanyModal}
            isPlaceholder={!userData?.companyName}
            badge={
              companyKycStatus === "verified"
                ? "Verified"
                : companyKycStatus === "pending"
                  ? "Pending"
                  : undefined
            }
            badgeColor={
              companyKycStatus === "verified"
                ? "#10B981"
                : companyKycStatus === "pending"
                  ? "#F59E0B"
                  : undefined
            }
            verified={companyKycStatus === "verified"}
          />
          <DetailItem
            icon="call-outline"
            label={t("profile.contactNumber")}
            value={contactNumber}
            editable
            onEdit={openPhoneModal}
            isPlaceholder={!userData?.phone && !userData?.phoneNumber}
          />
          <DetailItem
            icon="link-outline"
            label={t("profile.lineLink")}
            value={lineLink}
            editable
          />
          <DetailItem
            icon="chatbubble-outline"
            label={t("profile.viberLink")}
            value={viberLink}
            editable
          />
          <DetailItem
            icon="logo-whatsapp"
            label={t("profile.whatsappLink")}
            value={whatsappLink}
            editable
          />
          <DetailItem
            icon="card-outline"
            label={t("profile.accountNumber")}
            value={accountNumber}
            editable
          />
          <DetailItem
            icon="star-outline"
            label={t("profile.accountType")}
            value={isAgent ? t("profile.agent") : t("profile.investor")}
            badge={isAgent ? t("profile.agent") : t("profile.investor")}
            badgeColor={isAgent ? "#E15816" : "#999"}
          />
          <DetailItem
            icon="trophy-outline"
            label={t("profile.accountLevel")}
            value={accountLevelLabel}
            badge={accountLevelLabel}
            badgeColor={isPremium ? "#FFD700" : "#999"}
            verified={isPremium}
            showVerifyButton={!isPremium}
            onVerifyPress={() =>
              (navigation as { navigate: (name: string) => void }).navigate(
                "KYCVerification",
              )
            }
            verifyButtonLabel={t("profile.verify")}
          />
          <DetailItem
            icon="finger-print-outline"
            label={t("profile.accountNumber")}
            value={accountNumber}
          />
          <DetailItem
            icon="people-outline"
            label={t("profile.agentReferrer")}
            value={agentReferrer}
            badge={referrerName ? t("profile.referred") : undefined}
            badgeColor={referrerName ? "#FFD700" : undefined}
          />
          <DetailItem
            icon="language-outline"
            label={t("profile.language")}
            value={language}
            editable
            onEditPress={() => setLanguageModalVisible(true)}
          />
        </View>

        {/* Account Status Section */}
        <View
          style={[
            styles.section,
            {
              marginHorizontal: sectionMarginHorizontal,
              padding: sectionPadding,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#E15816"
            />
            <Text
              style={[
                styles.sectionTitle,
                { fontSize: Math.round(16 * scale) },
              ]}
            >
              {t("profile.accountStatus")}
            </Text>
          </View>

          <DetailItem
            icon="checkmark-circle"
            label={t("profile.status")}
            value={status}
            badge={status}
            badgeColor="#4CAF50"
          />
          <DetailItem
            icon="calendar-outline"
            label={t("profile.memberSince")}
            value={memberSince}
          />
        </View>
      </ScrollView>

      {/* Name Edit Modal */}
      <Modal visible={showNameModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity
                onPress={() => !saving && setShowNameModal(false)}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.modalScroll}
            >
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="First name"
                  placeholderTextColor="#999"
                  editable={!saving}
                  autoCapitalize="words"
                />
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Last name"
                  placeholderTextColor="#999"
                  editable={!saving}
                  autoCapitalize="words"
                />
                <Text style={styles.inputLabel}>Middle Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editMiddleName}
                  onChangeText={setEditMiddleName}
                  placeholder="Middle name"
                  placeholderTextColor="#999"
                  editable={!saving}
                  autoCapitalize="words"
                />
                {hasPasscode && (
                  <>
                    <Text style={styles.inputLabel}>Passcode *</Text>
                    <TextInput
                      style={styles.input}
                      value={passcode}
                      onChangeText={setPasscode}
                      placeholder="4-digit passcode"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      editable={!saving}
                    />
                  </>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveName}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Phone Edit Modal */}
      <Modal visible={showPhoneModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Contact Number</Text>
              <TouchableOpacity
                onPress={() => !saving && setShowPhoneModal(false)}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Contact Number *</Text>
              <Text style={styles.inputHint}>
                Include country code (e.g., +1, +81, +82, +966, +63)
              </Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+1234567890"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                editable={!saving}
              />
              {hasPasscode && (
                <>
                  <Text style={styles.inputLabel}>Passcode *</Text>
                  <TextInput
                    style={styles.input}
                    value={passcode}
                    onChangeText={setPasscode}
                    placeholder="4-digit passcode"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    editable={!saving}
                  />
                </>
              )}
            </View>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSavePhone}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Modal - matches Register language options (transparent overlay + outer glow) */}
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
                padding: isSmallScreen || isTinyScreen ? 18 : 24,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.languageModalHeader}>
              <View style={styles.languageMapGlobe}>
                <Ionicons
                  name="globe-outline"
                  size={isSmallScreen || isTinyScreen ? 32 : 40}
                  color="#E15816"
                />
              </View>
              <Text
                style={[
                  styles.languageModalTitle,
                  (isSmallScreen || isTinyScreen) && { fontSize: 16 },
                ]}
              >
                {t("profile.selectLanguage")}
              </Text>
              <Text
                style={[
                  styles.languageModalSubtitle,
                  (isSmallScreen || isTinyScreen) && { fontSize: 12 },
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
                      color="#E15816"
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
    </SafeAreaView>
  );
}

interface DetailItemProps {
  icon: string;
  label: string;
  value: string;
  editable?: boolean;
  onEditPress?: () => void;
  badge?: string;
  badgeColor?: string;
  verified?: boolean;
  showVerifyButton?: boolean;
  onVerifyPress?: () => void;
  verifyButtonLabel?: string;
  onEdit?: () => void;
  isPlaceholder?: boolean;
}

function DetailItem({
  icon,
  label,
  value,
  editable,
  onEditPress,
  onEdit,
  badge,
  badgeColor,
  verified,
  showVerifyButton,
  onVerifyPress,
  verifyButtonLabel = "Verify",
  isPlaceholder = false,
}: DetailItemProps) {
  const onEditHandler = onEditPress ?? onEdit;
  const handlePress = editable && onEditHandler ? onEditHandler : undefined;
  const content = (
    <>
      <View style={styles.detailHeader}>
        <Ionicons name={icon as any} size={18} color={THEME_COLOR} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueContainer}>
        <Text
          style={
            isPlaceholder ? styles.detailValuePlaceholder : styles.detailValue
          }
        >
          {value}
        </Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeTextSmall}>{badge}</Text>
            {verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#333"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        )}
        {showVerifyButton && onVerifyPress && (
          <TouchableOpacity
            style={[styles.verifyBadge, { backgroundColor: "#FFD700" }]}
            onPress={onVerifyPress}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={14} color="#333" />
            <Text style={styles.verifyBadgeText}>{verifyButtonLabel}</Text>
          </TouchableOpacity>
        )}
        {editable && onEditHandler && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={onEditHandler}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={22} color="#E15816" />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
  return (
    <View style={styles.detailItem}>
      {handlePress ? (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: "absolute",
    zIndex: 10,
    padding: 4,
  },
  backButtonTouchTarget: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  agentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 0, 0, 0.9)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  investorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32", // Professional green for Investor
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    marginLeft: 4,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  detailItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  detailValuePlaceholder: {
    fontSize: 15,
    fontWeight: "500",
    color: "#999",
    flex: 1,
    fontStyle: "italic",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },
  badgeTextSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editButton: {
    padding: 12,
    marginLeft: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
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
        shadowColor: "#E15816",
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
  languageMapGlobe: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF0E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
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
    justifyContent: "space-between",
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
    borderColor: "#E15816",
    ...Platform.select({
      ios: {
        shadowColor: "#E15816",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
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
    color: "#E15816",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalScroll: {
    maxHeight: 320,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: THEME_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
});
