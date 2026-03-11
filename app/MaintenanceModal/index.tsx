import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const THEME_COLOR = "#E15816";

interface MaintenanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MaintenanceModal({ visible, onClose }: MaintenanceModalProps) {
  const navigation = useNavigation();

  const handleGoBack = () => {
    onClose();
    try {
      if (navigation.canGoBack?.()) {
        navigation.goBack();
      }
    } catch (error) {
      console.log("Navigation back not available");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleGoBack}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="tools"
                size={22}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.title}>Under maintenance</Text>
          </View>
          <Text style={styles.modalMessage}>
            This service is currently under maintenance. We're working hard to
            bring you an improved experience. Please check back soon!
          </Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleGoBack}
          >
            <Text style={styles.modalButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default MaintenanceModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "80%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: "100%",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
