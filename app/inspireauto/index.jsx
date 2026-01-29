import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Clipboard,
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { send } from "@emailjs/react-native";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import ContractRequestModal from "../../components/ContractRequestModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

// Progress Bar Component
const ProgressBar = ({
  initialDate,
  contractType,
  amount,
  rate,
  onCycleComplete,
  depositId,
  currentCycleCount = 0,
  userLanguage,
}) => {
  const [progress, setProgress] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(currentCycleCount);
  const [currentCycle, setCurrentCycle] = useState(currentCycleCount + 1);
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const lastProcessedCyclesRef = useRef(currentCycleCount);

  useEffect(() => {
    const calculateProgress = () => {
      if (!initialDate || !contractType) return;

      let initialDateObj = initialDate;
      if (initialDateObj && initialDateObj.toDate) {
        initialDateObj = initialDateObj.toDate();
      }

      const startDate = new Date(initialDateObj);
      const currentDate = new Date();

      // Always use 6 months duration for progress calculation
      const sixMonthDuration = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
      const elapsed = currentDate.getTime() - startDate.getTime();

      // Get total cycles based on contract type
      const getTotalCycles = () => {
        switch (contractType) {
          case "sixMonths":
            return 1;
          case "oneYear":
            return 2;
          case "twoYears":
            return 4;
          default:
            return 1;
        }
      };

      const totalCycles = getTotalCycles();

      // Calculate completed cycles
      const cyclesCompleted = Math.floor(elapsed / sixMonthDuration);
      const actualCompletedCycles = Math.min(cyclesCompleted, totalCycles);

      // Only process new cycles that haven't been handled yet
      if (actualCompletedCycles > lastProcessedCyclesRef.current) {
        // Calculate earnings for newly completed cycles
        const newCompletedCycles =
          actualCompletedCycles - lastProcessedCyclesRef.current;
        const sixMonthEarnings = amount * (rate / 100); // Use rate directly for 6 months
        const grossEarnings = sixMonthEarnings * newCompletedCycles;

        // Apply 20% tax deduction
        const tax = grossEarnings * 0.2;
        const netEarnings = grossEarnings - tax;

        // console.log(
        //   `[${depositId}] Processing ${newCompletedCycles} new cycles. Gross: ₱${grossEarnings.toFixed(
        //     6
        //   )}, Tax: ₱${tax.toFixed(6)}, Net: ₱${netEarnings.toFixed(6)}`
        // );

        // Call the callback to update user's available balance and deposit cycle count
        if (onCycleComplete && netEarnings > 0) {
          onCycleComplete(netEarnings, depositId, actualCompletedCycles);
        }

        // Update the last processed cycles count
        lastProcessedCyclesRef.current = actualCompletedCycles;
      }

      setCompletedCycles(actualCompletedCycles);

      // Check if contract is completed
      if (cyclesCompleted >= totalCycles) {
        // Contract completed - show 100% progress
        setProgress(100);
        setCurrentCycle(totalCycles);
        setCurrentEarnings(0);
      } else {
        // Contract still active - calculate current cycle progress
        const currentCycleElapsed = elapsed % sixMonthDuration;
        let percentage = (currentCycleElapsed / sixMonthDuration) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        setProgress(percentage);

        // Calculate current cycle earnings
        const sixMonthEarnings = amount * (rate / 100); // Use rate directly for 6 months
        const currentCycleEarnings = (sixMonthEarnings * percentage) / 100;
        setCurrentEarnings(currentCycleEarnings);

        // Calculate current cycle number
        const currentCycleNumber = cyclesCompleted + 1;
        setCurrentCycle(currentCycleNumber);
      }
    };

    calculateProgress();
    // Update progress every minute
    const interval = setInterval(calculateProgress, 60000);

    return () => clearInterval(interval);
  }, [
    initialDate,
    contractType,
    amount,
    rate,
    onCycleComplete,
    depositId,
    currentCycleCount,
  ]);

  // Update lastProcessedCyclesRef when currentCycleCount prop changes
  useEffect(() => {
    lastProcessedCyclesRef.current = currentCycleCount;
  }, [currentCycleCount]);

  // Get total cycles based on contract type
  const getTotalCycles = () => {
    switch (contractType) {
      case "sixMonths":
        return 1;
      case "oneYear":
        return 2;
      case "twoYears":
        return 4;
      default:
        return 1;
    }
  };

  const totalCycles = getTotalCycles();

  // Don't render progress bar if contract is completed
  if (completedCycles >= totalCycles) {
    return null;
  }

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={[styles.currentEarningsText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "inspireAuto.content.currentEarnings")}: ₱{currentEarnings.toFixed(6)}
        </Text>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
      </View>
      <View style={styles.progressTextContainer}>
        <Text style={[styles.cycleText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "inspireAuto.content.cycle")} {currentCycle}/{totalCycles}
        </Text>
      </View>
    </View>
  );
};

