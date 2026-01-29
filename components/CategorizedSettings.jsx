import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Modal,
  Platform,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useRouter } from "expo-router";
import { auth, firestore } from "../configs/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "./ProfessionalModal";
import useModal from "./useModal";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

// List of routes that require Premium account
const PREMIUM_ROUTES = [
  "agentrequest",
  "agentdashboard",
  "bdo",
  "buycards",
  "crypto",
  "inspireauto",
  "inspirecards",
  "maya",
  "transfer",
  "travel",
  "withdraw",
];

const getCategories = (userData, userLanguage) => {
  const categories = [
  {
    title: t(userLanguage, "categorizedSettings.categories.services"),
    items: [
      {
        label: t(userLanguage, "categorizedSettings.items.transfer"),
        icon: require("../assets/images/transfer.png"),
        route: "transfer",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.inspireCards"),
        icon: require("../assets/images/card.png"),
        route: "inspirecards",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.buyCards"),
        icon: require("../assets/images/buycards.png"),
        route: "buycards",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.eWallet"),
        icon: require("../assets/images/maya.png"),
        route: "maya",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.bankingServices"),
        icon: require("../assets/images/finance.png"),
        route: "bdo",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.travelProtection"),
        icon: require("../assets/images/travel.png"),
        route: "travel",
      },
    ],
  },
  {
    title: t(userLanguage, "categorizedSettings.categories.inspireBalances"),
    items: [
      {
        label: t(userLanguage, "categorizedSettings.items.investmentProfile"),
        icon: require("../assets/images/investmentprofile.png"),
        route: "inspireauto",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.stockHolder"),
        icon: require("../assets/images/stock.png"),
        route: "stockholder",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.agent"),
        icon: require("../assets/images/agentdashboard.png"),
        route: userData?.agent ? "agentdashboard" : null,
      },
      {
        label: t(userLanguage, "categorizedSettings.items.specialCampaign"),
        icon: require("../assets/images/agentdashboard.png"),
        route: null, // Make Special Campaign unclickable
      },
      {
        label: t(userLanguage, "categorizedSettings.items.inspireSecureGrowth"),
        icon: require("../assets/images/inspiresecuregrowth.png"),
        route: null,
      },
    ],
  },
  {
    title: t(userLanguage, "categorizedSettings.categories.playAndEarn"),
    items: [
      {
        label: t(userLanguage, "categorizedSettings.items.trading"),
        icon: require("../assets/images/crypto.png"),
        route: "crypto",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.depositViaCrypto"),
        icon: require("../assets/images/depositcrypto.png"),
        route: "/depositcrypto",
      },
    ],
  },
  {
    title: t(userLanguage, "categorizedSettings.categories.security"),
    items: [
      {
        label: t(userLanguage, "categorizedSettings.items.passcode"),
        icon: require("../assets/images/passcode.png"),
        route: "passcode",
      },
    ],
  },
  {
    title: t(userLanguage, "categorizedSettings.categories.customerRelationship"),
    items: [
      {
        label: t(userLanguage, "categorizedSettings.items.aboutUs"),
        icon: require("../assets/images/aboutus.png"),
        route: "about",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.agentRequest"),
        icon: require("../assets/images/agentrequest.png"),
        route: "agentrequest",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.helpCenter"),
        icon: require("../assets/images/helpcenter.png"),
        route: "helpcenter",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.privacyPolicy"),
        icon: require("../assets/images/privacypolicy.png"),
        route: "privacy",
      },
      {
        label: t(userLanguage, "categorizedSettings.items.termsAndCondition"),
        icon: require("../assets/images/termsandcondition.png"),
        route: "termsandcondition",
      },
    ],
  },
  ];

  // Conditionally add Campaign category if isCampaign is true
  if (userData && userData.isCampaign === true) {
    categories.push({
      title: "Campaign",
      items: [
        {
          label: "Rally",
          icon: require("../assets/images/onemonth.png"),
          route: "monthly",
        },
        {
          label: "Three Months",
          icon: require("../assets/images/threemonth.png"),
          route: "thricemonth",
        },
      ],
    });
  }

  return categories;
};

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

