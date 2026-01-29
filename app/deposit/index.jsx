import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  SafeAreaView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Animated,
  useRef,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "expo-router";
import { send } from "@emailjs/react-native";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Colors } from "../../constants/Colors";
import SimpleLoadingScreen from "../../components/SimpleLoadingScreen";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import DepositReceipt from "../../components/DepositReceipt";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { playDepositSound } from "../../utils/soundUtils";

export default function Index() {
  const db = getFirestore();
  const auth = getAuth();
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [amount, setAmount] = useState("");
  const [type, setType] = useState(null);
  const [open, setOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractType, setContractType] = useState(null);
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("PHP");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [phpEstimate, setPhpEstimate] = useState("");
  const [currentRate, setCurrentRate] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [phpConvertedAmount, setPhpConvertedAmount] = useState("");
  const [userLanguage, setUserLanguage] = useState("english");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  // Deposit receipt modal state
  const [depositReceiptVisible, setDepositReceiptVisible] = useState(false);
  const [depositRequests, setDepositRequests] = useState([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);

  // 1. Add modal state for investment type and contract period
  const [investmentTypeModalVisible, setInvestmentTypeModalVisible] =
    useState(false);
  const [contractTypeModalVisible, setContractTypeModalVisible] =
    useState(false);

  // 2. Define options for investment type and contract period
  const investmentTypeOptions = [
    {
      label: t(userLanguage, "deposit.content.timeDeposit"),
      value: "Time Deposit",
    },
    {
      label: t(userLanguage, "deposit.content.stockInvestment"),
      value: "Stock",
    },
  ];
  const contractTypeOptions = [
    {
      label: t(userLanguage, "deposit.content.sixMonthsContract"),
      value: "6_months",
    },
    {
      label: t(userLanguage, "deposit.content.oneYearContract"),
      value: "1_year",
    },
    {
      label: t(userLanguage, "deposit.content.twoYearsContract"),
      value: "2_years",
    },
  ];

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
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

  // Currency options for the dropdown/modal
  const currencyOptions = [
    { label: "🇵🇭 PHP", value: "PHP" },
    { label: "🇺🇸 USD", value: "USD" },
    { label: "🇪🇺 EUR", value: "EUR" },
    { label: "🇯🇵 JPY", value: "JPY" },
    { label: "🇭🇰 HKD", value: "HKD" },
    { label: "🇦🇺 AUD", value: "AUD" },
    { label: "🇸🇬 SGD", value: "SGD" },
    { label: "🇨🇦 CAD", value: "CAD" },
    { label: "🇬🇧 GBP", value: "GBP" },
    { label: "🇨🇭 CHF", value: "CHF" },
    { label: "🇨🇳 CNY", value: "CNY" },
  ];

  // Minimum PHP equivalent for Stock Investment
  const STOCK_MIN_PHP = 2000000;
  // Minimum PHP equivalent for Time Deposit
  const TIME_DEPOSIT_MIN_PHP = 50000;

  // Calculate PHP estimate when amount or currency changes
  useEffect(() => {
    if (amount && selectedCurrency) {
      if (selectedCurrency === "PHP") {
        // Directly set PHP estimate and converted amount for PHP
        setPhpEstimate(
          `₱${parseFloat(amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        );
        setPhpConvertedAmount(amount);
        setCurrentRate(1);
      } else {
        calculatePhpEstimate();
      }
    } else {
      setPhpEstimate("");
      setPhpConvertedAmount("");
      setCurrentRate(0);
    }
  }, [amount, selectedCurrency]);

  const calculatePhpEstimate = async () => {
    if (!amount || selectedCurrency === "PHP") return;
    setIsCalculating(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_INSPIRE_FOREX_BASE_URL}/calculate-deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.EXPO_PUBLIC_INSPIRE_FOREX_API_KEY,
          },
          body: JSON.stringify({
            currency: selectedCurrency,
            amount: parseFloat(amount),
          }),
        }
      );

      if (!response.ok) {
        setPhpEstimate("Rate unavailable");
        setCurrentRate(0);
        setIsCalculating(false);
        setPhpConvertedAmount("");
        return;
      }

      const data = await response.json();
      if (data.convertedAmount && data.rateUsed) {
        setCurrentRate(data.rateUsed);
        setPhpEstimate(
          `≈ ₱${parseFloat(data.convertedAmount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        );
        setPhpConvertedAmount(data.convertedAmount);
      } else {
        setPhpEstimate("Rate unavailable");
        setCurrentRate(0);
        setPhpConvertedAmount("");
      }
    } catch (error) {
      console.error("Error calculating PHP estimate:", error);
      setPhpEstimate("Rate unavailable");
      setCurrentRate(0);
      setPhpConvertedAmount("");
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "deposit.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.redTheme.background}
          />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleOpenDepositReceipt}
          style={styles.notificationButton}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={Colors.redTheme.background}
          />
          {depositRequests.length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {depositRequests.length > 99 ? "99+" : depositRequests.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [depositRequests.length, userLanguage]);

  useEffect(() => {
    // Check maintenance mode from appSettings
    const appSettingsRef = doc(db, "appSettings", "QmHQ2bo3C7hupza7S1EA");
    const unsubscribeSettings = onSnapshot(
      appSettingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const settings = docSnap.data();
          // If deposit field is false, it means maintenance is ON
          const isInMaintenance = settings.deposit === false;
          setIsMaintenanceMode(isInMaintenance);

          if (isInMaintenance) {
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
          }
        }
      },
      (error) => {
        console.error("Error fetching app settings:", error);
      }
    );

    const fetchUserData = async () => {
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
              email: user.email || "",
            });
          } else {
            console.log("No such document!");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchPendingDeposits = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        setIsLoadingDeposits(true);

        // Fetch only deposits with status == "pending" from users/{userId}/depositRequest
        const depositQuery = query(
          collection(db, "users", user.uid, "depositRequest"),
          where("status", "==", "pending")
        );
        const depositSnapshot = await getDocs(depositQuery);
        const pendingDeposits = depositSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        console.log("Fetched pending deposits:", pendingDeposits.length);
        console.log("Deposit data:", pendingDeposits);

        setDepositRequests(pendingDeposits);
      } catch (error) {
        console.error("Error fetching pending deposits:", error);
      } finally {
        setIsLoadingDeposits(false);
      }
    };

    fetchUserData();
    fetchPendingDeposits();
    fetchUserLanguage();

    return () => {
      unsubscribeSettings();
    };
  }, []);

  const handleOpenDepositReceipt = () => {
    setDepositReceiptVisible(true);
  };

  const handleCloseDepositReceipt = () => {
    setDepositReceiptVisible(false);
  };

  const handleRefreshDeposits = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setIsLoadingDeposits(true);

      // Fetch only deposits with status == "pending" from users/{userId}/depositRequest
      const depositQuery = query(
        collection(db, "users", user.uid, "depositRequest"),
        where("status", "==", "pending")
      );
      const depositSnapshot = await getDocs(depositQuery);
      const pendingDeposits = depositSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      console.log("Refreshed pending deposits:", pendingDeposits.length);
      console.log("Refreshed deposit data:", pendingDeposits);

      setDepositRequests(pendingDeposits);
    } catch (error) {
      console.error("Error refreshing deposits:", error);
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  // Generate control number for Stock Investment deposits
  const generateControlNumber = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
      const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Month (01-12)
      const day = now.getDate().toString().padStart(2, "0"); // Day (01-31)
      const dateString = `${year}-0${month}${day}`; // Format: XX-0XX

      // Get today's date in YYYY-MM-DD format for the counter document
      const todayString = now.toISOString().split("T")[0];

      // Reference to the daily counter document
      const counterRef = doc(db, "depositCounters", todayString);

      // Try to get the current counter
      const counterDoc = await getDoc(counterRef);

      let currentCount = 1;
      if (counterDoc.exists()) {
        currentCount = (counterDoc.data().count || 0) + 1;
      }

      // Update the counter for today
      await setDoc(
        counterRef,
        {
          count: currentCount,
          lastUpdated: now.toISOString(),
        },
        { merge: true }
      );

      // Format the sequential number with leading zeros
      const sequentialNumber = currentCount.toString().padStart(4, "0");

      // Combine all parts: XX-0XX-XXXX
      const controlNumber = `${dateString}-${sequentialNumber}`;

      console.log("Generated control number:", controlNumber);
      return controlNumber;
    } catch (error) {
      console.error("Error generating control number:", error);
      // Fallback: generate a timestamp-based control number
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const timestamp = Date.now().toString().slice(-4);
      return `${year}-0${month}${day}-${timestamp}`;
    }
  };

  const onSubmit = async () => {
    if (
      !amount ||
      !userData.email ||
      !type ||
      !selectedCurrency ||
      (type === "Time Deposit" && !contractType) ||
      (type === "Stock" && !address)
    ) {
      showModal({
        title: t(userLanguage, "deposit.modals.missingInformation.title"),
        message: t(userLanguage, "deposit.modals.missingInformation.message"),
        type: "warning",
      });
      return;
    }

    // Check if rate is unavailable for non-PHP currencies
    if (selectedCurrency !== "PHP" && phpEstimate === "Rate unavailable") {
      showModal({
        title: t(userLanguage, "deposit.modals.exchangeRateUnavailable.title"),
        message: t(
          userLanguage,
          "deposit.modals.exchangeRateUnavailable.message"
        ),
        type: "warning",
      });
      return;
    }

    // Enforce minimum investment for Stock Investment (PHP equivalent)
    if (type === "Stock") {
      const phpAmount = parseFloat(phpConvertedAmount || "0");
      if (!phpAmount || phpAmount < STOCK_MIN_PHP) {
        showModal({
          title: t(
            userLanguage,
            "deposit.modals.minimumInvestmentNotMet.title"
          ),
          message: t(
            userLanguage,
            "deposit.modals.minimumInvestmentNotMet.message"
          )
            .replace("{type}", "Stock")
            .replace("{amount}", "2,000,000"),
          type: "warning",
        });
        return;
      }
    }

    // Enforce minimum investment for Time Deposit (PHP equivalent)
    if (type === "Time Deposit") {
      const phpAmount = parseFloat(phpConvertedAmount || "0");
      if (!phpAmount || phpAmount < TIME_DEPOSIT_MIN_PHP) {
        showModal({
          title: t(
            userLanguage,
            "deposit.modals.minimumInvestmentNotMet.title"
          ),
          message: t(
            userLanguage,
            "deposit.modals.minimumInvestmentNotMet.message"
          )
            .replace("{type}", "Time Deposit")
            .replace("{amount}", "50,000"),
          type: "warning",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const depositId = `deposit_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Get current date and time
      const now = new Date();
      const date = now.toISOString().split("T")[0]; // YYYY-MM-DD format
      const time = now.toTimeString().split(" ")[0]; // HH:MM:SS format

      // Generate control number for Stock Investment
      let controlNumber = null;
      if (type === "Stock") {
        controlNumber = await generateControlNumber();
      }

      // Prepare deposit request data
      const depositData = {
        date: date,
        time: time,
        isApproved: false,
        status: "pending", // Add status field
        depositId: depositId,
        controlNumber: controlNumber, // Add control number for Stock Investment
        emailAddress: userData.email,
        amount: phpConvertedAmount,
        currency: selectedCurrency,
        contractType: type === "Time Deposit" ? contractType : null,
        depositType: type,
        Name: `${userData.firstName} ${userData.lastName}`,
        address: type === "Stock" ? address : null,
        receiptUrl: null, // Will be updated later when receipt is uploaded
      };

      // Save to Firebase for both Time Deposit and Stock Investment
      console.log(`Saving ${type} request to Firebase...`);
      const depositRef = doc(
        db,
        "users",
        user.uid,
        "depositRequest",
        depositId
      );
      await setDoc(depositRef, depositData);
      console.log(`${type} request saved to Firebase successfully`);

      // Send email to business (existing functionality)
      console.log("Sending business email...");
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          email: userData.email,
          message: `Name: ${userData.firstName} ${
            userData.lastName
          }\nAmount: ${amount} ${selectedCurrency}\nEmail Address: ${
            userData.email
          }\nType: ${type}${
            type === "Time Deposit" ? `\nContract Type: ${contractType}` : ""
          }${type === "Stock" ? `\nAddress: ${address}` : ""}${
            type === "Stock" && controlNumber
              ? `\nControl Number: ${controlNumber}`
              : ""
          }\nDeposit ID: ${depositId}`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );
      console.log("Business email sent successfully");

      // Send confirmation email to client with bank account information
      console.log("Sending client confirmation email...");
      console.log("Template ID:", process.env.EXPO_PUBLIC_DEPOSIT_TEMPLATE_ID);
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_DEPOSIT_TEMPLATE_ID,
        {
          to_email: userData.email,
          client_name: `${userData.firstName} ${userData.lastName}`,
          investment_type: type,
          investment_amount: `${amount} ${selectedCurrency}`,
          contract_type: type === "Time Deposit" ? contractType : "",
          address: type === "Stock" ? address : "",
          control_number:
            type === "Stock" && controlNumber ? controlNumber : "",
          deposit_id: depositId,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );
      console.log("Client confirmation email sent successfully");

      // Play success sound
      playDepositSound();
      showModal({
        title: t(userLanguage, "deposit.modals.requestSubmitted.title"),
        message: t(userLanguage, "deposit.modals.requestSubmitted.message"),
        type: "success",
      });

      // Reset form after success
      setAmount("");
      setType(null);
      setContractType(null);
      setAddress("");

      // Refresh the deposit requests list
      handleRefreshDeposits();
    } catch (err) {
      console.error("Submission error:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));

      let errorMessage = "Failed to submit request. Please try again.";

      // More specific error messages
      if (err.text) {
        errorMessage = `Error: ${err.text}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      showModal({
        title: t(userLanguage, "deposit.modals.submissionFailed.title"),
        message: t(userLanguage, "deposit.modals.submissionFailed.message"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <KeyboardAwareScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header Card */}
              <View style={styles.headerCard}>
                <View style={styles.headerContent}>
                  <Ionicons
                    name="trending-up"
                    size={32}
                    color={Colors.redTheme.background}
                    style={styles.headerIcon}
                  />
                  <View style={styles.headerTextContainer}>
                    <Text
                      style={[styles.headerTitle, getRTLStyles(userLanguage)]}
                    >
                      {t(userLanguage, "deposit.content.investmentDeposit")}
                    </Text>
                    <Text
                      style={[
                        styles.headerSubtitle,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "deposit.content.growYourWealth")}
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
                    {t(userLanguage, "deposit.content.depositRequest")}
                  </Text>
                </View>
                <Text
                  style={[styles.instructionText, getRTLStyles(userLanguage)]}
                >
                  {t(userLanguage, "deposit.content.depositInstructions")}
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "deposit.content.investmentDetails")}
                </Text>

                {/* Investment Type Section */}
                <View style={styles.formSection}>
                  <Text
                    style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(userLanguage, "deposit.content.investmentType")}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      {t(userLanguage, "deposit.content.selectInvestmentType")}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalSelector}
                      onPress={() => setInvestmentTypeModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalSelectorText,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {investmentTypeOptions.find((opt) => opt.value === type)
                          ?.label ||
                          t(
                            userLanguage,
                            "deposit.content.chooseInvestmentType"
                          )}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={Colors.redTheme.background}
                      />
                    </TouchableOpacity>
                    {type && (
                      <View style={styles.minimumRequirementCard}>
                        <Ionicons
                          name="information-circle"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                        <Text
                          style={[
                            styles.minimumRequirementText,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(userLanguage, "deposit.content.minimum").replace(
                            "{amount}",
                            type === "Time Deposit" ? "₱50,000" : "₱2,000,000"
                          )}
                        </Text>
                      </View>
                    )}
                  </View>

                  {type === "Time Deposit" && (
                    <View style={styles.inputGroup}>
                      <Text
                        style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                      >
                        {t(userLanguage, "deposit.content.contractPeriod")}
                      </Text>
                      <TouchableOpacity
                        style={styles.modalSelector}
                        onPress={() => setContractTypeModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modalSelectorText,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {contractTypeOptions.find(
                            (opt) => opt.value === contractType
                          )?.label ||
                            t(
                              userLanguage,
                              "deposit.content.selectContractDuration"
                            )}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {type === "Stock" && (
                    <View style={styles.inputGroup}>
                      <Text
                        style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                      >
                        {t(userLanguage, "deposit.content.address")} *
                      </Text>
                      <TextInput
                        style={[styles.input, getRTLStyles(userLanguage)]}
                        placeholder={t(
                          userLanguage,
                          "deposit.content.enterAddress"
                        )}
                        placeholderTextColor="#999"
                        onChangeText={setAddress}
                        value={address}
                        multiline={true}
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                  )}
                </View>

                {/* Investment Amount Section */}
                <View style={styles.formSection}>
                  <Text
                    style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(userLanguage, "deposit.content.investmentAmount")}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      {t(userLanguage, "deposit.content.amount")}
                    </Text>
                    <View style={styles.amountContainer}>
                      <TouchableOpacity
                        style={styles.currencySelector}
                        onPress={() => setCurrencyModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.currencyText}>
                          {currencyOptions.find(
                            (c) => c.value === selectedCurrency
                          )?.label || "🇵🇭 PHP"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.amountInput, getRTLStyles(userLanguage)]}
                        placeholder={t(
                          userLanguage,
                          "deposit.content.enterInvestmentAmount"
                        )}
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        onChangeText={setAmount}
                        value={amount}
                      />
                    </View>
                    {(phpEstimate || isCalculating) && (
                      <View style={styles.phpEstimateContainer}>
                        <View style={styles.phpEstimateHeader}>
                          <Ionicons
                            name="trending-up"
                            size={18}
                            color={Colors.redTheme.background}
                          />
                          <Text
                            style={[
                              styles.phpEstimateTitle,
                              getRTLStyles(userLanguage),
                            ]}
                          >
                            {t(userLanguage, "deposit.content.phpEquivalent")}
                          </Text>
                        </View>
                        <View style={styles.phpEstimateValue}>
                          {isCalculating ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator
                                size="small"
                                color={Colors.redTheme.background}
                              />
                              <Text
                                style={[
                                  styles.loadingText,
                                  getRTLStyles(userLanguage),
                                ]}
                              >
                                {t(userLanguage, "deposit.content.calculating")}
                              </Text>
                            </View>
                          ) : (
                            <>
                              <Text style={styles.phpEstimateAmount}>
                                {phpEstimate}
                              </Text>
                              <Text
                                style={[
                                  styles.phpEstimateRate,
                                  getRTLStyles(userLanguage),
                                ]}
                              >
                                {t(userLanguage, "deposit.content.rate")
                                  .replace("{currency}", selectedCurrency)
                                  .replace("{rate}", currentRate.toFixed(4))}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Contact Information Section */}
                <View style={styles.formSection}>
                  <Text
                    style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(userLanguage, "deposit.content.contactInformation")}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      {t(userLanguage, "deposit.content.emailAddress")}
                    </Text>
                    <View style={styles.emailDisplayContainer}>
                      <Ionicons
                        name="mail"
                        size={20}
                        color={Colors.redTheme.background}
                        style={styles.emailIcon}
                      />
                      <Text
                        style={[
                          styles.emailDisplayText,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {userData.email ||
                          t(userLanguage, "deposit.content.loading")}
                      </Text>
                    </View>
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
                        {t(userLanguage, "deposit.content.accountHolder")
                          .replace("{firstName}", userData.firstName)
                          .replace("{lastName}", userData.lastName)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Process Information Card */}
              <View style={styles.processCard}>
                <View style={styles.processHeader}>
                  <Ionicons
                    name="time"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                  <Text
                    style={[styles.processTitle, getRTLStyles(userLanguage)]}
                  >
                    {t(userLanguage, "deposit.content.processingInformation")}
                  </Text>
                </View>
                <Text style={[styles.processText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "deposit.content.processingText")}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isSubmitting ||
                    (selectedCurrency !== "PHP" &&
                      phpEstimate === "Rate unavailable") ||
                    (type === "Stock" &&
                      parseFloat(phpConvertedAmount || "0") < STOCK_MIN_PHP) ||
                    (type === "Time Deposit" &&
                      parseFloat(phpConvertedAmount || "0") <
                        TIME_DEPOSIT_MIN_PHP) ||
                    (type === "Stock" && !address)) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={
                  isSubmitting ||
                  (selectedCurrency !== "PHP" &&
                    phpEstimate === "Rate unavailable") ||
                  (type === "Stock" &&
                    parseFloat(phpConvertedAmount || "0") < STOCK_MIN_PHP) ||
                  (type === "Time Deposit" &&
                    parseFloat(phpConvertedAmount || "0") <
                      TIME_DEPOSIT_MIN_PHP) ||
                  (type === "Stock" && !address)
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
                      name="checkmark-circle-outline"
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
                      ? t(userLanguage, "deposit.content.submitting")
                      : selectedCurrency !== "PHP" &&
                        phpEstimate === "Rate unavailable"
                      ? t(userLanguage, "deposit.content.rateUnavailable")
                      : type === "Stock" &&
                        parseFloat(phpConvertedAmount || "0") < STOCK_MIN_PHP
                      ? t(userLanguage, "deposit.content.minimumStock")
                      : type === "Time Deposit" &&
                        parseFloat(phpConvertedAmount || "0") <
                          TIME_DEPOSIT_MIN_PHP
                      ? t(userLanguage, "deposit.content.minimumTimeDeposit")
                      : type === "Stock" && !address
                      ? t(userLanguage, "deposit.content.addressRequired")
                      : t(userLanguage, "deposit.content.submitDepositRequest")}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.bottomSpacing} />
            </KeyboardAwareScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <ProfessionalModal
          visible={modalVisible}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onClose={hideModal}
          onConfirm={modalConfig.onConfirm}
        />

        <DepositReceipt
          visible={depositReceiptVisible}
          onClose={handleCloseDepositReceipt}
          depositRequests={depositRequests}
          isLoading={isLoadingDeposits}
          onRefresh={handleRefreshDeposits}
          userId={auth.currentUser?.uid}
        />

        {/* Currency Selection Modal */}
        <Modal
          visible={currencyModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.currencyModalContainer}>
              <View style={styles.currencyModalHeader}>
                <Text
                  style={[
                    styles.currencyModalTitle,
                    getRTLStyles(userLanguage),
                  ]}
                >
                  {t(userLanguage, "deposit.content.selectCurrency")}
                </Text>
                <TouchableOpacity
                  onPress={() => setCurrencyModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.currencyList}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.currencyScrollContent}
                >
                  {console.log("Currency options:", currencyOptions.length)}
                  {currencyOptions.map((currency) => (
                    <TouchableOpacity
                      key={currency.value}
                      style={[
                        styles.currencyOption,
                        selectedCurrency === currency.value &&
                          styles.selectedCurrencyOption,
                      ]}
                      onPress={() => {
                        setSelectedCurrency(currency.value);
                        setCurrencyModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          selectedCurrency === currency.value &&
                            styles.selectedCurrencyOptionText,
                        ]}
                      >
                        {currency.label}
                      </Text>
                      {selectedCurrency === currency.value && (
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

        {/* Investment Type Modal */}
        <Modal
          visible={investmentTypeModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setInvestmentTypeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.currencyModalContainer}>
              <View style={styles.currencyModalHeader}>
                <Text
                  style={[
                    styles.currencyModalTitle,
                    getRTLStyles(userLanguage),
                  ]}
                >
                  {t(userLanguage, "deposit.content.selectInvestmentTypeModal")}
                </Text>
                <TouchableOpacity
                  onPress={() => setInvestmentTypeModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.currencyList}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.currencyScrollContent}
                >
                  {investmentTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.currencyOption,
                        type === option.value && styles.selectedCurrencyOption,
                      ]}
                      onPress={() => {
                        setType(option.value);
                        setInvestmentTypeModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          type === option.value &&
                            styles.selectedCurrencyOptionText,
                        ]}
                      >
                        {option.label}
                      </Text>
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

        {/* Contract Period Modal */}
        <Modal
          visible={contractTypeModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setContractTypeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.currencyModalContainer}>
              <View style={styles.currencyModalHeader}>
                <Text
                  style={[
                    styles.currencyModalTitle,
                    getRTLStyles(userLanguage),
                  ]}
                >
                  {t(userLanguage, "deposit.content.selectContractPeriod")}
                </Text>
                <TouchableOpacity
                  onPress={() => setContractTypeModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.currencyList}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.currencyScrollContent}
                >
                  {contractTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.currencyOption,
                        contractType === option.value &&
                          styles.selectedCurrencyOption,
                      ]}
                      onPress={() => {
                        setContractType(option.value);
                        setContractTypeModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          contractType === option.value &&
                            styles.selectedCurrencyOptionText,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {contractType === option.value && (
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
    </TouchableWithoutFeedback>
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

  // Amount and Currency Styles
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  amountInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    paddingLeft: Platform.OS === "android" ? 90 : 100, // Platform-specific padding for currency selector
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencySelector: {
    position: "absolute",
    left: 8,
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 8,
    zIndex: 10,
    minWidth: 70,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.3)",
  },
  currencyText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
    marginRight: 6,
  },

  // PHP Estimate Styles
  phpEstimateContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(204, 33, 53, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phpEstimateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  phpEstimateTitle: {
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    marginLeft: 8,
  },
  phpEstimateValue: {
    alignItems: "center",
  },
  phpEstimateAmount: {
    fontSize: 20,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    marginBottom: 4,
  },
  phpEstimateRate: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "600",
    marginLeft: 8,
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

  // Email Display Styles
  emailDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emailIcon: {
    marginRight: 12,
  },
  emailDisplayText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  // Process Card
  processCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  processHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  processTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  processText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
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

  // Converter Card
  converterCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  converterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  converterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    minWidth: 320,
    width: "90%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Currency Modal Styles
  currencyModalContainer: {
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
  currencyModalHeader: {
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
  currencyModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
    textAlign: "center",
    paddingRight: 40, // ensures space for the close button
    paddingLeft: 24, // for symmetry
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 16,
  },
  currencyList: {
    paddingVertical: 8,
    maxHeight: 350,
  },
  currencyScrollContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  selectedCurrencyOption: {
    backgroundColor: "rgba(204,33,53,0.08)",
  },
  currencyOptionText: {
    fontSize: 17,
    color: "#222",
    fontWeight: "500",
  },
  selectedCurrencyOptionText: {
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
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 30,
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 120,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  // 6. Add styles for modalSelector and modalSelectorText
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
  // Add styles for upload UI
  uploadButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    marginTop: 4,
  },
  uploadContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    resizeMode: "cover",
    color: "#333",
    fontWeight: "500",
  },

  // Notification button styles
  notificationButton: {
    position: "relative",
    padding: 8,
    marginRight: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  minimumRequirementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.3)",
  },
  minimumRequirementText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "600",
    marginLeft: 6,
  },
});
