import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PasscodeChange() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [passcode, setPasscode] = useState("");
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success"); // 'success' or 'error'

  const handleNumberPress = (num) => {
    if (passcode.length < 4) {
      const newCode = passcode + num;
      setPasscode(newCode);
      
      if (newCode.length === 4) {
        setTimeout(() => {
          if (currentStep === 1) {
            setCurrentPasscode(newCode);
            setPasscode("");
            setCurrentStep(2);
          } else if (currentStep === 2) {
            setNewPasscode(newCode);
            setPasscode("");
            setCurrentStep(3);
          } else if (currentStep === 3) {
            if (newCode === newPasscode) {
              setAlertType("success");
              setAlertMessage("Passcode changed successfully!");
              setAlertVisible(true);
            } else {
              setAlertType("error");
              setAlertMessage("Passcodes do not match. Please try again.");
              setAlertVisible(true);
              setPasscode("");
            }
          }
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    setPasscode(passcode.slice(0, -1));
  };

  const getStepTitle = () => {
    if (currentStep === 1) return "Enter your current 4-digit PIN";
    if (currentStep === 2) return "Enter your new 4-digit passcode";
    return "Confirm your new 4-digit passcode";
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertType === "success") {
      router.back();
    }
  };

  return (
    <LinearGradient
      colors={["#E25A17", "#F28934"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/inspireloader.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Passcode Indicators */}
        <View style={styles.indicatorContainer}>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                passcode.length > index && styles.indicatorFilled,
              ]}
            />
          ))}
        </View>

        {/* Title */}
        <Text style={styles.title}>{getStepTitle()}</Text>

        {/* Keypad */}
        <View style={styles.keypadContainer}>
          <View style={styles.keypadRow}>
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keyButton}
                onPress={() => handleNumberPress(num.toString())}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {[4, 5, 6].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keyButton}
                onPress={() => handleNumberPress(num.toString())}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {[7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keyButton}
                onPress={() => handleNumberPress(num.toString())}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            <View style={styles.keyButton} />
            
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleNumberPress("0")}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keyButton}
              onPress={handleDelete}
            >
              <Ionicons name="backspace-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Alert Modal */}
        <Modal
          visible={alertVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handleAlertClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalIconContainer}>
                  <Ionicons
                    name={alertType === "success" ? "checkmark-circle" : "alert-circle"}
                    size={60}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.modalMessage}>{alertMessage}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleAlertClose}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  helpButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  indicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  indicatorFilled: {
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 60,
    opacity: 0.9,
  },
  keypadContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 20,
  },
  keyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 30,
    alignItems: "center",
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  modalButtonText: {
    color: "#E25A17",
    fontSize: 16,
    fontWeight: "600",
  },
});
