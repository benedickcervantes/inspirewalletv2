import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import React, { useState } from "react";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ImageBackground,
  SafeAreaView,
  Platform,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import TransferLoadingScreen from "../../components/TransferLoadingScreen";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { playTransferSound } from "../../utils/soundUtils";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;
const isLargeDevice = width >= 414;

export default function StockTransfer() {
  const navigation = useNavigation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // Step tracker (1: Details, 2: Confirmation)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserAccountNumber, setCurrentUserAccountNumber] = useState("");
  const [userData, setUserData] = useState(null);
  const [stockCount, setStockCount] = useState(0);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [accountNumberError, setAccountNumberError] = useState("");
  const [amountError, setAmountError] = useState("");

  const STOCK_RATE = 2000000; // 1 stock = 2,000,000 PHP

  const formatCurrency = (amount) => {
    return amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    // This will trigger a re-render when userData.preferredLanguage changes
  }, [userData?.preferredLanguage]);

  const initializePage = async () => {
    try {
      navigation.setOptions({
        headerShown: true,
        headerTransparent: true,
        headerTitle: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.header.title"
        ),
        headerTintColor: Colors.redTheme.background,
      });

      // Load user data including language preference
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        const userData = userDoc.data();
        setUserData(userData);
        setCurrentUserAccountNumber(userData.accountNumber || "");
        setStockCount(userData.stockCount || 0);

        // Set up real-time listener for stock count updates
        const userDocRef = doc(firestore, "users", currentUser.uid);

        const unsubscribe = onSnapshot(
          userDocRef,
          (doc) => {
            if (doc.exists()) {
              const userData = doc.data();
              setStockCount(userData.stockCount || 0);
            }
          },
          (error) => {
            console.error("Error listening to stock count updates:", error);
          }
        );

        // Cleanup listener on component unmount
        return () => unsubscribe();
      }
    } catch (error) {
      console.error("Error initializing page:", error);
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.messages.transferFailed"
        ),
        type: "error",
        onConfirm: () => {
          router.push("/main");
        },
      });
    }
  };

  // Validate account number format
  const validateAccountNumber = (accountNumber) => {
    // Account number should be numeric and at least 6 digits
    const accountNumberRegex = /^\d{6,}$/;
    return accountNumberRegex.test(accountNumber);
  };

  // Check if user exists by account number
  const checkUserExists = async (accountNumber) => {
    if (!validateAccountNumber(accountNumber)) {
      return null;
    }

    // Check if the account number is the same as the current user's account number
    if (accountNumber === currentUserAccountNumber) {
      return null; // Return null to indicate "user not found" for self-transfer
    }

    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("accountNumber", "==", accountNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return {
          id: querySnapshot.docs[0].id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          emailAddress: userData.emailAddress,
          accountNumber: userData.accountNumber,
          stockCount: userData.stockCount || 0,
        };
      }
      return null;
    } catch (error) {
      console.error("Error checking user:", error);
      return null;
    }
  };

  // Step navigation functions
  const goToNextStep = async () => {
    if (currentStep === 1) {
      // Validate account number and amount
      if (!searchQuery.trim()) {
        setAccountNumberError("Please enter an account number");
        return;
      }

      if (!validateAccountNumber(searchQuery.trim())) {
        setAccountNumberError("Invalid account number format");
        return;
      }

      if (searchQuery.trim() === currentUserAccountNumber) {
        setAccountNumberError("Cannot transfer to your own account");
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setAmountError("Please enter a valid amount");
        return;
      }

      const transferAmount = parseFloat(amount);

      if (transferAmount > stockCount) {
        setAmountError(
          `Insufficient balance. Available: ${formatCurrency(
            stockCount
          )} stocks`
        );
        return;
      }

      // Check if user exists
      const user = await checkUserExists(searchQuery.trim());
      if (!user) {
        setAccountNumberError("Account not found");
        return;
      }

      setSelectedUser(user);
      setAccountNumberError("");
      setAmountError("");
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser || !amount) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.validation.enterValidAmount"
        ),
        type: "warning",
      });
      return;
    }

    // Check if user is trying to transfer to themselves (by user ID)
    const currentUser = auth.currentUser;
    if (currentUser && selectedUser.id === currentUser.uid) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.validation.selfTransfer"
        ),
        type: "warning",
      });
      return;
    }

    // Check if user is trying to transfer to themselves (by account number)
    if (
      selectedUser &&
      selectedUser.accountNumber === currentUserAccountNumber
    ) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.validation.selfTransfer"
        ),
        type: "warning",
      });
      return;
    }

    const transferAmount = parseFloat(amount);

    // Check if stock count is 0 or negative
    if (stockCount <= 0) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.validation.insufficientBalance"
        ),
        type: "warning",
      });
      return;
    }

    // Check if transfer amount is greater than available stock count
    if (transferAmount > stockCount) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.validation.insufficientBalance"
        ),
        type: "warning",
      });
      return;
    }

    // Check if transfer amount is 0 or negative
    if (transferAmount <= 0) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.validation.enterValidAmount"
        ),
        type: "warning",
      });
      return;
    }

    // Show confirmation modal instead of directly processing
    setShowConfirmModal(true);
  };

  const isInsufficientBalance = () => {
    if (!amount) return false;

    // Check if user is trying to transfer to themselves (by user ID)
    const currentUser = auth.currentUser;
    if (currentUser && selectedUser && selectedUser.id === currentUser.uid) {
      return true;
    }

    // Check if user is trying to transfer to themselves (by account number)
    if (
      selectedUser &&
      selectedUser.accountNumber === currentUserAccountNumber
    ) {
      return true;
    }

    const transferAmount = parseFloat(amount);

    return (
      stockCount <= 0 || transferAmount <= 0 || transferAmount > stockCount
    );
  };

  const getTransferButtonText = () => {
    if (!selectedUser)
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.selectRecipient"
      );
    if (!amount)
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.enterAmount"
      );

    // Check if user is trying to transfer to themselves (by user ID)
    const currentUser = auth.currentUser;
    if (currentUser && selectedUser.id === currentUser.uid) {
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.cannotTransferToSelf"
      );
    }

    // Check if user is trying to transfer to themselves (by account number)
    if (
      selectedUser &&
      selectedUser.accountNumber === currentUserAccountNumber
    ) {
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.cannotTransferToSelf"
      );
    }

    const transferAmount = parseFloat(amount);

    if (stockCount <= 0) {
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.insufficientStock"
      );
    }

    if (transferAmount <= 0) {
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.enterValidAmount"
      );
    }

    if (transferAmount > stockCount) {
      return t(
        userData?.preferredLanguage || "English",
        "stockTransfer.buttons.insufficientStock"
      );
    }

    return t(
      userData?.preferredLanguage || "English",
      "stockTransfer.buttons.sendTransfer"
    );
  };

  const processTransfer = async () => {
    try {
      setIsLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "stockTransfer.titles.error"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "stockTransfer.messages.transferFailed"
          ),
          type: "error",
        });
        return;
      }

      const recipientId = selectedUser.id;
      const recipientData = selectedUser;
      const usersRef = collection(firestore, "users");
      const senderDoc = await getDoc(doc(usersRef, currentUser.uid));
      const senderData = senderDoc.data();
      const transferStockCount = parseFloat(amount);
      const transferAmount = transferStockCount * STOCK_RATE; // Calculate PHP amount

      if ((senderData.stockCount || 0) < transferStockCount) {
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "stockTransfer.titles.error"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "stockTransfer.validation.insufficientBalance"
          ),
          type: "warning",
        });
        return;
      }

      // Start a batch write to ensure atomicity
      const batch = writeBatch(firestore);

      // Update sender's stock count and amount
      const senderRef = doc(usersRef, currentUser.uid);
      const newSenderStockCount =
        (senderData.stockCount || 0) - transferStockCount;
      const newSenderStockAmount = newSenderStockCount * STOCK_RATE;
      batch.update(senderRef, {
        stockCount: newSenderStockCount,
        stockAmount: newSenderStockAmount,
        lastStockCountUpdate: new Date().toISOString(),
      });

      // Update recipient's stock count and amount
      const recipientRef = doc(usersRef, recipientId);
      const recipientDoc = await getDoc(recipientRef);
      const recipientFullData = recipientDoc.data();
      const newRecipientStockCount =
        (recipientFullData.stockCount || 0) + transferStockCount;
      const newRecipientStockAmount = newRecipientStockCount * STOCK_RATE;
      batch.update(recipientRef, {
        stockCount: newRecipientStockCount,
        stockAmount: newRecipientStockAmount,
        lastStockCountUpdate: new Date().toISOString(),
      });

      // Add transaction records
      const transactionData = {
        senderId: currentUser.uid,
        recipientId: recipientId,
        recipientEmail: recipientData.emailAddress,
        stockCount: transferStockCount,
        amount: transferAmount,
        timestamp: new Date(),
        userId: currentUser.uid,
      };

      // Add transaction to sender's history
      const senderTransactionRef = doc(
        collection(firestore, `users/${currentUser.uid}/stockTransactions`)
      );
      batch.set(senderTransactionRef, {
        stockCount: transferStockCount,
        amount: transferAmount,
        date: new Date(),
        type: "Stock Transfer Sent",
        status: "Completed",
        recipientEmail: recipientData.emailAddress,
        recipientName: `${recipientData.firstName} ${recipientData.lastName}`,
        description: `Transferred ${formatCurrency(
          transferStockCount
        )} stocks to ${recipientData.firstName} ${recipientData.lastName}`,
      });

      // Add transaction to recipient's history
      const recipientTransactionRef = doc(
        collection(firestore, `users/${recipientId}/stockTransactions`)
      );
      batch.set(recipientTransactionRef, {
        stockCount: transferStockCount,
        amount: transferAmount,
        date: new Date(),
        type: "Stock Transfer Received",
        senderEmail: senderData.emailAddress,
        senderName: `${senderData.firstName} ${senderData.lastName}`,
        status: "Completed",
        description: `Received ${formatCurrency(
          transferStockCount
        )} stocks from ${senderData.firstName} ${senderData.lastName}`,
      });

      // Add to main transactions collection
      const mainTransactionRef = doc(collection(firestore, "transactions"));
      batch.set(mainTransactionRef, transactionData);

      // Commit the batch
      await batch.commit();

      // Play success sound
      playTransferSound();
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.transferSuccessful"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.messages.transferSuccessful"
        ),
        type: "success",
        onConfirm: () => {
          hideModal();
          router.back();
        },
      });
    } catch (error) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.titles.transferFailed"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "stockTransfer.messages.transferFailed"
        ),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <TransferLoadingScreen message="Processing stock transfer..." />;
  }

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Enter Account Number & Amount
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="swap-horizontal" size={32} color="white" />
              </View>
              <Text style={styles.stepTitle}>Stock Transfer Details</Text>
              <Text style={styles.stepSubtitle}>
                Enter recipient and amount
              </Text>
            </View>

            {/* Stock Balance Display */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={Colors.redTheme.background}
                />
                <Text
                  style={[
                    styles.balanceLabel,
                    getRTLStyles(userData?.preferredLanguage || "English"),
                  ]}
                >
                  Available Stocks
                </Text>
              </View>
              <View style={styles.balanceAmountRow}>
                <Text
                  style={[
                    styles.balanceAmount,
                    getRTLStyles(userData?.preferredLanguage || "English"),
                  ]}
                >
                  {formatCurrency(stockCount)} Stocks
                </Text>
              </View>
              <View style={styles.balanceSubInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={Colors.light.icon}
                />
                <Text style={styles.balanceSubText}>
                  ≈ ₱ {formatCurrency(stockCount * STOCK_RATE)}
                </Text>
              </View>
            </View>

            {/* Account Number Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={Colors.redTheme.background}
                />{" "}
                Recipient Account Number
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  accountNumberError && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={20}
                  color="#999"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Enter account number"
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setAccountNumberError("");
                  }}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>
              {accountNumberError ? (
                <Text style={styles.errorText}>{accountNumberError}</Text>
              ) : null}
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                <Ionicons
                  name="layers-outline"
                  size={16}
                  color={Colors.redTheme.background}
                />{" "}
                Number of Stocks
              </Text>
              <View
                style={[
                  styles.amountContainer,
                  amountError && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color={Colors.redTheme.background}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="0.00"
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setAmountError("");
                  }}
                  placeholderTextColor="#999"
                />
                <Text style={styles.stockUnit}>Stocks</Text>
              </View>
              {amountError ? (
                <Text style={styles.errorText}>{amountError}</Text>
              ) : null}
              <View style={styles.balanceInfoContainer}>
                <Text style={styles.balanceInfo}>
                  Available: {formatCurrency(stockCount)} stocks
                </Text>
                {amount && parseFloat(amount) > 0 && (
                  <Text style={styles.balanceInfoValue}>
                    ≈ ₱ {formatCurrency(parseFloat(amount) * STOCK_RATE)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );

      case 2:
        // Step 2: Confirmation
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="checkmark-circle" size={32} color="white" />
              </View>
              <Text style={styles.stepTitle}>Confirm Transfer</Text>
              <Text style={styles.stepSubtitle}>
                Review your transfer details
              </Text>
            </View>

            <View style={styles.confirmationContainer}>
              {/* Recipient Card */}
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>To</Text>
                <View style={styles.confirmRecipientRow}>
                  <View style={styles.confirmAvatar}>
                    <Text style={styles.confirmAvatarText}>
                      {selectedUser?.firstName?.[0]}
                      {selectedUser?.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={styles.confirmRecipientDetails}>
                    <Text style={styles.confirmRecipientName}>
                      {selectedUser?.firstName} {selectedUser?.lastName}
                    </Text>
                    <Text style={styles.confirmRecipientAccount}>
                      {selectedUser?.accountNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Amount Card */}
              <View style={styles.confirmAmountCard}>
                <Text style={styles.confirmAmountLabel}>
                  Stocks to Transfer
                </Text>
                <View style={styles.confirmAmountValueContainer}>
                  <Text style={styles.confirmAmountValue}>
                    {formatCurrency(parseFloat(amount || 0))}
                  </Text>
                  <Text style={styles.confirmAmountUnit}>Stocks</Text>
                </View>
                <Text style={styles.confirmAmountSubtext}>
                  ≈ ₱ {formatCurrency(parseFloat(amount || 0) * STOCK_RATE)}
                </Text>
              </View>

              {/* Summary Card */}
              <View style={styles.confirmSummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Current Stock Balance</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(stockCount)} stocks
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Transfer Amount</Text>
                  <Text style={[styles.summaryValue, styles.summaryDebit]}>
                    - {formatCurrency(parseFloat(amount || 0))} stocks
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>New Balance</Text>
                  <Text style={styles.summaryValueBold}>
                    {formatCurrency(stockCount - parseFloat(amount || 0))}{" "}
                    stocks
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>New Balance Value</Text>
                  <Text style={styles.summaryValue}>
                    ≈ ₱{" "}
                    {formatCurrency(
                      (stockCount - parseFloat(amount || 0)) * STOCK_RATE
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / 2) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>Step {currentStep} of 2</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainContainer}>{renderStepContent()}</View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToPreviousStep}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={Colors.redTheme.background}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
          onPress={currentStep === 2 ? processTransfer : goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 2 ? "Confirm & Send" : "Continue"}
          </Text>
          <Ionicons
            name={currentStep === 2 ? "checkmark-circle" : "arrow-forward"}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
        onCancel={modalConfig.onCancel}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },

  // Progress Indicator
  progressContainer: {
    paddingHorizontal: width * 0.05,
    paddingTop: Platform.OS === "ios" ? 10 : 15,
    paddingBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "600",
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: 20,
  },

  // Step Container
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  stepIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.redTheme.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  stepTitle: {
    fontSize: isSmallDevice ? 22 : 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: Colors.light.icon,
    textAlign: "center",
  },

  // Balance Card
  balanceCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: isSmallDevice ? 20 : 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        shadowColor: "#000000",
      },
    }),
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    color: Colors.light.icon,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  balanceAmountRow: {
    marginBottom: 8,
  },
  balanceSubInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  balanceSubText: {
    fontSize: 12,
    color: Colors.light.icon,
    fontWeight: "500",
  },

  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputContainerError: {
    borderColor: "#FF6B6B",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: isSmallDevice ? 15 : 16,
    color: "#1A1A1A",
    paddingVertical: 16,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currencySymbol: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingVertical: 16,
  },
  stockUnit: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 6,
    marginLeft: 4,
  },
  balanceInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 4,
  },
  balanceInfo: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  balanceInfoValue: {
    fontSize: 13,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },

  // Confirmation (Step 2)
  confirmationContainer: {
    gap: 16,
  },
  confirmCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  confirmLabel: {
    fontSize: 13,
    color: Colors.light.icon,
    marginBottom: 8,
    fontWeight: "500",
  },
  confirmRecipientRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  confirmAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redTheme.background + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  confirmAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  confirmRecipientDetails: {
    flex: 1,
  },
  confirmRecipientName: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  confirmRecipientAccount: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  confirmAmountCard: {
    backgroundColor: Colors.redTheme.background + "10",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.redTheme.background + "30",
  },
  confirmAmountLabel: {
    fontSize: isSmallDevice ? 12 : 13,
    color: Colors.redTheme.background,
    fontWeight: "500",
    marginBottom: 8,
  },
  confirmAmountValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 4,
  },
  confirmAmountValue: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  confirmAmountUnit: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  confirmAmountSubtext: {
    fontSize: 12,
    color: Colors.light.icon,
    fontWeight: "500",
  },
  confirmSummaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: isSmallDevice ? 13 : 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: isSmallDevice ? 13 : 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  summaryDebit: {
    color: Colors.redTheme.background,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  summaryLabelBold: {
    fontSize: isSmallDevice ? 14 : 15,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  summaryValueBold: {
    fontSize: isSmallDevice ? 14 : 15,
    color: "#1A1A1A",
    fontWeight: "700",
  },

  // Navigation Buttons
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  backButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  nextButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  nextButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: "600",
    color: "white",
  },
});
