import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { useLanguage } from "../../context/LanguageContext";

const THEME_COLOR = "#E15816";
const GREEN_UPLOADED = "#10B981";
const REFERENCE_WIDTH = 375;

interface KYCPersonalDocumentsProps {
  onComplete?: (data: {
    idFrontUri: string | null;
    idBackUri: string | null;
    selfieUri: string | null;
  }) => void;
  initialData?: {
    idFrontUri?: string | null;
    idBackUri?: string | null;
    selfieUri?: string | null;
  };
}

export default function KYCPersonalDocuments({
  onComplete,
  initialData,
}: KYCPersonalDocumentsProps) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();

  const scale = Math.min(width / REFERENCE_WIDTH, 1.25);
  const contentPadding = Math.max(12, Math.min(24, Math.round(width * 0.048)));
  const labelFontSize = Math.round(14 * scale);
  const descriptionFontSize = Math.round(14 * scale);

  const [idFrontUri, setIdFrontUri] = useState<string | null>(
    initialData?.idFrontUri ?? null
  );
  const [idBackUri, setIdBackUri] = useState<string | null>(
    initialData?.idBackUri ?? null
  );
  const [selfieUri, setSelfieUri] = useState<string | null>(
    initialData?.selfieUri ?? null
  );
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);

  const pickImage = async (
    setUri: (uri: string | null) => void,
    _label: string
  ) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("kyc.permissionRequired"), t("kyc.allowPhotos"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUri(uri);
        // Notify parent component if callback provided
        if (onComplete) {
          onComplete({
            idFrontUri: _label === "idFront" ? uri : idFrontUri,
            idBackUri: _label === "idBack" ? uri : idBackUri,
            selfieUri: _label === "selfie" ? uri : selfieUri,
          });
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("kyc.error"), t("kyc.failedToPickImage"));
    }
  };

  return (
    <>
      {/* Personal Documents Card */}
      <View style={[styles.contentCard, { padding: contentPadding }]}>
        <View style={styles.stepIconWrapper}>
          <Ionicons
            name="document-text-outline"
            size={28}
            color={THEME_COLOR}
          />
        </View>
        <Text
          style={[
            styles.contentTitle,
            { fontSize: Math.round(18 * scale) },
          ]}
        >
          {t("kyc.personalDocuments")}
        </Text>
        <Text
          style={[styles.contentDescription, { fontSize: descriptionFontSize }]}
        >
          {t("kyc.personalDocumentsDesc")}
        </Text>

        {/* Government ID Front */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
            {t("kyc.govIdFront")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={() => pickImage(setIdFrontUri, "idFront")}
            activeOpacity={0.8}
          >
            {idFrontUri ? (
              <View style={styles.uploadPreviewRow}>
                <TouchableOpacity
                  onPress={() => setViewingImageUri(idFrontUri)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: idFrontUri }}
                    style={styles.uploadThumbnailLeft}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={styles.uploadedRight}>
                  <Text style={styles.uploadLabel}>
                    {t("kyc.uploadGovernmentId")}
                  </Text>
                  <Text style={styles.uploadHint}>
                    {t("kyc.uploadGovIdFrontHint")}
                  </Text>
                  <View style={styles.uploadedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={GREEN_UPLOADED}
                    />
                    <Text style={styles.uploadedBadgeText}>
                      {t("kyc.uploaded")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Ionicons
                  name="person"
                  size={40}
                  color={THEME_COLOR}
                  style={styles.uploadIcon}
                />
                <Text style={styles.uploadLabel}>
                  {t("kyc.uploadGovernmentId")}
                </Text>
                <Text style={styles.uploadHint}>
                  {t("kyc.uploadGovIdFrontHint")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Government ID Back */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
            {t("kyc.govIdBack")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={() => pickImage(setIdBackUri, "idBack")}
            activeOpacity={0.8}
          >
            {idBackUri ? (
              <View style={styles.uploadPreviewRow}>
                <TouchableOpacity
                  onPress={() => setViewingImageUri(idBackUri)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: idBackUri }}
                    style={styles.uploadThumbnailLeft}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={styles.uploadedRight}>
                  <Text style={styles.uploadLabel}>
                    {t("kyc.uploadGovernmentId")}
                  </Text>
                  <Text style={styles.uploadHint}>
                    {t("kyc.uploadGovIdBackHint")}
                  </Text>
                  <View style={styles.uploadedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={GREEN_UPLOADED}
                    />
                    <Text style={styles.uploadedBadgeText}>
                      {t("kyc.uploaded")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Ionicons
                  name="person"
                  size={40}
                  color={THEME_COLOR}
                  style={styles.uploadIcon}
                />
                <Text style={styles.uploadLabel}>
                  {t("kyc.uploadGovernmentId")}
                </Text>
                <Text style={styles.uploadHint}>
                  {t("kyc.uploadGovIdBackHint")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Selfie Photo */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
            {t("kyc.selfiePhoto")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={() => pickImage(setSelfieUri, "selfie")}
            activeOpacity={0.8}
          >
            {selfieUri ? (
              <View style={styles.uploadPreviewRow}>
                <TouchableOpacity
                  onPress={() => setViewingImageUri(selfieUri)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: selfieUri }}
                    style={styles.uploadThumbnailLeft}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={styles.uploadedRight}>
                  <Text style={styles.uploadLabel}>
                    {t("kyc.uploadSelfiePhoto")}
                  </Text>
                  <Text style={styles.uploadHint}>
                    {t("kyc.uploadSelfieHint")}
                  </Text>
                  <View style={styles.uploadedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={GREEN_UPLOADED}
                    />
                    <Text style={styles.uploadedBadgeText}>
                      {t("kyc.uploaded")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Ionicons
                  name="camera"
                  size={40}
                  color={THEME_COLOR}
                  style={styles.uploadIcon}
                />
                <Text style={styles.uploadLabel}>
                  {t("kyc.uploadSelfiePhoto")}
                </Text>
                <Text style={styles.uploadHint}>
                  {t("kyc.uploadSelfieHint")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Preview Modal */}
      <Modal
        visible={!!viewingImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImageUri(null)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setViewingImageUri(null)}
            activeOpacity={0.9}
          >
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {viewingImageUri && (
            <Image
              source={{ uri: viewingImageUri }}
              style={styles.imageModalContent}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  contentCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stepIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  contentTitle: {
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  contentDescription: {
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    minHeight: 140,
  },
  uploadIcon: {
    marginBottom: 12,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  uploadHint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  uploadPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 16,
  },
  uploadThumbnailLeft: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  uploadedRight: {
    flex: 1,
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  uploadedBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: GREEN_UPLOADED,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imageModalContent: {
    width: "90%",
    height: "80%",
  },
});
