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
} from "react-native";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "../configs/firebase";
import { useState, useEffect } from "react";
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
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [resetPasscodeModalVisible, setResetPasscodeModalVisible] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState("auth"); // "auth" or "newPasscode"
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmNewPasscode, setConfirmNewPasscode] = useState("");

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
            // Get passcode from Firestore
            try {
              const userDocRef = doc(firestore, "users", user.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.passcode) {
                  setCheckPasscode(userData.passcode);
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
    } else if (value === "✓") {
      if (passcode.length === 4) {
        // Show loading screen when check mark is clicked
        setLoadingScreen(true);
        
        // Add a delay to show loading screen
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
                } else {
                  // Get push token (Native Notify will use this automatically)
                  const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: "81d5c41e-b862-48d6-a14d-21246b09c564",
                  });
                  console.log(
                    "Got Expo push token for passcode login:",
                    tokenData.data
                  );

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
                }
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

          // Show loading screen for a bit longer, then navigate to dashboard
          setTimeout(() => {
            setLoadingScreen(false);
            // Set a flag to indicate passcode login is complete
            AsyncStorage.setItem("passcodeLoginComplete", "true").catch(err => console.error("Error setting passcode flag:", err));
            showModal({
              title: "Access Granted!",
              message: "Welcome back!",
              type: "success",
              onConfirm: () => {
                hideModal();
                router.replace("/main");
              },
            });
          }, 2000);
        } else {
          setLoadingScreen(false);
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

  // Show loading screen when processing
  if (loadingScreen) {
    return <LoadingScreen type="login" />;
  }

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
              router.replace("/login");
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
