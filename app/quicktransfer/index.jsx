import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  Platform,
  ImageBackground,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import TransferLoadingScreen from "../../components/TransferLoadingScreen";
import axios from "axios";
import { send } from "@emailjs/react-native";

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function QuickTransfer() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [amount, setAmount] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [agentWalletBalance, setAgentWalletBalance] = useState(0);
  const [recipientData, setRecipientData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Select Balance, 2: Enter Amount, 3: Confirm
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showModal({
          title: "Authentication Required",
          message: "Please log in to continue with the transfer.",
          type: "warning",
          onConfirm: () => {
            router.push("/");
          },
        });
        return;
      }

      navigation.setOptions({
        headerShown: true,
        headerTransparent: true,
        headerTitle: "Quick Transfer",
        headerTintColor: Colors.redTheme.background,
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
      });

      // Load current user data
      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
      const currentUserData = userDoc.data();
      setUserData(currentUserData);
      setAvailableBalance(currentUserData.availBalanceAmount || 0);
      setAgentWalletBalance(currentUserData.agentWalletAmount || 0);

      // Load recipient data
      if (params.accountNumber) {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("accountNumber", "==", params.accountNumber));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const recipient = querySnapshot.docs[0];
          setRecipientData({
            id: recipient.id,
            ...recipient.data(),
          });
        } else {
          showModal({
            title: "Recipient Not Found",
            message: "The recipient account could not be found.",
            type: "error",
            onConfirm: () => {
              router.back();
            },
          });
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showModal({
        title: "Error",
        message: "Failed to load transfer information. Please try again.",
        type: "error",
        onConfirm: () => {
          router.back();
        },
      });
    }
  };

  const processTransfer = async () => {
    try {
      setIsLoading(true);
      const currentUser = auth.currentUser;
      
      const transferAmount = parseFloat(amount);
      const balanceField = selectedBalance === "available" ? "availBalanceAmount" : "agentWalletAmount";
      const currentBalance = selectedBalance === "available" ? availableBalance : agentWalletBalance;

      if (transferAmount > currentBalance) {
        showModal({
          title: "Insufficient Balance",
          message: `You don't have enough balance. Available: PHP ${formatCurrency(currentBalance)}`,
          type: "warning",
        });
        return;
      }

      // Start batch write
      const batch = writeBatch(firestore);

      // Update sender's balance
      const senderRef = doc(firestore, "users", currentUser.uid);
      batch.update(senderRef, {
        [balanceField]: currentBalance - transferAmount,
      });

      // Update recipient's balance
      const recipientRef = doc(firestore, "users", recipientData.id);
      batch.update(recipientRef, {
        availBalanceAmount: (recipientData.availBalanceAmount || 0) + transferAmount,
      });

      // Add transaction to sender's history
      const senderTransactionRef = doc(
        collection(firestore, `users/${currentUser.uid}/transactions`)
      );
      batch.set(senderTransactionRef, {
        amount: transferAmount,
        date: new Date(),
        type: "Transfer Money",
        status: "Completed",
        recipientEmail: recipientData.emailAddress,
        recipientName: `${recipientData.firstName} ${recipientData.lastName}`,
        description: `Transferred to ${recipientData.firstName} ${recipientData.lastName}`,
      });

      // Add transaction to recipient's history
      const recipientTransactionRef = doc(
        collection(firestore, `users/${recipientData.id}/transactions`)
      );
      batch.set(recipientTransactionRef, {
        amount: transferAmount,
        date: new Date(),
        type: "Transfer Received",
        senderEmail: userData.emailAddress,
        senderName: `${userData.firstName} ${userData.lastName}`,
        status: "Completed",
        description: `Received from ${userData.firstName} ${userData.lastName}`,
      });

      // Add to main transactions collection
      const mainTransactionRef = doc(collection(firestore, "transactions"));
      batch.set(mainTransactionRef, {
        senderId: currentUser.uid,
        recipientId: recipientData.id,
        recipientEmail: recipientData.emailAddress,
        amount: transferAmount,
        balanceType: selectedBalance,
        timestamp: new Date(),
        userId: currentUser.uid,
      });

      await batch.commit();

      try {
        // Send email notification
        const emailParams = {
          from_email: userData.emailAddress,
          to_email: recipientData.emailAddress,
          transfer_type: selectedBalance === "available" ? "Available Balance Amount" : "Agent Wallet Amount",
          date: new Date().toLocaleString(),
          amount: `${formatCurrency(transferAmount)}`,
          sender_name: `${userData.firstName} ${userData.lastName}`,
          recipient_name: `${recipientData.firstName} ${recipientData.lastName}`,
          sender_first_name: userData.firstName,
          sender_last_name: userData.lastName,
          recipient_first_name: recipientData.firstName,
          recipient_last_name: recipientData.lastName,
        };

        await send(
          process.env.EXPO_PUBLIC_SERVICE_ID,
          process.env.EXPO_PUBLIC_TRANSFER_TEMPLATE_ID,
          emailParams,
          {
            publicKey: process.env.EXPO_PUBLIC_API_KEY,
          }
        );

        // Send push notifications
        await Promise.all([
          axios.post("https://app.nativenotify.com/api/indie/notification", {
            subID: currentUser.uid,
            appId: 28259,
            appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
            title: "Transfer Successful",
            message: `You have successfully transferred PHP ${formatCurrency(transferAmount)} to ${recipientData.firstName} ${recipientData.lastName}`,
          }),
          axios.post("https://app.nativenotify.com/api/indie/notification", {
            subID: recipientData.id,
            appId: 28259,
            appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
            title: "Money Received",
            message: `You have received PHP ${formatCurrency(transferAmount)} from ${userData.firstName} ${userData.lastName}`,
          }),
        ]);
      } catch (notificationError) {
        console.error("Notification error:", notificationError);
      }

      showModal({
        title: "Transfer Successful!",
        message: `Successfully transferred PHP ${formatCurrency(transferAmount)} to ${recipientData.firstName} ${recipientData.lastName}`,
        type: "success",
        onConfirm: () => {
          hideModal();
          router.push("/main");
        },
      });
    } catch (error) {
      console.error("Transfer error:", error);
      showModal({
        title: "Transfer Failed",
        message: "An error occurred while processing your transfer. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep === 1 && !selectedBalance) {
      showModal({
        title: "Select Balance Type",
        message: "Please select a balance type to continue.",
        type: "warning",
      });
      return;
    }
    
    if (currentStep === 2 && (!amount || parseFloat(amount) <= 0)) {
      showModal({
        title: "Enter Amount",
        message: "Please enter a valid transfer amount.",
        type: "warning",
      });
      return;
    }

    if (currentStep === 2) {
      const transferAmount = parseFloat(amount);
      const currentBalance = selectedBalance === "available" ? availableBalance : agentWalletBalance;
      
      if (transferAmount > currentBalance) {
        showModal({
          title: "Insufficient Balance",
          message: `You don't have enough balance. Available: PHP ${formatCurrency(currentBalance)}`,
          type: "warning",
        });
        return;
      }
    }

    setCurrentStep(currentStep + 1);
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return <TransferLoadingScreen message="Processing transfer..." />;
  }

  if (!recipientData) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading recipient information...</Text>
        </View>
      </ImageBackground>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Select Balance Type
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.recipientCard}>
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientAvatarText}>
                    {recipientData.firstName?.[0]}{recipientData.lastName?.[0]}
                  </Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientLabel}>Sending to</Text>
                  <Text style={styles.recipientName}>
                    {recipientData.firstName} {recipientData.lastName}
                  </Text>
                  <Text style={styles.recipientAccount}>
                    {recipientData.accountNumber}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Select Balance Type</Text>
            <View style={styles.balanceOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.balanceOption,
                  selectedBalance === "available" && styles.balanceOptionSelected
                ]}
                onPress={() => setSelectedBalance("available")}
                activeOpacity={0.7}
              >
                <View style={styles.balanceOptionContent}>
                  <View style={styles.balanceOptionLeft}>
                    <View style={[
                      styles.balanceOptionIconContainer,
                      selectedBalance === "available" && styles.balanceOptionIconContainerSelected
                    ]}>
                      <Ionicons 
                        name="wallet" 
                        size={28} 
                        color={selectedBalance === "available" ? "white" : Colors.redTheme.background} 
                      />
                    </View>
                    <View style={styles.balanceOptionInfo}>
                      <Text style={[
                        styles.balanceOptionTitle,
                        selectedBalance === "available" && styles.balanceOptionTitleSelected
                      ]}>
                        Available Balance
                      </Text>
                      <Text style={styles.balanceOptionAmount}>
                        PHP {formatCurrency(availableBalance)}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedBalance === "available" && styles.radioButtonSelected
                  ]}>
                    {selectedBalance === "available" && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.balanceOption,
                  selectedBalance === "agent" && styles.balanceOptionSelected
                ]}
                onPress={() => setSelectedBalance("agent")}
                activeOpacity={0.7}
              >
                <View style={styles.balanceOptionContent}>
                  <View style={styles.balanceOptionLeft}>
                    <View style={[
                      styles.balanceOptionIconContainer,
                      selectedBalance === "agent" && styles.balanceOptionIconContainerSelected
                    ]}>
                      <Ionicons 
                        name="briefcase" 
                        size={28} 
                        color={selectedBalance === "agent" ? "white" : Colors.redTheme.background} 
                      />
                    </View>
                    <View style={styles.balanceOptionInfo}>
                      <Text style={[
                        styles.balanceOptionTitle,
                        selectedBalance === "agent" && styles.balanceOptionTitleSelected
                      ]}>
                        Agent Wallet
                      </Text>
                      <Text style={styles.balanceOptionAmount}>
                        PHP {formatCurrency(agentWalletBalance)}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedBalance === "agent" && styles.radioButtonSelected
                  ]}>
                    {selectedBalance === "agent" && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        // Step 2: Enter Amount
        return (
          <View style={styles.stepContainer}>
            <View style={styles.recipientCardSmall}>
              <Text style={styles.sendingToLabel}>Sending to</Text>
              <Text style={styles.recipientNameSmall}>
                {recipientData.firstName} {recipientData.lastName}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Enter Amount</Text>
            <View style={styles.amountSection}>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>PHP</Text>
                <TextInput
                  placeholder="0.00"
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>
              <Text style={styles.balanceInfo}>
                Available: PHP {formatCurrency(selectedBalance === "available" ? availableBalance : agentWalletBalance)}
              </Text>
            </View>
          </View>
        );

      case 3:
        // Step 3: Confirm Transfer
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Confirm Transfer</Text>
            
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>To</Text>
                <Text style={styles.confirmValue}>
                  {recipientData.firstName} {recipientData.lastName}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Account</Text>
                <Text style={styles.confirmValue}>{recipientData.accountNumber}</Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>From</Text>
                <Text style={styles.confirmValue}>
                  {selectedBalance === "available" ? "Available Balance" : "Agent Wallet"}
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmAmountRow}>
                <Text style={styles.confirmAmountLabel}>Amount</Text>
                <Text style={styles.confirmAmountValue}>
                  PHP {formatCurrency(parseFloat(amount || 0))}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current Balance</Text>
                <Text style={styles.summaryValue}>
                  PHP {formatCurrency(selectedBalance === "available" ? availableBalance : agentWalletBalance)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.summaryDebit]}>Transfer Amount</Text>
                <Text style={[styles.summaryValue, styles.summaryDebit]}>
                  - PHP {formatCurrency(parseFloat(amount || 0))}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>New Balance</Text>
                <Text style={styles.summaryValueBold}>
                  PHP {formatCurrency((selectedBalance === "available" ? availableBalance : agentWalletBalance) - parseFloat(amount || 0))}
                </Text>
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
          <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {currentStep} of 3</Text>
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
          onPress={currentStep === 3 ? processTransfer : goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 3 ? "Confirm & Send" : "Continue"}
          </Text>
          <Ionicons name={currentStep === 3 ? "checkmark-circle" : "arrow-forward"} size={20} color="white" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.redTheme.background,
    fontSize: 16,
    fontWeight: '600',
  },
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
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: 32,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  recipientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.redTheme.background + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recipientAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.redTheme.background,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  recipientAccount: {
    fontSize: 14,
    color: '#666',
  },
  recipientCardSmall: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sendingToLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  recipientNameSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  balanceOptionsContainer: {
    gap: 12,
  },
  balanceOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  balanceOptionSelected: {
    borderColor: Colors.redTheme.background,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  balanceOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  balanceOptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redTheme.background + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceOptionIconContainerSelected: {
    backgroundColor: Colors.redTheme.background,
  },
  balanceOptionInfo: {
    flex: 1,
  },
  balanceOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  balanceOptionTitleSelected: {
    color: Colors.redTheme.background,
  },
  balanceOptionAmount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  radioButtonSelected: {
    borderColor: Colors.redTheme.background,
    backgroundColor: Colors.redTheme.background,
  },
  amountSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.redTheme.background,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 100,
    textAlign: 'center',
  },
  balanceInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  confirmCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#666',
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  confirmAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: Colors.redTheme.background + '20',
  },
  confirmAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  confirmAmountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.redTheme.background,
  },
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  summaryDebit: {
    color: Colors.redTheme.background,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  summaryLabelBold: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  summaryValueBold: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '700',
  },
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
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  backButtonText: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
