import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, doc, firestore, getDoc } from "../../../configs/firebase";

export default function TimeDepositConfirm() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as { depositMethod?: string; contractPeriod?: string; amount?: string; currency?: string };

  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const depositMethod = params.depositMethod || "Request Amount";
  const contractPeriod = params.contractPeriod || "";
  const amount = params.amount || "0";
  const currency = params.currency || "PHP";

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (!auth || !firestore) return;
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as Record<string, unknown>;
          setUserData(data);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const getMaturityDate = () => {
    const months = contractPeriod === "6 Months" ? 6 : contractPeriod === "1 Year" ? 12 : 24;
    return `${months} Months`;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (!auth || !firestore) return;
      const user = auth.currentUser;
      if (!user) return;

      const depositData = {
        userId: user.uid,
        userName: userData ? `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim() || user.email : user.email,
        userEmail: userData?.email ?? user.email,
        type: "Time Deposit",
        depositMethod: depositMethod,
        currency: currency,
        amount: parseFloat(amount),
        contractPeriod: contractPeriod,
        maturityDate: getMaturityDate(),
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, "depositRequests"), depositData);

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting deposit:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToMain = () => {
    setShowSuccessModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
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

          <Text style={styles.headerTitle}>Deposit Request</Text>

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
              <MaterialCommunityIcons name="clipboard-check" size={16} color="#FFFFFF" />
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
            <Text style={styles.subtitle}>Review your deposit details</Text>
          </View>

          {/* Main Content Container */}
          <View style={styles.contentContainer}>
            {/* Left Side - Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Deposit Type</Text>
                <Text style={styles.detailValue}>Time Deposit</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Contract Period *</Text>
                <Text style={styles.detailValue}>{contractPeriod}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Deposit Method</Text>
                <Text style={styles.detailValue}>{depositMethod}</Text>
              </View>
            </View>

            {/* Right Side - Investment Amount Card */}
            <LinearGradient
              colors={["#F28934", "#E25A17"]}
              style={styles.amountCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.amountCardTitle}>Investment Amount</Text>
              <View style={styles.amountDisplay}>
                <Text style={styles.amountValue}>
                  {currency} {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Deposit Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Deposit Summary</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Principal Amount</Text>
                <Text style={styles.summaryValue}>
                  {currency} {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Maturity</Text>
                <Text style={styles.summaryValue}>{getMaturityDate()}</Text>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={styles.statusValue}>Pending</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={loading}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.confirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.confirmText}>
                  {loading ? "Processing..." : "Confirm"}
                </Text>
                {!loading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={goToMain}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <LinearGradient
                colors={["#E15816", "#F48F38"]}
                style={styles.successModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Success</Text>
                <Text style={styles.successMessage}>
                  Your time deposit request has been submitted successfully!
                </Text>
                <TouchableOpacity
                  style={styles.successButton}
                  onPress={goToMain}
                >
                  <Text style={styles.successButtonText}>OK</Text>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingVertical: 20,
    paddingHorizontal: 40,
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
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  contentContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  detailsSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  detailItem: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  amountCard: {
    width: 180,
    borderRadius: 12,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  amountCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  amountDisplay: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    alignItems: "center",
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  statusContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statusLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF50",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
    height: 20,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successModalGradient: {
    padding: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.95,
  },
  successButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
});