export default function InspireAuto() {
  const navigation = useNavigation();
  const router = useRouter();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeSectionCollapsed, setActiveSectionCollapsed] = useState(false);
  const [completedSectionCollapsed, setCompletedSectionCollapsed] =
    useState(false);
  const [requestingCopy, setRequestingCopy] = useState(null); // Track which deposit is being processed
  const [userLanguage, setUserLanguage] = useState("english");

  // Modal state management
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [contractRequestModalVisible, setContractRequestModalVisible] =
    useState(false);

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
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
    const fetchInspireAutoDeposits = async () => {
      try {
        setLoading(true);
        
        // Check account type access first
        const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
        
        if (!hasAccess) {
          showModal({
            title: t(userLanguage, "inspireAuto.modals.accessRestricted.title"),
            message: t(userLanguage, "inspireAuto.modals.accessRestricted.message").replace("{accountType}", userAccountType || "Basic"),
            type: "warning",
            onConfirm: () => {
              navigation.goBack();
            }
          });
          setLoading(false);
          return;
        }
        
        const db = firestore;
        const currentUser = auth.currentUser;

        if (!currentUser) {
          // console.error("No authenticated user found");
          return;
        }

        // First check if user has timeDepositAmount
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const timeDepositAmount = parseFloat(userData.timeDepositAmount || 0);

          if (timeDepositAmount === 0) {
            showModal({
              title: t(userLanguage, "inspireAuto.modals.accessRestricted.title"),
              message: t(userLanguage, "inspireAuto.modals.accessRestricted.timeDepositMessage"),
              type: "warning",
              onConfirm: () => {
                navigation.goBack();
              }
            });
            setLoading(false);
            return;
          }
        } else {
          showModal({
            title: t(userLanguage, "inspireAuto.modals.error.title"),
            message: t(userLanguage, "inspireAuto.modals.error.message"),
            type: "error",
            onConfirm: () => {
              navigation.goBack();
            }
          });
          setLoading(false);
          return;
        }

        // Fetch deposits from the current user's inspireAuto collection
        const inspireAutoRef = collection(
          db,
          "users",
          currentUser.uid,
          "inspireAuto"
        );
        const querySnapshot = await getDocs(inspireAutoRef);

        const fetchedDeposits = [];
        let total = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          // Debug logging to check the actual data structure
          // console.log(`[DEBUG] Document ${doc.id} data:`, data);
          // console.log(`[DEBUG] Raw amount value:`, data.amount);
          // console.log(`[DEBUG] Amount type:`, typeof data.amount);

          // Try multiple possible field names for the amount
          let amount = 0;

          // Check common field names that might contain the amount
          const possibleAmountFields = [
            "amount",
            "depositAmount",
            "investmentAmount",
            "value",
            "principal",
            "initialAmount",
          ];

          for (const field of possibleAmountFields) {
            if (data[field] !== undefined && data[field] !== null) {
              // console.log(
              //   `[DEBUG] Found amount in field '${field}':`,
              //   data[field]
              // );
              const fieldValue =
                typeof data[field] === "number"
                  ? data[field]
                  : parseFloat(data[field]);

              // Only use the amount if it's a valid number
              if (!isNaN(fieldValue) && fieldValue > 0) {
                amount = fieldValue;
                // console.log(
                //   `[DEBUG] Using amount from field '${field}':`,
                //   amount
                // );
                break;
              }
            }
          }

          // console.log(`[DEBUG] Parsed amount:`, amount);

          fetchedDeposits.push({
            id: doc.id,
            amount: amount,
            date: data.date?.toDate
              ? data.date.toDate()
              : new Date(data.date || Date.now()),
            type: data.type || "Deposit",
            status: data.status || "Active",
            ...data,
          });

          // Only add to total if amount is a valid number
          if (!isNaN(amount) && typeof amount === "number") {
            total += amount;
            // console.log(
            //   `[DEBUG] Added ${amount} to total. Running total:`,
            //   total
            // );
          } else {
            // console.log(
            //   `[DEBUG] Skipping invalid amount: ${amount} for document ${doc.id}`
            // );
          }
        });

        // Ensure total is a valid number
        const finalTotal = isNaN(total) ? 0 : total;

        // console.log(`[DEBUG] Final results:`);
        // console.log(`[DEBUG] Total deposits found: ${fetchedDeposits.length}`);
        // console.log(`[DEBUG] Raw total: ${total}`);
        // console.log(`[DEBUG] Final total amount: ₱${finalTotal.toFixed(2)}`);
        // console.log(
        //   `[DEBUG] Individual deposit amounts:`,
        //   fetchedDeposits.map((d) => ({ id: d.id, amount: d.amount }))
        // );

        setDeposits(fetchedDeposits);
        setTotalAmount(finalTotal);
        setError(null);
      } catch (err) {
        // console.error("Error fetching inspireAuto deposits:", err);
        setError(err.message);
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.loadingError"),
          confirmText: "OK",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInspireAutoDeposits();
  }, []);

  // Function to update isActive status in Firestore
  const updateIsActiveStatus = async () => {
    try {
      const db = firestore;
      const currentUser = auth.currentUser;
      const presentDate = new Date();

      if (!currentUser) {
        // console.error("No authenticated user found");
        return;
      }

      for (const deposit of deposits) {
        let initialDate = deposit.initialDate;
        if (initialDate && initialDate.toDate) {
          initialDate = initialDate.toDate();
        }

        if (initialDate && deposit.contractType) {
          const startDate = new Date(initialDate);
          let monthsToAdd = 0;

          switch (deposit.contractType) {
            case "sixMonths":
              monthsToAdd = 6;
              break;
            case "oneYear":
              monthsToAdd = 12;
              break;
            case "twoYears":
              monthsToAdd = 24;
              break;
            default:
              continue;
          }

          const completionDate = new Date(startDate);
          completionDate.setMonth(completionDate.getMonth() + monthsToAdd);

          // Check if deposit is completed based on present date
          const isActive =
            presentDate < completionDate ? "Active" : "Completed";

          const depositRef = doc(
            db,
            "users",
            currentUser.uid,
            "inspireAuto",
            deposit.id
          );

          // Update with isActive status and completion date
          await updateDoc(depositRef, {
            isActive: isActive,
            completionDate: completionDate,
          });
        }
      }
    } catch (err) {
      // console.error("Error updating isActive status:", err);
    }
  };

  // Function to initialize currentCycleCount for deposits that don't have it
  const initializeCycleCounts = async () => {
    try {
      const db = firestore;
      const currentUser = auth.currentUser;

      if (!currentUser) {
        // console.error("No authenticated user found");
        return;
      }

      for (const deposit of deposits) {
        if (deposit.currentCycleCount === undefined) {
          const depositRef = doc(
            db,
            "users",
            currentUser.uid,
            "inspireAuto",
            deposit.id
          );
          await updateDoc(depositRef, {
            currentCycleCount: 0,
          });
          // console.log(`[${deposit.id}] Initialized currentCycleCount to 0`);
        }
      }
    } catch (err) {
      // console.error("Error initializing cycle counts:", err);
    }
  };

  // Manual update function
  const handleUpdateFirestore = async () => {
    if (deposits.length === 0) return;

    setUpdating(true);
    try {
      await initializeCycleCounts();
      await updateIsActiveStatus();
      setLastUpdated(new Date());
      // Success message removed - automatic updates don't need user notification
    } catch (err) {
      showModal({
        type: "error",
        title: t(userLanguage, "inspireAuto.modals.error.title"),
        message: t(userLanguage, "inspireAuto.modals.error.updateFailed"),
        confirmText: "OK",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Function to handle cycle completion and update user's available balance
  const handleCycleComplete = useCallback(
    async (earnings, depositId, actualCompletedCycles) => {
      // console.log(
      //   `[${depositId}] handleCycleComplete called with earnings: ₱${earnings.toFixed(
      //     6
      //   )}, cycles: ${actualCompletedCycles}`
      // );

      try {
        const db = firestore;
        const currentUser = auth.currentUser;

        if (!currentUser) {
          // console.error("No authenticated user found");
          return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        const depositRef = doc(
          db,
          "users",
          currentUser.uid,
          "inspireAuto",
          depositId
        );

        // Get current user data and deposit data
        const [userDoc, depositDoc] = await Promise.all([
          getDoc(userRef),
          getDoc(depositRef),
        ]);

        if (userDoc.exists() && depositDoc.exists()) {
          const userData = userDoc.data();
          const depositData = depositDoc.data();
          const currentBalance = userData.availBalanceAmount || 0;

          // Get total cycles for this contract type
          const getTotalCycles = () => {
            switch (depositData.contractType) {
              case "sixMonths":
                return 1;
              case "oneYear":
                return 2;
              case "twoYears":
                return 4;
              default:
                return 1;
            }
          };

          const totalCycles = getTotalCycles();
          let newBalance = currentBalance + earnings;

          // If contract is fully completed, also return the deposit amount
          if (actualCompletedCycles >= totalCycles) {
            const depositAmount = depositData.amount || 0;
            newBalance += depositAmount;
            // console.log(
            //   `[${depositId}] Contract fully completed! Returning deposit amount: ₱${depositAmount.toFixed(
            //     2
            //   )}`
            // );
          }

          // Update the user's available balance
          await updateDoc(userRef, {
            availBalanceAmount: newBalance,
          });

          // Update the deposit's cycle count
          await updateDoc(depositRef, {
            currentCycleCount: actualCompletedCycles,
          });

          // console.log(
          //   `[${depositId}] Cycle completed! Added ₱${earnings.toFixed(
          //     6
          //   )} to available balance. New balance: ₱${newBalance.toFixed(
          //     6
          //   )}. Updated cycle count to: ${actualCompletedCycles}`
          // );
        }
      } catch (error) {
        // console.error(
        //   `[${depositId}] Error updating available balance:`,
        //   error
        // );
      }
    },
    []
  );

  // Function to handle request copy of contract
  const handleRequestCopy = async (depositId) => {
    try {
      setRequestingCopy(depositId); // Set loading state for this specific deposit

      const currentUser = auth.currentUser;
      if (!currentUser) {
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.authenticationError"),
          confirmText: "OK",
        });
        return;
      }

      // Get user email from Firestore
      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
      if (!userDoc.exists()) {
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.userDataNotFound"),
          confirmText: "OK",
        });
        return;
      }

      const userData = userDoc.data();
      const userEmail = userData.email || currentUser.email;

      if (!userEmail) {
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.emailNotFound"),
          confirmText: "OK",
        });
        return;
      }

      // Get deposit data to find the date created
      const depositDoc = await getDoc(
        doc(firestore, "users", currentUser.uid, "inspireAuto", depositId)
      );
      if (!depositDoc.exists()) {
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.depositDataNotFound"),
          confirmText: "OK",
        });
        return;
      }

      const depositData = depositDoc.data();
      let depositDate = depositData.date || depositData.initialDate;

      // Handle Firestore timestamp
      if (depositDate && depositDate.toDate) {
        depositDate = depositDate.toDate();
      }

      // Use contract path structure: serviceAgreements/{userId}/{contractId}/SA-{contractId}.pdf
      const storage = getStorage();
      const contractPath = `serviceAgreements/${currentUser.uid}/${depositId}/SA-${depositId}.pdf`;
      const storageRef = ref(storage, contractPath);

      let downloadURL = null;
      let foundPath = null;

      try {
        // console.log(`[DEBUG] === CONTRACT SEARCH DEBUG ===`);
        // console.log(`[DEBUG] Trying path: ${contractPath}`);
        // console.log(
        //   `[DEBUG] Storage bucket:`,
        //   storage.app.options.storageBucket
        // );
        // console.log(`[DEBUG] User ID:`, currentUser.uid);
        // console.log(`[DEBUG] Deposit ID:`, depositId);
        // console.log(`[DEBUG] Expected filename: SA-${depositId}.pdf`);
        // console.log(`[DEBUG] Full storage reference:`, storageRef.toString());
        // console.log(`[DEBUG] Storage reference bucket:`, storageRef.bucket);
        // console.log(
        //   `[DEBUG] Storage reference full path:`,
        //   storageRef.fullPath
        // );

        // Try the exact path from Firebase Storage
        const exactPath = `serviceAgreements/yJrhz5swRtWUwWf5skEYYXICDqm2/6aed4244c014903ba72c23231cce627b/SA-6aed4244c014903ba72c23231cce627b.pdf`;
        // console.log(`[DEBUG] Expected exact path from Firebase: ${exactPath}`);
        // console.log(`[DEBUG] Paths match:`, contractPath === exactPath);

        // console.log(`[DEBUG] === END DEBUG INFO ===`);

        downloadURL = await getDownloadURL(storageRef);
        foundPath = contractPath;
        // console.log(`[DEBUG] ✅ Found contract at: ${contractPath}`);
        // console.log(`[DEBUG] Download URL:`, downloadURL);
      } catch (error) {
        // console.log(`[DEBUG] ❌ Contract not found at: ${contractPath}`);
        // console.error(`[DEBUG] Storage error code:`, error.code);
        // console.error(`[DEBUG] Storage error message:`, error.message);
        // console.error(`[DEBUG] Full storage error:`, error);

        // Check if the new storage bucket is being used
        // console.log(
        //   `[DEBUG] Current storage bucket:`,
        //   storage.app.options.storageBucket
        // );
        // console.log(
        //   `[DEBUG] Expected storage bucket: inspire-wallet.firebasestorage.app`
        // );

        throw new Error("Contract document not found");
      }

      try {
        // Prepare email template parameters
        const templateParams = {
          to_email: userEmail,
          to_name: userData.firstName || userData.name || "Valued Client",
          deposit_id: depositId,
          deposit_amount: formatCurrency(depositData.amount || 0),
          contract_type: depositData.contractType || "N/A",
          deposit_type: depositData.depositType || depositData.type || "N/A",
          deposit_date: formatDate(depositDate),
          pdf_url: downloadURL,
          user_name: userData.firstName || userData.name || "Valued Client",
        };

        // Debug EmailJS configuration
        // console.log(
        //   `[DEBUG] EmailJS Service ID:`,
        //   process.env.EXPO_PUBLIC_SERVICE_ID
        // );
        // console.log(
        //   `[DEBUG] EmailJS Template ID:`,
        //   process.env.EXPO_PUBLIC_CONTRACT_REQUEST_TEMPLATE_ID
        // );
        // console.log(
        //   `[DEBUG] EmailJS Public Key:`,
        //   process.env.EXPO_PUBLIC_API_KEY ? "Set" : "Not Set"
        // );

        // Send email using EmailJS
        const result = await send(
          process.env.EXPO_PUBLIC_SERVICE_ID, // Your EmailJS Service ID
          process.env.EXPO_PUBLIC_CONTRACT_REQUEST_TEMPLATE_ID, // Your EmailJS Template ID
          templateParams,
          {
            publicKey: process.env.EXPO_PUBLIC_API_KEY, // Your EmailJS Public Key
          }
        );

        // console.log("Email sent successfully:", result);
        showModal({
          type: "success",
          title: t(userLanguage, "inspireAuto.modals.success.title"),
          message: t(userLanguage, "inspireAuto.modals.success.contractSent").replace("{email}", userEmail),
          confirmText: "OK",
        });

        // console.log(
        //   `[DEBUG] Email sent successfully for contract: ${foundPath}`
        // );
      } catch (emailError) {
        // console.error("Email sending error:", emailError);
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.emailError"),
          confirmText: "OK",
        });
      }
    } catch (error) {
      // console.error("Request copy error:", error);

      // Check if this is a "contract not found" error
      if (error.message.includes("Contract document not found")) {
        showModal({
          type: "warning",
          title: t(userLanguage, "inspireAuto.modals.warning.title"),
          message: t(userLanguage, "inspireAuto.modals.warning.message"),
          confirmText: "OK",
        });
      } else {
        showModal({
          type: "error",
          title: t(userLanguage, "inspireAuto.modals.error.title"),
          message: t(userLanguage, "inspireAuto.modals.error.requestCopyError"),
          confirmText: "OK",
        });
      }
    } finally {
      setRequestingCopy(null); // Reset loading state
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t(userLanguage, "inspireAuto.header.title"),
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background, // This colors the default back button
      // No headerLeft needed - React Navigation provides default back button
    });
  }, [userLanguage]);

  const formatCurrency = (value) => {
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
      return "0.00";
    }
    const fixedValue = numberValue.toFixed(2);
    const formattedStr = fixedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return formattedStr;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to copy deposit ID to clipboard
  const copyDepositId = async (depositId) => {
    try {
      await Clipboard.setString(depositId);
      showModal({
        type: "success",
        title: t(userLanguage, "inspireAuto.modals.success.copied"),
        message: t(userLanguage, "inspireAuto.modals.success.copiedMessage").replace("{depositId}", depositId),
        confirmText: "OK",
      });
    } catch (error) {
      showModal({
        type: "error",
        title: t(userLanguage, "inspireAuto.modals.error.title"),
        message: t(userLanguage, "inspireAuto.modals.error.copyFailed"),
        confirmText: "OK",
      });
    }
  };

  // Filter deposits by status
  const activeDeposits = deposits
    .filter((d) => d.isActive === "Active")
    .sort((a, b) => {
      let dateA = a.initialDate;
      let dateB = b.initialDate;

      // Handle Firestore timestamps
      if (dateA && dateA.toDate) dateA = dateA.toDate();
      if (dateB && dateB.toDate) dateB = dateB.toDate();

      // Convert to Date objects if they're strings
      if (typeof dateA === "string") dateA = new Date(dateA);
      if (typeof dateB === "string") dateB = new Date(dateB);

      // Sort in descending order (newest first)
      return dateB - dateA;
    });

  const completedDeposits = deposits
    .filter((d) => d.isActive === "Completed")
    .sort((a, b) => {
      let dateA = a.initialDate;
      let dateB = b.initialDate;

      // Handle Firestore timestamps
      if (dateA && dateA.toDate) dateA = dateA.toDate();
      if (dateB && dateB.toDate) dateB = dateB.toDate();

      // Convert to Date objects if they're strings
      if (typeof dateA === "string") dateA = new Date(dateA);
      if (typeof dateB === "string") dateB = new Date(dateB);

      // Sort in descending order (newest first)
      return dateB - dateA;
    });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.redTheme.background} />
          <Text style={[styles.loadingText, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.loadingText")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={Colors.redTheme.background}
          />
          <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchInspireAutoDeposits()}
          >
            <Text style={[styles.retryButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerBackground}>
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.header.title")}</Text>
                <View style={styles.headerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{deposits.length}</Text>
                    <Text style={[styles.statLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.totalDeposits")}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {activeDeposits.length}
                    </Text>
                    <Text style={[styles.statLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.active")}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {completedDeposits.length}
                    </Text>
                    <Text style={[styles.statLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.completed")}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.updateButtonHeader,
                  updating && styles.updateButtonDisabled,
                ]}
                onPress={handleUpdateFirestore}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="sync" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {lastUpdated && (
            <Text style={[styles.lastUpdatedText, getRTLStyles(userLanguage)]}>
              Last updated: {formatDate(lastUpdated)}
            </Text>
          )}
        </View>

        {/* Total Amount Card */}
        <View style={styles.totalAmountCard}>
          <View style={styles.totalAmountHeader}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={[styles.totalAmountLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.totalInvested")}</Text>
          </View>
          <Text style={styles.totalAmountValue}>
            ₱ {formatCurrency(totalAmount)}
          </Text>
          <View style={styles.totalAmountFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="trending-up" size={16} color="#4CAF50" />
              <Text style={[styles.footerText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "inspireAuto.content.active")}: {activeDeposits.length}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FF9800" />
              <Text style={[styles.footerText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "inspireAuto.content.completed")}: {completedDeposits.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Deposits List */}
        <View style={styles.depositsContainer}>
          {/* Active Deposits Section */}
          <TouchableOpacity
            style={[styles.sectionHeader, { borderLeftColor: "#4CAF50" }]}
            onPress={() => setActiveSectionCollapsed(!activeSectionCollapsed)}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons
                name="play-circle"
                size={24}
                color="#4CAF50"
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.activeDeposits")}</Text>
              <Text style={styles.sectionCount}>{activeDeposits.length}</Text>
            </View>
            <Ionicons
              name={activeSectionCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {!activeSectionCollapsed &&
            (activeDeposits.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={48} color="#ccc" />
                <Text style={[styles.emptyText, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.noActiveDeposits")}</Text>
                <Text style={[styles.emptySubtext, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "inspireAuto.content.noActiveDepositsSubtext")}
                </Text>
              </View>
            ) : (
              activeDeposits.map((deposit) => (
                <View key={deposit.id} style={styles.depositCard}>
                  <View style={styles.depositHeader}>
                    <View style={styles.depositInfo}>
                      <View style={styles.depositTitleRow}>
                        <Ionicons
                          name="trending-up"
                          size={16}
                          color="#4CAF50"
                          style={styles.depositIcon}
                        />
                        <Text style={styles.depositType}>{deposit.type}</Text>
                      </View>
                      <Text style={styles.depositDate}>
                        {(() => {
                          let d = deposit.initialDate;
                          if (d && d.toDate) d = d.toDate();
                          if (d) return formatDate(new Date(d));
                          return "N/A";
                        })()}
                      </Text>
                      <View style={styles.depositIdRow}>
                        <Text style={styles.depositId}>ID: {deposit.id}</Text>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyDepositId(deposit.id)}
                        >
                          <Ionicons name="copy" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#4CAF50" },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color="white"
                            style={styles.statusIcon}
                          />
                          Active
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.amountInfoBox}>
                    <View style={styles.amountRow}>
                      <Text style={[styles.amountLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.amount")}</Text>
                      <Text style={styles.amountValueBig}>
                        ₱ {formatCurrency(deposit.amount)}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.investmentRate")}</Text>
                      <Text style={styles.infoValue}>
                        {deposit.rate !== undefined
                          ? deposit.rate.toFixed(2) + "%"
                          : "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.contractType")}</Text>
                      <Text style={styles.infoValue}>
                        {deposit.contractType || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.avgMonth")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          if (deposit.rate !== undefined) {
                            const sixMonthEarnings =
                              deposit.amount * (deposit.rate / 100);
                            const monthlyEarnings = sixMonthEarnings / 6; // 6 months duration
                            return `₱${formatCurrency(monthlyEarnings)}`;
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.avgMinute")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          if (deposit.rate !== undefined) {
                            const sixMonthEarnings =
                              deposit.amount * (deposit.rate / 100);
                            const months = 6; // 6 months duration
                            const minutesInContract = months * 30 * 24 * 60; // months * days * hours * minutes
                            const earningsPerMinute =
                              sixMonthEarnings / minutesInContract;
                            return `₱${earningsPerMinute.toFixed(6)}`;
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "inspireAuto.content.expectedEarnings")}
                      </Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          if (deposit.rate !== undefined) {
                            const sixMonthEarnings =
                              deposit.amount * (deposit.rate / 100);
                            const tax = sixMonthEarnings * 0.2; // 20% tax
                            const netEarnings = sixMonthEarnings - tax;
                            return `₱${formatCurrency(netEarnings)}`;
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.completionDate")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          let initialDate = deposit.initialDate;
                          if (initialDate && initialDate.toDate) {
                            initialDate = initialDate.toDate();
                          }
                          if (initialDate && deposit.contractType) {
                            const startDate = new Date(initialDate);
                            let monthsToAdd = 0;

                            switch (deposit.contractType) {
                              case "sixMonths":
                                monthsToAdd = 6;
                                break;
                              case "oneYear":
                                monthsToAdd = 12;
                                break;
                              case "twoYears":
                                monthsToAdd = 24;
                                break;
                              default:
                                return "N/A";
                            }

                            const completionDate = new Date(startDate);
                            completionDate.setMonth(
                              completionDate.getMonth() + monthsToAdd
                            );
                            return formatDate(completionDate);
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>
                  </View>
                  <ProgressBar
                    initialDate={deposit.initialDate}
                    contractType={deposit.contractType}
                    amount={deposit.amount}
                    rate={deposit.rate}
                    onCycleComplete={handleCycleComplete}
                    depositId={deposit.id}
                    currentCycleCount={deposit.currentCycleCount}
                    userLanguage={userLanguage}
                  />
                  {deposit.description && (
                    <View style={styles.dividerAndDescription}>
                      <View style={styles.divider} />
                      <Text style={styles.description}>
                        {deposit.description}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.requestCopyButton,
                      requestingCopy === deposit.id &&
                        styles.requestCopyButtonDisabled,
                    ]}
                    onPress={() => handleRequestCopy(deposit.id)}
                    disabled={requestingCopy === deposit.id}
                  >
                    {requestingCopy === deposit.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="document-text" size={20} color="white" />
                    )}
                    <Text style={[styles.requestCopyButtonText, getRTLStyles(userLanguage)]}>
                      {requestingCopy === deposit.id
                        ? t(userLanguage, "inspireAuto.content.processing")
                        : t(userLanguage, "inspireAuto.content.requestCopy")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ))}

          {/* Completed Deposits Section */}
          <TouchableOpacity
            style={[styles.sectionHeader, { borderLeftColor: "#FF9800" }]}
            onPress={() =>
              setCompletedSectionCollapsed(!completedSectionCollapsed)
            }
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons
                name="checkmark-done-circle"
                size={24}
                color="#FF9800"
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.completedDeposits")}</Text>
              <Text style={styles.sectionCount}>
                {completedDeposits.length}
              </Text>
            </View>
            <Ionicons
              name={completedSectionCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {!completedSectionCollapsed &&
            (completedDeposits.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={48}
                  color="#ccc"
                />
                <Text style={[styles.emptyText, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.noCompletedDeposits")}</Text>
                <Text style={[styles.emptySubtext, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "inspireAuto.content.noCompletedDepositsSubtext")}
                </Text>
              </View>
            ) : (
              completedDeposits.map((deposit) => (
                <View key={deposit.id} style={styles.depositCard}>
                  <View style={styles.depositHeader}>
                    <View style={styles.depositInfo}>
                      <View style={styles.depositTitleRow}>
                        <Ionicons
                          name="trophy"
                          size={16}
                          color="#FF9800"
                          style={styles.depositIcon}
                        />
                        <Text style={styles.depositType}>{deposit.type}</Text>
                      </View>
                      <Text style={styles.depositDate}>
                        {(() => {
                          let d = deposit.initialDate;
                          if (d && d.toDate) d = d.toDate();
                          if (d) return formatDate(new Date(d));
                          return "N/A";
                        })()}
                      </Text>
                      <View style={styles.depositIdRow}>
                        <Text style={styles.depositId}>ID: {deposit.id}</Text>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyDepositId(deposit.id)}
                        >
                          <Ionicons name="copy" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#FF9800" },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          <Ionicons
                            name="checkmark-done"
                            size={12}
                            color="white"
                            style={styles.statusIcon}
                          />
                          Completed
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.amountInfoBox}>
                    <View style={styles.amountRow}>
                      <Text style={[styles.amountLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.amount")}</Text>
                      <Text style={styles.amountValueBig}>
                        ₱ {formatCurrency(deposit.amount)}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.investmentRate")}</Text>
                      <Text style={styles.infoValue}>
                        {deposit.rate !== undefined
                          ? deposit.rate.toFixed(2) + "%"
                          : "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.contractType")}</Text>
                      <Text style={styles.infoValue}>
                        {deposit.contractType || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.avgMonth")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          if (deposit.rate !== undefined) {
                            const sixMonthEarnings =
                              deposit.amount * (deposit.rate / 100);
                            const monthlyEarnings = sixMonthEarnings / 6; // 6 months duration
                            return `₱${formatCurrency(monthlyEarnings)}`;
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.avgMinute")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          if (deposit.rate !== undefined) {
                            const sixMonthEarnings =
                              deposit.amount * (deposit.rate / 100);
                            const months = 6; // 6 months duration
                            const minutesInContract = months * 30 * 24 * 60; // months * days * hours * minutes
                            const earningsPerMinute =
                              sixMonthEarnings / minutesInContract;
                            return `₱${earningsPerMinute.toFixed(6)}`;
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.totalEarned")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          if (
                            deposit.rate !== undefined &&
                            deposit.contractType
                          ) {
                            // Calculate 6-month earnings first
                            const sixMonthEarnings =
                              deposit.amount * (deposit.rate / 100);
                            const sixMonthTax = sixMonthEarnings * 0.2; // 20% tax
                            const sixMonthNet = sixMonthEarnings - sixMonthTax;

                            // Calculate total earned based on contract type
                            let multiplier = 1;
                            switch (deposit.contractType) {
                              case "sixMonths":
                                multiplier = 1; // 1 time
                                break;
                              case "oneYear":
                                multiplier = 2; // 2 times (2 x 6 months)
                                break;
                              case "twoYears":
                                multiplier = 4; // 4 times (4 x 6 months)
                                break;
                              default:
                                multiplier = 1;
                            }

                            const totalEarned = sixMonthNet * multiplier;
                            return `₱${formatCurrency(totalEarned)}`;
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>

                    {/* Completion Date */}
                    <View style={styles.infoRowImproved}>
                      <Text style={[styles.infoLabelBold, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.completionDate")}</Text>
                      <Text style={styles.infoValue}>
                        {(() => {
                          let initialDate = deposit.initialDate;
                          if (initialDate && initialDate.toDate) {
                            initialDate = initialDate.toDate();
                          }
                          if (initialDate && deposit.contractType) {
                            const startDate = new Date(initialDate);
                            let monthsToAdd = 0;

                            switch (deposit.contractType) {
                              case "sixMonths":
                                monthsToAdd = 6;
                                break;
                              case "oneYear":
                                monthsToAdd = 12;
                                break;
                              case "twoYears":
                                monthsToAdd = 24;
                                break;
                              default:
                                return "N/A";
                            }

                            const completionDate = new Date(startDate);
                            completionDate.setMonth(
                              completionDate.getMonth() + monthsToAdd
                            );
                            return formatDate(completionDate);
                          }
                          return "N/A";
                        })()}
                      </Text>
                    </View>

                    {/* Breakdown Section */}
                    <View style={styles.breakdownContainer}>
                      <Text style={[styles.breakdownTitle, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "inspireAuto.content.earningsBreakdown")}
                      </Text>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, "inspireAuto.content.sixMonthGross")}
                        </Text>
                        <Text style={styles.breakdownValue}>
                          {(() => {
                            if (deposit.rate !== undefined) {
                              const sixMonthEarnings =
                                deposit.amount * (deposit.rate / 100);
                              return `₱${formatCurrency(sixMonthEarnings)}`;
                            }
                            return "N/A";
                          })()}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.tax")}</Text>
                        <Text style={styles.breakdownValue}>
                          {(() => {
                            if (deposit.rate !== undefined) {
                              const sixMonthEarnings =
                                deposit.amount * (deposit.rate / 100);
                              const tax = sixMonthEarnings * 0.2;
                              return `₱${formatCurrency(tax)}`;
                            }
                            return "N/A";
                          })()}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.sixMonthNet")}</Text>
                        <Text style={styles.breakdownValue}>
                          {(() => {
                            if (deposit.rate !== undefined) {
                              const sixMonthEarnings =
                                deposit.amount * (deposit.rate / 100);
                              const tax = sixMonthEarnings * 0.2;
                              const net = sixMonthEarnings - tax;
                              return `₱${formatCurrency(net)}`;
                            }
                            return "N/A";
                          })()}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, getRTLStyles(userLanguage)]}>
                          {t(userLanguage, "inspireAuto.content.cycleCompleted")}
                        </Text>
                        <Text style={styles.breakdownValue}>
                          {(() => {
                            if (deposit.contractType) {
                              switch (deposit.contractType) {
                                case "sixMonths":
                                  return "1";
                                case "oneYear":
                                  return "2";
                                case "twoYears":
                                  return "4";
                                default:
                                  return "1";
                              }
                            }
                            return "N/A";
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ProgressBar
                    initialDate={deposit.initialDate}
                    contractType={deposit.contractType}
                    amount={deposit.amount}
                    rate={deposit.rate}
                    onCycleComplete={handleCycleComplete}
                    depositId={deposit.id}
                    currentCycleCount={deposit.currentCycleCount}
                    userLanguage={userLanguage}
                  />
                  {deposit.description && (
                    <View style={styles.dividerAndDescription}>
                      <View style={styles.divider} />
                      <Text style={styles.description}>
                        {deposit.description}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.requestCopyButton,
                      requestingCopy === deposit.id &&
                        styles.requestCopyButtonDisabled,
                    ]}
                    onPress={() => handleRequestCopy(deposit.id)}
                    disabled={requestingCopy === deposit.id}
                  >
                    {requestingCopy === deposit.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="document-text" size={20} color="white" />
                    )}
                    <Text style={[styles.requestCopyButtonText, getRTLStyles(userLanguage)]}>
                      {requestingCopy === deposit.id
                        ? t(userLanguage, "inspireAuto.content.processing")
                        : t(userLanguage, "inspireAuto.content.requestCopy")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ))}
        </View>
      </ScrollView>

      {/* Professional Modal */}
      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm || hideModal}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
      />

      {/* Contract Request Modal */}
      <ContractRequestModal
        visible={contractRequestModalVisible}
        onClose={() => setContractRequestModalVisible(false)}
        onSuccess={(message) => {
          showModal({
            title: "Success",
            message: message,
            type: "success",
          });
        }}
      />

      {/* Floating Action Button for Contract Request */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setContractRequestModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.floatingButtonContent}>
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={[styles.floatingButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, "inspireAuto.content.contract")}</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  headerContainer: {
    marginBottom: 24,
    paddingTop: 50,
  },
  headerBackground: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "white",
  },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "white",
  },
  updateButtonHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonTextHeader: {
    color: Colors.redTheme.background,
    fontSize: 16,
    fontWeight: "600",
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "white",
    marginTop: 8,
    fontStyle: "italic",
  },
  totalAmountCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
  },
  totalAmountHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  totalAmountLabel: {
    fontSize: 16,
    color: "#666",
    paddingRight: 18,
  },
  totalAmountValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 8,
  },
  totalAmountFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  depositsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  sectionCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  depositCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  depositHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  depositInfo: {
    flex: 1,
  },
  depositTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  depositIcon: {
    marginRight: 8,
  },
  depositType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  depositDate: {
    fontSize: 14,
    color: "#666",
  },
  depositId: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  statusContainer: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  amountInfoBox: {
    backgroundColor: "#f7f7fa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  amountValueBig: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  infoRowImproved: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    marginTop: 2,
  },
  infoLabelBold: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  dividerAndDescription: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#ececec",
    marginBottom: 8,
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 13,
    color: "#333",
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  progressContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: "#e9ecef",
    borderRadius: 6,
    marginRight: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 6,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  progressTextContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  cycleText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  currentEarningsText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  breakdownContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "bold",
  },
  requestCopyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.redTheme.background,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  requestCopyButtonDisabled: {
    opacity: 0.6,
  },
  requestCopyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  depositIdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  floatingButtonContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});
