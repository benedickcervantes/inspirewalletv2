import { StyleSheet, Text, View, ScrollView, Animated, Dimensions } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot, collection, query, where, updateDoc } from "firebase/firestore";

const { width, height } = Dimensions.get('window');

export default function Campaign() {
  const [campaignDeposit, setCampaignDeposit] = useState(0);
  const [campaignWallet, setAmountWallet] = useState(0);
  const [activeDeposits, setActiveDeposits] = useState([]);
  const [completedDeposits, setCompletedDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      setError(null);

      // Real-time listener for user data
      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, 
        (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            console.log("🔄 User data updated:", userData);
            // Note: campaignWallet will be calculated from active deposits
          }
        },
        (error) => {
          console.error("❌ Error fetching user data:", error);
          setError("Failed to load user data");
        }
      );

      // Real-time listener for specialCampaign deposits
      const specialCampaignRef = collection(firestore, "users", user.uid, "specialCampaign");
      const unsubscribeDeposits = onSnapshot(specialCampaignRef, 
        (querySnapshot) => {
          console.log("🔍 Fetching specialCampaign deposits...");
          console.log("📊 Total documents found:", querySnapshot.size);
          
          const activeDeposits = [];
          const completedDeposits = [];
          let totalActiveAmount = 0;
          let totalExpectedEarnings = 0;
          
          querySnapshot.forEach(async (docSnap) => {
            const data = docSnap.data();
            const deposit = {
              id: docSnap.id,
              ...data
            };
            
            // Calculate expectedEarnings (after 20% tax)
            if (data.amount && data.rate) {
              const grossEarnings = parseFloat(data.amount) * parseFloat(data.rate) / 100;
              const expectedEarnings = grossEarnings * 0.8; // 20% tax deduction

              // Only update if missing or different
              if (!data.expectedEarnings || Math.abs(data.expectedEarnings - expectedEarnings) > 0.01) {
                try {
                  await updateDoc(docSnap.ref, { expectedEarnings });
                  console.log(`Updated expectedEarnings for deposit ${docSnap.id}: ${expectedEarnings}`);
                } catch (err) {
                  console.error(`Failed to update expectedEarnings for deposit ${docSnap.id}:`, err);
                }
              }
            }

            // Separate active and completed deposits
            if (data.isActive === "Active") {
              activeDeposits.push(deposit);
              totalActiveAmount += parseFloat(data.amount || 0);
              // Calculate expected earnings for active deposits (after tax)
              if (data.amount && data.rate) {
                totalExpectedEarnings += (parseFloat(data.amount) * parseFloat(data.rate) / 100) * 0.8;
              }
            } else if (data.isActive === "Completed") {
              completedDeposits.push(deposit);
            }

            if (data.isActive === "Completed" && !data.completionDate) {
              try {
                await updateDoc(docSnap.ref, { completionDate: new Date() });
                console.log(`Set completionDate for deposit ${docSnap.id}`);
              } catch (err) {
                console.error(`Failed to set completionDate for deposit ${docSnap.id}:`, err);
              }
            }
          });
          
          console.log("✅ Active deposits found:", activeDeposits.length);
          console.log("✅ Completed deposits found:", completedDeposits.length);
          console.log("💰 Total active amount:", totalActiveAmount);
          console.log("💰 Total expected earnings:", totalExpectedEarnings);
          
          setActiveDeposits(activeDeposits);
          setCompletedDeposits(completedDeposits);
          setCampaignDeposit(totalActiveAmount);
          setAmountWallet(totalExpectedEarnings);
          
          // Update Firestore with calculated values
          const updateFirestoreValues = async () => {
            try {
              const userDocRef = doc(firestore, "users", user.uid);
              await updateDoc(userDocRef, {
                campaignDeposit: totalActiveAmount,
                campaignWallet: totalExpectedEarnings // already after 20% tax
              });
              console.log("✅ Updated Firestore with calculated values");
            } catch (error) {
              console.error("❌ Error updating Firestore:", error);
            }
          };
          
          updateFirestoreValues();
          setLoading(false);
          
          // Animate content when data loads
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
          console.error("❌ Error fetching deposits:", error);
          setError("Failed to load deposits");
          setLoading(false);
        }
      );

      return () => {
        unsubscribeUser();
        unsubscribeDeposits();
      };
    } else {
      setError("User not authenticated");
      setLoading(false);
    }
  }, []);

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatCurrencyWithDecimals = (amount, decimals = 5) => {
    return `₱${parseFloat(amount || 0).toFixed(decimals)}`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const formatContractType = (contractType) => {
    switch (contractType) {
      case "sixMonths":
        return "6 months";
      case "oneYear":
        return "1 year";
      case "twoYears":
        return "2 years";
      default:
        return contractType || "N/A";
    }
  };

  const formatContractDuration = (monthCycle) => {
    const months = parseInt(monthCycle, 10);
    if (isNaN(months)) return "N/A";
    if (months === 12) return "1 year";
    if (months === 24) return "2 years";
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    if (months > 12 && months < 24) return `1 year and ${months - 12} month${months - 12 > 1 ? 's' : ''}`;
    return `${months} months`;
  };

  const StatCard = ({ title, value }) => (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.statCardContainer}>
        <View style={styles.statCardContent}>
          <View style={styles.statTextContainer}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statValue}>{formatCurrency(value)}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const DepositCard = ({ deposit, isActive = true }) => (
    <Animated.View style={[styles.depositCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.depositCardContainer}>
        <View style={styles.depositCardHeader}>
          <View style={styles.depositIdContainer}>
            <Text style={styles.depositIdLabel}>Deposit #{deposit.id.slice(-8)}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            isActive ? styles.activeBadge : styles.completedBadge
          ]}>
            <Text style={styles.statusText}>
              {deposit.isActive || "Unknown"}
            </Text>
          </View>
        </View>
        
        <View style={styles.depositCardBody}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{formatCurrency(deposit.amount)}</Text>
          </View>
          
          {deposit.initialDate && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>{formatDate(deposit.initialDate)}</Text>
            </View>
          )}
          {/* End Date */}
          {deposit.completionDate && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailValue}>{formatDate(deposit.completionDate)}</Text>
            </View>
          )}
          
          {deposit.rate && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Investment Rate</Text>
              <Text style={styles.detailValue}>{deposit.rate}%</Text>
            </View>
          )}
          
          {/*
          {deposit.contractType && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Contract Type</Text>
              <Text style={styles.detailValue}>{formatContractType(deposit.contractType)}</Text>
            </View>
          )}
          */}
          {deposit.monthCycle && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Contract Duration</Text>
              <Text style={styles.detailValue}>{formatContractDuration(deposit.monthCycle)}</Text>
            </View>
          )}
          
          {deposit.expectedEarnings && deposit.monthCycle && (
            <>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Avg. Earnings/Minute</Text>
                <Text style={[styles.detailValue, styles.minuteEarningsValue]}>
                  {formatCurrencyWithDecimals(
                    (parseFloat(deposit.expectedEarnings) / parseFloat(deposit.monthCycle)) / (30.4375 * 24 * 60)
                  )}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Avg. Monthly Earnings</Text>
                <Text style={[styles.detailValue, styles.monthlyEarningsValue]}>
                  {formatCurrency(
                    parseFloat(deposit.expectedEarnings) / parseFloat(deposit.monthCycle)
                  )}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Expected Earnings (After Tax)</Text>
                <Text style={[styles.detailValue, styles.earningsValue]}>
                  {formatCurrency(
                    parseFloat(deposit.expectedEarnings)
                  )}
                </Text>
              </View>
              {/* Progress Bar Section */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarLabelRow}>
                  <Text style={styles.progressBarLabel}>Current Earnings</Text>
                  {/* You can display the current earnings value here when you implement it */}
                </View>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: '0%' }]} />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading campaign data...</Text>
          <View style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Campaign Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your investment performance</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard 
          title="Time Deposit"
          value={campaignDeposit}
        />
        <StatCard 
          title="Amount Wallet"
          value={campaignWallet}
        />
      </View>
      
      {/* Active Deposits Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Deposits ({activeDeposits.length})</Text>
        </View>
        
        {activeDeposits.length > 0 ? (
          activeDeposits.map((deposit) => (
            <DepositCard key={deposit.id} deposit={deposit} isActive={true} />
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No Active Deposits</Text>
              <Text style={styles.emptyStateSubtitle}>Start your investment journey today!</Text>
              <Text style={styles.debugText}>Debug: Checking users/{auth.currentUser?.uid}/specialCampaign</Text>
            </View>
          </View>
        )}
      </View>

      {/* Completed Deposits Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Completed Deposits ({completedDeposits.length})</Text>
        </View>
        
        {completedDeposits.length > 0 ? (
          completedDeposits.map((deposit) => (
            <DepositCard key={deposit.id} deposit={deposit} isActive={false} />
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No Completed Deposits</Text>
              <Text style={styles.emptyStateSubtitle}>Your completed investments will appear here</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: Math.max(40, height * 0.05),
  },
  headerContainer: {
    backgroundColor: Colors.redTheme.background,
    paddingVertical: Math.max(30, height * 0.04),
    paddingHorizontal: Math.max(20, width * 0.05),
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Math.max(28, width * 0.07),
    fontWeight: 'bold',
    color: Colors.redTheme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Math.max(16, width * 0.04),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: width > 600 ? 'row' : 'column',
    paddingHorizontal: Math.max(20, width * 0.05),
    marginTop: -20,
    marginBottom: 20,
    gap: Math.max(15, width * 0.04),
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: width > 600 ? 0 : 10,
  },
  statCardContainer: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 20,
    padding: Math.max(20, width * 0.05),
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
  },
  statCardContent: {
    alignItems: 'center',
  },
  statTextContainer: {
    alignItems: 'center',
  },
  statTitle: {
    fontSize: Math.max(14, width * 0.035),
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: Math.max(20, width * 0.05),
    fontWeight: 'bold',
    color: Colors.redTheme.text,
    textAlign: 'center',
  },
  sectionContainer: {
    marginHorizontal: Math.max(20, width * 0.05),
    marginBottom: 25,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: Math.max(22, width * 0.055),
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    textAlign: 'center',
  },
  depositCard: {
    marginBottom: 15,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  depositCardContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: Math.max(20, width * 0.05),
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
  },
  depositCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.redTheme.background,
    flexWrap: 'wrap',
  },
  depositIdContainer: {
    flex: 1,
    minWidth: width * 0.4,
  },
  depositIdLabel: {
    fontSize: Math.max(16, width * 0.04),
    fontWeight: 'bold',
    color: Colors.redTheme.background,
  },
  statusBadge: {
    paddingHorizontal: Math.max(12, width * 0.03),
    paddingVertical: Math.max(6, height * 0.008),
    borderRadius: 15,
  },
  activeBadge: {
    backgroundColor: '#28a745',
  },
  completedBadge: {
    backgroundColor: '#6c757d',
  },
  statusText: {
    fontSize: Math.max(12, width * 0.03),
    fontWeight: 'bold',
    color: 'white',
  },
  depositCardBody: {
    gap: Math.max(12, height * 0.015),
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: Math.max(14, width * 0.035),
    color: '#666',
    fontWeight: '500',
    flex: 1,
    minWidth: width * 0.3,
  },
  detailValue: {
    fontSize: Math.max(14, width * 0.035),
    color: Colors.redTheme.background,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
  },
  earningsValue: {
    color: '#ffd700',
    fontSize: Math.max(16, width * 0.04),
  },
  monthlyEarningsValue: {
    color: '#32cd32',
    fontSize: Math.max(14, width * 0.035),
  },
  minuteEarningsValue: {
    color: '#4169e1',
    fontSize: Math.max(12, width * 0.03),
  },
  emptyStateContainer: {
    marginTop: 10,
  },
  emptyStateCard: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 20,
    padding: Math.max(30, height * 0.04),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
  },
  emptyStateTitle: {
    fontSize: Math.max(18, width * 0.045),
    fontWeight: 'bold',
    color: Colors.redTheme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: Math.max(14, width * 0.035),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 10,
  },
  debugText: {
    fontSize: Math.max(12, width * 0.03),
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: Colors.redTheme.background,
    padding: Math.max(40, width * 0.1),
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
  },
  loadingText: {
    fontSize: Math.max(20, width * 0.05),
    fontWeight: 'bold',
    color: Colors.redTheme.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingSpinner: {
    width: Math.max(40, width * 0.1),
    height: Math.max(40, width * 0.1),
    borderRadius: Math.max(20, width * 0.05),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Math.max(20, width * 0.05),
  },
  errorCard: {
    backgroundColor: Colors.redTheme.background,
    padding: Math.max(40, width * 0.1),
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
  },
  errorText: {
    fontSize: Math.max(18, width * 0.045),
    fontWeight: 'bold',
    color: Colors.redTheme.text,
    textAlign: 'center',
  },
  progressBarContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  progressBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBarLabel: {
    fontSize: Math.max(13, width * 0.032),
    color: '#888',
    fontWeight: '500',
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    backgroundColor: '#32cd32',
    borderRadius: 5,
    width: '0%', // Default, update when you implement current earnings
  },
});
