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

const ThreeMonthInvestmentTracker = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [userLanguage, setUserLanguage] = useState('English');
  const [threeMonthCampaigns, setThreeMonthCampaigns] = useState([]);
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
      const threeMonthCampaignRef = collection(firestore, "users", userId, "threeMonths");
      
      // Try with orderBy first, fallback to simple collection if it fails
      let q;
      try {
        q = query(threeMonthCampaignRef, orderBy("createdAt", "desc"));
        console.log("📊 Using ordered query");
      } catch (orderError) {
        console.log("⚠️ OrderBy failed, using simple collection query:", orderError);
        q = threeMonthCampaignRef;
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
           setThreeMonthCampaigns(sortedCampaigns);
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
             
             // Process automatic payouts (every 3 months)
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
                threeMonthCampaignRef,
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
                 setThreeMonthCampaigns(sortedCampaigns);
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
                 setError(`${t(userLanguage, 'investmentTracker.common.errors.failedToLoadThreeMonth')}: ${fallbackError.message}`);
                 setLoading(false);
               }
             );
             return fallbackUnsubscribe;
           } else {
             setError(`${t(userLanguage, 'investmentTracker.common.errors.failedToLoadThreeMonth')}: ${error.message}`);
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

      const threeMonthCampaignRef = collection(firestore, "users", userId, "threeMonths");
      const snapshot = await getDocs(threeMonthCampaignRef);
      
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
       setThreeMonthCampaigns(sortedCampaigns);
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
         
         // Process automatic payouts (every 3 months)
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
    
    // Create next payout date starting from current month, but add 3 months
    let nextPayout = new Date(today.getFullYear(), today.getMonth(), payoutDay);
    
    // Calculate next 3-month payout
    nextPayout.setMonth(nextPayout.getMonth() + 3);
    
    // If the payout day for this calculated month has already passed, move to next 3-month cycle
    if (nextPayout <= today) {
      nextPayout.setMonth(nextPayout.getMonth() + 3);
    }
    
    // Handle edge cases for months with fewer days (e.g., Jan 31 → Feb 28/29)
    if (nextPayout.getDate() !== payoutDay) {
      // If the payout day doesn't exist in the target month, use last day of month
      nextPayout = new Date(nextPayout.getFullYear(), nextPayout.getMonth(), 0);
    }
    
    console.log(`📅 Next 3-month payout calculation:`);
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

  const calculateMonthlyIncome = (amount, rate) => {
    if (!amount || !rate) return 0;
    
    const amountNum = typeof amount === 'number' ? amount : parseFloat(amount);
    const rateNum = typeof rate === 'number' ? rate : parseFloat(rate);
    
    if (isNaN(amountNum) || isNaN(rateNum)) return 0;
    
    // Calculate gross income for 1 month: amount * (rate / 100)
    const grossIncome = amountNum * (rateNum / 100);
    
    // Calculate tax (20% of gross income)
    const tax = grossIncome * 0.20;
    
    // Calculate net income after tax
    const netIncome = grossIncome - tax;
    
    return netIncome;
  };

  const calculateExpectedIncome = (amount, rate) => {
    // This is for display - shows what they'll earn per 3 months
    const monthlyIncome = calculateMonthlyIncome(amount, rate);
    return monthlyIncome * 3;
  };

  const calculateCompletionDate = (initialDate) => {
    if (!initialDate) return null;
    
    const date = initialDate.toDate ? initialDate.toDate() : new Date(initialDate);
    
    // Validate the initial date
    if (isNaN(date.getTime())) {
      console.error('Invalid initial date provided to calculateCompletionDate:', initialDate);
      return null;
    }
    
    // Calculate completion date: exactly 2 years later, same day
    // Example: Sep 17, 2025 → Sep 17, 2027
    const completionDate = new Date(date);
    completionDate.setFullYear(completionDate.getFullYear() + 2);
    
    // Final validation
    if (isNaN(completionDate.getTime())) {
      console.error('Invalid completion date calculated for initial date:', date.toDateString());
      return null;
    }
    
    console.log(`Completion date calculated: ${date.toDateString()} + 2 years = ${completionDate.toDateString()}`);
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
      const campaignRef = doc(firestore, "users", userId, "threeMonths", campaign.id);
      
      // Calculate payout fields
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = initialDate.getDate();
      
       // Calculate next payout date using Philippine timezone (every 3 months)
       const today = getPhilippineTime();
       let nextPayout = new Date(today.getFullYear(), today.getMonth(), payoutDay);
       nextPayout.setMonth(nextPayout.getMonth() + 3);
      
      if (nextPayout <= today) {
        nextPayout.setMonth(nextPayout.getMonth() + 3);
      }
      
      // Handle edge cases for months with fewer days
      if (nextPayout.getDate() !== payoutDay) {
        nextPayout = new Date(nextPayout.getFullYear(), nextPayout.getMonth() + 1, 0);
      }

      // Calculate expected income (for 3 months)
      const expectedIncome = calculateExpectedIncome(campaign.amount, campaign.rate);

      // Calculate completion date (2 years from initial date)
      const completionDate = calculateCompletionDate(campaign.initialDate);

       // Update Firestore document
       const philippineNow = getPhilippineTime();
       const updateData = {
         payoutDay: payoutDay,
         nextPayout: nextPayout,
         expectedIncome: expectedIncome,
         cycle: campaign.cycle || 0, // Initialize quarterly cycle to 0 if not set
         monthlyEarnings: calculateMonthlyIncome(campaign.amount, campaign.rate),
         monthsCompleted: campaign.monthsCompleted || 0, // Track individual months
         lastCalculated: philippineNow,
         basedOnInitialDate: initialDate,
         totalEarnings: campaign.totalEarnings || 0 // Initialize totalEarnings
       };

      // Only add completionDate if calculation was successful
      if (completionDate) {
        updateData.completionDate = completionDate;
      }

      await updateDoc(campaignRef, updateData);

      console.log(`✅ Updated Firestore for campaign ${campaign.id}:`);
      console.log(`   • Payout Day: ${payoutDay}`);
      console.log(`   • Next Payout: ${nextPayout.toDateString()}`);
      console.log(`   • Expected Income (3 months): ₱${formatAmount(expectedIncome)}`);
      console.log(`   • Based On Initial Date: ${initialDate.toDateString()}`);
      console.log(`   • Total Earnings: ₱${formatAmount(campaign.totalEarnings || 0)}`);
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
      console.log("🔄 Processing automatic payouts (monthly earnings + quarterly transfers)...");
      // Get current date in Philippine timezone
      const philippineToday = getPhilippineTime();
      console.log(`🇵🇭 Current Philippine time: ${philippineToday.toDateString()} ${philippineToday.toTimeString()}`);
      let monthlyPayoutsProcessed = 0;
      let quarterlyTransfersProcessed = 0;
      
      for (const campaign of campaigns) {
        // Skip if campaign is already completed
        if (campaign.status?.toLowerCase() === 'completed' || campaign.status?.toLowerCase() === 'complete') {
          console.log(`⏭️ Skipping completed campaign ${campaign.id}`);
          continue;
        }
        
        console.log(`🔍 Checking campaign ${campaign.id}...`);
        console.log(`   • Completed quarters: ${campaign.cycle || 0}/8`);
        console.log(`   • Completed months: ${campaign.monthsCompleted || 0}/24`);
        console.log(`   • Status: ${campaign.status || 'Active'}`);
        console.log(`   • Current total earnings: ₱${formatAmount(campaign.totalEarnings || 0)}`);
        
        // Check if it's time for monthly earnings accumulation
        const shouldProcessMonthly = await checkIfMonthlyEarningsDue(campaign, philippineToday);
        
        let updatedCampaign = campaign; // Create a mutable reference
        
        if (shouldProcessMonthly) {
          console.log(`💰 Processing monthly earnings for campaign ${campaign.id}`);
          const monthlySuccess = await processMonthlyEarnings(campaign, userId);
          if (monthlySuccess) {
            monthlyPayoutsProcessed++;
            
            // After processing monthly earnings, re-fetch the updated campaign data
            // for accurate quarterly transfer checking
            const updatedCampaignDoc = await getDoc(doc(firestore, "users", userId, "threeMonths", campaign.id));
            if (updatedCampaignDoc.exists()) {
              updatedCampaign = { id: campaign.id, ...updatedCampaignDoc.data() };
            }
          }
        }
        
        // Check if it's time for quarterly transfer (every 3 months)
        // This runs after monthly processing to ensure we have the latest data
        const shouldProcessQuarterly = await checkIfQuarterlyTransferDue(updatedCampaign, philippineToday);
        
        if (shouldProcessQuarterly) {
          console.log(`🏦 Processing quarterly transfer for campaign ${updatedCampaign.id}`);
          const quarterlySuccess = await processQuarterlyTransfer(updatedCampaign, userId);
          if (quarterlySuccess) {
            quarterlyTransfersProcessed++;
          }
        }
      }
      
      console.log(`✅ Processed ${monthlyPayoutsProcessed} monthly earnings and ${quarterlyTransfersProcessed} quarterly transfers`);
      return { monthlyPayoutsProcessed, quarterlyTransfersProcessed };
    } catch (error) {
      console.error("❌ Error processing automatic payouts:", error);
      return { monthlyPayoutsProcessed: 0, quarterlyTransfersProcessed: 0 };
    }
  };

  const checkIfMonthlyEarningsDue = async (campaign, today) => {
    try {
      if (!campaign.initialDate) {
        return false;
      }

      // Get the current month completion count (default to 0 if not set)
      const monthsCompleted = campaign.monthsCompleted || 0;
      
      // If 24 months are completed, campaign should be done
      if (monthsCompleted >= 24) {
        return false;
      }

      // Calculate the expected monthly earnings date
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = initialDate.getDate();
      
      // Calculate the next monthly earnings date
      // Month 0 = first month (1 month after initial date)
      // Month 1 = second month (2 months after initial date), etc.
      let expectedEarningsDate = new Date(initialDate);
      expectedEarningsDate.setMonth(expectedEarningsDate.getMonth() + (monthsCompleted + 1));
      expectedEarningsDate.setDate(payoutDay);
      
      // Handle edge cases for months with fewer days
      if (expectedEarningsDate.getDate() !== payoutDay) {
        expectedEarningsDate = new Date(expectedEarningsDate.getFullYear(), expectedEarningsDate.getMonth() + 1, 0);
      }

      // Check if today is on or after the expected earnings date (Philippine timezone)
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const earningsDateOnly = new Date(expectedEarningsDate.getFullYear(), expectedEarningsDate.getMonth(), expectedEarningsDate.getDate());
      
      // Check if we haven't already processed this month
      const lastMonthlyProcessed = campaign.lastMonthlyProcessed ? 
        (campaign.lastMonthlyProcessed.toDate ? campaign.lastMonthlyProcessed.toDate() : new Date(campaign.lastMonthlyProcessed)) : 
        null;
      
      const alreadyProcessed = lastMonthlyProcessed && 
        lastMonthlyProcessed.getFullYear() === earningsDateOnly.getFullYear() &&
        lastMonthlyProcessed.getMonth() === earningsDateOnly.getMonth();

      console.log(`📅 Monthly earnings check for campaign ${campaign.id}:`);
      console.log(`   • Completed months: ${monthsCompleted}/24`);
      console.log(`   • Expected earnings date: ${earningsDateOnly.toDateString()}`);
      console.log(`   • Today (PH): ${todayDateOnly.toDateString()}`);
      console.log(`   • Earnings due: ${todayDateOnly >= earningsDateOnly}`);
      console.log(`   • Already processed: ${alreadyProcessed}`);

      return todayDateOnly >= earningsDateOnly && !alreadyProcessed;
    } catch (error) {
      console.error(`❌ Error checking monthly earnings due for campaign ${campaign.id}:`, error);
      return false;
    }
  };

  const checkIfQuarterlyTransferDue = async (campaign, today) => {
    try {
      if (!campaign.initialDate) {
        return false;
      }

      // Get the current quarter cycle (default to 0 if not set)
      const currentCycle = campaign.cycle || 0;
      
      // If cycle is 8 or more, campaign should be completed
      if (currentCycle >= 8) {
        return false;
      }

      // Must have earnings to transfer AND ensure we've completed the full 3 months
      const monthsCompleted = campaign.monthsCompleted || 0;
      const expectedMonthsForCurrentQuarter = (currentCycle + 1) * 3;
      
      if (!campaign.totalEarnings || campaign.totalEarnings <= 0) {
        return false;
      }
      
      // Ensure we've completed all months for this quarter before allowing transfer
      if (monthsCompleted < expectedMonthsForCurrentQuarter) {
        console.log(`⏳ Quarter ${currentCycle + 1} transfer waiting: ${monthsCompleted}/${expectedMonthsForCurrentQuarter} months completed`);
        return false;
      }

      // Calculate the expected quarterly transfer date
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = initialDate.getDate();
      
      // Calculate the transfer date for the next quarter (every 3 months)
      // Quarter 0 = first transfer (3 months after initial date)
      // Quarter 1 = second transfer (6 months after initial date), etc.
      let expectedTransferDate = new Date(initialDate);
      expectedTransferDate.setMonth(expectedTransferDate.getMonth() + ((currentCycle + 1) * 3));
      expectedTransferDate.setDate(payoutDay);
      
      // Handle edge cases for months with fewer days
      if (expectedTransferDate.getDate() !== payoutDay) {
        expectedTransferDate = new Date(expectedTransferDate.getFullYear(), expectedTransferDate.getMonth() + 1, 0);
      }

      // Check if today is on or after the expected transfer date (Philippine timezone)
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const transferDateOnly = new Date(expectedTransferDate.getFullYear(), expectedTransferDate.getMonth(), expectedTransferDate.getDate());
      
      // Check if we haven't already processed this quarterly transfer
      const lastQuarterlyProcessed = campaign.lastQuarterlyProcessed ? 
        (campaign.lastQuarterlyProcessed.toDate ? campaign.lastQuarterlyProcessed.toDate() : new Date(campaign.lastQuarterlyProcessed)) : 
        null;
      
      const alreadyProcessed = lastQuarterlyProcessed && 
        lastQuarterlyProcessed.getFullYear() === transferDateOnly.getFullYear() &&
        lastQuarterlyProcessed.getMonth() === transferDateOnly.getMonth();

      console.log(`📅 Quarterly transfer check for campaign ${campaign.id}:`);
      console.log(`   • Completed quarters: ${currentCycle}/8`);
      console.log(`   • Completed months: ${monthsCompleted}/24 (need ${expectedMonthsForCurrentQuarter} for Q${currentCycle + 1})`);
      console.log(`   • Expected transfer date: ${transferDateOnly.toDateString()}`);
      console.log(`   • Today (PH): ${todayDateOnly.toDateString()}`);
      console.log(`   • Transfer due: ${todayDateOnly >= transferDateOnly}`);
      console.log(`   • Already processed: ${alreadyProcessed}`);
      console.log(`   • Total earnings available: ₱${formatAmount(campaign.totalEarnings || 0)}`);
      console.log(`   • Months requirement met: ${monthsCompleted >= expectedMonthsForCurrentQuarter}`);

      return todayDateOnly >= transferDateOnly && !alreadyProcessed && monthsCompleted >= expectedMonthsForCurrentQuarter;
    } catch (error) {
      console.error(`❌ Error checking quarterly transfer due for campaign ${campaign.id}:`, error);
      return false;
    }
  };

  const processMonthlyEarnings = async (campaign, userId) => {
    try {
      const campaignRef = doc(firestore, "users", userId, "threeMonths", campaign.id);
      
      const monthlyIncome = campaign.monthlyEarnings || calculateMonthlyIncome(campaign.amount, campaign.rate);
      const currentMonthsCompleted = campaign.monthsCompleted || 0;
      const newMonthsCompleted = currentMonthsCompleted + 1;
      
      // Determine new status
      let newStatus = campaign.status || 'Active';
      if (newMonthsCompleted >= 24) {
        newStatus = 'Completed';
      }

      // Get current Philippine time for tracking
      const philippineDate = getPhilippineTime();

      // Calculate new total earnings (add monthly income to totalEarnings)
      const newTotalEarnings = (campaign.totalEarnings || 0) + monthlyIncome;

      // Update campaign with new month count and total earnings
      const campaignUpdateData = {
        monthsCompleted: newMonthsCompleted,
        totalEarnings: newTotalEarnings,
        lastMonthlyProcessed: philippineDate,
        lastMonthlyAmount: monthlyIncome,
        status: newStatus
      };

      await updateDoc(campaignRef, campaignUpdateData);

      console.log(`✅ Monthly earnings processed for campaign ${campaign.id}:`);
      console.log(`   • Monthly income: ₱${formatAmount(monthlyIncome)}`);
      console.log(`   • Total earnings updated: ₱${formatAmount(newTotalEarnings)}`);
      console.log(`   • Completed months: ${currentMonthsCompleted}/24 → ${newMonthsCompleted}/24`);
      console.log(`   • Status: ${campaign.status || 'Active'} → ${newStatus}`);
      console.log(`   • Next quarter eligible at month: ${Math.ceil(newMonthsCompleted / 3) * 3}`);

      return true;
    } catch (error) {
      console.error(`❌ Error processing monthly earnings for campaign ${campaign.id}:`, error);
      return false;
    }
  };

  const processQuarterlyTransfer = async (campaign, userId) => {
    try {
      const campaignRef = doc(firestore, "users", userId, "threeMonths", campaign.id);
      const userRef = doc(firestore, "users", userId);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.error(`❌ User document not found: ${userId}`);
        return false;
      }

      const userData = userDoc.data();
      const currentBalance = userData.availBalanceAmount || 0;
      const amountToTransfer = campaign.totalEarnings || 0;
      const currentCycle = campaign.cycle || 0;
      const newCycle = currentCycle + 1;

      // Calculate next quarterly transfer date
      const initialDate = campaign.initialDate.toDate ? campaign.initialDate.toDate() : new Date(campaign.initialDate);
      const payoutDay = campaign.payoutDay;
      let nextTransferDate = new Date(initialDate);
      nextTransferDate.setMonth(nextTransferDate.getMonth() + ((newCycle + 1) * 3));
      nextTransferDate.setDate(payoutDay);

      // Handle edge cases for months with fewer days
      if (nextTransferDate.getDate() !== payoutDay) {
        nextTransferDate = new Date(nextTransferDate.getFullYear(), nextTransferDate.getMonth() + 1, 0);
      }

      // Determine new status
      let newStatus = campaign.status || 'Active';
      let finalAmount = amountToTransfer;
      let transactionDescription = `Quarterly transfer - 3 months earnings (Quarter ${newCycle})`;
      
      // If this is the final quarter (8th), also return the original amount
      if (newCycle >= 8) {
        newStatus = 'Completed';
        finalAmount += campaign.amount;
        transactionDescription = `Campaign completed - Final earnings + Principal return`;
      }
      
      // Transfer totalEarnings (and principal if completed) to user's availBalanceAmount
      const newBalance = currentBalance + finalAmount;
      await updateDoc(userRef, {
        availBalanceAmount: newBalance
      });

      // Create transaction record for this transfer
      await createQuarterlyTransaction(userId, finalAmount, campaign.id, newCycle, transactionDescription);

      // Get current Philippine time for tracking
      const philippineDate = getPhilippineTime();

      // Update campaign - reset totalEarnings to 0 after transfer
      const campaignUpdateData = {
        cycle: newCycle,
        status: newStatus,
        totalEarnings: 0, // Reset to 0 after transferring
        nextPayout: newStatus === 'Completed' ? null : nextTransferDate,
        lastQuarterlyProcessed: philippineDate,
        lastQuarterlyAmount: amountToTransfer
      };

      // Only update nextPayout if not completed (cycle < 8)
      if (newStatus !== 'Completed' && newCycle < 8) {
        campaignUpdateData.nextPayout = nextTransferDate;
      }

      await updateDoc(campaignRef, campaignUpdateData);

      console.log(`✅ Quarterly transfer processed for campaign ${campaign.id}:`);
      console.log(`   • Earnings transferred: ₱${formatAmount(amountToTransfer)}`);
      console.log(`   • Total earnings reset to: ₱0.00`);
      if (newStatus === 'Completed') {
        console.log(`   • Principal return: ₱${formatAmount(campaign.amount)}`);
        console.log(`   • Total amount transferred: ₱${formatAmount(finalAmount)}`);
      } else {
        console.log(`   • Amount transferred: ₱${formatAmount(finalAmount)}`);
      }
      console.log(`   • New balance: ₱${formatAmount(newBalance)} (was ₱${formatAmount(currentBalance)})`);
      console.log(`   • Completed quarters: ${currentCycle}/8 → ${newCycle}/8`);
      console.log(`   • Status: ${campaign.status || 'Active'} → ${newStatus}`);
      console.log(`   • Transaction: Created for tracking purposes`);
      if (newStatus !== 'Completed' && newCycle < 8) {
        console.log(`   • Next transfer: ${nextTransferDate.toDateString()}`);
      } else if (newCycle >= 8) {
        console.log(`   • All 8 quarters completed! 🎉`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error processing quarterly transfer for campaign ${campaign.id}:`, error);
      return false;
    }
  };

  const createQuarterlyTransaction = async (userId, amount, campaignId, quarter, customDescription = null) => {
    try {
      const philippineTime = getPhilippineTime();
      const transactionRef = collection(firestore, "users", userId, "transactions");
      
      const transactionData = {
        type: "Three Months Campaign Payout", // Money coming in
        category: "Three Month Campaign Transfer",
        amount: amount,
        description: customDescription || `Quarterly transfer - Quarter ${quarter}`,
        campaignId: campaignId,
        quarter: quarter,
        date: philippineTime,
        timestamp: philippineTime,
        status: "completed",
        source: "three_month_campaign_quarterly",
        // Additional metadata
        payoutQuarter: quarter,
        campaignRef: campaignId
      };

      await addDoc(transactionRef, transactionData);
      
      console.log(`📝 Transaction created for quarterly transfer:`);
      console.log(`   • Amount: ₱${formatAmount(amount)}`);
      console.log(`   • Campaign: ${campaignId}`);
      console.log(`   • Quarter: ${quarter}`);
      console.log(`   • Date: ${philippineTime.toDateString()}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error creating quarterly transaction:`, error);
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
          {/* Header with Three Month Campaign and Initial Date - Always Visible */}
          <TouchableOpacity 
            style={styles.cardHeader}
            onPress={() => toggleCardExpansion(campaign.id)}
            activeOpacity={0.7}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.investmentNumber, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "investmentTracker.threeMonth.campaignType")}
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
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.amount')}</Text>
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
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.rate')}</Text>
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
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.payoutDay')}</Text>
                     <Text style={styles.gridItemValue}>
                       Day {getPayoutDayNumber(campaign.initialDate)}
                     </Text>
                     <Text style={[styles.gridItemSubtext, getRTLStyles(userLanguage)]}>
                       {t(userLanguage, 'investmentTracker.threeMonth.subtexts.nextPayout')} {calculatePayoutDay(campaign.initialDate)}
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
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.expectedIncome')}</Text>
                     <Text style={styles.gridItemValue}>
                       ₱{formatAmount(campaign.expectedIncome || calculateExpectedIncome(campaign.amount, campaign.rate))}
                     </Text>
                     <Text style={[styles.gridItemSubtext, getRTLStyles(userLanguage)]}>
                       {t(userLanguage, 'investmentTracker.threeMonth.subtexts.perQuarter')}
                     </Text>
                   </View>
                 </View>
               </View>

               {/* Bottom Row - Completion Date, Status, Cycle, and Total Earnings */}
               <View style={styles.bottomRow}>
                 <View style={styles.gridItem}>
                   <View style={styles.gridItemContainer}>
                     <Ionicons 
                       name="flag" 
                       size={16} 
                       color={Colors.redTheme.background} 
                     />
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.completion')}</Text>
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
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.status')}</Text>
                     <Text style={[styles.gridItemValue, { color: getStatusColor(campaign.status) }]}>
                       {campaign.status || t(userLanguage, 'investmentTracker.threeMonth.status.active')}
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
                     <Text style={[styles.gridItemLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.progress')}</Text>
                     <Text style={styles.gridItemValue}>
                       Q{campaign.cycle || '0'}/8
                     </Text>
                     <Text style={styles.gridItemSubtext}>
                       M{campaign.monthsCompleted || '0'}/24
                     </Text>
                   </View>
                 </View>
               </View>

               {/* Total Earnings Row */}
               <View style={styles.totalEarningsRow}>
                 <View style={styles.totalEarningsContainer}>
                   <Ionicons 
                     name="trophy" 
                     size={20} 
                     color={Colors.redTheme.background} 
                   />
                   <Text style={[styles.totalEarningsLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.totalEarned')}</Text>
                   <Text style={styles.totalEarningsValue}>
                     ₱{formatAmount(campaign.totalEarnings || 0)}
                   </Text>
                 </View>
               </View>
             </>
           )}

          {/* Quick Summary - Always Visible */}
          {!isExpanded && (
            <View style={styles.quickSummary}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.amount')}</Text>
                <Text style={styles.summaryValue}>₱{formatAmount(campaign.amount)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.expected')}</Text>
                <Text style={styles.summaryValue}>₱{formatAmount(campaign.expectedIncome || calculateExpectedIncome(campaign.amount, campaign.rate))}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.status')}</Text>
                <Text style={[styles.summaryValue, { color: getStatusColor(campaign.status) }]}>
                  {campaign.status || t(userLanguage, 'investmentTracker.threeMonth.status.active')}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.threeMonth.labels.totalEarned')}</Text>
                <Text style={styles.summaryValue}>₱{formatAmount(campaign.totalEarnings || 0)}</Text>
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

    if (threeMonthCampaigns.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Ionicons name="wallet-outline" size={64} color={Colors.redTheme.background} />
            <Text style={[styles.emptyText, getRTLStyles(userLanguage)]}>{t(userLanguage, 'investmentTracker.common.emptyText')}</Text>
            <Text style={[styles.emptySubtext, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'investmentTracker.common.emptySubtextThreeMonth')}
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
        {threeMonthCampaigns.map((campaign, index) => renderInvestmentCard(campaign, index))}
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
            <Text style={[styles.pageTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "investmentTracker.threeMonth.title")}</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="trending-up" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "investmentTracker.threeMonth.title")}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "investmentTracker.threeMonth.subtitle")}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{threeMonthCampaigns.length}</Text>
                <Text style={styles.statLabel}>
                  {threeMonthCampaigns.length === 1 ? t(userLanguage, "investmentTracker.threeMonth.headerSubtitle") : t(userLanguage, "investmentTracker.threeMonth.headerSubtitlePlural")}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  ₱{formatAmount(threeMonthCampaigns.reduce((total, campaign) => total + (campaign.amount || 0), 0))}
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
  expandedContent: {
    marginTop: 10,
  },
  amountContainer: {
    backgroundColor: Colors.redTheme.background + '08',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.redTheme.background + '15',
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.8,
  },
  amountValue: {
    fontSize: 24,
    color: Colors.redTheme.background,
    fontWeight: 'bold',
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
    marginBottom: 8,
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
  totalEarningsRow: {
    marginTop: 8,
  },
  totalEarningsContainer: {
    backgroundColor: Colors.redTheme.background + '12',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.redTheme.background + '25',
  },
  totalEarningsLabel: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.9,
  },
  totalEarningsValue: {
    fontSize: 18,
    color: Colors.redTheme.background,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default ThreeMonthInvestmentTracker;
