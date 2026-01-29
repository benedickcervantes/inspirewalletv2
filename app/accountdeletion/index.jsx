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
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  useRef,
} from "react-native";
import { useNavigation } from "expo-router";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Index() {
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLanguage, setUserLanguage] = useState("english");
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
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
      headerTitle: t(userLanguage, "accountDeletion.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  const [firstName, setFirstName] = useState();
  const [lastName, setLastName] = useState();
  const [emailAddress, setEmailAddress] = useState();
  const [reason, setReason] = useState();

  const onSubmit = async () => {
    if (!firstName || !lastName || !emailAddress || !reason) {
      showModal({
        title: t(userLanguage, "accountDeletion.modals.missingInformation.title"),
        message: t(userLanguage, "accountDeletion.modals.missingInformation.message"),
        type: "warning",
      });
      return;
    }

    // Show confirmation dialog before proceeding
    showModal({
      title: t(userLanguage, "accountDeletion.modals.confirmAccountDeletion.title"),
      message: t(userLanguage, "accountDeletion.modals.confirmAccountDeletion.message"),
      type: "warning",
      onConfirm: () => submitRequest(),
    });
  };

  const submitRequest = async () => {
    setIsSubmitting(true);
    try {
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          email: emailAddress,
          message: `First Name: ${firstName}\nLast Name: ${lastName}\nEmail Address: ${emailAddress}\nType of Request: Account Deletion\nReason: ${reason}`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      console.log("SUCCESS!");
      showModal({
        title: t(userLanguage, "accountDeletion.modals.requestSubmitted.title"),
        message: t(userLanguage, "accountDeletion.modals.requestSubmitted.message"),
        type: "success",
      });
    } catch (err) {
      if (err instanceof EmailJSResponseStatus) {
        console.log("EmailJS Request Failed...", err);
      }

      console.log("ERROR", err);
      showModal({
        title: t(userLanguage, "accountDeletion.modals.submissionFailed.title"),
        message: t(userLanguage, "accountDeletion.modals.submissionFailed.message"),
        type: "error",
      });
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
                name="person-remove"
                size={32}
                color={Colors.redTheme.background}
                style={styles.headerIcon}
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.headerTitle")}</Text>
                <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "accountDeletion.content.headerSubtitle")}
                </Text>
              </View>
            </View>
          </View>

          {/* Warning Card */}
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={24} color="#ff6b35" />
              <Text style={[styles.warningTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.importantNotice")}</Text>
            </View>
            <Text style={[styles.warningText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "accountDeletion.content.warningText")}
            </Text>
          </View>

          {/* Instructions Card */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.instructionTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "accountDeletion.content.deletionRequestProcess")}
              </Text>
            </View>
            <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "accountDeletion.content.instructionText")}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.accountInformation")}</Text>

            {/* Personal Information Section */}
            <View style={styles.formSection}>
              <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.personalDetails")}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.firstName")} *</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "accountDeletion.content.firstNamePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={firstName}
                  onChangeText={(value) => setFirstName(value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.lastName")} *</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "accountDeletion.content.lastNamePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={lastName}
                  onChangeText={(value) => setLastName(value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.emailAddress")} *</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "accountDeletion.content.emailPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={emailAddress}
                  onChangeText={(value) => setEmailAddress(value)}
                />
              </View>
            </View>

            {/* Reason Section */}
            <View style={styles.formSection}>
              <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.deletionReason")}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "accountDeletion.content.reasonForDeletion")} *
                </Text>
                <Text style={[styles.helperText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "accountDeletion.content.helperText")}
                </Text>
                <TextInput
                  style={[styles.textArea, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "accountDeletion.content.reasonPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={reason}
                  onChangeText={(value) => setReason(value)}
                />
              </View>
            </View>
          </View>

          {/* Process Information Card */}
          <View style={styles.processCard}>
            <View style={styles.processHeader}>
              <Ionicons
                name="time"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.processTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "accountDeletion.content.whatHappensNext")}</Text>
            </View>
            <Text style={[styles.processText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "accountDeletion.content.processText")}
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
                  name="trash-outline"
                  size={20}
                  color="white"
                  style={styles.submitIcon}
                />
              )}
              <Text style={[styles.submitButtonText, getRTLStyles(userLanguage)]}>
                {isSubmitting ? t(userLanguage, "accountDeletion.content.submitting") : t(userLanguage, "accountDeletion.content.submitDeletionRequest")}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

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

  // Warning Card
  warningCard: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#ff6b35",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff6b35",
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
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
    lineHeight: 20,
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
  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
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
  textArea: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    minHeight: 120,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Process Card
  processCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  processHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  processTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  processText: {
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

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Legacy styles (removed as they're replaced by new design)
  textInput: {
    // Replaced by input style
  },
  reasonInput: {
    // Replaced by textArea style
  },
});
