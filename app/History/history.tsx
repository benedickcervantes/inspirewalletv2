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
  View,
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
import CustomLoader from "../Loader/CustomLoader";

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
  const { t, language } = useLanguage();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
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
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "en" ? "en-PH" : language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (tx: Transaction) => {
    const date =
      tx.timestamp?.toDate?.() ??
      (tx.createdAt ? new Date(tx.createdAt) : null);
    if (!date) return "";
    return date.toLocaleString(language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : language === "ar" ? "ar-SA" : "en-US", {
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
      const txDate =
        tx.timestamp?.toDate?.() ??
        (tx.createdAt ? new Date(tx.createdAt) : null);

      if (!txDate) return false;

      return txDate >= dateRange.start! && txDate <= dateRange.end!;
    });
  };

  const allTransactions =
    transactions.length > 0
      ? [...defaultTransactions, ...transactions]
      : defaultTransactions;
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

          // Calculate total pages (estimate based on current data)
          const estimatedTotal = Math.ceil(mapped.length / itemsPerPage);
          setTotalPages(
            Math.max(
              estimatedTotal,
              currentPage + (mapped.length >= itemsPerPage ? 1 : 0),
            ),
          );
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
      // Load deleted IDs from AsyncStorage
      try {
        const savedDeletedIds = await AsyncStorage.getItem("deleted_transaction_ids");
        if (savedDeletedIds) {
          setDeletedIds(new Set(JSON.parse(savedDeletedIds)));
        }
      } catch (error) {
        console.error("Failed to load deleted IDs:", error);
      }

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

  // Save deleted IDs to AsyncStorage whenever they change
  useEffect(() => {
    const saveDeletedIds = async () => {
      try {
        await AsyncStorage.setItem(
          "deleted_transaction_ids",
          JSON.stringify([...deletedIds])
        );
      } catch (error) {
        console.error("Failed to save deleted IDs:", error);
      }
    };

    if (deletedIds.size > 0) {
      saveDeletedIds();
    }
  }, [deletedIds]);

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
      setShowDeleteOptions(newSelected.size > 0);
    } else {
      setSelectedTransaction(tx);
      setShowDetailModal(true);
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
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePageChange = (page: number) => {
    if (page === currentPage || loadingMore) return;

    setCurrentPage(page);
    const offset = (page - 1) * itemsPerPage;
    fetchTransactions(
      true,
      offset + itemsPerPage,
      dateRange.start ?? undefined,
      dateRange.end ?? undefined,
    );
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && hasMore) {
      handlePageChange(currentPage + 1);
    }
  };

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 3;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3);
      } else if (currentPage >= totalPages - 1) {
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }

    return pages;
  };

  const handleDeleteClick = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setTransactions((prev) => prev.filter((tx) => !selectedIds.has(tx.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleKeepSelected = () => {
    if (selectedIds.size === 0) return;
    setTransactions((prev) => prev.filter((tx) => selectedIds.has(tx.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
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
      alert(t("history.invalidDateRange"));
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

  if (loading && transactions.length === 0) {
    return <CustomLoader text={t("history.loading")} />;
  }

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
          <Text style={styles.headerTitle}>{t("history.allTransactions")}</Text>
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
                  <Text style={styles.filterDropdownTitle}>{t("history.filterByDate")}</Text>
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
                        {t("history.allTime")}
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
                        {t("history.today")}
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
                        {t("history.thisWeek")}
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
                        {t("history.thisMonth")}
                      </Text>
                      {selectedFilter === "month" && (
                        <Ionicons name="checkmark" size={18} color="#E15816" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedFilter === "custom" &&
                      styles.filterOptionSelected,
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
                        {t("history.customRange")}
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
                  const allIds = new Set(
                    displayTransactions.map((tx) => tx.id),
                  );
                  setSelectedIds(allIds);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.selectAllButtonText}>
                {selectedIds.size === displayTransactions.length
                  ? t("history.deselectAll")
                  : t("history.selectAll")}
              </Text>
            </TouchableOpacity>
          )}
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
                      <Ionicons name="checkmark" size={16} color="#E15816" />
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

          {displayTransactions.length > 0 &&
            !hasMore &&
            currentPage >= totalPages && (
              <View style={styles.endOfListContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.endOfListText}>{t("history.allLoaded")}</Text>
              </View>
            )}
        </ScrollView>

        {/* Pagination Bar - Fixed at Bottom */}
        {displayTransactions.length > 0 && (
          <View style={styles.paginationContainer}>
            <View style={styles.paginationRow}>
              <Text style={styles.paginationResultText}>
                {t("history.resultText")
                  .replace("{count}", String(displayTransactions.length))
                  .replace(
                    "{total}",
                    String(
                      transactions.length > 0
                        ? transactions.length
                        : displayTransactions.length,
                    ),
                  )}
              </Text>

              <View style={styles.paginationButtons}>
                {/* Previous Button */}
                <TouchableOpacity
                  style={[
                    styles.paginationArrow,
                    currentPage === 1 && styles.paginationArrowDisabled,
                  ]}
                  onPress={handlePreviousPage}
                  disabled={currentPage === 1 || loadingMore}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={currentPage === 1 ? "#CCC" : "#687076"}
                  />
                </TouchableOpacity>

                {/* Page Numbers */}
                {getVisiblePages().map((page, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pageButton,
                      page === currentPage && styles.pageButtonActive,
                    ]}
                    onPress={() =>
                      typeof page === "number" && handlePageChange(page)
                    }
                    disabled={loadingMore || page === currentPage}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pageButtonText,
                        page === currentPage && styles.pageButtonTextActive,
                      ]}
                    >
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Next Button */}
                <TouchableOpacity
                  style={[
                    styles.paginationArrow,
                    (!hasMore || currentPage >= totalPages) &&
                    styles.paginationArrowDisabled,
                  ]}
                  onPress={handleNextPage}
                  disabled={
                    !hasMore || currentPage >= totalPages || loadingMore
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      !hasMore || currentPage >= totalPages ? "#CCC" : "#687076"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>

            {loadingMore && (
              <View style={styles.paginationLoading}>
                <ActivityIndicator size="small" color="#E15816" />
                <Text style={styles.paginationLoadingText}>Loading...</Text>
              </View>
            )}
          </View>
        )}

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
                    <Ionicons
                      name="calendar-outline"
                      size={28}
                      color="#E15816"
                    />
                  </View>
                  <Text style={styles.filterModalTitle}>{t("history.selectDateRange")}</Text>
                  <Text style={styles.filterModalSubtitle}>
                    {t("history.chooseDatesSubtitle")}
                  </Text>
                </View>
                <View style={styles.customDateSection}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>{t("history.startDate")}</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => setShowStartDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#E15816"
                      />
                      <Text
                        style={[
                          styles.dateInputText,
                          !customStartDate && styles.dateInputPlaceholder,
                        ]}
                      >
                        {customStartDate || t("history.selectStartDate")}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#687076" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>{t("history.endDate")}</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => setShowEndDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#E15816"
                      />
                      <Text
                        style={[
                          styles.dateInputText,
                          !customEndDate && styles.dateInputPlaceholder,
                        ]}
                      >
                        {customEndDate || t("history.selectEndDate")}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#687076" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.applyCustomButton}
                    onPress={applyCustomDateRange}
                    activeOpacity={0.8}
                  >
                    {t("history.applyFilter")}
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
            minimumDate={
              customStartDate ? new Date(customStartDate) : undefined
            }
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
                    {t("history.deleteTransactionsTitle")
                      .replace("{count}", String(selectedIds.size))
                      .replace("{s}", selectedIds.size > 1 ? "s" : "")}
                  </Text>
                  <Text style={styles.deleteModalSubtitle}>
                    {t("history.deleteModalSubtitle")}
                  </Text>
                  <View style={styles.deleteOptionsContainer}>
                    <TouchableOpacity
                      style={[styles.deleteOptionButton, styles.deleteButton]}
                      onPress={handleBulkDelete}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteOptionButtonText}>
                        {t("history.deleteSelected")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteOptionButton, styles.keepButton]}
                      onPress={handleKeepSelected}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keepOptionButtonText}>
                        {t("history.keepOnlySelected")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteOptionButton, styles.cancelButton]}
                      onPress={() => setShowDeleteOptions(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelOptionButtonText}>{t("common.cancel")}</Text>
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
              {t("history.selectedCount").replace("{count}", String(selectedIds.size))}
            </Text>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.deleteActionButton}
                onPress={() => {
                  handleKeepSelected();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.remainActionButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteActionButton}
                onPress={() => handleBulkDelete()}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteActionButtonText}>{t("common.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Transaction Detail Modal */}
        <Modal
          visible={showDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.detailModalOverlay}>
            <View style={styles.detailModalContainer}>
              <View style={styles.detailModalHeader}>
                <View style={styles.detailModalIconContainer}>
                  <Ionicons
                    name={selectedTransaction ? getTransactionIcon(selectedTransaction) as keyof typeof Ionicons.glyphMap : "swap-horizontal"}
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.detailModalTitle}>{t("history.transactionDetails")}</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailAmountContainer}>
                  <Text style={styles.detailAmountLabel}>{t("history.amount")}</Text>
                  <Text style={styles.detailAmountValue}>
                    {CURRENCY_SYMBOL} {formatCurrency(selectedTransaction?.amount ?? 0)}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>{t("history.type")}</Text>
                  <Text style={styles.detailInfoValue}>
                    {selectedTransaction ? getTransactionTypeLabel(selectedTransaction.type) : "-"}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>{t("history.description")}</Text>
                  <Text style={styles.detailInfoValue}>
                    {selectedTransaction ? getTransactionDisplayName(selectedTransaction) : "-"}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>{t("history.dateTime")}</Text>
                  <Text style={styles.detailInfoValue}>
                    {selectedTransaction ? formatDateTime(selectedTransaction) : "-"}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>{t("history.id")}</Text>
                  <Text style={[styles.detailInfoValue, styles.detailInfoValueMono]}>
                    {selectedTransaction?.id ?? "-"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.detailModalCloseButton}
                  onPress={() => setShowDetailModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailModalCloseButtonText}>{t("common.close")}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
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
  paginationContainer: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
  },
  paginationResultText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#687076",
  },
  paginationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paginationArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationArrowDisabled: {
    opacity: 0.3,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  pageButtonActive: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E15816",
  },
  pageButtonText: {
    fontSize: 14,
    color: "#687076",
    fontWeight: "500",
  },
  pageButtonTextActive: {
    color: "#E15816",
    fontWeight: "700",
  },
  pageNumberContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
    minWidth: 80,
    alignItems: "center",
  },
  pageNumberText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#11181C",
    letterSpacing: 0.5,
  },
  paginationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  paginationLoadingText: {
    fontSize: 12,
    color: "#687076",
    fontWeight: "500",
  },
  endOfListContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
    marginTop: 8,
  },
  endOfListText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#10B981",
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
  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  detailModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  detailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  detailModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginLeft: 12,
  },
  detailModalContent: {
    padding: 16,
  },
  detailAmountContainer: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  detailAmountLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#687076",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailAmountValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E15816",
  },
  detailInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  detailInfoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  detailInfoValueMono: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
  },
  detailModalCloseButton: {
    backgroundColor: "#E15816",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  detailModalCloseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
