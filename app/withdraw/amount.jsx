import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function WithdrawAmount() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });
  const [userData, setUserData] = useState(null);

  const method = params.method || "e-wallet";
  const walletType = params.walletType || "";
  const accountNumber = params.accountNumber || "";
  const accountName = params.accountName || "";

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);
          setEmailAddress(data.email || "");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleContinue = () => {
    // Validation
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      setAlertConfig({
        title: "Invalid Amount",
        message: "Please enter a valid withdrawal amount"
      });
      setShowAlertModal(true);
      return;
    }

    if (!emailAddress) {
      setAlertConfig({
        title: "Missing Information",
        message: "Please enter your email address"
      });
      setShowAlertModal(true);
      return;
    }

    // Navigate to confirm page
    router.push({
      pathname: "/withdraw/ewalletconfirm",
      params: {
        method,
        walletType,
        accountNumber,
        accountName,
        amount: withdrawalAmount,
        email: emailAddress,
      }
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Withdrawal Request</Text>

          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Wallet Amount (₱)</Text>
            <Text style={styles.subtitle}>Enter withdrawal amount and contact information</Text>
          </View>

          {/* Withdrawal Amount */}
          <View style={styles.inputContainer}>
            <View style={styles.labelWithIcon}>
              <MaterialCommunityIcons name="cash" size={20} color="#E25A17" />
              <Text style={styles.inputLabel}>Withdrawal Amount</Text>
            </View>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter withdrawal amount"
                placeholderTextColor="#CCC"
                value={withdrawalAmount}
                onChangeText={setWithdrawalAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputContainer}>
            <View style={styles.labelWithIcon}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#E25A17" />
              <Text style={styles.inputLabel}>Email Address *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="sample@gmail.com"
              placeholderTextColor="#CCC"
              value={emailAddress}
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="play" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Custom Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowAlertModal(false)}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingVertical: 24,
    paddingHorizontal: 60,
    backgroundColor: "#FFFFFF",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#E25A17",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 32,
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currencySymbol: {
    fontSize: 18,
    color: "#E25A17",
    fontWeight: "600",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: "#333",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  continueButton: {
    marginTop: 16,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  continueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 20,
  },
  // Alert Modal Styles
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
