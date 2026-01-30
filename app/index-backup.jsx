import { useNavigation, useRouter } from "expo-router";
import {
  ImageBackground,
  StyleSheet,
  Image,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ToastAndroid,
  Alert,
  BackHandler,
  useWindowDimensions,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "../configs/firebase";
import { useState, useEffect, useRef } from "react";
import { Modal } from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoadingScreen from "./../components/LoadingScreen";
import registerNNPushToken, {
  registerIndieID,
  unregisterIndieDevice,
} from "native-notify";
import * as Notifications from "expo-notifications";
import axios from "axios";
import presenceService from "../services/presenceService";

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
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: bgColor }]}
              >
                <Animated.Text
                  style={[
                    styles.iconText,
                    { color, transform: [{ scale: iconScaleAnim }] },
                  ]}
                >
                  {icon}
                </Animated.Text>
              </View>

              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalMessage}>{message}</Text>

              <View style={styles.buttonContainer}>
                {showCancelButton && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}

                {showCloseButton && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: color }]}
                    onPress={onConfirm || onClose}
                  >
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </BlurView>
        ) : (
          <View style={styles.androidModalOverlay}>
            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: bgColor }]}
              >
                <Animated.Text
                  style={[
                    styles.iconText,
                    { color, transform: [{ scale: iconScaleAnim }] },
                  ]}
                >
                  {icon}
                </Animated.Text>
              </View>

              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalMessage}>{message}</Text>

              <View style={styles.buttonContainer}>
                {showCancelButton && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}

                {showCloseButton && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: color }]}
                    onPress={onConfirm || onClose}
                  >
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
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

