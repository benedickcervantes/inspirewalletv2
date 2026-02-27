import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../context/LanguageContext";

const THEME_COLOR = "#E15816";

export default function KYCcompany() {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const [commercialRegister, setCommercialRegister] = useState<string | null>(null);
  const [bankStatement, setBankStatement] = useState<string | null>(null);
  const [proofOfBilling, setProofOfBilling] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const pickDocument = async (
    setUri: (uri: string | null) => void,
    label: string
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleSave = () => {
    if (!commercialRegister || !bankStatement || !proofOfBilling) {
      Alert.alert("Validation", "Please upload all required documents.");
      return;
    }
    // TODO: Save documents to backend
    setShowSuccessModal(true);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Business Requirements</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Please upload the following legal documents to verify your business account.
          </Text>

          {/* Commercial Register */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>
              Commercial Register <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickDocument(setCommercialRegister, "Commercial Register")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={40}
                color={THEME_COLOR}
              />
              <Text style={styles.uploadText}>Click to upload</Text>
              <Text style={styles.uploadHint}>Select PDF file</Text>
              {commercialRegister && (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Bank Statement */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>
              Bank Statement <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickDocument(setBankStatement, "Bank Statement")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={40}
                color={THEME_COLOR}
              />
              <Text style={styles.uploadText}>Click to upload</Text>
              <Text style={styles.uploadHint}>Select PDF file</Text>
              {bankStatement && (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Proof of Billing */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>
              Proof of Billing <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickDocument(setProofOfBilling, "Proof of Billing")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={40}
                color={THEME_COLOR}
              />
              <Text style={styles.uploadText}>Click to upload</Text>
              <Text style={styles.uploadHint}>Select PDF file</Text>
              {proofOfBilling && (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButtonWrapper}
            onPress={handleSave}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.saveButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={["#E15816", "#F48F38"]}
                style={styles.successIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark" size={48} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Success</Text>
            <Text style={styles.successMessage}>
              Business documents uploaded successfully!
            </Text>
            <TouchableOpacity
              style={styles.successButtonWrapper}
              onPress={handleSuccessClose}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#E15816", "#F48F38"]}
                style={styles.successButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.successButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 12,
  },
  required: {
    color: THEME_COLOR,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME_COLOR,
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 13,
    color: "#9E9E9E",
    marginTop: 4,
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 20,
  },
  uploadedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  saveButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  successButtonWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  successButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
