import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  uploadTimeDepositReceiptFile,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";

export default function TimeDepositProof() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params || {}) as {
    requestId?: string;
    depositMethod?: string;
    contractPeriod?: string;
    amount?: string;
    amountInPhp?: number;
    currency?: string;
  };

  const [loading, setLoading] = useState(false);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const depositMethod = params.depositMethod || "Request Amount";
  const contractPeriod = params.contractPeriod || "";
  const amount = params.amount || "0";
  const amountInPhp = params.amountInPhp ?? (parseFloat(amount) || 0);
  const currency = params.currency || "PHP";
  const requestId = params.requestId || "";

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
      ],
    );
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        setErrorMessage(t("deposit.pleaseLoginDeposit"));
        return;
      }

      if (!requestId) {
        setErrorMessage(t("deposit.missingRequestId"));
        return;
      }

      if (proofUri) {
        const uriLower = proofUri.toLowerCase();
        const mimeType = uriLower.endsWith(".png")
          ? "image/png"
          : uriLower.endsWith(".gif")
            ? "image/gif"
            : uriLower.endsWith(".webp")
              ? "image/webp"
              : "image/jpeg";
        const uploadRes = await uploadTimeDepositReceiptFile(
          token,
          requestId,
          proofUri,
          mimeType,
        );
        if (!uploadRes.success) {
          setErrorMessage(
            `${t("deposit.timeDepositCreatedUploadFailed")}${uploadRes.error}${t("deposit.pleaseContactSupport")}`,
          );
          return;
        }
      }

      navigation.navigate("depositProofView", {
        transactionId: requestId || t("investment.pending"),
        requestId: requestId || t("investment.pending"),
        amount,
        currency,
        depositMethod,
        contractPeriod,
        type: "Time Deposit",
        proofUri,
      });
    } catch (error) {
      console.error("Error finalizing time deposit:", error);
      setErrorMessage(t("deposit.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("deposit.proofOfPayment")}</Text>
            <Text style={styles.subtitle}>{t("deposit.uploadProofOfPayment")}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              {t("deposit.proofOfPayment")} {t("deposit.optional")}
            </Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPress}>
              {proofUri ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: proofUri }} style={styles.selectedImage} />
                  <View style={styles.changeImageOverlay}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                    <Text style={styles.changeImageText}>{t("kyc.changeImage")}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <MaterialCommunityIcons
                    name="cloud-upload"
                    size={40}
                    color="#E25A17"
                  />
                  <Text style={styles.uploadText}>
                    {t("deposit.uploadProofOfPayment")}
                  </Text>
                  <Text style={styles.uploadSubtext}>
                    {t("deposit.acceptedFormatsMax")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#B71C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{t("deposit.back")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleFinalConfirm}
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  safeArea: { flex: 1 },
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
  stepActive: { backgroundColor: "#E25A17" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLineActive: { backgroundColor: "#E25A17" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 30 },
  titleContainer: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#999" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#FFE0B2",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#FFF8E1",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  selectedImageContainer: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
  },
  selectedImage: { width: "100%", height: "100%", resizeMode: "cover" },
  changeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  changeImageText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  uploadPlaceholder: { alignItems: "center" },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: "#E25A17",
    fontWeight: "500",
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#EF6C00",
    marginTop: 4,
    opacity: 0.8,
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
  errorText: { flex: 1, fontSize: 14, color: "#B71C1C" },
  buttonContainer: { flexDirection: "row", gap: 12 },
  backButtonBottom: {
    flex: 1,
    backgroundColor: "#E25A17",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
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
  confirmText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
});
