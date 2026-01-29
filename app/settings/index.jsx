import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import React from "react";
import { useRouter, useNavigation } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import userService from "../../services/userService";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import CategorizedSettings from "../../components/CategorizedSettings";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import presenceService from "../../services/presenceService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

const { width, height } = Dimensions.get("window");

// Responsive utilities
const getDeviceType = (width, height) => {
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);

  if (minDimension >= 768) {
    if (maxDimension >= 1300) {
      return "large-tablet"; // iPad Air 13-inch and similar
    } else if (maxDimension >= 1024) {
      return "tablet"; // Standard iPad sizes
    }
    return "small-tablet"; // iPad mini and similar
  } else if (minDimension >= 600) {
    return "large-phone"; // Large phones/phablets
  } else if (minDimension >= 375) {
    return "phone"; // Standard phones
  }
  return "small-phone"; // Small phones
};

const getResponsiveValues = (deviceType) => {
  switch (deviceType) {
    case "large-tablet":
      return {
        headerHeight: 80,
        headerFontSize: 28,
        backButtonSize: 36,
        iconSize: 32,
        horizontalPadding: 40,
        safeAreaPaddingTop: 100,
        safeAreaPaddingBottom: 30,
        footerPadding: 40,
        buttonPadding: 20,
        buttonFontSize: 18,
        borderRadius: 16,
      };
    case "tablet":
      return {
        headerHeight: 70,
        headerFontSize: 24,
        backButtonSize: 32,
        iconSize: 28,
        horizontalPadding: 32,
        safeAreaPaddingTop: 90,
        safeAreaPaddingBottom: 25,
        footerPadding: 32,
        buttonPadding: 18,
        buttonFontSize: 16,
        borderRadius: 14,
      };
    case "small-tablet":
      return {
        headerHeight: 65,
        headerFontSize: 22,
        backButtonSize: 30,
        iconSize: 26,
        horizontalPadding: 24,
        safeAreaPaddingTop: 85,
        safeAreaPaddingBottom: 22,
        footerPadding: 28,
        buttonPadding: 16,
        buttonFontSize: 15,
        borderRadius: 13,
      };
    case "large-phone":
      return {
        headerHeight: 60,
        headerFontSize: 20,
        backButtonSize: 28,
        iconSize: 24,
        horizontalPadding: 20,
        safeAreaPaddingTop: 80,
        safeAreaPaddingBottom: 20,
        footerPadding: 24,
        buttonPadding: 16,
        buttonFontSize: 14,
        borderRadius: 12,
      };
    default: // phone and small-phone
      return {
        headerHeight: 60,
        headerFontSize: 20,
        backButtonSize: 28,
        iconSize: 24,
        horizontalPadding: 16,
        safeAreaPaddingTop: 80,
        safeAreaPaddingBottom: 20,
        footerPadding: 20,
        buttonPadding: 16,
        buttonFontSize: 14,
        borderRadius: 12,
      };
  }
};

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [dimensions, setDimensions] = useState({ width, height });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userLanguage, setUserLanguage] = useState("english");

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const userData = await userService.getUserProfile();
      if (userData) {
        setUserLanguage(userData.preferredLanguage || "english");
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  // Get device type and responsive values
  const deviceType = getDeviceType(dimensions.width, dimensions.height);
  const isTablet = deviceType.includes("tablet");
  const responsive = getResponsiveValues(deviceType);

  // Fetch user language on component mount
  useEffect(() => {
    fetchUserLanguage();
  }, []);

  // Listen to dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  // Create stable function reference
  const handleBackPress = useCallback(() => {
    // console.log("🔙 Settings back button pressed");

    try {
      // Different navigation approaches for Android vs iOS
      if (Platform.OS === "android") {
        // For Android, use direct navigation to main
        router.replace("/main");
      } else {
        // For iOS, use simple back
        router.replace("/main");
      }
    } catch (error) {
      // console.error("Navigation error:", error);
      // Fallback for any failures
      router.replace("/main");
    }
  }, [router]);

  // Test function for debugging
  const testPress = useCallback(() => {
    // console.log("🚨🚨🚨 TEST PRESS WORKING!");
    showModal({
      title: t(userLanguage, "settings.buttonTest.title"),
      message: t(userLanguage, "settings.buttonTest.message"),
      type: "info",
    });

    try {
      router.replace("/main");
    } catch (error) {
      // console.error("Nav error:", error);
      showModal({
        title: t(userLanguage, "settings.navigationError.title"),
        message: t(userLanguage, "settings.navigationError.message").replace(
          "{errorMessage}",
          error.message
        ),
        type: "error",
      });
    }
  }, [router, showModal, userLanguage]);

  useEffect(() => {
    if (Platform.OS === "android") {
      // Android: DISABLE React Navigation header completely
      navigation.setOptions({
        headerShown: false,
      });
    } else {
      // iOS: Keep original approach
      navigation.setOptions({
        headerShown: true,
        title: t(userLanguage, "settings.header.title"), // This sets the back button text for child screens
        headerTitle: () => (
          <Text
            style={[
              styles.headerTitle,
              { textAlign: "center", writingDirection: "ltr" },
            ]}
          >
            Settings
          </Text>
        ),
        headerTitleAlign: "center",
        headerTransparent: true,
        headerBackTitleVisible: false, // Hide the back button text on iOS (shows only arrow)
        headerLeft: () => (
          <TouchableOpacity
            onPress={handleBackPress}
            style={[
              styles.iosBackButton,
              isTablet && styles.tabletIosBackButton,
            ]}
            hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
            activeOpacity={0.5}
          >
            <Ionicons
              name="chevron-back"
              size={responsive.iconSize}
              color={Colors.redTheme.background}
            />
          </TouchableOpacity>
        ),
        headerRight: () => <View style={{ width: responsive.iconSize }} />, // Add empty space to balance the back button
      });
    }
  }, [isTablet, responsive]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log("🔄 Starting logout process...");

      // Set a timeout for the entire logout process
      const logoutTimeout = setTimeout(() => {
        console.log("⚠️ Logout timeout reached, forcing navigation...");
        setIsLoggingOut(false);
        router.replace("/");
      }, 10000); // 10 second timeout

      // Clean up presence monitoring before logout
      try {
        await presenceService.cleanup();
      } catch (presenceError) {
        console.error("❌ Presence cleanup error:", presenceError);
      }

      // Unregister from native notifications before logout
      try {
        const currentUserId = await AsyncStorage.getItem("userid");
        if (currentUserId) {
          const { unregisterIndieDevice } = require("native-notify");
          await unregisterIndieDevice(currentUserId);
          console.log(
            "✅ Unregistered from native notifications:",
            currentUserId
          );
        }
      } catch (notificationError) {
        console.error("❌ Notification cleanup error:", notificationError);
      }

      // Clear any stored authentication data
      try {
        await AsyncStorage.removeItem("currentSession");
        console.log("✅ Stored data cleared");
      } catch (storageError) {
        console.error("❌ Storage cleanup error:", storageError);
      }

      // Sign out from MongoDB backend with timeout
      try {
        const { logout } = await import("../../services/authService");
        const backendTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Backend signout timeout")), 5000);
        });

        await Promise.race([logout.logout(), backendTimeout]);
        console.log("✅ Backend signout completed");
      } catch (backendError) {
        console.error("❌ Backend signout error:", backendError);
      }

      // Clear the main timeout since we're proceeding to navigation
      clearTimeout(logoutTimeout);

      // Navigate to the login screen with timeout
      try {
        const navTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Navigation timeout")), 3000);
        });

        await Promise.race([
          new Promise((resolve) => {
            router.replace("/");
            resolve();
          }),
          navTimeout,
        ]);
        console.log("✅ Redirected to login screen");
      } catch (navigationError) {
        console.error("❌ Navigation error:", navigationError);
        // Try alternative navigation
        router.push("/");
      }
    } catch (error) {
      console.error("❌ General logout error: ", error);
      // Force navigation regardless of errors
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    showModal({
      title: t(userLanguage, "settings.confirmLogout.title"),
      message: t(userLanguage, "settings.confirmLogout.message"),
      type: "warning",
      showCloseButton: true,
      showCancelButton: true,
      confirmText: t(userLanguage, "settings.confirmLogout.confirmText"),
      cancelText: t(userLanguage, "settings.confirmLogout.cancelText"),
      onConfirm: async () => {
        // Close the modal first
        hideModal();
        // Then execute logout
        await handleLogout();
      },
    });
  };

  const renderItem = ({ item }) => {
    // Calculate font size based on title length
    const getFontSize = (text) => {
      if (!text) return Math.max(width * 0.035, 12);
      if (text.length <= 8) return Math.max(width * 0.035, 12);
      if (text.length <= 12) return Math.max(width * 0.032, 11);
      if (text.length <= 16) return Math.max(width * 0.028, 10);
      if (text.length <= 20) return Math.max(width * 0.025, 9);
      return Math.max(width * 0.022, 8);
    };

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemButton}
          onPress={item.routeData}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Image source={item.iconSource} style={styles.icon} />
          </View>
          <Text
            style={[styles.itemTitle, { fontSize: getFontSize(item.title) }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
        {!item.routeData && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>SOON</Text>
          </View>
        )}
      </View>
    );
  };

  // Create responsive styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F8F6F0",
    },
    androidSafeArea: {
      paddingTop:
        Platform.OS === "android"
          ? (StatusBar.currentHeight || 24) + responsive.safeAreaPaddingTop
          : 0,
      opacity: 0,
    },
    androidSafeArea1: {
      paddingBottom:
        Platform.OS === "android" ? responsive.safeAreaPaddingBottom : 0,
      opacity: 0,
    },
    androidBackButtonPressable: {
      marginLeft: responsive.horizontalPadding,
      padding: isTablet ? 20 : 16,
      minWidth: isTablet ? 80 : 64,
      minHeight: isTablet ? 80 : 64,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: isTablet ? 40 : 32,
    },
    androidBackButtonPressed: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      transform: [{ scale: 0.95 }],
    },
    androidButtonInner: {
      backgroundColor: Colors.redTheme.background,
      borderRadius: isTablet ? 22 : 18,
      padding: isTablet ? 14 : 10,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    iosBackButton: {
      padding: 12,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: responsive.titleFontSize || 18,
      fontWeight: "600",
      color: Colors.redTheme.background,
      textAlign: "center",
      writingDirection: "ltr", // Force LTR for header title to ensure centering
      alignSelf: "center",
      flex: 1,
    },
    tabletIosBackButton: {
      padding: 16,
      minWidth: 60,
      minHeight: 60,
    },
    customHeader: {
      position: "absolute",
      top: Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0,
      left: 0,
      right: 0,
      height: responsive.headerHeight,
      backgroundColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: responsive.horizontalPadding,
      zIndex: 1000,
    },
    customBackButton: {
      backgroundColor: Colors.redTheme.background,
      padding: isTablet ? 16 : 12,
      borderRadius: isTablet ? 28 : 24,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    absoluteBackButton: {
      position: "absolute",
      left: responsive.horizontalPadding,
      zIndex: 1001,
    },
    customHeaderTitle: {
      fontSize: responsive.headerFontSize,
      fontWeight: "bold",
      color: Colors.redTheme.background,
      textAlign: "center",
      alignSelf: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: responsive.safeAreaPaddingBottom,
      paddingHorizontal: isTablet ? responsive.horizontalPadding / 2 : 0,
    },
    footerContainer: {
      paddingHorizontal: responsive.footerPadding,
      paddingTop: responsive.footerPadding,
      paddingBottom: isTablet ? responsive.footerPadding / 2 : 10,
      flexDirection: isTablet ? "row" : "column",
      justifyContent: isTablet ? "space-around" : "center",
      alignItems: isTablet ? "center" : "stretch",
      gap: isTablet ? 20 : 0,
    },
    dangerButton: {
      backgroundColor: "#FF4444",
      borderRadius: responsive.borderRadius,
      marginVertical: isTablet ? 0 : 6,
      paddingVertical: responsive.buttonPadding,
      paddingHorizontal: responsive.footerPadding,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      shadowColor: "#FF4444",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
      flex: isTablet ? 1 : 0,
      maxWidth: isTablet ? 300 : "100%",
    },
    dangerButtonText: {
      color: "white",
      fontWeight: "700",
      fontSize: responsive.buttonFontSize,
      marginLeft: 8,
      letterSpacing: 0.5,
    },
    logoutButton: {
      backgroundColor: "#666666",
      borderRadius: responsive.borderRadius,
      marginVertical: isTablet ? 0 : 6,
      paddingVertical: responsive.buttonPadding,
      paddingHorizontal: responsive.footerPadding,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      shadowColor: "#666666",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
      flex: isTablet ? 1 : 0,
      maxWidth: isTablet ? 300 : "100%",
    },
    logoutButtonText: {
      color: "white",
      fontWeight: "700",
      fontSize: responsive.buttonFontSize,
      marginLeft: 8,
      letterSpacing: 0.5,
    },
  });

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />

      {/* Custom Header for Android */}
      {Platform.OS === "android" && (
        <View style={styles.customHeader}>
          <TouchableOpacity
            onPress={() => {
              try {
                router.replace("/main");
              } catch (error) {
                // console.error("Navigation error:", error);
              }
            }}
            style={[styles.customBackButton, styles.absoluteBackButton]}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={responsive.iconSize}
              color="white"
            />
          </TouchableOpacity>

          <Text style={[styles.customHeaderTitle, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "settings.title")}
          </Text>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategorizedSettings />

        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => router.push("accountdeletion")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="trash-outline"
              size={responsive.iconSize - 4}
              color="white"
            />
            <Text style={[styles.dangerButtonText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "settings.deleteAccount")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, isLoggingOut && { opacity: 0.6 }]}
            onPress={confirmLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            <Ionicons
              name={isLoggingOut ? "hourglass-outline" : "log-out-outline"}
              size={responsive.iconSize - 4}
              color="white"
            />
            <Text style={[styles.logoutButtonText, getRTLStyles(userLanguage)]}>
              {isLoggingOut
                ? t(userLanguage, "settings.loggingOut")
                : t(userLanguage, "settings.logOut")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <SafeAreaView style={styles.androidSafeArea1} />

      <ProfessionalModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        onConfirm={modalConfig.onConfirm}
      />
    </ImageBackground>
  );
}