const getResponsiveValues = (deviceType, windowWidth) => {
  switch (deviceType) {
    case "large-tablet":
      return {
        buttonsPerRow: 8,
        buttonGap: 20,
        horizontalPadding: 40,
        containerPadding: 24,
        categoryPadding: 24,
        categoryMarginBottom: 40,
        titleFontSize: 24,
        labelFontSize: 14,
        borderRadius: 28,
        categoryBorderRadius: 24,
        buttonBorderRadius: 18,
      };
    case "tablet":
      return {
        buttonsPerRow: 6,
        buttonGap: 16,
        horizontalPadding: 32,
        containerPadding: 20,
        categoryPadding: 20,
        categoryMarginBottom: 36,
        titleFontSize: 22,
        labelFontSize: 13,
        borderRadius: 26,
        categoryBorderRadius: 22,
        buttonBorderRadius: 16,
      };
    case "small-tablet":
      return {
        buttonsPerRow: 5,
        buttonGap: 14,
        horizontalPadding: 24,
        containerPadding: 18,
        categoryPadding: 18,
        categoryMarginBottom: 32,
        titleFontSize: 20,
        labelFontSize: 12,
        borderRadius: 24,
        categoryBorderRadius: 20,
        buttonBorderRadius: 15,
      };
    case "large-phone":
      return {
        buttonsPerRow: 4,
        buttonGap: 12,
        horizontalPadding: 20,
        containerPadding: 16,
        categoryPadding: 16,
        categoryMarginBottom: 28,
        titleFontSize: 18,
        labelFontSize: 11,
        borderRadius: 24,
        categoryBorderRadius: 18,
        buttonBorderRadius: 14,
      };
    default: // phone and small-phone
      return {
        buttonsPerRow: 4,
        buttonGap: 12,
        horizontalPadding: 16,
        containerPadding: 16,
        categoryPadding: 16,
        categoryMarginBottom: 28,
        titleFontSize: 18,
        labelFontSize: 11,
        borderRadius: 24,
        categoryBorderRadius: 18,
        buttonBorderRadius: 14,
      };
  }
};

