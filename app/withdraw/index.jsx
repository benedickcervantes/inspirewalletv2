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
  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  // Add modal state for withdrawal type
  const [withdrawalTypeModalVisible, setWithdrawalTypeModalVisible] =
    useState(false);

  // Define withdrawal type options
  const withdrawalTypeOptions = [
    {
      label: t(userLanguage, "withdrawalRequest.content.availableBalance"),
      value: "Available Balance",
      icon: () => (
        <Ionicons name="wallet" size={20} color={Colors.redTheme.background} />
      ),
    },
    {
      label: t(userLanguage, "withdrawalRequest.content.agentWithdrawal"),
      value: "Agent Withdrawal",
      icon: () => (
        <Ionicons
          name="person-circle"
          size={20}
          color={Colors.redTheme.background}
        />
      ),
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

  const [amount, setAmount] = useState();
  const [emailAddress, setEmailAddress] = useState();
  const [bankAccountNumber, setBankAccountNumber] = useState();
  const [bankAccountName, setBankAccountName] = useState();
  const [bankName, setBankName] = useState();
  const [branchName, setBranchName] = useState();

  const onSubmit = async () => {
    if (
      !amount ||
      !emailAddress ||
      !bankAccountName ||
      !bankAccountNumber ||
      !bankName ||
      !branchName ||
      !type
    ) {
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

      // Check available balance for "Available Balance" withdrawal type
      if (type === "Available Balance") {
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
          return;
        }
      }

      // Check agent wallet balance for "Agent Withdrawal" type
      if (type === "Agent Withdrawal") {
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
        withdrawalType: type,
        amount: withdrawalAmount,
        currency: "PHP",

        // Contact information
        emailAddress: emailAddress,

        // Banking information
        bankAccountNumber: bankAccountNumber,
        bankAccountName: bankAccountName,
        bankName: bankName,
        branchName: branchName,

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
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          emailAddress,
          message: `Name: ${userData.firstName} ${
            userData.lastName
          }\nAmount: ₱${withdrawalAmount.toLocaleString()}\nEmail Address: ${emailAddress}\nBank Account Number: ${bankAccountNumber}\nBank Account Holder Name: ${bankAccountName}\nBank Name: ${bankName}\nBank Branch Name: ${branchName}\nType: ${type}\nRequest ID: ${
            userWithdrawalRef.id
          }`,
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
      setAmount("");
      setEmailAddress("");
      setBankAccountNumber("");
      setBankAccountName("");
      setBankName("");
      setBranchName("");
      setType(null);
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

  if (loading) {
    return <SimpleLoadingScreen message="Processing withdrawal..." />;
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header Card */}
              <View style={styles.headerCard}>
                <View style={styles.headerContent}>
                  <Ionicons
                    name="trending-down"
                    size={32}
                    color={Colors.redTheme.background}
                    style={styles.headerIcon}
                  />
                  <View style={styles.headerTextContainer}>
                    <Text
                      style={[styles.headerTitle, getRTLStyles(userLanguage)]}
                    >
                      {t(userLanguage, "withdrawalRequest.content.title")}
                    </Text>
                    <Text
                      style={[
                        styles.headerSubtitle,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "withdrawalRequest.content.subtitle")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Instructions Card */}
              <View style={styles.instructionCard}>
                <View style={styles.instructionHeader}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                  <Text
                    style={[
                      styles.instructionTitle,
                      getRTLStyles(userLanguage),
                    ]}
                  >
                    {t(
                      userLanguage,
                      "withdrawalRequest.content.instructionTitle"
                    )}
                  </Text>
                </View>
                <Text
                  style={[styles.instructionText, getRTLStyles(userLanguage)]}
                >
                  {t(userLanguage, "withdrawalRequest.content.instructionText")}
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(
                    userLanguage,
                    "withdrawalRequest.content.withdrawalDetails"
                  )}
                </Text>

                {/* Withdrawal Type Section */}
                <View style={styles.formSection}>
                  <Text
                    style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(
                      userLanguage,
                      "withdrawalRequest.content.withdrawalType"
                    )}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      {t(
                        userLanguage,
                        "withdrawalRequest.content.selectWithdrawalType"
                      )}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalSelector}
                      onPress={() => setWithdrawalTypeModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalSelectorText,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {withdrawalTypeOptions.find((opt) => opt.value === type)
                          ?.label ||
                          t(
                            userLanguage,
                            "withdrawalRequest.content.chooseWithdrawalType"
                          )}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={Colors.redTheme.background}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      {t(
                        userLanguage,
                        "withdrawalRequest.content.withdrawalAmount"
                      )}
                    </Text>
                    <TextInput
                      style={[styles.input, getRTLStyles(userLanguage)]}
                      placeholder={t(
                        userLanguage,
                        "withdrawalRequest.content.enterWithdrawalAmount"
                      )}
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={(value) => setAmount(value)}
                    />
                    {type === "Available Balance" && (
                      <View style={styles.balanceInfoCard}>
                        <Ionicons
                          name="wallet"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                        <Text
                          style={[
                            styles.balanceInfoText,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(
                            userLanguage,
                            "withdrawalRequest.content.availableBalanceInfo"
                          ).replace(
                            "{amount}",
                            (userData.availBalanceAmount || 0).toLocaleString()
                          )}
                        </Text>
                      </View>
                    )}
                    {type === "Agent Withdrawal" && (
                      <View style={styles.balanceInfoCard}>
                        <Ionicons
                          name="person-circle"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                        <Text
                          style={[
                            styles.balanceInfoText,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(
                            userLanguage,
                            "withdrawalRequest.content.agentWalletBalanceInfo"
                          ).replace(
                            "{amount}",
                            (userData.agentWalletAmount || 0).toLocaleString()
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Contact Information Section */}
                <View style={styles.formSection}>
                  <Text
                    style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(
                      userLanguage,
                      "withdrawalRequest.content.contactInformation"
                    )}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      {t(
                        userLanguage,
                        "withdrawalRequest.content.emailAddress"
                      )}
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
                      onChangeText={(value) => setEmailAddress(value)}
                    />
                  </View>

                  {userData.firstName && userData.lastName && (
                    <View style={styles.userInfoCard}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={Colors.redTheme.background}
                      />
                      <Text
                        style={[
                          styles.userInfoText,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {t(
                          userLanguage,
                          "withdrawalRequest.content.accountHolder"
                        )
                          .replace("{firstName}", userData.firstName)
                          .replace("{lastName}", userData.lastName)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Banking Information Section */}
                <View style={styles.formSection}>
                  <Text
                    style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(
                      userLanguage,
                      "withdrawalRequest.content.bankingInformation"
                    )}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
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
                      onChangeText={(value) => setBankAccountNumber(value)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
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
                      onChangeText={(value) => setBankAccountName(value)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
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
                      onChangeText={(value) => setBankName(value)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
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
                      onChangeText={(value) => setBranchName(value)}
                    />
                  </View>
                </View>
              </View>

              {/* Security Notice Card */}
              <View style={styles.securityCard}>
                <View style={styles.securityHeader}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                  <Text
                    style={[styles.securityTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(
                      userLanguage,
                      "withdrawalRequest.content.securityProcessing"
                    )}
                  </Text>
                </View>
                <Text style={[styles.securityText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "withdrawalRequest.content.securityText")}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isSubmitting ||
                    (type === "Available Balance" &&
                      parseFloat(amount || 0) >
                        (userData.availBalanceAmount || 0)) ||
                    (type === "Agent Withdrawal" &&
                      parseFloat(amount || 0) >
                        (userData.agentWalletAmount || 0))) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={
                  isSubmitting ||
                  (type === "Available Balance" &&
                    parseFloat(amount || 0) >
                      (userData.availBalanceAmount || 0)) ||
                  (type === "Agent Withdrawal" &&
                    parseFloat(amount || 0) > (userData.agentWalletAmount || 0))
                }
              >
                <View style={styles.submitButtonContent}>
                  {isSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={styles.loadingIcon}
                    />
                  ) : (
                    <Ionicons
                      name="send-outline"
                      size={20}
                      color="white"
                      style={styles.submitIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.submitButtonText,
                      getRTLStyles(userLanguage),
                    ]}
                  >
                    {isSubmitting
                      ? t(userLanguage, "withdrawalRequest.content.submitting")
                      : (type === "Available Balance" &&
                          parseFloat(amount || 0) >
                            (userData.availBalanceAmount || 0)) ||
                        (type === "Agent Withdrawal" &&
                          parseFloat(amount || 0) >
                            (userData.agentWalletAmount || 0))
                      ? t(
                          userLanguage,
                          "withdrawalRequest.content.insufficientBalance"
                        )
                      : t(
                          userLanguage,
                          "withdrawalRequest.content.submitWithdrawalRequest"
                        )}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </TouchableWithoutFeedback>
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

      {/* Modal for withdrawal type selection */}
      <Modal
        visible={withdrawalTypeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWithdrawalTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>
                {t(
                  userLanguage,
                  "withdrawalRequest.modals.selectWithdrawalType"
                )}
              </Text>
              <TouchableOpacity
                onPress={() => setWithdrawalTypeModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.optionList}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {withdrawalTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      type === option.value && styles.selectedOption,
                    ]}
                    onPress={() => {
                      setType(option.value);
                      setWithdrawalTypeModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {option.icon()}
                      <Text
                        style={[
                          styles.optionText,
                          getRTLStyles(userLanguage),
                          type === option.value && styles.selectedOptionText,
                          { marginLeft: 12 },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {type === option.value && (
                      <View style={styles.checkmarkCircle}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
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
});
