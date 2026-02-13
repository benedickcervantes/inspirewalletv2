import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot, collection, query, orderBy, updateDoc, increment, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function AccumulatedPoints() {
  const navigation = useNavigation();
  const router = useRouter();
  const [userLanguage, setUserLanguage] = useState("english");
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Real-time listener for user data
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(firestore, "users", user.uid);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
          setAccumulatedPoints(data.accumulatedPoints || 0);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to user data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for points transactions
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setTransactionsLoading(false);
      return;
    }

    setTransactionsLoading(true);
    const transactionsRef = collection(firestore, "users", user.uid, "pointsTransactions");
    const transactionsQuery = query(transactionsRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      transactionsQuery,
      (querySnapshot) => {
        const fetchedTransactions = [];
        querySnapshot.forEach((doc) => {
          fetchedTransactions.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTransactions(fetchedTransactions);
        setTransactionsLoading(false);
        console.log("Points transactions:", fetchedTransactions.length);
      },
      (error) => {
        console.error("Error listening to transactions:", error);
        setTransactionsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "accumulatedPoints.header.title") || "Accumulated Points",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [navigation, userLanguage]);

  const handleWithdraw = () => {
    if (accumulatedPoints <= 0) {
      Alert.alert(
        t(userLanguage, "accumulatedPoints.error") || "Error",
        t(userLanguage, "accumulatedPoints.noPointsToWithdraw") || "You don't have any points to withdraw"
      );
      return;
    }

    // Reset modal state and open
    setSelectedAmount(null);
    setSelectedPaymentMethod(null);
    setMobileNumber("");
    setWithdrawalModalVisible(true);
  };

  const withdrawalAmounts = [50, 100, 300, 500, 1000, 2000];

  const handleSubmitWithdrawal = () => {
    // Validation
    if (!selectedAmount) {
      Alert.alert(
        t(userLanguage, "accumulatedPoints.error") || "Error",
        t(userLanguage, "accumulatedPoints.selectAmount") || "Please select an amount"
      );
      return;
    }

    if (selectedAmount > accumulatedPoints) {
      Alert.alert(
        t(userLanguage, "accumulatedPoints.error") || "Error",
        t(userLanguage, "accumulatedPoints.insufficientPoints") || "Insufficient points"
      );
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert(
        t(userLanguage, "accumulatedPoints.error") || "Error",
        t(userLanguage, "accumulatedPoints.selectPaymentMethod") || "Please select a payment method"
      );
      return;
    }

    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert(
        t(userLanguage, "accumulatedPoints.error") || "Error",
        t(userLanguage, "accumulatedPoints.enterValidMobile") || "Please enter a valid mobile number"
      );
      return;
    }

    processWithdraw();
  };

  const processWithdraw = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setWithdrawing(true);

      // Get user data for additional info
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Create withdrawal request in taskWithdrawRequest collection
      const taskWithdrawRequestRef = collection(firestore, "taskWithdrawRequest");
      const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
      const withdrawalRequest = await addDoc(taskWithdrawRequestRef, {
        userId: user.uid,
        userEmail: user.email || "",
        userName: userName || "",
        amount: selectedAmount,
        amountInPeso: selectedAmount, // 1 point = 1 peso
        paymentMethod: selectedPaymentMethod,
        mobileNumber: mobileNumber,
        status: "pending",
        createdAt: serverTimestamp(),
        processedAt: null,
        processedBy: null,
        balanceBefore: accumulatedPoints,
        balanceAfter: accumulatedPoints - selectedAmount
      });

      console.log("Withdrawal request created:", withdrawalRequest.id);
      
      // Update user's accumulated points (deduct immediately)
      await updateDoc(userDocRef, {
        accumulatedPoints: increment(-selectedAmount)
      });

      // Add withdrawal transaction to user's history
      const transactionsRef = collection(firestore, "users", user.uid, "pointsTransactions");
      await addDoc(transactionsRef, {
        type: "withdrawal",
        amount: -selectedAmount,
        description: `${t(userLanguage, "accumulatedPoints.withdrawalTo") || "Withdrawal to"} ${selectedPaymentMethod} - ${mobileNumber}`,
        createdAt: serverTimestamp(),
        balanceAfter: accumulatedPoints - selectedAmount,
        paymentMethod: selectedPaymentMethod,
        mobileNumber: mobileNumber,
        status: "pending",
        requestId: withdrawalRequest.id
      });

      // Add notification
      const userNotificationsRef = collection(firestore, "users", user.uid, "notifications");
      await addDoc(userNotificationsRef, {
        title: t(userLanguage, "accumulatedPoints.withdrawalRequestTitle") || "Withdrawal Request Submitted",
        message: `${t(userLanguage, "accumulatedPoints.withdrawalRequestMessage") || "Your withdrawal request for"} ${selectedAmount.toLocaleString()} ${t(userLanguage, "accumulatedPoints.pointsTo") || "points (₱"+ selectedAmount.toLocaleString() +")} to"} ${selectedPaymentMethod} ${t(userLanguage, "accumulatedPoints.hasBeenSubmitted") || "has been submitted"}`,
        createdAt: serverTimestamp(),
        type: "points_withdrawal",
        points: selectedAmount,
        requestId: withdrawalRequest.id,
        read: false
      });

      // Close modal and show success
      setWithdrawalModalVisible(false);
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      Alert.alert(
        t(userLanguage, "accumulatedPoints.error") || "Error",
        t(userLanguage, "accumulatedPoints.withdrawalError") || "Failed to process withdrawal. Please try again."
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "earned":
      case "task_completed":
        return "add-circle";
      case "withdrawal":
        return "remove-circle";
      case "bonus":
        return "gift";
      default:
        return "swap-horizontal";
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case "earned":
      case "task_completed":
      case "bonus":
        return "#4CAF50";
      case "withdrawal":
        return "#F44336";
      default:
        return "#999";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Premium Points Balance Card */}
          <TouchableOpacity style={styles.balanceCard} activeOpacity={1}>
            <LinearGradient
              colors={['#FF9500', '#FFB84D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCardGradient}
            >
              <View style={styles.balanceIconWrapper}>
                <Ionicons 
                  name="trophy" 
                  size={width * 0.1} 
                  color="#fff" 
                />
              </View>
              <Text style={[styles.balanceLabel, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "accumulatedPoints.yourBalance") || "Your Balance"}
              </Text>
              {loading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Text style={styles.balanceValue}>
                  {accumulatedPoints.toLocaleString()}
                </Text>
              )}
              <Text style={[styles.balanceSubtext, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "accumulatedPoints.points") || "points"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Withdraw Button */}
          <TouchableOpacity 
            style={[
              styles.withdrawButton,
              (withdrawing || accumulatedPoints <= 0) && styles.withdrawButtonDisabled
            ]}
            onPress={handleWithdraw}
            disabled={withdrawing || accumulatedPoints <= 0}
            activeOpacity={0.8}
          >
            {withdrawing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="wallet" size={width * 0.05} color="#fff" />
                <Text style={styles.withdrawButtonText}>
                  {t(userLanguage, "accumulatedPoints.withdraw") || "Withdraw Points"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Transaction History */}
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "accumulatedPoints.transactionHistory") || "Transaction History"}
              </Text>
            </View>

            {transactionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.redTheme.background} />
                <Text style={styles.loadingText}>
                  {t(userLanguage, "accumulatedPoints.loadingTransactions") || "Loading transactions..."}
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name="receipt-outline" 
                  size={width * 0.15} 
                  color="#ccc" 
                />
                <Text style={styles.emptyText}>
                  {t(userLanguage, "accumulatedPoints.noTransactions") || "No transactions yet"}
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {transactions.map((transaction) => {
                  const isPositive = transaction.amount > 0;
                  const transactionColor = getTransactionColor(transaction.type);
                  
                  return (
                    <View key={transaction.id} style={styles.transactionCard}>
                      <View style={[styles.transactionIcon, { backgroundColor: transactionColor + '20' }]}>
                        <Ionicons 
                          name={getTransactionIcon(transaction.type)} 
                          size={width * 0.055} 
                          color={transactionColor} 
                        />
                      </View>
                      <View style={styles.transactionContent}>
                        <Text style={[styles.transactionDescription, getRTLStyles(userLanguage)]}>
                          {transaction.description || t(userLanguage, "accumulatedPoints.transaction") || "Transaction"}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {formatDate(transaction.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.transactionAmountContainer}>
                        <Text style={[
                          styles.transactionAmount,
                          { color: transactionColor }
                        ]}>
                          {isPositive ? '+' : ''}{transaction.amount.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={withdrawalModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWithdrawalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header with Close Button */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdraw</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setWithdrawalModalVisible(false)}
                >
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Conversion Note */}
              <View style={styles.conversionNote}>
                <Ionicons name="information-circle" size={24} color="#E15816" />
                <Text style={styles.conversionNoteText}>
                  1 point is exactly equal to ₱1.00
                </Text>
              </View>

              {/* Mobile Number Input */}
              <Text style={styles.sectionLabel}>Mobile number</Text>
              <TextInput
                style={styles.mobileInput}
                placeholder=""
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                maxLength={11}
              />

              {/* Amount Selection */}
              <Text style={styles.sectionLabel}>Choose Amount</Text>
              <Text style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                Available Points: {accumulatedPoints}
              </Text>
              
              {/* Custom Amount Input */}
              <View style={styles.customAmountContainer}>
                <TextInput
                  style={styles.customAmountInput}
                  placeholder="Enter exact amount"
                  placeholderTextColor="#BDBDBD"
                  keyboardType="numeric"
                  value={selectedAmount ? selectedAmount.toString() : ""}
                  onChangeText={(text) => {
                    const numValue = parseInt(text) || 0;
                    setSelectedAmount(numValue > 0 ? numValue : null);
                  }}
                />
                <Text style={styles.customAmountLabel}>points</Text>
              </View>

              {/* Quick Amount Buttons */}
              <Text style={styles.quickAmountLabel}>Or choose quick amount:</Text>
              <View style={styles.amountGrid}>
                {withdrawalAmounts.map((amount) => {
                  const isSelected = selectedAmount === amount;
                  const hasEnoughPoints = amount <= accumulatedPoints;
                  
                  return (
                    <TouchableOpacity
                      key={amount}
                      activeOpacity={0.6}
                      style={[
                        styles.amountButton,
                        isSelected && styles.amountButtonSelected,
                      ]}
                      onPress={() => {
                        console.log("Setting amount to:", amount);
                        setSelectedAmount(amount);
                      }}
                    >
                      <Text style={[
                        styles.amountButtonText,
                        isSelected && styles.amountButtonTextSelected,
                        !hasEnoughPoints && styles.amountButtonTextInsufficient,
                      ]}>
                        {amount}
                      </Text>
                      {!hasEnoughPoints && (
                        <Text style={styles.insufficientLabel}>Insufficient</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payment Method Selection */}
              <Text style={styles.sectionLabel}>Receiving Method</Text>
              <View style={styles.paymentMethodContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === "GCash" && styles.paymentMethodButtonSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod("GCash")}
                >
                  <Image 
                    source={require("../../assets/images/gcash2.0.png")} 
                    style={styles.paymentMethodImage}
                    resizeMode="contain"
                  />
                  <Text style={[
                    styles.paymentMethodText,
                    selectedPaymentMethod === "GCash" && styles.paymentMethodTextSelected
                  ]}>
                    GCash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === "PayMaya" && styles.paymentMethodButtonSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod("PayMaya")}
                >
                  <Image 
                    source={require("../../assets/images/maya2.0.png")} 
                    style={styles.paymentMethodImage}
                    resizeMode="contain"
                  />
                  <Text style={[
                    styles.paymentMethodText,
                    selectedPaymentMethod === "PayMaya" && styles.paymentMethodTextSelected
                  ]}>
                    PayMaya
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, withdrawing && styles.submitButtonDisabled]}
                onPress={handleSubmitWithdrawal}
                disabled={withdrawing}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Send Withdrawal Request
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={width * 0.2} color="#4CAF50" />
            </View>
            <Text style={[styles.successTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "accumulatedPoints.successTitle") || "Withdrawal Submitted!"}
            </Text>
            <Text style={[styles.successMessage, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "accumulatedPoints.successMessage") || "Your withdrawal request has been submitted successfully. You will receive your payment within 1-3 hours."}
            </Text>
            <TouchableOpacity
              style={styles.okButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.okButtonText}>
                {t(userLanguage, "accumulatedPoints.ok") || "OK"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: height * 0.1,
    paddingBottom: height * 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.045,
  },
  balanceCard: {
    borderRadius: 20,
    marginBottom: height * 0.025,
    overflow: "hidden",
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceCardGradient: {
    padding: width * 0.055,
    alignItems: "center",
  },
  balanceIconWrapper: {
    width: width * 0.13,
    height: width * 0.13,
    borderRadius: width * 0.065,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.015,
  },
  balanceLabel: {
    fontSize: width * 0.035,
    color: "#fff",
    marginBottom: height * 0.008,
    fontWeight: "600",
    opacity: 0.95,
  },
  balanceValue: {
    fontSize: width * 0.1,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontSize: width * 0.038,
    color: "#fff",
    marginTop: height * 0.003,
    opacity: 0.85,
    fontWeight: "500",
  },
  withdrawButton: {
    backgroundColor: "#FF9500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.018,
    borderRadius: 12,
    marginBottom: height * 0.025,
    gap: width * 0.02,
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  withdrawButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  withdrawButtonText: {
    fontSize: width * 0.042,
    fontWeight: "700",
    color: "#fff",
  },
  historySection: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: height * 0.018,
  },
  sectionTitle: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: "#333",
  },
  loadingContainer: {
    padding: height * 0.04,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: width * 0.038,
    color: "#666",
    marginTop: height * 0.02,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.08,
  },
  emptyText: {
    fontSize: width * 0.04,
    color: "#999",
    marginTop: height * 0.02,
    fontWeight: "400",
  },
  transactionsList: {
    gap: height * 0.012,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: width * 0.038,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: height * 0.005,
  },
  transactionIcon: {
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: width * 0.055,
    alignItems: "center",
    justifyContent: "center",
    marginRight: width * 0.028,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: width * 0.038,
    fontWeight: "600",
    color: "#333",
    marginBottom: height * 0.004,
  },
  transactionDate: {
    fontSize: width * 0.032,
    color: "#999",
    fontWeight: "400",
  },
  transactionAmountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: width * 0.042,
    fontWeight: "700",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    padding: 24,
    width: width * 0.92,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  conversionNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE8D6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E15816",
  },
  conversionNoteText: {
    fontSize: 15,
    color: "#E15816",
    fontWeight: "600",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  mobileInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 24,
    color: "#333",
  },
  customAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E15816",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    padding: 0,
  },
  customAmountLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  quickAmountLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    justifyContent: "space-between",
  },
  amountButton: {
    width: (width * 0.92 - 72) / 3,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  amountButtonSelected: {
    borderColor: "#E15816",
    backgroundColor: "#FFF5F0",
    borderWidth: 3,
  },
  amountButtonDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E8E8E8",
    opacity: 0.5,
  },
  amountButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#666",
  },
  amountButtonTextSelected: {
    color: "#E15816",
  },
  amountButtonTextDisabled: {
    color: "#BDBDBD",
  },
  amountButtonTextInsufficient: {
    color: "#BDBDBD",
  },
  insufficientLabel: {
    fontSize: 10,
    color: "#F44336",
    marginTop: 4,
    fontWeight: "600",
  },
  paymentMethodContainer: {
    flexDirection: "row",
    marginBottom: 32,
    justifyContent: "space-between",
  },
  paymentMethodButton: {
    width: (width * 0.92 - 60) / 2,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodButtonSelected: {
    borderColor: "#E15816",
    backgroundColor: "#FFF5F0",
  },
  paymentMethodImage: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  paymentMethodTextSelected: {
    color: "#E15816",
  },
  submitButton: {
    backgroundColor: "#E15816",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#CCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Success Modal Styles
  successModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: width * 0.06,
    width: width * 0.85,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: height * 0.02,
  },
  successTitle: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    color: "#333",
    marginBottom: height * 0.015,
    textAlign: "center",
  },
  successMessage: {
    fontSize: width * 0.04,
    color: "#666",
    textAlign: "center",
    lineHeight: width * 0.06,
    marginBottom: height * 0.03,
  },
  okButton: {
    backgroundColor: "#FF9500",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.15,
    borderRadius: 10,
  },
  okButtonText: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    color: "#fff",
  },
});

