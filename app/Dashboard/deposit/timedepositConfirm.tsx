import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getOrCreateMainWallet,
  submitTimeDepositRequest,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";

export default function TimeDepositConfirm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params || {}) as {
    depositMethod?: string;
    contractPeriod?: string;
    amount?: string;
    amountInPhp?: number;
    currency?: string;
  };

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const depositMethod = params.depositMethod || "Request Amount";
  const contractPeriod = params.contractPeriod || "";
  const amount = params.amount || "0";
  const amountInPhp = params.amountInPhp ?? (parseFloat(amount) || 0);
  const currency = params.currency || "PHP";

  const getMaturityDate = () => {
    const months =
      contractPeriod === "6 Months" ? 6 : contractPeriod === "1 Year" ? 12 : 24;
    return `${months} Months`;
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("deposit.error"), t("kyc.allowPhotos"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("deposit.error"), t("kyc.failedToPickImage"));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("deposit.error"), t("deposit.cameraPermissionRequired"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert(t("deposit.error"), t("kyc.failedToPickImage"));
    }
  };

  const handleProofSubmit = () => {
    setShowProofModal(false);
    setProofUri(null);
    handleConfirm();
  };

  const handleConfirmPress = () => {
    if (depositMethod === "Available Balance") {
      // For available balance, submit directly without requiring proof of payment
      handleConfirm();
    } else {
      // For request amount and other methods, require proof of payment
      setShowProofModal(true);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setErrorMessage(t("deposit.pleaseLoginDeposit"));
        setLoading(false);
        return;
      }

      const body: Record<string, string> = {
        amount: Number(amountInPhp).toFixed(2),
        contractPeriod,
        depositMethod:
          depositMethod === "Available Balance"
            ? "available_balance"
            : "request_amount",
      };

      if (depositMethod === "Available Balance") {
        const { success, wallet } = await getOrCreateMainWallet(accessToken);
        if (!success || !wallet?.id) {
          setErrorMessage(t("deposit.walletLoadError"));
          setLoading(false);
          return;
        }
        body.walletId = wallet.id as string;
      }

      const result = await submitTimeDepositRequest(accessToken, body);

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setErrorMessage(result.error || t("deposit.submitError"));
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      setErrorMessage(t("deposit.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const goToMain = () => {
    setShowSuccessModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Main", params: { initialTab: "Investment" } }],
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("deposit.depositRequest")}</Text>

          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <MaterialCommunityIcons
                name="clipboard-check"
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Review & Confirm</Text>
            <Text style={styles.subtitle}>Review your deposit details</Text>
          </View>

          {/* Main Content Container */}
          <View style={styles.contentContainer}>
            {/* Left Side - Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Deposit Type</Text>
                <Text style={styles.detailValue}>Time Deposit</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {t("deposit.contractPeriod")}
                </Text>
                <Text style={styles.detailValue}>{contractPeriod}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {t("deposit.depositMethod")}
                </Text>
                <Text style={styles.detailValue}>{depositMethod}</Text>
              </View>
            </View>

            {/* Right Side - Investment Amount Card */}
            <LinearGradient
              colors={["#F28934", "#E25A17"]}
              style={styles.amountCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}>
              <Text style={styles.amountCardTitle}>
                {t("deposit.investmentAmount")}
              </Text>
              <View style={styles.amountDisplay}>
                <Text style={styles.amountValue}>
                  {currency}{" "}
                  {parseFloat(amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Deposit Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {t("deposit.depositSummary")}
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  {t("deposit.principalAmount")}
                </Text>
                <Text style={styles.summaryValue}>
                  {currency}{" "}
                  {parseFloat(amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("deposit.maturity")}</Text>
                <Text style={styles.summaryValue}>{getMaturityDate()}</Text>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={styles.statusValue}>Pending</Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#B71C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{t("deposit.back")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmPress}
              disabled={loading}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.confirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.confirmText}>
                  {loading ? t("deposit.processing") : t("deposit.confirm")}
                </Text>
                {!loading && (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Proof of Payment Modal */}
        <Modal
          visible={showProofModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowProofModal(false)}>
          <View style={styles.proofModalOverlay}>
            <View style={styles.proofModalContent}>
              <View style={styles.proofModalHeader}>
                <Text style={styles.proofModalTitle}>
                  {t("deposit.proofOfPaymentTitle")}
                </Text>
                <Text style={styles.proofModalSubtitle}>
                  {t("deposit.proofOfPaymentSubtitle")}
                </Text>
                <Text style={styles.proofOptionalText}>
                  {t("deposit.proofOptionalHint")}
                </Text>
              </View>

              <View style={styles.proofUploadButtons}>
                <TouchableOpacity
                  style={styles.proofUploadBtn}
                  onPress={pickFromGallery}>
                  <Ionicons
                    name="folder-open-outline"
                    size={28}
                    color="#E25A17"
                  />
                  <Text style={styles.proofUploadBtnText}>
                    {t("deposit.uploadFiles")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.proofUploadBtn}
                  onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={28} color="#E25A17" />
                  <Text style={styles.proofUploadBtnText}>
                    {t("deposit.useCamera")}
                  </Text>
                </TouchableOpacity>
              </View>

              {proofUri ? (
                <View style={styles.proofPreviewContainer}>
                  <Image
                    source={{ uri: proofUri }}
                    style={styles.proofPreviewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.proofPreviewInfo}>
                    <Text style={styles.proofUploadedText}>
                      {t("deposit.proofUploaded")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setProofUri(null)}
                      style={styles.removeProofBtn}>
                      <Ionicons name="trash-outline" size={18} color="#B71C1C" />
                      <Text style={styles.removeProofText}>
                        {t("deposit.remove")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View style={styles.proofModalFooter}>
                <TouchableOpacity
                  style={styles.proofCancelBtn}
                  onPress={() => {
                    setShowProofModal(false);
                    setProofUri(null);
                  }}>
                  <Text style={styles.proofCancelText}>
                    {t("deposit.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.proofSubmitBtn}
                  onPress={handleProofSubmit}>
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.proofSubmitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}>
                    <Text style={styles.proofSubmitText}>
                      {t("deposit.confirm")}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={goToMain}>
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <LinearGradient
                colors={["#E15816", "#F48F38"]}
                style={styles.successModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>
                  {t("deposit.successTitle")}
                </Text>
                <Text style={styles.successMessage}>
                  {t("deposit.successMessage")}
                </Text>
                <TouchableOpacity
                  style={styles.successButton}
                  onPress={goToMain}>
                  <Text style={styles.successButtonText}>
                    {t("kyc.sourceInvestments")}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#E25A17",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  contentContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  detailsSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  detailItem: {
    marginBottom: 18,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  detailValue: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  amountCard: {
    width: 170,
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  amountCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  amountDisplay: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: "100%",
    alignItems: "center",
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  statusContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statusLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF50",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#B71C1C",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#B71C1C",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    backgroundColor: "#E25A17",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 20,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successModalGradient: {
    padding: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.95,
  },
  successButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
  // Proof Modal styles
  proofModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  proofModalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  proofModalHeader: {
    marginBottom: 20,
  },
  proofModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  proofModalSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  proofOptionalText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  proofUploadButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  proofUploadBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E25A17",
  },
  proofUploadBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E25A17",
    marginTop: 8,
  },
  proofPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 20,
  },
  proofPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  proofPreviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  proofUploadedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 4,
  },
  removeProofBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  removeProofText: {
    fontSize: 14,
    color: "#B71C1C",
    fontWeight: "500",
  },
  proofModalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  proofCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
  },
  proofCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  proofSubmitBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  proofSubmitDisabled: {
    opacity: 0.7,
  },
  proofSubmitGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  proofSubmitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  proofSubmitTextDisabled: {
    color: "#FFFFFF",
    opacity: 0.9,
  },
});
