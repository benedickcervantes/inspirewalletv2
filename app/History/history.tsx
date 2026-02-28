import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

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
      timestamp: { toDate: () => new Date("2026-02-01T16:30:00") },
      createdAt: "2026-02-01T16:30:00",
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

  const allTransactions = transactions.length > 0 ? [...defaultTransactions, ...transactions] : defaultTransactions;
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
    if (isSelectMode) {
      setIsSelectMode(false);
      setSelectedIds(new Set());
    } else {
      (navigation as unknown as NavProp).goBack();
    }
  };

  const handleTransactionPress = (tx: Transaction) => {
    if (isSelectMode) {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(tx.id)) {
        newSelected.delete(tx.id);
      } else {
        newSelected.add(tx.id);
      }
      setSelectedIds(newSelected);
    } else {
      (navigation as unknown as NavProp).navigate("Main");
    }
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

  const handleDeleteClick = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedIds(new Set());
      setShowDeleteOptions(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setTransactions((prev) =>
      prev.filter((tx) => !selectedIds.has(tx.id))
    );
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setShowDeleteOptions(false);
  };

  const handleKeepSelected = () => {
    if (selectedIds.size === 0) return;
    setTransactions((prev) =>
      prev.filter((tx) => selectedIds.has(tx.id))
    );
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setShowDeleteOptions(false);
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
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
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

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setTempStartDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setCustomStartDate(formattedDate);
      if (Platform.OS === "android") {
        setShowStartDatePicker(false);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setTempEndDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setCustomEndDate(formattedDate);
      if (Platform.OS === "android") {
        setShowEndDatePicker(false);
      }
    }
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
          <Text style={styles.headerTitle}>
            {t("history.allTransactions")}
          </Text>
          <View style={styles.headerRight}>
            <View style={styles.filterDropdownContainer}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setShowFilterDropdown((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons name="filter" size={24} color="#FFF" />
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
                  <View style={styles.filterOptionContent}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === "all" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      All Time
                    </Text>
                    {selectedFilter === "all" && (
                      <Ionicons name="checkmark" size={18} color="#E15816" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "today" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("today")}
                >
                  <View style={styles.filterOptionContent}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === "today" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      Today
                    </Text>
                    {selectedFilter === "today" && (
                      <Ionicons name="checkmark" size={18} color="#E15816" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "week" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("week")}
                >
                  <View style={styles.filterOptionContent}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === "week" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      This Week
                    </Text>
                    {selectedFilter === "week" && (
                      <Ionicons name="checkmark" size={18} color="#E15816" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "month" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("month")}
                >
                  <View style={styles.filterOptionContent}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === "month" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      This Month
                    </Text>
                    {selectedFilter === "month" && (
                      <Ionicons name="checkmark" size={18} color="#E15816" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === "custom" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyDateFilter("custom")}
                >
                  <View style={styles.filterOptionContent}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === "custom" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      Custom Range
                    </Text>
                    {selectedFilter === "custom" && (
                      <Ionicons name="checkmark" size={18} color="#E15816" />
                    )}
                  </View>
                </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleDeleteClick}
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

          {isSelectMode && (
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() => {
                if (selectedIds.size === displayTransactions.length) {
                  setSelectedIds(new Set());
                } else {
                  const allIds = new Set(displayTransactions.map((tx) => tx.id));
                  setSelectedIds(allIds);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.selectAllButtonText}>
                {selectedIds.size === displayTransactions.length
                  ? "Deselect All"
                  : "Select All"}
              </Text>
            </TouchableOpacity>
          )}

          {loading && transactions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E15816" />
            </View>
          ) : (
            <View style={styles.transactionList}>
              {displayTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.transactionItem,
                    selectedIds.has(tx.id) && styles.transactionItemSelected,
                  ]}
                  onPress={() => handleTransactionPress(tx)}
                  activeOpacity={0.7}
                >
                  {isSelectMode && (
                    <View style={styles.checkbox}>
                      {selectedIds.has(tx.id) && (
                        <Ionicons name="checkmark" size={16} color="#E15816"/>
                      )}
                    </View>
                  )}
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
              <View style={styles.filterModal}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="calendar-outline" size={28} color="#E15816" />
                  </View>
                  <Text style={styles.filterModalTitle}>Select Date Range</Text>
                  <Text style={styles.filterModalSubtitle}>
                    Choose start and end dates for filtering
                  </Text>
                </View>
                <View style={styles.customDateSection}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => setShowStartDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#E15816" />
                      <Text style={[styles.dateInputText, !customStartDate && styles.dateInputPlaceholder]}>
                        {customStartDate || "Select start date"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#687076" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => setShowEndDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#E15816" />
                      <Text style={[styles.dateInputText, !customEndDate && styles.dateInputPlaceholder]}>
                        {customEndDate || "Select end date"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#687076" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.applyCustomButton}
                    onPress={applyCustomDateRange}
                    activeOpacity={0.8}
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

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={tempStartDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleStartDateChange}
            maximumDate={new Date()}
          />
        )}
        {showEndDatePicker && (
          <DateTimePicker
            value={tempEndDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleEndDateChange}
            maximumDate={new Date()}
            minimumDate={customStartDate ? new Date(customStartDate) : undefined}
          />
        )}

        {isSelectMode && selectedIds.size > 0 && (
          <Modal
            visible={showDeleteOptions}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDeleteOptions(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowDeleteOptions(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={[styles.filterModal, { padding: modalPadding }]}>
                  <Text style={styles.filterModalTitle}>
                    Delete {selectedIds.size} Transaction{selectedIds.size > 1 ? "s" : ""}?
                  </Text>
                  <Text style={styles.deleteModalSubtitle}>
                    Choose what to do with the selected transactions
                  </Text>
                  <View style={styles.deleteOptionsContainer}>
                    <TouchableOpacity
                      style={[styles.deleteOptionButton, styles.deleteButton]}
                      onPress={handleBulkDelete}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteOptionButtonText}>
                        Delete Selected
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteOptionButton, styles.keepButton]}
                      onPress={handleKeepSelected}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keepOptionButtonText}>
                        Keep Only Selected
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteOptionButton, styles.cancelButton]}
                      onPress={() => setShowDeleteOptions(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelOptionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {isSelectMode && selectedIds.size > 0 && (
          <View style={styles.deleteActionBar}>
            <Text style={styles.deleteActionBarText}>
              {selectedIds.size} selected
            </Text>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.deleteActionButton}
                onPress={() => {
                  handleKeepSelected();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.remainActionButtonText}>Remain</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteActionButton}
                onPress={() => setShowDeleteOptions(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteActionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
  filterDropdownContainer: {
    position: "relative",
  },
  filterDropdownMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 1000,
    minWidth: 180,
  },
  filterDropdownTitle: {
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    color: "#687076",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: "#FFF5F0",
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE5D9",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 4,
    textAlign: "center",
  },
  filterModalSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#687076",
    textAlign: "center",
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    marginHorizontal: 8,
    backgroundColor: "transparent",
  },
  filterOptionSelected: {
    backgroundColor: "#FFF5F0",
  },
  filterOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#11181C",
    flex: 1,
  },
  filterOptionTextSelected: {
    color: "#E15816",
    fontWeight: "600",
  },
  customDateSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#11181C",
    fontWeight: "500",
  },
  dateInputButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateInputText: {
    flex: 1,
    fontSize: 15,
    color: "#11181C",
    fontWeight: "500",
  },
  dateInputPlaceholder: {
    color: "#999",
    fontWeight: "400",
  },
  applyCustomButton: {
    backgroundColor: "#E15816",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyCustomButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E15816",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionItemSelected: {
    backgroundColor: "#FFF5F0",
  },
  selectAllButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: "#FFF5F0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E15816",
  },
  selectAllButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E15816",
  },
  deleteActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#E15816",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteActionBarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  deleteActionButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  remainActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: "#687076",
    marginBottom: 16,
    textAlign: "center",
  },
  deleteOptionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 8,
  },
  deleteOptionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#FF4444",
  },
  keepButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  deleteOptionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  keepOptionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelOptionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#687076",
  },
});
