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
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useRouter, useNavigation } from "expo-router";
import { auth, firestore } from "./../configs/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "./ProfessionalModal";
import useModal from "./useModal";

// Progress Bar Component
const ProgressBar = ({
  initialDate,
  contractType,
  amount,
  rate,
  onCycleComplete,
  depositId,
  currentCycleCount = 0,
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
          // Add a small delay to prevent rapid successive calls
          setTimeout(() => {
            onCycleComplete(netEarnings, depositId, actualCompletedCycles);
          }, 100);
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
    // Update progress every 10 seconds for real-time feel
    const interval = setInterval(calculateProgress, 10000);

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
      <Text style={styles.currentEarningsText}>
        Current Earnings: ₱{currentEarnings.toFixed(6)}
      </Text>
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
      </View>
      <Text style={styles.cycleText}>
        Cycle {currentCycle}/{totalCycles}
      </Text>
    </View>
  );
};

export default forwardRef(function InspireAuto(props, ref) {
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

  // Modal state management
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  // Track processing state to prevent duplicate transactions
  const processingDepositsRef = useRef(new Set());

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    handleUpdateFirestore: handleUpdateFirestore,
  }));

  useEffect(() => {
    const setupRealtimeListener = () => {
      try {
        setLoading(true);
        const db = firestore;
        const currentUser = auth.currentUser;
        if (!currentUser) {
          // setError("No authenticated user found");
          setLoading(false);
          return;
        }

        // Set up real-time listener for inspireAuto collection
        const inspireAutoRef = collection(
          db,
          "users",
          currentUser.uid,
          "inspireAuto"
        );

        const unsubscribe = onSnapshot(
          inspireAutoRef,
          async (querySnapshot) => {
            try {
              const fetchedDeposits = [];
              let total = 0;

              querySnapshot.forEach((doc) => {
                const data = doc.data();
                const amount =
                  typeof data.amount === "number"
                    ? data.amount
                    : parseFloat(data.amount) || 0;

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

                total += amount;
              });

              setDeposits(fetchedDeposits);
              setTotalAmount(total);
              setError(null);
              setLoading(false);

              // console.log(
              //   `[Real-time] Updated ${
              //     fetchedDeposits.length
              //   } deposits. Total: ₱${total.toFixed(2)}`
              // );

              // Update timeDepositAmount after fetching deposits
              if (fetchedDeposits.length > 0) {
                await updateTimeDepositAmount(fetchedDeposits);
              }
            } catch (err) {
              // console.error("Error processing real-time deposit updates:", err);
              setError(err.message);
              setLoading(false);
            }
          },
          (error) => {
            // console.error("Error in real-time listener:", error);
            setError(error.message);
            setLoading(false);
          }
        );

        // Return cleanup function
        return unsubscribe;
      } catch (err) {
        // console.error("Error setting up real-time listener:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    const unsubscribe = setupRealtimeListener();

    // Cleanup listener on component unmount
    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
        // console.log("[Real-time] Cleaned up Firestore listener");
      }
    };
  }, []);

  // Note: updateTimeDepositAmount is now called directly in the real-time listener

  // Function to update isActive status in Firestore
  const updateIsActiveStatus = async () => {
    try {
      const db = firestore;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // console.error("No authenticated user found");
        return;
      }
      const presentDate = new Date();

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

      // Update timeDepositAmount after updating isActive status
      await updateTimeDepositAmount();
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
      await updateTimeDepositAmount();
      setLastUpdated(new Date());
      // Success message removed - automatic updates don't need user notification
    } catch (err) {
      showModal({
        type: "error",
        title: "Update Failed",
        message: "Failed to update Firestore. Please try again.",
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

      // Prevent duplicate processing for the same deposit
      if (processingDepositsRef.current.has(depositId)) {
        // console.log(`[${depositId}] Already processing, skipping duplicate call`);
        return;
      }

      // Mark this deposit as being processed
      processingDepositsRef.current.add(depositId);

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
          const previousCycleCount = depositData.currentCycleCount || 0;

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

          // Check if this is the final cycle completion (contract fully completed)
          const isFinalCycle = actualCompletedCycles >= totalCycles && previousCycleCount < totalCycles;

          // If contract is fully completed, also return the deposit amount
          if (isFinalCycle) {
            const depositAmount = depositData.amount || 0;
            newBalance += depositAmount;
            // Add transaction record for time deposit returned
            await addDoc(collection(db, "users", currentUser.uid, "transactions"), {
              type: "Time Deposit Returned",
              amount: depositAmount,
              date: serverTimestamp(),
              description: `Principal returned for completed deposit ${depositId}`,
              reference: depositId,
              status: "Completed",
              balanceAfter: newBalance,
            });
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

          // Calculate how many cycles were completed in this update
          const cyclesCompletedInThisUpdate = actualCompletedCycles - previousCycleCount;
          
          // Add transaction record for investment earnings
          await addDoc(collection(db, "users", currentUser.uid, "transactions"), {
            type: "Investment Earnings",
            amount: earnings,
            date: serverTimestamp(),
            description: `Earnings for ${cyclesCompletedInThisUpdate > 1 ? `${cyclesCompletedInThisUpdate} cycles` : `cycle ${actualCompletedCycles}`} of deposit ${depositId}`,
            reference: depositId,
            status: "Completed",
            balanceAfter: newBalance,
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

          // Update timeDepositAmount after cycle completion
          await updateTimeDepositAmount();
        }
      } catch (error) {
        // console.error(
        //   `[${depositId}] Error updating available balance:`,
        //   error
        // );
      } finally {
        // Remove from processing set
        processingDepositsRef.current.delete(depositId);
      }
    },
    [deposits]
  );

  // Function to update timeDepositAmount in Firestore with active InspireAuto deposits
  const updateTimeDepositAmount = async (depositsData = deposits) => {
    try {
      const db = firestore;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // console.error("No authenticated user found");
        return;
      }
      const userRef = doc(db, "users", currentUser.uid);

      // Calculate total amount from active deposits
      const activeDeposits = depositsData.filter(
        (d) => d.isActive === "Active"
      );
      const totalActiveAmount = activeDeposits.reduce(
        (sum, deposit) => sum + (deposit.amount || 0),
        0
      );

      // console.log(`[DEBUG] Total deposits: ${depositsData.length}`);
      // console.log(`[DEBUG] Active deposits: ${activeDeposits.length}`);
      // console.log(
      //   `[DEBUG] Active deposit amounts:`,
      //   activeDeposits.map((d) => ({
      //     id: d.id,
      //     amount: d.amount,
      //     isActive: d.isActive,
      //   }))
      // );
      // console.log(
      //   `[DEBUG] Total active amount: ₱${totalActiveAmount.toFixed(2)}`
      // );

      // Update the timeDepositAmount in Firestore
      await updateDoc(userRef, {
        timeDepositAmount: totalActiveAmount,
      });

      // console.log(
      //   `Updated timeDepositAmount to ₱${totalActiveAmount.toFixed(2)} from ${
      //     activeDeposits.length
      //   } active deposits`
      // );
    } catch (err) {
      // console.error("Error updating timeDepositAmount:", err);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Inspire Auto",
      headerTransparent: true,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.redTheme.background}
          />
        </TouchableOpacity>
      ),
    });
  }, []);

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
        title: "Copied!",
        message: `Deposit ID "${depositId}" has been copied to clipboard.`,
        confirmText: "OK",
      });
    } catch (error) {
      showModal({
        type: "error",
        title: "Copy Failed",
        message: "Failed to copy deposit ID. Please try again.",
        confirmText: "OK",
      });
    }
  };

  // Filter deposits by status
  const activeDeposits = deposits.filter((d) => d.isActive === "Active");
  const completedDeposits = deposits.filter((d) => d.isActive === "Completed");

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.redTheme.background} />
          <Text style={styles.loadingText}>
            Loading Inspire Auto deposits...
          </Text>
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
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchInspireAutoDeposits()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
                <Text style={styles.headerTitle}>Inspire Auto</Text>
                <View style={styles.headerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{deposits.length}</Text>
                    <Text style={styles.statLabel}>Total Deposits</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {activeDeposits.length}
                    </Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {completedDeposits.length}
                    </Text>
                    <Text style={styles.statLabel}>Completed</Text>
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
          <View style={styles.statusContainer}>
            <View style={styles.realtimeIndicator}>
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeText}>Real-time updates active</Text>
            </View>
            {lastUpdated && (
              <Text style={styles.lastUpdatedText}>
                Last manual update: {formatDate(lastUpdated)}
              </Text>
            )}
          </View>
        </View>

        {/* Total Amount Card */}
        <View style={styles.totalAmountCard}>
          <View style={styles.totalAmountHeader}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.totalAmountLabel}>Total Invested</Text>
          </View>
          <Text style={styles.totalAmountValue}>
            ₱ {formatCurrency(totalAmount)}
          </Text>
          <View style={styles.totalAmountFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="trending-up" size={16} color="#4CAF50" />
              <Text style={styles.footerText}>
                Active: {activeDeposits.length}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FF9800" />
              <Text style={styles.footerText}>
                Completed: {completedDeposits.length}
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
              <Text style={styles.sectionTitle}>Active Deposits</Text>
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
                <Text style={styles.emptyText}>No active deposits</Text>
                <Text style={styles.emptySubtext}>
                  Your active investments will appear here
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
                      <Text style={styles.amountLabel}>Amount:</Text>
                      <Text style={styles.amountValueBig}>
                        ₱ {formatCurrency(deposit.amount)}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={styles.infoLabelBold}>Investment Rate:</Text>
                      <Text style={styles.infoValue}>
                        {deposit.rate !== undefined
                          ? deposit.rate.toFixed(2) + "%"
                          : "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={styles.infoLabelBold}>Contract Type:</Text>
                      <Text style={styles.infoValue}>
                        {deposit.contractType || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={styles.infoLabelBold}>Avg/Month:</Text>
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
                      <Text style={styles.infoLabelBold}>Avg/Minute:</Text>
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
                      <Text style={styles.infoLabelBold}>
                        Expected Earnings:
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
                      <Text style={styles.infoLabelBold}>Completion Date:</Text>
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
                  />
                  {deposit.description && (
                    <View style={styles.dividerAndDescription}>
                      <View style={styles.divider} />
                      <Text style={styles.description}>
                        {deposit.description}
                      </Text>
                    </View>
                  )}
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
              <Text style={styles.sectionTitle}>Completed Deposits</Text>
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
                <Text style={styles.emptyText}>No completed deposits</Text>
                <Text style={styles.emptySubtext}>
                  Your completed investments will appear here
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
                      <Text style={styles.amountLabel}>Amount:</Text>
                      <Text style={styles.amountValueBig}>
                        ₱ {formatCurrency(deposit.amount)}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={styles.infoLabelBold}>Investment Rate:</Text>
                      <Text style={styles.infoValue}>
                        {deposit.rate !== undefined
                          ? deposit.rate.toFixed(2) + "%"
                          : "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={styles.infoLabelBold}>Contract Type:</Text>
                      <Text style={styles.infoValue}>
                        {deposit.contractType || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.infoRowImproved}>
                      <Text style={styles.infoLabelBold}>Avg/Month:</Text>
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
                      <Text style={styles.infoLabelBold}>Avg/Minute:</Text>
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
                      <Text style={styles.infoLabelBold}>Total Earned:</Text>
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
                      <Text style={styles.infoLabelBold}>Completion Date:</Text>
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
                      <Text style={styles.breakdownTitle}>
                        Earnings Breakdown:
                      </Text>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                          6-Month Gross:
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
                        <Text style={styles.breakdownLabel}>Tax (20%):</Text>
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
                        <Text style={styles.breakdownLabel}>6-Month Net:</Text>
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
                        <Text style={styles.breakdownLabel}>
                          Cycle Completed:
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
                  />
                  {deposit.description && (
                    <View style={styles.dividerAndDescription}>
                      <View style={styles.divider} />
                      <Text style={styles.description}>
                        {deposit.description}
                      </Text>
                    </View>
                  )}
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
    </SafeAreaView>
  );
});

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
    marginTop: 4,
    fontStyle: "italic",
  },
  statusContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  realtimeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 6,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  realtimeText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
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
    alignItems: "flex-start",
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
  cycleText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    width: "100%",
    fontWeight: "500",
  },
  currentEarningsText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.redTheme.background,
    marginBottom: 12,
    textAlign: "center",
    width: "100%",
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
});
