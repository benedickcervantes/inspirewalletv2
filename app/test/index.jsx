import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import SimpleLoadingScreen from "../../components/SimpleLoadingScreen";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TEST_USER_UID = "yJrhz5swRtWUwWf5skEYYXICDqm2";
const TEST_GROWTH_DOC_ID = "HQlu5hPJaXTelCBNDQ0L";

export default function TenMinuteCompoundInterest() {
  const navigation = useNavigation();
  const [initialDeposit, setInitialDeposit] = useState("");
  const [currentValue, setCurrentValue] = useState(0);
  const [totalGrowth, setTotalGrowth] = useState(0);
  const [yearCount, setYearCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [simulationModalVisible, setSimulationModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawAmountModal, setShowWithdrawAmountModal] = useState(false);
  const [withdrawalMap, setWithdrawalMap] = useState({});
  const [reinvestedAmount, setReinvestedAmount] = useState(0);
  const [lastReinvestmentDate, setLastReinvestmentDate] = useState(null);
  const [withdrawalTimestamps, setWithdrawalTimestamps] = useState([]);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [testModeModalVisible, setTestModeModalVisible] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [showInitialLoading, setShowInitialLoading] = useState(true);

  const TEST_MODE = false; //don't set to true, don't erase else shit happens.
  const MINUTES_PER_YEAR = TEST_MODE ? 12 : 365 * 24 * 60;
  const MS_PER_YEAR = MINUTES_PER_YEAR * 60 * 1000;
  const MS_PER_MONTH = MS_PER_YEAR / 12;

  const ANNUAL_RATE = 0.14;
  const TAX_RATE = 0.2;
  const SERVICE_FEE_RATE = 0.1;

  // Function to calculate elapsed years
  const calculateElapsedYears = () => {
    if (!startDate) return 0;
    const now = new Date();
    const elapsedMs = now - startDate;
    // Original calculation
    // return elapsedMs / (365 * 24 * 60 * 60 * 1000);
    // Testing mode calculation
    return elapsedMs / MS_PER_YEAR;
  };

  // Function to check if current user is test user
  const isTestUser = () => {
    const user = auth.currentUser;
    return user && user.uid === TEST_USER_UID;
  };

  // Function to calculate all values based on elapsed time
  const calculateAllValues = (
    startDate,
    principal,
    reinvested,
    withdrawalMapOverride = null,
    targetDate = null
  ) => {
    const withdrawalsToUse = withdrawalMapOverride || withdrawalMap;

    const now = targetDate || new Date();
    let currentBalance = principal + reinvested;
    const allWithdrawals = Object.values(withdrawalMap);

    // Sort withdrawals chronologically
    allWithdrawals.sort((a, b) => a.time - b.time);

    let lastTime = startDate;

    // Process all withdrawals in order
    for (const wd of allWithdrawals) {
      // Original calculation
      // const elapsedSinceLast = (wd.time - lastTime) / (365 * 24 * 60 * 60 * 1000);
      // Testing mode calculation
      const elapsedSinceLast = (wd.time - lastTime) / MS_PER_YEAR;

      if (elapsedSinceLast > 0) {
        currentBalance *= Math.pow(1 + ANNUAL_RATE, elapsedSinceLast);
      }

      // Ensure withdrawal doesn't exceed available balance
      const available = Math.max(0, currentBalance - (principal + reinvested));
      const withdrawable = Math.min(wd.amount, available);
      currentBalance -= withdrawable;

      lastTime = wd.time;
    }

    // Calculate final period
    // Original calculation
    // const finalElapsed = (now - lastTime) / (365 * 24 * 60 * 60 * 1000);
    // Testing mode calculation
    const finalElapsed = (now - lastTime) / MS_PER_YEAR;
    if (finalElapsed > 0) {
      currentBalance *= Math.pow(1 + ANNUAL_RATE, finalElapsed);
    }

    const totalGrowthAmount = Math.max(
      0,
      currentBalance - (principal + reinvested)
    );

    return {
      currentTotal: Math.max(principal + reinvested, currentBalance),
      totalGrowthAmount,
      // Original calculation
      // completedYears: Math.floor((now - startDate) / (365 * 24 * 60 * 60 * 1000)),
      // Testing mode calculation
      completedYears: Math.floor((now - startDate) / MS_PER_YEAR),
      elapsedDays: Math.floor(
        ((now - startDate) / (24 * 60 * 60 * 1000)) % 365
      ),
      elapsedHours: Math.floor(((now - startDate) / (60 * 60 * 1000)) % 24),
      elapsedMinutes: Math.floor(((now - startDate) / (60 * 1000)) % 60),
    };
  };

  const updateValuesInFirebase = async () => {
    if (!isTestUser() || !startDate) return;

    try {
      const principal = parseFloat(initialDeposit);
      const values = calculateAllValues(startDate, principal, reinvestedAmount);

      // Calculate total withdrawn amount from withdrawalMap
      const totalWithdrawn = Object.values(withdrawalMap).reduce(
        (sum, wd) => sum + wd.amount,
        0
      );

      // Calculate years since last reinvestment
      const now = new Date();
      const lastReinvestment = lastReinvestmentDate || startDate;
      const msSinceLastReinvestment = now - lastReinvestment;
      const yearsSinceReinvestment = msSinceLastReinvestment / MS_PER_YEAR;

      // Prepare update data
      let updateData = {
        inspireSecureInterest: values.totalGrowthAmount, // Store current growth
        inspireSecureTotalGrowth: values.totalGrowthAmount + totalWithdrawn, // Growth + withdrawals
        inspireSecureTotalMoney: values.currentTotal, // Current total value
        inspireSecureLastUpdated: new Date(),
      };

      // Handle annual reinvestment
      if (yearsSinceReinvestment >= 1) {
        // Calculate the correct balance at anniversary considering withdrawals
        const anniversaryDate = new Date(lastReinvestment);
        anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);

        // Calculate balance at anniversary considering all withdrawals
        const anniversaryValues = calculateAllValues(
          startDate,
          principal,
          reinvestedAmount,
          anniversaryDate
        );

        // The new principal should be the anniversary balance
        const newPrincipal = anniversaryValues.currentTotal;

        // Reinvest exactly the growth at anniversary
        const growthAtAnniversary = anniversaryValues.totalGrowthAmount;
        const newReinvestedAmount = reinvestedAmount + growthAtAnniversary;

        updateData = {
          ...updateData,
          inspireSecureInitialDeposit: principal,
          // inspireSecureReinvestedAmount: newReinvestedAmount,
          inspireSecureLastReinvestment: anniversaryDate,
        };

        // Update local state
        setReinvestedAmount(newReinvestedAmount);
        setLastReinvestmentDate(anniversaryDate);
        setCurrentValue(newPrincipal);
        setTotalGrowth(0);
      }

      const growthDocRef = doc(
        firestore,
        "users",
        TEST_USER_UID,
        "inspireSecureGrowth",
        TEST_GROWTH_DOC_ID
      );
      await updateDoc(growthDocRef, updateData);
    } catch (error) {
      console.error("Error updating values:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (isActive) {
        recalculateValues();
        updateValuesInFirebase();
      }
    }, [isActive, startDate, initialDeposit, reinvestedAmount, withdrawalMap])
  );

  const recalculateValues = () => {
    if (!startDate) return;

    const principal = parseFloat(initialDeposit);
    const values = calculateAllValues(startDate, principal, reinvestedAmount);

    setCurrentValue(values.currentTotal);
    setTotalGrowth(values.totalGrowthAmount);
    setYearCount(values.completedYears);
    setLastUpdatedTime(new Date());
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user && user.uid === TEST_USER_UID) {
          const growthDocRef = doc(
            firestore,
            "users",
            TEST_USER_UID,
            "inspireSecureGrowth",
            TEST_GROWTH_DOC_ID
          );
          const growthDocSnap = await getDoc(growthDocRef);

          if (growthDocSnap.exists()) {
            const growthData = growthDocSnap.data();
            console.log("Fetched growth data:", growthData); // Debug log

            if (growthData.inspireSecureInitialDeposit) {
              setInitialDeposit(
                growthData.inspireSecureInitialDeposit.toString()
              );

              if (
                growthData.inspireSecureLastReinvestment &&
                growthData.inspireSecureLastReinvestment.toDate
              ) {
                setLastReinvestmentDate(
                  growthData.inspireSecureLastReinvestment.toDate()
                );
              }

              if (
                growthData.inspireSecureStartingDate &&
                growthData.inspireSecureStartingDate.toDate &&
                growthData.inspireSecureStatus === "active"
              ) {
                const startDate = growthData.inspireSecureStartingDate.toDate();
                setStartDate(startDate);

                // Debug log for withdrawals
                console.log(
                  "Raw withdrawals data:",
                  growthData.inspireSecureWithdrawals
                );

                // Convert withdrawal timestamps with null checks
                const convertedWithdrawals = {};
                if (growthData.inspireSecureWithdrawals) {
                  Object.entries(growthData.inspireSecureWithdrawals).forEach(
                    ([key, wd]) => {
                      if (wd && wd.time && wd.time.toDate) {
                        convertedWithdrawals[key] = {
                          ...wd,
                          time: wd.time.toDate(),
                        };
                      }
                    }
                  );
                }
                console.log("Converted withdrawals:", convertedWithdrawals); // Debug log
                setWithdrawalMap(convertedWithdrawals);

                // RECALCULATE VALUES HERE
                recalculateValues();

                setIsActive(true);
              } else {
                setCurrentValue(
                  parseFloat(growthData.inspireSecureInitialDeposit)
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert(
          "Error",
          "Failed to load investment data. Please try again later."
        );
      }
    };

    fetchUserData();
  }, []);

  const formatMoney = (amount) => {
    return "₱" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status === "granted");
    })();
  }, []);

  const scheduleWithdrawalNotification = async () => {
    if (!notificationPermission) return;

    const growth = currentValue - parseFloat(initialDeposit);
    const netGrowthAfterTax = growth * (1 - TAX_RATE);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Growth Withdrawal Available!",
        body: `Your investment has grown by ₱${netGrowthAfterTax.toFixed(
          2
        )}. You can now withdraw your earnings!`,
        data: { growth: netGrowthAfterTax },
      },
      trigger: null,
    });
  };

  const handleInterestWithdrawal = async (amount) => {
    if (!isTestUser()) {
      Alert.alert(
        "Access Denied",
        "This feature is only available for test account."
      );
      return;
    }

    try {
      // Validate available growth first
      const currentValues = calculateAllValues(
        startDate,
        parseFloat(initialDeposit),
        reinvestedAmount
      );
      const availableGrowth = currentValues.totalGrowthAmount;

      if (amount > availableGrowth) {
        Alert.alert(
          "Error",
          `Cannot withdraw more than available growth: ${formatMoney(
            availableGrowth
          )}`
        );
        return;
      }

      const growthDocRef = doc(
        firestore,
        "users",
        TEST_USER_UID,
        "inspireSecureGrowth",
        TEST_GROWTH_DOC_ID
      );
      const growthDoc = await getDoc(growthDocRef);
      const currentWithdrawnNet =
        growthDoc.data()?.inspireSecureTotalWithdrawn || 0;

      const taxAmount = amount * TAX_RATE;
      const serviceFee = amount * SERVICE_FEE_RATE;
      const netAmount = amount - taxAmount - serviceFee;

      // Add withdrawal to map
      const withdrawalId = `wd_${Date.now()}`;
      const newWithdrawalMap = {
        ...withdrawalMap,
        [withdrawalId]: {
          amount: amount,
          time: new Date(),
          type: "partial",
        },
      };

      // Calculate new values AFTER updating withdrawal map
      const principal = parseFloat(initialDeposit);
      const values = calculateAllValues(
        startDate,
        principal,
        reinvestedAmount,
        newWithdrawalMap
      );

      // Calculate total withdrawn amount including the new withdrawal
      const totalWithdrawn = Object.values(newWithdrawalMap).reduce(
        (sum, wd) => sum + wd.amount,
        0
      );

      await updateDoc(growthDocRef, {
        inspireSecureWithdrawals: newWithdrawalMap,
        inspireSecureInterest: values.totalGrowthAmount,
        inspireSecureTotalGrowth: values.totalGrowthAmount + totalWithdrawn,
        inspireSecureTotalMoney: values.currentTotal,
        inspireSecureTotalWithdrawn: currentWithdrawnNet + netAmount,
        inspireSecureLastUpdated: new Date(),
      });

      // Update ALL relevant states
      setWithdrawalMap(newWithdrawalMap);
      setCurrentValue(values.currentTotal);
      setTotalGrowth(values.totalGrowthAmount);

      // FORCE UI REFRESH
      recalculateValues();

      Alert.alert(
        "Withdrawal Complete",
        `Successfully withdrawn ${formatMoney(netAmount)}\n\n` +
          `Breakdown:\n` +
          `- Gross Amount: ${formatMoney(amount)}\n` +
          `- Tax (20%): -${formatMoney(taxAmount)}\n` +
          `- Service Fee (10%): -${formatMoney(serviceFee)}\n` +
          `- Net Received: ${formatMoney(netAmount)}`
      );
    } catch (error) {
      console.error("Error processing interest withdrawal:", error);
      Alert.alert("Error", "Failed to process withdrawal. Please try again.");
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: `Inspire Secure Growth`,
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background, // This colors the default back button
      // No headerLeft needed - React Navigation provides default back button
      headerTitleStyle: { color: Colors.redTheme.background },
    });
  }, [yearCount]);

  const calculateTimeEquivalent = () => {
    if (!startDate) return { year: 0, month: 0, day: 0, hour: 0, minute: 0 };

    const now = new Date();
    const elapsedMilliseconds = now - startDate;

    const millisecondsInYear = 365 * 24 * 60 * 60 * 1000;
    const millisecondsInMonth = millisecondsInYear / 12;
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const millisecondsInHour = 60 * 60 * 1000;
    const millisecondsInMinute = 60 * 1000;

    const years = Math.floor(elapsedMilliseconds / millisecondsInYear);
    const remainingAfterYears = elapsedMilliseconds % millisecondsInYear;

    const months = Math.floor(remainingAfterYears / millisecondsInMonth);
    const remainingAfterMonths = remainingAfterYears % millisecondsInMonth;

    const days = Math.floor(remainingAfterMonths / millisecondsInDay);
    const remainingAfterDays = remainingAfterMonths % millisecondsInDay;

    const hours = Math.floor(remainingAfterDays / millisecondsInHour);
    const remainingAfterHours = remainingAfterDays % millisecondsInHour;

    const minutes = Math.floor(remainingAfterHours / millisecondsInMinute);

    return {
      year: years,
      month: months,
      day: days,
      hour: hours,
      minute: minutes,
    };
  };

  const calculateNextReinvestmentDate = () => {
    if (!startDate) return "Not started";

    const nextReinvestmentDate = new Date(startDate);
    nextReinvestmentDate.setFullYear(startDate.getFullYear() + yearCount + 1);

    return nextReinvestmentDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateCurrentYearProgress = () => {
    if (!startDate) return 0;

    const now = new Date();
    const elapsedMilliseconds = now - startDate;
    const millisecondsInYear = 365 * 24 * 60 * 60 * 1000;

    // Get the progress within the current year (0-100%)
    const progressInCurrentYear =
      (elapsedMilliseconds % millisecondsInYear) / millisecondsInYear;

    return progressInCurrentYear * 100;
  };

  const expectedFinalValue = parseFloat(initialDeposit) * (1 + ANNUAL_RATE);
  const currentGrowth = currentValue - parseFloat(initialDeposit);
  const taxAmount = currentGrowth * TAX_RATE;
  const netGrowth = currentGrowth * (1 - TAX_RATE);
  const timeEquivalent = calculateTimeEquivalent();
  const currentYearProgress = calculateCurrentYearProgress();

  const toggleSimulation = async () => {
    if (!initialDeposit || parseFloat(initialDeposit) <= 0) {
      Alert.alert("Error", "Please enter a valid initial deposit amount.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (user && user.uid === TEST_USER_UID) {
        const growthDocRef = doc(
          firestore,
          "users",
          TEST_USER_UID,
          "inspireSecureGrowth",
          TEST_GROWTH_DOC_ID
        );
        const growthDoc = await getDoc(growthDocRef);

        if (growthDoc.exists()) {
          const growthData = growthDoc.data();

          // Check if there's already an active simulation
          if (growthData.inspireSecureStatus === "active") {
            Alert.alert("Error", "You already have an active simulation.");
            return;
          }

          // Check if admin has set a starting date
          if (growthData.inspireSecureStartingDate) {
            Alert.alert(
              "Error",
              "Starting date has been set by admin. Please contact support."
            );
            return;
          }

          // Starting the simulation
          const now = new Date();
          setStartDate(now);
          setIsActive(true);

          await updateDoc(growthDocRef, {
            inspireSecureInitialDeposit: parseFloat(initialDeposit),
            inspireSecureStartingDate: now,
            inspireSecureStatus: "active",
            inspireSecureTotalGrowth: 0,
            inspireSecureTotalMoney: parseFloat(initialDeposit),
            inspireSecureWithdrawals: {},
            inspireSecureLastUpdated: now,
          });

          // Calculate initial values
          const principal = parseFloat(initialDeposit);
          const values = calculateAllValues(now, principal);
          setCurrentValue(values.currentTotal);
          setTotalGrowth(values.totalGrowthAmount);
          setYearCount(values.completedYears);
        }
      } else {
        Alert.alert(
          "Access Denied",
          "This feature is only available for test account."
        );
      }
    } catch (error) {
      console.error("Error toggling simulation:", error);
      Alert.alert("Error", "Failed to start simulation. Please try again.");
    }
  };

  const isValidWithdrawalTime = () => {
    if (!startDate) return false;

    const now = new Date();
    const elapsedMilliseconds = now - startDate;
    // Original calculation
    // const millisecondsInYear = 365 * 24 * 60 * 60 * 1000;
    // const millisecondsInMonth = millisecondsInYear / 12;
    // const elapsedMonths = elapsedMilliseconds / millisecondsInMonth;
    // Testing mode calculation
    const elapsedMonths = elapsedMilliseconds / MS_PER_MONTH;

    if (elapsedMonths >= 24) return true; // 2 years

    return elapsedMonths >= 6;
  };

  // Update the withdrawal handler
  const handleWithdrawal = async (amount = null) => {
    if (!isTestUser()) {
      Alert.alert(
        "Access Denied",
        "This feature is only available for test account."
      );
      return;
    }

    try {
      const growthDocRef = doc(
        firestore,
        "users",
        TEST_USER_UID,
        "inspireSecureGrowth",
        TEST_GROWTH_DOC_ID
      );
      const growthDoc = await getDoc(growthDocRef);
      const currentWithdrawn =
        growthDoc.data()?.inspireSecureTotalWithdrawn || 0;

      const elapsedYears = calculateElapsedYears();
      const canWithdrawAll = elapsedYears >= 2;
      const currentGrowth = currentValue - parseFloat(initialDeposit);

      if (canWithdrawAll) {
        // Full withdrawal logic
        const taxAmount = currentGrowth * TAX_RATE;
        const serviceFee = currentGrowth * SERVICE_FEE_RATE;
        const totalDeductions = taxAmount + serviceFee;
        const netGrowthAfterTaxAndFee = currentGrowth - totalDeductions;
        const totalWithdrawal =
          parseFloat(initialDeposit) + netGrowthAfterTaxAndFee;

        await updateDoc(growthDocRef, {
          inspireSecureInitialDeposit: 0,
          inspireSecureTotalGrowth: 0,
          inspireSecureTotalMoney: 0,
          inspireSecureStatus: "closed",
          inspireSecureStartingDate: null,
          inspireSecureWithdrawals: {},
          inspireSecureTotalWithdrawn: currentWithdrawn + totalWithdrawal,
          inspireSecureReinvestedAmount: 0,
          inspireSecureLastReinvestment: null,
          inspireSecureLastUpdated: new Date(),
        });

        // Reset state
        setInitialDeposit("");
        setCurrentValue(0);
        setTotalGrowth(0);
        setIsActive(false);
        setStartDate(null);
        setYearCount(0);
        setWithdrawalMap({});
        setReinvestedAmount(0);
        setLastReinvestmentDate(null);

        Alert.alert(
          "Full Withdrawal Complete",
          `Successfully withdrawn ${formatMoney(totalWithdrawal)}\n\n` +
            `Breakdown:\n` +
            `- Principal: ${formatMoney(parseFloat(initialDeposit))}\n` +
            `- Gross Growth: ${formatMoney(currentGrowth)}\n` +
            `- Tax (20%): -${formatMoney(taxAmount)}\n` +
            `- Service Fee (10%): -${formatMoney(serviceFee)}\n` +
            `- Net Received: ${formatMoney(totalWithdrawal)}`
        );
        navigation.goBack();
      } else if (isValidWithdrawalTime() && amount !== null) {
        // Partial interest withdrawal
        const taxAmount = amount * TAX_RATE;
        const serviceFee = amount * SERVICE_FEE_RATE;
        const totalDeductions = taxAmount + serviceFee;
        const netAmount = amount - totalDeductions;

        const newGrowth = currentGrowth - amount;
        const newCurrentValue = parseFloat(initialDeposit) + newGrowth;

        await updateDoc(growthDocRef, {
          inspireSecureInterest: newGrowth,
          inspireSecureTotalMoney: newCurrentValue,
          inspireSecureTotalWithdrawn: currentWithdrawn + netAmount,
          inspireSecureLastUpdated: new Date(),
        });

        // Update state
        setCurrentValue(newCurrentValue);
        setTotalGrowth(totalGrowth - (currentGrowth - newGrowth));

        Alert.alert(
          "Withdrawal Complete",
          `Successfully withdrawn ${formatMoney(netAmount)}\n\n` +
            `Breakdown:\n` +
            `- Gross Amount: ${formatMoney(amount)}\n` +
            `- Tax (20%): -${formatMoney(taxAmount)}\n` +
            `- Service Fee (10%): -${formatMoney(serviceFee)}\n` +
            `- Net Received: ${formatMoney(netAmount)}`
        );
      } else {
        // Early withdrawal (forfeit growth)
        const depositAmount = parseFloat(initialDeposit);
        await updateDoc(growthDocRef, {
          inspireSecureInitialDeposit: 0,
          inspireSecureTotalGrowth: 0,
          inspireSecureTotalMoney: 0,
          inspireSecureStatus: "closed",
          inspireSecureStartingDate: null,
          inspireSecureWithdrawals: {},
          inspireSecureTotalWithdrawn: currentWithdrawn + depositAmount,
          inspireSecureReinvestedAmount: 0,
          inspireSecureLastReinvestment: null,
          inspireSecureLastUpdated: new Date(),
        });

        // Reset state
        setInitialDeposit("");
        setCurrentValue(0);
        setTotalGrowth(0);
        setIsActive(false);
        setStartDate(null);
        setYearCount(0);
        setWithdrawalMap({});
        setReinvestedAmount(0);
        setLastReinvestmentDate(null);

        Alert.alert(
          "Early Withdrawal Complete",
          `Withdrawn initial deposit of ₱${depositAmount.toFixed(2)}`
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      Alert.alert("Error", "Failed to process withdrawal. Please try again.");
    }
  };

  const startSimulation = async () => {
    setSimulationModalVisible(false);
    setLoading(true);
    await toggleSimulation();
    setLoading(false);
  };

  // Update the withdrawal button logic
  const renderWithdrawalButton = () => {
    if (!isActive) return null;

    const elapsedYears = calculateElapsedYears();
    const canWithdrawAll = elapsedYears >= 2;
    const canWithdrawInterest = isValidWithdrawalTime();

    if (canWithdrawAll) {
      return (
        <TouchableWithoutFeedback
          onPress={() => setWithdrawModalVisible(true)}
          disabled={loading}
        >
          <View style={[styles.button, styles.fullWithdrawButton]}>
            <Text style={styles.buttonText}>Withdraw All</Text>
          </View>
        </TouchableWithoutFeedback>
      );
    } else if (canWithdrawInterest) {
      return (
        <TouchableWithoutFeedback
          onPress={() => setShowWithdrawAmountModal(true)}
          disabled={loading}
        >
          <View style={[styles.button, styles.safeWithdrawButton]}>
            <Text style={styles.buttonText}>Withdraw Interest</Text>
          </View>
        </TouchableWithoutFeedback>
      );
    } else {
      return (
        <TouchableWithoutFeedback
          onPress={() => setWithdrawModalVisible(true)}
          disabled={loading}
        >
          <View style={[styles.button, styles.earlyWithdrawButton]}>
            <Text style={styles.buttonText}>Withdraw</Text>
          </View>
        </TouchableWithoutFeedback>
      );
    }
  };

  const validateWithdrawalAmount = (amount) => {
    // Convert to string to check for invalid patterns
    const amountStr = String(amount);

    // Check for empty/undefined
    if (!amountStr || amountStr.trim() === "") {
      return { valid: false, message: "Please enter an amount" };
    }

    // Check for non-numeric characters (allow decimal point)
    if (!/^[0-9]*\.?[0-9]*$/.test(amountStr)) {
      return { valid: false, message: "Please enter a valid number" };
    }

    // Convert to number
    const amountNum = parseFloat(amountStr);

    // Check if conversion failed
    if (isNaN(amountNum)) {
      return { valid: false, message: "Invalid amount" };
    }

    // Check minimum amount (1,000)
    if (amountNum < 1000) {
      return { valid: false, message: "Minimum withdrawal is ₱1,000" };
    }

    // Check against available growth
    if (amountNum > currentGrowth) {
      return {
        valid: false,
        message: `Cannot withdraw more than ${formatMoney(currentGrowth)}`,
      };
    }

    return { valid: true, amount: amountNum };
  };

  // Update the button rendering logic
  const renderStartButton = () => {
    if (!isActive) {
      return (
        <TouchableWithoutFeedback
          onPress={() => setSimulationModalVisible(true)}
          disabled={loading}
        >
          <View style={[styles.button, styles.startButton]}>
            <Text style={styles.buttonText}>Invest</Text>
          </View>
        </TouchableWithoutFeedback>
      );
    } else {
      return (
        <View style={[styles.button, styles.disabledButton]}>
          <Text style={[styles.buttonText, styles.disabledText]}>Active</Text>
        </View>
      );
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await updateValuesInFirebase();
      recalculateValues();
    } catch (error) {
      console.error("Error refreshing values:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const showInfoModal = (type) => {
    setSelectedInfo(type);
    setInfoModalVisible(true);
  };

  const getInfoContent = () => {
    switch (selectedInfo) {
      case "growth":
        return {
          title: "Growth Information",
          content: `• Annual Interest Rate: 14%\n• Growth compounds continuously\n• Tax (20%) and Service Fee (10%) apply on withdrawals\n• Safe withdrawals available every 6 months\n• Full withdrawal available after 2 years`,
        };
      case "test":
        return {
          title: "Test Mode Information",
          content: `• 12 minutes = 1 year in test mode\n• 1 minute = 1 month\n• Withdrawals available every 30 seconds (6 months)\n• Full withdrawal after 24 minutes (2 years)\n• All calculations remain the same`,
        };
      case "withdrawal":
        return {
          title: "Withdrawal Rules",
          content: `• Interest withdrawals available every 6 months\n• Minimum withdrawal: ₱1,000\n• Tax (20%) and Service Fee (10%) apply\n• Early withdrawals forfeit growth\n• Full withdrawal available after 2 years`,
        };
      default:
        return { title: "", content: "" };
    }
  };

  useEffect(() => {
    setShowInitialLoading(true);
    const timer = setTimeout(() => {
      setShowInitialLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showInitialLoading) {
    return <SimpleLoadingScreen message="Loading test page..." />;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.redTheme.background]}
                tintColor={Colors.redTheme.background}
                title="Pull to refresh"
                titleColor={Colors.redTheme.background}
              />
            }
          >
            <View style={styles.content}>
              {TEST_MODE && (
                <TouchableOpacity
                  style={styles.testModeBanner}
                  onPress={() => showInfoModal("test")}
                >
                  us
                  <Ionicons name="information-circle" size={20} color="white" />
                  <Text style={styles.testModeText}>
                    Test Mode Active (12min = 1yr)
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Initial Deposit:</Text>
                  <TouchableOpacity onPress={() => showInfoModal("growth")}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={Colors.redTheme.background}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.input}>
                  {(() => {
                    const deposit = parseFloat(initialDeposit);
                    return isNaN(deposit) || deposit === 0
                      ? "Set By Admin"
                      : formatMoney(deposit);
                  })()}
                </Text>
              </View>

              {startDate && (
                <View style={styles.timeEquivalentContainer}>
                  <Text style={styles.timeEquivalentTitle}>Time:</Text>
                  <View style={styles.timeEquivalentContent}>
                    <View style={styles.timeEquivalentItem}>
                      <Text style={styles.timeEquivalentValue}>
                        {timeEquivalent.year}
                      </Text>
                      <Text style={styles.timeEquivalentLabel}>Years</Text>
                    </View>
                    <View style={styles.timeEquivalentItem}>
                      <Text style={styles.timeEquivalentValue}>
                        {timeEquivalent.month}
                      </Text>
                      <Text style={styles.timeEquivalentLabel}>Months</Text>
                    </View>
                    <View style={styles.timeEquivalentItem}>
                      <Text style={styles.timeEquivalentValue}>
                        {timeEquivalent.day}
                      </Text>
                      <Text style={styles.timeEquivalentLabel}>Days</Text>
                    </View>
                    <View style={styles.timeEquivalentItem}>
                      <Text style={styles.timeEquivalentValue}>
                        {timeEquivalent.hour}
                      </Text>
                      <Text style={styles.timeEquivalentLabel}>Hours</Text>
                    </View>
                    <View style={styles.timeEquivalentItem}>
                      <Text style={styles.timeEquivalentValue}>
                        {timeEquivalent.minute}
                      </Text>
                      <Text style={styles.timeEquivalentLabel}>Minutes</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.totalGrowthContainer}>
                <Text style={styles.label}>Current Accumulated Growth:</Text>
                <View style={styles.totalGrowthBox}>
                  <Text style={styles.totalGrowthAmount}>
                    {formatMoney(totalGrowth)}
                  </Text>
                  <Text style={styles.totalGrowthLabel}></Text>
                </View>
              </View>

              <View style={styles.displayContainer}>
                <Text style={styles.displayLabel}>Current Money:</Text>
                <Text style={styles.displayValue}>
                  {formatMoney(currentValue)}
                </Text>

                {startDate && (
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>
                      Year {yearCount + 1} Progress:{" "}
                      {currentYearProgress.toFixed(1)}%
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${currentYearProgress}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {lastUpdatedTime && (
                  <Text style={styles.lastUpdatedText}>
                    Last updated: {lastUpdatedTime.toLocaleTimeString()}
                  </Text>
                )}
              </View>

              <View style={styles.buttonContainer}>
                {renderStartButton()}
                {renderWithdrawalButton()}
              </View>

              {/* Withdrawal History Section */}
              {Object.keys(withdrawalMap).length > 0 && (
                <View style={styles.withdrawalHistorySection}>
                  <TouchableOpacity
                    style={styles.withdrawalHistoryHeader}
                    onPress={() =>
                      setShowWithdrawalHistory(!showWithdrawalHistory)
                    }
                  >
                    <Text style={styles.withdrawalHistoryTitle}>
                      Withdrawal History
                    </Text>
                    <Ionicons
                      name={
                        showWithdrawalHistory ? "chevron-up" : "chevron-down"
                      }
                      size={24}
                      color={Colors.redTheme.background}
                    />
                  </TouchableOpacity>

                  {showWithdrawalHistory && (
                    <View style={styles.withdrawalHistoryContainer}>
                      <ScrollView
                        style={styles.withdrawalHistoryScroll}
                        contentContainerStyle={
                          styles.withdrawalHistoryScrollContent
                        }
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {Object.entries(withdrawalMap)
                          .sort((a, b) => b[1].time - a[1].time)
                          .map(([key, withdrawal]) => (
                            <View
                              key={key}
                              style={styles.withdrawalHistoryItem}
                            >
                              <View style={styles.withdrawalHistoryItemHeader}>
                                <Text style={styles.withdrawalHistoryDate}>
                                  {withdrawal.time.toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </Text>
                                <Text style={styles.withdrawalHistoryType}>
                                  {withdrawal.type === "partial"
                                    ? "Partial Withdrawal"
                                    : "Full Withdrawal"}
                                </Text>
                              </View>
                              <View style={styles.withdrawalHistoryDetails}>
                                <Text style={styles.withdrawalHistoryAmount}>
                                  {formatMoney(withdrawal.amount)}
                                </Text>
                                <Text style={styles.withdrawalHistoryTax}>
                                  Tax (20%): -
                                  {formatMoney(withdrawal.amount * TAX_RATE)}
                                </Text>
                                <Text style={styles.withdrawalHistoryFee}>
                                  Fee (10%): -
                                  {formatMoney(
                                    withdrawal.amount * SERVICE_FEE_RATE
                                  )}
                                </Text>
                                <Text style={styles.withdrawalHistoryNet}>
                                  Net:{" "}
                                  {formatMoney(
                                    withdrawal.amount *
                                      (1 - TAX_RATE - SERVICE_FEE_RATE)
                                  )}
                                </Text>
                              </View>
                            </View>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Withdrawal Amount Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showWithdrawAmountModal}
          onRequestClose={() => setShowWithdrawAmountModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Withdraw Interest</Text>
              <Text style={styles.modalText}>
                Available interest (before deductions):{" "}
                {formatMoney(currentGrowth)}
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.amountInput, { flex: 1 }]}
                  placeholder="Enter amount "
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={(text) => {
                    const sanitized = text
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1");
                    setWithdrawAmount(sanitized);
                  }}
                />
                <TouchableOpacity
                  style={styles.withdrawAllButton}
                  onPress={() => {
                    setWithdrawAmount(currentGrowth.toString());
                  }}
                >
                  <Text style={styles.withdrawAllButtonText}>All</Text>
                </TouchableOpacity>
              </View>

              {withdrawAmount && (
                <View style={styles.taxBreakdown}>
                  <Text style={styles.taxText}>
                    Withdrawal Amount:{" "}
                    {formatMoney(parseFloat(withdrawAmount) || 0)}
                  </Text>
                  <Text style={styles.taxText}>
                    Tax (20%): -
                    {formatMoney((parseFloat(withdrawAmount) || 0) * TAX_RATE)}
                  </Text>
                  <Text style={styles.taxText}>
                    Service Fee (10%): -
                    {formatMoney(
                      (parseFloat(withdrawAmount) || 0) * SERVICE_FEE_RATE
                    )}
                  </Text>
                  <Text style={[styles.taxText, styles.netAmountText]}>
                    Net Amount:{" "}
                    {formatMoney(
                      (parseFloat(withdrawAmount) || 0) *
                        (1 - TAX_RATE - SERVICE_FEE_RATE)
                    )}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setWithdrawAmount("");
                    setShowWithdrawAmountModal(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={async () => {
                    const validation = validateWithdrawalAmount(withdrawAmount);
                    if (!validation.valid) {
                      Alert.alert("Invalid Amount", validation.message);
                      return;
                    }

                    const amount = validation.amount;
                    const taxAmount = amount * TAX_RATE;
                    const serviceFee = amount * SERVICE_FEE_RATE;
                    const netAmount = amount - taxAmount - serviceFee;

                    Alert.alert(
                      "Confirm Withdrawal",
                      `You are about to withdraw:\n\n` +
                        `Gross: ${formatMoney(amount)}\n` +
                        `Tax (20%): -${formatMoney(taxAmount)}\n` +
                        `Service Fee (10%): -${formatMoney(serviceFee)}\n\n` +
                        `Net Amount: ${formatMoney(netAmount)}`,
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: "Confirm",
                          onPress: async () => {
                            setLoading(true);
                            await handleInterestWithdrawal(amount);
                            setLoading(false);
                            setWithdrawAmount("");
                            setShowWithdrawAmountModal(false);
                          },
                        },
                      ]
                    );
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Withdrawal Confirmation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={withdrawModalVisible}
          onRequestClose={() => setWithdrawModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {calculateElapsedYears() >= 2
                  ? "Confirm Full Withdrawal"
                  : "Early Withdrawal Warning"}
              </Text>

              {calculateElapsedYears() >= 2 ? (
                <Text style={styles.modalText}>
                  Withdraw your full balance of {formatMoney(currentValue)}?
                  This includes your initial deposit and all growth.
                </Text>
              ) : (
                <Text style={styles.modalText}>
                  Withdrawing now will result in losing all interest. Only your
                  initial deposit will be returned.
                </Text>
              )}

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setWithdrawModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={async () => {
                    setLoading(true);
                    await handleWithdrawal();
                    setLoading(false);
                    setWithdrawModalVisible(false);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      {calculateElapsedYears() >= 2
                        ? "Withdraw All"
                        : "Withdraw Anyway"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Simulation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={simulationModalVisible}
          onRequestClose={() => setSimulationModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Start Investing</Text>
              <Text style={styles.modalText}>
                Begin compounding with initial deposit of{" "}
                {isNaN(parseFloat(initialDeposit))
                  ? formatMoney(0)
                  : formatMoney(parseFloat(initialDeposit))}
                ? This will start your long-term compound interest growth.
              </Text>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setSimulationModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={startSimulation}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Start</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Info Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={infoModalVisible}
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{getInfoContent().title}</Text>
              <Text style={styles.modalText}>{getInfoContent().content}</Text>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator
              size="large"
              color={Colors.redTheme.background}
            />
          </View>
        )}
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  amountInput: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginVertical: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    color: Colors.redTheme.background,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 25,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
    fontSize: 16,
  },
  breakdownContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  netGrowthRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
    paddingTop: 12,
  },
  displayContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  displayLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
    textAlign: "center",
  },
  displayValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  timeEquivalentContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeEquivalentTitle: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  timeEquivalentContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeEquivalentItem: {
    alignItems: "center",
    flex: 1,
  },
  timeEquivalentValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  timeEquivalentLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  statBox: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignContent: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    width: "48%",
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#fc0d30",
  },
  disabledButton: {
    backgroundColor: "#f5b0b0",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledText: {
    color: "#888888",
  },
  historyContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
  },
  historyContent: {
    marginTop: 10,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  historyCycle: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 5,
  },
  historyDetails: {
    marginLeft: 10,
  },
  historyText: {
    fontSize: 13,
    color: "#333",
    marginBottom: 2,
  },
  earlyWithdrawButton: {
    backgroundColor: "#FF6B6B",
  },
  safeWithdrawButton: {
    backgroundColor: "#4CAF50",
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ccc",
    color: "#666",
  },
  inputNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 5,
    textAlign: "center",
  },
  fullWithdrawContainer: {
    marginBottom: 20,
  },
  fullWithdrawButton: {
    backgroundColor: "#0D9E19",
  },
  totalGrowthContainer: {
    marginBottom: 25,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  totalGrowthBox: {
    alignItems: "center",
    paddingVertical: 10,
  },
  totalGrowthAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff243d",
    marginBottom: 5,
  },
  totalGrowthLabel: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  refreshButton: {
    marginLeft: 10,
    padding: 5,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    textAlign: "center",
  },
  progressBar: {
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: Colors.redTheme.background,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    padding: 12,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  confirmButton: {
    backgroundColor: Colors.redTheme.background,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  placeholder: {
    fontSize: 16,
    color: "#888",
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginTop: 5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  pasteButton: {
    padding: 10,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 5,
    marginLeft: 10,
  },
  pasteButtonText: {
    color: "white",
    fontSize: 14,
  },
  taxBreakdown: {
    width: "100%",
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  taxText: {
    fontSize: 14,
    marginVertical: 2,
  },
  netAmountText: {
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginTop: 5,
  },
  withdrawAllButton: {
    padding: 10,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 5,
    marginLeft: 10,
    minWidth: 50,
    alignItems: "center",
  },
  withdrawAllButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  withdrawalHistorySection: {
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  withdrawalHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  withdrawalHistoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  withdrawalHistoryContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    height: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  withdrawalHistoryScroll: {
    flex: 1,
  },
  withdrawalHistoryScrollContent: {
    padding: 15,
    paddingBottom: 20,
  },
  withdrawalHistoryItem: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.redTheme.background,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  withdrawalHistoryItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  withdrawalHistoryDate: {
    fontSize: 14,
    color: "#666",
  },
  withdrawalHistoryType: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  withdrawalHistoryDetails: {
    marginTop: 5,
  },
  withdrawalHistoryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  withdrawalHistoryTax: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  withdrawalHistoryFee: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  withdrawalHistoryNet: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginTop: 4,
  },
  testModeBanner: {
    backgroundColor: Colors.redTheme.background,
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  testModeText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "bold",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    padding: 10,
  },
});
