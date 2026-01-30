import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  Alert,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  AppState,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { Animated } from "react-native";
import { useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  collection,
  getDocs,
  updateDoc,
  getDoc,
  increment,
  query,
  where,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import axios from "axios";
import { registerIndieID } from "native-notify";
import AsyncStorage from "@react-native-async-storage/async-storage";
import rates from "../../assets/data/investmentRates.json";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import InvestmentAuto from "../../components/InvestmentAuto";
import InspCard from "../../components/InspireCards";
import MainNavBar from "../../components/MainNavBar";
import DepoWithdrawButton from "../../components/depoWithdrawButton";
import NewSectionCarousel from "../../components/NewSectionCarousel";
import HeaderGN from "../../components/HeaderGN";
import AmountContent from "../../components/AmountContent";
import TransacHistory from "../../components/TransacHistory";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import presenceService from "../../services/presenceService";
import { Ionicons } from "@expo/vector-icons";
import EventPopup from "../../components/EventPopup";

const width = Dimensions.get("window").width;

// Update cycle constants for semi-annual periods
const CYCLES_PER_YEAR = 2; // Semi-annual cycles (every 6 months)
const TOTAL_CYCLES = 4; // 2 years = 4 semi-annual cycles

const calculateCompletedCycles = (startDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.floor(monthsElapsed / 6); // Convert months to semi-annual periods
};

const calculateCycleEarnings = (principal, annualRate, cycles) => {
  // Calculate gross earnings
  const grossEarnings = principal * (annualRate / 100);
  // Apply 20% tax deduction
  const netEarnings = grossEarnings * 0.8;
  // Return earnings for the number of cycles
  return netEarnings * cycles;
};

// Calculate earnings for a single cycle
const calculateSingleCycleEarnings = (principal, annualRate) => {
  // Calculate gross earnings
  const grossEarnings = principal * (annualRate / 100);
  // Apply 20% tax deduction
  return grossEarnings * 0.8;
};

// Add a new function to calculate total expected earnings
const calculateTotalExpectedEarnings = (principal, annualRate) => {
  // For a full 2-year term (4 cycles), calculate total earnings
  return calculateCycleEarnings(principal, annualRate, TOTAL_CYCLES);
};

// Add helper function to calculate elapsed months
const calculateElapsedMonths = (startDate, currentDate) => {
  const start = new Date(startDate);
  const current = new Date(currentDate);
  return (
    (current.getFullYear() - start.getFullYear()) * 12 +
    (current.getMonth() - start.getMonth())
  );
};

// Add helper function to calculate cycle based on elapsed months
const calculateCycle = (elapsedMonths) => {
  if (elapsedMonths < 6) return 0; // First 6 months
  if (elapsedMonths < 12) return 1; // Second 6 months
  if (elapsedMonths < 18) return 2; // Third 6 months
  if (elapsedMonths < 24) return 3; // Fourth 6 months
  return 4; // Completed all cycles (2 years)
};

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [timeDepositTotal, setTimeDepositTotal] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [predictedEarnings, setPredictedEarnings] = useState(0);
  const [activeCardId, setActiveCardId] = useState("default");
  const [isInvestmentExpanded, setIsInvestmentExpanded] = useState(false);
  const [transactionTrigger, setTransactionTrigger] = useState(0); // Trigger for real-time transaction updates
  const [userLanguage, setUserLanguage] = useState("english");
  const investmentAutoRef = useRef(null);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [hasNewSupportMessage, setHasNewSupportMessage] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);

  // Animation refs for language modal
  const languageModalFadeAnim = useRef(new Animated.Value(0)).current;
  const languageModalScaleAnim = useRef(new Animated.Value(0.7)).current;

  // Language options (matching the personal page)
  const languageOptions = ["English", "Japanese", "Saudi Arabia", "Korea"];

  // Animation effect for language modal
  useEffect(() => {
    if (showLanguageModal) {
      Animated.parallel([
        Animated.timing(languageModalFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(languageModalScaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(languageModalFadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(languageModalScaleAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLanguageModal]);

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      if (!currentUser) return;
      const userDocRef = doc(firestore, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserLanguage(userData.preferredLanguage || "english");
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  // Function to handle language selection
  const handleLanguageSelection = async () => {
    try {
      setIsUpdatingLanguage(true);
      if (!currentUser) return;

      // Convert display language to lowercase for storage
      const languageMap = {
        English: "English",
        Japanese: "Japanese",
        "Saudi Arabia": "Saudi Arabia",
        Korea: "Korean",
      };

      const languageValue = languageMap[selectedLanguage] || "english";

      const userRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userRef, {
        preferredLanguage: languageValue,
      });

      setUserLanguage(languageValue);
      setShowLanguageModal(false);

      // Add a slight delay for iOS to ensure the language modal is fully closed before showing success modal
      setTimeout(
        () => {
          showModal({
            title: "Success",
            message: "Language preference has been set successfully!",
            type: "success",
            showCloseButton: true,
            confirmText: "OK",
          });
        },
        Platform.OS === "ios" ? 500 : 0
      );
    } catch (error) {
      console.error("Error updating language preference:", error);
      showModal({
        title: "Error",
        message: "Failed to update language preference. Please try again.",
        type: "error",
        showCloseButton: true,
        confirmText: "OK",
      });
    } finally {
      setIsUpdatingLanguage(false);
    }
  };
  // Comment out event popup related states
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [hasActiveEvents, setHasActiveEvents] = useState(false);
  const [popupShown, setPopupShown] = useState(false);
  const [sessionId] = useState(Date.now().toString());

  // Note: Notification registration is handled in the login flow
  // No need to register again here to prevent duplicate notifications

  // Real-time data monitoring and debugging
  useEffect(() => {
    // console.log("📊 Real-time data update:", {
    //   timeDepositTotal,
    //   availableBalance,
    //   predictedEarnings,
    //   activeCardId,
    //   userDataExists: Object.keys(data).length > 0,
    //   timestamp: new Date().toISOString(),
    // });
  }, [
    timeDepositTotal,
    availableBalance,
    predictedEarnings,
    activeCardId,
    data,
  ]);

  const [data, setUserData] = useState({}); // State to hold user data
  const [authInitialized, setAuthInitialized] = useState(false); // Track if auth state has been determined
  const [currentUser, setCurrentUser] = useState(null); // Store current user from auth state

  // Authentication state monitoring - wait for auth to be ready
  useEffect(() => {
    let redirectTimer = null;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
      
      // Clear any pending redirect timer
      if (redirectTimer) {
        clearTimeout(redirectTimer);
        redirectTimer = null;
      }
      
      if (!user) {
        // User is not authenticated - wait a bit to allow Firebase to restore state
        // This prevents false negatives when app resumes
        redirectTimer = setTimeout(() => {
          // Double-check after delay - Firebase might restore auth state
          if (!auth.currentUser) {
            console.log("🔐 User not authenticated after delay, redirecting to login");
            router.replace("/");
          }
        }, 1000); // 1 second delay to allow auth restoration on app resume
      } else {
        console.log("✅ User authenticated:", user.uid);
      }
    });

    return () => {
      unsubscribe();
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [router]);

  // App state monitoring for presence
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        // App came to foreground
        presenceService.updateLastSeen();
      } else if (nextAppState === "background") {
        // App went to background
        presenceService.updateLastSeen();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // Comment out events related useEffect

  useEffect(() => {
    // Wait for auth to be initialized before accessing user
    if (!authInitialized || !currentUser) return;

    const eventsRef = collection(firestore, "events");
    const activeEventsQuery = query(eventsRef, where("status", "==", true));

    const unsubscribe = onSnapshot(activeEventsQuery, async (snapshot) => {
      const hasEvents = !snapshot.empty;
      setHasActiveEvents(hasEvents);

      // Only show popup if there are active events, user data is loaded, and popup hasn't been shown yet in this session
      if (hasEvents && Object.keys(data).length > 0 && !popupShown) {
        const popupKey = `eventPopupShown_${currentUser.uid}_${sessionId}`;
        const hasShownPopup = await AsyncStorage.getItem(popupKey);
        if (!hasShownPopup) {
          setShowEventPopup(true);
          setPopupShown(true);
          await AsyncStorage.setItem(popupKey, "true");
        }
      }
    });

    return () => unsubscribe();
  }, [data, popupShown, authInitialized, currentUser]);

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    if (!authInitialized || !currentUser) return;

    fetchUserLanguage();

    // Set up real-time listener for language changes
    const userRef = doc(firestore, "users", currentUser.uid);
    const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newLanguage = userData.preferredLanguage || "english";
        setUserLanguage((prevLanguage) => {
          // Only update if the language actually changed
          if (prevLanguage !== newLanguage) {
            console.log(
              `Language changed from ${prevLanguage} to ${newLanguage}`
            );
            return newLanguage;
          }
          return prevLanguage;
        });
      }
    });

    return () => unsubscribeLanguage();
  }, [authInitialized, currentUser]); // Wait for auth to be ready

  // Fetch user data on component mount with real-time updates
  useEffect(() => {
    // Wait for auth to be initialized
    if (!authInitialized || !currentUser) return;

    // User is authenticated, proceed with setup
    try {
        AsyncStorage.setItem("userid", currentUser.uid);
        const userRef = doc(firestore, "users", currentUser.uid);
        const unsubscribe = onSnapshot(
          userRef,
          (userDoc) => {
            try {
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserData(userData); // Update state with user data

                // Check if preferredLanguage field is missing and show language selection modal
                if (!userData.preferredLanguage && !showLanguageModal) {
                  // Add a small delay to ensure the component is fully loaded
                  setTimeout(() => {
                    setShowLanguageModal(true);
                  }, 1000);
                }

                // Real-time sync of available balance from user document
                if (userData.availBalanceAmount !== undefined) {
                  setAvailableBalance(userData.availBalanceAmount);
                  // console.log(
                  //   "🔄 Real-time available balance update:",
                  //   userData.availBalanceAmount
                  // );
                }

                // Real-time sync of time deposit amount from user document
                if (userData.timeDepositAmount !== undefined) {
                  setTimeDepositTotal(userData.timeDepositAmount);
                  // console.log(
                  //   "🔄 Real-time time deposit update:",
                  //   userData.timeDepositAmount
                  // );
                }

                // Real-time sync of predicted earnings from user document
                if (userData.walletAmount !== undefined) {
                  setPredictedEarnings(userData.walletAmount);
                  // console.log(
                  //   "🔄 Real-time predicted earnings update:",
                  //   userData.walletAmount
                  // );
                }
              } else {
                // Show modal first, then delete account when user confirms
                showModal({
                  title: t(userLanguage, "mainDashboard.accountDeletion.title"),
                  message: t(userLanguage, "mainDashboard.accountDeletion.message"),
                  type: "warning",
                  showCloseButton: true,
                  showCancelButton: false,
                  confirmText: t(
                    userLanguage,
                    "mainDashboard.accountDeletion.confirmText"
                  ),
                  onConfirm: async () => {
                    try {
                  // Delete the user account from Firebase Authentication
                  await deleteUser(currentUser);

                      // Navigate immediately after successful deletion
                      try {
                        router.push("/register");
                      } catch (navigationError) {
                        console.error("Navigation error:", navigationError);
                        // Fallback: try to navigate using navigation prop
                        if (navigation && navigation.navigate) {
                          navigation.navigate("register");
                        }
                      }
                    } catch (error) {
                      console.error("Error deleting user account:", error);
                      showModal({
                        title: "Error",
                        message: t(
                          userLanguage,
                          "mainDashboard.errors.failedToDeleteAccount"
                        ),
                        type: "error",
                        showCloseButton: true,
                        showCancelButton: false,
                        confirmText: "OK",
                      });
                    }
                  },
                });
              }
            } catch (error) {
              console.error("Error processing user document:", error);
            }
          },
          (error) => {
            console.error("Error in user document snapshot:", error);
            showModal({
              title: "Error",
              message: error.message || "Failed to load user data",
              type: "error",
            });
          }
        );

        // Fetch active card from purchased cards subcollection
        const fetchActiveCard = async () => {
          try {
            const purchasedCardsRef = collection(
              firestore,
              "users",
              currentUser.uid,
              "purchasedCards"
            );
            const purchasedCardsSnap = await getDocs(purchasedCardsRef);

            // Find the active card
            let activeCard = null;
            purchasedCardsSnap.forEach((doc) => {
              const cardData = doc.data();
              if (cardData.isActive) {
                activeCard = cardData;
              }
            });

            if (activeCard) {
              setActiveCardId(activeCard.purchaseCardsId);
              // console.log("🎯 Active card found:", activeCard.purchaseCardsId);
            } else {
              // Default to "default" if no active card found
              setActiveCardId("default");
              // console.log("⚠️ No active card found, using default");
            }
          } catch (error) {
            console.error("❌ Error fetching active card:", error);
            setActiveCardId("default"); // Fallback to default
          }
        };

        fetchActiveCard();

        // Set up real-time listener for active card changes
        const purchasedCardsRef = collection(
          firestore,
          "users",
          currentUser.uid,
          "purchasedCards"
        );
        const unsubscribeCards = onSnapshot(
          purchasedCardsRef,
          (purchasedCardsSnap) => {
            try {
              // Find the active card in real-time
              let activeCard = null;
              purchasedCardsSnap.forEach((doc) => {
                const cardData = doc.data();
                if (cardData.isActive) {
                  activeCard = cardData;
                }
              });

              if (activeCard) {
                setActiveCardId(activeCard.purchaseCardsId);
                // console.log(
                //   "🔄 Active card updated in real-time:",
                //   activeCard.purchaseCardsId
                // );
              } else {
                setActiveCardId("default");
              }
            } catch (error) {
              console.error("❌ Error processing card changes:", error);
            }
          },
          (error) => {
            console.error("❌ Error listening to card changes:", error);
          }
        );

        // Set up real-time listener for transactions
        const transactionsRef = collection(
          firestore,
          "users",
          currentUser.uid,
          "transactions"
        );
        const unsubscribeTransactions = onSnapshot(
          transactionsRef,
          (transactionsSnap) => {
            // Trigger re-render of transaction history component
            setTransactionTrigger((prev) => prev + 1);
            // console.log(
            //   "🔄 Transactions updated in real-time, count:",
            //   transactionsSnap.docs.length
            // );
          },
          (error) => {
            console.error("❌ Error listening to transaction changes:", error);
          }
        );

        return () => {
          unsubscribe();
          unsubscribeCards();
          unsubscribeTransactions();
        };
      } catch (error) {
        console.error("Error setting up user listeners:", error);
      }
  }, [authInitialized, currentUser]);

  // Real-time listener for new support messages (helpcenter tickets)
  useEffect(() => {
    if (!authInitialized || !currentUser) return;

    const ticketsRef = collection(firestore, "users", currentUser.uid, "tickets");
    const unsubscribe = onSnapshot(ticketsRef, async (snapshot) => {
      const lastVisitStr = await AsyncStorage.getItem("lastHelpCenterVisit");
      const lastVisit = lastVisitStr ? new Date(lastVisitStr) : new Date(0);
      let foundNew = false;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.messages && Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            if (
              !msg.isCustomer &&
              new Date(msg.timestamp?.toDate?.() || msg.timestamp) > lastVisit
            ) {
              foundNew = true;
              break;
            }
          }
        }
      });
      setHasNewSupportMessage(foundNew);
    });
    return () => unsubscribe();
  }, [authInitialized, currentUser]);

  // Helper functions from investmentauto
  const calculateTotalEarnings = (principal, twoYearRate) => {
    const rateDecimal = twoYearRate / 100;
    const grossEarnings = principal * rateDecimal; // Total earnings over 2 years
    const tax = grossEarnings * 0.2; // 20% tax
    return grossEarnings - tax; // Return net earnings after tax
  };

  const getInterestRate = (investAmount) => {
    const rateTable = rates.twoYears;
    const rateKeys = Object.keys(rateTable)
      .map(Number)
      .sort((a, b) => a - b);

    if (investAmount <= rateKeys[0]) return rateTable[rateKeys[0]];
    if (investAmount >= rateKeys[rateKeys.length - 1])
      return rateTable[rateKeys[rateKeys.length - 1]];

    let lowerAmount = rateKeys[0];
    let upperAmount = rateKeys[rateKeys.length - 1];

    for (let i = 0; i < rateKeys.length - 1; i++) {
      if (investAmount >= rateKeys[i] && investAmount <= rateKeys[i + 1]) {
        lowerAmount = rateKeys[i];
        upperAmount = rateKeys[i + 1];
        break;
      }
    }

    const lowerRate = rateTable[lowerAmount];
    const upperRate = rateTable[upperAmount];

    return (
      lowerRate +
      ((investAmount - lowerAmount) / (upperAmount - lowerAmount)) *
        (upperRate - lowerRate)
    );
  };

  const calculateRemainingMonths = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const elapsedMonths =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    return Math.max(0, 24 - elapsedMonths); // 24 months total (2 years)
  };

  // Add new useEffect for real-time investment profiles monitoring
  useEffect(() => {
    if (!authInitialized || !currentUser) return;

    const investmentProfilesRef = collection(
      firestore,
      "users",
      currentUser.uid,
      "investmentProfiles"
    );

    const inspireAutoRef = collection(
      firestore,
      "users",
      currentUser.uid,
      "inspireAuto"
    );

    // Set up real-time listener for investment profiles
    const unsubscribeProfiles = onSnapshot(
      investmentProfilesRef,
      async (investmentProfilesSnap) => {
        try {
          let totalExpectedEarnings = 0;

          // Get the current user's document
          const userRef = doc(firestore, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();

          // Initialize available balance from stored value
          let currentAvailBalance = userData?.availBalanceAmount || 0;
          // console.log("Initial available balance:", currentAvailBalance);

          // Track if we need to update the available balance
          let shouldUpdateBalance = false;
          let completedDepositsToProcess = [];
          let cycleUpdatesToProcess = [];

          const now = new Date();

          // Process investment profiles
          for (const docSnapshot of investmentProfilesSnap.docs) {
            const profile = docSnapshot.data();
            if (profile.isActive === "Active") {
              // Get the annual rate for this deposit amount
              const annualRate = getInterestRate(profile.amount || 0);

              // Calculate earnings for just one cycle with tax deduction
              const singleCycleEarnings = calculateSingleCycleEarnings(
                profile.amount || 0,
                annualRate
              );
              totalExpectedEarnings += singleCycleEarnings;

              // Calculate elapsed months and current cycle
              const startTime =
                profile.initialDate?.toDate() || new Date(profile.startDate);
              const elapsedMonths = calculateElapsedMonths(startTime, now);
              const currentCycle = calculateCycle(elapsedMonths);
              const previousCycle = profile.cycleCount || 0;

              // console.log(
              //   `Deposit ${profile.amount}: Elapsed months: ${elapsedMonths}, Current cycle: ${currentCycle}, Previous cycle: ${previousCycle}`
              // );

              // Only process if not already completed
              if (profile.isActive === "Active") {
                // Check if investment has completed its term (24 months or cycle 4)
                if (elapsedMonths >= 24 || currentCycle === 4) {
                  // Calculate only the final cycle's earnings
                  const grossEarnings =
                    (profile.amount || 0) * (annualRate / 100);
                  const finalCycleEarnings = grossEarnings * 0.8; // 20% tax

                  completedDepositsToProcess.push({
                    docRef: docSnapshot.ref,
                    amount: profile.amount || 0,
                    totalToAdd: (profile.amount || 0) + finalCycleEarnings, // Only add principal + final cycle earnings
                    totalEarned: finalCycleEarnings,
                  });

                  // Immediately update the deposit to completed status
                  try {
                    await updateDoc(docSnapshot.ref, {
                      isActive: "Completed",
                      cycleCount: 4,
                      endDate: now,
                      returnedAmount: profile.amount || 0,
                    });
                    // console.log(
                    //   `Updated deposit ${profile.amount} to completed status. Principal: ${profile.amount}, Final cycle earnings: ${finalCycleEarnings}`
                    // );
                  } catch (updateError) {
                    // console.error(
                    //   "Error updating deposit to completed status:",
                    //   updateError
                    // );
                    throw updateError;
                  }

                  shouldUpdateBalance = true;
                  // console.log(
                  //   `Deposit ${profile.amount} has completed its term. Principal returned: ${profile.amount}, Final cycle earnings: ${finalCycleEarnings}`
                  // );
                }
                // Only process cycle updates if not completing
                else if (currentCycle > previousCycle) {
                  // Calculate earnings for new cycles only
                  const grossEarnings =
                    (profile.amount || 0) * (annualRate / 100);
                  const netEarnings = grossEarnings * 0.8;
                  const newCycles = currentCycle - previousCycle;
                  const newEarnings = netEarnings * newCycles;

                  cycleUpdatesToProcess.push({
                    docRef: docSnapshot.ref,
                    newCycleCount: currentCycle,
                    currentCycleCount: previousCycle,
                    earningsToAdd: newEarnings,
                    amount: profile.amount || 0,
                    elapsedMonths: elapsedMonths,
                  });

                  // console.log(
                  //   `Queued cycle update: Cycles ${previousCycle} -> ${currentCycle}, New earnings to add: ${newEarnings}`
                  // );
                  shouldUpdateBalance = true;
                }
              }
            } else if (
              profile.isActive === "Completed" &&
              !profile.processedForBalance
            ) {
              // Skip already completed deposits that are just waiting for balance processing
              continue;
            }
          }

          // Process cycle updates first
          if (cycleUpdatesToProcess.length > 0) {
            // console.log("Processing cycle updates...");

            for (const update of cycleUpdatesToProcess) {
              try {
                // Add new earnings to available balance
                currentAvailBalance += update.earningsToAdd;
                // console.log(
                //   `Adding cycle earnings ${update.earningsToAdd} to balance. New balance: ${currentAvailBalance}`
                // );

                // Update the investment's cycle count and total earned
                await updateDoc(update.docRef, {
                  cycleCount: update.newCycleCount,
                  totalEarned: increment(update.earningsToAdd),
                });
                // console.log(
                //   `Updated investment with new cycle count ${update.newCycleCount} and added earnings ${update.earningsToAdd}`
                // );
              } catch (updateError) {
                // console.error("Error updating cycle count:", updateError);
                throw updateError;
              }
            }

            try {
              // Update available balance in Firestore
              await updateDoc(userRef, {
                availBalanceAmount: increment(
                  currentAvailBalance - userData.availBalanceAmount
                ),
              });
              // console.log(
              //   `Updated available balance in Firestore to ${currentAvailBalance}`
              // );
            } catch (balanceError) {
              // console.error("Error updating available balance:", balanceError);
              throw balanceError;
            }
          }

          // Process completed deposits
          if (completedDepositsToProcess.length > 0) {
            // console.log("Processing completed deposits...");
            for (const deposit of completedDepositsToProcess) {
              try {
                // Add both principal and earnings to available balance
                currentAvailBalance += deposit.totalToAdd;
                // console.log(
                //   `Adding completed deposit total ${deposit.totalToAdd} to balance (Principal: ${deposit.amount}, Earnings: ${deposit.totalEarned}). New balance: ${currentAvailBalance}`
                // );

                // Mark deposit as processed
                await updateDoc(deposit.docRef, {
                  processedForBalance: true,
                  totalEarned: deposit.totalEarned,
                });
                // console.log(
                //   `Marked deposit as processed with final earnings ${deposit.totalEarned}`
                // );
              } catch (updateError) {
                // console.error("Error updating completed deposit:", updateError);
                throw updateError;
              }
            }

            try {
              // Update available balance in Firestore with the total amount (principal + earnings)
              await updateDoc(userRef, {
                availBalanceAmount: increment(
                  currentAvailBalance - userData.availBalanceAmount
                ),
              });
              // console.log(
              //   `Updated final available balance in Firestore to ${currentAvailBalance}`
              // );
            } catch (balanceError) {
              // console.error("Error updating final balance:", balanceError);
              throw balanceError;
            }
          }

          // The user document listener will automatically update the state
          // console.log(
          //   `✅ Investment profiles processing completed. Balance updated to: ${currentAvailBalance}`
          // );
        } catch (error) {
          // console.error("Error in investment profiles listener:", error);
          // console.error(error.stack);
          showModal({
            title: "Error",
            message: t(
              userLanguage,
              "mainDashboard.errors.failedToUpdateInvestment"
            ),
            type: "error",
          });
        }
      },
      (error) => {
        // console.error("Investment profiles listener error:", error);
        showModal({
          title: "Error",
          message: t(
            userLanguage,
            "mainDashboard.errors.failedToListenToInvestment"
          ),
          type: "error",
        });
      }
    );

    // Set up real-time listener for inspireAuto deposits
    const unsubscribeInspireAuto = onSnapshot(
      inspireAutoRef,
      async (inspireAutoSnap) => {
        try {
          let inspireAutoTotal = 0;
          let inspireAutoExpectedEarnings = 0;

          // Calculate total from active inspireAuto deposits
          for (const docSnapshot of inspireAutoSnap.docs) {
            const deposit = docSnapshot.data();
            if (deposit.isActive === "Active") {
              const amount = deposit.amount || 0;
              inspireAutoTotal += amount;

              // Calculate expected earnings for this deposit
              if (deposit.rate !== undefined) {
                // Calculate 6-month earnings only (1 cycle)
                const sixMonthEarnings = amount * (deposit.rate / 100);
                const sixMonthTax = sixMonthEarnings * 0.2; // 20% tax
                const sixMonthNet = sixMonthEarnings - sixMonthTax;

                // Use only 6-month net earnings (no multiplier for contract duration)
                const expectedEarnings = sixMonthNet;
                inspireAutoExpectedEarnings += expectedEarnings;

                // Debug logging for each deposit
                // console.log(
                //   `[${deposit.id}] Expected Earnings Breakdown (6-Month Only):`
                // );
                // console.log(`  Amount: ₱${amount.toFixed(2)}`);
                // console.log(`  Rate: ${deposit.rate}%`);
                // console.log(`  6-Month Gross: ₱${sixMonthEarnings.toFixed(2)}`);
                // console.log(`  6-Month Tax (20%): ₱${sixMonthTax.toFixed(2)}`);
                // console.log(
                //   `  6-Month Net (Expected): ₱${sixMonthNet.toFixed(2)}`
                // );
                // console.log(
                //   `  Contract Type: ${deposit.contractType} (showing 1 cycle only)`
                // );
              }
            }
          }

          // console.log(`InspireAuto active deposits total: ${inspireAutoTotal}`);
          // console.log(
          //   `InspireAuto expected earnings total: ${inspireAutoExpectedEarnings}`
          // );

          // Get the current user's document
          const userRef = doc(firestore, "users", currentUser.uid);

          // Update both timeDepositAmount and walletAmount in Firestore
          try {
            await updateDoc(userRef, {
              timeDepositAmount: inspireAutoTotal,
              walletAmount: inspireAutoExpectedEarnings,
            });
            // console.log(
            //   `Updated Firestore - timeDepositAmount: ${inspireAutoTotal}, walletAmount: ${inspireAutoExpectedEarnings}`
            // );
          } catch (updateError) {
            // console.error("Error updating Firestore:", updateError);
          }

          // The user document listener will automatically update the state
          // console.log(
          //   `✅ InspireAuto processing completed. TimeDeposit: ${inspireAutoTotal}, PredictedEarnings: ${inspireAutoExpectedEarnings}`
          // );

          // Auto-update InspireAuto deposits when page loads (first time only)
          if (inspireAutoSnap.docs.length > 0) {
            // console.log("Auto-updating InspireAuto deposits on page visit...");
            try {
              // Trigger the hidden InvestmentAuto component's update function
              triggerInvestmentAutoUpdate();
              // console.log("Auto-update completed for InspireAuto deposits");
            } catch (autoUpdateError) {
              // console.error("Error in auto-update:", autoUpdateError);
            }
          }
        } catch (error) {
          // console.error("Error in inspireAuto listener:", error);
        }
      },
      (error) => {
        // console.error("InspireAuto listener error:", error);
      }
    );

    // Set up additional real-time listeners for comprehensive coverage
    const accountMovementsRef = collection(
      firestore,
      "users",
      currentUser.uid,
      "accountMovements"
    );
    const unsubscribeAccountMovements = onSnapshot(
      accountMovementsRef,
      (accountMovementsSnap) => {
        // console.log(
        //   "🔄 Account movements updated in real-time, count:",
        //   accountMovementsSnap.docs.length
        // );
        // The user document listener will handle the state updates
      },
      (error) => {
        // console.error("❌ Error listening to account movements:", error);
      }
    );

    // Clean up the listeners when component unmounts
    return () => {
      unsubscribeProfiles();
      unsubscribeInspireAuto();
      unsubscribeAccountMovements();
    };
  }, [authInitialized, currentUser]);

  // Set navigation options
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      headerTitle: "Dashboard",
    });
  }, []);

  // Function to trigger InvestmentAuto update
  const triggerInvestmentAutoUpdate = () => {
    if (
      investmentAutoRef.current &&
      investmentAutoRef.current.handleUpdateFirestore
    ) {
      // console.log("Triggering InvestmentAuto update...");
      investmentAutoRef.current.handleUpdateFirestore();
    }
  };

  // Auto-update when page loads and when auth is ready
  useEffect(() => {
    // Wait for auth to be initialized before triggering update
    if (!authInitialized || !currentUser) return;

    // Trigger update after a short delay to ensure components are mounted
    const timer = setTimeout(() => {
      triggerInvestmentAutoUpdate();
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [authInitialized, currentUser]);

  // Call this when user opens helpcenter (e.g., before navigating to helpcenter)
  const handleOpenHelpCenter = async () => {
    await AsyncStorage.setItem("lastHelpCenterVisit", new Date().toISOString());
    setHasNewSupportMessage(false);
    router.push("/helpcenter");
  };

  // Test function to check presence status
  const testPresenceStatus = async () => {
    try {
      const status = await presenceService.getCurrentPresenceStatus();
      if (status) {
        showModal({
          title: t(userLanguage, "mainDashboard.presenceStatus.title"),
          message: `Status: ${status.status}\nActive: ${status.isActive}\nSession: ${status.sessionId}`,
          type: "info",
          showCloseButton: true,
          confirmText: "OK",
        });
      } else {
        showModal({
          title: t(userLanguage, "mainDashboard.presenceStatus.title"),
          message: t(userLanguage, "mainDashboard.presenceStatus.noDataFound"),
          type: "warning",
          showCloseButton: true,
          confirmText: "OK",
        });
      }
    } catch (error) {
      console.error("Error testing presence status:", error);
      showModal({
        title: "Error",
        message: t(userLanguage, "mainDashboard.errors.failedToCheckPresence"),
        type: "error",
        showCloseButton: true,
        confirmText: "OK",
      });
    }
  };

  // Don't render until auth state is determined - prevents blank screen
  // CRITICAL: Show loading while waiting for auth, but don't redirect immediately
  // This prevents blank screen when app resumes
  if (!authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6F0" }}>
        <ActivityIndicator size="large" color={Colors.redTheme.background} />
      </View>
    );
  }

  // If auth is initialized but no user, show loading
  // The redirect will be handled in the useEffect above with a delay
  if (!currentUser) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6F0" }}>
        <ActivityIndicator size="large" color={Colors.redTheme.background} />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContentContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.mainContainer}>
            {/* Menu and Info Buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                paddingBottom: 10,
                paddingRight: 10,
                width: "100%",
                gap: 10,
                zIndex: 1000,
              }}
            >
              {/* Display user greeting */}
              <View
                style={{
                  width: "100%",
                  flexDirection: "row",
                  justifyContent: "flex-start",
                  alignItems: "flex-start",
                  padding: 10,
                  gap: 2,
                }}
              >
                <TouchableOpacity
                  style={styles.personalButton}
                  onPress={() => {
                    router.push("/personal");
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={Colors.newYearTheme.text}
                  />
                </TouchableOpacity>
                <HeaderGN />
              </View>
              <TouchableOpacity
                style={[styles.menuButton, { right: 80 }]}
                onPress={testPresenceStatus}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                >
                  TEST
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.menuButton,
                  { right: 50, top: 7, width: 50, height: 50 },
                ]}
                onPress={() => {
                  router.push("/notification");
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={Colors.newYearTheme.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  router.replace("settings");
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={styles.hamburgerIcon}>
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Notification Banner for New Support Message */}
            {hasNewSupportMessage && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  console.log("Notification tapped!");
                  handleOpenHelpCenter();
                }}
                style={{
                  backgroundColor: "#d32f2f",
                  padding: 10,
                  borderRadius: 8,
                  margin: 10,
                  zIndex: 1000,
                  elevation: 5,
                }}
              >
                <Text
                  style={[
                    {
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "center",
                    },
                    getRTLStyles(userLanguage),
                  ]}
                >
                  {t(userLanguage, "mainDashboard.newSupportMessage")}
                </Text>
              </TouchableOpacity>
            )}

            {/* User's Active Card Display */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.cardHeaderText, getRTLStyles(userLanguage)]}
                >
                  {t(userLanguage, "mainDashboard.cardHeaderText")}
                </Text>
              </View>
              <InspCard selectedCardId={activeCardId} />
              <MainNavBar />
              <AmountContent
                amount={timeDepositTotal}
                title={t(userLanguage, "mainDashboard.timeDepositTitle")}
              />
              <AmountContent
                amount={predictedEarnings}
                title={t(userLanguage, "mainDashboard.amountWalletTitle")}
              />
              <DepoWithdrawButton />
              <NewSectionCarousel />
              <TransacHistory
                userId={currentUser?.uid || ""}
                trigger={transactionTrigger}
              />
            </View>

            <View style={styles.hiddenInvestmentAuto}>
              <InvestmentAuto ref={investmentAutoRef} />
            </View>
            <View style={{ height: 100 }} />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      <SafeAreaView style={styles.androidSafeArea} />

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

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => {}} // Prevent closing by back button
      >
        <Animated.View
          style={[
            styles.languageModalOverlay,
            { opacity: languageModalFadeAnim },
          ]}
        >
          <Animated.View
            style={[
              styles.languageModalContent,
              { transform: [{ scale: languageModalScaleAnim }] },
            ]}
          >
            {/* Language Icon */}
            <View style={styles.languageIconContainer}>
              <Ionicons
                name="language"
                size={24}
                color={Colors.redTheme.background}
              />
            </View>

            <Text style={styles.languageModalTitle}>
              Select Your Preferred Language
            </Text>
            <Text style={styles.languageModalSubtitle}>
              Please choose your preferred language to continue using the app.
            </Text>

            <View style={styles.languageOptionsContainer}>
              {languageOptions.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.languageOption,
                    selectedLanguage === language &&
                      styles.selectedLanguageOption,
                  ]}
                  onPress={() => setSelectedLanguage(language)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      selectedLanguage === language &&
                        styles.selectedLanguageOptionText,
                    ]}
                  >
                    {language}
                  </Text>
                  {selectedLanguage === language && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.languageConfirmButton,
                isUpdatingLanguage && styles.languageConfirmButtonDisabled,
              ]}
              onPress={handleLanguageSelection}
              disabled={isUpdatingLanguage}
              activeOpacity={0.8}
            >
              {isUpdatingLanguage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.languageConfirmButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Comment out EventPopup */}
      <EventPopup
        visible={showEventPopup}
        onClose={() => setShowEventPopup(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F6F0",
  },
  scrollView: {
    width: "95%",
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === "android" ? 20 : 0,
  },
  mainContainer: {
    width: "100%",
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 25,
  },
  buttonContainer: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  list: {
    width: "95%",
  },
  item: {
    flex: 1,
    margin: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  soonBadge: {
    position: "absolute",
    top: 5,
    right: -2,
    backgroundColor: "red",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  soonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  historyButton: {
    width: "100%",
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 15,
    padding: 10,
    marginTop: 30,
    height: 40,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: Platform.OS === "android" ? 8 : 5,
    zIndex: Platform.OS === "android" ? 1 : 0,
  },
  historyText: {
    fontSize: 15,
    textAlign: "center",
    color: Colors.newYearTheme.text,
    fontWeight: "500",
  },
  hollowButton: {
    flex: 1,
    height: 40,
    backgroundColor: "transparent",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    borderColor: "black",
    borderWidth: 2,
  },
  menuButton: {
    position: "absolute",
    right: 10,
    top: 13,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    height: 35,
    width: width * 0.15,
    zIndex: Platform.OS === "android" ? 1000 : 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: Colors.newYearTheme.background,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  closeButtonText: {
    color: Colors.newYearTheme.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  hiddenInvestmentAuto: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    pointerEvents: "none",
    zIndex: -1,
  },
  cardSection: {
    width: "100%",
    marginVertical: 15,
    paddingHorizontal: 10,
    zIndex: Platform.OS === "android" ? 1 : 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
    position: "relative",
    bottom: 10,
  },
  cardHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  buyCardsButton: {
    backgroundColor: Colors.newYearTheme.background,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buyCardsButtonText: {
    color: Colors.newYearTheme.text,
    fontSize: 12,
    fontWeight: "bold",
  },
  expandableContainer: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 15,
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
  },
  expandableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  expandableTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  expandableSubtitle: {
    fontSize: 12,
    color: "#7f8c8d",
    fontStyle: "italic",
  },
  expandableTotal: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#27ae60",
    marginBottom: 4,
  },
  expandArrow: {
    fontSize: 16,
    color: "#7f8c8d",
    fontWeight: "bold",
  },
  expandArrowRotated: {
    transform: [{ rotate: "180deg" }],
  },
  expandableContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "white",
  },
  detailRow: {
    marginBottom: 15,
  },
  detailItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 15,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 12,
    color: "#7f8c8d",
    lineHeight: 16,
  },
  performanceIndicator: {
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  performanceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27ae60",
    textAlign: "center",
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: "space-between",
    alignItems: "center",
  },
  hamburgerLine: {
    width: "100%",
    height: 2,
    backgroundColor: Colors.newYearTheme.text,
    borderRadius: 1,
  },
  personalButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  // Language Modal Styles - Compact & Simple
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  languageModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  languageModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  languageModalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  languageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  languageOptionsContainer: {
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectedLanguageOption: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  selectedLanguageOptionText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  languageConfirmButton: {
    backgroundColor: Colors.redTheme.background,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  languageConfirmButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  languageConfirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
