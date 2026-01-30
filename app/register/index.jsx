import {
  ImageBackground,
  Keyboard,
  StyleSheet,
  Text,
  View,
  TouchableWithoutFeedback,
  SafeAreaView,
  Pressable,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useNavigation, useRouter } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
} from "firebase/firestore";
import { Colors } from "../../constants/Colors";
import LoadingScreen from "./../../components/LoadingScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import registerNNPushToken, {
  registerIndieID,
  unregisterIndieDevice,
} from "native-notify";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import axios from "axios";
import RegistrationTutorial from "../../components/RegistrationTutorial";
import InvestorTutorial from "../../components/InvestorTutorial";
import { validatePhoneNumber, getMaxLength } from "../../utils/phoneValidationUtils";
import AgentTutorial from "../../components/AgentTutorial";

const { width } = Dimensions.get("window");

// Professional Modal Component
const ProfessionalModal = ({
  visible,
  onClose,
  title,
  message,
  type = "info", // 'success', 'error', 'warning', 'info'
  showCloseButton = true,
  onConfirm = null,
  confirmText = "OK",
  showCancelButton = false,
  cancelText = "Cancel",
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Delay icon animation for a nice effect
      setTimeout(() => {
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 100);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return { icon: "✓", color: "#10B981", bgColor: "#ECFDF5" };
      case "error":
        return { icon: "!", color: "#EF4444", bgColor: "#FEF2F2" };
      case "warning":
        return { icon: "!", color: "#F59E0B", bgColor: "#FFFBEB" };
      default:
        return { icon: "i", color: "#3B82F6", bgColor: "#EFF6FF" };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  if (!visible) return null;

  return (
    <Modal transparent={true} animationType="none" visible={visible}>
      <Animated.View style={[modalStyles.modalOverlay, { opacity: fadeAnim }]}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={20}
            tint="dark"
            style={modalStyles.blurContainer}
          >
            <Animated.View
              style={[
                modalStyles.modalContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View
                style={[
                  modalStyles.iconContainer,
                  { backgroundColor: bgColor },
                ]}
              >
                <Animated.Text
                  style={[
                    modalStyles.iconText,
                    { color, transform: [{ scale: iconScaleAnim }] },
                  ]}
                >
                  {icon}
                </Animated.Text>
              </View>

              <Text style={modalStyles.modalTitle}>{title}</Text>
              <Text style={modalStyles.modalMessage}>{message}</Text>

              <View style={modalStyles.buttonContainer}>
                {showCloseButton && (
                  <TouchableOpacity
                    style={[
                      modalStyles.modalButton,
                      { backgroundColor: color },
                    ]}
                    onPress={onConfirm || onClose}
                  >
                    <Text style={modalStyles.confirmButtonText}>
                      {confirmText}
                    </Text>
                  </TouchableOpacity>
                )}

                {showCancelButton && (
                  <TouchableOpacity
                    style={[modalStyles.modalButton, modalStyles.cancelButton]}
                    onPress={onClose}
                  >
                    <Text style={modalStyles.cancelButtonText}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </BlurView>
        ) : (
          <View style={modalStyles.androidModalOverlay}>
            <Animated.View
              style={[
                modalStyles.modalContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View
                style={[
                  modalStyles.iconContainer,
                  { backgroundColor: bgColor },
                ]}
              >
                <Animated.Text
                  style={[
                    modalStyles.iconText,
                    { color, transform: [{ scale: iconScaleAnim }] },
                  ]}
                >
                  {icon}
                </Animated.Text>
              </View>

              <Text style={modalStyles.modalTitle}>{title}</Text>
              <Text style={modalStyles.modalMessage}>{message}</Text>

              <View style={modalStyles.buttonContainer}>
                {showCloseButton && (
                  <TouchableOpacity
                    style={[
                      modalStyles.modalButton,
                      { backgroundColor: color },
                    ]}
                    onPress={onConfirm || onClose}
                  >
                    <Text style={modalStyles.confirmButtonText}>
                      {confirmText}
                    </Text>
                  </TouchableOpacity>
                )}

                {showCancelButton && (
                  <TouchableOpacity
                    style={[modalStyles.modalButton, modalStyles.cancelButton]}
                    onPress={onClose}
                  >
                    <Text style={modalStyles.cancelButtonText}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

// Terms & Conditions Modal Component
const TermsAndConditionsModal = ({ visible, onAgree, onCancel }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const termsText = `Welcome to Inspire Wallet. Please read these terms and conditions carefully before accessing, using, or obtaining any materials, information, products or services. By accessing the Inspire Wallet (collectively, "The app"), you agree to be bound by these terms and conditions ("Terms") and our Privacy Policy. In these Terms "we", "us", "our" and "Inspire Wallet" refers to Inspire Wallet, and "I", "you", and "your" refers to you, the user of our application.

Eligibility
You must be at least 18 years old and have the legal capacity to enter into contracts. By using our app, you represent that you meet the requirements. If you are located in a jurisdiction where investment services are restricted, you may not use the app.

Account Registration
To access the maximum capacity of the app, you must create an account. You agree to:
• Provide accurate and complete information
• Maintain the security of your password
• In case of any unauthorized use of your account, kindly notify us immediately

Services Provided
Inspire Wallet tracks your stocks and investment and lets you monitor your money before and after withdrawal. Every transaction shall be made through email and not directly with the bank. Inspire Holdings, Inc. will process your transaction, not the app itself. The process could take approximately five (5) to seven (7) working days to reflect on your Inspire Wallet account.

Fees and Charges
Details about fees associated with transactions, account maintenance, and other services will be provided in-app and may change from time to time.

User Responsibilities
You agree to use the app for lawful purposes and to abide by all applicable laws and regulations. You are responsible for your account and investment decisions.

Intellectual Property
All content, trademarks, and software related to are owned by Inspire Alliance Fund Group or its licensors. You are granted a limited, non-exclusive license to use the app for personal purposes.

Privacy Policy
Your use of the app is also governed by our Privacy Policy, which details how we collect, use, and protect your personal information. The app only collects data such as your name, email address and bank details.

Changes to Terms
We may modify these terms at any time. We will notify you of significant changes through the app or via email. Your continued use of the app after changes constitutes acceptance of the new terms.

Contact Details
For questions or concerns regarding these terms, please contact us at inspireholdings 85963671.

I hereby agree that I have read and fully understood the Terms and conditions and agree to be bound by the statements above.`;

  useEffect(() => {
    if (visible) {
      setHasScrolledToBottom(false);
    }
  }, [visible]);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const threshold = 24; // px before absolute bottom
    const isBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - threshold;
    if (isBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent={true} animationType="fade" visible={visible}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={20} tint="dark" style={modalStyles.blurContainer}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.modalHeader}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={Colors.redTheme.background}
                style={modalStyles.modalIcon}
              />
              <Text style={modalStyles.modalTitle}>Terms and Condition</Text>
            </View>
            <ScrollView
              style={modalStyles.termsScroll}
              contentContainerStyle={modalStyles.termsScrollContent}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              <View style={modalStyles.termsContentContainer}>
                <Text style={modalStyles.termsText}>{termsText}</Text>
              </View>
            </ScrollView>
            {!hasScrolledToBottom && (
              <Text style={modalStyles.infoNote}>
                Scroll to the bottom to enable "I Agree"
              </Text>
            )}
            <View style={modalStyles.buttonContainer}>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  hasScrolledToBottom
                    ? { backgroundColor: Colors.redTheme.background }
                    : modalStyles.agreeButtonDisabled,
                ]}
                onPress={onAgree}
                disabled={!hasScrolledToBottom}
              >
                <Text style={modalStyles.confirmButtonText}>I Agree</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      ) : (
        <View style={modalStyles.androidModalOverlay}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.modalHeader}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={Colors.redTheme.background}
                style={modalStyles.modalIcon}
              />
              <Text style={modalStyles.modalTitle}>Terms and Condition</Text>
            </View>
            <ScrollView
              style={modalStyles.termsScroll}
              contentContainerStyle={modalStyles.termsScrollContent}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              <View style={modalStyles.termsContentContainer}>
                <Text style={modalStyles.termsText}>{termsText}</Text>
              </View>
            </ScrollView>
            {!hasScrolledToBottom && (
              <Text style={modalStyles.infoNote}>
                Scroll to the bottom to enable "I Agree"
              </Text>
            )}
            <View style={modalStyles.buttonContainer}>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  hasScrolledToBottom
                    ? { backgroundColor: Colors.redTheme.background }
                    : modalStyles.agreeButtonDisabled,
                ]}
                onPress={onAgree}
                disabled={!hasScrolledToBottom}
              >
                <Text style={modalStyles.confirmButtonText}>I Agree</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
};

export default function Index() {
  // Register Native Notify push token - MUST be called at component level, not in useEffect
  // According to native-notify docs, this must be in the component body
  // Hooks must be called unconditionally, so we call it directly
  registerNNPushToken(28259, process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY);
  
  const navigation = useNavigation();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [company, setCompany] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lineAccountLink, setLineAccountLink] = useState("");
  // Contact number with country code support
  const COUNTRY_OPTIONS = [
    { code: "+81", label: "Japan", flag: "🇯🇵" },
    { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+82", label: "Korea (South Korea)", flag: "🇰🇷" },
    { code: "+1", label: "America (United States)", flag: "🇺🇸" },
    { code: "+63", label: "Philippines", flag: "🇵🇭" },
  ];

  const [selectedCountryCode, setSelectedCountryCode] = useState(
    COUNTRY_OPTIONS[4].code // Default to Philippines
  );
  const [localContactNumber, setLocalContactNumber] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contactNumberError, setContactNumberError] = useState("");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: !loading,
      headerTitle: "Register",
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background,
      headerStyle: {
        backgroundColor: "transparent",
      },
      headerBackTitle: "Back",
    });
  }, [loading, navigation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Additional effect to ensure header is hidden during loading
  useEffect(() => {
    if (loading) {
      navigation.setOptions({
        headerShown: false,
        headerLeft: null,
        headerBackVisible: false,
      });
    } else {
      // Show header with back button when not loading
      navigation.setOptions({
        headerShown: true,
        headerTitle: "",
        headerTransparent: true,
        headerTintColor: Colors.redTheme.background,
        headerStyle: {
          backgroundColor: "transparent",
        },
        headerBackTitle: "Back",
      });
    }
  }, [loading, navigation]);

  const [agentNumber, setAgentNumber] = useState("");
  const [hierarchicalAgentCode, setHierarchicalAgentCode] = useState("");
  const [isGeneratingAgentCode, setIsGeneratingAgentCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const searchTimeout = useRef(null);

  const [isYesChecked, setIsYesChecked] = useState(false);
  const [isNoChecked, setIsNoChecked] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info",
    showCloseButton: true,
    onConfirm: null,
    confirmText: "OK",
    showCancelButton: false,
    cancelText: "Cancel",
  });

  // Tutorial modal state
  const [showTutorialModal, setShowTutorialModal] = useState(true);
  const [showInvestorTutorial, setShowInvestorTutorial] = useState(false);
  const [showAgentTutorial, setShowAgentTutorial] = useState(false);

  const showModal = (config) => {
    setModalConfig({
      title: "",
      message: "",
      type: "info",
      showCloseButton: true,
      onConfirm: null,
      confirmText: "OK",
      showCancelButton: false,
      cancelText: "Cancel",
      ...config,
    });
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
  };

  // Tutorial modal handlers
  const handlePlayTutorial = (userType) => {
    // First close the registration tutorial
    setShowTutorialModal(false);

    // Small delay to ensure smooth transition between modals
    setTimeout(() => {
      if (userType === "investor") {
        setShowInvestorTutorial(true);
        console.log("Showing investor tutorial...");
      } else if (userType === "agent") {
        setShowAgentTutorial(true);
        console.log("Showing agent tutorial...");
      }
    }, 300);
  };

  const handleSkipTutorial = () => {
    setShowTutorialModal(false);
    console.log("Skipping tutorial...");
  };

  const handleYes = () => {
    setIsYesChecked(true);
    setIsNoChecked(false);
  };

  const handleNo = () => {
    setIsNoChecked(true);
    setIsYesChecked(false);
    setAgentNumber("");
    setHierarchicalAgentCode("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
  };

  // Generate random 5-character alphanumeric agent code
  const generateRandomAgentCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Check if agent code exists in Firestore
  const isAgentCodeExists = async (code) => {
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("agentCode", "==", code));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking agent code:", error);
      return false;
    }
  };

  // Generate unique account number (12 digits starting with 0000)
  const generateUniqueAccountNumber = async () => {
    try {
      let attempts = 0;
      const maxAttempts = 100; // Prevent infinite loop

      while (attempts < maxAttempts) {
        // Generate 8 random digits (since we need 12 total and start with 0000)
        const randomDigits = Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0");
        const accountNumber = `0000${randomDigits}`;

        // Check if account number already exists
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("accountNumber", "==", accountNumber));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          return accountNumber;
        }

        attempts++;
      }

      throw new Error(
        "Unable to generate unique account number after maximum attempts"
      );
    } catch (error) {
      console.error("Error generating account number:", error);
      throw error;
    }
  };

  // Generate unique agent code
  const generateUniqueAgentCode = async () => {
    setIsGeneratingAgentCode(true);

    try {
      let attempts = 0;
      const maxAttempts = 50; // Prevent infinite loop

      while (attempts < maxAttempts) {
        const newCode = generateRandomAgentCode();
        let finalHierarchicalCode = newCode;

        console.log("🔄 Generating agent code...");
        console.log("New Code:", newCode);
        console.log("Selected User:", selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "None");

        // If a user is selected, use API to generate hierarchical agent code
        if (
          selectedUser &&
          selectedUser.agentCode &&
          selectedUser.agentCode !== "Not an agent" &&
          selectedUser.agentCode !== "0"
        ) {
          console.log("👥 Sub-Agent Mode - Referrer Code:", selectedUser.agentCode);
          try {
            const apiResult = await generateAgentCodeAPI(
              selectedUser.agentCode,
              newCode
            );
            finalHierarchicalCode = apiResult.agentCode;
            console.log("✅ API returned hierarchical code:", finalHierarchicalCode);
          } catch (error) {
            console.log("⚠️ API failed, using fallback mechanism");
            // Always use fallback for API errors
            const agentCodeParts = selectedUser.agentCode.split("-");
            const zeroIndex = agentCodeParts.findIndex(
              (part) => part === "00000"
            );
            if (zeroIndex !== -1) {
              agentCodeParts[zeroIndex] = newCode;
              finalHierarchicalCode = agentCodeParts.join("-");
              console.log("✅ Fallback hierarchical code:", finalHierarchicalCode);
            }
          }
        } else {
          // No referrer selected - this is a master agent
          // Format: agentNumber-00000-00000
          finalHierarchicalCode = `${newCode}-00000-00000`;
          console.log("🌟 Master Agent Mode - No Referrer");
          console.log("🌟 Generating Master Agent Code:", finalHierarchicalCode);
        }

        const exists = await isAgentCodeExists(finalHierarchicalCode);

        if (!exists) {
          setAgentNumber(newCode); // Keep only the 5-character code in the textbox
          setHierarchicalAgentCode(finalHierarchicalCode); // Store the full hierarchical code
          
          console.log("✅ Final Agent Number:", newCode);
          console.log("✅ Final Hierarchical Code:", finalHierarchicalCode);
          
          const messageType = selectedUser ? "Agent Number Generated" : "Master Agent Code Generated";
          const messageText = selectedUser 
            ? `Your unique agent Number is: ${newCode}`
            : `Your Master Agent Code is: ${finalHierarchicalCode}\n\nAgent Number: ${newCode}`;
          
          showModal({
            title: messageType,
            message: messageText,
            type: "success",
          });
          return;
        }

        attempts++;
      }

      // If we can't find a unique code after max attempts
      showModal({
        title: "Generation Failed",
        message: "Unable to generate a unique agent code. Please try again.",
        type: "error",
      });
    } catch (error) {
      console.error("❌ Error in generateUniqueAgentCode:", error);
      showModal({
        title: "Error",
        message: "Failed to generate agent code. Please try again.",
        type: "error",
      });
    } finally {
      setIsGeneratingAgentCode(false);
    }
  };

  // Search users by agent number (for agents) or firstName/lastName (for investors)
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log("🔍 Searching for agent with number:", searchTerm);
      const usersRef = collection(firestore, "users");

      let querySnapshot;
      let results = [];

      // Try direct agent number query first
      try {
        console.log("📋 Trying direct agent number query...");
        const q = query(
          usersRef,
          where("agentNumber", "==", searchTerm.trim())
        );
        querySnapshot = await getDocs(q);
        console.log("📊 Direct query snapshot size:", querySnapshot.size);
      } catch (directError) {
        console.log(
          "⚠️ Direct query failed, trying fallback:",
          directError.message
        );

        // Fallback: Get all users and filter client-side
        try {
          console.log("📋 Trying fallback query...");
          const fallbackQuery = query(usersRef, where("agentCode", "!=", null));
          querySnapshot = await getDocs(fallbackQuery);
          console.log("📊 Fallback query snapshot size:", querySnapshot.size);
        } catch (fallbackError) {
          console.log("❌ Fallback query also failed:", fallbackError.message);
          throw fallbackError;
        }
      }

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log(
          "👤 Found user:",
          userData.firstName,
          userData.lastName,
          "Agent Code:",
          userData.agentCode,
          "Agent Number:",
          userData.agentNumber,
          "Type of agentCode:",
          typeof userData.agentCode,
          "Type of agentNumber:",
          typeof userData.agentNumber
        );

        // Check if this is a valid agent
        const isValidAgent = userData.agentCode &&
          userData.agentCode !== "Not an agent" &&
          userData.agentCode !== 0 &&
          userData.agentCode !== "0" && // Also check for string "0"
          userData.agentNumber &&
          userData.agentNumber !== 0 &&
          userData.agentNumber !== "0" && // Also check for string "0"
          (userData.agentNumber.toString() === searchTerm.trim() || 
           userData.agentNumber === searchTerm.trim());

        console.log("🔍 Is valid agent:", isValidAgent);

        if (isValidAgent) {
          results.push({
            id: doc.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            emailAddress: userData.emailAddress,
            agentCode: userData.agentCode,
            agentNumber: userData.agentNumber,
          });
        }
      });

      console.log("✅ Final results:", results.length);

      // Only show results if there's an exact match
      if (results.length > 0) {
        setSearchResults(results);
        // Automatically select the matched agent
        selectUser(results[0]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("❌ Error searching users:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      showModal({
        title: "Search Error",
        message: `Failed to search users: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debouncing
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setSearchResults([]); // Clear results while typing

    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Only search if there's text and after a delay
    if (text.trim()) {
      searchTimeout.current = setTimeout(() => {
        searchUsers(text);
      }, 500); // Wait 500ms after user stops typing
    }
  };

  // Generate agent code using API
  const generateAgentCodeAPI = async (referrerCode, agentNumber) => {
    try {
      const response = await axios.post(
        process.env.EXPO_PUBLIC_INSPIRE_AGENT_BASE_URL,
        {
          referrerCode: referrerCode,
          agentNumber: agentNumber,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.EXPO_PUBLIC_INSPIRE_AGENT_API_KEY,
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Failed to generate agent code");
      }
    } catch (error) {
      throw error;
    }
  };

  // Register new agent in the API system
  const registerAgentInAPI = async (agentNumber, agentCode, referrerCode = null) => {
    try {
      console.log("📤 Registering new agent in API...");
      console.log("Agent Number:", agentNumber);
      console.log("Agent Code:", agentCode);
      console.log("Referrer Code:", referrerCode);

      // Determine if this is a root agent (no referrer)
      const isRootAgent = !referrerCode || referrerCode === "0" || referrerCode === 0;
      
      // For master agents, use "00000-00000" as referrer code
      // This tells the API to create a root-level agent
      // For sub-agents, use the referrer's code
      const payload = {
        referrerCode: isRootAgent ? "00000-00000" : referrerCode,
        agentNumber: agentNumber,
      };

      console.log("📦 API Payload:", JSON.stringify(payload));
      console.log("🏷️ Agent Type:", isRootAgent ? "Master Agent (Root)" : "Sub Agent");

      const response = await axios.post(
        process.env.EXPO_PUBLIC_INSPIRE_AGENT_BASE_URL,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.EXPO_PUBLIC_INSPIRE_AGENT_API_KEY,
          },
        }
      );

      console.log("✅ API Response:", JSON.stringify(response.data));

      if (response.data.success) {
        console.log("✅ Agent successfully registered in API");
        console.log("📊 API Data:", response.data.data);
        return response.data.data;
      } else {
        console.error("❌ API returned error:", response.data.error);
        throw new Error(response.data.error || "Failed to register agent in API");
      }
    } catch (error) {
      console.error("❌ Error registering agent in API:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  };

  // Select a user from search results
  const selectUser = async (user) => {
    setSelectedUser(user);
    setSearchResults([]);

    // Show success message when agent is found
    showModal({
      title: "Agent Found!",
      message: `Successfully found agent: ${user.firstName} ${user.lastName}\nAgent Number: ${user.agentNumber}`,
      type: "success",
    });

    if (isYesChecked) {
      // For agents, try to generate hierarchical code
      if (agentNumber && user.agentCode && user.agentCode !== "Not an agent") {
        try {
          const apiResult = await generateAgentCodeAPI(
            user.agentCode,
            agentNumber
          );
          setHierarchicalAgentCode(apiResult.agentCode);
          // Show success modal with agent details
          showModal({
            title: "Agent Code Generated",
            message: `Agent Code: ${apiResult.agentCode}\nType: ${apiResult.type}\nReferrer: ${apiResult.referrer.name}`,
            type: "success",
          });
        } catch (error) {
          // Use fallback mechanism for hierarchical code generation
          const agentCodeParts = user.agentCode.split("-");
          const zeroIndex = agentCodeParts.findIndex(
            (part) => part === "00000"
          );
          if (zeroIndex !== -1) {
            agentCodeParts[zeroIndex] = agentNumber;
            const fallbackCode = agentCodeParts.join("-");
            setHierarchicalAgentCode(fallbackCode);
            showModal({
              title: "Agent Code Generated",
              message: `Agent Code: ${fallbackCode}\nType: Agent\nReferrer: ${user.firstName} ${user.lastName}`,
              type: "success",
            });
          } else {
            showModal({
              title: "Generation Failed",
              message: "Failed to generate agent code. Please try again.",
              type: "error",
            });
          }
        }
      }
    } else if (isNoChecked) {
      // For investors, just store the referrer's agent number
      setAgentNumber(user.agentNumber);
      setHierarchicalAgentCode(""); // Clear any previous agentCode
    }
  };

  const ConfirmPassMethod = () => {
    if (password === confirmPass) {
      Register();
    } else {
      showModal({
        title: "Password Mismatch",
        message: "Passwords do not match. Please try again.",
        type: "error",
      });
    }
  };

  // Show Terms & Conditions before proceeding with registration
  const openTermsAndConditionsModal = () => {
    setShowTermsModal(true);
  };

  const Register = async () => {
    if (!firstName || !lastName || !emailAddress || !password || !confirmPass) {
      showModal({
        title: "Missing Information",
        message: "Please fill in all required fields.",
        type: "warning",
      });
      return;
    }

    // Validate contact information
    if (!lineAccountLink.trim()) {
      showModal({
        title: "Missing Contact Information",
        message: "Please provide your LINE account link.",
        type: "warning",
      });
      return;
    }

    // Validate phone number if provided
    if (localContactNumber.trim()) {
      const validation = validatePhoneNumber(localContactNumber, selectedCountryCode);
      if (!validation.isValid) {
        setContactNumberError(validation.error);
        showModal({
          title: "Invalid Phone Number",
          message: validation.error,
          type: "error",
        });
        return;
      }
    }

    // Validate agent code if user is an agent
    if (isYesChecked && (!agentNumber || !hierarchicalAgentCode)) {
      showModal({
        title: "Missing Agent Code",
        message:
          "Please generate your agent code by clicking the 'Generate' button before creating your account.",
        type: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        emailAddress,
        password
      );
      const user = userCredential.user;
      let now = new Date();

      // Generate unique account number
      const accountNumber = await generateUniqueAccountNumber();

      await AsyncStorage.clear();
      await AsyncStorage.setItem("userEmail", emailAddress);
      await AsyncStorage.setItem("userPassword", password);

      // Check if there's a referrer and store as pending
      const hasReferrer = isYesChecked && selectedUser;
      const pendingReferralData = hasReferrer ? {
        referrerId: selectedUser.id,
        referrerName: `${selectedUser.firstName} ${selectedUser.lastName}`,
        referrerAgentCode: selectedUser.agentCode,
        referrerAgentNumber: selectedUser.agentNumber,
        requestedAgentCode: hierarchicalAgentCode,
        requestedAgentNumber: agentNumber.trim(),
        status: "pending"
      } : null;

      await setDoc(doc(firestore, "users", user.uid), {
        firstName,
        lastName,
        company: company.trim() || "",
        accountNumber: accountNumber,
        agentNumber: isYesChecked ? agentNumber.trim() : "0", // Store as string for consistency
        agentCode: hasReferrer ? "pending" : (isYesChecked ? hierarchicalAgentCode : "0"), // Set to "pending" if awaiting referrer confirmation
        refferedAgent:
          isNoChecked && selectedUser ? selectedUser.agentNumber : "0", // Store as string for consistency
        stockAmount: 0,
        walletAmount: 0,
        kycApproved: false,
        accountType: "Basic",
        timeDepositAmount: 0,
        agentWalletAmount: 0,
        usdtAmount: 0,
        availBalanceAmount: 0,
        emailAddress: emailAddress,
        lineAccountLink: lineAccountLink.trim(),
        contactNumber: contactNumber.trim(),
        dollarDepositAmount: 0,
        dollarAvailBalanceAmount: 0,
        cryptoAvailBalanceAmount: 0,
        dollarWalletAmount: 0,
        cryptoWalletAmount: 0,
        accumulatedPoints: 10,
        createdAt: now,
        agent: isYesChecked,
        lastSignedIn: now,
        stock: false,
        cryptoBalances: {
          BTC: 0,
          ETH: 0,
          USDT: 0,
        },
        currencyBalances: {
          USD: 0,
          JPY: 0,
        },
        ...(pendingReferralData && { pendingReferral: pendingReferralData })
      });

      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: 0,
        date: now,
        type: "Created Account",
      });

      await addDoc(
        collection(firestore, "users", user.uid, "agentTransactions"),
        {
          amount: 0,
          date: now,
          type: "Created Account",
        }
      );

      await addDoc(
        collection(firestore, "users", user.uid, "stockTransactions"),
        {
          amount: 0,
          date: now,
          type: "Created Account",
        }
      );

      await addDoc(
        collection(firestore, "users", user.uid, "investmentProfiles"),
        {
          amount: 0,
          dateOfMaturity: now,
          interestRate: 0,
        }
      );

      // Add initialization of cryptoTrades collection
      await addDoc(collection(firestore, "users", user.uid, "cryptoTrades"), {
        type: "INITIAL",
        asset: "SYSTEM",
        amount: 0,
        amountPHP: 0,
        price: 0,
        totalCost: 0,
        timestamp: now,
      });

      // Add default card to purchasedCards subcollection
      await setDoc(
        doc(firestore, "users", user.uid, "purchasedCards", "default"),
        {
          purchaseCardsId: "default",
          isActive: true, // First card is always active
          purchaseDate: now,
          cardName: "Default Card",
          isDefaultCard: true, // Mark as the free default card
        }
      );

      console.log("✅ Default card added to new user account");

      // Add transaction record for the free default card
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: 0, // Free card
        date: now,
        type: "Free Default Card",
        cardType: "default",
        description: "Welcome gift - Default Card received upon registration",
      });

      console.log("✅ Default card transaction record added");

      // Send referral confirmation notification if there's a referrer
      if (hasReferrer && selectedUser) {
        console.log("� Sending referral confirmation request to referrer...");
        try {
          // Create notification for the referrer
          await addDoc(
            collection(firestore, "users", selectedUser.id, "notifications"),
            {
              title: "New Referral Request",
              message: `${firstName} ${lastName} wants to register as an agent under your referral. Please confirm if you want to be their referrer.`,
              type: "referral_request",
              createdAt: now,
              read: false,
              newUserId: user.uid,
              newUserName: `${firstName} ${lastName}`,
              newUserEmail: emailAddress,
              newUserAgentNumber: agentNumber.trim(),
              requestedAgentCode: hierarchicalAgentCode,
              referrerAgentCode: selectedUser.agentCode,
              status: "pending"
            }
          );
          console.log("✅ Referral confirmation notification sent to referrer");

          // Send push notification to referrer via Native Notify
          try {
            await axios.post("https://app.nativenotify.com/api/indie/notification", {
              subID: selectedUser.id,
              appId: 28259,
              appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
              title: "New Referral Request",
              message: `${firstName} ${lastName} wants to be your referral. Please review and confirm.`,
            });
            console.log("✅ Push notification sent to referrer via Native Notify");
          } catch (pushError) {
            console.error("⚠️ Error sending push notification (non-blocking):", pushError);
          }
        } catch (notificationError) {
          console.error("❌ Error sending referral notification:", notificationError);
        }
      }

      // Register agent in API system (both with and without referrer)
      if (isYesChecked && agentNumber && hierarchicalAgentCode) {
        console.log("🔄 Registering new agent in API system...");
        console.log("Has Referrer:", hasReferrer);
        
        // Only register in API if there's NO referrer (root agent or direct registration)
        // Agents with referrers will be registered upon confirmation
        if (!hasReferrer) {
          try {
            const apiResult = await registerAgentInAPI(
              agentNumber.trim(),
              hierarchicalAgentCode,
              null // No referrer code for root agents
            );

            console.log("✅ Agent registered in API:", apiResult);
            
            // Update Firestore with the API-confirmed agent code if different
            if (apiResult.agentCode && apiResult.agentCode !== hierarchicalAgentCode) {
              console.log("📝 Updating agent code with API-confirmed value:", apiResult.agentCode);
              await updateDoc(doc(firestore, "users", user.uid), {
                agentCode: apiResult.agentCode,
              });
              console.log("✅ Agent code updated in Firestore");
            }
            
            // Log successful API sync
            console.log("✅ Root agent successfully synced with API");
            console.log("Agent Number:", agentNumber.trim());
            console.log("Agent Code:", apiResult.agentCode || hierarchicalAgentCode);
          } catch (apiError) {
            console.error("⚠️ Failed to register agent in API (non-blocking):", apiError);
            console.error("API Error Details:", {
              message: apiError.message,
              response: apiError.response?.data,
              status: apiError.response?.status,
            });
            // Don't block registration if API fails - agent can still function locally
            // The hierarchical code is already saved in Firestore
            showModal({
              title: "API Sync Warning",
              message: "Your account was created successfully, but there was an issue syncing with the agent API. Your agent code has been saved locally.",
              type: "warning",
            });
          }
        } else {
          console.log("⏳ Agent has referrer - API registration will occur after confirmation");
        }
      }

      // Award points to referrer only if NO confirmation needed (investor referrals)
      // For agent referrals with referrer, points will be awarded upon confirmation
      if (selectedUser && !hasReferrer) {
        console.log("🎁 Attempting to award points to referrer...");
        console.log("Selected User ID:", selectedUser.id);
        console.log("Selected User Name:", selectedUser.firstName, selectedUser.lastName);
        console.log("Is Agent:", isYesChecked);
        
        try {
          const referrerRef = doc(firestore, "users", selectedUser.id);
          
          // Update referrer's accumulated points
          await updateDoc(referrerRef, {
            accumulatedPoints: increment(10),
          });
          console.log("✅ Updated referrer's accumulatedPoints");
          
          // Add points transaction record for the referrer
          const pointsTransactionData = {
            points: 10,
            date: now,
            type: "Referral Bonus",
            description: `Earned 10 points from ${isYesChecked ? 'agent' : 'investor'} referral: ${firstName} ${lastName}`,
            referredName: `${firstName} ${lastName}`,
            referredEmail: emailAddress,
            referredType: isYesChecked ? 'agent' : 'investor',
          };
          
          console.log("📝 Adding points transaction:", pointsTransactionData);
          
          const pointsTransactionRef = await addDoc(
            collection(firestore, "users", selectedUser.id, "pointsTransactions"),
            pointsTransactionData
          );
          
          console.log(`✅ Points transaction added with ID: ${pointsTransactionRef.id}`);
          console.log(`✅ Awarded 10 points to referrer: ${selectedUser.firstName} ${selectedUser.lastName}`);
        } catch (pointsError) {
          console.error("❌ Error awarding points to referrer:", pointsError);
          console.error("Error code:", pointsError.code);
          console.error("Error message:", pointsError.message);
          console.error("Error stack:", pointsError.stack);
          // Don't block registration if points update fails
        }
      } else if (hasReferrer) {
        console.log("ℹ️ Referrer confirmation required, points will be awarded upon acceptance");
      } else {
        console.log("ℹ️ No referrer selected, skipping points award");
      }

      // Show success modal and keep loading screen visible
      let successMessage = "";
      
      if (hasReferrer) {
        successMessage = `Welcome to Inspire Wallet! Your account has been created successfully.\n\nYour Account Number: ${accountNumber}\n\nYour agent code is pending approval from your referrer. You'll receive a notification once confirmed.`;
      } else if (isYesChecked) {
        // Agent without referrer - root agent synced with API
        successMessage = `Welcome to Inspire Wallet! Your account has been created successfully.\n\nYour Account Number: ${accountNumber}\nYour Agent Number: ${agentNumber}\nYour Agent Code: ${hierarchicalAgentCode}\n\nYour agent account has been synced with the system.`;
      } else {
        // Regular investor
        successMessage = `Welcome to Inspire Wallet! Your account has been created successfully.\n\nYour Account Number: ${accountNumber}`;
      }

      showModal({
        title: "Registration Successful!",
        message: successMessage,
        type: "success",
        onConfirm: () => {
          // Clear all tutorial states first
          setShowTutorialModal(false);
          setShowInvestorTutorial(false);
          setShowAgentTutorial(false);

          // Close modal and stop loading
          hideModal();
          setLoading(false);

          // Redirect to create passcode page for new users
          // Use platform-specific navigation approach for iOS
          if (Platform.OS === "ios") {
            // For iOS, use a longer delay and try multiple navigation approaches
            setTimeout(() => {
              try {
                // Redirect to create passcode page
                router.replace("/create-passcode");
              } catch (error) {
                console.error(
                  "Router navigation failed, trying fallback:",
                  error
                );
                // Fallback: try router.push
                try {
                  router.push("/create-passcode");
                } catch (pushError) {
                  console.error("Router push also failed:", pushError);
                  // Last resort: use navigation prop if available
                  if (navigation && navigation.navigate) {
                    navigation.navigate("create-passcode");
                  }
                }
              }
            }, 600); // Delay for iOS navigation
          } else {
            // For Android, use immediate navigation
            try {
              router.replace("/create-passcode");
            } catch (error) {
              console.error("Android navigation failed:", error);
              router.push("/create-passcode");
            }
          }
        },
      });
      
      // Request notification permissions first (required for Android 13+)
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus === 'granted') {
          // Get push token (Native Notify will use this automatically)
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: "81d5c41e-b862-48d6-a14d-21246b09c564",
          });
          console.log("Got Expo push token for registration:", tokenData.data);

          // Note: registerNNPushToken should be called at component level, not here
          // For registration flow, we'll rely on the main app component's registration
          
          // Register device with Native Notify
          await registerIndieID(
            user.uid.toString(),
            28259,
            process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY
          );
          console.log("Registered device with Native Notify for user:", user.uid);
          
          // Send welcome notification
          await axios.post("https://app.nativenotify.com/api/indie/notification", {
            subID: `${user.uid}`,
            appId: 28259,
            appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
            title: "Welcome to Inspire Wallet",
            message: "Congratulations you successfully registered your account.",
          });
          console.log("Sent welcome notification with subID:", user.uid);
        } else {
          console.warn("Notification permissions not granted, skipping device registration");
        }
      } catch (notificationError) {
        console.error("Error registering device for notifications:", notificationError);
        // Continue execution even if notification registration fails
      }
    } catch (error) {
      console.log(error);
      if (error.code === "auth/email-already-in-use") {
        showModal({
          title: "Email Already Registered",
          message:
            "This email address is already in use. Please try a different email.",
          type: "error",
        });
      } else {
        showModal({
          title: "Registration Failed",
          message: "An error occurred during registration. Please try again.",
          type: "error",
        });
      }
      setLoading(false);
    } finally {
      // Only set loading to false for error cases
      // For successful registration, the modal onConfirm will handle it
    }
  };

  if (loading) {
    return (
      <>
        <LoadingScreen type="register" />
        <ProfessionalModal
          visible={modalVisible}
          onClose={hideModal}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          showCloseButton={modalConfig.showCloseButton}
          onConfirm={modalConfig.onConfirm}
          confirmText={modalConfig.confirmText}
          showCancelButton={modalConfig.showCancelButton}
          cancelText={modalConfig.cancelText}
        />
      </>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={[
        styles.container,
        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
      ]}
      resizeMode="cover"
    >
      {/* Show tutorial modal on first render */}
      {!loading && showTutorialModal && (
        <RegistrationTutorial
          visible={true}
          onClose={() => setShowTutorialModal(false)}
          onPlayTutorial={handlePlayTutorial}
          onSkipTutorial={handleSkipTutorial}
        />
      )}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.androidSafeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.headerContent}>
                <Ionicons
                  name="person-add"
                  size={32}
                  color={Colors.redTheme.background}
                  style={styles.headerIcon}
                />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>Create Account</Text>
                  <Text style={styles.headerSubtitle}>
                    Join Inspire Wallet Today
                  </Text>
                </View>
              </View>
            </View>

            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeHeader}>
                <Ionicons
                  name="rocket"
                  size={24}
                  color={Colors.redTheme.background}
                />
                <Text style={styles.welcomeTitle}>Welcome Investor!</Text>
              </View>
              <Text style={styles.welcomeText}>
                🚀 Start your investment journey with Inspire Wallet{"\n"}
                📈 Track your investments and grow your wealth{"\n"}
                💼 Professional portfolio management tools{"\n"}
                🔒 Secure and trusted platform
              </Text>
            </View>

            {/* Registration Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Account Registration</Text>

              {/* Personal Information Section */}
              <View style={styles.formSection}>
              <Text style={styles.subsectionTitle}>Personal Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John"
                    placeholderTextColor="#999"
                    value={firstName}
                    onChangeText={(value) => setFirstName(value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Doe"
                    placeholderTextColor="#999"
                    value={lastName}
                    onChangeText={(value) => setLastName(value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Pressable
                    style={styles.checkboxContainer}
                    onPress={() => {
                      const newValue = !hasCompany;
                      setHasCompany(newValue);
                      if (!newValue) {
                        setCompany(""); // Clear company field when unchecked
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        hasCompany && styles.checkedBox,
                      ]}
                    >
                      {hasCompany && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I have a company
                    </Text>
                  </Pressable>
                </View>

                {hasCompany && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your company name"
                      placeholderTextColor="#999"
                      value={company}
                      onChangeText={(value) => setCompany(value)}
                    />
                  </View>
                )}
              </View>

              {/* Contact Information Section */}
              <View style={styles.formSection}>
                <Text style={styles.subsectionTitle}>Contact Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LINE Account Link *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://line.me/ti/p/..."
                    placeholderTextColor="#999"
                    value={lineAccountLink}
                    onChangeText={(value) => setLineAccountLink(value)}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Number *</Text>

                  {/* Country selector + phone textbox in a single row */}
                  <View style={styles.phoneRow}>
                    {/* Country selector button */}
                    <TouchableOpacity
                      style={styles.countrySelectorButton}
                      onPress={() => setIsCountryModalVisible(true)}
                    >
                      <Text style={styles.countrySelectorFlag}>
                        {COUNTRY_OPTIONS.find(c => c.code === selectedCountryCode)?.flag}
                      </Text>
                      <Text style={styles.countrySelectorText}>
                        {selectedCountryCode}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={Colors.redTheme.background}
                      />
                    </TouchableOpacity>

                    {/* Local number textbox */}
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="9012345678"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      value={localContactNumber}
                      maxLength={getMaxLength(selectedCountryCode)}
                      onChangeText={(value) => {
                        const sanitized = value.replace(/[^\d\s]/g, "");
                        setLocalContactNumber(sanitized);
                        const combined =
                          selectedCountryCode +
                          (sanitized ? " " + sanitized : "");
                        setContactNumber(combined);
                        
                        // Real-time validation
                        if (sanitized.trim()) {
                          const validation = validatePhoneNumber(sanitized, selectedCountryCode);
                          setContactNumberError(validation.error || "");
                        } else {
                          setContactNumberError("");
                        }
                      }}
                    />
                  </View>
                  {/* Error message display */}
                  {contactNumberError ? (
                    <Text style={styles.errorText}>{contactNumberError}</Text>
                  ) : null}
                </View>
              </View>

              {/* Agent Information Section */}
              <View style={styles.formSection}>
                <Text style={styles.subsectionTitle}>Account Type</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Are you an agent? *</Text>
                  <View style={styles.checkboxRow}>
                    <Pressable
                      style={styles.checkboxContainer}
                      onPress={handleYes}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isYesChecked && styles.checkedBox,
                        ]}
                      >
                        {isYesChecked && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        Yes, I'm an agent
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.checkboxContainer}
                      onPress={handleNo}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isNoChecked && styles.checkedBox,
                        ]}
                      >
                        {isNoChecked && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        No, I'm an investor
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Agent search for agents (after agent number generated) */}
                {isYesChecked && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Agent Number *</Text>
                    <View style={styles.agentCodeContainer}>
                      <View
                        style={[
                          styles.agentCodeDisplay,
                          !agentNumber && styles.agentCodeDisplayEmpty,
                        ]}
                      >
                        <Text
                          style={[
                            styles.agentCodeText,
                            !agentNumber && styles.agentCodeTextEmpty,
                          ]}
                        >
                          {agentNumber ||
                            "Click generate to create agent number"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.generateButton,
                          isGeneratingAgentCode &&
                            styles.generateButtonDisabled,
                        ]}
                        onPress={generateUniqueAgentCode}
                        disabled={isGeneratingAgentCode}
                      >
                        {isGeneratingAgentCode ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.generateButtonText}>
                            Generate
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.agentCodeHint}>
                      Click the generate button to create a unique 5-character
                      agent number
                    </Text>
                    {agentNumber && !selectedUser && (
                      <View style={styles.masterAgentContainer}>
                        <View style={styles.masterAgentHeader}>
                          <Ionicons
                            name="shield-checkmark"
                            size={18}
                            color="#10B981"
                          />
                          <Text style={styles.masterAgentTitle}>
                            Master Agent Code
                          </Text>
                        </View>
                        <Text style={styles.masterAgentCode}>
                          {hierarchicalAgentCode}
                        </Text>
                        <Text style={styles.masterAgentHint}>
                          You will be registered as a Master Agent since no referrer was selected
                        </Text>
                      </View>
                    )}
                    {!agentNumber && (
                      <View style={styles.warningContainer}>
                        <Ionicons
                          name="warning"
                          size={16}
                          color="#F59E0B"
                          style={styles.warningIcon}
                        />
                        <Text style={styles.warningText}>
                          You must generate an agent code before creating your
                          account
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Agent search for agents (after agent number generated) */}
                {isYesChecked && agentNumber && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Search Referral</Text>
                    <View style={styles.searchContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter exact agent number..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                      />
                      {isSearching && (
                        <ActivityIndicator
                          size="small"
                          color={Colors.redTheme.background}
                          style={styles.searchLoading}
                        />
                      )}
                    </View>
                    <Text style={styles.searchHint}>
                      Enter the exact agent number to automatically find and
                      select the agent
                    </Text>
                    {selectedUser && (
                      <View style={styles.selectedUserContainer}>
                        <View style={styles.selectedUserHeader}>
                          <Ionicons
                            name="person"
                            size={16}
                            color={Colors.redTheme.background}
                          />
                          <Text style={styles.selectedUserTitle}>
                            Selected User
                          </Text>
                        </View>
                        <Text style={styles.selectedUserName}>
                          {selectedUser.firstName} {selectedUser.lastName}
                        </Text>
                        <Text style={styles.selectedUserAgentCode}>
                          Agent Number: {selectedUser.agentNumber}
                        </Text>
                        <Text style={styles.selectedUserAgentCode}>
                          Parent Agent Code: {selectedUser.agentCode}
                        </Text>
                        <Text style={styles.hierarchicalAgentCode}>
                          Your Agent Code: {hierarchicalAgentCode}
                        </Text>
                        {hierarchicalAgentCode && (
                          <Text style={styles.agentTypeInfo}>
                            Agent Type: {selectedUser.agentType || "Agent"}
                          </Text>
                        )}
                      </View>
                    )}
                    {searchQuery &&
                      searchResults.length === 0 &&
                      !isSearching && (
                        <View style={styles.noResultsContainer}>
                          <Text style={styles.noResultsText}>
                            No agents found with agent number "{searchQuery}"
                          </Text>
                        </View>
                      )}
                  </View>
                )}

                {/* Agent search for investors (No checked) */}
                {isNoChecked && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Search your Agent Referral (Optional)
                    </Text>
                    <View style={styles.searchContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter exact agent number..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                      />
                      {isSearching && (
                        <ActivityIndicator
                          size="small"
                          color={Colors.redTheme.background}
                          style={styles.searchLoading}
                        />
                      )}
                    </View>
                    <Text style={styles.searchHint}>
                      Enter the exact agent number to automatically find and
                      select the agent
                    </Text>
                    {selectedUser && (
                      <View style={styles.selectedUserContainer}>
                        <View style={styles.selectedUserHeader}>
                          <Ionicons
                            name="person"
                            size={16}
                            color={Colors.redTheme.background}
                          />
                          <Text style={styles.selectedUserTitle}>
                            Selected Agent
                          </Text>
                        </View>
                        <Text style={styles.selectedUserName}>
                          {selectedUser.firstName} {selectedUser.lastName}
                        </Text>
                        <Text style={styles.selectedUserAgentCode}>
                          Agent Number: {selectedUser.agentNumber}
                        </Text>
                      </View>
                    )}
                    {searchQuery &&
                      searchResults.length === 0 &&
                      !isSearching && (
                        <View style={styles.noResultsContainer}>
                          <Text style={styles.noResultsText}>
                            No agents found with agent number "{searchQuery}"
                          </Text>
                        </View>
                      )}
                  </View>
                )}
              </View>

              {/* Account Credentials Section */}
              <View style={styles.formSection}>
                <Text style={styles.subsectionTitle}>Account Credentials</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    value={emailAddress}
                    onChangeText={(value) => setEmailAddress(value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Create a secure password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(value) => setPassword(value)}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color={Colors.redTheme.background}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPass}
                      value={confirmPass}
                      onChangeText={(value) => setConfirmPass(value)}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPass(!showConfirmPass)}
                    >
                      <Ionicons
                        name={showConfirmPass ? "eye-off" : "eye"}
                        size={20}
                        color={Colors.redTheme.background}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading ||
                  !!contactNumberError ||
                  (isYesChecked && (!agentNumber || !hierarchicalAgentCode)) ||
                  !lineAccountLink.trim()) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={openTermsAndConditionsModal}
              disabled={
                loading ||
                !!contactNumberError ||
                (isYesChecked && (!agentNumber || !hierarchicalAgentCode)) ||
                !lineAccountLink.trim()
              }
            >
              <View style={styles.submitButtonContent}>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="white"
                    style={styles.loadingIcon}
                  />
                ) : (
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color="white"
                    style={styles.submitIcon}
                  />
                )}
                <Text style={styles.submitButtonText}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCloseButton={modalConfig.showCloseButton}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
      />

      {showInvestorTutorial && (
        <InvestorTutorial
          visible={true}
          onClose={() => setShowInvestorTutorial(false)}
        />
      )}

      {showAgentTutorial && (
        <AgentTutorial
          visible={true}
          onClose={() => setShowAgentTutorial(false)}
        />
      )}

      <TermsAndConditionsModal
        visible={showTermsModal}
        onAgree={() => {
          setShowTermsModal(false);
          ConfirmPassMethod();
        }}
        onCancel={() => setShowTermsModal(false)}
      />

      {/* Country picker modal */}
      <Modal
        transparent
        animationType="fade"
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={styles.countryModalContainer}>
            <Text style={styles.countryModalTitle}>Select Country</Text>
            {COUNTRY_OPTIONS.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={styles.countryOptionRow}
                onPress={() => {
                  setSelectedCountryCode(country.code);
                  const combined =
                    country.code +
                    (localContactNumber ? " " + localContactNumber : "");
                  setContactNumber(combined);
                  setIsCountryModalVisible(false);
                }}
              >
                <View style={styles.countryOptionContent}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryOptionName}>{country.label}</Text>
                </View>
                <Text style={styles.countryOptionCode}>{country.code}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.countryModalCancelButton}
              onPress={() => setIsCountryModalVisible(false)}
            >
              <Text style={styles.countryModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

// Professional Modal Styles
const modalStyles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  blurContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  androidModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 320,
    width: "90%",
    maxWidth: 360,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 35,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconText: {
    fontSize: 32,
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 0,
    textAlign: "center",
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  modalIcon: {
    marginRight: 6,
  },
  modalMessage: {
    fontSize: 17,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 36,
    paddingHorizontal: 12,
    fontWeight: "400",
  },
  termsScroll: {
    maxHeight: 360,
    marginBottom: 16,
  },
  termsScrollContent: {
    paddingBottom: 8,
  },
  termsContentContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  termsText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    textAlign: "left",
  },
  infoNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  agreeButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  modalButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header Card
  headerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 5,
    borderLeftColor: Colors.redTheme.background,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 16,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: "rgba(255, 245, 242, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },

  // Form Card
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 20,
    textAlign: "center",
  },

  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204, 33, 53, 0.2)",
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  nameColumn: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Phone + country selector row
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countrySelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  countrySelectorFlag: {
    fontSize: 20,
    marginRight: 6,
  },
  countrySelectorText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Country picker modal styles
  countryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  countryModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  countryModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  countryOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  countryOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryOptionName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  countryOptionCode: {
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  countryModalCancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  countryModalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  // Checkbox Styles
  checkboxRow: {
    gap: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    height: 24,
    width: 24,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginRight: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  checkedBox: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  // Radio Button Styles
  radioButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  radioButtonChecked: {
    borderColor: Colors.redTheme.background,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.redTheme.background,
  },

  // Password Container
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    padding: 14,
  },

  // Submit Button
  submitButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Agent Code Styles
  agentCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentCodeDisplay: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  agentCodeDisplayEmpty: {
    backgroundColor: "#f8f9fa",
    borderColor: "#d1d5db",
  },
  agentCodeText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  agentCodeTextEmpty: {
    color: "#6b7280",
    fontWeight: "400",
    fontStyle: "italic",
  },
  generateButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: "#999",
    shadowOpacity: 0.1,
  },
  generateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  agentCodeHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  searchHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },

  // Search Styles
  searchContainer: {
    position: "relative",
  },
  searchInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    paddingRight: 50,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchLoading: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  searchResultsContainer: {
    marginTop: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedSearchResult: {
    backgroundColor: "rgba(204, 33, 53, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: Colors.redTheme.background,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultHeader: {
    marginBottom: 4,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  searchResultEmail: {
    fontSize: 14,
    color: "#666",
  },
  searchResultFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
  },
  searchResultAgentCode: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  notAgentCode: {
    color: "#6B7280",
  },
  searchResultDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  searchResultAgentNumber: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 2,
  },
  searchResultAgentCode: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginBottom: 2,
  },
  searchResultType: {
    fontSize: 12,
    fontWeight: "600",
  },
  agentType: {
    color: "#059669",
  },
  investorType: {
    color: "#7C3AED",
  },
  selectedIcon: {
    marginLeft: 8,
  },
  noResultsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noResultsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },

  // Selected User Styles
  selectedUserContainer: {
    marginTop: 12,
    backgroundColor: "rgba(204, 33, 53, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.2)",
  },
  selectedUserHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedUserTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginLeft: 6,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  selectedUserAgentCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  hierarchicalAgentCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  agentTypeInfo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C3AED",
    marginTop: 4,
  },

  // Master Agent Styles
  masterAgentContainer: {
    marginTop: 12,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  masterAgentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  masterAgentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
    marginLeft: 6,
  },
  masterAgentCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  masterAgentHint: {
    fontSize: 12,
    color: "#059669",
    fontStyle: "italic",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Legacy styles (removed as they're replaced by new design)
  formContainer: {
    // Replaced by scrollContainer
  },
  headerText: {
    // Replaced by headerTitle
  },
  subHeaderText: {
    // Replaced by welcomeTitle
  },
  infoText: {
    // Replaced by welcomeText
  },
  inlineRow: {
    // Replaced by checkboxRow
  },
  labelagent: {
    // Replaced by inputLabel
  },
  inputagent: {
    // Replaced by input style
  },
  eyeButtonText: {
    // Replaced by icon
  },

  // Warning styles
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "500",
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
});
