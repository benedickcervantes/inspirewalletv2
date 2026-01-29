import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

const ContractRequestModal = ({ visible, onClose, onSuccess }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Form states
  const [contractId, setContractId] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userLanguage, setUserLanguage] = useState("english");

  // Load user data when modal opens
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

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

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFullName(
            `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
          );
          setEmailAddress(
            userData.email || userData.emailAddress || currentUser.email || ""
          );
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      // console.error("Error loading user data:", error);
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!contractId.trim()) {
      newErrors.contractId = t(userLanguage, "contractRequestModal.validation.contractIdRequired");
    }

    if (!emailAddress.trim()) {
      newErrors.emailAddress = t(userLanguage, "contractRequestModal.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      newErrors.emailAddress = t(userLanguage, "contractRequestModal.validation.emailInvalid");
    }

    if (!fullName.trim()) {
      newErrors.fullName = t(userLanguage, "contractRequestModal.validation.fullNameRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          t(userLanguage, "contractRequestModal.alerts.error"),
          t(userLanguage, "contractRequestModal.alerts.loginRequired")
        );
        return;
      }

      // Prepare email template parameters
      const templateParams = {
        to_email:
          process.env.EXPO_PUBLIC_BUSINESS_EMAIL || "info@inspireholdings.ph",
        from_name: fullName,
        from_email: emailAddress,
        contract_id: contractId,
        full_name: fullName,
        email_address: emailAddress,
        user_id: currentUser.uid,
        request_date: new Date().toLocaleDateString(),
        request_time: new Date().toLocaleTimeString(),
        request_type: "Original Contract Request (No Watermark)",
      };

      // Send email using EmailJS
      const result = await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_CONTRACT_REQUEST_ORIG_TEMPLATE_ID,
        templateParams,
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      // console.log("Contract request email sent successfully:", result);

      // Show success and close modal
      if (onSuccess) {
        onSuccess(
          t(userLanguage, "contractRequestModal.alerts.successMessage")
            .replace("{contractId}", contractId)
            .replace("{emailAddress}", emailAddress)
        );
      }

      // Reset form
      setContractId("");
      setEmailAddress("");
      setFullName("");
      setErrors({});

      onClose();
    } catch (error) {
      // console.error("Error sending contract request:", error);

      if (error instanceof EmailJSResponseStatus) {
        Alert.alert(
          t(userLanguage, "contractRequestModal.alerts.requestFailed"),
          t(userLanguage, "contractRequestModal.alerts.requestFailedMessage").replace("{error}", error.text)
        );
      } else {
        Alert.alert(
          t(userLanguage, "contractRequestModal.alerts.requestFailed"),
          t(userLanguage, "contractRequestModal.alerts.unableToSubmit")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContractId("");
    setEmailAddress("");
    setFullName("");
    setErrors({});
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent={true} animationType="none" visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    transform: [
                      { scale: scaleAnim },
                      { translateY: slideAnim },
                    ],
                  },
                ]}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={styles.headerContainer}>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleClose}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="document-text"
                        size={32}
                        color={Colors.redTheme.background}
                      />
                    </View>

                    <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.title")}</Text>
                    <Text style={[styles.modalSubtitle, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, "contractRequestModal.content.subtitle")}
                    </Text>
                  </View>

                  {/* Form Fields */}
                  <View style={styles.formContainer}>
                    {/* Contract ID Field */}
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.contractId")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          getRTLStyles(userLanguage),
                          errors.contractId && styles.inputError,
                        ]}
                        placeholder={t(userLanguage, "contractRequestModal.content.contractIdPlaceholder")}
                        placeholderTextColor="#999"
                        value={contractId}
                        onChangeText={(text) => {
                          setContractId(text);
                          if (errors.contractId) {
                            setErrors({ ...errors, contractId: null });
                          }
                        }}
                        editable={!isSubmitting}
                      />
                      {errors.contractId && (
                        <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                          {errors.contractId}
                        </Text>
                      )}
                    </View>

                    {/* Email Address Field */}
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.emailAddress")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          getRTLStyles(userLanguage),
                          errors.emailAddress && styles.inputError,
                        ]}
                        placeholder={t(userLanguage, "contractRequestModal.content.emailAddressPlaceholder")}
                        placeholderTextColor="#999"
                        value={emailAddress}
                        onChangeText={(text) => {
                          setEmailAddress(text);
                          if (errors.emailAddress) {
                            setErrors({ ...errors, emailAddress: null });
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                      />
                      {errors.emailAddress && (
                        <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                          {errors.emailAddress}
                        </Text>
                      )}
                    </View>

                    {/* Full Name Field */}
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.fullName")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          getRTLStyles(userLanguage),
                          errors.fullName && styles.inputError,
                        ]}
                        placeholder={t(userLanguage, "contractRequestModal.content.fullNamePlaceholder")}
                        placeholderTextColor="#999"
                        value={fullName}
                        onChangeText={(text) => {
                          setFullName(text);
                          if (errors.fullName) {
                            setErrors({ ...errors, fullName: null });
                          }
                        }}
                        editable={!isSubmitting}
                      />
                      {errors.fullName && (
                        <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>{errors.fullName}</Text>
                      )}
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                      <Ionicons
                        name="information-circle"
                        size={20}
                        color={Colors.redTheme.background}
                      />
                      <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "contractRequestModal.content.infoText")}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        isSubmitting && styles.disabledButton,
                      ]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="send" size={18} color="#fff" />
                      )}
                      <Text style={[styles.submitButtonText, getRTLStyles(userLanguage)]}>
                        {isSubmitting ? t(userLanguage, "contractRequestModal.content.sending") : t(userLanguage, "contractRequestModal.content.sendRequest")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cancelButton,
                        isSubmitting && styles.disabledButton,
                      ]}
                      onPress={handleClose}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.cancelButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.cancel")}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </Animated.View>
            </BlurView>
          ) : (
            <View style={styles.androidModalOverlay}>
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    transform: [
                      { scale: scaleAnim },
                      { translateY: slideAnim },
                    ],
                  },
                ]}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={styles.headerContainer}>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleClose}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="document-text"
                        size={32}
                        color={Colors.redTheme.background}
                      />
                    </View>

                    <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.title")}</Text>
                    <Text style={[styles.modalSubtitle, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, "contractRequestModal.content.subtitle")}
                    </Text>
                  </View>

                  {/* Form Fields */}
                  <View style={styles.formContainer}>
                    {/* Contract ID Field */}
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.contractId")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          getRTLStyles(userLanguage),
                          errors.contractId && styles.inputError,
                        ]}
                        placeholder={t(userLanguage, "contractRequestModal.content.contractIdPlaceholder")}
                        placeholderTextColor="#999"
                        value={contractId}
                        onChangeText={(text) => {
                          setContractId(text);
                          if (errors.contractId) {
                            setErrors({ ...errors, contractId: null });
                          }
                        }}
                        editable={!isSubmitting}
                      />
                      {errors.contractId && (
                        <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                          {errors.contractId}
                        </Text>
                      )}
                    </View>

                    {/* Email Address Field */}
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.emailAddress")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          getRTLStyles(userLanguage),
                          errors.emailAddress && styles.inputError,
                        ]}
                        placeholder={t(userLanguage, "contractRequestModal.content.emailAddressPlaceholder")}
                        placeholderTextColor="#999"
                        value={emailAddress}
                        onChangeText={(text) => {
                          setEmailAddress(text);
                          if (errors.emailAddress) {
                            setErrors({ ...errors, emailAddress: null });
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                      />
                      {errors.emailAddress && (
                        <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                          {errors.emailAddress}
                        </Text>
                      )}
                    </View>

                    {/* Full Name Field */}
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.fullName")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          getRTLStyles(userLanguage),
                          errors.fullName && styles.inputError,
                        ]}
                        placeholder={t(userLanguage, "contractRequestModal.content.fullNamePlaceholder")}
                        placeholderTextColor="#999"
                        value={fullName}
                        onChangeText={(text) => {
                          setFullName(text);
                          if (errors.fullName) {
                            setErrors({ ...errors, fullName: null });
                          }
                        }}
                        editable={!isSubmitting}
                      />
                      {errors.fullName && (
                        <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>{errors.fullName}</Text>
                      )}
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                      <Ionicons
                        name="information-circle"
                        size={20}
                        color={Colors.redTheme.background}
                      />
                      <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "contractRequestModal.content.infoText")}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        isSubmitting && styles.disabledButton,
                      ]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="send" size={18} color="#fff" />
                      )}
                      <Text style={[styles.submitButtonText, getRTLStyles(userLanguage)]}>
                        {isSubmitting ? t(userLanguage, "contractRequestModal.content.sending") : t(userLanguage, "contractRequestModal.content.sendRequest")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cancelButton,
                        isSubmitting && styles.disabledButton,
                      ]}
                      onPress={handleClose}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.cancelButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, "contractRequestModal.content.cancel")}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </Animated.View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  androidModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
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
  headerContainer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${Colors.redTheme.background}15`,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 6,
    marginLeft: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.redTheme.background}10`,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${Colors.redTheme.background}20`,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "column",
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginLeft: 8,
  },
});

export default ContractRequestModal;
