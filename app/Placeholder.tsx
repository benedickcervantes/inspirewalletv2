import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getMe } from "../configs/api";
import { auth, firestore } from "../configs/firebase";
import { useLanguage } from "../context/LanguageContext";
import { DEFAULT_LANGUAGE, normalizeLanguage, SUPPORTED_LANGUAGES } from "../constants/locales";

const USER_PREFERRED_LANGUAGE_KEY = "user_preferred_language";

export default function Placeholder() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const preferredLang = await AsyncStorage.getItem(USER_PREFERRED_LANGUAGE_KEY);
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        const result = await getMe(accessToken);
        if (result.success && result.user) {
          const u = result.user as Record<string, unknown>;
          const merged = {
            ...u,
            language: (u.language as string) ?? preferredLang ?? DEFAULT_LANGUAGE,
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
            language: normalizeLanguage((data?.language as string) ?? preferredLang),
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

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const fullName = userData?.firstName && userData?.lastName 
    ? `${userData.firstName} ${userData.lastName}`
    : userData?.displayName || userData?.name || t("common.user");
  const email = userData?.email || "user@example.com";
  const isAgent = userData?.isAgent || userData?.role === "agent" || false;
  const isPremium = userData?.isPremium || userData?.accountLevel === "premium" || false;
  const accountNumber = userData?.accountNumber || userData?.id || "000053126300";
  const companyName = userData?.companyName || "Inspire Holdings Inc";
  const contactNumber = userData?.phoneNumber || userData?.phone || "+63";
  const lineLink = userData?.lineLink || t("common.notProvided");
  const viberLink = userData?.viberLink || t("common.notProvided");
  const whatsappLink = userData?.whatsappLink || t("common.notProvided");
  const accountLevelLabel = isPremium ? t("profile.premium") : t("profile.basic");
  const agentReferrer = userData?.agentReferrer || userData?.referredBy || t("profile.masterAgent");
  const language = normalizeLanguage(userData?.language ?? contextLanguage);

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    setUserData((prev: any) => (prev ? { ...prev, language: selectedLabel } : null));
    await AsyncStorage.setItem(USER_PREFERRED_LANGUAGE_KEY, selectedLabel);
    const userJson = await AsyncStorage.getItem("user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({ ...user, language: selectedLabel })
        );
      } catch (_) {}
    }
    setLanguageModalVisible(false);
  };

  const memberSince = userData?.createdAt 
    ? new Date(userData.createdAt.seconds ? userData.createdAt.seconds * 1000 : userData.createdAt).toLocaleDateString()
    : "2/5/2026";
  const statusRaw = userData?.status || "Active";
  const status = statusRaw === "Active" ? t("profile.active") : statusRaw;

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
            style={[styles.backButton, { top: headerPaddingTop, left: headerPaddingHorizontal }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonTouchTarget}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
              <Ionicons name="person" size={Math.round(40 * scale)} color="#E15816" />
            </View>
          </View>

          {/* User Info */}
          <Text style={[styles.userName, { fontSize: Math.round(22 * scale) }]} numberOfLines={1} ellipsizeMode="tail">
            {fullName}
          </Text>
          <Text style={[styles.userEmail, { fontSize: Math.round(14 * scale) }]} numberOfLines={1} ellipsizeMode="tail">
            {email}
          </Text>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {isAgent && (
              <View style={styles.agentBadge}>
                <MaterialCommunityIcons name="shield-account" size={16} color="#FFFFFF" />
                <Text style={styles.badgeText}>{t("profile.agent").toUpperCase()}</Text>
              </View>
            )}
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={16} color="#333" />
                <Text style={styles.premiumBadgeText}>{t("profile.premium").toUpperCase()}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Account Details Section */}
        <View style={[styles.section, { marginHorizontal: sectionMarginHorizontal, padding: sectionPadding }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={22} color="#E15816" />
            <Text style={[styles.sectionTitle, { fontSize: Math.round(16 * scale) }]}>{t("profile.accountDetails")}</Text>
          </View>

          <DetailItem
            icon="person-outline"
            label={t("profile.name")}
            value={fullName}
            editable
          />
          <DetailItem
            icon="business-outline"
            label={t("profile.companyName")}
            value={companyName}
            editable
          />
          <DetailItem
            icon="call-outline"
            label={t("profile.contactNumber")}
            value={contactNumber}
            editable
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
            badge={isAgent ? t("profile.agent") : undefined}
            badgeColor="#E15816"
          />
          <DetailItem
            icon="trophy-outline"
            label={t("profile.accountLevel")}
            value={accountLevelLabel}
            badge={accountLevelLabel}
            badgeColor={isPremium ? "#FFD700" : "#999"}
            verified={isPremium}
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
            badge={t("profile.masterAgent")}
            badgeColor="#FFD700"
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
        <View style={[styles.section, { marginHorizontal: sectionMarginHorizontal, padding: sectionPadding }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={22} color="#E15816" />
            <Text style={[styles.sectionTitle, { fontSize: Math.round(16 * scale) }]}>{t("profile.accountStatus")}</Text>
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

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.languageModalContent} onStartShouldSetResponder={() => true}>
            {/* Map / globe header */}
            <View style={styles.languageMapHeader}>
              <View style={styles.languageMapGlobe}>
                <Ionicons name="globe-outline" size={40} color="#E15816" />
              </View>
              <View style={styles.languageMapFlags}>
                {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                  <View
                    key={label}
                    style={[
                      styles.languageMapFlagChip,
                      language === label && styles.languageMapFlagChipSelected,
                    ]}
                  >
                    <Text style={styles.languageMapFlagEmoji}>{flag}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.languageModalTitle}>{t("profile.selectLanguage")}</Text>
              <Text style={styles.languageModalSubtitle}>
                {t("profile.defaultIsEnglish")}
              </Text>
            </View>
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
                  <Ionicons name="checkmark-circle" size={22} color="#E15816" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.languageModalCancel}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.languageModalCancelText}>{t("common.cancel")}</Text>
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
}

function DetailItem({
  icon,
  label,
  value,
  editable,
  onEditPress,
  badge,
  badgeColor,
  verified,
}: DetailItemProps) {
  const handlePress = editable && onEditPress ? onEditPress : undefined;
  const content = (
    <>
      <View style={styles.detailHeader}>
        <Ionicons name={icon as any} size={18} color="#E15816" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueContainer}>
        <Text style={styles.detailValue}>{value}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeTextSmall}>{badge}</Text>
            {verified && (
              <Ionicons name="checkmark-circle" size={14} color="#333" style={{ marginLeft: 4 }} />
            )}
          </View>
        )}
        {editable && onEditPress && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={onEditPress}
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    color: "#333",
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  languageModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  languageMapHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
  languageMapFlags: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  languageMapFlagChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  languageMapFlagChipSelected: {
    backgroundColor: "#FFF0E8",
    borderWidth: 2,
    borderColor: "#E15816",
  },
  languageMapFlagEmoji: {
    fontSize: 24,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F5F5F5",
  },
  languageOptionSelected: {
    backgroundColor: "#FFF0E8",
    borderWidth: 1,
    borderColor: "#E15816",
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
});
