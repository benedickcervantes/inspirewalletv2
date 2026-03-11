import { useNavigation } from "@react-navigation/native";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const THEME_COLOR = "#E15816";
const STAMP_COLOR = "#C23A2B";

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
          {/* Stamp-style badge */}
          <View style={styles.stampContainer}>
            <View style={styles.stampBorder} />
            <Text style={styles.stampText}>UNDER</Text>
            <Text style={styles.stampText}>MAINTENANCE</Text>
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
  stampContainer: {
    width: 140,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    transform: [{ rotate: "-12deg" }],
  },
  stampBorder: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderWidth: 3,
    borderColor: STAMP_COLOR,
    borderRadius: 4,
    borderStyle: "dashed",
    opacity: 0.9,
  },
  stampText: {
    fontSize: 16,
    fontWeight: "800",
    color: STAMP_COLOR,
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.85,
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
