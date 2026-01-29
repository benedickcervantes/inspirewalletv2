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
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Colors } from "../../constants/Colors";
import SimpleLoadingScreen from "./../../components/SimpleLoadingScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import axios from "axios";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

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

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [userLanguage, setUserLanguage] = useState('English');

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t(userLanguage, 'agentRequest.header.title'),
      headerTransparent: true,
    });

    // Check account type access first, then get user data
    checkAccessAndLoadData();
  }, [userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const checkAccessAndLoadData = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        showModal({
          title: t(userLanguage, 'agentRequest.modals.accessRestricted.title'),
          message: t(userLanguage, 'agentRequest.modals.accessRestricted.message').replace('{accountType}', userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            hideModal();
            router.push("/main");
          },
        });
        return;
      }
      
      // Check if user is already an agent
      const userEmail = await AsyncStorage.getItem("userEmail");
      if (userEmail) {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("emailAddress", "==", userEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          if (userData.agent) {
            showModal({
              title: t(userLanguage, 'agentRequest.modals.alreadyAgent.title'),
              message: t(userLanguage, 'agentRequest.modals.alreadyAgent.message'),
              type: "info",
              onConfirm: () => {
                hideModal();
                router.push("/main");
              },
            });
            return;
          }
        }
      }
      
      // If access is allowed and user is not already an agent, proceed with getting user data
      getCurrentUserData();
    } catch (error) {
      console.error("Error checking account access:", error);
      showModal({
        title: t(userLanguage, 'agentRequest.modals.error.title'),
        message: t(userLanguage, 'agentRequest.modals.error.message'),
        type: "error",
        onConfirm: () => {
          hideModal();
          router.push("/main");
        },
      });
    }
  };

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentNumber, setAgentNumber] = useState("");
  const [hierarchicalAgentCode, setHierarchicalAgentCode] = useState("");
  const [isGeneratingAgentCode, setIsGeneratingAgentCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const searchTimeout = useRef(null);

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

  // Get current user data from AsyncStorage and Firestore
  const getCurrentUserData = async () => {
    try {
      const userEmail = await AsyncStorage.getItem("userEmail");
      if (!userEmail) {
        showModal({
          title: "Authentication Required",
          message: "Please log in to submit an agent request.",
          type: "error",
          onConfirm: () => {
            hideModal();
            router.push("/");
          },
        });
        return;
      }

      // Get user data from Firestore
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("emailAddress", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setCurrentUser({
          id: querySnapshot.docs[0].id,
          ...userData,
        });
        setFirstName(userData.firstName || "");
        setLastName(userData.lastName || "");
        setFullName(
          `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
        );
      } else {
        showModal({
          title: "User Not Found",
          message: "User data not found. Please try logging in again.",
          type: "error",
          onConfirm: () => {
            hideModal();
            router.push("/");
          },
        });
      }
    } catch (error) {
      console.error("Error getting user data:", error);
      showModal({
        title: "Error",
        message: "Failed to load user data. Please try again.",
        type: "error",
      });
    }
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

  // Generate unique agent code
  const generateUniqueAgentCode = async () => {
    setIsGeneratingAgentCode(true);

    try {
      let attempts = 0;
      const maxAttempts = 50; // Prevent infinite loop

      while (attempts < maxAttempts) {
        const newCode = generateRandomAgentCode();
        let finalHierarchicalCode = newCode;

        // If a user is selected, use API to generate hierarchical agent code
        if (
          selectedUser &&
          selectedUser.agentCode &&
          selectedUser.agentCode !== "Not an agent"
        ) {
          try {
            const apiResult = await generateAgentCodeAPI(
              selectedUser.agentCode,
              newCode
            );
            finalHierarchicalCode = apiResult.agentCode;
          } catch (error) {
            // Always use fallback for API errors
            const agentCodeParts = selectedUser.agentCode.split("-");
            const zeroIndex = agentCodeParts.findIndex(
              (part) => part === "00000"
            );
            if (zeroIndex !== -1) {
              agentCodeParts[zeroIndex] = newCode;
              finalHierarchicalCode = agentCodeParts.join("-");
            }
          }
        } else {
          // If no parent agent is selected, use the generated code as the hierarchical code
          finalHierarchicalCode = newCode;
        }

        const exists = await isAgentCodeExists(finalHierarchicalCode);

        if (!exists) {
          setAgentNumber(newCode); // Keep only the 5-character code in the textbox
          setHierarchicalAgentCode(finalHierarchicalCode); // Store the full hierarchical code
                  showModal({
          title: t(userLanguage, 'agentRequest.modals.agentNumberGenerated.title'),
          message: t(userLanguage, 'agentRequest.modals.agentNumberGenerated.message').replace('{agentNumber}', newCode),
          type: "success",
        });
          return;
        }

        attempts++;
      }

      // If we can't find a unique code after max attempts
      showModal({
        title: t(userLanguage, 'agentRequest.modals.error.title'),
        message: t(userLanguage, 'agentRequest.modals.error.generationFailed'),
        type: "error",
      });
    } catch (error) {
      showModal({
        title: t(userLanguage, 'agentRequest.modals.error.title'),
        message: t(userLanguage, 'agentRequest.modals.error.generationFailed'),
        type: "error",
      });
    } finally {
      setIsGeneratingAgentCode(false);
    }
  };

  // Search users by agent number (agents only)
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(firestore, "users");
      // Fetch all users who are agents (agentCode exists and is not 'Not an agent' or 0)
      const q = query(usersRef, where("agentCode", "!=", null));
      const querySnapshot = await getDocs(q);

      const results = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (
          userData.agentCode &&
          userData.agentCode !== "Not an agent" &&
          userData.agentCode !== 0
        ) {
          // Only include if there's an exact match with agent number
          if (userData.agentNumber && userData.agentNumber.toString() === searchTerm.trim()) {
            results.push({
              id: doc.id,
              firstName: userData.firstName,
              lastName: userData.lastName,
              emailAddress: userData.emailAddress,
              agentCode: userData.agentCode,
              agentNumber: userData.agentNumber,
            });
          }
        }
      });

      // Only show results if there's an exact match
      if (results.length > 0) {
        setSearchResults(results);
        // Automatically select the matched agent
        selectUser(results[0]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      showModal({
        title: "Search Error",
        message: "Failed to search users. Please try again.",
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

  // Select a user from search results
  const selectUser = async (user) => {
    setSelectedUser(user);
    setSearchResults([]);
    
    // Show success message when agent is found
    showModal({
      title: t(userLanguage, 'agentRequest.modals.agentFound.title'),
      message: t(userLanguage, 'agentRequest.modals.agentFound.message')
        .replace('{firstName}', user.firstName)
        .replace('{lastName}', user.lastName)
        .replace('{agentNumber}', user.agentNumber),
      type: "success",
    });

    // Generate agent code using API if agent number exists and user is an agent
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
        const zeroIndex = agentCodeParts.findIndex((part) => part === "00000");
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
  };

  // Submit agent request
  const submitAgentRequest = async () => {
    if (!currentUser) {
      showModal({
        title: "Authentication Required",
        message: "Please log in to submit an agent request.",
        type: "error",
      });
      return;
    }

    if (!agentNumber) {
      showModal({
        title: "Missing Agent Number",
        message: "Please generate an agent number first.",
        type: "warning",
      });
      return;
    }

    // Agent selection is now optional, so we don't need to validate it

    // If no parent agent is selected, the hierarchical agent code should be the same as the agent number
    if (!hierarchicalAgentCode) {
      setHierarchicalAgentCode(agentNumber);
    }

    setLoading(true);

    try {
      const now = new Date();

      // Add agent request to Firestore
      const agentRequestRef = await addDoc(
        collection(firestore, "agentRequest"),
        {
          fullName: fullName,
          agentNumber: agentNumber,
          agentCode: hierarchicalAgentCode,
          datetimeRequest: now,
          isApproved: false,
          userID: currentUser.id,
          emailAddress: currentUser.emailAddress,
        }
      );

      showModal({
        title: t(userLanguage, 'agentRequest.modals.requestSubmitted.title'),
        message: t(userLanguage, 'agentRequest.modals.requestSubmitted.message').replace('{requestId}', agentRequestRef.id),
        type: "success",
        onConfirm: () => {
          hideModal();
          router.push("/");
        },
      });
    } catch (error) {
      console.error("Error submitting agent request:", error);
      showModal({
        title: t(userLanguage, 'agentRequest.modals.error.title'),
        message: t(userLanguage, 'agentRequest.modals.error.submitFailed'),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SimpleLoadingScreen message="Loading agent requests..." />;
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
                  <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.headerTitle')}
                  </Text>
                  <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.headerSubtitle')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.infoTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'agentRequest.content.requestInformation.title')}
                </Text>
              </View>
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'agentRequest.content.requestInformation.text')}
              </Text>
            </View>

            {/* Request Form Card */}
            <View style={styles.formCard}>
              <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'agentRequest.content.form.title')}
              </Text>

              {/* Personal Information Section */}
              <View style={styles.formSection}>
                <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'agentRequest.content.form.personalInformation.title')}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.form.personalInformation.fullNameLabel')}
                  </Text>
                  <View style={styles.readOnlyInput}>
                    <Text style={[styles.readOnlyText, getRTLStyles(userLanguage)]}>
                      {fullName || "Loading..."}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Agent Number Generation Section */}
              <View style={styles.formSection}>
                <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'agentRequest.content.form.agentNumber.title')}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.form.agentNumber.generateLabel')}
                  </Text>
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
                          getRTLStyles(userLanguage)
                        ]}
                      >
                        {agentNumber || t(userLanguage, 'agentRequest.content.form.agentNumber.placeholder')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.generateButton,
                        isGeneratingAgentCode && styles.generateButtonDisabled,
                      ]}
                      onPress={generateUniqueAgentCode}
                      disabled={isGeneratingAgentCode}
                    >
                      {isGeneratingAgentCode ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.generateButtonText}>
                          {t(userLanguage, 'agentRequest.content.form.agentNumber.generateButton')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.agentCodeHint, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.form.agentNumber.hint')}
                  </Text>
                </View>
              </View>

              {/* Agent Search Section */}
              <View style={styles.formSection}>
                <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'agentRequest.content.form.parentAgent.title')}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.form.parentAgent.searchLabel')}
                  </Text>
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={[styles.searchInput, getRTLStyles(userLanguage)]}
                      placeholder={t(userLanguage, 'agentRequest.content.form.parentAgent.searchPlaceholder')}
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
                  <Text style={[styles.searchHint, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentRequest.content.form.parentAgent.searchHint')}
                  </Text>
                  {selectedUser && (
                    <View style={styles.selectedUserContainer}>
                      <View style={styles.selectedUserHeader}>
                        <Ionicons
                          name="person"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                        <Text style={[styles.selectedUserTitle, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, 'agentRequest.content.form.parentAgent.selectedAgent')}
                        </Text>
                      </View>
                      <Text style={[styles.selectedUserName, getRTLStyles(userLanguage)]}>
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Text>
                      <Text style={[styles.selectedUserAgentCode, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, 'agentRequest.content.form.parentAgent.parentAgentCode')} {selectedUser.agentCode}
                      </Text>
                      {hierarchicalAgentCode && (
                        <Text style={[styles.hierarchicalAgentCode, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, 'agentRequest.content.form.parentAgent.yourAgentCode')} {hierarchicalAgentCode}
                        </Text>
                      )}
                    </View>
                  )}

                  {searchQuery &&
                    searchResults.length === 0 &&
                    !isSearching && (
                      <View style={styles.noResultsContainer}>
                        <Text style={[styles.noResultsText, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, 'agentRequest.content.form.parentAgent.noResults').replace('{query}', searchQuery)}
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={submitAgentRequest}
              disabled={loading}
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
                    name="send-outline"
                    size={20}
                    color="white"
                    style={styles.submitIcon}
                  />
                )}
                <Text style={styles.submitButtonText}>
                  {loading ? t(userLanguage, 'agentRequest.content.submitButton.submitting') : t(userLanguage, 'agentRequest.content.submitButton.submit')}
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
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.2,
    paddingHorizontal: 4,
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

  // Info Card
  infoCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  infoText: {
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
    borderBottomColor: "rgba(254, 125, 72, 0.2)",
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  // Read-only input styles
  readOnlyInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
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

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
