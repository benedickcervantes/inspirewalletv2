import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Platform,
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
const GOVERNMENT_ID_TYPE_OPTIONS = [
  { labelKey: "banking.idNationalId", value: "National_ID" },
  { labelKey: "banking.idDriverLicense", value: "Driver_License" },
  { labelKey: "banking.idPassport", value: "Passport_ID" },
  { labelKey: "kyc.other", value: "Other" },
] as const;
const FRONT_AND_BACK_GOVERNMENT_ID_TYPES = ["National_ID", "Driver_License"] as const;

interface KYCPersonalDocumentsProps {
  onComplete?: (data: {
    governmentIdType?: string;
    idFrontUri: string | null;
    idBackUri: string | null;
    selfieUri: string | null;
  }) => void;
  initialData?: {
    governmentIdType?: string;
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
  const [governmentIdType, setGovernmentIdType] = useState(
    initialData?.governmentIdType ?? ""
  );
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [activeUploadField, setActiveUploadField] = useState<"idFront" | "idBack" | "selfie" | null>(null);
  const requiresFrontAndBack = FRONT_AND_BACK_GOVERNMENT_ID_TYPES.includes(
    governmentIdType as (typeof FRONT_AND_BACK_GOVERNMENT_ID_TYPES)[number]
  );
  const selectedIdTypeLabel =
    GOVERNMENT_ID_TYPE_OPTIONS.find((option) => option.value === governmentIdType)
      ?.labelKey ?? "banking.selectIdType";

  const handleUploadPress = (field: "idFront" | "idBack" | "selfie") => {
    setActiveUploadField(field);
    setActionSheetVisible(true);
  };

  const handleImageSelection = async (method: "camera" | "library") => {
    setActionSheetVisible(false);
    if (!activeUploadField) return;

    try {
      let result;
      if (method === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t("kyc.permissionRequired"), t("kyc.allowCamera", { defaultValue: "Please allow camera access to take a photo." }));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t("kyc.permissionRequired"), t("kyc.allowPhotos"));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        
        let newIdFront = idFrontUri;
        let newIdBack = idBackUri;
        let newSelfie = selfieUri;

        if (activeUploadField === "idFront") {
          setIdFrontUri(uri);
          newIdFront = uri;
        } else if (activeUploadField === "idBack") {
          setIdBackUri(uri);
          newIdBack = uri;
        } else if (activeUploadField === "selfie") {
          setSelfieUri(uri);
          newSelfie = uri;
        }
        
        if (onComplete) {
          onComplete({
            governmentIdType,
            idFrontUri: newIdFront,
            idBackUri: newIdBack,
            selfieUri: newSelfie,
          });
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("kyc.error"), t("kyc.failedToPickImage"));
    } finally {
      setActiveUploadField(null);
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

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
            {t("travel.governmentIdType")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowIdTypeModal(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.dropdownText,
                !governmentIdType && styles.dropdownPlaceholder,
              ]}
            >
              {t(selectedIdTypeLabel)}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Government ID Front */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
            {t("kyc.govIdFront")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={() => handleUploadPress("idFront")}
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
        {requiresFrontAndBack ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
              {t("kyc.govIdBack")} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={() => handleUploadPress("idBack")}
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
        ) : null}

        {/* Selfie Photo */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
            {t("kyc.selfiePhoto")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={() => handleUploadPress("selfie")}
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

      {/* Upload Action Sheet Modal */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setActionSheetVisible(false)}
        >
          <View style={styles.actionSheetContent}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>
                {t("kyc.selectUploadMethod", { defaultValue: "Select Upload Method" })}
              </Text>
              <TouchableOpacity
                onPress={() => setActionSheetVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => handleImageSelection("camera")}
            >
              <View style={styles.actionSheetIconWrapper}>
                <Ionicons name="camera-outline" size={24} color={THEME_COLOR} />
              </View>
              <Text style={styles.actionSheetOptionText}>
                {t("kyc.takePhoto", { defaultValue: "Take a Photo" })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetOption, { borderBottomWidth: 0 }]}
              onPress={() => handleImageSelection("library")}
            >
              <View style={styles.actionSheetIconWrapper}>
                <Ionicons name="image-outline" size={24} color={THEME_COLOR} />
              </View>
              <Text style={styles.actionSheetOptionText}>
                {t("kyc.chooseFromLibrary", { defaultValue: "Choose from Library" })}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={showIdTypeModal}
        onRequestClose={() => setShowIdTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowIdTypeModal(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("banking.selectIdType")}</Text>
            {GOVERNMENT_ID_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  governmentIdType === option.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setGovernmentIdType(option.value);
                  setIdFrontUri(null);
                  setIdBackUri(null);
                  setShowIdTypeModal(false);
                  if (onComplete) {
                    onComplete({
                      governmentIdType: option.value,
                      idFrontUri: null,
                      idBackUri: null,
                      selfieUri,
                    });
                  }
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    governmentIdType === option.value && styles.modalOptionTextActive,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
                {governmentIdType === option.value ? (
                  <Ionicons name="checkmark-circle" size={20} color={THEME_COLOR} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
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
  dropdownButton: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "400",
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
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  actionSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  actionSheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionSheetIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionSheetOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOptionActive: {
    backgroundColor: "#FFF7ED",
  },
  modalOptionText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: THEME_COLOR,
    fontWeight: "700",
  },
});
