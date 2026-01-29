import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ToastAndroid,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "expo-router";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { ScrollView } from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Index() {
  const navigation = useNavigation();
  const auth = getAuth();
  const [emailAddress, setEmailAddress] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLanguage, setUserLanguage] = useState("english");

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "forgotPassword.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  const onSubmit = async () => {
    if (!emailAddress) {
      if (Platform.OS === "ios") {
        Alert.alert(
          t(userLanguage, "forgotPassword.alerts.missingInfo"),
          t(userLanguage, "forgotPassword.alerts.enterEmail"),
          ["OK"]
        );
      } else if (Platform.OS === "android") {
        ToastAndroid.show(
          t(userLanguage, "forgotPassword.alerts.enterEmail"),
          ToastAndroid.SHORT
        );
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, emailAddress);
      setModalVisible(true);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      if (Platform.OS === "ios") {
        Alert.alert(
          t(userLanguage, "forgotPassword.alerts.error"),
          t(userLanguage, "forgotPassword.alerts.sendFailed"),
          ["OK"]
        );
      } else if (Platform.OS === "android") {
        ToastAndroid.show(
          t(userLanguage, "forgotPassword.alerts.sendFailed"),
          ToastAndroid.SHORT
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
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
                name="lock-open"
                size={32}
                color={Colors.redTheme.background}
                style={styles.headerIcon}
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.title")}</Text>
                <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.subtitle")}</Text>
              </View>
            </View>
          </View>

          {/* Instructions Card */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.instructionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.howItWorks")}</Text>
            </View>
            <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "forgotPassword.content.instructions")}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.resetPassword")}</Text>

            <View style={styles.formSection}>
              <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.emailAddress")}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "forgotPassword.content.emailLabel")}
                </Text>
                <View style={styles.emailInputContainer}>
                  <Ionicons
                    name="mail"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, getRTLStyles(userLanguage)]}
                    placeholder={t(userLanguage, "forgotPassword.content.emailPlaceholder")}
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={emailAddress}
                    onChangeText={(value) => setEmailAddress(value)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Security Notice Card */}
          <View style={styles.securityCard}>
            <View style={styles.securityHeader}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.securityTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.securityInfo")}</Text>
            </View>
            <Text style={[styles.securityText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "forgotPassword.content.securityText")}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            <View style={styles.submitButtonContent}>
              {isSubmitting ? (
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
              <Text style={[styles.submitButtonText, getRTLStyles(userLanguage)]}>
                {isSubmitting ? t(userLanguage, "forgotPassword.content.sending") : t(userLanguage, "forgotPassword.content.sendResetLink")}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Enhanced Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.emailSentTitle")}</Text>
            </View>

            <Text style={[styles.modalText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "forgotPassword.content.emailSentMessage")}
            </Text>
            <Text style={[styles.modalEmail, getRTLStyles(userLanguage)]}>{emailAddress}</Text>

            <Text style={[styles.modalInstructions, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "forgotPassword.content.emailSentInstructions")}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={[styles.modalButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, "forgotPassword.content.returnToLogin")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 100 : 80,
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

  // Instruction Card
  instructionCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  instructionText: {
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
  emailInputContainer: {
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
  inputIcon: {
    paddingLeft: 14,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    padding: 14,
    paddingLeft: 0,
    fontSize: 16,
    color: "#333",
  },

  // Security Card
  securityCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  securityText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
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

  // Enhanced Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginTop: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  modalEmail: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(204, 33, 53, 0.1)",
    borderRadius: 8,
  },
  modalInstructions: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  modalButton: {
    backgroundColor: Colors.redTheme.background,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Legacy styles (removed as they're replaced by new design)
  textInput: {
    // Replaced by input style
  },
});
