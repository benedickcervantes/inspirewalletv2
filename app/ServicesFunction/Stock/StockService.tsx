import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStockInvestmentDepositRequests } from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import { isServiceUnderMaintenance } from "../../../lib/maintenance";

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

function formatCurrency(value: number | string, decimals: number = 2): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return num.toLocaleString("en-PH", { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

function formatStockCount(value: number): string {
  // Round to 4 decimal places
  const rounded = Math.round(value * 10000) / 10000;
  // Convert to string and remove trailing zeros
  const str = rounded.toFixed(4);
  const trimmed = str.replace(/\.?0+$/, '');
  // Add thousand separators if needed
  const parts = trimmed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export default function StockService() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

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
      // Check maintenance status when screen is focused
      const checkMaintenance = async () => {
        try {
          console.log("[StockService] Checking maintenance status...");
          const isMaintenance = await isServiceUnderMaintenance("stock");
          console.log("[StockService] Maintenance status:", isMaintenance);
          setIsUnderMaintenance(isMaintenance);
          if (isMaintenance) {
            console.log("[StockService] Stock is under maintenance, showing modal");
            setShowMaintenanceModal(true);
            setLoading(false);
            return;
          }
          // Only fetch data if not under maintenance
          console.log("[StockService] Stock is online, fetching data");
          setLoading(true);
          await fetchData();
        } catch (error) {
          console.error("Error checking maintenance:", error);
          setLoading(false);
        }
      };
      
      checkMaintenance();
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
  const stockCount = totalPortfolioValue / STOCK_RATE_PHP;

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
                ? t("stock.stockPurchase")
                : r.status === "PENDING"
                  ? t("stock.stockRequest")
                  : t("stock.stockRequestRejected"),
            date: formatTransactionDate(r.createdAt),
            amount: `-₱${formatCurrency(r.amount)}`,
          }))
      : [
          {
            id: "placeholder",
            label: t("stock.createdAccount"),
            date: "Jan 29. 2026",
            amount: "-₱0.00",
          },
        ];

  const handleBuy = () => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate("StockBuy");
  };

  const handleSell = () => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate("StockSell", {
      stockCount,
      totalPortfolioValue,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#E25A17", "#F28934"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("stock.title")}</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

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
                <Text style={styles.stockRateLabel}>{t("stock.stockRate")}</Text>
                <Text style={styles.stockRateValue}>
                  {t("stock.stockRateValue")}
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
                <Text style={styles.portfolioLabel}>{t("stock.yourPortfolio")}</Text>
                <Text style={styles.portfolioStocks}>
                  {formatStockCount(stockCount)} {stockCount !== 1 ? t("stock.stocks") : t("stock.stock")}
                </Text>
                <View style={styles.portfolioValueRow}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.portfolioValueLabel}>
                    {t("stock.totalPortfolioValue")}
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
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.buyButtonText}>{t("stock.buy")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sellButton}
                onPress={handleSell}
                activeOpacity={0.9}
              >
                <View style={styles.sellButtonIcon}>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.sellButtonText}>{t("stock.sell")}</Text>
              </TouchableOpacity>
            </View>

            {/* Transaction History Card */}
            <View style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Ionicons name="time-outline" size={22} color={THEME_COLOR} />
                <Text style={styles.transactionTitle}>{t("stock.transactionHistory")}</Text>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
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
    color: "#FFFFFF",
    fontWeight: "500",
  },
  portfolioValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#2E7D32",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 24,
    gap: 8,
  },
  buyButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  sellButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#C62828",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 24,
    gap: 8,
  },
  sellButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C62828",
    justifyContent: "center",
    alignItems: "center",
  },
  sellButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C62828",
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
