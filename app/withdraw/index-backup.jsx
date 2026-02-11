import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Colors } from "../../constants/Colors";
import SimpleLoadingScreen from "../../components/SimpleLoadingScreen";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { playWithdrawalSound } from "../../utils/soundUtils";

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;

export default function Index() {
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    availBalanceAmount: 0,
  });
  const [userLanguage, setUserLanguage] = useState("english");
  const [open, setOpen] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState(null); // "Available Balance" or "Agent Withdrawal"
  const [withdrawalMethod, setWithdrawalMethod] = useState(null); // "Local Bank" or "EWallet"
  const [ewalletType, setEwalletType] = useState(null); // "Gcash" or "Maya"
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  // Step-based navigation state
  const [currentStep, setCurrentStep] = useState(1);

  // Define withdrawal type options (Step 1)
  const withdrawalTypeOptions = [
    {
      label: t(userLanguage, "withdrawalRequest.content.availableBalance"),
      value: "Available Balance",
      icon: "wallet",
      description: t(
        userLanguage,
        "withdrawalRequest.content.availableBalanceDesc"
      ),
    },
    {
      label: t(userLanguage, "withdrawalRequest.content.agentWithdrawal"),
      value: "Agent Withdrawal",
      icon: "person-circle",
      description: t(
        userLanguage,
        "withdrawalRequest.content.agentWithdrawalDesc"
      ),
    },
  ];

  // Define withdrawal method options (Step 2)
  const withdrawalMethodOptions = [
    {
      label: t(userLanguage, "withdrawalRequest.content.localBank"),
      value: "Local Bank",
      icon: "business",
      description: t(userLanguage, "withdrawalRequest.content.localBankDesc"),
    },
    {
      label: t(userLanguage, "withdrawalRequest.content.eWallet"),
      value: "EWallet",
      icon: "wallet",
      description: t(userLanguage, "withdrawalRequest.content.eWalletDesc"),
    },
  ];

  // Define EWallet type options (Step 2 for EWallet)
  const ewalletTypeOptions = [
    {
      label: "GCash",
      value: "Gcash",
      icon: "phone-portrait",
    },
    {
      label: "Maya",
      value: "Maya",
      icon: "card",
    },
  ];

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
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
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "withdrawalRequest.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    try {
      // Check maintenance mode from appSettings
      const appSettingsRef = doc(db, "appSettings", "QmHQ2bo3C7hupza7S1EA");
      const appSettingsSnap = await getDoc(appSettingsRef);

      if (appSettingsSnap.exists()) {
        const settings = appSettingsSnap.data();
        // If withdraw field is false, it means maintenance is ON
        const isInMaintenance = settings.withdraw === false;
        setIsMaintenanceMode(isInMaintenance);

        if (isInMaintenance) {
          setLoading(false);
          showModal({
            title: t(
              userLanguage,
              "categorizedSettings.modals.underMaintenance.title"
            ),
            message: t(
              userLanguage,
              "categorizedSettings.modals.underMaintenance.message"
            ),
            type: "info",
            onConfirm: () => {
              hideModal();
              navigation.goBack();
            },
          });
          return;
        }
      }

      const { hasAccess, userAccountType } = await checkAccountTypeAccess(
        "Premium"
      );

      if (!hasAccess) {
        setLoading(false);
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.accessRestricted"),
          message: t(
            userLanguage,
            "withdrawalRequest.modals.premiumRequired"
          ).replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            navigation.goBack();
          },
        });
        return;
      }

      await fetchUserData();
    } catch (error) {
      console.error("Error checking account access:", error);
      setLoading(false);
      showModal({
        title: t(userLanguage, "withdrawalRequest.modals.error"),
        message: t(userLanguage, "withdrawalRequest.modals.errorMessage"),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        },
      });
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData({
            firstName: data.firstName,
            lastName: data.lastName,
            availBalanceAmount: data.availBalanceAmount || 0,
            agentWalletAmount: data.agentWalletAmount || 0,
          });
        } else {
          // console.log("No such document!");
        }
      }
    } catch (error) {
      // console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const [amount, setAmount] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  // EWallet fields
  const [ewalletAccountNumber, setEwalletAccountNumber] = useState("");
  const [ewalletAccountName, setEwalletAccountName] = useState("");

  // Step navigation functions
  const goToNextStep = () => {
    if (currentStep === 1) {
      // Step 1: Validate withdrawal type selection
      if (!withdrawalType) {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.missingInformation"),
          message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Step 2: Validate withdrawal method selection
      if (!withdrawalMethod) {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.missingInformation"),
          message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Step 3: Validate banking/wallet information
      if (withdrawalMethod === "Local Bank") {
        // Validate banking information
        if (
          !bankAccountNumber ||
          !bankAccountName ||
          !bankName ||
          !branchName
        ) {
          showModal({
            title: t(
              userLanguage,
              "withdrawalRequest.modals.missingInformation"
            ),
            message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
            type: "warning",
          });
          return;
        }
      } else if (withdrawalMethod === "EWallet") {
        // Validate EWallet type selection and wallet account info
        if (!ewalletType || !ewalletAccountNumber || !ewalletAccountName) {
          showModal({
            title: t(
              userLanguage,
              "withdrawalRequest.modals.missingInformation"
            ),
            message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
            type: "warning",
          });
          return;
        }
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Step 4: Validate amount and contact info (for both Local Bank and EWallet)
      if (!amount || !emailAddress) {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.missingInformation"),
          message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(5);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetForm = () => {
    setWithdrawalType(null);
    setWithdrawalMethod(null);
    setEwalletType(null);
    setAmount("");
    setEmailAddress("");
    setBankAccountNumber("");
    setBankAccountName("");
    setBankName("");
    setBranchName("");
    setEwalletAccountNumber("");
    setEwalletAccountName("");
    setCurrentStep(1);
  };

  const onSubmit = async () => {
    // Validate based on withdrawal method
    if (withdrawalMethod === "Local Bank") {
      if (
        !amount ||
        !emailAddress ||
        !bankAccountName ||
        !bankAccountNumber ||
        !bankName ||
        !branchName ||
        !withdrawalMethod ||
        !withdrawalType
      ) {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.missingInformation"),
          message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
          type: "warning",
        });
        return;
      }
    } else if (withdrawalMethod === "EWallet") {
      if (
        !amount ||
        !emailAddress ||
        !ewalletAccountNumber ||
        !ewalletAccountName ||
        !ewalletType ||
        !withdrawalMethod ||
        !withdrawalType
      ) {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.missingInformation"),
          message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
          type: "warning",
        });
        return;
      }
    } else {
      showModal({
        title: t(userLanguage, "withdrawalRequest.modals.missingInformation"),
        message: t(userLanguage, "withdrawalRequest.modals.fillAllFields"),
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: t(
            userLanguage,
            "withdrawalRequest.modals.authenticationError"
          ),
          message: t(userLanguage, "withdrawalRequest.modals.loginToSubmit"),
          type: "error",
        });
        return;
      }

      // Validate amount
      const withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.invalidAmount"),
          message: t(userLanguage, "withdrawalRequest.modals.enterValidAmount"),
          type: "error",
        });
        return;
      }

      // Check balance based on withdrawal type
      if (withdrawalType === "Available Balance") {
        const availableBalance = userData.availBalanceAmount || 0;
        if (withdrawalAmount > availableBalance) {
          showModal({
            title: t(
              userLanguage,
              "withdrawalRequest.modals.insufficientBalance"
            ),
            message: t(
              userLanguage,
              "withdrawalRequest.modals.insufficientBalanceMessage"
            ).replace("{amount}", availableBalance.toLocaleString()),
            type: "error",
          });
          setIsSubmitting(false);
          return;
        }
      } else if (withdrawalType === "Agent Withdrawal") {
        const agentWalletBalance = userData.agentWalletAmount || 0;
        if (withdrawalAmount > agentWalletBalance) {
          showModal({
            title: t(
              userLanguage,
              "withdrawalRequest.modals.insufficientAgentBalance"
            ),
            message: t(
              userLanguage,
              "withdrawalRequest.modals.insufficientAgentBalanceMessage"
            ).replace("{amount}", agentWalletBalance.toLocaleString()),
            type: "error",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare withdrawal data for Firebase
      const withdrawalData = {
        // User information
        userId: user.uid,
        userName: `${userData.firstName} ${userData.lastName}`,
        userEmail: user.email,

        // Withdrawal details
        withdrawalType: withdrawalType, // "Available Balance" or "Agent Withdrawal"
        withdrawalMethod: withdrawalMethod, // "Local Bank" or "EWallet"
        ewalletType: withdrawalMethod === "EWallet" ? ewalletType : null, // "Gcash" or "Maya"
        amount: withdrawalAmount,
        currency: "PHP",

        // Contact information
        emailAddress: emailAddress,

        // Banking information (for Local Bank)
        bankAccountNumber:
          withdrawalMethod === "Local Bank" ? bankAccountNumber : "",
        bankAccountName:
          withdrawalMethod === "Local Bank" ? bankAccountName : "",
        bankName: withdrawalMethod === "Local Bank" ? bankName : "",
        branchName: withdrawalMethod === "Local Bank" ? branchName : "",

        // EWallet information (for EWallet)
        ewalletAccountNumber:
          withdrawalMethod === "EWallet" ? ewalletAccountNumber : "",
        ewalletAccountName:
          withdrawalMethod === "EWallet" ? ewalletAccountName : "",

        // Request metadata
        requestType: "Withdrawal Request",
        status: "Pending",
        submittedAt: new Date(),
        processedAt: null,

        // Additional fields
        notes: "",
        approvedBy: "",
        approvedAt: null,
        rejectionReason: "",
        transactionId: "",
        processingFee: 0,
        netAmount: withdrawalAmount,
      };

      // Save to user's personal withdrawal history subcollection only
      const userWithdrawalRef = await addDoc(
        collection(db, "users", user.uid, "withdrawals"),
        {
          ...withdrawalData,
          requestType: "Withdrawal Request",
        }
      );

      console.log(
        "✅ Withdrawal saved to user's personal collection with ID:",
        userWithdrawalRef.id
      );

      // Send email notification
      let emailMessage = `Name: ${userData.firstName} ${
        userData.lastName
      }\nAmount: ₱${withdrawalAmount.toLocaleString()}\nEmail Address: ${emailAddress}\nWithdrawal Type: ${withdrawalType}\nWithdrawal Method: ${withdrawalMethod}\n`;

      if (withdrawalMethod === "Local Bank") {
        emailMessage += `Bank Account Number: ${bankAccountNumber}\nBank Account Holder Name: ${bankAccountName}\nBank Name: ${bankName}\nBank Branch Name: ${branchName}\n`;
      } else if (withdrawalMethod === "EWallet") {
        emailMessage += `E-Wallet Type: ${ewalletType}\nE-Wallet Account Number: ${ewalletAccountNumber}\nE-Wallet Account Name: ${ewalletAccountName}\n`;
      }

      emailMessage += `Request ID: ${userWithdrawalRef.id}`;

      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          emailAddress,
          message: emailMessage,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      // Play success sound
      playWithdrawalSound();
      showModal({
        title: t(
          userLanguage,
          "withdrawalRequest.modals.submittedSuccessfully"
        ),
        message: t(
          userLanguage,
          "withdrawalRequest.modals.submittedMessage"
        ).replace("{requestId}", userWithdrawalRef.id),
        type: "success",
      });

      // Reset form after successful submission
      resetForm();
      setIsSubmitting(false);
    } catch (err) {
      console.error("Error submitting withdrawal request:", err);

      if (err instanceof EmailJSResponseStatus) {
        console.log("EmailJS Request Failed...", err);
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.partialSuccess"),
          message: t(
            userLanguage,
            "withdrawalRequest.modals.savedButEmailFailed"
          ),
          type: "warning",
        });
      } else {
        showModal({
          title: t(userLanguage, "withdrawalRequest.modals.submissionFailed"),
          message: t(
            userLanguage,
            "withdrawalRequest.modals.unableToSubmit"
          ).replace("{error}", err.message),
          type: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Select Withdrawal Type (Available Balance or Agent Withdrawal)
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="wallet" size={32} color="white" />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(
                  userLanguage,
                  "withdrawalRequest.content.selectWithdrawalType"
                )}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                {t(
                  userLanguage,
                  "withdrawalRequest.content.chooseWithdrawalType"
                )}
              </Text>
            </View>

            <View style={styles.investmentOptionsContainer}>
              {withdrawalTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.investmentOption,
                    withdrawalType === option.value &&
                      styles.investmentOptionSelected,
                  ]}
                  onPress={() => setWithdrawalType(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.investmentOptionContent}>
                    <View style={styles.investmentOptionLeft}>
                      <View
                        style={[
                          styles.investmentOptionIconContainer,
                          withdrawalType === option.value &&
                            styles.investmentOptionIconContainerSelected,
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={28}
                          color={
                            withdrawalType === option.value
                              ? "white"
                              : Colors.redTheme.background
                          }
                        />
                      </View>
                      <View style={styles.investmentOptionInfo}>
                        <Text
                          style={[
                            styles.investmentOptionTitle,
                            withdrawalType === option.value &&
                              styles.investmentOptionTitleSelected,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.investmentOptionSubtitle,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {option.description}
                        </Text>
                        {withdrawalType === option.value &&
                          option.value === "Available Balance" && (
                            <Text
                              style={[
                                styles.balanceInfoText,
                                getRTLStyles(userLanguage),
                                { marginTop: 8 },
                              ]}
                            >
                              {t(
                                userLanguage,
                                "withdrawalRequest.content.availableBalanceInfo"
                              ).replace(
                                "{amount}",
                                (
                                  userData.availBalanceAmount || 0
                                ).toLocaleString()
                              )}
                            </Text>
                          )}
                        {withdrawalType === option.value &&
                          option.value === "Agent Withdrawal" && (
                            <Text
                              style={[
                                styles.balanceInfoText,
                                getRTLStyles(userLanguage),
                                { marginTop: 8 },
                              ]}
                            >
                              {t(
                                userLanguage,
                                "withdrawalRequest.content.agentWalletBalanceInfo"
                              ).replace(
                                "{amount}",
                                (
                                  userData.agentWalletAmount || 0
                                ).toLocaleString()
                              )}
                            </Text>
                          )}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        withdrawalType === option.value &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {withdrawalType === option.value && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        // Step 2: Select Withdrawal Method (Local Bank or EWallet)
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="card" size={32} color="white" />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(
                  userLanguage,
                  "withdrawalRequest.content.selectWithdrawalMethod"
                )}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                {t(
                  userLanguage,
                  "withdrawalRequest.content.chooseWithdrawalMethod"
                )}
              </Text>
            </View>

            <View style={styles.investmentOptionsContainer}>
              {withdrawalMethodOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.investmentOption,
                    withdrawalMethod === option.value &&
                      styles.investmentOptionSelected,
                  ]}
                  onPress={() => setWithdrawalMethod(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.investmentOptionContent}>
                    <View style={styles.investmentOptionLeft}>
                      <View
                        style={[
                          styles.investmentOptionIconContainer,
                          withdrawalMethod === option.value &&
                            styles.investmentOptionIconContainerSelected,
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={28}
                          color={
                            withdrawalMethod === option.value
                              ? "white"
                              : Colors.redTheme.background
                          }
                        />
                      </View>
                      <View style={styles.investmentOptionInfo}>
                        <Text
                          style={[
                            styles.investmentOptionTitle,
                            withdrawalMethod === option.value &&
                              styles.investmentOptionTitleSelected,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.investmentOptionSubtitle,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {option.description}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        withdrawalMethod === option.value &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {withdrawalMethod === option.value && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        // Step 2: Banking Information (Local Bank) OR EWallet Type Selection (EWallet)
        if (withdrawalMethod === "Local Bank") {
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Ionicons
                  name="business-outline"
                  size={48}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.bankingInformation"
                  )}
                </Text>
                <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.enterBankingDetails"
                  )}
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.bankAccountNumber"
                  )}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.bankAccountNumberPlaceholder"
                  )}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={bankAccountNumber}
                  onChangeText={setBankAccountNumber}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.accountHolderName"
                  )}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.accountHolderNamePlaceholder"
                  )}
                  placeholderTextColor="#999"
                  value={bankAccountName}
                  onChangeText={setBankAccountName}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "withdrawalRequest.content.bankName")}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.bankNamePlaceholder"
                  )}
                  placeholderTextColor="#999"
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "withdrawalRequest.content.branchName")}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.branchNamePlaceholder"
                  )}
                  placeholderTextColor="#999"
                  value={branchName}
                  onChangeText={setBranchName}
                />
              </View>
            </View>
          );
        } else if (withdrawalMethod === "EWallet") {
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Ionicons
                  name="wallet-outline"
                  size={48}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.walletInformation"
                  )}
                </Text>
                <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.enterWalletDetails"
                  )}
                </Text>
              </View>

              {/* EWallet Type Selection */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.selectEWalletType"
                  )}
                </Text>
                <View style={styles.investmentOptionsContainer}>
                  {ewalletTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.investmentOption,
                        ewalletType === option.value &&
                          styles.investmentOptionSelected,
                      ]}
                      onPress={() => setEwalletType(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.investmentOptionContent}>
                        <View style={styles.investmentOptionLeft}>
                          <View
                            style={[
                              styles.investmentOptionIconContainer,
                              ewalletType === option.value &&
                                styles.investmentOptionIconContainerSelected,
                            ]}
                          >
                            <Ionicons
                              name={option.icon}
                              size={28}
                              color={
                                ewalletType === option.value
                                  ? "white"
                                  : Colors.redTheme.background
                              }
                            />
                          </View>
                          <View style={styles.investmentOptionInfo}>
                            <Text
                              style={[
                                styles.investmentOptionTitle,
                                ewalletType === option.value &&
                                  styles.investmentOptionTitleSelected,
                                getRTLStyles(userLanguage),
                              ]}
                            >
                              {option.label}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.radioButton,
                            ewalletType === option.value &&
                              styles.radioButtonSelected,
                          ]}
                        >
                          {ewalletType === option.value && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Wallet Account Number */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.walletAccountNumber"
                  )}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.walletAccountNumberPlaceholder"
                  )}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={ewalletAccountNumber}
                  onChangeText={setEwalletAccountNumber}
                />
              </View>

              {/* Wallet Account Name */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.walletAccountName"
                  )}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.walletAccountNamePlaceholder"
                  )}
                  placeholderTextColor="#999"
                  value={ewalletAccountName}
                  onChangeText={setEwalletAccountName}
                />
              </View>
            </View>
          );
        }
        return null;

      case 4:
        // Step 4: Amount & Contact Info (for both Local Bank and EWallet)
        if (withdrawalMethod === "Local Bank") {
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Ionicons
                  name="cash-outline"
                  size={48}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalAmount"
                  )}
                </Text>
                <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.enterAmountAndContact"
                  )}
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalAmount"
                  )}
                </Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>₱</Text>
                  <TextInput
                    style={[
                      styles.amountInputSeparated,
                      getRTLStyles(userLanguage),
                    ]}
                    placeholder={t(
                      userLanguage,
                      "withdrawalRequest.content.enterWithdrawalAmount"
                    )}
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <View style={styles.balanceInfoCard}>
                  <Ionicons
                    name={
                      withdrawalType === "Available Balance"
                        ? "wallet"
                        : "person-circle"
                    }
                    size={16}
                    color={Colors.redTheme.background}
                  />
                  <Text
                    style={[styles.balanceInfoText, getRTLStyles(userLanguage)]}
                  >
                    {withdrawalType === "Available Balance"
                      ? t(
                          userLanguage,
                          "withdrawalRequest.content.availableBalanceInfo"
                        ).replace(
                          "{amount}",
                          (userData.availBalanceAmount || 0).toLocaleString()
                        )
                      : t(
                          userLanguage,
                          "withdrawalRequest.content.agentWalletBalanceInfo"
                        ).replace(
                          "{amount}",
                          (userData.agentWalletAmount || 0).toLocaleString()
                        )}
                  </Text>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "withdrawalRequest.content.emailAddress")}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.emailPlaceholder"
                  )}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                />
              </View>
            </View>
          );
        } else if (withdrawalMethod === "EWallet") {
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Ionicons
                  name="cash-outline"
                  size={48}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalAmount"
                  )}
                </Text>
                <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.enterAmountAndContact"
                  )}
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalAmount"
                  )}
                </Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>₱</Text>
                  <TextInput
                    style={[
                      styles.amountInputSeparated,
                      getRTLStyles(userLanguage),
                    ]}
                    placeholder={t(
                      userLanguage,
                      "withdrawalRequest.content.enterWithdrawalAmount"
                    )}
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <View style={styles.balanceInfoCard}>
                  <Ionicons
                    name={
                      withdrawalType === "Available Balance"
                        ? "wallet"
                        : "person-circle"
                    }
                    size={16}
                    color={Colors.redTheme.background}
                  />
                  <Text
                    style={[styles.balanceInfoText, getRTLStyles(userLanguage)]}
                  >
                    {withdrawalType === "Available Balance"
                      ? t(
                          userLanguage,
                          "withdrawalRequest.content.availableBalanceInfo"
                        ).replace(
                          "{amount}",
                          (userData.availBalanceAmount || 0).toLocaleString()
                        )
                      : t(
                          userLanguage,
                          "withdrawalRequest.content.agentWalletBalanceInfo"
                        ).replace(
                          "{amount}",
                          (userData.agentWalletAmount || 0).toLocaleString()
                        )}
                  </Text>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "withdrawalRequest.content.emailAddress")}
                </Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(
                    userLanguage,
                    "withdrawalRequest.content.emailPlaceholder"
                  )}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                />
              </View>
            </View>
          );
        }
        return null;

      case 5:
        // Step 5: Review & Confirm
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "withdrawalRequest.content.reviewConfirm")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "withdrawalRequest.content.reviewDetails")}
              </Text>
            </View>

            <View style={styles.confirmationContainer}>
              {/* Withdrawal Method Card */}
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalMethod"
                  )}
                </Text>
                <Text style={styles.confirmValue}>
                  {withdrawalMethodOptions.find(
                    (opt) => opt.value === withdrawalMethod
                  )?.label || ""}
                </Text>
              </View>

              {/* EWallet Type Card (if EWallet) */}
              {withdrawalMethod === "EWallet" && ewalletType && (
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmLabel}>
                    {t(userLanguage, "withdrawalRequest.content.eWalletType")}
                  </Text>
                  <Text style={styles.confirmValue}>{ewalletType}</Text>
                </View>
              )}

              {/* Banking/Wallet Information Card */}
              <View style={styles.confirmCard}>
                {withdrawalMethod === "Local Bank" ? (
                  <>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(
                          userLanguage,
                          "withdrawalRequest.content.bankAccountNumber"
                        )}
                      </Text>
                      <Text style={styles.confirmValue}>
                        {bankAccountNumber}
                      </Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(
                          userLanguage,
                          "withdrawalRequest.content.accountHolderName"
                        )}
                      </Text>
                      <Text style={styles.confirmValue}>{bankAccountName}</Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(userLanguage, "withdrawalRequest.content.bankName")}
                      </Text>
                      <Text style={styles.confirmValue}>{bankName}</Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(
                          userLanguage,
                          "withdrawalRequest.content.branchName"
                        )}
                      </Text>
                      <Text style={styles.confirmValue}>{branchName}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(
                          userLanguage,
                          "withdrawalRequest.content.walletAccountNumber"
                        )}
                      </Text>
                      <Text style={styles.confirmValue}>
                        {ewalletAccountNumber}
                      </Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(
                          userLanguage,
                          "withdrawalRequest.content.walletAccountName"
                        )}
                      </Text>
                      <Text style={styles.confirmValue}>
                        {ewalletAccountName}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Amount Card */}
              <View style={styles.confirmAmountCard}>
                <Text style={styles.confirmAmountLabel}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalAmount"
                  )}
                </Text>
                <Text style={styles.confirmAmountValue}>
                  ₱
                  {parseFloat(amount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Email Card */}
              <View style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>
                    {t(userLanguage, "withdrawalRequest.content.emailAddress")}
                  </Text>
                  <Text style={styles.confirmValue}>{emailAddress}</Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <SimpleLoadingScreen message="Processing withdrawal..." />;
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentStep / 5) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {t(userLanguage, "withdrawalRequest.content.step")} {currentStep}{" "}
              {t(userLanguage, "withdrawalRequest.content.of")} 5
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
                <Text style={styles.backButtonText}>
                  {t(userLanguage, "withdrawalRequest.content.back")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
              onPress={currentStep === 5 ? onSubmit : goToNextStep}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 5
                  ? isSubmitting
                    ? t(userLanguage, "withdrawalRequest.content.submitting")
                    : t(userLanguage, "withdrawalRequest.content.confirmSubmit")
                  : t(userLanguage, "withdrawalRequest.content.continue")}
              </Text>
              <Ionicons
                name={currentStep === 5 ? "checkmark-circle" : "arrow-forward"}
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCloseButton={modalConfig.showCloseButton}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 100 : 80,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header Card
  headerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 5,
    borderLeftColor: Colors.redTheme.background,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 16,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  // Instruction Card
  instructionCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Form Card
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 20,
    textAlign: "center",
  },

  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.2)",
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Dropdown Styles
  dropdownContainer: {
    marginBottom: 0,
  },
  dropdown: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownList: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
    borderWidth: 2,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: "#999",
  },

  // User Info Card
  userInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(204, 33, 53, 0.1)",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  userInfoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.redTheme.background,
  },

  // Balance Info Card
  balanceInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  balanceInfoText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },

  // Security Card
  securityCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  securityText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },

  // Submit Button
  submitButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Legacy styles (removed as they're replaced by new design)
  backButton: {
    // Removed as it's handled by navigation
  },

  // New styles for modal selector
  modalSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  modalSelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 0,
    width: "92%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fafbfc",
    position: "relative",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
    textAlign: "center",
    paddingRight: 40,
    paddingLeft: 24,
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 16,
  },
  optionList: {
    paddingVertical: 8,
    maxHeight: 350,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  optionText: {
    fontSize: 17,
    color: "#222",
    fontWeight: "500",
  },
  selectedOption: {
    backgroundColor: "rgba(204,33,53,0.08)",
  },
  selectedOptionText: {
    color: Colors.redTheme.background,
    fontWeight: "bold",
  },
  checkmarkCircle: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  // Multi-step UI styles
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 100,
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
    color: "#666",
    textAlign: "center",
  },
  investmentOptionsContainer: {
    gap: 16,
  },
  investmentOption: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  investmentOptionSelected: {
    borderColor: Colors.redTheme.background,
    borderWidth: 3,
    backgroundColor: "white",
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  investmentOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  investmentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  investmentOptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.redTheme.background + "12",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  investmentOptionIconContainerSelected: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background + "30",
  },
  investmentOptionInfo: {
    flex: 1,
  },
  investmentOptionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  investmentOptionTitleSelected: {
    color: Colors.redTheme.background,
    fontWeight: "700",
  },
  investmentOptionSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencyPrefix: {
    fontSize: 18,
    color: Colors.redTheme.background,
    fontWeight: "600",
    marginRight: 8,
  },
  amountInputSeparated: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
    paddingVertical: 16,
  },
  balanceInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.redTheme.background + "08",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  balanceInfoText: {
    fontSize: 13,
    color: Colors.redTheme.background,
    fontWeight: "500",
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
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
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  confirmationContainer: {
    gap: 16,
  },
  confirmCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  confirmValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  confirmAmountCard: {
    backgroundColor: Colors.redTheme.background + "08",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.redTheme.background + "20",
    alignItems: "center",
  },
  confirmAmountLabel: {
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "600",
    marginBottom: 8,
  },
  confirmAmountValue: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  confirmAmountSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
