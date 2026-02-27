import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { getOrCreateMainWallet, getTransactions } from "../../configs/api";
import type { TransactionDoc } from "../../configs/firebase";
import { auth, subscribeToTransactions } from "../../configs/firebase";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";

const TRANSACTION_TYPE_KEYS: Record<string, string> = {
  TOP_UP: "tx.deposit",
  PAYMENT: "tx.withdraw",
  TRANSFER_OUT: "tx.transfer",
  TRANSFER_IN: "tx.received",
  FEE: "tx.fee",
  REFUND: "tx.refund",
  TIME_DEPOSIT: "tx.timeDeposit",
};

const SPENT_TYPES = ["PAYMENT", "TRANSFER_OUT", "FEE"];
const INCOME_TYPES = ["TOP_UP", "TRANSFER_IN", "REFUND"];

interface Transaction {
  id: string;
  type?: string;
  amount?: number;
  description?: string;
  timestamp?: { toDate?: () => Date };
  createdAt?: string;
}

interface RawApiTransaction {
  id?: unknown;
  type?: unknown;
  amount?: unknown;
  createdAt?: unknown;
  description?: unknown;
}

interface RawApiWallet {
  id?: string;
  balance?: number | string;
}

const CURRENCY_SYMBOL = "₱";
const ORANGE_GRADIENT: readonly [string, string] = ["#E25A17", "#F28934"];

