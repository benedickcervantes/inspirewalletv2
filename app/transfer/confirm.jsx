import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function TransferConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const balanceType = params.balanceType;
  const accountNumber = params.accountNumber;
  const amount = parseFloat(params.amount);
  const description = params.description || "N/A";
  const recipientName = params.recipientName;
  const recipientId = params.recipientId;

  const [currentBalance, setCurrentBalance] = useState(0);
  const [newBalance, setNewBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          let balance = 0;
          if (balanceType === "available") {
            balance = userData.balance || userData.availBalanceAmount || 0;
          } else {
            balance = userData.agentWallet || userData.agentWalletAmount || 0;
          }
          setCurrentBalance(balance);
          setNewBalance(balance - amount);
        }
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    const names = name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setErrorMessage("User not authenticated");
        setShowErrorModal(true);
        setIsProcessing(false);
        return;
      }

      // Get sender data
      const senderDoc = await getDoc(doc(firestore, "users", user.uid));
      const senderData = senderDoc.data();

      // Get recipient data
      const recipientDoc = await getDoc(doc(firestore, "users", recipientId));
      const recipientData = recipientDoc.data();

      // Update sender balance
      const senderRef = doc(firestore, "users", user.uid);
      if (balanceType === "available") {
        await updateDoc(senderRef, {
          balance: currentBalance - amount,
          availBalanceAmount: currentBalance - amount,
        });
      } else {
        await updateDoc(senderRef, {
          agentWallet: currentBalance - amount,
          agentWalletAmount: currentBalance - amount,
        });
      }

      // Update recipient balance
      const recipientRef = doc(firestore, "users", recipientId);
      const recipientBalance = recipientData.balance || recipientData.availBalanceAmount || 0;
      await updateDoc(recipientRef, {
        balance: recipientBalance + amount,
        availBalanceAmount: recipientBalance + amount,
      });

      // Create transaction record for sender
      await addDoc(collection(firestore, "transactions"), {
        userId: user.uid,
        type: "transfer_sent",
        amount: -amount,
        balanceType: balanceType,
        recipientId: recipientId,
        recipientName: recipientName,
        recipientAccountNumber: accountNumber,
        description: description,
        status: "completed",
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString(),
      });

      // Create transaction record for recipient
      await addDoc(collection(firestore, "transactions"), {
        userId: recipientId,
        type: "transfer_received",
        amount: amount,
        balanceType: "available",
        senderId: user.uid,
        senderName: senderData.fullName || senderData.name || "Unknown",
        senderAccountNumber: senderData.accountNumber,
        description: description,
        status: "completed",
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString(),
      });

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error processing transfer:", error);
      setErrorMessage("Transfer failed. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    router.replace("/main");
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
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>
            <View style={[styles.stepLine, styles.stepLineCompleted]} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>
            <View style={[styles.stepLine, styles.stepLineCompleted]} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Step Title */}
          <Text style={styles.stepTitle}>Confirm Transfer</Text>
          <Text style={styles.stepSubtitle}>Review your transfer details</Text>

          {/* Recipient Card */}
          <View style={styles.recipientCard}>
            <Text style={styles.recipientLabel}>To</Text>
            <View style={styles.recipientInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(recipientName)}</Text>
              </View>
              <View style={styles.recipientDetails}>
                <Text style={styles.recipientName}>{recipientName}</Text>
                <Text style={styles.recipientAccount}>{accountNumber}</Text>
              </View>
            </View>
          </View>

          {/* Transfer Details Card */}
          <LinearGradient
            colors={["#F28934", "#E25A17"]}
            style={styles.detailsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsLabel}>Amount to Transfer</Text>
            </View>
            <Text style={styles.amountText}>
              PHP {amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>From</Text>
              <View style={styles.detailsRowValue}>
                <Text style={styles.detailsRowText}>
                  {balanceType === "available" ? "Available Balance" : "Agent Wallet"}
                </Text>
              </View>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>Description (Optional)</Text>
              <View style={styles.detailsRowValue}>
                <Text style={styles.detailsRowText}>{description}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Balance Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Current Balance</Text>
                <Text style={styles.summaryValue}>
                  PHP {currentBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>New Balance</Text>
                <Text style={styles.summaryValue}>
                  PHP {newBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
            <View style={styles.transferAmountRow}>
              <Text style={styles.transferAmountLabel}>Transfer Amount</Text>
              <Text style={styles.transferAmountValue}>
                -{amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.confirmGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.confirmText}>Confirm</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.checkIconContainer}>
                  <Ionicons name="checkmark-circle" size={80} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Transfer Complete!</Text>
                <Text style={styles.modalMessage}>
                  Your transfer of PHP {amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to {recipientName} has been completed successfully.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSuccessOk}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={showErrorModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowErrorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.checkIconContainer}>
                  <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Error</Text>
                <Text style={styles.modalMessage}>{errorMessage}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowErrorModal(false)}
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
    marginBottom: 24,
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
  stepCircleCompleted: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: "#E25A17",
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  recipientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recipientLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 12,
  },
  recipientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFD4B8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E25A17",
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  recipientAccount: {
    fontSize: 14,
    color: "#999",
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  detailsHeader: {
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  amountText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailsRowLabel: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  detailsRowValue: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsRowText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  transferAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  transferAmountLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  transferAmountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  confirmButton: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  confirmText: {
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
  checkIconContainer: {
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
