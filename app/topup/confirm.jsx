import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function TopUpConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currency = params.currency || "PHP";
  const amount = params.amount || "0";
  const currencySymbol = params.currencySymbol || "₱";

  const handleConfirm = async () => {
    if (isSubmitting) return;
    
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

      const userData = userDocSnap.data();

      const topUpData = {
        userId: user.uid,
        userName: `${userData.firstName} ${userData.lastName}`,
        userEmail: userData.email,
        type: "Top Up Balance",
        currency: currency,
        amount: parseFloat(amount),
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, "depositRequests"), topUpData);

      // Show success modal
      setAlertConfig({
        title: "Success",
        message: "Your top-up request has been submitted successfully!"
      });
      setShowAlertModal(true);
      
      // Navigate back after a delay
      setTimeout(() => {
        setShowAlertModal(false);
        router.push("/main");
      }, 2000);
    } catch (error) {
      console.error("Error submitting top-up:", error);
      setAlertConfig({
        title: "Error",
        message: "Failed to submit top-up request. Please try again."
      });
      setShowAlertModal(true);
      setIsSubmitting(false);
    }
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
            <Text style={styles.subtitle}>Review your deposit details</Text>
          </View>

          {/* Deposit Type Card */}
          <View style={styles.detailCard}>
            <View style={styles.leftBorder} />
            <Text style={styles.detailLabel}>Deposit Type</Text>
            <Text style={styles.detailValue}>Top Up Available Balance</Text>
          </View>

          {/* Investment Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Investment Amount</Text>
            <Text style={styles.amountValue}>{amount} {currency}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

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
                <Ionicons name="play" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

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
                    router.push("/main");
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
    paddingHorizontal: 80,
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
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#E25A17",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: "#666",
  },
  amountCard: {
    backgroundColor: "#FFF5F0",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E25A17",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
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
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
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