const DeleteIcon = ({
  color = "#FFF",
  size = 20,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const getTransactionTypeLabel = (type?: string) => {
    if (!type) return t("tx.transaction");
    const key = TRANSACTION_TYPE_KEYS[type];
    return key ? t(key) : type;
  };

  const getTransactionDisplayName = (tx: Transaction) => {
    if (tx.description === "Free Default Card")
      return t("history.freeDefaultCard");
    if (tx.description === "Created Account")
      return t("history.createdAccount");
    return tx.description || getTransactionTypeLabel(tx.type);
  };
  const headerPaddingTop =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight ?? 0, 12)
      : Math.max(insets.top, 12);
  const headerPaddingHorizontal = width < 375 ? 16 : 20;
  const dateInputPadding = width < 375 ? 8 : 10;
  const dateInputFontSize = width < 375 ? 13 : 14;
  const modalPadding = width < 375 ? 16 : 20;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (tx: Transaction) => {
    const date =
      tx.timestamp?.toDate?.() ??
      (tx.createdAt ? new Date(tx.createdAt) : null);
    if (!date) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const defaultTransactions: Transaction[] = [
    {
      id: "1",
      type: "TOP_UP",
      amount: 0,
      description: "Free Default Card",
      timestamp: { toDate: () => new Date("2026-02-12T14:56:00") },
      createdAt: "2026-02-12T14:56:00",
    },
    {
      id: "2",
      type: "TOP_UP",
      amount: 0,
      description: "Created Account",
      timestamp: { toDate: () => new Date("2008-02-10T16:30:00") },
      createdAt: "2008-02-10T16:30:00",
    },
  ];

  const filterTransactionsByDate = (txList: Transaction[]) => {
    if (!dateRange.start || !dateRange.end) {
      return txList;
    }

    return txList.filter((tx) => {
      const txDate = tx.timestamp?.toDate?.() ?? 
        (tx.createdAt ? new Date(tx.createdAt) : null);
      
      if (!txDate) return false;

      return txDate >= dateRange.start! && txDate <= dateRange.end!;
    });
  };

  const allTransactions = transactions.length > 0 ? transactions : defaultTransactions;
  const displayTransactions = filterTransactionsByDate(allTransactions);

  const totalSpent = displayTransactions
    .filter((tx) => SPENT_TYPES.includes(tx.type ?? ""))
    .reduce((sum, tx) => sum + Math.abs(tx.amount ?? 0), 0);

  const totalIncome = displayTransactions
    .filter((tx) => INCOME_TYPES.includes(tx.type ?? ""))
    .reduce((sum, tx) => sum + Math.abs(tx.amount ?? 0), 0);

  const getTransactionIcon = (tx: Transaction) => {
    if (tx.description?.toLowerCase().includes("card")) return "card-outline";
    if (tx.description?.toLowerCase().includes("account"))
      return "people-outline";
    return "swap-horizontal";
  };

  const fetchTransactions = useCallback(
    async (
      loadMore = false,
      currentCount = 0,
      startDate?: Date,
      endDate?: Date,
    ) => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setLoading(false);
        return;
      }

      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const { success, wallet } = await getOrCreateMainWallet(accessToken);
        const w = wallet as RawApiWallet | undefined;
        const walletId = w?.id;

        const queryParams: {
          walletId?: string;
          limit: number;
          startDate?: string;
          endDate?: string;
        } = {
          walletId,
          limit: loadMore ? currentCount + 20 : 20,
        };

        if (startDate) {
          queryParams.startDate = startDate.toISOString();
        }
        if (endDate) {
          queryParams.endDate = endDate.toISOString();
        }

        const txRes = await getTransactions(accessToken, queryParams);

        if (txRes.success && txRes.transactions) {
          const mapped: Transaction[] = (
            txRes.transactions as RawApiTransaction[]
          ).map((tx) => ({
            id: String(tx.id ?? ""),
            type: String(tx.type ?? ""),
            amount: (() => {
              const a = parseFloat(String(tx.amount ?? 0));
              return Number.isNaN(a) ? 0 : a;
            })(),
            description: String(tx.description ?? ""),
            timestamp: {
              toDate: () => new Date(String(tx.createdAt ?? "")),
            },
            createdAt: String(tx.createdAt ?? ""),
          }));

          setTransactions(mapped);
          setHasMore(mapped.length >= (loadMore ? currentCount + 20 : 20));
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        if (!loadMore) {
          setTransactions([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dateRange],
  );

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    const init = async () => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        await fetchTransactions();
        return;
      }
      const firebaseUser = auth?.currentUser;
      if (!firebaseUser) {
        setLoading(false);
        setTransactions([]);
        return;
      }
      unsub = subscribeToTransactions(
        firebaseUser.uid,
        (list: TransactionDoc[]) => {
          if (cancelled) return;
          const mapped: Transaction[] = list.map((d) => ({
            id: d.id,
            type: String(d.type ?? ""),
            amount: parseFloat(String(d.amount ?? 0)) || 0,
            description: String(d.description ?? ""),
            timestamp: {
              toDate: () =>
                d.createdAt?.toMillis
                  ? new Date(d.createdAt.toMillis())
                  : new Date(),
            },
            createdAt: d.createdAt?.toMillis
              ? new Date(d.createdAt.toMillis()).toISOString()
              : "",
          }));
          setTransactions(mapped);
          setLoading(false);
        },
      );
    };

    init();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const handleBack = () => {
    (navigation as unknown as NavProp).goBack();
  };

  const handleTransactionPress = (tx: Transaction) => {
    (navigation as unknown as NavProp).navigate("Main");
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const count =
        transactions.length > 0
          ? transactions.length
          : defaultTransactions.length;
      fetchTransactions(
        true,
        count,
        dateRange.start ?? undefined,
        dateRange.end ?? undefined,
      );
    }
  };

  const applyDateFilter = (filterType: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (filterType) {
      case "today":
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        );
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          0,
          0,
          0,
        );
        end = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59,
        );
        break;
      case "week":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "last7days":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "last30days":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        setShowFilterDropdown(false);
        setShowCustomDatePicker(true);
        return;
      case "all":
      default:
        start = null;
        end = null;
        break;
    }

    setDateRange({ start, end });
    setSelectedFilter(filterType);
    setShowFilterDropdown(false);
    setShowCustomDatePicker(false);
    fetchTransactions(false, 0, start ?? undefined, end ?? undefined);
  };

  const applyCustomDateRange = () => {
    if (!customStartDate || !customEndDate) {
      return;
    }

    const start = new Date(customStartDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      alert("Start date cannot be after end date");
      return;
    }

    setDateRange({ start, end });
    setSelectedFilter("custom");
    setShowFilterDropdown(false);
    setShowCustomDatePicker(false);
    fetchTransactions(false, 0, start, end);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#E25A17" />
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={ORANGE_GRADIENT}
          style={[
            styles.header,
            {
              paddingTop: headerPaddingTop,
              paddingHorizontal: headerPaddingHorizontal,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t("history.allTransactions")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowFilterDropdown((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons name="filter" size={20} color="#FFF" />
            </TouchableOpacity>
            {showFilterDropdown && (
              <View style={styles.filterDropdownMenu}>
                <Text style={styles.filterDropdownTitle}>Filter by Date</Text>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "all" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === "all" &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    All Time
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "today" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("today")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === "today" &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "week" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("week")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === "week" &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    This Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "month" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("month")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === "month" &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    This Month
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "custom" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("custom")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === "custom" &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    Custom Range
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <DeleteIcon color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {t("history.totalSpent").toUpperCase()}
              </Text>
              <Text style={styles.summaryValue}>
                {CURRENCY_SYMBOL} {formatCurrency(totalSpent)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {t("history.totalIncome").toUpperCase()}
              </Text>
              <Text style={styles.summaryValue}>
                {CURRENCY_SYMBOL} {formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {t("history.currentTransactions").toUpperCase()}
          </Text>

          {loading && transactions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E15816" />
            </View>
          ) : (
            <View style={styles.transactionList}>
              {displayTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={
                        getTransactionIcon(tx) as keyof typeof Ionicons.glyphMap
                      }
                      size={22}
                      color="#E15816"
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName}>
                      {getTransactionDisplayName(tx)}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDateTime(tx)}
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>
                    {CURRENCY_SYMBOL} {formatCurrency(tx.amount ?? 0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {displayTransactions.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              disabled={loadingMore || !hasMore}
              activeOpacity={0.7}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Text style={styles.loadMoreText}>
                  {t("history.loadMore").toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* filter modal removed; using dropdown menu anchored to filter icon */}

        <Modal
          visible={showCustomDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCustomDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCustomDatePicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.filterModal,
                  { padding: modalPadding },
                ]}
              >
                <Text style={styles.filterModalTitle}>Custom Date Range</Text>
                <View style={styles.customDateSection}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <TextInput
                      style={[
                        styles.dateInput,
                        {
                          padding: dateInputPadding,
                          fontSize: dateInputFontSize,
                        },
                      ]}
                      placeholder="YYYY-MM-DD"
                      value={customStartDate}
                      onChangeText={setCustomStartDate}
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <TextInput
                      style={[
                        styles.dateInput,
                        {
                          padding: dateInputPadding,
                          fontSize: dateInputFontSize,
                        },
                      ]}
                      placeholder="YYYY-MM-DD"
                      value={customEndDate}
                      onChangeText={setCustomEndDate}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.applyCustomButton}
                    onPress={applyCustomDateRange}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.applyCustomButtonText}>
                      Apply Filter
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
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
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  filterDropdownMenu: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  filterDropdownTitle: {
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#687076",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E15816",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  transactionList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#687076",
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E15816",
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 20,
    textAlign: "center",
  },
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  filterOptionSelected: {
    backgroundColor: "#FFF5F0",
    borderColor: "#E15816",
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#687076",
    textAlign: "center",
  },
  filterOptionTextSelected: {
    color: "#E15816",
    fontWeight: "600",
  },
  customDateSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  dateInputContainer: {
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#687076",
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    overflow: "hidden",
  },
  applyCustomButton: {
    backgroundColor: "#E15816",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  applyCustomButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
