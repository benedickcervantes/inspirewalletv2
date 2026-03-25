import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
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
import { uploadTopUpReceiptFile } from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";

export default function TopUpConfirm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params || {}) as {
    currency?: string;
    amount?: string;
    currencySymbol?: string;
    requestId?: string;
  };
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
  }>({ title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [generatedRequestId, setGeneratedRequestId] = useState<string | null>(params.requestId || null);
  const [showEmailSentModal, setShowEmailSentModal] = useState(false);

  const currency = params.currency || "PHP";
  const amount = params.amount || "0";
  const currencySymbol = params.currencySymbol || "₱";

  useEffect(() => {
    // Show email sent modal when confirm screen loads
    setShowEmailSentModal(true);
  }, []);

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

  const handleUploadPress = () => {
    Alert.alert(
      t("deposit.proofOfPayment"),
      t("deposit.uploadProofOfPayment"),
      [
        { text: t("deposit.useCamera"), onPress: takePhoto },
        { text: t("deposit.uploadFiles"), onPress: pickFromGallery },
        { text: t("deposit.cancel"), style: "cancel" },
      ]
    );
  };

  const handleConfirmWithReceipt = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setAlertConfig({ title: "", message: "" });

    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setAlertConfig({
          title: t("deposit.error"),
          message: t("deposit.pleaseLoginTopup"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }

      const newRequestId = generatedRequestId;

      if (!newRequestId) {
        setAlertConfig({
          title: t("deposit.error"),
          message: t("deposit.missingRequestId"),
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }

      if (proofUri) {
        const uriLower = proofUri.toLowerCase();
        const mimeType = uriLower.endsWith(".png")
          ? "image/png"
          : uriLower.endsWith(".gif")
          ? "image/gif"
          : "image/jpeg";

        const uploadResult = await uploadTopUpReceiptFile(
          accessToken,
          newRequestId,
          proofUri,
          mimeType
        );

        if (!uploadResult.success) {
          setAlertConfig({
            title: t("deposit.error"),
            message: `${t("deposit.receiptUploadFailed")}${uploadResult.error || t("deposit.unexpectedError")}`,
          });
          setShowAlertModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      setProofUri(null);
      setGeneratedRequestId(newRequestId);
      
      navigation.navigate("depositReceipt", {
        transactionId: newRequestId || t("investment.pending"),
        amount,
        currency,
        depositMethod: t("deposit.topUpBalance"),
        type: "Top Up",
        successMessage: t("deposit.topUpSuccess"),
      });
    } catch (error) {
      console.error("Error submitting top-up:", error);
      setAlertConfig({
        title: t("deposit.error"),
        message: t("deposit.unexpectedError"),
      });
      setShowAlertModal(true);
    } finally {
      setIsSubmitting(false);
    }
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

        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("deposit.reviewConfirm")}</Text>
            <Text style={styles.subtitle}>{t("deposit.reviewDetails")}</Text>
          </View>

          {/* Investment Amount Card */}
          <LinearGradient
            colors={["#F28934", "#E25A17"]}
            style={styles.amountCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}>
            <Text style={styles.amountCardTitle}>
              {t("deposit.topUpAvailableBalanceAmount")}
            </Text>
            <Text style={styles.amountValue}>
              {currencySymbol}
              {parseFloat(amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </Text>
          </LinearGradient>

          {/* Deposit Type Card */}
          <View style={styles.detailCard}>
            <View style={styles.leftBorder} />
            <Text style={styles.detailLabel}>{t("deposit.depositType")}</Text>
            <Text style={styles.detailValue}>{t("deposit.topUpBalance")}</Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.detailLabel}>
                {t("deposit.proofOfPayment")} {t("deposit.optional")}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "#E0E0E0",
                  borderStyle: "dashed",
                  borderRadius: 12,
                  backgroundColor: "#FAFAFA",
                  padding: proofUri ? 0 : 20,
                  alignItems: "center",
                  justifyContent: "center",
                  height: proofUri ? undefined : 150,
                  overflow: "hidden",
                }}
                onPress={handleUploadPress}
              >
                {proofUri ? (
                  <View style={{ width: "100%", height: 180 }}>
                    <Image
                      source={{ uri: proofUri }}
                      style={{ width: "100%", height: "100%", borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <View style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>
                        {t("kyc.changeImage")}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons
                      name="cloud-upload"
                      size={40}
                      color="#E25A17"
                    />
                    <Text style={{ fontSize: 16, color: "#333", fontWeight: "600", marginTop: 8 }}>
                      {t("deposit.uploadProofOfPayment")}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                      {t("deposit.acceptedFormatsMax")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{t("deposit.back")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmWithReceipt}
              disabled={isSubmitting}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.confirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.confirmText}>
                  {isSubmitting
                    ? t("deposit.processing")
                    : t("deposit.confirm")}
                </Text>
                {!isSubmitting && (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>


        {/* Custom Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}>
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => {
                  setShowAlertModal(false);
                  if (alertConfig.title === t("deposit.success")) {
                    navigation.navigate("Main");
                  }
                }}>
                <Text style={styles.alertButtonText}>{t("deposit.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>

        {/* Bank Details Sent Modal */}
        <Modal
          visible={showEmailSentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEmailSentModal(false)}>
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}>
              <Text style={styles.alertTitle}>{t("deposit.bankDetailsSentTitle")}</Text>
              <Text style={styles.alertMessage}>{t("deposit.bankDetailsSentMessage")}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowEmailSentModal(false)}>
                <Text style={styles.alertButtonText}>{t("deposit.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
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
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#E25A17",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  detailLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  amountCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  amountCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
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
  // Alert Modal Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.95,
  },
  alertButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  alertButtonText: {
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
  proofModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  proofModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  proofRequiredBadge: {
    backgroundColor: "#E25A17",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proofRequiredBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  proofModalSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  proofUploadArea: {
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
  proofRequiredBadgeOptional: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  proofRequiredBadgeTextOptional: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
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
