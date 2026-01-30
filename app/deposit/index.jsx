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
  Dimensions,
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
  updateDoc,
  addDoc,
  increment,
  serverTimestamp,
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
import investmentRates from "../../assets/data/investmentRates.json";

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;

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

  // Available balance state for Time Deposit
  const [availableBalance, setAvailableBalance] = useState(0);
  const [useAvailableBalance, setUseAvailableBalance] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");

  // Step-based navigation state
  const [currentStep, setCurrentStep] = useState(1);

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
    {
      label: t(userLanguage, "deposit.content.topUpAvailableBalance"),
      value: "Top Up Available Balance",
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
    { label: "🇵🇭 PHP", value: "PHP", symbol: "₱" },
    { label: "🇺🇸 USD", value: "USD", symbol: "$" },
    { label: "🇪🇺 EUR", value: "EUR", symbol: "€" },
    { label: "🇯🇵 JPY", value: "JPY", symbol: "¥" },
    { label: "🇭🇰 HKD", value: "HKD", symbol: "HK$" },
    { label: "🇦🇺 AUD", value: "AUD", symbol: "A$" },
    { label: "🇸🇬 SGD", value: "SGD", symbol: "S$" },
    { label: "🇨🇦 CAD", value: "CAD", symbol: "C$" },
    { label: "🇬🇧 GBP", value: "GBP", symbol: "£" },
    { label: "🇨🇭 CHF", value: "CHF", symbol: "CHF" },
    { label: "🇨🇳 CNY", value: "CNY", symbol: "¥" },
  ];

  // Minimum PHP equivalent for Stock Investment
  const STOCK_MIN_PHP = 2000000;
  // Minimum PHP equivalent for Time Deposit
  const TIME_DEPOSIT_MIN_PHP = 50000;

  // Function to get investment rate based on amount and contract type
  const getInvestmentRate = (amount, contractType) => {
    const contractKey =
      contractType === "6_months"
        ? "sixMonths"
        : contractType === "1_year"
        ? "oneYear"
        : contractType === "2_years"
        ? "twoYears"
        : "sixMonths";

    const rateTable = investmentRates[contractKey];
    if (!rateTable) return 0;

    const rateKeys = Object.keys(rateTable)
      .map(Number)
      .sort((a, b) => a - b);

    // Find the appropriate rate bracket
    for (let i = rateKeys.length - 1; i >= 0; i--) {
      if (amount >= rateKeys[i]) {
        return rateTable[rateKeys[i].toString()];
      }
    }

    // If amount is less than minimum, return minimum rate
    return rateTable[rateKeys[0].toString()] || 0;
  };

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

  // Reset form when switching deposit methods or investment types
  useEffect(() => {
    if (type !== "Time Deposit") {
      setUseAvailableBalance(false);
      setBalanceAmount("");
    }
    if (type !== "Time Deposit" || !useAvailableBalance) {
      // Reset balance amount when switching away from available balance
      if (!useAvailableBalance) {
        setBalanceAmount("");
      }
    }
  }, [type, useAvailableBalance]);


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
            // Fetch available balance
            setAvailableBalance(data.availBalanceAmount || 0);
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

  // Step navigation functions
  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!type) {
        showModal({
          title: t(userLanguage, "deposit.modals.missingInformation.title"),
          message: t(userLanguage, "deposit.modals.missingInformation.message"),
          type: "warning",
        });
        return;
      }
      // Stock and Top Up Available Balance skip Step 2, go directly to Step 2 (amount entry)
      // For these types, Step 2 = amount entry, Step 3 = review
      if (type === "Stock" || type === "Top Up Available Balance") {
        setCurrentStep(2); // This will be amount entry (renumbered)
      } else {
        setCurrentStep(2); // Time Deposit goes to deposit method step
      }
    } else if (currentStep === 2) {
      // For Stock and Top Up Available Balance, Step 2 is amount entry
      if (type === "Stock" || type === "Top Up Available Balance") {
        // Validate amount
        if (!amount || !selectedCurrency) {
          showModal({
            title: t(userLanguage, "deposit.modals.missingInformation.title"),
            message: t(
              userLanguage,
              "deposit.modals.missingInformation.message"
            ),
            type: "warning",
          });
          return;
        }
        // Go to Step 3 (Review & Confirm)
        setCurrentStep(3);
        return;
      }
      // For Time Deposit, Step 2 is deposit method
      if (type === "Time Deposit") {
        if (!contractType) {
          showModal({
            title: t(userLanguage, "deposit.modals.missingInformation.title"),
            message: t(
              userLanguage,
              "deposit.modals.missingInformation.message"
            ),
            type: "warning",
          });
          return;
        }
        if (!useAvailableBalance && !amount) {
          showModal({
            title: t(userLanguage, "deposit.modals.missingInformation.title"),
            message: t(
              userLanguage,
              "deposit.modals.missingInformation.message"
            ),
            type: "warning",
          });
          return;
        }
        if (
          useAvailableBalance &&
          (!balanceAmount || parseFloat(balanceAmount) <= 0)
        ) {
          showModal({
            title: t(userLanguage, "deposit.modals.missingInformation.title"),
            message: t(
              userLanguage,
              "deposit.modals.missingInformation.message"
            ),
            type: "warning",
          });
          return;
        }
      }
      // For Time Deposit, proceed to Step 3 (amount entry) or Step 4 (review) if amount already entered
      if (type === "Time Deposit" && (amount || balanceAmount)) {
        setCurrentStep(4);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      // Step 3: For Time Deposit, this is amount entry. For Stock/Top Up, this is review (shouldn't reach here)
      if (type === "Time Deposit") {
        // Validate amount for Time Deposit
        if (!useAvailableBalance && (!amount || !selectedCurrency)) {
          showModal({
            title: t(userLanguage, "deposit.modals.missingInformation.title"),
            message: t(
              userLanguage,
              "deposit.modals.missingInformation.message"
            ),
            type: "warning",
          });
          return;
        }
        if (
          useAvailableBalance &&
          (!balanceAmount || parseFloat(balanceAmount) <= 0)
        ) {
          showModal({
            title: t(userLanguage, "deposit.modals.missingInformation.title"),
            message: t(
              userLanguage,
              "deposit.modals.missingInformation.message"
            ),
            type: "warning",
          });
          return;
        }
        setCurrentStep(4);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setType(null);
    setContractType(null);
    setUseAvailableBalance(false);
    setBalanceAmount("");
    setAmount("");
    setAddress("");
    setSelectedCurrency("PHP");
    setPhpEstimate("");
    setPhpConvertedAmount("");
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
    // Validation for Time Deposit with available balance
    if (
      type === "Time Deposit" &&
      useAvailableBalance &&
      (!balanceAmount || parseFloat(balanceAmount) <= 0)
    ) {
      showModal({
        title: t(userLanguage, "deposit.modals.missingInformation.title"),
        message: t(userLanguage, "deposit.modals.missingInformation.message"),
        type: "warning",
      });
      return;
    }

    // Validation for regular deposits
    if (
      !type ||
      !userData.email ||
      (type === "Time Deposit" &&
        !useAvailableBalance &&
        (!amount || !selectedCurrency)) ||
      (type === "Time Deposit" && !contractType) ||
      (type === "Stock" && (!amount || !selectedCurrency)) ||
      (type === "Top Up Available Balance" && (!amount || !selectedCurrency))
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
      let phpAmount = 0;
      if (useAvailableBalance) {
        phpAmount = parseFloat(balanceAmount || "0");
        // Check if balance amount exceeds available balance
        if (phpAmount > availableBalance) {
          showModal({
            title: t(userLanguage, "deposit.modals.insufficientBalance.title"),
            message: t(
              userLanguage,
              "deposit.modals.insufficientBalance.message"
            ),
            type: "warning",
          });
          return;
        }
      } else {
        phpAmount = parseFloat(phpConvertedAmount || "0");
      }

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

      // Handle Time Deposit with Available Balance
      if (type === "Time Deposit" && useAvailableBalance) {
        const depositAmount = parseFloat(balanceAmount);
        const userRef = doc(db, "users", user.uid);

        // Map contract type to inspireAuto format
        const contractKey =
          contractType === "6_months"
            ? "sixMonths"
            : contractType === "1_year"
            ? "oneYear"
            : contractType === "2_years"
            ? "twoYears"
            : "sixMonths";
        const rate = getInvestmentRate(depositAmount, contractType);

        // Calculate completion date
        const completionDate = new Date(now);
        if (contractType === "6_months") {
          completionDate.setMonth(completionDate.getMonth() + 6);
        } else if (contractType === "1_year") {
          completionDate.setMonth(completionDate.getMonth() + 12);
        } else if (contractType === "2_years") {
          completionDate.setMonth(completionDate.getMonth() + 24);
        }

        // Create inspireAuto deposit
        const inspireAutoRef = collection(db, "users", user.uid, "inspireAuto");
        const inspireAutoDeposit = {
          amount: depositAmount,
          contractType: contractKey,
          rate: rate,
          initialDate: serverTimestamp(),
          isActive: "Active",
          currentCycleCount: 0,
          completionDate: completionDate,
          date: date,
          time: time,
          depositId: depositId,
          type: "Time Deposit",
          status: "Active",
        };
        await addDoc(inspireAutoRef, inspireAutoDeposit);

        // Deduct from available balance and update time deposit amount
        const userDoc = await getDoc(userRef);
        const currentAvailBalance = userDoc.data()?.availBalanceAmount || 0;
        const currentTimeDeposit = userDoc.data()?.timeDepositAmount || 0;

        await updateDoc(userRef, {
          availBalanceAmount: increment(-depositAmount),
          timeDepositAmount: currentTimeDeposit + depositAmount,
        });

        // Create transaction record
        await addDoc(collection(db, "users", user.uid, "transactions"), {
          type: "Time Deposit from Available Balance",
          amount: depositAmount,
          date: serverTimestamp(),
          description: `Time Deposit created using available balance. Contract: ${contractType}`,
          reference: depositId,
          status: "Completed",
          balanceAfter: currentAvailBalance - depositAmount,
        });

        // Play success sound
        playDepositSound();
        showModal({
          title: t(userLanguage, "deposit.modals.depositCreated.title"),
          message: t(userLanguage, "deposit.modals.depositCreated.message"),
          type: "success",
        });

        // Reset form
        resetForm();
        setAvailableBalance(currentAvailBalance - depositAmount);

        // Refresh the deposit requests list
        handleRefreshDeposits();
        setIsSubmitting(false);
        return;
      }

      // Handle Top Up Available Balance - Create request for admin approval
      if (type === "Top Up Available Balance") {
        // Prepare deposit request data (same structure as Time Deposit and Stock)
        const depositData = {
          date: date,
          time: time,
          isApproved: false,
          status: "pending",
          depositId: depositId,
          emailAddress: userData.email,
          amount: phpConvertedAmount,
          currency: selectedCurrency,
          depositType: "Top Up Available Balance",
          Name: `${userData.firstName} ${userData.lastName}`,
          receiptUrl: null, // Will be updated later when receipt is uploaded
        };

        // Save to Firebase (same location as Time Deposit and Stock)
        console.log("Saving Top Up Available Balance request to Firebase...");
        const depositRef = doc(
          db,
          "users",
          user.uid,
          "depositRequest",
          depositId
        );
        await setDoc(depositRef, depositData);
        console.log(
          "Top Up Available Balance request saved to Firebase successfully"
        );

        // Send email to business
        console.log("Sending business email...");
        await send(
          process.env.EXPO_PUBLIC_SERVICE_ID,
          process.env.EXPO_PUBLIC_TEMPLATE_ID,
          {
            email: userData.email,
            message: `Name: ${userData.firstName} ${userData.lastName}\nAmount: ${amount} ${selectedCurrency}\nEmail Address: ${userData.email}\nType: Top Up Available Balance\nDeposit ID: ${depositId}`,
          },
          {
            publicKey: process.env.EXPO_PUBLIC_API_KEY,
          }
        );
        console.log("Business email sent successfully");

        // Send confirmation email to client
        console.log("Sending client confirmation email...");
        await send(
          process.env.EXPO_PUBLIC_SERVICE_ID,
          process.env.EXPO_PUBLIC_DEPOSIT_TEMPLATE_ID,
          {
            to_email: userData.email,
            client_name: `${userData.firstName} ${userData.lastName}`,
            investment_type: "Top Up Available Balance",
            investment_amount: `${amount} ${selectedCurrency}`,
            contract_type: "",
            address: "",
            control_number: "",
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
        resetForm();

        // Refresh the deposit requests list
        handleRefreshDeposits();
        setIsSubmitting(false);
        return;
      }

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
        address: null,
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
          }${
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
          address: "",
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
      resetForm();

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

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Select Deposit Type
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="trending-up" size={32} color="white" />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "deposit.content.selectInvestmentType")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "deposit.content.chooseInvestmentType")}
              </Text>
            </View>

            <View style={styles.investmentOptionsContainer}>
              {investmentTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.investmentOption,
                    type === option.value && styles.investmentOptionSelected,
                  ]}
                  onPress={() => setType(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.investmentOptionContent}>
                    <View style={styles.investmentOptionLeft}>
                      <View
                        style={[
                          styles.investmentOptionIconContainer,
                          type === option.value &&
                            styles.investmentOptionIconContainerSelected,
                        ]}
                      >
                        <Ionicons
                          name={
                            option.value === "Time Deposit"
                              ? "time"
                              : option.value === "Stock"
                              ? "bar-chart"
                              : "wallet"
                          }
                          size={28}
                          color={
                            type === option.value
                              ? "white"
                              : Colors.redTheme.background
                          }
                        />
                      </View>
                      <View style={styles.investmentOptionInfo}>
                        <Text
                          style={[
                            styles.investmentOptionTitle,
                            type === option.value &&
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
                          {option.value === "Time Deposit"
                            ? t(
                                userLanguage,
                                "deposit.content.minimumTimeDeposit"
                              )
                            : option.value === "Stock"
                            ? t(userLanguage, "deposit.content.minimumStock")
                            : t(
                                userLanguage,
                                "deposit.content.topUpAvailableBalance"
                              )}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        type === option.value && styles.radioButtonSelected,
                      ]}
                    >
                      {type === option.value && (
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
        // Step 2: 
        // - For Stock/Top Up: Amount entry
        // - For Time Deposit: Deposit Method & Contract Period
        if (type === "Stock" || type === "Top Up Available Balance") {
          // Step 2 for Stock/Top Up: Amount Entry
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Ionicons
                  name="cash-outline"
                  size={48}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "deposit.content.investmentAmount")}
                </Text>
                <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "deposit.content.enterInvestmentAmount")}
                </Text>
              </View>

              {/* Currency Selection */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "deposit.content.selectCurrency")}
                </Text>
                <TouchableOpacity
                  style={styles.currencySelectorSeparated}
                  onPress={() => setCurrencyModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.currencySelectorContent}>
                    <Text style={styles.currencyTextSeparated}>
                      {currencyOptions.find(
                        (c) => c.value === selectedCurrency
                      )?.label || "🇵🇭 PHP"}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={Colors.redTheme.background}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "deposit.content.amount")}
                </Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>
                    {currencyOptions.find(
                      (c) => c.value === selectedCurrency
                    )?.symbol || "₱"}
                  </Text>
                  <TextInput
                    style={[
                      styles.amountInputSeparated,
                      getRTLStyles(userLanguage),
                    ]}
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
                {amount && selectedCurrency && selectedCurrency !== "PHP" && (
                  <View style={styles.phpEstimateContainer}>
                    {isCalculating ? (
                      <Text
                        style={[
                          styles.phpEstimateText,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {t(userLanguage, "deposit.content.calculating")}
                      </Text>
                    ) : phpEstimate ? (
                      <>
                        <Text
                          style={[
                            styles.phpEstimateLabel,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(userLanguage, "deposit.content.phpEquivalent")}:
                        </Text>
                        <Text
                          style={[
                            styles.phpEstimateValue,
                            getRTLStyles(userLanguage),
                          ]}
                        >
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
                    ) : (
                      <Text
                        style={[
                          styles.phpEstimateText,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {t(userLanguage, "deposit.content.rateUnavailable")}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        }
        // Step 2 for Time Deposit: Deposit Method & Contract Period
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons
                name="settings-outline"
                size={48}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "deposit.content.depositMethod")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "deposit.content.selectDepositMethod")}
              </Text>
            </View>

            {type === "Time Deposit" && (
              <>
                {/* Deposit Method Selection */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    <Ionicons
                      name="wallet-outline"
                      size={16}
                      color={Colors.redTheme.background}
                    />{" "}
                    {t(userLanguage, "deposit.content.depositMethod")}
                  </Text>
                  <View style={styles.depositMethodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.depositMethodOption,
                        !useAvailableBalance &&
                          styles.depositMethodOptionSelected,
                      ]}
                      onPress={() => {
                        setUseAvailableBalance(false);
                        setBalanceAmount("");
                      }}
                    >
                      <Text
                        style={[
                          styles.depositMethodText,
                          !useAvailableBalance &&
                            styles.depositMethodTextSelected,
                        ]}
                      >
                        {t(userLanguage, "deposit.content.requestAmount")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.depositMethodOption,
                        useAvailableBalance &&
                          styles.depositMethodOptionSelected,
                      ]}
                      onPress={() => {
                        setUseAvailableBalance(true);
                        setAmount("");
                        setPhpEstimate("");
                        setPhpConvertedAmount("");
                      }}
                    >
                      <Text
                        style={[
                          styles.depositMethodText,
                          useAvailableBalance &&
                            styles.depositMethodTextSelected,
                        ]}
                      >
                        {t(userLanguage, "deposit.content.useAvailableBalance")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {useAvailableBalance && (
                    <View style={styles.availableBalanceInfo}>
                      <Text
                        style={[
                          styles.availableBalanceLabel,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {t(userLanguage, "deposit.content.availableBalance")}: ₱
                        {availableBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Amount Field for Request Amount */}
                {!useAvailableBalance && (
                  <>
                    {/* Currency Selection */}
                    <View style={styles.inputSection}>
                      <Text
                        style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                      >
                        <Ionicons
                          name="globe-outline"
                          size={16}
                          color={Colors.redTheme.background}
                        />{" "}
                        {t(userLanguage, "deposit.content.selectCurrency")}
                      </Text>
                      <TouchableOpacity
                        style={styles.currencySelectorSeparated}
                        onPress={() => setCurrencyModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.currencySelectorContent}>
                          <Text style={styles.currencyTextSeparated}>
                            {currencyOptions.find(
                              (c) => c.value === selectedCurrency
                            )?.label || "🇵🇭 PHP"}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={18}
                            color={Colors.redTheme.background}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Amount Input */}
                    <View style={styles.inputSection}>
                      <Text
                        style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={16}
                          color={Colors.redTheme.background}
                        />{" "}
                        {t(userLanguage, "deposit.content.amount")}
                      </Text>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencyPrefix}>
                          {currencyOptions.find(
                            (c) => c.value === selectedCurrency
                          )?.symbol || "₱"}
                        </Text>
                        <TextInput
                          style={[
                            styles.amountInputSeparated,
                            getRTLStyles(userLanguage),
                          ]}
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
                  </>
                )}

                {/* Amount Field for Use Available Balance */}
                {useAvailableBalance && (
                  <View style={styles.inputSection}>
                    <Text
                      style={[styles.inputLabel, getRTLStyles(userLanguage)]}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={16}
                        color={Colors.redTheme.background}
                      />{" "}
                      {t(userLanguage, "deposit.content.amount")}
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
                          "deposit.content.enterAmountFromBalance"
                        )}
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          setBalanceAmount(text);
                          setPhpConvertedAmount(text);
                        }}
                        value={balanceAmount}
                      />
                    </View>
                    {balanceAmount &&
                      parseFloat(balanceAmount) > availableBalance && (
                        <Text style={styles.errorText}>
                          {t(
                            userLanguage,
                            "deposit.content.insufficientBalance"
                          )}
                        </Text>
                      )}
                    <Text style={styles.balanceInfo}>
                      {t(userLanguage, "deposit.content.availableBalance")}: ₱
                      {availableBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                )}

                {/* Contract Period Selection */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={Colors.redTheme.background}
                    />{" "}
                    {t(userLanguage, "deposit.content.contractPeriod")}
                  </Text>
                  <View style={styles.contractOptionsContainer}>
                    {contractTypeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.contractOption,
                          contractType === option.value &&
                            styles.contractOptionSelected,
                        ]}
                        onPress={() => setContractType(option.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.contractOptionText,
                            contractType === option.value &&
                              styles.contractOptionTextSelected,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {option.label}
                        </Text>
                        {contractType === option.value && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={Colors.redTheme.background}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        );

      case 3:
        // Step 3: 
        // - For Stock/Top Up: Review & Confirm
        // - For Time Deposit: Enter Amount
        if (type === "Stock" || type === "Top Up Available Balance") {
          // Step 3 for Stock/Top Up: Review & Confirm
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "deposit.content.reviewConfirm")}
                </Text>
                <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "deposit.content.reviewDetails")}
                </Text>
              </View>

              <View style={styles.confirmationContainer}>
                {/* Deposit Type Card */}
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmLabel}>
                    {t(userLanguage, "deposit.content.investmentType")}
                  </Text>
                  <Text style={styles.confirmValue}>
                    {investmentTypeOptions.find((opt) => opt.value === type)
                      ?.label || ""}
                  </Text>
                </View>

                {/* Amount Card */}
                <View style={styles.confirmAmountCard}>
                  <Text style={styles.confirmAmountLabel}>
                    {t(userLanguage, "deposit.content.investmentAmount")}
                  </Text>
                  <Text style={styles.confirmAmountValue}>
                    {`${amount} ${selectedCurrency}`}
                  </Text>
                  {phpEstimate && (
                    <Text style={styles.confirmAmountSubtext}>
                      {phpEstimate}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        }
        // Step 3 for Time Deposit: Enter Amount
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons
                name="cash-outline"
                size={48}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "deposit.content.investmentAmount")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "deposit.content.enterInvestmentAmount")}
              </Text>
            </View>

            {type === "Time Deposit" && useAvailableBalance ? (
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userLanguage, "deposit.content.amount")}
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
                      "deposit.content.enterAmountFromBalance"
                    )}
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      setBalanceAmount(text);
                      setPhpConvertedAmount(text);
                    }}
                    value={balanceAmount}
                  />
                </View>
                {balanceAmount &&
                  parseFloat(balanceAmount) > availableBalance && (
                    <Text style={styles.errorText}>
                      {t(userLanguage, "deposit.content.insufficientBalance")}
                    </Text>
                  )}
                <Text style={styles.balanceInfo}>
                  {t(userLanguage, "deposit.content.availableBalance")}: ₱
                  {availableBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            ) : (
              <>
                {/* Currency Selection */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color={Colors.redTheme.background}
                    />{" "}
                    {t(userLanguage, "deposit.content.selectCurrency")}
                  </Text>
                  <TouchableOpacity
                    style={styles.currencySelectorSeparated}
                    onPress={() => setCurrencyModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.currencySelectorContent}>
                      <Text style={styles.currencyTextSeparated}>
                        {currencyOptions.find(
                          (c) => c.value === selectedCurrency
                        )?.label || "🇵🇭 PHP"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={Colors.redTheme.background}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                    <Ionicons
                      name="cash-outline"
                      size={16}
                      color={Colors.redTheme.background}
                    />{" "}
                    {t(userLanguage, "deposit.content.amount")}
                  </Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencyPrefix}>
                      {currencyOptions.find((c) => c.value === selectedCurrency)
                        ?.symbol || "₱"}
                    </Text>
                    <TextInput
                      style={[
                        styles.amountInputSeparated,
                        getRTLStyles(userLanguage),
                      ]}
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
              </>
            )}

          </View>
        );

      case 4:
        // Step 4: Review & Confirm (Time Deposit only)
        if (type !== "Time Deposit") {
          return null; // Stock and Top Up don't have Step 4
        }
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                Review & Confirm
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userLanguage)]}>
                Review your deposit details
              </Text>
            </View>

            <View style={styles.confirmationContainer}>
              {/* Deposit Type Card */}
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>
                  {t(userLanguage, "deposit.content.investmentType")}
                </Text>
                <Text style={styles.confirmValue}>
                  {investmentTypeOptions.find((opt) => opt.value === type)
                    ?.label || ""}
                </Text>
              </View>

              {/* Details Card */}
              {type === "Time Deposit" && (
                <View style={styles.confirmCard}>
                  {type === "Time Deposit" && contractType && (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(userLanguage, "deposit.content.contractPeriod")}
                      </Text>
                      <Text style={styles.confirmValue}>
                        {contractTypeOptions.find(
                          (opt) => opt.value === contractType
                        )?.label || ""}
                      </Text>
                    </View>
                  )}
                  {type === "Time Deposit" && (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>
                        {t(userLanguage, "deposit.content.depositMethod")}
                      </Text>
                      <Text style={styles.confirmValue}>
                        {useAvailableBalance
                          ? t(userLanguage, "deposit.content.useAvailableBalance")
                          : t(userLanguage, "deposit.content.requestAmount")}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Amount Card */}
              <View style={styles.confirmAmountCard}>
                <Text style={styles.confirmAmountLabel}>
                  {t(userLanguage, "deposit.content.investmentAmount")}
                </Text>
                <Text style={styles.confirmAmountValue}>
                  {type === "Time Deposit" && useAvailableBalance
                    ? `₱${parseFloat(balanceAmount || 0).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`
                    : `${amount} ${selectedCurrency}`}
                </Text>
                {(type !== "Time Deposit" || !useAvailableBalance) &&
                  phpEstimate && (
                    <Text style={styles.confirmAmountSubtext}>
                      {phpEstimate}
                    </Text>
                  )}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentStep / (type === "Time Deposit" ? 4 : 3)) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {t(userLanguage, "deposit.content.step")} {currentStep}{" "}
              {t(userLanguage, "deposit.content.of")} {type === "Time Deposit" ? 4 : 3}
            </Text>
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
                <Text style={styles.backButtonText}>
                  {t(userLanguage, "deposit.content.back")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
              onPress={
                (type === "Time Deposit" && currentStep === 4) ||
                ((type === "Stock" || type === "Top Up Available Balance") &&
                  currentStep === 3)
                  ? onSubmit
                  : goToNextStep
              }
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.nextButtonText}>
                {(type === "Time Deposit" && currentStep === 4) ||
                ((type === "Stock" || type === "Top Up Available Balance") &&
                  currentStep === 3)
                  ? isSubmitting
                    ? t(userLanguage, "deposit.content.submitting")
                    : t(userLanguage, "deposit.content.confirmSubmit")
                  : t(userLanguage, "deposit.content.continue")}
              </Text>
              <Ionicons
                name={
                  (type === "Time Deposit" && currentStep === 4) ||
                  ((type === "Stock" || type === "Top Up Available Balance") &&
                    currentStep === 3)
                    ? "checkmark-circle"
                    : "arrow-forward"
                }
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
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

        {/* Deposit Type Modal */}
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
  depositMethodContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  depositMethodOption: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  depositMethodOptionSelected: {
    borderColor: Colors.redTheme.background,
    backgroundColor: "rgba(204, 33, 53, 0.1)",
  },
  depositMethodText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  depositMethodTextSelected: {
    color: Colors.redTheme.background,
    fontWeight: "bold",
  },
  availableBalanceInfo: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.3)",
  },
  availableBalanceLabel: {
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    fontWeight: "500",
  },

  // Step-based UI Styles
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
  contractOptionsContainer: {
    gap: 12,
  },
  contractOption: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contractOptionSelected: {
    borderColor: Colors.redTheme.background,
    backgroundColor: Colors.redTheme.background + "08",
  },
  contractOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  contractOptionTextSelected: {
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  addressInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    textAlignVertical: "top",
  },
  amountInputWithCurrency: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    paddingLeft: 90,
    fontSize: 16,
    color: "#333",
  },
  currencySelectorSeparated: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencySelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyTextSeparated: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "600",
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
  balanceInfo: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
    fontWeight: "400",
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
  },
  infoCard: {
    backgroundColor: Colors.redTheme.background + "08",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.redTheme.background + "20",
    alignItems: "center",
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.redTheme.background,
    marginBottom: 12,
    textAlign: "center",
  },
  infoText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },
});
