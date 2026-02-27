import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

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
            color="#E25A17"
          />
        </View>
        <View>
          <Text style={styles.formTitle}>
            {t("travel.requiredDocs")}
          </Text>
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
          style={styles.uploadBox}
          onPress={onPickPassportPhoto}
        >
          <MaterialCommunityIcons
            name="camera"
            size={40}
            color={passportPhoto ? "#4CAF50" : "#E25A17"}
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
          <Text style={styles.uploadSubtext}>{t("travel.tapToSelectImage")}</Text>
        </TouchableOpacity>
      </View>

      {/* Government ID */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.governmentId")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={onPickGovernmentId}
        >
          <MaterialCommunityIcons
            name="card-account-details"
            size={40}
            color={governmentId ? "#4CAF50" : "#E25A17"}
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
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E25A17",
  },
  uploadBox: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E25A17",
    marginTop: 12,
  },
  uploadTextSuccess: {
    color: "#4CAF50",
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});
