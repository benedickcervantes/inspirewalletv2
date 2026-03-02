import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

const THEME_COLOR = "#E15816";

export interface TravelRequiredDocuProps {
  passportPhoto: string | null;
  governmentId: string | null;
  onPickPassportPhoto: () => void;
  onPickGovernmentId: () => void;
}

export default function TravelRequiredDocu({
  passportPhoto,
  governmentId,
  onPickPassportPhoto,
  onPickGovernmentId,
}: TravelRequiredDocuProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="file-document"
            size={24}
            color={THEME_COLOR}
          />
        </View>
        <View>
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
          style={[styles.uploadBox, passportPhoto && styles.uploadBoxSuccess]}
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
      </View>

      {/* Government ID */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.governmentId")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.uploadBox, governmentId && styles.uploadBoxSuccess]}
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
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
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
});
