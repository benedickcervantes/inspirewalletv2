import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useLanguage } from "../../../context/LanguageContext";
import { useResponsive } from "../../../utils/responsive";

const THEME_COLOR = "#E15816";

export interface TravelRequiredDocuProps {
  passportPhoto: string | null;
  governmentIdFront: string | null;
  governmentIdBack: string | null;
  governmentIdType: string;
  governmentIdNumber: string;
  passportPhotoError?: string;
  governmentIdFrontError?: string;
  governmentIdBackError?: string;
  onPickPassportPhoto: (source: "camera" | "library") => void;
  onPickGovernmentIdFront: (source: "camera" | "library") => void;
  onPickGovernmentIdBack: (source: "camera" | "library") => void;
  onGovernmentIdTypeChange: (value: string) => void;
  onGovernmentIdNumberChange: (value: string) => void;
}

export default function TravelRequiredDocu({
  passportPhoto,
  governmentIdFront,
  governmentIdBack,
  governmentIdType,
  governmentIdNumber,
  passportPhotoError,
  governmentIdFrontError,
  governmentIdBackError,
  onPickPassportPhoto,
  onPickGovernmentIdFront,
  onPickGovernmentIdBack,
  onGovernmentIdTypeChange,
  onGovernmentIdNumberChange,
}: TravelRequiredDocuProps) {
  const { t } = useLanguage();
  const { isSmallScreen } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();
  const modalListMaxHeight = Math.min(420, windowHeight * 0.45);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showUploadSourceModal, setShowUploadSourceModal] = useState(false);
  const [activeUploadTarget, setActiveUploadTarget] = useState<
    "passport" | "governmentFront" | "governmentBack" | null
  >(null);

  const idTypeOptions = [
    { label: t("banking.idNationalId"), value: "National_ID" },
    { label: t("banking.idDriverLicense"), value: "Driver_License" },
    { label: t("banking.idPassport"), value: "Passport_ID" },
    { label: t("kyc.other"), value: "Other" },
  ];
  const selectedIdTypeLabel =
    idTypeOptions.find((option) => option.value === governmentIdType)?.label ||
    t("banking.selectIdType");
  const requiresFrontAndBack = ["National_ID", "Driver_License"].includes(
    governmentIdType,
  );
  const openUploadSourceModal = (
    target: "passport" | "governmentFront" | "governmentBack",
  ) => {
    setActiveUploadTarget(target);
    setShowUploadSourceModal(true);
  };
  const handleSelectUploadSource = (source: "camera" | "library") => {
    if (activeUploadTarget === "passport") {
      onPickPassportPhoto(source);
    } else if (activeUploadTarget === "governmentFront") {
      onPickGovernmentIdFront(source);
    } else if (activeUploadTarget === "governmentBack") {
      onPickGovernmentIdBack(source);
    }
    setShowUploadSourceModal(false);
    setActiveUploadTarget(null);
  };

  return (
    <View style={[styles.formCard, isSmallScreen && styles.formCardSmall]}>
      <View style={styles.formHeader}>
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="file-document"
            size={24}
            color={THEME_COLOR}
          />
        </View>
        <View style={styles.formHeaderTextContainer} pointerEvents="box-none">
          <Text style={styles.formTitle}>{t("travel.requiredDocs")}</Text>
          <Text style={styles.formSubtitle}>
            {t("travel.requiredDocsSubtitle")}
          </Text>
        </View>
      </View>

      {/* Passport Photo */}
      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.passportPhoto")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            passportPhoto && styles.uploadBoxSuccess,
            passportPhotoError ? styles.uploadBoxError : null,
          ]}
          onPress={() => openUploadSourceModal("passport")}
        >
          <MaterialCommunityIcons
            name="camera"
            size={40}
            color={passportPhoto ? "#10B981" : THEME_COLOR}
          />
          <Text
            style={[
              styles.uploadText,
              passportPhoto && styles.uploadTextSuccess,
            ]}
          >
            {passportPhoto
              ? t("travel.passportUploaded")
              : t("travel.uploadPassport")}
          </Text>
          <Text style={styles.uploadSubtext}>
            {t("travel.tapToSelectImage")}
          </Text>
        </TouchableOpacity>
        {passportPhotoError ? (
          <Text style={styles.errorText}>{passportPhotoError}</Text>
        ) : null}
      </View>

      {/* Government ID Section */}
      <View style={styles.sectionDivider} />

      {/* Government ID Type */}
      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.governmentIdType")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowIdTypeModal(true)}
        >
          <Text
            style={[
              styles.dropdownText,
              !governmentIdType && styles.dropdownPlaceholder,
            ]}
          >
            {selectedIdTypeLabel}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={22} color="#9E9E9E" />
        </TouchableOpacity>
      </View>

      {/* Government ID Number */}
      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.governmentIdNumber")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder={t("travel.placeholderGovernmentIdNumber")}
          value={governmentIdNumber}
          onChangeText={onGovernmentIdNumberChange}
          placeholderTextColor="#BDBDBD"
        />
      </View>

      {/* Government ID Photo */}
      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.governmentIdPhoto")} <Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.idUploadColumn} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              styles.uploadBox,
              styles.uploadBoxCompact,
              governmentIdFront && styles.uploadBoxSuccess,
              governmentIdFrontError ? styles.uploadBoxError : null,
            ]}
            onPress={() => openUploadSourceModal("governmentFront")}
          >
            <MaterialCommunityIcons
              name="card-account-details"
              size={40}
              color={governmentIdFront ? "#10B981" : THEME_COLOR}
            />
            <Text
              style={[
                styles.uploadText,
                governmentIdFront && styles.uploadTextSuccess,
              ]}
            >
              {governmentIdFront ? t("travel.passportUploaded") : t("kyc.govIdFront")}
            </Text>
            <Text style={styles.uploadSubtext}>
              {requiresFrontAndBack
                ? t("travel.uploadFrontIdHint", {
                    defaultValue: "Upload the front side of your government ID",
                  })
                : t("travel.uploadSingleIdHint", {
                    defaultValue: "Upload one clear government ID photo",
                  })}
            </Text>
          </TouchableOpacity>

          {requiresFrontAndBack ? (
            <TouchableOpacity
              style={[
                styles.uploadBox,
                styles.uploadBoxCompact,
                governmentIdBack && styles.uploadBoxSuccess,
                governmentIdBackError ? styles.uploadBoxError : null,
              ]}
              onPress={() => openUploadSourceModal("governmentBack")}
            >
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={40}
                color={governmentIdBack ? "#10B981" : THEME_COLOR}
              />
              <Text
                style={[
                  styles.uploadText,
                  governmentIdBack && styles.uploadTextSuccess,
                ]}
              >
                {governmentIdBack ? t("travel.passportUploaded") : t("kyc.govIdBack")}
              </Text>
              <Text style={styles.uploadSubtext}>
                {t("travel.uploadBackIdHint", {
                  defaultValue: "Upload the back side of your government ID",
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {governmentIdFrontError ? (
          <Text style={styles.errorText}>{governmentIdFrontError}</Text>
        ) : null}
        {governmentIdBackError ? (
          <Text style={styles.errorText}>{governmentIdBackError}</Text>
        ) : null}
      </View>

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
            <ScrollView
              style={[styles.modalOptionsList, { maxHeight: modalListMaxHeight }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {idTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    governmentIdType === option.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    onGovernmentIdTypeChange(option.value);
                    setShowIdTypeModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      governmentIdType === option.value && styles.modalOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {governmentIdType === option.value ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={THEME_COLOR} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={showUploadSourceModal}
        onRequestClose={() => setShowUploadSourceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowUploadSourceModal(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t("kyc.selectUploadMethod", { defaultValue: "Select Upload Method" })}
            </Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleSelectUploadSource("camera")}
            >
              <Text style={styles.modalOptionText}>
                {t("kyc.takePhoto", { defaultValue: "Take a Photo" })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleSelectUploadSource("library")}
            >
              <Text style={styles.modalOptionText}>
                {t("kyc.chooseFromLibrary", { defaultValue: "Choose from Library" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formCardSmall: {
    padding: 16,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  formHeaderTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
    flexShrink: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  required: {
    color: THEME_COLOR,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  dropdownText: {
    fontSize: 14,
    color: "#111111",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#F9F9F9",
  },
  uploadBox: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBoxCompact: {
    paddingVertical: 24,
  },
  idUploadColumn: {
    flexDirection: "column",
    gap: 12,
  },
  uploadBoxSuccess: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderStyle: "solid",
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME_COLOR,
    marginTop: 12,
  },
  uploadTextSuccess: {
    color: "#10B981",
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 4,
  },
  uploadBoxError: {
    borderColor: "#FF3B30",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: "65%",
    flexDirection: "column",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
  },
  modalOptionsList: {
    width: "100%",
  },
  modalOption: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOptionActive: {
    borderColor: "rgba(225, 88, 22, 0.4)",
    backgroundColor: "rgba(225, 88, 22, 0.08)",
  },
  modalOptionText: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: THEME_COLOR,
    fontWeight: "700",
  },
});
