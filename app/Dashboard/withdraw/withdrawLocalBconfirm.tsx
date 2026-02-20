import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, firestore } from "../../../configs/firebase";

export default function WithdrawLocalBConfirm() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as { method?: string; accountNumber?: string; accountHolderName?: string; bankName?: string; branchName?: string; amount?: string; email?: string };
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string }>({ title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const method = params?.method || "local-bank";
  const accountNumber = params?.accountNumber || "";
  const accountHolderName = params?.accountHolderName || "";
  const bankName = params?.bankName || "";
  const branchName = params?.branchName || "";
  const amount = params?.amount || "0";
  const email = params?.email || "";

  const handleConfirm = async () => {
    if (isSubmitting) return;
    if (!auth || !firestore) return;

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setAlertConfig({
          title: "Error",
          message: "User not authenticated"
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }

      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setAlertConfig({
          title: "Error",
          message: "User data not found"
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }

      const userData = userDocSnap.data() as { firstName?: string; lastName?: string };

      const withdrawalData = {
        userId: user.uid,
        userName: `${userData.firstName} ${userData.lastName}`,
        userEmail: email,
        type: "Withdrawal",
        method: method === "local-bank" ? "Local Bank" : "E-Wallet",
        accountNumber: accountNumber,
        accountHolderName: accountHolderName,
        bankName: bankName,
        branchName: branchName,
        amount: parseFloat(amount),
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, "withdrawalRequests"), withdrawalData);

      // Show success modal
      setAlertConfig({
        title: "Success",
        message: "Your withdrawal request has been submitted successfully!"
      });
      setShowAlertModal(true);

      // Navigate back after a delay
      setTimeout(() => {
        setShowAlertModal(false);
        navigation.navigate("Main");
      }, 2000);
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      setAlertConfig({
        title: "Error",
        message: "Failed to submit withdrawal request. Please try again."
      });
      setShowAlertModal(true);
      setIsSubmitting(false);
    }
  };

  const formatAmount = (value: string) => {
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
            onPress={() => navigation.goBack()}
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
            <View style={[styles.stepCircle, styles.stepActive]}>
              <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Review & Confirm</Text>
            <Text style={styles.subtitle}>Review your withdrawal details</Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.orangeHeader}>
              <Text style={styles.orangeHeaderText}>Withdrawal Details</Text>
            </View>

            {/* Withdrawal Method */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Withdrawal Method</Text>
                <Text style={styles.detailValue}>Local Bank</Text>
              </View>
            </View>

            {/* Bank Account Number */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Bank Account Number *</Text>
                <Text style={styles.detailValue}>{accountNumber}</Text>
              </View>
            </View>

            {/* Account Holder Name */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Account Holder Name *</Text>
                <Text style={styles.detailValue}>{accountHolderName}</Text>
              </View>
            </View>

            {/* Bank Name */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Bank Name *</Text>
                <Text style={styles.detailValue}>{bankName}</Text>
              </View>
            </View>

            {/* Branch Name */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Branch Name *</Text>
                <Text style={styles.detailValue}>{branchName}</Text>
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.detailRow}>
              <View style={styles.leftBorder} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address *</Text>
                <Text style={styles.detailValue}>{email}</Text>
              </View>
            </View>
          </View>

          {/* Withdrawal Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Withdrawal Amount (₱) *</Text>
            <View style={styles.amountBox}>
              <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.confirmGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.confirmText}>Confirm</Text>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
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
                onPress={() => {
                  setShowAlertModal(false);
                  if (alertConfig.title === "Success") {
                    navigation.navigate("Main");
                  }
                }}
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  orangeHeader: {
    backgroundColor: "#E25A17",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  orangeHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailRow: {
    position: "relative",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#E25A17",
  },
  detailContent: {
    paddingLeft: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: "#999",
  },
  amountCard: {
    backgroundColor: "#E25A17",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  amountBox: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  confirmButton: {
    borderRadius: 25,
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
    paddingVertical: 16,
    gap: 8,
  },
  confirmText: {
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
