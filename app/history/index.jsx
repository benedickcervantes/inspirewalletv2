import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      const q = query(transactionsRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);

      const fetchedTransactions = [];
      let spent = 0;
      let income = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        const amount = typeof data.amount === "number" ? data.amount : parseFloat(data.amount) || 0;

        fetchedTransactions.push({
          id: doc.id,
          type: data.type,
          date: date,
          amount: amount,
        });

        // Calculate totals
        if (isPositiveTransaction(data.type)) {
          income += Math.abs(amount);
        } else {
          spent += Math.abs(amount);
        }
      });

      setTransactions(fetchedTransactions);
      setTotalSpent(spent);
      setTotalIncome(income);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPositiveTransaction = (transactionType) => {
    if (!transactionType) return false;
    const type = transactionType.toLowerCase();
    return (
      type.includes('received') ||
      type.includes('deposit') ||
      type.includes('cash in') ||
      type.includes('earnings') ||
      type.includes('returned') ||
      type.includes('agent wallet transfer') ||
      type.includes('add') ||
      type.includes('added') ||
      type.includes('credit') ||
      type.includes('refund') ||
      type.includes('bonus') ||
      type.includes('reward') ||
      type.includes('stock transfer received')
    );
  };

  const getTransactionIcon = (type) => {
    if (!type) return "swap-horizontal";
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('card')) return "card";
    if (lowerType.includes('account') || lowerType.includes('created')) return "person-add";
    if (lowerType.includes('transfer')) return "arrow-forward";
    if (lowerType.includes('deposit')) return "arrow-down";
    if (lowerType.includes('withdraw')) return "arrow-up";
    if (lowerType.includes('payment')) return "cash";
    
    return "swap-horizontal";
  };

  const getDynamicFontSize = (amount) => {
    const formattedAmount = amount.toLocaleString("en-PH", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    const length = formattedAmount.length;
    
    // Adjust font size based on length
    if (length <= 8) return 24;      // e.g., "1,234.00"
    if (length <= 10) return 22;     // e.g., "12,345.00"
    if (length <= 12) return 20;     // e.g., "123,456.00"
    if (length <= 14) return 18;     // e.g., "1,234,567.00"
    if (length <= 16) return 16;     // e.g., "12,345,678.00"
    return 14;                       // Very large numbers
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#E15816" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="options" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={[styles.summaryValue, { fontSize: getDynamicFontSize(totalSpent) }]}>
                ₱{" "}
              </Text>
              <Text style={[styles.summaryValue, { fontSize: getDynamicFontSize(totalSpent) }]}>
                {totalSpent.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL INCOME</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={[styles.summaryValue, { fontSize: getDynamicFontSize(totalIncome) }]}>
                ₱{" "}
              </Text>
              <Text style={[styles.summaryValue, { fontSize: getDynamicFontSize(totalIncome) }]}>
                {totalIncome.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Transactions */}
        <Text style={styles.sectionTitle}>CURRENT TRANSACTIONS</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E15816" />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Ionicons 
                    name={getTransactionIcon(transaction.type)} 
                    size={24} 
                    color="#E15816" 
                  />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionTitle}>
                    {transaction.type || "Transaction"}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {transaction.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })} at {transaction.date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>
                  ₱ {Math.abs(transaction.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E15816",
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  summaryValue: {
    fontWeight: "700",
    color: "#E15816",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: "#999",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E15816",
  },
  bottomPadding: {
    height: 40,
  },
});
