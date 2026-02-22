import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOrCreateMainWallet } from "../../../configs/api";
import { auth, firestore } from "../../../configs/firebase";

const { width } = Dimensions.get("window");

// Reusable function to fetch user balances (JWT or Firebase)
export const fetchUserBalances = async () => {
  const accessToken = await AsyncStorage.getItem("access_token");
  if (accessToken) {
    const { success, wallet } = await getOrCreateMainWallet(accessToken);
    const bal = success && wallet?.balance != null ? parseFloat(String(wallet.balance)) : 0;
    return {
      availableBalance: Number.isNaN(bal) ? 0 : bal,
      agentWallet: 0,
      userData: null,
    };
  }
  if (!auth || !firestore) {
    throw new Error("Firebase not configured");
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found");
  }
  const userDoc = await getDoc(doc(firestore, "users", user.uid));
  if (!userDoc.exists()) {
    throw new Error("User document not found");
  }
  const userData = userDoc.data() as Record<string, unknown>;
  return {
    availableBalance: Number(userData?.balance ?? userData?.availBalanceAmount ?? 0) || 0,
    agentWallet: Number(userData?.agentWallet ?? userData?.agentWalletAmount ?? 0) || 0,
    userData,
  };
};

// Reusable function to validate balance selection
export const validateBalanceSelection = (selectedBalance: string | null, agentWallet: number) => {
  if (!selectedBalance) {
    return {
      isValid: false,
      message: "Please select a balance type to continue",
    };
  }

  if (selectedBalance === "agent" && agentWallet === 0) {
    return {
      isValid: false,
      message: "Agent wallet has insufficient balance",
    };
  }

  return {
    isValid: true,
    message: "Balance selection is valid",
  };
};

// Reusable function to format currency
export const formatCurrency = (amount: number) => {
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Reusable function to check if balance is sufficient
export const checkSufficientBalance = (balanceType: string, availableBalance: number, agentWallet: number, amount: number) => {
  const balance = balanceType === "available" ? availableBalance : agentWallet;
  return balance >= amount;
};

export default function SendMoney() {
  const navigation = useNavigation();
  const [selectedBalance, setSelectedBalance] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [agentWallet, setAgentWallet] = useState(0);
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      const balances = await fetchUserBalances();
      setAvailableBalance(Number(balances.availableBalance) || 0);
      setAgentWallet(Number(balances.agentWallet) || 0);
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  };

  const handleContinue = () => {
    const validation = validateBalanceSelection(selectedBalance, agentWallet);
    
    if (!validation.isValid) {
      setShowAlertModal(true);
      return;
    }

    // Navigate to next step with selected balance
    navigation.navigate("TransferRecipient", { balanceType: selectedBalance ?? "available" });
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
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Money</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="qr-code" size={28} color="#E25A17" />
              </View>
              <Text style={styles.quickActionText}>My QR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="scan" size={28} color="#E25A17" />
              </View>
              <Text style={styles.quickActionText}>Scan QR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="people" size={28} color="#E25A17" />
              </View>
              <Text style={styles.quickActionText}>Contacts</Text>
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicatorContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle} />
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle} />
            </View>
          </View>

          <Text style={styles.stepLabel}>Step 1 of 3</Text>

          {/* Step Title */}
          <Text style={styles.stepTitle}>Select Balance Type</Text>
          <Text style={styles.stepSubtitle}>
            Choose which balance to use for transfer
          </Text>

          {/* Balance Cards */}
          <View style={styles.balanceCardsContainer}>
            {/* Available Balance Card */}
            <TouchableOpacity
              style={[
                styles.balanceCard,
                selectedBalance === "available" && styles.balanceCardSelected,
              ]}
              onPress={() => setSelectedBalance("available")}
            >
              <View style={styles.balanceCardHeader}>
                <View style={styles.balanceIconContainer}>
                  <Ionicons name="wallet" size={24} color="#E25A17" />
                </View>
                <View style={styles.balanceInfo}>
                  <Text style={styles.balanceTitle}>Available Balance</Text>
                  <Text style={styles.balanceSubtitle}>Main wallet balance</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedBalance === "available" && styles.radioButtonSelected,
                  ]}
                >
                  {selectedBalance === "available" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              <View style={styles.balanceAmountContainer}>
                <Text style={styles.balanceAmount}>
                  PHP {formatCurrency(availableBalance)}
                </Text>
                <View style={styles.availableBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.availableBadgeText}>Available</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Agent Wallet Card */}
            <TouchableOpacity
              style={[
                styles.balanceCard,
                selectedBalance === "agent" && styles.balanceCardSelected,
                agentWallet === 0 && styles.balanceCardDisabled,
              ]}
              onPress={() => agentWallet > 0 && setSelectedBalance("agent")}
              disabled={agentWallet === 0}
            >
              <View style={styles.balanceCardHeader}>
                <View style={styles.balanceIconContainer}>
                  <Ionicons name="briefcase" size={24} color="#E25A17" />
                </View>
                <View style={styles.balanceInfo}>
                  <Text style={styles.balanceTitle}>Agent Wallet</Text>
                  <Text style={styles.balanceSubtitle}>Commission earnings</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedBalance === "agent" && styles.radioButtonSelected,
                  ]}
                >
                  {selectedBalance === "agent" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              <View style={styles.balanceAmountContainer}>
                <Text style={styles.balanceAmount}>
                  PHP {formatCurrency(agentWallet)}
                </Text>
                {agentWallet === 0 ? (
                  <View style={styles.insufficientBadge}>
                    <Ionicons name="alert-circle" size={14} color="#F44336" />
                    <Text style={styles.insufficientBadgeText}>Insufficient</Text>
                  </View>
                ) : (
                  <View style={styles.availableBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={styles.availableBadgeText}>Available</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedBalance && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedBalance}
          >
            <LinearGradient
              colors={
                !selectedBalance ? ["#CCC", "#999"] : ["#E25A17", "#F28934"]
              }
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Selection Required</Text>
                <Text style={styles.modalMessage}>
                  Please select a balance type to continue
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowAlertModal(false)}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
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
    paddingHorizontal: 20,
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
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: width * 0.05,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: width * 0.03,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
  },
  quickActionIcon: {
    width: width * 0.17,
    height: width * 0.17,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionText: {
    fontSize: width * 0.034,
    fontWeight: "500",
    color: "#333",
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    paddingHorizontal: 40,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLabel: {
    fontSize: 14,
    color: "#E25A17",
    textAlign: "left",
    marginBottom: 16,
    fontWeight: "500",
  },
  stepTitle: {
    fontSize: width * 0.058,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: width * 0.037,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  balanceCardsContainer: {
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: width * 0.05,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceCardSelected: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF5F0",
  },
  balanceCardDisabled: {
    opacity: 0.6,
  },
  balanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 13,
    color: "#999",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#E25A17",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E25A17",
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  availableBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  insufficientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  insufficientBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F44336",
  },
  continueButton: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  continueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.95,
  },
  modalButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E25A17",
    textAlign: "center",
  },
});
