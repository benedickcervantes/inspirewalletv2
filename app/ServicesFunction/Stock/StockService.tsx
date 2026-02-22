import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getStockInvestmentDepositRequests } from "../../../configs/api";

const THEME_COLOR = "#E15816";
const STOCK_RATE_PHP = 2_000_000;
const STOCK_RATE_FORMATTED = "2,000,000.00";

interface StockRequest {
  id: string;
  amount: string | number;
  status: string;
  createdAt?: string;
}

interface TransactionItem {
  id: string;
  label: string;
  date: string;
  amount: string;
}

function formatTransactionDate(isoDate?: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}. ${year}`;
}

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

export default function StockService() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      const res = await getStockInvestmentDepositRequests(accessToken);
      if (res.success && res.requests) {
        const items: StockRequest[] = (res.requests as Record<string, unknown>[]).map(
          (r) => {
            const amt = r.amount;
            const amount: string | number =
              typeof amt === "number"
                ? amt
                : typeof amt === "string"
                  ? amt
                  : Number(amt) || 0;
            return {
              id: String(r.id ?? ""),
              amount,
              status: String(r.status ?? ""),
              createdAt: r.createdAt as string | undefined,
            };
          }
        );
        setRequests(items);
      } else {
        setRequests([]);
      }
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const approvedRequests = requests.filter((r) => r.status === "APPROVED");
  const totalPortfolioValue = approvedRequests.reduce(
    (sum, r) => sum + (typeof r.amount === "string" ? parseFloat(r.amount) || 0 : Number(r.amount)),
    0
  );
  const stockCount = Math.floor(totalPortfolioValue / STOCK_RATE_PHP);

  const transactions: TransactionItem[] =
    requests.length > 0
      ? requests
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .map((r) => ({
            id: r.id,
            label:
              r.status === "APPROVED"
                ? "Stock Purchase"
                : r.status === "PENDING"
                  ? "Stock Request"
                  : "Stock Request (Rejected)",
            date: formatTransactionDate(r.createdAt),
            amount: `-₱${formatCurrency(r.amount)}`,
          }))
      : [
          {
            id: "placeholder",
            label: "Created Account",
            date: "Jan 29. 2026",
            amount: "-₱0.00",
          },
        ];

  const handleBuy = () => {
    navigation.navigate("stockinvestment" as never);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stockholder Dashboard</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={THEME_COLOR}
              />
            }
          >
            {/* Stock Rate Card */}
            <View style={styles.stockRateCard}>
              <LinearGradient
                colors={["#B8E0FF", "#F8FBFF"]}
                style={styles.stockRateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.stockRateIconCircle}>
                  <Text style={styles.stockRateIconText}>!</Text>
                </View>
                <Text style={styles.stockRateLabel}>Stock Rate</Text>
                <Text style={styles.stockRateValue}>
                  1 Stock = ₱{STOCK_RATE_FORMATTED}
                </Text>
              </LinearGradient>
            </View>

            {/* Portfolio Card */}
            <View style={styles.portfolioCard}>
              <LinearGradient
                colors={["#F28934", "#E25A17"]}
                style={styles.portfolioGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.portfolioIconWrapper}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.portfolioLabel}>Your Stock Portfolio</Text>
                <Text style={styles.portfolioStocks}>
                  {stockCount} Stock{stockCount !== 1 ? "s" : ""}
                </Text>
                <View style={styles.portfolioValueRow}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={22}
                    color="#000"
                  />
                  <Text style={styles.portfolioValueLabel}>
                    Total Portfolio Value
                  </Text>
                </View>
                <Text style={styles.portfolioValue}>
                  ₱{formatCurrency(totalPortfolioValue)}
                </Text>
              </LinearGradient>
            </View>

            {/* BUY / SELL Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.buyButton}
                onPress={handleBuy}
                activeOpacity={0.9}
              >
                <View style={styles.buyButtonIcon}>
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.buyButtonText}>BUY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sellButton}
                disabled
                activeOpacity={0.9}
              >
                <View style={styles.sellButtonIcon}>
                  <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.sellButtonTextWrap}>
                  <Text style={styles.sellButtonText}>SELL</Text>
                  <Text style={styles.sellComingSoon}>Coming soon</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Transaction History Card */}
            <View style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Ionicons name="time-outline" size={22} color={THEME_COLOR} />
                <Text style={styles.transactionTitle}>Transaction History</Text>
              </View>
              <View style={styles.transactionList}>
                {transactions.map((tx) => (
                  <View key={tx.id} style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      <MaterialCommunityIcons
                        name="swap-horizontal"
                        size={24}
                        color={THEME_COLOR}
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionName}>{tx.label}</Text>
                      <Text style={styles.transactionDate}>{tx.date}</Text>
                    </View>
                    <Text style={styles.transactionAmount}>{tx.amount}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 24 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  headerSpacer: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stockRateCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stockRateGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    flexWrap: "wrap",
  },
  stockRateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5BA3D0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stockRateIconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  stockRateLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  stockRateValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    width: "100%",
    marginTop: 8,
    marginLeft: 48,
  },
  portfolioCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  portfolioGradient: {
    padding: 24,
  },
  portfolioIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  portfolioLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  portfolioStocks: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  portfolioValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  portfolioValueLabel: {
    fontSize: 14,
    color: "rgba(0,0,0,0.8)",
    fontWeight: "500",
  },
  portfolioValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  buyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  buyButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sellButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C62828",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    opacity: 0.7,
  },
  sellButtonTextWrap: {
    alignItems: "flex-start",
  },
  sellButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  sellButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sellComingSoon: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  transactionCard: {
    backgroundColor: "#E8E8E8",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  transactionList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  transactionDate: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  bottomSpacing: {
    height: 24,
  },
});
