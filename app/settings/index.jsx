import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ImageBackground,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../../configs/firebase";
import { signOut } from "firebase/auth";

export default function Settings() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/welcome");
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const settingsOptions = [
    {
      category: "Account",
      items: [
        {
          icon: "account-multiple",
          label: "Account Control",
          route: "/personal",
        },
      ],
    },
    {
      category: "Security",
      items: [
        {
          icon: "lock",
          label: "Passcode",
          subtitle: "Change your PIN",
          route: "/passcode",
        },
      ],
    },
    {
      category: "Customer Relationship",
      items: [
        {
          icon: "information",
          label: "About us",
          route: "/about",
        },
        {
          icon: "account-tie",
          label: "Agent Request",
          route: "/agentrequest",
        },
        {
          icon: "headset",
          label: "Help Center",
          route: "/helpcenter",
        },
        {
          icon: "shield-check",
          label: "Privacy Policy",
          route: "/privacy",
        },
        {
          icon: "file-document",
          label: "Terms and Condition",
          route: "/termsandcondition",
        },
      ],
    },
  ];

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Orange Gradient */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notification")}
          >
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search settings..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Settings List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingsOptions.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.category}</Text>
              
              <View style={styles.sectionCard}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.settingItem,
                      itemIndex !== section.items.length - 1 && styles.settingItemBorder
                    ]}
                    onPress={() => router.push(item.route)}
                  >
                    <View style={styles.settingLeft}>
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={24}
                          color="#E25A17"
                        />
                      </View>
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>{item.label}</Text>
                        {item.subtitle && (
                          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#666" />
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  settingSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0E0E0",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
