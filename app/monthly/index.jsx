import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Animated,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  query,
  orderBy,
  getDocs,
  updateDoc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { Colors } from "../../constants/Colors";
import { getRTLStyles } from "../../utils/rtlUtils";
import { t } from "../../utils/languageUtils";

const { width, height } = Dimensions.get("window");

const MonthlyInvestmentTracker = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [userLanguage, setUserLanguage] = useState('English');
  const [monthlyCampaigns, setMonthlyCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Use the current authenticated user ID
        const userId = currentUser.uid;
        
        // Try getDocs first, then fallback to real-time listener
        const initializeData = async () => {
          
          const count = await fetchCampaignsWithGetDocs(userId);
          if (count === 0) {
            console.log("🔄 No data with getDocs, setting up real-time listener...");
            setupRealtimeListener(userId);
          }
        };
        
        initializeData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  const setupRealtimeListener = (userId) => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Setting up real-time listener for userId:", userId);
      const monthlyCampaignRef = collection(firestore, "users", userId, "monthlyCampaign");
      
      // Try with orderBy first, fallback to simple collection if it fails
      let q;
      try {
        q = query(monthlyCampaignRef, orderBy("createdAt", "desc"));
        console.log("📊 Using ordered query");
      } catch (orderError) {
        console.log("⚠️ OrderBy failed, using simple collection query:", orderError);
        q = monthlyCampaignRef;
      }

       // Set up real-time listener
       const unsubscribe = onSnapshot(
         q,
         async (snapshot) => {
           console.log("📡 Snapshot received, size:", snapshot.size);
           const campaigns = [];
           snapshot.forEach((doc) => {
             console.log("📄 Document found:", doc.id, doc.data());
             campaigns.push({
               id: doc.id,
               ...doc.data(),
             });
           });

           console.log("✅ Total campaigns loaded:", campaigns.length);
           
           // Sort campaigns by initial date (newest first)
           const sortedCampaigns = sortCampaignsByDate(campaigns);
           setMonthlyCampaigns(sortedCampaigns);
           setLoading(false);
          
           // Auto-update Firestore with payout fields for campaigns that need it
           if (campaigns.length > 0) {
             console.log("🔄 Auto-updating Firestore with payout fields (real-time)...");
             campaigns.forEach(async (campaign) => {
               // Check if we need to update Firestore fields
               const needsUpdate = !campaign.payoutDay || 
                                 !campaign.nextPayout || 
                                 !campaign.expectedIncome || 
                                 !campaign.completionDate ||
                                 !campaign.basedOnInitialDate ||
                                 (campaign.initialDate && campaign.basedOnInitialDate && 
                                  campaign.initialDate.toDate && campaign.basedOnInitialDate.toDate &&
                                  campaign.initialDate.toDate().getTime() !== campaign.basedOnInitialDate.toDate().getTime());
               
               if (needsUpdate) {
                 console.log(`🔄 Updating Firestore fields for campaign ${campaign.id}`);
                 await updateFirestorePayoutFields(campaign);
               }
             });
             
             // Process automatic payouts
             console.log("🔄 Checking for automatic payouts (real-time)...");
             await processAutomaticPayouts(campaigns, userId);
           }
          
          // Animate content appearance
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]).start();
        },
        (error) => {
          console.error("❌ Error in real-time listener:", error);
          console.error("Error details:", error.code, error.message);
          
          // Try fallback without orderBy
          if (error.code === 'failed-precondition' || error.code === 'unimplemented') {
            console.log("🔄 Trying fallback query without orderBy...");
             const fallbackUnsubscribe = onSnapshot(
               monthlyCampaignRef,
               async (snapshot) => {
                 console.log("📡 Fallback snapshot received, size:", snapshot.size);
                 const campaigns = [];
                 snapshot.forEach((doc) => {
                   console.log("📄 Fallback document found:", doc.id, doc.data());
                   campaigns.push({
                     id: doc.id,
                     ...doc.data(),
                   });
                 });

                 console.log("✅ Fallback campaigns loaded:", campaigns.length);
                 
                 // Sort campaigns by initial date (newest first)
                 const sortedCampaigns = sortCampaignsByDate(campaigns);
                 setMonthlyCampaigns(sortedCampaigns);
                 setLoading(false);
                 
                 // Process automatic payouts for fallback as well
                 if (campaigns.length > 0) {
                   console.log("🔄 Checking for automatic payouts (fallback)...");
                   await processAutomaticPayouts(campaigns, userId);
                 }
                
                // Animate content appearance
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                  }),
                  Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                ]).start();
              },
              (fallbackError) => {
                console.error("❌ Fallback query also failed:", fallbackError);
                setError(`${t(userLanguage, 'investmentTracker.common.errors.failedToLoadMonthly')}: ${fallbackError.message}`);
                setLoading(false);
              }
            );
            return fallbackUnsubscribe;
          } else {
            setError(`${t(userLanguage, 'investmentTracker.common.errors.failedToLoadMonthly')}: ${error.message}`);
            setLoading(false);
          }
        }
      );

      // Return cleanup function
      return unsubscribe;
    } catch (error) {
      console.error("❌ Error setting up real-time listener:", error);
      setError(`${t(userLanguage, 'investmentTracker.common.errors.failedToSetupConnection')}: ${error.message}`);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setRefreshing(false);
      return;
    }
    
    const userId = currentUser.uid;
    console.log("🔄 Manual refresh triggered...");
    
    // Try getDocs first as it's more reliable
    const count = await fetchCampaignsWithGetDocs(userId);
    
    if (count === 0) {
      console.log("🔄 No data with getDocs, trying real-time listener...");
      // Fallback to real-time listener
      setupRealtimeListener(userId);
    }
    
    setRefreshing(false);
  };

  // Simple fetch using getDocs (no real-time)
  const fetchCampaignsWithGetDocs = async (userId) => {
    try {
      console.log("📥 Fetching campaigns with getDocs...");
      setLoading(true);
      setError(null);

      const monthlyCampaignRef = collection(firestore, "users", userId, "monthlyCampaign");
      const snapshot = await getDocs(monthlyCampaignRef);
      
      console.log("📥 getDocs snapshot size:", snapshot.size);
      const campaigns = [];
      snapshot.forEach((doc) => {
        console.log("📥 getDocs document:", doc.id, doc.data());
        campaigns.push({
          id: doc.id,
          ...doc.data(),
        });
      });

       console.log("✅ getDocs campaigns loaded:", campaigns.length);
       
       // Sort campaigns by initial date (newest first)
       const sortedCampaigns = sortCampaignsByDate(campaigns);
       setMonthlyCampaigns(sortedCampaigns);
       setLoading(false);
      
       // Auto-update Firestore with payout fields for campaigns that need it
       if (campaigns.length > 0) {
         console.log("🔄 Auto-updating Firestore with payout fields...");
         campaigns.forEach(async (campaign) => {
           // Check if we need to update Firestore fields
           const needsUpdate = !campaign.payoutDay || 
                             !campaign.nextPayout || 
                             !campaign.expectedIncome || 
                             !campaign.completionDate ||
                             !campaign.basedOnInitialDate ||
                             (campaign.initialDate && campaign.basedOnInitialDate && 
                              campaign.initialDate.toDate && campaign.basedOnInitialDate.toDate &&
                              campaign.initialDate.toDate().getTime() !== campaign.basedOnInitialDate.toDate().getTime());
           
           if (needsUpdate) {
             console.log(`🔄 Updating Firestore fields for campaign ${campaign.id}`);
             await updateFirestorePayoutFields(campaign);
           }
         });
         
         // Process automatic payouts
         console.log("🔄 Checking for automatic payouts (getDocs)...");
         await processAutomaticPayouts(campaigns, userId);
       }
      
      // Animate content appearance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      return campaigns.length;
    } catch (error) {
      console.error("❌ getDocs failed:", error);
      setError(`${t(userLanguage, 'investmentTracker.common.errors.failedToFetch')}: ${error.message}`);
      setLoading(false);
      return 0;
    }
  };


  // Helper function to get current date/time in Philippine timezone
  const getPhilippineTime = () => {
    const now = new Date();
    const philippineOffset = 8 * 60; // Philippines is UTC+8 (8 hours * 60 minutes)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (philippineOffset * 60000));
  };

  // Helper function to sort campaigns by initial date
  const sortCampaignsByDate = (campaigns) => {
    const sorted = campaigns.sort((a, b) => {
      const dateA = a.initialDate ? (a.initialDate.toDate ? a.initialDate.toDate() : new Date(a.initialDate)) : new Date(0);
      const dateB = b.initialDate ? (b.initialDate.toDate ? b.initialDate.toDate() : new Date(b.initialDate)) : new Date(0);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    console.log("📊 Campaigns sorted by date (newest first):");
    sorted.forEach((campaign, index) => {
      const date = campaign.initialDate ? (campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate)) : null;
      console.log(`   ${index + 1}. ${campaign.id} - ${date ? date.toDateString() : 'No date'}`);
    });
    
    return sorted;
  };

  const formatAmount = (amount) => {
    if (typeof amount === 'number') {
      return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return amount || '0.00';
  };

  const formatInitialDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'checkmark-circle';
      case 'completed':
        return 'trophy';
      case 'paused':
        return 'pause-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#10B981'; // Green
      case 'completed':
        return '#F59E0B'; // Amber
      case 'paused':
        return '#6B7280'; // Gray
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return Colors.redTheme.background; // Default app color
    }
  };

  const calculatePayoutDay = (initialDate) => {
    if (!initialDate) return 'N/A';
    
    const date = initialDate.toDate ? initialDate.toDate() : new Date(initialDate);
    // Get current date in Philippine timezone
    const today = getPhilippineTime();
    
    // Get the day of the month from initial date
    const payoutDay = date.getDate();
    
    // Create next payout date starting from current month
    let nextPayout = new Date(today.getFullYear(), today.getMonth(), payoutDay);
    
    // If the payout day for this month has already passed, move to next month
    if (nextPayout <= today) {
      nextPayout = new Date(today.getFullYear(), today.getMonth() + 1, payoutDay);
    }
    
    // Handle edge cases for months with fewer days (e.g., Jan 31 → Feb 28/29)
    if (nextPayout.getDate() !== payoutDay) {
      // If the payout day doesn't exist in the target month, use last day of month
      nextPayout = new Date(nextPayout.getFullYear(), nextPayout.getMonth(), 0);
    }
    
    console.log(`📅 Next payout calculation:`);
    console.log(`   • Initial date: ${date.toDateString()}`);
    console.log(`   • Today (PH): ${today.toDateString()}`);
    console.log(`   • Payout day: ${payoutDay}`);
    console.log(`   • Next payout: ${nextPayout.toDateString()}`);
    
    // Validate the next payout date
    if (isNaN(nextPayout.getTime())) {
      console.error(`❌ Invalid next payout date calculated`);
      return 'Invalid Date';
    }
    
    return nextPayout.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPayoutDayNumber = (initialDate) => {
    if (!initialDate) return 'N/A';
    
    const date = initialDate.toDate ? initialDate.toDate() : new Date(initialDate);
    return date.getDate().toString();
  };

  const calculateExpectedIncome = (amount, rate) => {
    if (!amount || !rate) return 0;
    
    const amountNum = typeof amount === 'number' ? amount : parseFloat(amount);
    const rateNum = typeof rate === 'number' ? rate : parseFloat(rate);
    
    if (isNaN(amountNum) || isNaN(rateNum)) return 0;
    
    // Calculate gross income: amount * (rate / 100)
    const grossIncome = amountNum * (rateNum / 100);
    
    // Calculate tax (20% of gross income)
    const tax = grossIncome * 0.20;
    
    // Calculate net income after tax
    const netIncome = grossIncome - tax;
    
    return netIncome;
  };

  const calculateCompletionDate = (initialDate) => {
    if (!initialDate) return null;
    
    const date = initialDate.toDate ? initialDate.toDate() : new Date(initialDate);
    
    // Validate the initial date
    if (isNaN(date.getTime())) {
      console.error('Invalid initial date provided to calculateCompletionDate:', initialDate);
      return null;
    }
    
    // Calculate completion date: exactly 1 year later, same day
    // Example: Sep 17, 2025 → Sep 17, 2026
    const completionDate = new Date(date);
    completionDate.setFullYear(completionDate.getFullYear() + 1);
    
    // Final validation
    if (isNaN(completionDate.getTime())) {
      console.error('Invalid completion date calculated for initial date:', date.toDateString());
      return null;
    }
    
    console.log(`Completion date calculated: ${date.toDateString()} + 1 year = ${completionDate.toDateString()}`);
    return completionDate;
  };

  const updateFirestorePayoutFields = async (campaign) => {
    try {
      if (!campaign.initialDate) {
        console.log(`⚠️ Campaign ${campaign.id} has no initialDate - skipping Firestore update`);
        return false;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("❌ No authenticated user found");
        return false;
      }
      
      const userId = currentUser.uid;
      const campaignRef = doc(firestore, "users", userId, "monthlyCampaign", campaign.id);
      
      // Calculate payout fields
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = initialDate.getDate();
      
       // Calculate next payout date using Philippine timezone
       const today = getPhilippineTime();
       let nextPayout = new Date(today.getFullYear(), today.getMonth(), payoutDay);
      
      if (nextPayout <= today) {
        nextPayout = new Date(today.getFullYear(), today.getMonth() + 1, payoutDay);
      }
      
      // Handle edge cases for months with fewer days
      if (nextPayout.getDate() !== payoutDay) {
        nextPayout = new Date(nextPayout.getFullYear(), nextPayout.getMonth(), 0);
      }

      // Calculate expected income
      const expectedIncome = calculateExpectedIncome(campaign.amount, campaign.rate);

      // Calculate completion date
      const completionDate = calculateCompletionDate(campaign.initialDate);

       // Update Firestore document
       const philippineNow = getPhilippineTime();
       const updateData = {
         payoutDay: payoutDay,
         nextPayout: nextPayout,
         expectedIncome: expectedIncome,
         cycle: campaign.cycle || 0, // Initialize cycle to 0 if not set
         lastCalculated: philippineNow,
         basedOnInitialDate: initialDate
       };

      // Only add completionDate if calculation was successful
      if (completionDate) {
        updateData.completionDate = completionDate;
      }

      await updateDoc(campaignRef, updateData);

      console.log(`✅ Updated Firestore for campaign ${campaign.id}:`);
      console.log(`   • Payout Day: ${payoutDay}`);
      console.log(`   • Next Payout: ${nextPayout.toDateString()}`);
      console.log(`   • Expected Income: ₱${formatAmount(expectedIncome)}`);
      console.log(`   • Based On Initial Date: ${initialDate.toDateString()}`);
      if (completionDate) {
        console.log(`   • Completion Date: ${completionDate.toDateString()}`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Error updating Firestore for campaign ${campaign.id}:`, error);
      return false;
    }
  };


  const processAutomaticPayouts = async (campaigns, userId) => {
    try {
      console.log("🔄 Processing automatic payouts...");
      // Get current date in Philippine timezone
      const philippineToday = getPhilippineTime();
      console.log(`🇵🇭 Current Philippine time: ${philippineToday.toDateString()} ${philippineToday.toTimeString()}`);
      let payoutsProcessed = 0;
      
      for (const campaign of campaigns) {
        // Skip if campaign is already completed
        if (campaign.status?.toLowerCase() === 'completed' || campaign.status?.toLowerCase() === 'complete') {
          console.log(`⏭️ Skipping completed campaign ${campaign.id}`);
          continue;
        }
        
        console.log(`🔍 Checking campaign ${campaign.id} for payout...`);
        console.log(`   • Completed cycles: ${campaign.cycle || 0}/12`);
        console.log(`   • Status: ${campaign.status || 'Active'}`);
        
        // Check if it's time for a payout
        const shouldProcessPayout = await checkIfPayoutDue(campaign, philippineToday);
        
        if (shouldProcessPayout) {
          console.log(`💰 Processing payout for campaign ${campaign.id}`);
          const success = await processPayoutForCampaign(campaign, userId);
          if (success) {
            payoutsProcessed++;
          }
        } else {
          console.log(`⏳ No payout due for campaign ${campaign.id}`);
        }
      }
      
      console.log(`✅ Processed ${payoutsProcessed} automatic payouts`);
      return payoutsProcessed;
    } catch (error) {
      console.error("❌ Error processing automatic payouts:", error);
      return 0;
    }
  };

  const checkIfPayoutDue = async (campaign, today) => {
    try {
      if (!campaign.initialDate || !campaign.payoutDay) {
        return false;
      }

      // Get the current cycle (default to 0 if not set)
      const currentCycle = campaign.cycle || 0;
      
      // If cycle is 12 or more, campaign should be completed
      if (currentCycle >= 12) {
        return false;
      }

      // Calculate the expected payout date for current cycle
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = campaign.payoutDay;
      
      // Calculate the payout date for the next cycle
      // Cycle 0 = first month payout (1 month after initial date)
      // Cycle 1 = second month payout (2 months after initial date), etc.
      let expectedPayoutDate = new Date(initialDate);
      expectedPayoutDate.setMonth(expectedPayoutDate.getMonth() + (currentCycle + 1));
      expectedPayoutDate.setDate(payoutDay);
      
      // Handle edge cases for months with fewer days
      if (expectedPayoutDate.getDate() !== payoutDay) {
        expectedPayoutDate = new Date(expectedPayoutDate.getFullYear(), expectedPayoutDate.getMonth() + 1, 0);
      }

      // Check if today is on or after the expected payout date (Philippine timezone)
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const payoutDateOnly = new Date(expectedPayoutDate.getFullYear(), expectedPayoutDate.getMonth(), expectedPayoutDate.getDate());
      
      // Also check if we haven't already processed this payout (compare with lastPayoutProcessed)
      const lastProcessed = campaign.lastPayoutProcessed ? 
        (campaign.lastPayoutProcessed.toDate ? campaign.lastPayoutProcessed.toDate() : new Date(campaign.lastPayoutProcessed)) : 
        null;
      
      const alreadyProcessed = lastProcessed && 
        lastProcessed.getFullYear() === payoutDateOnly.getFullYear() &&
        lastProcessed.getMonth() === payoutDateOnly.getMonth();

      console.log(`📅 Payout check for campaign ${campaign.id} (Philippine timezone):`);
      console.log(`   • Completed cycles: ${currentCycle}/12`);
      console.log(`   • Expected payout date: ${payoutDateOnly.toDateString()}`);
      console.log(`   • Today (PH): ${todayDateOnly.toDateString()}`);
      console.log(`   • Payout due: ${todayDateOnly >= payoutDateOnly}`);
      console.log(`   • Already processed: ${alreadyProcessed}`);
      console.log(`   • Last processed date: ${lastProcessed ? lastProcessed.toDateString() : 'None'}`);
      console.log(`   • Final result: ${todayDateOnly >= payoutDateOnly && !alreadyProcessed}`);

      return todayDateOnly >= payoutDateOnly && !alreadyProcessed;
    } catch (error) {
      console.error(`❌ Error checking payout due for campaign ${campaign.id}:`, error);
      return false;
    }
  };

  const processPayoutForCampaign = async (campaign, userId) => {
    try {
      const campaignRef = doc(firestore, "users", userId, "monthlyCampaign", campaign.id);
      const userRef = doc(firestore, "users", userId);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.error(`❌ User document not found: ${userId}`);
        return false;
      }

      const userData = userDoc.data();
      const currentBalance = userData.availBalanceAmount || 0;
      const expectedIncome = campaign.expectedIncome || calculateExpectedIncome(campaign.amount, campaign.rate);
      const currentCycle = campaign.cycle || 0;
      const newCycle = currentCycle + 1;

      // Calculate next payout date
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = campaign.payoutDay;
      let nextPayoutDate = new Date(initialDate);
      nextPayoutDate.setMonth(nextPayoutDate.getMonth() + (newCycle + 1));
      nextPayoutDate.setDate(payoutDay);

      // Handle edge cases for months with fewer days
      if (nextPayoutDate.getDate() !== payoutDay) {
        nextPayoutDate = new Date(nextPayoutDate.getFullYear(), nextPayoutDate.getMonth() + 1, 0);
      }

      // Determine new status
      let newStatus = campaign.status || 'Active';
      if (newCycle >= 12) {
        newStatus = 'Completed';
      }

      // Calculate total amount to add to balance
      let totalAmountToAdd = expectedIncome;
      let transactionDescription = `Monthly campaign payout - Cycle ${currentCycle}`;
      
      // If campaign is completed, also return the original amount
      if (newStatus === 'Completed') {
        totalAmountToAdd += campaign.amount;
        transactionDescription = `Campaign completed - Final payout + Principal return`;
      }
      
      // Update user's availBalanceAmount
      const newBalance = currentBalance + totalAmountToAdd;
      await updateDoc(userRef, {
        availBalanceAmount: newBalance
      });

      // Create transaction record for this payout
      await createPayoutTransaction(userId, totalAmountToAdd, campaign.id, currentCycle, transactionDescription);

      // Get current Philippine time for tracking
      const philippineDate = getPhilippineTime();

      // Update campaign with new cycle, status, and payout info
      const campaignUpdateData = {
        cycle: newCycle,
        status: newStatus,
        nextPayout: newStatus === 'Completed' ? null : nextPayoutDate,
        lastPayoutProcessed: philippineDate,
        lastPayoutAmount: expectedIncome,
        totalEarnings: (campaign.totalEarnings || 0) + expectedIncome
      };

      // Only update nextPayout if not completed (cycle < 12)
      if (newStatus !== 'Completed' && newCycle < 12) {
        campaignUpdateData.nextPayout = nextPayoutDate;
      }

      await updateDoc(campaignRef, campaignUpdateData);

      console.log(`✅ Payout processed for campaign ${campaign.id}:`);
      console.log(`   • Expected income: ₱${formatAmount(expectedIncome)}`);
      if (newStatus === 'Completed') {
        console.log(`   • Principal return: ₱${formatAmount(campaign.amount)}`);
        console.log(`   • Total amount added: ₱${formatAmount(totalAmountToAdd)}`);
      } else {
        console.log(`   • Amount added: ₱${formatAmount(totalAmountToAdd)}`);
      }
      console.log(`   • New balance: ₱${formatAmount(newBalance)} (was ₱${formatAmount(currentBalance)})`);
      console.log(`   • Completed cycles: ${currentCycle}/12 → ${newCycle}/12`);
      console.log(`   • Status: ${campaign.status || 'Active'} → ${newStatus}`);
      console.log(`   • Transaction: Created for tracking purposes`);
      if (newStatus !== 'Completed' && newCycle < 12) {
        console.log(`   • Next payout: ${nextPayoutDate.toDateString()}`);
      } else if (newCycle >= 12) {
        console.log(`   • All 12 payouts completed! 🎉`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error processing payout for campaign ${campaign.id}:`, error);
      return false;
    }
  };

  const createPayoutTransaction = async (userId, amount, campaignId, cycle, customDescription = null) => {
    try {
      const philippineTime = getPhilippineTime();
      const transactionRef = collection(firestore, "users", userId, "transactions");
      
      const transactionData = {
        type: "Rally Campaign Payout", // Money coming in
        category: "Monthly Campaign Payout",
        amount: amount,
        description: customDescription || `Monthly campaign payout - Cycle ${cycle}`,
        campaignId: campaignId,
        cycle: cycle,
        date: philippineTime,
        timestamp: philippineTime,
        status: "completed",
        source: "monthly_campaign",
        // Additional metadata
        payoutCycle: cycle,
        campaignRef: campaignId
      };

      await addDoc(transactionRef, transactionData);
      
      console.log(`📝 Transaction created for payout:`);
      console.log(`   • Amount: ₱${formatAmount(amount)}`);
      console.log(`   • Campaign: ${campaignId}`);
      console.log(`   • Cycle: ${cycle}`);
      console.log(`   • Date: ${philippineTime.toDateString()}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error creating payout transaction:`, error);
      return false;
    }
  };

  const toggleCardExpansion = (campaignId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };


  const renderInvestmentCard = (campaign, index) => {
    const isExpanded = expandedCards.has(campaign.id);
    
    return (
      <Animated.View 
        key={campaign.id} 
        style={[
          styles.investmentCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.cardContent}>
          {/* Header with Rally Campaign and Initial Date - Always Visible */}
          <TouchableOpacity 
            style={styles.cardHeader}
            onPress={() => toggleCardExpansion(campaign.id)}
            activeOpacity={0.7}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.investmentNumber, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "investmentTracker.monthly.campaignType")}
              </Text>
              <View style={styles.dateContainer}>
                <Ionicons 
                  name="calendar-outline" 
                  size={14} 
                  color={Colors.redTheme.background} 
                />
                <Text style={styles.initialDate}>
                  {formatInitialDate(campaign.initialDate)}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={Colors.redTheme.background} 
                style={styles.expandIcon}
              />
            </View>
          </TouchableOpacity>

           {/* Collapsible Content */}
           {isExpanded && (
             <>
               {/* Top Row - Amount and Rate */}
               <View style={styles.topRow}>
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="wallet" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.amount')}</Text>
                     <Text style={styles.gridItemValue}>
                       ₱{formatAmount(campaign.amount)}
                     </Text>
                   </View>
                 </View>
                 
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="trending-up" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.rate')}</Text>
                     <Text style={styles.gridItemValue}>
                       {campaign.rate || '2.5'}%
                     </Text>
                   </View>
                 </View>
               </View>

               {/* Middle Row - Payout Day and Expected Income */}
               <View style={styles.middleRow}>
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="calendar" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.payoutDay')}</Text>
                     <Text style={styles.gridItemValue}>
                       Day {getPayoutDayNumber(campaign.initialDate)}
                     </Text>
                     <Text style={[styles.gridItemSubtext, getRTLStyles(userLanguage)]}>
                       {t(userLanguage, 'investmentTracker.monthly.subtexts.nextPayout')} {calculatePayoutDay(campaign.initialDate)}
                     </Text>
                   </View>
                 </View>
                 
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="cash" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.expectedIncome')}</Text>
                     <Text style={styles.gridItemValue}>
                       ₱{formatAmount(campaign.expectedIncome || calculateExpectedIncome(campaign.amount, campaign.rate))}
                     </Text>
                     <Text style={[styles.gridItemSubtext, getRTLStyles(userLanguage)]}>
                       {t(userLanguage, 'investmentTracker.monthly.subtexts.afterTax')}
                     </Text>
                   </View>
                 </View>
               </View>

               {/* Bottom Row - Completion Date, Status, and Cycle */}
               <View style={styles.bottomRow}>
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="flag" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.completion')}</Text>
                     <Text style={styles.gridItemValue}>
                       {campaign.completionDate ? 
                         formatInitialDate(campaign.completionDate) : 
                         formatInitialDate(calculateCompletionDate(campaign.initialDate))
                       }
                     </Text>
                   </View>
                 </View>
                 
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name={getStatusIcon(campaign.status)} 
                       size={16} 
                       color={getStatusColor(campaign.status)} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.status')}</Text>
                     <Text style={[styles.gridItemValue, { color: getStatusColor(campaign.status) }]}>
                       {campaign.status || t(userLanguage, 'investmentTracker.monthly.status.active')}
                     </Text>
                   </View>
                 </View>
                 
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="repeat" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.cycleCompleted')}</Text>
                     <Text style={styles.gridItemValue}>
                       {campaign.cycle || '0'}
                     </Text>
                   </View>
                 </View>
               </View>
             </>
           )}

          {/* Quick Summary - Always Visible */}
          {!isExpanded && (
            <View style={styles.quickSummary}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.amount')}</Text>
                <Text style={styles.summaryValue}>₱{formatAmount(campaign.amount)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.expected')}</Text>
                <Text style={styles.summaryValue}>₱{formatAmount(campaign.expectedIncome || calculateExpectedIncome(campaign.amount, campaign.rate))}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.monthly.labels.status')}</Text>
                <Text style={[styles.summaryValue, { color: getStatusColor(campaign.status) }]}>
                  {campaign.status || t(userLanguage, 'investmentTracker.monthly.status.active')}
                </Text>
              </View>
             </View>
           )}

         </View>
       </Animated.View>
     );
   };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <Ionicons name="wallet-outline" size={48} color={Colors.redTheme.background} />
            <ActivityIndicator size="large" color={Colors.redTheme.background} style={styles.loadingSpinner} />
            <Text style={[styles.loadingText, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.common.loadingText')}</Text>
            <Text style={[styles.loadingSubtext, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.common.loadingSubtext')}</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={48} color={Colors.redTheme.background} />
            <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                  setupRealtimeListener(currentUser.uid);
                }
              }}
            >
              <Ionicons name="refresh" size={20} color="white" style={styles.retryIcon} />
              <Text style={[styles.retryButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (monthlyCampaigns.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Ionicons name="wallet-outline" size={64} color={Colors.redTheme.background} />
            <Text style={[styles.emptyText, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.common.emptyText')}</Text>
            <Text style={[styles.emptySubtext, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'investmentTracker.common.emptySubtextMonthly')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.investmentsList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.redTheme.background]}
            tintColor={Colors.redTheme.background}
            title={t(userLanguage, 'investmentTracker.common.pullToRefresh')}
            titleColor={Colors.redTheme.background}
          />
        }
      >
        {monthlyCampaigns.map((campaign, index) => renderInvestmentCard(campaign, index))}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Modern Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.backButtonContainer}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </View>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.pageTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "investmentTracker.monthly.title")}</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="calendar" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "investmentTracker.monthly.title")}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "investmentTracker.monthly.subtitle")}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{monthlyCampaigns.length}</Text>
                <Text style={styles.statLabel}>
                  {monthlyCampaigns.length === 1 ? t(userLanguage, "investmentTracker.monthly.headerSubtitle") : t(userLanguage, "investmentTracker.monthly.headerSubtitlePlural")}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  ₱{formatAmount(monthlyCampaigns.reduce((total, campaign) => total + (campaign.amount || 0), 0))}
                </Text>
                <Text style={styles.statLabel}>Total Invested</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {renderContent()}
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.redTheme.background,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    padding: 4,
  },
  backButtonContainer: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.redTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.light.icon + '30',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingSpinner: {
    marginVertical: 15,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    marginBottom: 5,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.redTheme.background,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.redTheme.background,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  investmentsList: {
    flex: 1,
  },
  investmentCard: {
    marginBottom: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.redTheme.background + '15',
  },
  headerLeft: {
    flex: 1,
  },
  investmentNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    marginBottom: 2,
    textAlign: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.redTheme.background + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  initialDate: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: '600',
    marginLeft: 4,
  },
  expandIcon: {
    marginLeft: 8,
  },
  quickSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.redTheme.background + '05',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.redTheme.background,
    fontWeight: '500',
    marginBottom: 2,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: 'bold',
  },
  // Grid Layout Styles
  topRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  middleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridItem: {
    flex: 1,
  },
  gridItemContainer: {
    backgroundColor: Colors.redTheme.background + '08',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.redTheme.background + '15',
  },
  gridItemLabel: {
    fontSize: 10,
    color: Colors.redTheme.background,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
    opacity: 0.8,
    textAlign: 'center',
  },
  gridItemValue: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridItemSubtext: {
    fontSize: 9,
    color: Colors.redTheme.background,
    fontWeight: '500',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 1,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default MonthlyInvestmentTracker;
