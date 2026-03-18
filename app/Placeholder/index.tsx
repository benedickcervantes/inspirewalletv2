import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
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
import {
  decodeQrImage,
  getCompanyKycStatus,
  getMe,
  updateProfile,
} from "../../configs/api";
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
  const [showContactLinksModal, setShowContactLinksModal] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLineLink, setEditLineLink] = useState("");
  const [editViberLink, setEditViberLink] = useState("");
  const [editWhatsappLink, setEditWhatsappLink] = useState("");
  const [isProcessingContactQR, setIsProcessingContactQR] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [companyKycView, setCompanyKycView] = useState<{
    status?: string;
    companyName?: string;
  } | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const preferredLang = await AsyncStorage.getItem(
        USER_PREFERRED_LANGUAGE_KEY,
      );
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        const [meResult, companyResult] = await Promise.all([
          getMe(accessToken),
          getCompanyKycStatus(accessToken).catch(() => null),
        ]);

        if (meResult.success && meResult.user) {
          const u = meResult.user as Record<string, unknown>;
          const merged = {
            ...u,
            language:
              (u.language as string) ?? preferredLang ?? DEFAULT_LANGUAGE,
          };
          setUserData(merged);
        }

        if (companyResult && companyResult.success && companyResult.data) {
          const data = companyResult.data as {
            status?: string;
            companyName?: string;
          };
          setCompanyKycView({
            status: data.status,
            companyName: data.companyName,
          });
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

  // Refetch when profile screen is focused (e.g. after submitting company KYC)
  // so company name row shows Unverified/Verified badge.
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData]),
  );

  const hasPasscode = !!userData?.hasPasscode;

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

    if (/^[a-z0-9.-]+\.[a-z]{2,}\/?/i.test(v)) {
      return `https://${v}`;
    }

    return v;
  };

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
      setSuccessMessage("Your name has been updated successfully.");
      setShowSuccessModal(true);
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
      setSuccessMessage("Your contact number has been updated successfully.");
      setShowSuccessModal(true);
    } else {
      Alert.alert("Error", result.error || "Failed to update profile.");
    }
  };

  const handleSaveContactLinks = async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      Alert.alert("Error", "Not authenticated.");
      return;
    }
    const body: Record<string, string> = {};
    const line = editLineLink.trim();
    const viber = editViberLink.trim();
    const whatsapp = editWhatsappLink.trim();
    if (line) body.lineAccountLink = normalizeMessagingLink(line, "line");
    if (viber) body.viberLink = normalizeMessagingLink(viber, "viber");
    if (whatsapp) body.whatsappLink = normalizeMessagingLink(whatsapp, "whatsapp");

    if (!body.lineAccountLink && !body.viberLink && !body.whatsappLink) {
      Alert.alert("Validation", "Please enter at least one contact link.");
      return;
    }

    if (hasPasscode) {
      if (!passcode || !/^\d{4}$/.test(passcode)) {
        Alert.alert("Passcode Required", "Enter your 4-digit passcode.");
        return;
      }
      body.passcode = passcode;
    }

    setSaving(true);
    const result = await updateProfile(accessToken, body);
    setSaving(false);
    if (result.success && result.user) {
      setUserData(result.user);
      setShowContactLinksModal(false);
      setPasscode("");
      setSuccessMessage("Your contact links have been updated successfully.");
      setShowSuccessModal(true);
    } else {
      Alert.alert("Error", result.error || "Failed to update profile.");
    }
  };

  const openContactLinksModal = () => {
    setEditLineLink(
      userData?.lineAccountLink && userData.lineAccountLink !== t("common.notProvided")
        ? userData.lineAccountLink
        : "",
    );
    setEditViberLink(
      userData?.viberLink && userData.viberLink !== t("common.notProvided")
        ? userData.viberLink
        : "",
    );
    setEditWhatsappLink(
      userData?.whatsappLink && userData.whatsappLink !== t("common.notProvided")
        ? userData.whatsappLink
        : "",
    );
    setPasscode("");
    setShowContactLinksModal(true);
  };

  const handleUploadContactQr = async (
    provider: "line" | "viber" | "whatsapp",
  ) => {
    try {
      setIsProcessingContactQR(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const decoded = await decodeQrImage(
        asset.uri,
        provider,
        asset.mimeType,
      );
      if (!decoded.success) {
        Alert.alert(
          "QR Decode Failed",
          decoded.error || "Unable to read QR code from image.",
        );
        return;
      }

      const raw = (decoded.normalizedLink || decoded.text || "").trim();
      if (!raw) {
        Alert.alert(
          "No QR Found",
          "No QR code found in the selected image. Please try a clearer QR.",
        );
        return;
      }

      const normalized = normalizeMessagingLink(raw, provider);
      if (provider === "line") {
        setEditLineLink(normalized);
      } else if (provider === "viber") {
        setEditViberLink(normalized);
      } else if (provider === "whatsapp") {
        setEditWhatsappLink(normalized);
      }
    } catch (error) {
      console.log("Error decoding contact QR:", error);
      Alert.alert("Error", "Something went wrong while reading the QR code.");
    } finally {
      setIsProcessingContactQR(false);
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
  const isKycVerified =
    String(userData?.kycAccountStatus || "").toUpperCase() === "VERIFIED" ||
    String(userData?.kycStatus || "").toLowerCase() === "approved";
  const accountNumber =
    userData?.accountNumber || userData?.id || "000053126300";
  const rawCompanyNameFromUser = userData?.companyName;
  const companyName =
    companyKycView?.companyName ||
    rawCompanyNameFromUser ||
    t("Tap to add company name") ||
    "Tap to add company name";

  const rawCompanyKycStatus: string | undefined =
    companyKycView?.status ??
    (userData?.companyKycStatus as string | undefined) ??
    (userData?.company_kyc_status as string | undefined) ??
    undefined;

  const normalizedCompanyKycStatus = rawCompanyKycStatus
    ? String(rawCompanyKycStatus).toLowerCase()
    : undefined;

  const isCompanyKycVerified =
    normalizedCompanyKycStatus === "approved" ||
    normalizedCompanyKycStatus === "verified";
  const isCompanyKycPending =
    normalizedCompanyKycStatus === "pending" ||
    normalizedCompanyKycStatus === "in_review";

  const isCompanyKycRejected = normalizedCompanyKycStatus === "rejected";

  // Lock only when there is an active/pending or verified company KYC.
  // When rejected, allow user to open Company KYC again to resubmit.
  const hasCompanyKycRequest = isCompanyKycVerified || isCompanyKycPending;

  const [showCompanyRejectedModal, setShowCompanyRejectedModal] =
    useState(false);

  const handleCompanyRowPress = () => {
    if (isCompanyKycRejected) {
      setShowCompanyRejectedModal(true);
    } else {
      openCompanyModal();
    }
  };
  const contactNumber =
    userData?.phone ??
    userData?.phoneNumber ??
    t("Tap to add phone number") ??
    "Tap to add phone number";
  const lineLink =
    userData?.lineAccountLink ?? userData?.lineLink ?? t("common.notProvided");
  const viberLink = userData?.viberLink || t("common.notProvided");
  const whatsappLink = userData?.whatsappLink || t("common.notProvided");
  const accountLevelLabel = isKycVerified ? "VERIFIED" : "NOT VERIFIED";
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
            editable={!hasCompanyKycRequest}
            onEdit={hasCompanyKycRequest ? undefined : handleCompanyRowPress}
            isPlaceholder={!rawCompanyNameFromUser && !companyKycView?.companyName}
            badge={
              isCompanyKycVerified
                ? "Verified"
                : isCompanyKycPending
                ? "Unverified"
                : isCompanyKycRejected
                ? "Rejected"
                : undefined
            }
            badgeColor={
              isCompanyKycVerified
                ? "#10B981"
                : isCompanyKycPending
                ? "#F59E0B"
                : isCompanyKycRejected
                ? "#EF4444"
                : undefined
            }
            verified={isCompanyKycVerified}
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
            onEdit={openContactLinksModal}
          />
          <DetailItem
            icon="chatbubble-outline"
            label={t("profile.viberLink")}
            value={viberLink}
            editable
            onEdit={openContactLinksModal}
          />
          <DetailItem
            icon="logo-whatsapp"
            label={t("profile.whatsappLink")}
            value={whatsappLink}
            editable
            onEdit={openContactLinksModal}
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
            label="KYC STATUS"
            value={accountLevelLabel}
            badge={isKycVerified ? accountLevelLabel : undefined}
            badgeColor={isKycVerified ? "#10B981" : "#999"}
            verified={isKycVerified}
            showVerifyButton={!isKycVerified}
            onVerifyPress={() =>
              (navigation as { navigate: (name: string) => void }).navigate(
                "KYCVerification",
              )
            }
            verifyButtonLabel={t("profile.verify")}
          />
          {/* Company KYC status (if available) */}
          {/* This row can be wired to real backend data in the future by reusing getCompanyKycStatus */}
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

      {/* Contact Links Edit Modal */}
      <Modal
        visible={showContactLinksModal}
        transparent
        animationType="fade"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Contact Links</Text>
              <TouchableOpacity
                onPress={() => !saving && setShowContactLinksModal(false)}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.modalScroll}
              bounces={false}
            >
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>LINE Link</Text>
                <TextInput
                  style={styles.input}
                  value={editLineLink}
                  onChangeText={setEditLineLink}
                  placeholder="https://line.me/..."
                  placeholderTextColor="#999"
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!saving && !isProcessingContactQR}
                />
                <TouchableOpacity
                  style={styles.qrUploadButton}
                  onPress={() => handleUploadContactQr("line")}
                  disabled={saving || isProcessingContactQR}
                >
                  <Text style={styles.qrUploadButtonText}>
                    {isProcessingContactQR ? "Reading QR..." : "Upload LINE QR image"}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                  Viber Link
                </Text>
                <TextInput
                  style={styles.input}
                  value={editViberLink}
                  onChangeText={setEditViberLink}
                  placeholder="https://invite.viber.com/..."
                  placeholderTextColor="#999"
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!saving && !isProcessingContactQR}
                />
                <TouchableOpacity
                  style={styles.qrUploadButton}
                  onPress={() => handleUploadContactQr("viber")}
                  disabled={saving || isProcessingContactQR}
                >
                  <Text style={styles.qrUploadButtonText}>
                    {isProcessingContactQR ? "Reading QR..." : "Upload Viber QR image"}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                  WhatsApp Link
                </Text>
                <TextInput
                  style={styles.input}
                  value={editWhatsappLink}
                  onChangeText={setEditWhatsappLink}
                  placeholder="https://wa.me/..."
                  placeholderTextColor="#999"
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!saving && !isProcessingContactQR}
                />
                <TouchableOpacity
                  style={styles.qrUploadButton}
                  onPress={() => handleUploadContactQr("whatsapp")}
                  disabled={saving || isProcessingContactQR}
                >
                  <Text style={styles.qrUploadButtonText}>
                    {isProcessingContactQR ? "Reading QR..." : "Upload WhatsApp QR image"}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.inputHint, { marginTop: 10 }]}>
                  You can paste links directly or upload a QR image from LINE,
                  Viber, or WhatsApp to auto-fill.
                </Text>

                {hasPasscode && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                      Passcode *
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={passcode}
                      onChangeText={setPasscode}
                      placeholder="4-digit passcode"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      editable={!saving && !isProcessingContactQR}
                    />
                  </>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || isProcessingContactQR) && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveContactLinks}
              disabled={saving || isProcessingContactQR}
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
              styles.languageModalContentOuter,
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
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.languageOption,
                    language === label && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleSelectLanguage(label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageOptionFlag}>{flag}</Text>
                  <Text
                    style={[
                      styles.languageOptionText,
                      language === label && styles.languageOptionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  {language === label && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#DE5212"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.languageModalCancel}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.languageModalCancelText}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <Ionicons
              name="checkmark-circle"
              size={40}
              color="#10B981"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.successTitle}>Success</Text>
            <Text style={styles.successMessage}>
              {successMessage ?? "Your profile has been updated."}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Company KYC Rejected Modal */}
      <Modal
        visible={showCompanyRejectedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompanyRejectedModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <Ionicons
              name="alert-circle"
              size={40}
              color="#EF4444"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.successTitle}>Company KYC Rejected</Text>
            <Text style={styles.successMessage}>
              Your submitted company documents were rejected. Please review your
              information and upload your company requirements again.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowCompanyRejectedModal(false);
                openCompanyModal();
              }}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  languageModalContentOuter: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  languageModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  languageMapGlobe: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(222, 82, 18, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(222, 82, 18, 0.3)",
  },
  languageModalTitle: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk-Bold",
    color: "#333333",
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  languageOptionSelected: {
    backgroundColor: "#FFF0E8",
    borderColor: "#E15816",
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "SF-Pro-Rounded-Medium",
    color: "#333333",
  },
  languageOptionTextSelected: {
    fontFamily: "SF-Pro-Rounded-Bold",
    color: "#E15816",
  },
  languageModalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  languageModalCancelText: {
    color: "#666666",
    fontSize: 16,
    fontFamily: "SF-Pro-Rounded-Semibold",
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
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 16,
  },
  successButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: THEME_COLOR,
  },
  successButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
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
  qrUploadButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  qrUploadButtonText: {
    fontSize: 12,
    color: "#4B5563",
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
