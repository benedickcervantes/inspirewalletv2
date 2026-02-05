import { useRouter } from "expo-router";
import {
  StyleSheet,
  Image,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  BackHandler,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "../configs/firebase";
import { useState, useEffect, useRef } from "react";
import { Colors } from "../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import registerNNPushToken, {
  registerIndieID,
  unregisterIndieDevice,
} from "native-notify";
import * as Notifications from "expo-notifications";
import axios from "axios";
import presenceService from "../services/presenceService";
import ProfessionalModal from "../components/ProfessionalModal";

// Set up notification handler for Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PasscodeLogin() {
  // Register Native Notify push token
  registerNNPushToken(28259, process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY);

  const router = useRouter();
  const auth = getAuth();
  const { width, height } = useWindowDimensions();

  // Tablet detection and responsive sizing
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

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

  const [checkPasscode, setCheckPasscode] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [resetPasscodeModalVisible, setResetPasscodeModalVisible] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState("auth"); // "auth" or "newPasscode"
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmNewPasscode, setConfirmNewPasscode] = useState("");
  
  // Shake animation for incorrect passcode
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Block back button on Android
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Check for passcode on mount
  useEffect(() => {
    const checkPasscode = async () => {
      try {
        const userEmail = await AsyncStorage.getItem("userEmail");
        const userPassword = await AsyncStorage.getItem("userPassword");

        if (!userEmail || !userPassword) {
          // No stored credentials - redirect to login
          router.replace("/login");
          return;
        }

        try {
          // Re-authenticate user
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          const userCredential = await signInWithEmailAndPassword(
            auth,
            userEmail,
            userPassword
          );
          const user = userCredential.user;

          if (user) {
            // Get passcode and user data from Firestore
            try {
              const userDocRef = doc(firestore, "users", user.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.passcode) {
                  setCheckPasscode(userData.passcode);
                  // Set username - use firstName, fullName, or email
                  const displayName = userData.firstName || userData.fullName || user.email?.split('@')[0] || "User";
                  setUserName(displayName);
                } else {
                  // No passcode - redirect to login
                  router.replace("/login");
                }
              } else {
                router.replace("/login");
              }
            } catch (firestoreError) {
              // Handle Firestore permission errors gracefully
              console.error("Error accessing Firestore for passcode:", firestoreError);
              // If we can't access Firestore, redirect to login
              router.replace("/login");
            }
          }
        } catch (authError) {
          console.error("Authentication error:", authError);
          // Clear stored credentials and redirect to login
          try {
            await AsyncStorage.removeItem("userEmail");
            await AsyncStorage.removeItem("userPassword");
          } catch (clearError) {
            console.error("Error clearing credentials:", clearError);
          }
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error checking passcode:", error);
        router.replace("/login");
      }
    };

    checkPasscode();
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
        const { signInWithEmailAndPassword } = await import("firebase/auth");
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

          // Update local state
          setCheckPasscode(newPasscode);

          // Close reset passcode modal first
          setResetPasscodeModalVisible(false);
          setResetEmail("");
          setResetPassword("");
          setNewPasscode("");
          setConfirmNewPasscode("");
          setResetStep("auth");

          // Show success modal
          showModal({
            title: "Passcode Updated!",
            message: "Your passcode has been successfully updated.",
            type: "success",
            onConfirm: () => {
              hideModal();
            },
          });
        }
      } catch (error) {
        console.error("Error updating passcode:", error);
        // Close reset passcode modal first so error modal is visible
        setResetPasscodeModalVisible(false);
        // Show error modal
        showModal({
          title: "Update Failed",
          message: "Failed to update passcode. Please try again.",
          type: "error",
          onConfirm: () => {
            hideModal();
          },
        });
      } finally {
        setResetLoading(false);
      }
    }
  };

  const handlePress = async (value) => {
    if (value === "Del") {
      setPasscode(passcode.slice(0, -1));
      setError("");
    } else {
      if (passcode.length < 4) {
        const newPasscode = passcode + value;
        setPasscode(newPasscode);
        setError("");
        
        // Auto-verify when 4 digits are entered
        if (newPasscode.length === 4) {
          if (newPasscode === checkPasscode) {
            // Set a flag to indicate passcode login is complete
            AsyncStorage.setItem("passcodeLoginComplete", "true").catch(err => console.error("Error setting passcode flag:", err));
            
            // Navigate immediately
            router.replace("/main");
            
            // Initialize presence monitoring and notifications in background (non-blocking)
            const user = auth.currentUser;
            if (user) {
              // Run these operations in the background without blocking navigation
              Promise.all([
                presenceService.initializePresence(user.uid, {
                  email: user.email,
                  displayName: user.displayName || user.email,
                  userType: "user",
                }).catch(error => console.error("Error initializing presence:", error)),
                
                (async () => {
                  try {
                    const { status: existingStatus } = await Notifications.getPermissionsAsync();
                    let finalStatus = existingStatus;
                    if (existingStatus !== "granted") {
                      const { status } = await Notifications.requestPermissionsAsync();
                      finalStatus = status;
                    }

                    if (finalStatus === "granted") {
                      const tokenData = await Notifications.getExpoPushTokenAsync({
                        projectId: "81d5c41e-b862-48d6-a14d-21246b09c564",
                      });
                      console.log("Got Expo push token for passcode login:", tokenData.data);

                      await unregisterIndieDevice(user.uid);
                      console.log("Unregistered user device for passcode login");

                      await registerIndieID(user.uid, 28259, process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY);
                      console.log("Registered user device for passcode login");

                      await axios.post("https://app.nativenotify.com/api/indie/notification", {
                        subID: `${user.uid}`,
                        appId: 28259,
                        appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
                        title: "Session Unlocked",
                        message: "You have successfully unlocked your session.",
                      });
                      console.log("Sent passcode login notification");
                    }
                  } catch (error) {
                    console.error("Error with notifications:", error);
                  }
                })()
              ]).catch(error => console.error("Background operations error:", error));
            }
          } else {
            setError("Incorrect. Please try again");
            setPasscode("");
            triggerShake(); // Trigger shake animation
            // Removed modal notification - error is now shown above PIN circles
          }
        }
      }
    }
  };

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
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      <LinearGradient
        colors={["#E15816", "#F48F38"]}
        locations={[0, 1]}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "flex-start",
          alignItems: "center",
          paddingHorizontal: isTablet ? 40 : 20,
          paddingTop: isTablet ? 80 : 60,
        }}
      >
        {/* Logo */}
        <View
          style={{
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: isTablet ? 80 : 60,
          }}
        >
          <Image
            source={require("../assets/images/applogo2.png")}
            style={{
              width: isTablet ? 320 : 260,
              height: isTablet ? 110 : 90,
              resizeMode: "contain",
            }}
            onError={(error) =>
              console.error("Error loading logo image:", error)
            }
          />
        </View>

        {/* Error message - displayed above PIN dots */}
        {error ? (
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: isTablet ? 18 : 16,
              textAlign: "center",
              fontWeight: "600",
              marginBottom: 20,
            }}
          >
            {error}
          </Text>
        ) : null}

        {/* PIN Dots */}
        <Animated.View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
            gap: 20,
            transform: [{ translateX: shakeAnimation }],
          }}
        >
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={{
                width: isTablet ? 20 : 18,
                height: isTablet ? 20 : 18,
                borderRadius: isTablet ? 10 : 9,
                backgroundColor: passcode.length > index ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
                borderWidth: 2,
                borderColor: "#FFFFFF",
              }}
            />
          ))}
        </Animated.View>

        {/* Enter your passcode text */}
        <Text
          style={{
            fontSize: isTablet ? 18 : 16,
            fontWeight: "400",
            marginBottom: isTablet ? 60 : 50,
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          Enter your passcode
        </Text>

        {/* Number Pad */}
        <View
          style={{
            width: getContainerWidth(),
            maxWidth: isTablet ? 380 : 300,
          }}
        >
          {/* Rows 1-3 */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: isTablet ? 18 : 15,
            }}
          >
            {["1", "2", "3"].map((key) => (
              <TouchableOpacity
                key={key}
                style={{
                  width: isTablet ? 85 : 70,
                  height: isTablet ? 85 : 70,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                  borderRadius: isTablet ? 42.5 : 35,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={() => handlePress(key)}
              >
                <Text
                  style={{
                    fontSize: isTablet ? 30 : 26,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: isTablet ? 18 : 15,
            }}
          >
            {["4", "5", "6"].map((key) => (
              <TouchableOpacity
                key={key}
                style={{
                  width: isTablet ? 85 : 70,
                  height: isTablet ? 85 : 70,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                  borderRadius: isTablet ? 42.5 : 35,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={() => handlePress(key)}
              >
                <Text
                  style={{
                    fontSize: isTablet ? 30 : 26,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: isTablet ? 18 : 15,
            }}
          >
            {["7", "8", "9"].map((key) => (
              <TouchableOpacity
                key={key}
                style={{
                  width: isTablet ? 85 : 70,
                  height: isTablet ? 85 : 70,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                  borderRadius: isTablet ? 42.5 : 35,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={() => handlePress(key)}
              >
                <Text
                  style={{
                    fontSize: isTablet ? 30 : 26,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom row with 0 centered and backspace */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: isTablet ? 20 : 15,
              position: "relative",
            }}
          >
            <TouchableOpacity
              style={{
                width: isTablet ? 85 : 70,
                height: isTablet ? 85 : 70,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                borderRadius: isTablet ? 42.5 : 35,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => handlePress("0")}
            >
              <Text
                style={{
                  fontSize: isTablet ? 30 : 26,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                0
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: isTablet ? 85 : 70,
                height: isTablet ? 85 : 70,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "transparent",
                borderRadius: isTablet ? 42.5 : 35,
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.5)",
                position: "absolute",
                right: 0,
              }}
              onPress={() => handlePress("Del")}
            >
              <Text
                style={{
                  fontSize: isTablet ? 22 : 18,
                  fontWeight: "400",
                  color: "#FFFFFF",
                }}
              >
                ⌫
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom buttons row - Reset Passcode (left) and Use Email (right) */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "90%",
            maxWidth: 400,
            paddingHorizontal: 20,
            position: "absolute",
            bottom: isTablet ? 50 : 40,
          }}
        >
          {/* Reset Passcode - Left */}
          <TouchableOpacity
            onPress={() => {
              setResetPasscodeModalVisible(true);
            }}
          >
            <Text
              style={{
                fontSize: isTablet ? 18 : 16,
                fontWeight: "400",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Reset Passcode
            </Text>
          </TouchableOpacity>

          {/* Use Email - Right */}
          <TouchableOpacity
            onPress={() => {
              router.replace("/login");
            }}
          >
            <Text
              style={{
                fontSize: isTablet ? 18 : 16,
                fontWeight: "400",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Use Email
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.resetModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
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
                  blurOnSubmit={false}
                  returnKeyType="next"
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
                  blurOnSubmit={true}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
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
                  blurOnSubmit={false}
                  returnKeyType="next"
                />

                <TextInput
                  style={styles.resetEmailInput}
                  placeholder="Confirm Passcode"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={4}
                  value={confirmNewPasscode}
                  onChangeText={setConfirmNewPasscode}
                  blurOnSubmit={true}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
