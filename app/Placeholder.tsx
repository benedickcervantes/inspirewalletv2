import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMe } from "../configs/api";
import { auth, firestore } from "../configs/firebase";

export default function Placeholder() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // First, try to get data from JWT backend
        const accessToken = await AsyncStorage.getItem("access_token");
        if (accessToken) {
          const result = await getMe(accessToken);
          if (result.success && result.user) {
            setUserData(result.user);
            setLoading(false);
            return;
          }
        }

        // Fallback to Firebase if JWT fails
        const user = auth?.currentUser;
        if (user && firestore) {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

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
    : userData?.displayName || userData?.name || "User";
  const email = userData?.email || "user@example.com";
  const isAgent = userData?.isAgent || userData?.role === "agent" || false;
  const isPremium = userData?.isPremium || userData?.accountLevel === "premium" || false;
  const accountNumber = userData?.accountNumber || userData?.id || "000053126300";
  const companyName = userData?.companyName || "Inspire Holdings Inc";
  const contactNumber = userData?.phoneNumber || userData?.phone || "+63";
  const lineLink = userData?.lineLink || "Not provided";
  const viberLink = userData?.viberLink || "Not provided";
  const whatsappLink = userData?.whatsappLink || "Not provided";
  const accountLevel = isPremium ? "Premium" : "Basic";
  const agentReferrer = userData?.agentReferrer || userData?.referredBy || "Master Agent";
  const language = userData?.language || "English";
  const memberSince = userData?.createdAt 
    ? new Date(userData.createdAt.seconds ? userData.createdAt.seconds * 1000 : userData.createdAt).toLocaleDateString()
    : "2/5/2026";
  const status = userData?.status || "Active";

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
}

function DetailItem({ icon, label, value, editable, badge, badgeColor, verified }: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
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
        {editable && (
          <TouchableOpacity style={styles.editButton}>
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
});