const CategorizedSettings = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [agentModalVisible, setAgentModalVisible] = useState(false);
  const [appSettings, setAppSettings] = useState({});
  const [userLanguage, setUserLanguage] = useState("english");
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const deviceType = getDeviceType(windowWidth, windowHeight);
  const isTablet = deviceType.includes("tablet");
  const responsive = getResponsiveValues(deviceType, windowWidth);

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    fetchUserLanguage();
    
    // Set up real-time listener for language changes
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, "users", user.uid);
      const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newLanguage = userData.preferredLanguage || "english";
          setUserLanguage(prevLanguage => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(`CategorizedSettings: Language changed from ${prevLanguage} to ${newLanguage}`);
              return newLanguage;
            }
            return prevLanguage;
          });
        }
      });

      return () => unsubscribeLanguage();
    }
  }, []);

  // Fetch user data to check agent status
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
      });

      return () => unsubscribe();
    }
  }, []);

  // Fetch app settings from Firestore for maintenance mode
  useEffect(() => {
    const appSettingsRef = doc(
      firestore,
      "appSettings",
      "QmHQ2bo3C7hupza7S1EA"
    );
    const unsubscribe = onSnapshot(
      appSettingsRef,
      (doc) => {
        if (doc.exists()) {
          setAppSettings(doc.data());
        } else {
          // Initialize with default values if document doesn't exist
          setAppSettings({});
        }
      },
      (error) => {
        console.error("Error fetching app settings:", error);
        // Set empty object on error to prevent crashes
        setAppSettings({});
      }
    );

    return () => unsubscribe();
  }, []);

  const totalGap = (responsive.buttonsPerRow - 1) * responsive.buttonGap;
  const buttonWidth =
    (windowWidth - responsive.horizontalPadding - totalGap) /
    responsive.buttonsPerRow;

  const styles = StyleSheet.create({
    container: {
      padding: responsive.containerPadding,
      backgroundColor: Colors.newYearTheme.background,
      borderRadius: responsive.borderRadius,
      margin: 8,
      elevation: isTablet ? 4 : 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 2 },
      shadowOpacity: isTablet ? 0.15 : 0.1,
      shadowRadius: isTablet ? 8 : 4,
    },
    categoryContainer: {
      backgroundColor: "#fff",
      borderRadius: responsive.categoryBorderRadius,
      padding: responsive.categoryPadding,
      marginBottom: responsive.categoryMarginBottom,
      shadowColor: Colors.redTheme.background,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: isTablet ? 12 : 8,
      elevation: isTablet ? 4 : 2,
      borderWidth: isTablet ? 2 : 1,
      borderColor: Colors.redTheme.background,
    },
    title: {
      fontSize: responsive.titleFontSize,
      fontWeight: "800",
      marginBottom: isTablet ? 24 : 18,
      color: Colors.redTheme.background,
      letterSpacing: 0.2,
      textTransform: "uppercase",
      textAlign: "center",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    buttonWrapper: {
      alignItems: "center",
      marginBottom: responsive.buttonGap + (isTablet ? 10 : 6),
      width: buttonWidth,
    },
    buttonContainer: {
      position: "relative",
      width: "100%",
      alignItems: "center",
    },
    button: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.newYearTheme.background,
      borderRadius: responsive.buttonBorderRadius,
      paddingVertical: isTablet ? 16 : 10,
      paddingHorizontal: isTablet ? 8 : 4,
      aspectRatio: 1,
      elevation: isTablet ? 3 : 1,
      shadowColor: Colors.redTheme.background,
      shadowOffset: { width: 0, height: isTablet ? 2 : 1 },
      shadowOpacity: isTablet ? 0.12 : 0.08,
      shadowRadius: isTablet ? 6 : 4,
      borderWidth: isTablet ? 2 : 1.5,
      borderColor: Colors.redTheme.background,
      width: "100%",
      marginBottom: isTablet ? 8 : 4,
    },
    icon: {
      width: isTablet ? "80%" : "70%",
      height: isTablet ? "80%" : "70%",
      resizeMode: "contain",
    },
    label: {
      marginTop: isTablet ? 8 : 4,
      fontSize: responsive.labelFontSize,
      color: Colors.redTheme.background,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: 0.1,
      lineHeight: isTablet ? 18 : 14,
      minHeight: isTablet ? 32 : 24,
      maxWidth: "95%",
      textTransform: "capitalize",
    },
    soonBadge: {
      position: "absolute",
      right: buttonWidth * (isTablet ? 0.05 : 0.1),
      top: buttonWidth * (isTablet ? 0.02 : 0.05),
      backgroundColor: "#DC2626",
      borderRadius: isTablet ? 16 : 12,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingVertical: isTablet ? 6 : 4,
      elevation: isTablet ? 8 : 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 8 : 6,
      zIndex: 10,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      minWidth: isTablet ? 48 : 32,
      alignItems: "center",
      justifyContent: "center",
    },
    soonText: {
      color: "#FFFFFF",
      fontSize: isTablet ? 12 : 9,
      fontWeight: "600",
      letterSpacing: 0.8,
      textAlign: "center",
      fontFamily: "System",
    },
    premiumBadge: {
      position: "absolute",
      right: buttonWidth * (isTablet ? 0.05 : 0.1),
      top: buttonWidth * (isTablet ? 0.02 : 0.05),
      backgroundColor: "#f39c12",
      borderRadius: isTablet ? 16 : 12,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingVertical: isTablet ? 6 : 4,
      elevation: isTablet ? 8 : 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 8 : 6,
      zIndex: 10,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      minWidth: isTablet ? 48 : 32,
      alignItems: "center",
      justifyContent: "center",
    },
    premiumText: {
      color: "#FFFFFF",
      fontSize: isTablet ? 12 : 9,
      fontWeight: "600",
      letterSpacing: 0.8,
      textAlign: "center",
      fontFamily: "System",
    },
    disabledButton: {
      opacity: 0.6,
      backgroundColor: "#F5F5F5",
    },
    premiumOverlay: {
      position: "absolute",
      right: buttonWidth * (isTablet ? 0.05 : 0.1),
      top: buttonWidth * (isTablet ? 0.02 : 0.05),
      backgroundColor: "#f39c12",
      borderRadius: isTablet ? 16 : 12,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingVertical: isTablet ? 6 : 4,
      elevation: isTablet ? 8 : 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 8 : 6,
      zIndex: 10,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      minWidth: isTablet ? 48 : 32,
      alignItems: "center",
      justifyContent: "center",
    },
    premiumBackgroundOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderRadius: responsive.buttonBorderRadius,
      zIndex: 5,
    },
    disabledIcon: {
      opacity: 0.5,
    },
    disabledLabel: {
      opacity: 0.6,
      color: "#999999",
    },
    maintenanceBadge: {
      position: "absolute",
      right: buttonWidth * (isTablet ? 0.05 : 0.1),
      top: buttonWidth * (isTablet ? 0.02 : 0.05),
      backgroundColor: "#FF6B6B",
      borderRadius: isTablet ? 20 : 16,
      width: isTablet ? 40 : 32,
      height: isTablet ? 40 : 32,
      elevation: isTablet ? 8 : 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 8 : 6,
      zIndex: 10,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    maintenanceOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 107, 107, 0.2)",
      borderRadius: responsive.buttonBorderRadius,
      zIndex: 5,
    },
    timeDepositBadge: {
      position: "absolute",
      right: buttonWidth * (isTablet ? 0.05 : 0.1),
      top: buttonWidth * (isTablet ? 0.02 : 0.05),
      backgroundColor: "#8B4513",
      borderRadius: isTablet ? 16 : 12,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingVertical: isTablet ? 6 : 4,
      elevation: isTablet ? 8 : 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 8 : 6,
      zIndex: 10,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      minWidth: isTablet ? 48 : 32,
      alignItems: "center",
      justifyContent: "center",
    },
    timeDepositText: {
      color: "#FFFFFF",
      fontSize: isTablet ? 10 : 8,
      fontWeight: "600",
      letterSpacing: 0.8,
      textAlign: "center",
      fontFamily: "System",
    },
    timeDepositOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(139, 69, 19, 0.2)",
      borderRadius: responsive.buttonBorderRadius,
      zIndex: 5,
    },
    alreadyAgentBadge: {
      position: "absolute",
      right: buttonWidth * (isTablet ? 0.05 : 0.1),
      top: buttonWidth * (isTablet ? 0.02 : 0.05),
      backgroundColor: "#10B981",
      borderRadius: isTablet ? 16 : 12,
      paddingHorizontal: isTablet ? 12 : 8,
      paddingVertical: isTablet ? 6 : 4,
      elevation: isTablet ? 8 : 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 8 : 6,
      zIndex: 10,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      minWidth: isTablet ? 48 : 32,
      alignItems: "center",
      justifyContent: "center",
    },
    alreadyAgentText: {
      color: "#FFFFFF",
      fontSize: isTablet ? 10 : 8,
      fontWeight: "600",
      letterSpacing: 0.8,
      textAlign: "center",
      fontFamily: "System",
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContainer: {
      width: isTablet ? "80%" : "90%",
      maxWidth: 400,
      backgroundColor: "white",
      borderRadius: isTablet ? 24 : 20,
      padding: isTablet ? 32 : 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 8 : 6 },
      shadowOpacity: 0.25,
      shadowRadius: isTablet ? 16 : 12,
      elevation: isTablet ? 12 : 8,
    },
    modalContent: {
      alignItems: "center",
    },
    modalHeader: {
      alignItems: "center",
      marginBottom: isTablet ? 24 : 20,
    },
    modalTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: "700",
      color: Colors.redTheme.background,
      textAlign: "center",
      marginTop: isTablet ? 16 : 12,
      letterSpacing: 0.5,
    },
    modalMessage: {
      fontSize: isTablet ? 16 : 14,
      color: "#666666",
      textAlign: "center",
      lineHeight: isTablet ? 24 : 20,
      marginBottom: isTablet ? 32 : 28,
      paddingHorizontal: isTablet ? 8 : 4,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      gap: isTablet ? 16 : 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: isTablet ? 16 : 12,
      paddingHorizontal: isTablet ? 24 : 20,
      borderRadius: isTablet ? 16 : 12,
      alignItems: "center",
      justifyContent: "center",
      elevation: isTablet ? 4 : 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isTablet ? 2 : 1 },
      shadowOpacity: 0.15,
      shadowRadius: isTablet ? 4 : 2,
    },
    cancelButton: {
      backgroundColor: "#F5F5F5",
      borderWidth: 1,
      borderColor: "#E0E0E0",
    },
    cancelButtonText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "600",
      color: "#666666",
    },
    requestButton: {
      backgroundColor: Colors.redTheme.background,
    },
    requestButtonText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "600",
      color: "white",
    },
  });

  // Helper function to check if a route is in maintenance mode
  const isRouteInMaintenance = (route, label) => {
    if (!appSettings) return false;

    // Special handling for Agent button
    if (label === "Agent") {
      return appSettings["agentdashboard"] === false;
    }

    if (!route) return false;

    // Clean route name (remove leading slash and special characters)
    const cleanRoute = route.replace(/^\//, "").replace(/[^a-zA-Z0-9]/g, "");

    // Check if the setting exists and is false (maintenance mode)
    return appSettings[cleanRoute] === false;
  };

  // Helper function to check if user has insufficient time deposit for specific routes
  const hasInsufficientTimeDeposit = (route, label) => {
    if (!userData) return false;

    const timeDepositAmount = parseFloat(userData.timeDepositAmount || 0);
    const MIN_TIME_DEPOSIT = 200000; // ₱200,000 minimum

    // Check for Maya and Banking Services
    if (route === "maya" || route === "bdo") {
      return timeDepositAmount < MIN_TIME_DEPOSIT;
    }

    return false;
  };

  const categories = getCategories(userData || {}, userLanguage);

  return (
    <View style={styles.container}>
      {categories.map((cat) => (
        <View key={cat.title} style={styles.categoryContainer}>
          <Text style={[styles.title, getRTLStyles(userLanguage), { textAlign: "center", width: "100%" }]}>{cat.title}</Text>
          <View style={styles.grid}>
            {cat.items.map((item, idx) => {
              // Check various conditions using original English labels for logic
              const isAgentItem = item.label === t(userLanguage, "categorizedSettings.items.agent");
              const isAgentRequestItem = item.label === t(userLanguage, "categorizedSettings.items.agentRequest");
              const isSpecialCampaign = item.label === t(userLanguage, "categorizedSettings.items.specialCampaign");
              const isDisabled = !item.route;
              const isPremiumRoute = PREMIUM_ROUTES.includes(item.route);
              const isBasicAccount =
                !userData?.accountType || userData.accountType === "Basic";
              const isInMaintenance = isRouteInMaintenance(
                item.route,
                item.label
              );
              const hasInsufficientDeposit = hasInsufficientTimeDeposit(
                item.route,
                item.label
              );

              const isAlreadyAgent = isAgentRequestItem && userData?.agent;

              // Show SOON badge for upcoming features
              const showSoonBadge = !item.route && !isAgentItem && !isAgentRequestItem;
              
              // Show Premium badge for restricted features
              const showPremiumBadge =
                isPremiumRoute &&
                isBasicAccount &&
                !isInMaintenance &&
                !hasInsufficientDeposit;

              // Show Maintenance badge for features under maintenance
              const showMaintenanceBadge = isInMaintenance;

              // Show Time Deposit badge for insufficient time deposit
              const showTimeDepositBadge = hasInsufficientDeposit;

              return (
                <View key={item.label} style={styles.buttonWrapper}>
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        (isDisabled && !isAgentItem) ||
                        isInMaintenance ||
                        hasInsufficientDeposit
                          || isAlreadyAgent ? styles.disabledButton
                          : null,
                      ]}
                      activeOpacity={isAlreadyAgent ? 1 : 0.8}
                      onPress={() => {
                        if (isInMaintenance) {
                          // Show maintenance modal
                          showModal({
                            title: t(userLanguage, "categorizedSettings.modals.underMaintenance.title"),
                            message: t(userLanguage, "categorizedSettings.modals.underMaintenance.message"),
                            type: "info",
                            confirmText: "OK",
                            onConfirm: hideModal,
                          });
                        } else if (hasInsufficientDeposit) {
                          // Show time deposit requirement modal
                          const timeDepositAmount = parseFloat(
                            userData?.timeDepositAmount || 0
                          );
                          showModal({
                            title: t(userLanguage, "categorizedSettings.modals.insufficientTimeDeposit.title"),
                            message: t(userLanguage, "categorizedSettings.modals.insufficientTimeDeposit.message")
                              .replace("{feature}", item.label)
                              .replace("{currentAmount}", timeDepositAmount.toLocaleString()),
                            type: "warning",
                            confirmText: "OK",
                            onConfirm: hideModal,
                          });

                                                 } else if (isAgentItem && !userData?.agent) {
                           // Show modal for non-agents
                           setAgentModalVisible(true);
                         } else if (isAgentRequestItem && userData?.agent) {
                           // Show modal for existing agents trying to access agent request
                           showModal({
                             title: t(userLanguage, "categorizedSettings.modals.alreadyAnAgent.title"),
                             message: t(userLanguage, "categorizedSettings.modals.alreadyAnAgent.message"),
                             type: "info",
                             confirmText: "OK",
                             onConfirm: hideModal
                           });
                        } else if (showPremiumBadge) {
                          // Show premium upgrade modal
                          showModal({
                            title: t(userLanguage, "categorizedSettings.modals.premiumFeature.title"),
                            message: t(userLanguage, "categorizedSettings.modals.premiumFeature.message"),
                            type: "info",
                            confirmText: t(userLanguage, "categorizedSettings.modals.premiumFeature.upgradeButton"),
                            onConfirm: () => {
                              hideModal();
                              // Add a platform-specific delay to ensure modal closes before navigation
                              const delay = Platform.OS === "ios" ? 150 : 100;
                              setTimeout(() => {
                                try {
                                  router.push("/personal");
                                } catch (error) {
                                  console.error("Navigation error:", error);
                                  // If navigation fails, ensure modal is still closed
                                  hideModal();
                                }
                              }, delay);
                            },
                          });
                        } else if (item.route) {
                          // Navigate for accessible items
                          router.push(item.route);
                        }
                      }}
                    >
                      <Image
                        source={item.icon}
                        style={[
                          styles.icon,
                          ((isDisabled && !isAgentItem) ||
                            isInMaintenance ||

                            hasInsufficientDeposit || isAlreadyAgent) &&

                            styles.disabledIcon,
                        ]}
                      />
                      {showPremiumBadge && (
                        <View style={styles.premiumBackgroundOverlay} />
                      )}
                      {showPremiumBadge && (
                        <View style={styles.premiumOverlay}>
                          <Text style={[styles.premiumText, getRTLStyles(userLanguage)]}>
                            {t(userLanguage, "categorizedSettings.badges.premium")}
                          </Text>
                        </View>
                      )}
                      {showMaintenanceBadge && (
                        <View style={styles.maintenanceOverlay} />
                      )}
                      {showTimeDepositBadge && (
                        <View style={styles.timeDepositOverlay} />
                      )}
                    </TouchableOpacity>
                    {showSoonBadge && (
                      <View style={styles.soonBadge}>
                        <Text style={[styles.soonText, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, "categorizedSettings.badges.soon")}
                        </Text>
                      </View>
                    )}
                    {showMaintenanceBadge && (
                      <View style={styles.maintenanceBadge}>
                        <Ionicons
                          name="construct"
                          size={isTablet ? 20 : 16}
                          color="#FFFFFF"
                        />
                      </View>
                    )}
                    {showTimeDepositBadge && (
                      <View style={styles.timeDepositBadge}>
                        <Text style={[styles.timeDepositText, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, "categorizedSettings.badges.timeDeposit")}
                        </Text>
                      </View>
                    )}

                       {isAlreadyAgent && (
                         <View style={styles.alreadyAgentBadge}>
                           <Text style={[styles.alreadyAgentText, getRTLStyles(userLanguage)]}>
                             {t(userLanguage, "categorizedSettings.badges.registered")}
                           </Text>
                         </View>
                       )}

                  </View>
                  <Text
                    style={[
                      styles.label,
                      ((isDisabled && !isAgentItem) ||
                        isInMaintenance ||

                        hasInsufficientDeposit || isAlreadyAgent) &&

                        styles.disabledLabel,
                      getRTLStyles(userLanguage),
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
            {/* Fill empty spots if needed to keep N per row */}
            {Array.from({
              length:
                (responsive.buttonsPerRow -
                  (cat.items.length % responsive.buttonsPerRow)) %
                responsive.buttonsPerRow,
            }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.buttonWrapper} />
            ))}
          </View>
        </View>
      ))}

      {/* Agent Access Modal */}
      <Modal
        visible={agentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAgentModalVisible(false)}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={isTablet ? 48 : 40}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "categorizedSettings.modals.agentAccess.title")}
                </Text>
              </View>

              <Text style={[styles.modalMessage, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "categorizedSettings.modals.agentAccess.message")}
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAgentModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelButtonText, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, "categorizedSettings.modals.agentAccess.cancelButton")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.requestButton]}
                  onPress={() => {
                    setAgentModalVisible(false);
                    router.push("agentrequest");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.requestButtonText, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, "categorizedSettings.modals.agentAccess.requestButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Premium Upgrade Modal */}
      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm || hideModal}
      />
    </View>
  );
};

export default CategorizedSettings;
