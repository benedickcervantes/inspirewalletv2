import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useResponsive } from "../../../utils/responsive";

const THEME_COLOR = "#E15816";

export interface TravelRequiredDocuProps {
  passportPhoto: string | null;
  governmentId: string | null;
  governmentIdType: string;
  governmentIdNumber: string;
  passportPhotoError?: string;
  governmentIdError?: string;
  onPickPassportPhoto: () => void;
  onPickGovernmentId: () => void;
  onGovernmentIdTypeChange: (value: string) => void;
  onGovernmentIdNumberChange: (value: string) => void;
}

export default function TravelRequiredDocu({
  passportPhoto,
  governmentId,
  governmentIdType,
  governmentIdNumber,
  passportPhotoError,
  governmentIdError,
  onPickPassportPhoto,
  onPickGovernmentId,
  onGovernmentIdTypeChange,
  onGovernmentIdNumberChange,
}: TravelRequiredDocuProps) {
  const { t } = useLanguage();
  const { isSmallScreen } = useResponsive();

  const idTypeOptions = [
    { label: t("banking.idNationalId"), value: "National_ID" },
    { label: t("banking.idDriverLicense"), value: "Driver_License" },
    { label: t("banking.idPassport"), value: "Passport_ID" },
    { label: t("kyc.other"), value: "Other" },
  ];

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
        <View style={styles.formHeaderTextContainer}>
          <Text style={styles.formTitle}>{t("travel.requiredDocs")}</Text>
          <Text style={styles.formSubtitle}>
            {t("travel.requiredDocsSubtitle")}
          </Text>
        </View>
      </View>

      {/* Passport Photo */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.passportPhoto")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            passportPhoto && styles.uploadBoxSuccess,
            passportPhotoError ? styles.uploadBoxError : null,
          ]}
          onPress={onPickPassportPhoto}
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
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.governmentIdType")} <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.idTypeContainer}
        >
          {idTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.idTypeButton,
                governmentIdType === option.value && styles.idTypeButtonActive,
              ]}
              onPress={() => onGovernmentIdTypeChange(option.value)}
            >
              <Text
                style={[
                  styles.idTypeButtonText,
                  governmentIdType === option.value &&
                    styles.idTypeButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Government ID Number */}
      <View style={styles.inputGroup}>
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
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.governmentIdPhoto")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            governmentId && styles.uploadBoxSuccess,
            governmentIdError ? styles.uploadBoxError : null,
          ]}
          onPress={onPickGovernmentId}
        >
          <MaterialCommunityIcons
            name="card-account-details"
            size={40}
            color={governmentId ? "#10B981" : THEME_COLOR}
          />
          <Text
            style={[
              styles.uploadText,
              governmentId && styles.uploadTextSuccess,
            ]}
          >
            {governmentId
              ? t("travel.governmentIdUploaded")
              : t("travel.uploadGovernmentId")}
          </Text>
          <Text style={styles.uploadSubtext}>
            {t("travel.tapToUploadGovId")}
          </Text>
        </TouchableOpacity>
        {governmentIdError ? (
          <Text style={styles.errorText}>{governmentIdError}</Text>
        ) : null}
      </View>
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
  idTypeContainer: {
    marginBottom: 8,
  },
  idTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
    marginRight: 8,
  },
  idTypeButtonActive: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  idTypeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
  },
  idTypeButtonTextActive: {
    color: "#FFFFFF",
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
});
