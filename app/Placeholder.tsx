import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMe, updateProfile } from "../configs/api";

const THEME_COLOR = "#E15816";

export default function Placeholder() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [passcode, setPasscode] = useState("");

  const fetchUserData = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        const result = await getMe(accessToken);
        if (result.success && result.user) {
          setUserData(result.user);
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

  const fullName = userData?.firstName && userData?.lastName 
    ? `${userData.firstName} ${userData.lastName}`
    : userData?.displayName || userData?.name || "User";
  const email = userData?.email || "user@example.com";
  const isAgent = userData?.isAgent || userData?.role === "agent" || false;
  const isPremium = userData?.isPremium || userData?.accountLevel === "premium" || false;
  const accountNumber = userData?.accountNumber || userData?.id || "000053126300";
  const companyName = userData?.companyName || "Inspire Holdings Inc";
  const contactNumber = userData?.phone ?? userData?.phoneNumber ?? "—";
  const lineLink = userData?.lineAccountLink ?? userData?.lineLink ?? "Not provided";
  const viberLink = userData?.viberLink || "Not provided";
  const whatsappLink = userData?.whatsappLink || "Not provided";
  const accountLevel = isPremium ? "Premium" : "Basic";
  const agentReferrer = userData?.agentReferrer || userData?.referredBy || "Master Agent";
  const language = userData?.language || "English";
  const memberSince = userData?.createdAt
    ? new Date(typeof userData.createdAt === "string" ? userData.createdAt : userData.createdAt).toLocaleDateString()
    : "—";
  const status = userData?.status || "Active";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME_COLOR} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#E15816" />
            </View>
          </View>

          {/* User Info */}
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{email}</Text>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {isAgent && (
              <View style={styles.agentBadge}>
                <MaterialCommunityIcons name="shield-account" size={16} color="#FFFFFF" />
                <Text style={styles.badgeText}>AGENT</Text>
              </View>
            )}
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={16} color="#333" />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Account Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={24} color="#E15816" />
            <Text style={styles.sectionTitle}>Account Details</Text>
          </View>

          <DetailItem
            icon="person-outline"
            label="NAME"
            value={fullName}
            editable
            onEdit={openNameModal}
          />
          <DetailItem
            icon="business-outline"
            label="COMPANY NAME"
            value={companyName}
            editable
          />
          <DetailItem
            icon="call-outline"
            label="CONTACT NUMBER"
            value={contactNumber}
            editable
            onEdit={openPhoneModal}
          />
          <DetailItem
            icon="link-outline"
            label="LINE LINK ACCOUNT"
            value={lineLink}
            editable
          />
          <DetailItem
            icon="chatbubble-outline"
            label="VIBER LINK"
            value={viberLink}
            editable
          />
          <DetailItem
            icon="logo-whatsapp"
            label="WHATSAPP LINK"
            value={whatsappLink}
            editable
          />
          <DetailItem
            icon="card-outline"
            label="ACCOUNT NUMBER"
            value={accountNumber}
            editable
          />
          <DetailItem
            icon="star-outline"
            label="Account Type"
            value={isAgent ? "Agent" : "User"}
            badge={isAgent ? "Agent" : undefined}
            badgeColor="#E15816"
          />
          <DetailItem
            icon="trophy-outline"
            label="Account Level"
            value={accountLevel}
            badge={accountLevel}
            badgeColor={isPremium ? "#FFD700" : "#999"}
            verified={isPremium}
          />
          <DetailItem
            icon="finger-print-outline"
            label="Account Number"
            value={accountNumber}
          />
          <DetailItem
            icon="people-outline"
            label="AGENT REFERRER"
            value={agentReferrer}
            badge="Master Agent"
            badgeColor="#FFD700"
          />
          <DetailItem
            icon="language-outline"
            label="LANGUAGE"
            value={language}
            editable
          />
        </View>

        {/* Account Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#E15816" />
            <Text style={styles.sectionTitle}>Account Status</Text>
          </View>

          <DetailItem
            icon="checkmark-circle"
            label="Status"
            value={status}
            badge={status}
            badgeColor="#4CAF50"
          />
          <DetailItem
            icon="calendar-outline"
            label="MEMBER SINCE"
            value={memberSince}
          />
        </View>

        <View style={{ height: 40 }} />
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
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
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
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+63..."
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
    </SafeAreaView>
  );
}

interface DetailItemProps {
  icon: string;
  label: string;
  value: string;
  editable?: boolean;
  badge?: string;
  badgeColor?: string;
  verified?: boolean;
  onEdit?: () => void;
}

function DetailItem({ icon, label, value, editable, badge, badgeColor, verified, onEdit }: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailHeader}>
        <Ionicons name={icon as any} size={18} color={THEME_COLOR} />
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
        {editable && onEdit && (
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
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
    padding: 4,
    marginLeft: 8,
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
  input: {
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
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
