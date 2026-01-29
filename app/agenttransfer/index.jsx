import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
  useRef,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  collection,
  getDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import axios from "axios";

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;

export default function AgentTransfer() {
  const navigation = useNavigation();
  const router = useRouter();
  const [data, setUserData] = useState({});
  const [userId, setUserId] = useState();
  const [userLanguage, setUserLanguage] = useState("english");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [amountError, setAmountError] = useState("");
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    checkAccessAndInitialize();
  }, []);

  const checkAccessAndInitialize = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        showModal({
          title: t(userLanguage, "agentTransfer.modals.accessRestricted.title"),
          message: t(userLanguage, "agentTransfer.modals.accessRestricted.message").replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            hideModal();
            router.replace("/main");
          },
        });
        return;
      }

      // If access is allowed, proceed with user initialization
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid);

        // Real-time listener for user data
        const userDocRef = doc(firestore, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            setUserData(userData);
            
            // Check if user is an agent
            if (!userData.agent) {
              showModal({
                title: t(userLanguage, "agentTransfer.modals.accessDenied.title"),
                message: t(userLanguage, "agentTransfer.modals.accessDenied.message"),
                type: "error",
                onConfirm: () => {
                  hideModal();
                  router.replace("/main");
                },
              });
              return;
            }
          } else {
            showModal({
              title: t(userLanguage, "agentTransfer.modals.dataError.title"),
              message: t(userLanguage, "agentTransfer.modals.dataError.message"),
              type: "error",
            });
          }
        });

        return () => unsubscribeUser();
      }
    } catch (error) {
      console.error("Error checking account access:", error);
      showModal({
        title: t(userLanguage, "agentTransfer.modals.error.title"),
        message: t(userLanguage, "agentTransfer.modals.error.message"),
        type: "error",
        onConfirm: () => {
          hideModal();
          router.replace("/main");
        },
      });
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Transfer to Available Balance",
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  const formatCurrency = (amount) => {
    const value = Number(amount);
    if (isNaN(value)) return "0.00";
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const validateAmount = (amount) => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return "Please enter a valid amount";
    }
    if (numAmount > data.agentWalletAmount) {
      return `Insufficient balance. Available: PHP ${formatCurrency(data.agentWalletAmount)}`;
    }
    return "";
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      const error = validateAmount(amount);
      if (error) {
        setAmountError(error);
        return;
      }
      setAmountError("");
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const processTransfer = async () => {
    try {
      setIsLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showModal({
          title: t(userLanguage, "agentTransfer.modals.authenticationError.title"),
          message: t(userLanguage, "agentTransfer.modals.authenticationError.message"),
          type: "error",
        });
        return;
      }

      const transferAmount = parseFloat(amount);
      
      // Start a batch write to ensure atomicity
      const batch = writeBatch(firestore);
      
      // Update agent wallet amount (subtract)
      const userRef = doc(firestore, "users", currentUser.uid);
      batch.update(userRef, {
        agentWalletAmount: data.agentWalletAmount - transferAmount,
        availBalanceAmount: (data.availBalanceAmount || 0) + transferAmount,
      });

      // Add transaction record
      const transactionData = {
        amount: transferAmount,
        date: Timestamp.now(),
        type: "Agent Wallet Transfer",
        status: "Completed",
        description: `Transferred from Agent Wallet to Available Balance`,
        transferType: "internal",
        fromBalance: "agentWalletAmount",
        toBalance: "availBalanceAmount",
      };

      // Add transaction to user's history
      const transactionRef = doc(
        collection(firestore, `users/${currentUser.uid}/transactions`)
      );
      batch.set(transactionRef, transactionData);

      // Add to agent transactions (negative amount since money is leaving agent wallet)
      const agentTransactionRef = doc(
        collection(firestore, `users/${currentUser.uid}/agentTransactions`)
      );
      batch.set(agentTransactionRef, {
        amount: -transferAmount, // Negative amount since money is leaving agent wallet
        date: Timestamp.now(),
        type: "Agent Wallet Transfer to Available Balance",
        referredClient: "N/A",
        grossAmount: 0,
        taxApplied: 0,
        percentage: 0,
      });

      // Add to main transactions collection
      const mainTransactionRef = doc(collection(firestore, "transactions"));
      batch.set(mainTransactionRef, {
        ...transactionData,
        userId: currentUser.uid,
        senderId: currentUser.uid,
        recipientId: currentUser.uid,
      });

      // Commit the batch
      await batch.commit();

      try {
        // Send email notification
        await send(
          process.env.EXPO_PUBLIC_SERVICE_ID,
          process.env.EXPO_PUBLIC_TRANSFER_TEMPLATE_ID,
          {
            from_email: data.emailAddress,
            to_email: data.emailAddress,
            transfer_type: "Agent Wallet Transfer",
            date: new Date().toLocaleString(),
            amount: `${formatCurrency(transferAmount)}`,
            sender_name: `${data.firstName} ${data.lastName}`,
            recipient_name: `${data.firstName} ${data.lastName}`,
            sender_first_name: data.firstName,
            sender_last_name: data.lastName,
            recipient_first_name: data.firstName,
            recipient_last_name: data.lastName,
          },
          {
            publicKey: process.env.EXPO_PUBLIC_API_KEY,
          }
        );

        // Send push notification
        await axios.post("https://app.nativenotify.com/api/indie/notification", {
          subID: currentUser.uid,
          appId: 28259,
          appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
          title: "Transfer Successful",
          message: `You have successfully transferred PHP ${formatCurrency(transferAmount)} from Agent Wallet to Available Balance`,
          description: `Internal transfer completed`,
        });

        showModal({
          title: t(userLanguage, "agentTransfer.modals.transferSuccessful.title"),
          message: t(userLanguage, "agentTransfer.modals.transferSuccessful.message"),
          type: "success",
          onConfirm: () => {
            hideModal();
            router.back();
          },
        });
      } catch (notificationError) {
        showModal({
          title: t(userLanguage, "agentTransfer.modals.transferSuccessful.title"),
          message: t(userLanguage, "agentTransfer.modals.transferSuccessfulDelayed.message"),
          type: "success",
          onConfirm: () => {
            hideModal();
            router.back();
          },
        });
      }
    } catch (error) {
      console.error("Error processing transfer:", error);
      showModal({
        title: t(userLanguage, "agentTransfer.modals.transferFailed.title"),
        message: t(userLanguage, "agentTransfer.modals.transferFailed.message"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="swap-horizontal" size={32} color="white" />
              </View>
              <Text style={styles.stepTitle}>Transfer Amount</Text>
              <Text style={styles.stepSubtitle}>Enter the amount to transfer from Agent Wallet to Available Balance</Text>
            </View>

            {/* Balance Display */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="briefcase-outline" size={20} color={Colors.redTheme.background} />
                <Text style={styles.balanceLabel}>Agent Wallet Balance</Text>
              </View>
              <Text style={styles.balanceAmount}>
                PHP {formatCurrency(data.agentWalletAmount || 0)}
              </Text>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                <Ionicons name="cash-outline" size={16} color={Colors.redTheme.background} /> Transfer Amount
              </Text>
              <View style={[styles.amountContainer, amountError && styles.inputContainerError]}>
                <Text style={styles.currencySymbol}>PHP</Text>
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
              </View>
              {amountError ? (
                <Text style={styles.errorText}>{amountError}</Text>
              ) : null}
            </View>

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountContainer}>
              <Text style={styles.quickAmountLabel}>Quick Amounts</Text>
              <View style={styles.quickAmountButtons}>
                {[100, 500, 1000, 5000].map((quickAmount) => (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      amount === quickAmount.toString() && styles.quickAmountButtonSelected
                    ]}
                    onPress={() => {
                      setAmount(quickAmount.toString());
                      setAmountError("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.quickAmountButtonText,
                      amount === quickAmount.toString() && styles.quickAmountButtonTextSelected
                    ]}>
                      PHP {formatCurrency(quickAmount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Transfer All Button */}
            {data.agentWalletAmount > 0 && (
              <TouchableOpacity
                style={styles.transferAllButton}
                onPress={() => {
                  setAmount(data.agentWalletAmount.toString());
                  setAmountError("");
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-up-circle" size={20} color={Colors.redTheme.background} />
                <Text style={styles.transferAllButtonText}>
                  Transfer All (PHP {formatCurrency(data.agentWalletAmount)})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.redTheme.background} />
              <Text style={styles.stepTitle}>Confirm Transfer</Text>
              <Text style={styles.stepSubtitle}>Review your transfer details</Text>
            </View>

            <View style={styles.confirmationContainer}>
              {/* Transfer Details Card */}
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>Transfer Details</Text>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>From</Text>
                  <Text style={styles.confirmValue}>Agent Wallet</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>To</Text>
                  <Text style={styles.confirmValue}>Available Balance</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Amount</Text>
                  <Text style={[styles.confirmValue, styles.confirmAmount]}>
                    PHP {formatCurrency(parseFloat(amount || 0))}
                  </Text>
                </View>
              </View>

              {/* Balance Summary Card */}
              <View style={styles.confirmSummaryCard}>
                <Text style={styles.summaryTitle}>Balance Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Current Agent Wallet</Text>
                  <Text style={styles.summaryValue}>
                    PHP {formatCurrency(data.agentWalletAmount || 0)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Transfer Amount</Text>
                  <Text style={[styles.summaryValue, styles.summaryDebit]}>
                    - PHP {formatCurrency(parseFloat(amount || 0))}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>New Agent Wallet</Text>
                  <Text style={styles.summaryValueBold}>
                    PHP {formatCurrency((data.agentWalletAmount || 0) - parseFloat(amount || 0))}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>New Available Balance</Text>
                  <Text style={styles.summaryValueBold}>
                    PHP {formatCurrency((data.availBalanceAmount || 0) + parseFloat(amount || 0))}
                  </Text>
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
                <Text style={styles.infoText}>
                  This transfer moves money from your Agent Wallet (commission earnings) to your Available Balance (main wallet) for spending.
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.redTheme.background} />
          <Text style={styles.loadingText}>Processing transfer...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / 2) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {currentStep} of 2</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainContainer}>
          {renderStepContent()}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToPreviousStep}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.redTheme.background} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.nextButton,
            currentStep === 1 && { flex: 1 }
          ]}
          onPress={currentStep === 2 ? processTransfer : goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 2 ? "Confirm Transfer" : "Continue"}
          </Text>
          <Ionicons name={currentStep === 2 ? "checkmark-circle" : "arrow-forward"} size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ProfessionalModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        onConfirm={modalConfig.onConfirm}
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
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.redTheme.background,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: '600',
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.redTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: Colors.light.icon,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: isSmallDevice ? 20 : 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        shadowColor: '#000000',
      },
    }),
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: '700',
    color: Colors.redTheme.background,
  },

  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputContainerError: {
    borderColor: '#FF6B6B',
  },
  currencySymbol: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: Colors.redTheme.background,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 6,
    marginLeft: 4,
  },

  // Quick Amount Buttons
  quickAmountContainer: {
    marginBottom: 24,
  },
  quickAmountLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 1,
    minWidth: '45%',
  },
  quickAmountButtonSelected: {
    borderColor: Colors.redTheme.background,
    backgroundColor: Colors.redTheme.background + '10',
  },
  quickAmountButtonText: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  quickAmountButtonTextSelected: {
    color: Colors.redTheme.background,
  },

  // Transfer All Button
  transferAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.redTheme.background + '10',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background + '30',
    gap: 8,
  },
  transferAllButtonText: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '600',
    color: Colors.redTheme.background,
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
        shadowColor: '#000',
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
    fontWeight: '500',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmValue: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  confirmAmount: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: Colors.redTheme.background,
  },
  confirmSummaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  summaryDebit: {
    color: Colors.redTheme.background,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  summaryLabelBold: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  summaryValueBold: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#1A1A1A',
    fontWeight: '700',
  },

  // Info Card
  infoCard: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginLeft: 12,
  },

  // Navigation Buttons
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  backButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    color: Colors.redTheme.background,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    color: 'white',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === "android" ? 80 : 0,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    marginTop: 16,
    fontWeight: '600',
  },
});
