import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot, signOut } from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function PersonalNew() {
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/welcome");
      return;
    }

    const userRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/welcome");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "John Doe";
  const email = userData.email || "johndoe17@gmail.com";
  const accountType = userData.agent ? "Agent" : "Investor";
  const accountLevel = userData.accountLevel || "Premium";
  const accountStatus = userData.accountStatus || "Active";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#E15816" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <LinearGradient
            colors={["#E15816", "#F48F38"]}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#E15816" />
              </View>
            </View>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
            
            <View style={styles.badgesContainer}>
              <View style={[styles.badge, styles.badgeAgent]}>
                <MaterialCommunityIcons name="briefcase" size={14} color="#FFFFFF" />
                <Text style={styles.badgeText}>{accountType.toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, styles.badgePremium]}>
                <MaterialCommunityIcons name="crown" size={14} color="#333" />
                <Text style={styles.badgeTextDark}>{accountLevel.toUpperCase()}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Account Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-details" size={20} color="#E15816" />
              <Text style={styles.sectionTitle}>Account Details</Text>
            </View>

            {/* Name */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="account" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>NAME</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{fullName}</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Company Name */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="office-building" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>COMPANY NAME</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{userData.company || "Inspire Holdings Inc"}</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact Number */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="phone" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>CONTACT NUMBER</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{userData.contactNumber || "+63"}</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* LINE Link Account */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="link-variant" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>LINE LINK ACCOUNT</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{userData.lineAccountLink || "Not provided"}</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Viber Link */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="message-text" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>VIBER LINK</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>Not provided</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* WhatsApp Link */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="whatsapp" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>WHATSAPP LINK</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>Not provided</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Number */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="numeric" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>ACCOUNT NUMBER</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{userData.accountNumber || "00065312630"}</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Type */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="account-star" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>Account Type</Text>
              </View>
              <View style={styles.detailContent}>
                <View style={[styles.badge, styles.badgeAgent, { marginLeft: 0 }]}>
                  <Text style={styles.badgeText}>{accountType}</Text>
                </View>
              </View>
            </View>

            {/* Account Level */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="star" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>Account Level</Text>
              </View>
              <View style={styles.detailContent}>
                <View style={[styles.badge, styles.badgePremium, { marginLeft: 0 }]}>
                  <Text style={styles.badgeTextDark}>{accountLevel}</Text>
                </View>
                <View style={[styles.badge, styles.badgeWarning, { marginLeft: 8 }]}>
                  <Text style={styles.badgeTextDark}>VERIFIED</Text>
                </View>
              </View>
            </View>

            {/* Account Number (duplicate for agent number) */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="account-box" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>Account Number</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{userData.agentNumber || "N/A"}</Text>
              </View>
            </View>

            {/* Agent Referrer */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="account-group" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>AGENT REFERRER</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailValue, { color: "#E15816" }]}>Master Agent</Text>
              </View>
            </View>

            {/* Language */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="translate" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>LANGUAGE</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>{userData.preferredLanguage || "English"}</Text>
                <TouchableOpacity>
                  <Ionicons name="create-outline" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Account Status Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information" size={20} color="#E15816" />
              <Text style={styles.sectionTitle}>Account Status</Text>
            </View>

            {/* Status */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
                <Text style={styles.detailLabel}>Status</Text>
              </View>
              <View style={styles.detailContent}>
                <View style={[styles.badge, styles.badgeActive]}>
                  <Text style={styles.badgeTextDark}>{accountStatus}</Text>
                </View>
              </View>
            </View>

            {/* Member Since */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <MaterialCommunityIcons name="calendar" size={18} color="#E15816" />
                <Text style={styles.detailLabel}>MEMBER SINCE</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailValue}>2/5/2026</Text>
              </View>
            </View>
          </View>

          {/* Log out Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#E15816",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  badgeAgent: {
    backgroundColor: "rgba(139, 0, 0, 0.8)",
  },
  badgePremium: {
    backgroundColor: "#FFD700",
  },
  badgeWarning: {
    backgroundColor: "#FFA500",
  },
  badgeActive: {
    backgroundColor: "#4CAF50",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badgeTextDark: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  detailItem: {
    marginBottom: 16,
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
  },
  detailContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e74c3c",
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
