import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../../context/LanguageContext";
import ActivityModal from "./ActivityModal";

type FeatureMaintenanceModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

export default function FeatureMaintenanceModal({
  visible,
  onDismiss,
}: FeatureMaintenanceModalProps) {
  const { t } = useLanguage();

  return (
    <ActivityModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.alertOverlay}>
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={styles.alertContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Text style={styles.alertTitle}>
            {t("maintenance.featureInMaintenanceTitle")}
          </Text>
          <Text style={styles.alertMessage}>
            {t("maintenance.featureInMaintenanceMessage")}
          </Text>
          <TouchableOpacity style={styles.alertButton} onPress={onDismiss}>
            <Text style={styles.alertButtonText}>{t("common.ok")}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </ActivityModal>
  );
}

const styles = StyleSheet.create({
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
});