// Set up notification handler for Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Index() {
  // Register Native Notify push token - MUST be called at component level, not in useEffect
  // According to native-notify docs, this must be in the component body
  // Hooks must be called unconditionally, so we call it directly
  registerNNPushToken(28259, process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY);

  const router = useRouter();
  const navigation = useNavigation();
  const auth = getAuth();
  const { width, height } = useWindowDimensions();

  // Tablet detection and responsive sizing
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isSmallScreen = height < 700;

  // Responsive button sizing for different screen sizes
  const getButtonSize = () => {
    if (isLargeTablet) return Math.min(width * 0.08, 80);
    if (isTablet) return Math.min(width * 0.12, 100);
    return width * 0.2;
  };

  const buttonSize = getButtonSize();
  const imageWidth = isTablet ? Math.min(width * 0.5, 400) : width * 0.8;
  const imageHeight = imageWidth * 0.3;

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

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      headerTitle: "Login",
    });
  }, []);

  useEffect(() => {
    // Block back button on Android
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [maintenanceBypass, setMaintenanceBypass] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [loginScreenTapCount, setLoginScreenTapCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [devPassword, setDevPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDisableBypassModal, setShowDisableBypassModal] = useState(false);
  const [isPasscodeScreen, setIsPasscodeScreen] = useState(false);
  const [checkPasscode, setCheckPasscode] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [resetPasscodeModalVisible, setResetPasscodeModalVisible] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState("auth"); // "auth" or "newPasscode"
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmNewPasscode, setConfirmNewPasscode] = useState("");

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Add error handling to checkUserPasscode
  const checkUserPasscode = async () => {
    try {
      const userEmail = await AsyncStorage.getItem("userEmail");
      const userPassword = await AsyncStorage.getItem("userPassword");

      if (!userEmail || !userPassword) {
        console.log("No email or password found in AsyncStorage.");
        return;
      }

      try {
        // Re-authenticate user
        const userCredential = await signInWithEmailAndPassword(
          auth,
          userEmail,
          userPassword
        );
        const user = userCredential.user;

        if (!user) {
          console.log("Re-authentication failed.");
          return;
        }

        const uid = user.uid;

        // 🔥 Real-time listener for user document
        const userDocRef = doc(firestore, "users", uid);
        const unsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();

              // Check developer status
              setIsDeveloper(
                userData.isDeveloper === true || userData.developer === true
              );

              if (userData.passcode) {
                setCheckPasscode(userData.passcode);
                setIsPasscodeScreen(true);
              } else {
                console.log("No passcode found for this user.");
              }
            } else {
              showModal({
                title: "Error",
                message: "User not found in Firestore.",
                type: "error",
              });
            }
          },
          (error) => {
            console.error("Error in passcode listener:", error);
            showModal({
              title: "Error",
              message: "Could not check passcode. Please try again.",
              type: "error",
            });
          }
        );

        return () => unsubscribe();
      } catch (authError) {
        console.error("Authentication error:", authError);
        showModal({
          title: "Authentication Error",
          message: "Please log in again with your email and password.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error checking passcode:", error);
      showModal({
        title: "Error",
        message: "Could not check passcode. Please try again.",
        type: "error",
      });
    }
  };

  // Call function inside useEffect to run when the component mounts
  useEffect(() => {
    checkUserPasscode();
  }, []);

  // Reset passcode functionality
  const handleResetPasscode = async () => {
    if (resetStep === "auth") {
      // Authentication step
      if (!resetEmail.trim() || !resetPassword.trim()) {
        showModal({
          title: "Missing Information",
          message: "Please enter both email and password.",
          type: "warning",
        });
        return;
      }

      setResetLoading(true);
      try {
        // Authenticate user with email and password
        const userCredential = await signInWithEmailAndPassword(
          auth,
          resetEmail,
          resetPassword
        );
        const user = userCredential.user;

        if (user) {
          // Authentication successful, move to passcode update step
          setResetStep("newPasscode");
          setResetLoading(false);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        let errorMessage = "Authentication failed.";

        if (error.code === "auth/user-not-found") {
          errorMessage = "No account found with this email address.";
        } else if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Please enter a valid email address.";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage = "Too many attempts. Please try again later.";
        } else if (error.code === "auth/network-request-failed") {
          errorMessage = "Network error. Please check your connection.";
        }

        showModal({
          title: "Authentication Failed",
          message: errorMessage,
          type: "error",
        });
        setResetLoading(false);
      }
    } else if (resetStep === "newPasscode") {
      // Update passcode step
      if (!newPasscode.trim() || !confirmNewPasscode.trim()) {
        showModal({
          title: "Missing Information",
          message: "Please enter and confirm your new passcode.",
          type: "warning",
        });
        return;
      }

      if (newPasscode !== confirmNewPasscode) {
        showModal({
          title: "Passcode Mismatch",
          message: "The passcodes do not match. Please try again.",
          type: "error",
        });
        return;
      }

      if (newPasscode.length !== 4 || !/^\d{4}$/.test(newPasscode)) {
        showModal({
          title: "Invalid Passcode",
          message: "Passcode must be exactly 4 digits.",
          type: "warning",
        });
        return;
      }

      setResetLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          // Update passcode in Firestore
          await setDoc(
            doc(firestore, "users", user.uid),
            { passcode: newPasscode },
            { merge: true }
          );

          showModal({
            title: "Passcode Updated!",
            message: "Your passcode has been successfully updated.",
            type: "success",
            onConfirm: () => {
              // Reset all states and close modal
              setResetPasscodeModalVisible(false);
              setResetEmail("");
              setResetPassword("");
              setNewPasscode("");
              setConfirmNewPasscode("");
              setResetStep("auth");
              hideModal();
            },
          });
        }
      } catch (error) {
        console.error("Error updating passcode:", error);
        showModal({
          title: "Update Failed",
          message: "Failed to update passcode. Please try again.",
          type: "error",
        });
      } finally {
        setResetLoading(false);
      }
    }
  };

  useEffect(() => {
    const db = firestore; // Initialize Firestore
    const docRef = doc(db, "appConfig", "maintenance"); // Reference to the maintenance document

    // Set up a real-time listener for maintenance status
    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const { isEnabled, message } = docSnap.data();
          const wasMaintenanceEnabled = prevMaintenanceRef.current;
          
          setIsMaintenance(isEnabled);
          setMaintenanceMessage(message);
          
          // Clear bypass flag when maintenance mode is disabled
          if (!isEnabled) {
            try {
              await AsyncStorage.removeItem("maintenanceBypass");
              setMaintenanceBypass(false);
              setTapCount(0); // Reset tap count
              console.log("Bypass cleared - maintenance disabled");
            } catch (error) {
              console.error("Error clearing bypass flag:", error);
            }
          }
          
          // When maintenance is re-enabled after being disabled, ensure bypass is cleared
          if (isEnabled && !wasMaintenanceEnabled) {
            try {
              await AsyncStorage.removeItem("maintenanceBypass");
              setMaintenanceBypass(false);
              setTapCount(0); // Reset tap count
              console.log("Bypass cleared - maintenance re-enabled");
            } catch (error) {
              console.error("Error clearing bypass flag on re-enable:", error);
            }
          }
          
          // Update ref for next comparison
          prevMaintenanceRef.current = isEnabled;
        } else {
          console.log("No maintenance document found.");
          setIsMaintenance(false); // Default to no maintenance mode
          setMaintenanceMessage(""); // Clear the message
          // Clear bypass flag when maintenance document doesn't exist
          try {
            await AsyncStorage.removeItem("maintenanceBypass");
            setMaintenanceBypass(false);
          } catch (error) {
            console.error("Error clearing bypass flag:", error);
          }
        }
      },
      (error) => {
        console.error("Error listening for maintenance status changes:", error);
        // Handle permission errors gracefully - default to no maintenance mode
        if (error.code === "permission-denied") {
          console.warn(
            "Permission denied for maintenance check, defaulting to no maintenance mode"
          );
          setIsMaintenance(false);
          setMaintenanceMessage("");
        }
      }
    );

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Use ref to track previous maintenance state
  const prevMaintenanceRef = useRef(false);
  const tapTimeoutRef = useRef(null);

  // Check for maintenance bypass flag on mount
  useEffect(() => {
    const checkBypassFlag = async () => {
      try {
        const bypassFlag = await AsyncStorage.getItem("maintenanceBypass");
        if (bypassFlag === "true") {
          setMaintenanceBypass(true);
        } else {
          setMaintenanceBypass(false);
        }
      } catch (error) {
        console.error("Error checking bypass flag:", error);
      }
    };
    checkBypassFlag();
  }, []);

  // Debug: Log when showPasswordModal changes
  useEffect(() => {
    console.log("showPasswordModal state changed to:", showPasswordModal);
  }, [showPasswordModal]);

  // Listen for developer status changes when user is authenticated
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsDeveloper(false);
      return;
    }

    const userDocRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setIsDeveloper(
            userData.isDeveloper === true || userData.developer === true
          );
        } else {
          setIsDeveloper(false);
        }
      },
      (error) => {
        console.error("Error listening for developer status:", error);
        setIsDeveloper(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle tap on maintenance screen
  const handleMaintenanceTap = () => {
    // Don't handle taps when password modal is visible
    if (showPasswordModal) return;
    
    // Only allow taps when maintenance is enabled and bypass is not active
    if (!isMaintenance || maintenanceBypass) {
      console.log("Tap ignored - maintenance:", isMaintenance, "bypass:", maintenanceBypass);
      return;
    }
    
    const newCount = tapCount + 1;
    setTapCount(newCount);
    console.log("Maintenance screen tap count:", newCount);
    
    // Reset counter after 3 seconds of no taps (for better UX)
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
      console.log("Tap count reset");
    }, 3000);
    
    if (newCount >= 10) {
      console.log("10 taps reached, showing password modal");
      setTapCount(0); // Reset counter
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      // Use setTimeout to ensure state update happens after current render cycle
      // This helps with iOS modal rendering
      setTimeout(() => {
        console.log("Setting showPasswordModal to true, current state:", showPasswordModal);
        setShowPasswordModal(true);
        console.log("showPasswordModal should now be true");
      }, 100);
    }
  };

  // Function to disable bypass
  const disableBypass = async () => {
    try {
      await AsyncStorage.removeItem("maintenanceBypass");
      setMaintenanceBypass(false);
      setShowDisableBypassModal(false);
      showModal({
        title: "Success",
        message: "Maintenance bypass disabled. Maintenance mode will be shown.",
        type: "success",
      });
    } catch (error) {
      console.error("Error disabling bypass:", error);
      showModal({
        title: "Error",
        message: "Failed to disable bypass. Please try again.",
        type: "error",
      });
    }
  };

  // Handle tap on login screen to disable bypass
  const handleLoginScreenTap = () => {
    // Only work when bypass is active
    if (!maintenanceBypass) return;
    
    // Don't handle taps when modals are visible
    if (showPasswordModal || showDisableBypassModal) return;
    
    const newCount = loginScreenTapCount + 1;
    setLoginScreenTapCount(newCount);
    
    if (newCount >= 10) {
      setLoginScreenTapCount(0); // Reset counter
      // Disable bypass immediately
      disableBypass();
    }
  };

  // Function to show disable bypass modal (can be called from anywhere)
  const showDisableBypassOption = () => {
    if (maintenanceBypass) {
      setShowDisableBypassModal(true);
    }
  };

  // Expose function globally for easy access (for testing/debugging)
  useEffect(() => {
    if (typeof global !== 'undefined') {
      global.disableMaintenanceBypass = disableBypass;
      global.showDisableBypassOption = showDisableBypassOption;
    }
  }, [maintenanceBypass]);

  // Fetch password from Firebase and verify
  const handlePasswordSubmit = async () => {
    if (!devPassword.trim()) {
      showModal({
        title: "Error",
        message: "Please enter a password",
        type: "error",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const passwordRef = doc(firestore, "appConfig", "password");
      const passwordSnap = await getDoc(passwordRef);
      
      if (passwordSnap.exists()) {
        const passwordData = passwordSnap.data();
        const correctPassword = passwordData.password;
        
        if (devPassword === correctPassword) {
          // Password matches - set bypass flag
          await AsyncStorage.setItem("maintenanceBypass", "true");
          setMaintenanceBypass(true);
          setShowPasswordModal(false);
          setDevPassword("");
          showModal({
            title: "Success",
            message: "Development mode activated",
            type: "success",
          });
        } else {
          showModal({
            title: "Error",
            message: "Incorrect password",
            type: "error",
          });
          setDevPassword("");
        }
      } else {
        showModal({
          title: "Error",
          message: "Password configuration not found",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      showModal({
        title: "Error",
        message: "Failed to verify password. Please try again.",
        type: "error",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (isMaintenance && !isDeveloper && !maintenanceBypass) {
    return (
      <>
      <Modal transparent={true} animationType="fade" visible={!showPasswordModal}>
        <TouchableWithoutFeedback 
          onPress={handleMaintenanceTap}
          disabled={showPasswordModal}
        >
          <ImageBackground
            source={require("../assets/images/bg2.png")}
            style={style.container}
          >
            {Platform.OS === "ios" ? (
              <>
                <BlurView
                  intensity={80}
                  tint="dark"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                <TouchableWithoutFeedback onPress={handleMaintenanceTap}>
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "white",
                        padding: 20,
                        borderRadius: 15,
                        alignItems: "center",
                        width: "80%",
                      }}
                    >
                      <Text
                        style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}
                      >
                        Maintenance Mode
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          textAlign: "center",
                          marginBottom: 20,
                        }}
                      >
                        {maintenanceMessage}
                      </Text>
                      <TouchableOpacity
                        style={style.dismissButton}
                        onPress={() => {
                          if (Platform.OS === "android") {
                            BackHandler.exitApp();
                          } else if (Platform.OS === "ios") {
                            showModal({
                              title: "Exit App",
                              message: "Please close the app manually.",
                              type: "info",
                            });
                          }
                        }}
                      >
                        <Text style={style.dismissButtonText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </>
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                }}
              >
                <TouchableWithoutFeedback onPress={handleMaintenanceTap}>
                  <View
                    style={{
                      backgroundColor: "white",
                      padding: 20,
                      borderRadius: 15,
                      alignItems: "center",
                      width: "80%",
                    }}
                  >
                    <Text
                      style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}
                    >
                      Maintenance Mode
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        textAlign: "center",
                        marginBottom: 20,
                      }}
                    >
                      {maintenanceMessage}
                    </Text>
                    <TouchableOpacity
                      style={style.dismissButton}
                      onPress={() => {
                        if (Platform.OS === "android") {
                          BackHandler.exitApp();
                        } else if (Platform.OS === "ios") {
                          showModal({
                            title: "Exit App",
                            message: "Please close the app manually.",
                            type: "info",
                          });
                        }
                      }}
                    >
                      <Text style={style.dismissButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            )}
          </ImageBackground>
        </TouchableWithoutFeedback>

      </Modal>

      {/* Password Modal - Separate Modal for proper z-index */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={showPasswordModal}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setDevPassword("");
          setTapCount(0);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Backdrop - handles tap to dismiss */}
          <TouchableWithoutFeedback 
            onPress={() => {
              setShowPasswordModal(false);
              setDevPassword("");
              setTapCount(0);
            }}
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          
          {/* Modal Content - positioned above backdrop */}
          <View
            style={{
              backgroundColor: "white",
              padding: 24,
              borderRadius: 15,
              width: "85%",
              maxWidth: 400,
            }}
          >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Development Mode
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Enter password to bypass maintenance mode
              </Text>

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 20,
                  backgroundColor: "#f9f9f9",
                }}
                placeholder="Enter password"
                value={devPassword}
                onChangeText={setDevPassword}
                secureTextEntry={true}
                autoFocus={true}
                editable={!passwordLoading}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#e0e0e0",
                    padding: 14,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setDevPassword("");
                    setTapCount(0);
                  }}
                  disabled={passwordLoading}
                >
                  <Text
                    style={{
                      color: "#333",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: Colors.redTheme.background,
                    padding: 14,
                    borderRadius: 8,
                    alignItems: "center",
                    opacity: passwordLoading ? 0.6 : 1,
                  }}
                  onPress={handlePasswordSubmit}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      Submit
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Disable Bypass Button - Only show if bypass is active */}
              {maintenanceBypass && (
                <TouchableOpacity
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: "#ff4444",
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setShowDisableBypassModal(true);
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Disable Bypass
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
      </Modal>

      {/* Disable Bypass Confirmation Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={showDisableBypassModal}
        onRequestClose={() => setShowDisableBypassModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableWithoutFeedback 
            onPress={() => setShowDisableBypassModal(false)}
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          
          <View
            style={{
              backgroundColor: "white",
              padding: 24,
              borderRadius: 15,
              width: "85%",
              maxWidth: 400,
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Disable Bypass?
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              This will disable the maintenance bypass. You will see the maintenance screen again if maintenance mode is enabled.
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#e0e0e0",
                  padding: 14,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                onPress={() => setShowDisableBypassModal(false)}
              >
                <Text
                  style={{
                    color: "#333",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#ff4444",
                  padding: 14,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                onPress={disableBypass}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Disable
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </>
    );
  }

  const handlePress = async (value) => {
    if (value === "Del") {
      setPasscode(passcode.slice(0, -1));
    } else if (value === "✓") {
      if (passcode.length === 4) {
        if (passcode === checkPasscode) {
          // Initialize presence monitoring for passcode login
          try {
            const user = auth.currentUser;
            if (user) {
              await presenceService.initializePresence(user.uid, {
                email: user.email,
                displayName: user.displayName || user.email,
                userType: "user",
              });

              // Unregister first to prevent duplicate notifications on passcode login
              try {
                // Request notification permissions first (required for Android 13+)
                const { status: existingStatus } =
                  await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== "granted") {
                  const { status } =
                    await Notifications.requestPermissionsAsync();
                  finalStatus = status;
                }

                if (finalStatus !== "granted") {
                  console.warn(
                    "Notification permissions not granted for passcode login"
                  );
                  return;
                }

                // Get push token (Native Notify will use this automatically)
                const tokenData = await Notifications.getExpoPushTokenAsync({
                  projectId: "81d5c41e-b862-48d6-a14d-21246b09c564",
                });
                console.log(
                  "Got Expo push token for passcode login:",
                  tokenData.data
                );

                // Note: registerNNPushToken is already called at component level
                // No need to call it again here as it's a hook that runs once

                await unregisterIndieDevice(user.uid);
                console.log(
                  "Unregistered user device for passcode login to prevent duplicates"
                );

                // Register for notifications on passcode login
                await registerIndieID(
                  user.uid,
                  28259,
                  process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY
                );
                console.log("Registered user device for passcode login");

                // Send passcode login notification to register user ID as subID
                await axios.post(
                  "https://app.nativenotify.com/api/indie/notification",
                  {
                    subID: `${user.uid}`,
                    appId: 28259,
                    appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
                    title: "Session Unlocked",
                    message: "You have successfully unlocked your session.",
                  }
                );
                console.log(
                  "Sent passcode login notification with subID:",
                  user.uid
                );
              } catch (notificationError) {
                console.error(
                  "Error registering notifications for passcode login:",
                  notificationError
                );
                // Continue execution even if notification registration fails
              }
            }
          } catch (error) {
            console.error(
              "Error initializing presence monitoring for passcode login:",
              error
            );
            // Continue execution even if presence monitoring fails
          }

          showModal({
            title: "Access Granted!",
            message: "Welcome back!",
            type: "success",
            onConfirm: () => {
              hideModal();
              router.replace("/main");
            },
          });
        } else {
          setError("Incorrect Passcode");
          showModal({
            title: "Incorrect Passcode",
            message: "Please try again.",
            type: "error",
          });
        }
      } else {
        setError("Passcode must be 4 digits");
        showModal({
          title: "Invalid Passcode",
          message: "Please enter 4 digits.",
          type: "warning",
        });
      }
      setPasscode("");
    } else {
      if (passcode.length < 4) {
        setPasscode(passcode + value);
        setError("");
      }
    }
  };

  if (isPasscodeScreen) {
    // Responsive font sizes and spacing
    const getTitleFontSize = () => {
      if (isLargeTablet) return 32;
      if (isTablet) return 28;
      return width * 0.06;
    };

    const getPasscodeFontSize = () => {
      if (isLargeTablet) return 40;
      if (isTablet) return 36;
      return width * 0.08;
    };

    const getButtonTextSize = () => {
      if (isLargeTablet) return 24;
      if (isTablet) return 20;
      return buttonSize * 0.4;
    };

    const getContainerWidth = () => {
      if (isLargeTablet) return "40%";
      if (isTablet) return "60%";
      return "80%";
    };

    const getButtonFontSize = () => {
      if (isLargeTablet) return 18;
      if (isTablet) return 16;
      return width * 0.04;
    };

    return (
      <>
        <View
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f8f9fa",
            paddingHorizontal: isTablet ? 40 : 20,
          }}
        >
          <View
            style={{
              width: "100%",
              height: isTablet ? 150 : 200,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: isTablet ? 20 : 0,
            }}
          >
            <Image
              source={require("../assets/images/title.png")}
              style={{
                width: imageWidth,
                height: imageHeight,
                resizeMode: "contain",
              }}
              onError={(error) =>
                console.error("Error loading passcode screen image:", error)
              }
            />
          </View>

          <Text
            style={{
              fontSize: getTitleFontSize(),
              fontWeight: "bold",
              marginBottom: isTablet ? 20 : 15,
              color: "#333",
            }}
          >
            Enter Passcode
          </Text>
          <Text
            style={{
              fontSize: getPasscodeFontSize(),
              marginBottom: isTablet ? 30 : 20,
              fontWeight: "bold",
              color: "#222",
              letterSpacing: isTablet ? 8 : 4,
            }}
          >
            {passcode.replace(/./g, "●")}
          </Text>

          <View
            style={{
              width: getContainerWidth(),
              maxWidth: isTablet ? 400 : "none",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Del", "0", "✓"].map(
              (key, index) => (
                <TouchableOpacity
                  key={key}
                  style={{
                    width: "30%", // Ensures 3 columns
                    aspectRatio: 1, // Makes the buttons square
                    justifyContent: "center",
                    alignItems: "center",
                    marginVertical: isTablet ? 8 : 5,
                    backgroundColor: Colors.redTheme.background,
                    borderRadius: isTablet ? 20 : 15,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 5,
                  }}
                  onPress={() => handlePress(key)}
                >
                  <Text
                    style={{
                      fontSize: getButtonTextSize(),
                      fontWeight: "bold",
                      color: "#fff",
                    }}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              )
            )}
            {/* "Use Email and Password" Button */}
            <TouchableOpacity
              style={{
                marginTop: isTablet ? 30 : 20,
                width: "100%",
                paddingVertical: isTablet ? 15 : 10,
                paddingHorizontal: 20,
                backgroundColor: Colors.redTheme.background,
                borderRadius: isTablet ? 15 : 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => {
                setIsPasscodeScreen(false);
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: getButtonFontSize(),
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Use Email and Password
              </Text>
            </TouchableOpacity>

            {/* "Reset Passcode" Button */}
            <TouchableOpacity
              style={{
                marginTop: isTablet ? 20 : 15,
                width: "100%",
                paddingVertical: isTablet ? 16 : 12,
                paddingHorizontal: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: Colors.redTheme.background,
                borderWidth: 2,
                borderRadius: isTablet ? 18 : 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 5,
                justifyContent: "center",
                alignItems: "center",
                minHeight: isTablet ? 56 : 48,
              }}
              onPress={() => {
                setResetPasscodeModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: Colors.redTheme.background,
                  fontSize: getButtonFontSize(),
                  fontWeight: "700",
                  textAlign: "center",
                  letterSpacing: 0.5,
                  textShadowColor: "rgba(254, 125, 72, 0.1)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                Reset Passcode
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <Text
              style={{
                color: "red",
                marginTop: isTablet ? 15 : 10,
                fontSize: getButtonFontSize(),
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          ) : null}
        </View>

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

        {/* Reset Passcode Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={resetPasscodeModalVisible}
          onRequestClose={() => {
            setResetPasscodeModalVisible(false);
            setResetStep("auth");
            setResetEmail("");
            setResetPassword("");
            setNewPasscode("");
            setConfirmNewPasscode("");
          }}
        >
          <View style={styles.resetModalOverlay}>
            <View style={styles.resetModalContainer}>
              <Text style={styles.resetModalTitle}>
                {resetStep === "auth" ? "Reset Passcode" : "Set New Passcode"}
              </Text>
              <Text style={styles.resetModalMessage}>
                {resetStep === "auth"
                  ? "Enter your email and password to verify your identity."
                  : "Enter your new 4-digit passcode and confirm it."}
              </Text>

              {resetStep === "auth" ? (
                <>
                  <TextInput
                    style={styles.resetEmailInput}
                    placeholder="Email Address"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                  />

                  <TextInput
                    style={styles.resetEmailInput}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={resetPassword}
                    onChangeText={setResetPassword}
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.resetEmailInput}
                    placeholder="New Passcode (4 digits)"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={4}
                    value={newPasscode}
                    onChangeText={setNewPasscode}
                  />

                  <TextInput
                    style={styles.resetEmailInput}
                    placeholder="Confirm Passcode"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={4}
                    value={confirmNewPasscode}
                    onChangeText={setConfirmNewPasscode}
                  />
                </>
              )}

              <View style={styles.resetButtonContainer}>
                <TouchableOpacity
                  style={[styles.resetModalButton, styles.cancelResetButton]}
                  onPress={() => {
                    setResetPasscodeModalVisible(false);
                    setResetStep("auth");
                    setResetEmail("");
                    setResetPassword("");
                    setNewPasscode("");
                    setConfirmNewPasscode("");
                  }}
                >
                  <Text style={styles.cancelResetButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetModalButton, styles.sendResetButton]}
                  onPress={handleResetPasscode}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendResetButtonText}>
                      {resetStep === "auth" ? "Verify" : "Update Passcode"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  const SignIn = async () => {
    try {
      setLoadingScreen(true);
      const userCredentials = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredentials.user;

      if (!user) {
        throw new Error("No user data after sign in");
      }

      // Check developer status from Firestore
      try {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsDeveloper(
            userData.isDeveloper === true || userData.developer === true
          );
        }
      } catch (error) {
        console.error("Error checking developer status:", error);
        // Default to false if check fails
        setIsDeveloper(false);
      }

      try {
        // Get the old user ID from AsyncStorage
        const oldUserId = await AsyncStorage.getItem("userid");

        // If there was a previous user and it's different from current user, unregister their device
        if (oldUserId && oldUserId !== user.uid) {
          try {
            await unregisterIndieDevice(oldUserId);
            console.log(
              "Unregistered old user device from native-notify:",
              oldUserId
            );
          } catch (error) {
            console.error("Error unregistering old user device:", error);
            // Continue execution even if unregister fails
          }
        }

        // If same user is logging in again, unregister first to prevent duplicates
        if (oldUserId === user.uid) {
          try {
            await unregisterIndieDevice(user.uid);
            console.log(
              "Unregistered current user device to prevent duplicates:",
              user.uid
            );
          } catch (error) {
            console.error("Error unregistering current user device:", error);
            // Continue execution even if unregister fails
          }
        }

        // Clear AsyncStorage and set new user data
        await AsyncStorage.clear();
        await AsyncStorage.setItem("userEmail", email);
        await AsyncStorage.setItem("userPassword", password);
        await AsyncStorage.setItem("userid", user.uid);

        // Clear any existing event popup state for this user
        try {
          const keys = await AsyncStorage.getAllKeys();
          const userPopupKeys = keys.filter((key) =>
            key.startsWith(`eventPopupShown_${user.uid}`)
          );
          if (userPopupKeys.length > 0) {
            await AsyncStorage.multiRemove(userPopupKeys);
          }
        } catch (error) {
          console.error("Error clearing popup keys:", error);
          // Continue execution even if popup clear fails
        }

        // Register the new user's device
        try {
          // Request notification permissions first (required for Android 13+)
          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== "granted") {
            console.warn(
              "Notification permissions not granted, skipping device registration"
            );
          } else {
            // Get push token (Native Notify will use this automatically)
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: "81d5c41e-b862-48d6-a14d-21246b09c564",
            });
            console.log("Got Expo push token:", tokenData.data);

            // Note: registerNNPushToken is already called at component level
            // No need to call it again here as it's a hook that runs once

            await registerIndieID(
              user.uid,
              28259,
              process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY
            );
            console.log("Registered new user device to native-notify");

            // Send login notification to register user ID as subID
            await axios.post(
              "https://app.nativenotify.com/api/indie/notification",
              {
                subID: `${user.uid}`,
                appId: 28259,
                appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
                title: "Welcome Back",
                message: "You have successfully logged into Inspire Wallet.",
              }
            );
            console.log("Sent login notification with subID:", user.uid);
          }
        } catch (error) {
          console.error("Error registering new user device:", error);
          // Continue execution even if registration fails
        }

        // Initialize presence monitoring
        try {
          await presenceService.initializePresence(user.uid, {
            email: user.email,
            displayName: user.displayName || user.email,
            userType: "user",
          });
        } catch (error) {
          console.error("Error initializing presence monitoring:", error);
          // Continue execution even if presence monitoring fails
        }

        // Check if user has passcode
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const hasPasscode = userDocSnap.exists() && userDocSnap.data().passcode;

        setTimeout(() => {
          setLoadingScreen(false);
          if (hasPasscode) {
            // User has passcode - redirect to passcode-login
            router.replace("/passcode-login");
          } else {
            // No passcode - go directly to dashboard
            showModal({
              title: "Login Successful!",
              message: "Welcome back!",
              type: "success",
              onConfirm: () => {
                hideModal();
                router.replace("/main");
              },
            });
          }
        }, 2000);
      } catch (storageError) {
        console.error("Error handling AsyncStorage operations:", storageError);
        // Show a warning but still allow login
        showModal({
          title: "Warning",
          message:
            "Logged in successfully, but some settings couldn't be saved. You may need to log in again next time.",
          type: "warning",
          onConfirm: () => {
            hideModal();
            router.replace("/main");
          },
        });
      }
    } catch (error) {
      setLoadingScreen(false);
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorMessage);

      if (errorCode === "auth/invalid-credential") {
        showModal({
          title: "Invalid Credentials",
          message: "Please check your email and password.",
          type: "error",
        });
      } else if (
        errorCode === "auth/missing-password" ||
        errorCode === "auth/missing-email" ||
        errorCode === "auth/invalid-email"
      ) {
        showModal({
          title: "Missing Information",
          message: "Please enter email and password.",
          type: "warning",
        });
      } else if (errorCode === "auth/too-many-requests") {
        showModal({
          title: "Too Many Attempts",
          message: "Please try again later or use 'Forgot Password'.",
          type: "warning",
        });
      } else if (errorCode === "auth/network-request-failed") {
        showModal({
          title: "Connection Error",
          message: "Please check your internet connection.",
          type: "error",
        });
      } else {
        showModal({
          title: "Login Error",
          message: "An unexpected error occurred. Please try again later.",
          type: "error",
        });
      }
    }
  };

  if (loadingScreen) {
    return <LoadingScreen type="login" />;
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback 
          onPress={(e) => {
            // Handle keyboard dismiss
            Keyboard.dismiss();
            // Handle tap for disabling bypass
            handleLoginScreenTap();
          }} 
          accessible={false}
        >
          <ImageBackground
            source={require("../assets/images/bg2.png")}
            style={[
              style.container,
              { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            ]}
            resizeMode="cover"
            onError={(error) =>
              console.error("Error loading background image:", error)
            }
          >
            <SafeAreaView style={style.androidSafeArea} />

            <ScrollView
              contentContainerStyle={[
                style.scrollContainer,
                isSmallScreen && { paddingVertical: 5 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  style.logoContainer,
                  isSmallScreen && { flex: 0.6, minHeight: 60 },
                ]}
              >
                <Image
                  source={require("../assets/images/title.png")}
                  style={[
                    style.logoImage,
                    isSmallScreen && { width: 240, height: 70 },
                  ]}
                  onError={(error) =>
                    console.error("Error loading logo image:", error)
                  }
                />
              </View>

              <Text
                style={[
                  style.welcomeText,
                  isSmallScreen && { fontSize: 20, marginBottom: 10 },
                ]}
              >
                WELCOME INVESTOR
              </Text>

              <View
                style={[style.loginContainer, isSmallScreen && { flex: 1.2 }]}
              >
                <View
                  style={[
                    style.loginForm,
                    isSmallScreen && { padding: 20, maxWidth: 320 },
                  ]}
                >
                  <View style={style.inputContainer}>
                    <TextInput
                      style={style.textInput}
                      placeholder="Email Address"
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={(value) => setEmail(value)}
                    />
                  </View>

                  <View style={style.inputContainer}>
                    <View style={style.passwordContainer}>
                      <TextInput
                        style={style.passwordInput}
                        placeholder="Password"
                        placeholderTextColor="#666"
                        keyboardType="default"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={password}
                        onChangeText={(value) => setPassword(value)}
                      />
                      <TouchableOpacity
                        style={style.eyeButton}
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

                  <TouchableOpacity
                    style={style.loginButton}
                    onPress={SignIn}
                    activeOpacity={0.8}
                  >
                    <Text style={style.loginButtonText}>LOGIN</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={style.registerButton}
                    onPress={() => {
                      router.push("/register");
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={style.registerButtonText}>REGISTER</Text>
                  </TouchableOpacity>

                  <View style={style.linkContainer}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsPasscodeScreen(true);
                      }}
                      style={style.linkButton}
                    >
                      <Text style={style.linkText}>Enter Passcode Instead</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push("/forgotpassword")}
                      style={style.linkButton}
                    >
                      <Text style={style.linkText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={style.ownerContainer}>
                <Text style={style.ownerText}>CREATED BY INSPIRE</Text>
              </View>
            </ScrollView>

            <SafeAreaView style={style.androidSafeArea} />
          </ImageBackground>
        </TouchableWithoutFeedback>
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
    </>
  );
}

// Professional Modal Styles
const styles = StyleSheet.create({
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
  // Reset Passcode Modal Styles
  resetModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 20,
  },
  resetModalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  resetModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  resetModalMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  resetEmailInput: {
    borderColor: "rgba(254, 125, 72, 0.3)",
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
  },
  resetButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  resetModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 48,
  },
  cancelResetButton: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
    borderWidth: 1,
  },
  sendResetButton: {
    backgroundColor: Colors.redTheme.background,
  },
  cancelResetButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  sendResetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

const style = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  logoContainer: {
    flex: 0.8,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 80,
  },
  logoImage: {
    width: 280,
    height: 80,
    resizeMode: "contain",
  },
  welcomeText: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "black",
    marginBottom: 15,
    textShadowColor: "rgba(254, 125, 72, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loginContainer: {
    flex: 1.5,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loginForm: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: "rgba(254, 125, 72, 0.1)",
  },
  inputContainer: {
    marginBottom: 16,
    width: "100%",
  },
  textInput: {
    borderColor: "rgba(254, 125, 72, 0.2)",
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 15,
    width: "100%",
    fontSize: 16,
    color: "#333",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(254, 125, 72, 0.2)",
    borderWidth: 2,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  loginButton: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: Colors.redTheme.text,
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  registerButton: {
    width: "100%",
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(254, 125, 72, 0.3)",
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  registerButtonText: {
    color: "#fe7d48",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  linkContainer: {
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  linkButton: {
    paddingVertical: 5,
  },
  linkText: {
    color: "#fe7d48",
    textDecorationLine: "underline",
    fontSize: 16,
    fontWeight: "600",
  },
  ownerContainer: {
    flex: 0.5,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  ownerText: {
    fontStyle: "italic",
    color: "#666",
    fontSize: 14,
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 25 : 0,
    opacity: 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
  },
  dismissButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  dismissButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
