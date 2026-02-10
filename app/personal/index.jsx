import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      // Clear stored credentials
      await AsyncStorage.removeItem("userEmail");
      await AsyncStorage.removeItem("userPassword");
      await AsyncStorage.removeItem("passcodeLoginComplete");
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Navigate to welcome page
      router.replace("/welcome");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
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
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="account-details" size={22} color="#E15816" />
              </View>
              <Text style={styles.sectionTitle}>Account Details</Text>
            </View>

            {/* Name */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>NAME</Text>
                    <Text style={styles.detailValue}>{fullName}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Company Name */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="office-building" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>COMPANY NAME</Text>
                    <Text style={styles.detailValue}>{userData.company || "Inspire Holdings Inc"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact Number */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="phone" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>CONTACT NUMBER</Text>
                    <Text style={styles.detailValue}>{userData.contactNumber || "+63"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* LINE Link Account */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="link-variant" size={20} color="#00B900" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>LINE LINK ACCOUNT</Text>
                    <Text style={[styles.detailValue, !userData.lineAccountLink && styles.notProvided]}>
                      {userData.lineAccountLink || "Not provided"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Viber Link */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="message-text" size={20} color="#7360F2" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>VIBER LINK</Text>
                    <Text style={[styles.detailValue, styles.notProvided]}>Not provided</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* WhatsApp Link */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>WHATSAPP LINK</Text>
                    <Text style={[styles.detailValue, styles.notProvided]}>Not provided</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Number */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="numeric" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>ACCOUNT NUMBER</Text>
                    <Text style={styles.detailValue}>{userData.accountNumber || "00065312630"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Type */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account-star" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>ACCOUNT TYPE</Text>
                    <View style={styles.badgeWrapper}>
                      <View style={[styles.badge, styles.badgeAgent]}>
                        <MaterialCommunityIcons name="briefcase" size={12} color="#FFFFFF" />
                        <Text style={styles.badgeText}>{accountType}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Account Level */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>ACCOUNT LEVEL</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, styles.badgePremium]}>
                        <MaterialCommunityIcons name="crown" size={12} color="#333" />
                        <Text style={styles.badgeTextDark}>{accountLevel}</Text>
                      </View>
                      <View style={[styles.badge, styles.badgeVerified]}>
                        <MaterialCommunityIcons name="check-circle" size={12} color="#FFFFFF" />
                        <Text style={styles.badgeText}>VERIFIED</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Account Number (Agent Number) */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account-box" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>ACCOUNT NUMBER</Text>
                    <Text style={styles.detailValue}>{userData.agentNumber || "N/A"}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Agent Referrer */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account-group" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>AGENT REFERRER</Text>
                    <Text style={[styles.detailValue, { color: "#E15816", fontWeight: "600" }]}>Master Agent</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Language */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="translate" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>LANGUAGE</Text>
                    <Text style={styles.detailValue}>{userData.preferredLanguage || "English"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#E15816" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Account Status Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="information" size={22} color="#E15816" />
              </View>
              <Text style={styles.sectionTitle}>Account Status</Text>
            </View>

            {/* Status */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>STATUS</Text>
                    <View style={styles.badgeWrapper}>
                      <View style={[styles.badge, styles.badgeActive]}>
                        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                        <Text style={styles.badgeText}>{accountStatus}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Member Since */}
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.iconLabelContainer}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="calendar" size={20} color="#E15816" />
                  </View>
                  <View style={styles.labelValueContainer}>
                    <Text style={styles.detailLabel}>MEMBER SINCE</Text>
                    <Text style={styles.detailValue}>February 5, 2026</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Log out Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#FFFFFF" />
            <Text style={styles.logoutText}>Log Out</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.95,
    marginBottom: 20,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 10,
  },
  badgeWrapper: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  badgeAgent: {
    backgroundColor: "rgba(139, 0, 0, 0.9)",
  },
  badgePremium: {
    backgroundColor: "#FFD700",
  },
  badgeVerified: {
    backgroundColor: "#4CAF50",
  },
  badgeActive: {
    backgroundColor: "#4CAF50",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  badgeTextDark: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.3,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#F5F5F5",
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
  },
  detailItem: {
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  labelValueContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    lineHeight: 20,
  },
  notProvided: {
    color: "#999",
    fontStyle: "italic",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e74c3c",
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});