import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
    deleteTransactions,
  getStockInvestmentDepositRequests,
  getTimeDeposits,
  getTopUpDepositRequests,
    getTransactions,
} from "../../configs/api";
import type { TransactionDoc } from "../../configs/firebase";
import { auth, subscribeToTransactions } from "../../configs/firebase";
import { getLanguageCode } from "../../constants/locales";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";

import ActivityModal from '../components/ActivityModal';
const TRANSACTION_TYPE_KEYS: Record<string, string> = {
  TOP_UP: "tx.deposit",
  PAYMENT: "tx.withdraw",
  TRANSFER_OUT: "tx.transfer",
  TRANSFER_IN: "tx.received",
  FEE: "tx.fee",
  REFUND: "tx.refund",
  TIME_DEPOSIT: "tx.timeDeposit",
  TIME_DEPOSIT_DIVIDEND: "tx.timeDepositDividend",
  TIME_DEPOSIT_PRINCIPAL_RETURN: "tx.timeDepositPrincipalReturn",
  AGENT_COMMISSION: "tx.agentCommission",
  CARD_PURCHASE: "tx.cardPurchase",
  CARD_SUBSCRIPTION: "tx.cardSubscription",
  STOCK_BUY: "tx.stockBuy",
  STOCK_SELL: "tx.stockSell",
  PLAN_SUBSCRIPTION_PAYMENT: "tx.planSubscriptionPayment",
  PLAN_SUBSCRIPTION_CASHBACK: "tx.planSubscriptionCashback",
  TRAVEL_PROTECTION: "tx.travelProtection",
  TRAVEL_PROTECTION_FEE: "tx.travelProtection",
};

const SPENT_TYPES = [
  "PAYMENT",
  "TRANSFER_OUT",
  "FEE",
  "TIME_DEPOSIT",
  "CARD_PURCHASE",
  "CARD_SUBSCRIPTION",
  "STOCK_BUY",
  "PLAN_SUBSCRIPTION_PAYMENT",
  "TRAVEL_PROTECTION",
  "TRAVEL_PROTECTION_FEE",
];
const INCOME_TYPES = [
  "TOP_UP",
  "TRANSFER_IN",
  "REFUND",
  "TIME_DEPOSIT_DIVIDEND",
  "TIME_DEPOSIT_PRINCIPAL_RETURN",
  "AGENT_COMMISSION",
  "STOCK_SELL",
  "PLAN_SUBSCRIPTION_CASHBACK",
];

const TRANSACTION_DESCRIPTION_KEYS: Record<string, string> = {
  "Free Default Card": "history.freeDefaultCard",
  "Created Account": "history.createdAccount",
  "Physical Card Application Fee": "history.physicalCardApplicationFee",
  "Plan Subscription Commission": "history.planSubscriptionCommission",
  "Withdrawal Requested": "history.withdrawalRequested",
  "Withdrawal Approved": "history.withdrawalApproved",
  "Withdrawal Rejected": "history.withdrawalRejected",
  "Stock Investment Requested": "history.stockInvestmentRequested",
  "Stock Investment Approved": "history.stockInvestmentApproved",
  "Stock Investment Rejected": "history.stockInvestmentRejected",
  "Gold Elite monthly subscription renewal":
    "history.goldEliteMonthlySubscriptionRenewal",
  "Gold Elite monthly subscription (first month)":
    "history.goldEliteMonthlySubscriptionFirstMonth",
  "Time deposit approved - request amount top-up":
    "history.timeDepositApprovedTopUp",
  "Time deposit approved – request amount top-up":
    "history.timeDepositApprovedTopUp",
};

const CARD_DESIGN_KEYS: Record<string, string> = {
  ORANGE_ELITE: "ct.orangeElite",
  ROYAL_CURVE: "ct.royalCurve",
  DIAMOND_ELITE: "ct.diamondElite",
  GOLD_ELITE: "ct.goldElite",
};

interface Transaction {
  id: string;
  type?: string;
  amount?: number;
  status?: string;
  description?: string;
  timestamp?: { toDate?: () => Date };
  createdAt?: string;
  senderName?: string;
  senderAccount?: string;
  recipientName?: string;
  recipientAccount?: string;
}

interface StoredTransferReceiptDetails {
  senderName?: string;
  senderAccount?: string;
  recipientName?: string;
  recipientAccount?: string;
  updatedAt?: number;
}

interface RawApiTransaction {
  id?: unknown;
  type?: unknown;
  amount?: unknown;
  status?: unknown;
  requestStatus?: unknown;
  request_status?: unknown;
  createdAt?: unknown;
  description?: unknown;
  senderName?: unknown;
  senderAccount?: unknown;
  senderAccountNumber?: unknown;
  recipientName?: unknown;
  recipientAccount?: unknown;
  recipientAccountNumber?: unknown;
  fromName?: unknown;
  fromAccount?: unknown;
  fromAccountNumber?: unknown;
  toName?: unknown;
  toAccount?: unknown;
  toAccountNumber?: unknown;
  sender?: { name?: unknown; accountNumber?: unknown };
  recipient?: { name?: unknown; accountNumber?: unknown };
  receiver?: { name?: unknown; accountNumber?: unknown };
  fromUser?: { fullName?: unknown; accountNumber?: unknown };
  toUser?: { fullName?: unknown; accountNumber?: unknown };
}

interface RawApiWallet {
  id?: string;
  balance?: number | string;
}

interface RawDepositRequestLike {
  id?: unknown;
  amount?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  requestType?: unknown;
  contractType?: unknown;
  contractPeriod?: unknown;
  type?: unknown;
  description?: unknown;
}

const CURRENCY_SYMBOL = "₱";
const ORANGE_GRADIENT: readonly [string, string] = ["#E25A17", "#F28934"];
const ITEMS_PER_PAGE = 10; // moved outside component

const normalizeTextValue = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") {
    return "";
  }
  return text;
};

const pickFirstText = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeTextValue(value);
    if (normalized) return normalized;
  }
  return "";
};

const resolveTransferParties = (
  raw: Record<string, unknown>,
): Pick<Transaction, "senderName" | "senderAccount" | "recipientName" | "recipientAccount"> => {
  const senderObj = (raw.sender as Record<string, unknown> | undefined) || {};
  const recipientObj =
    (raw.recipient as Record<string, unknown> | undefined) ||
    (raw.receiver as Record<string, unknown> | undefined) ||
    {};
  const fromUser = (raw.fromUser as Record<string, unknown> | undefined) || {};
  const toUser = (raw.toUser as Record<string, unknown> | undefined) || {};

  return {
    senderName: pickFirstText(
      raw.senderName,
      raw.fromName,
      senderObj.name,
      fromUser.fullName,
    ),
    senderAccount: pickFirstText(
      raw.senderAccount,
      raw.senderAccountNumber,
      raw.fromAccount,
      raw.fromAccountNumber,
      senderObj.accountNumber,
      fromUser.accountNumber,
    ),
    recipientName: pickFirstText(
      raw.recipientName,
      raw.toName,
      recipientObj.name,
      toUser.fullName,
    ),
    recipientAccount: pickFirstText(
      raw.recipientAccount,
      raw.recipientAccountNumber,
      raw.toAccount,
      raw.toAccountNumber,
      recipientObj.accountNumber,
      toUser.accountNumber,
    ),
  };
};

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
  const languageCode = getLanguageCode(language);

  const localeByLanguageCode: Record<string, string> = {
    en: "en-PH",
    ko: "ko-KR",
    ja: "ja-JP",
    ar: "ar-SA",
  };

  const locale = localeByLanguageCode[languageCode] ?? "en-PH";

  const getTransactionTypeLabel = (type?: string) => {
    if (!type) return t("tx.transaction");
    const key = TRANSACTION_TYPE_KEYS[type];
    if (key) return t(key);
    return type
      .toLowerCase()
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const getTranslatedDescription = (description?: string) => {
    const getTranslatedCardDesign = (designRaw?: string) => {
      if (!designRaw) return "";
      const normalizedDesign = designRaw
        .trim()
        .replace(/[-\s]+/g, "_")
        .replace(/__+/g, "_")
        .toUpperCase();
      const designKey = CARD_DESIGN_KEYS[normalizedDesign];
      if (designKey) return t(designKey);
      return designRaw
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    };

    if (!description) return null;

    const normalized = description.trim();
    if (!normalized) return null;

    const exactKey = TRANSACTION_DESCRIPTION_KEYS[normalized];
    if (exactKey) return t(exactKey);

    // Travel protection fee (e.g. "Travel Protection Fee - Application ABC123")
    const travelProtectionFeeMatch = normalized.match(
      /^Travel Protection Fee - Application\s+(.+)$/i,
    );
    if (travelProtectionFeeMatch?.[1]) {
      return t("history.travelProtectionFee", {
        applicationId: travelProtectionFeeMatch[1].trim(),
      });
    }

    // Approved plan subscription (e.g. "Approved Plan Subscription: Gold Elite (85% Trading Deposit)")
    const approvedPlanSubscriptionMatch = normalized.match(
      /^Approved Plan Subscription:\s*(.+?)\s*\(85% Trading Deposit\)$/i,
    );
    if (approvedPlanSubscriptionMatch?.[1]) {
      return t("history.approvedPlanSubscription", {
        planName: approvedPlanSubscriptionMatch[1].trim(),
      });
    }

    // Admin-approved stock sold (e.g. "Stock sold (admin approved): 10 stocks")
    const stockSoldAdminApprovedMatch = normalized.match(
      /^Stock sold \(admin approved\):\s*(.+?)\s+stocks?$/i,
    );
    if (stockSoldAdminApprovedMatch?.[1]) {
      return t("history.stockSoldAdminApproved", {
        count: stockSoldAdminApprovedMatch[1].trim(),
      });
    }

    const topUpApprovedMatch = normalized.match(
      /^Top[- ]up approved:\s*request\s+(.+)$/i,
    );
    if (topUpApprovedMatch?.[1]) {
      return t("history.topUpApprovedRequest", {
        requestId: topUpApprovedMatch[1].trim(),
      });
    }

    const agentCommissionMatch = normalized.match(
      /^Agent commission from time deposit\s+(.+)$/i,
    );
    if (agentCommissionMatch?.[1]) {
      return t("history.agentCommissionFromTimeDeposit", {
        id: agentCommissionMatch[1].trim(),
      });
    }

    const stockPurchaseListingMatch = normalized.match(
      /^Stock purchase:\s*listing\s+(.+)$/i,
    );
    if (stockPurchaseListingMatch?.[1]) {
      return t("history.stockPurchaseListing", {
        listingId: stockPurchaseListingMatch[1].trim(),
      });
    }

    const stockSaleListingMatch = normalized.match(
      /^Stock sale:\s*listing\s+(.+)$/i,
    );
    if (stockSaleListingMatch?.[1]) {
      return t("history.stockSaleListing", {
        listingId: stockSaleListingMatch[1].trim(),
      });
    }

    const stockSoldListingMatch = normalized.match(
      /^Stock sold:\s*listing\s+(.+)$/i,
    );
    if (stockSoldListingMatch?.[1]) {
      return t("history.stockSoldListing", {
        listingId: stockSoldListingMatch[1].trim(),
      });
    }

    const stockPurchasedListingMatch = normalized.match(
      /^Stock purchased:\s*listing\s+(.+)$/i,
    );
    if (stockPurchasedListingMatch?.[1]) {
      return t("history.stockPurchasedListing", {
        listingId: stockPurchasedListingMatch[1].trim(),
      });
    }

    const stockInvestmentApprovedRequestMatch = normalized.match(
      /^Stock\s+investment\s+approved:\s*request\s+(.+)$/i,
    );
    if (stockInvestmentApprovedRequestMatch?.[1]) {
      return `${t("history.stockInvestmentApproved")}: ${stockInvestmentApprovedRequestMatch[1].trim()}`;
    }

    const topUpApprovedRequestMatch = normalized.match(
      /^Top[- ]?up\s+approved:\s*request\s+(.+)$/i,
    );
    if (topUpApprovedRequestMatch?.[1]) {
      return t("history.topUpApprovedRequest", {
        requestId: topUpApprovedRequestMatch[1].trim(),
      });
    }

    // Handle backend text variations for stock investment and withdrawal statuses.
    if (
      /stock\s*investment/i.test(normalized) &&
      /\brequest(ed)?\b/i.test(normalized) &&
      !/\bapproved\b/i.test(normalized) &&
      !/\brejected\b/i.test(normalized)
    ) {
      return t("history.stockInvestmentRequested");
    }
    if (
      /stock\s*investment/i.test(normalized) &&
      /\bapproved\b/i.test(normalized)
    ) {
      return t("history.stockInvestmentApproved");
    }
    if (
      /stock\s*investment/i.test(normalized) &&
      /\brejected\b/i.test(normalized)
    ) {
      return t("history.stockInvestmentRejected");
    }

    if (
      /\bwithdrawal\b/i.test(normalized) &&
      /\brequest(ed)?\b/i.test(normalized) &&
      !/\bapproved\b/i.test(normalized) &&
      !/\brejected\b/i.test(normalized)
    ) {
      return t("history.withdrawalRequested");
    }
    if (
      /\bwithdrawal\b/i.test(normalized) &&
      /\bapproved\b/i.test(normalized)
    ) {
      return t("history.withdrawalApproved");
    }
    if (
      /\bwithdrawal\b/i.test(normalized) &&
      /\brejected\b/i.test(normalized)
    ) {
      return t("history.withdrawalRejected");
    }

    const cardPurchaseMatch = normalized.match(/^(.+)\s+card purchase$/i);
    if (cardPurchaseMatch?.[1]) {
      return t("history.cardPurchaseDesign", {
        design: getTranslatedCardDesign(cardPurchaseMatch[1]),
      });
    }

    const normalizedTypeToken = normalized
      .replace(/[-\s]+/g, "_")
      .replace(/__+/g, "_")
      .toUpperCase();
    if (TRANSACTION_TYPE_KEYS[normalizedTypeToken]) {
      return getTransactionTypeLabel(normalizedTypeToken);
    }

    return null;
  };

  const getTransactionDisplayName = (tx: Transaction) => {
    const translated = getTranslatedDescription(tx.description);
    if (translated) return translated;
    const rawDescription = tx.description?.trim();
    if (rawDescription && !/^(n\/a|na|null|undefined|-)$/i.test(rawDescription)) {
      return rawDescription;
    }
    return getTransactionTypeLabel(tx.type);
  };

  const contentBottomPadding = Math.max(insets.bottom, 16);
  const isSmallWidth = width < 340;
  const headerPaddingHorizontal = width < 375 ? 16 : 20;
  const modalPadding = width < 375 ? 16 : 20;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [transferReceiptMap, setTransferReceiptMap] = useState<
    Record<string, StoredTransferReceiptDetails>
  >({});
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Ref for unsubscribe function to avoid stale closure
  const unsubRef = useRef<(() => void) | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (tx: Transaction) => {
    const date =
      tx.timestamp?.toDate?.() ??
      (tx.createdAt ? new Date(tx.createdAt) : null);
    if (!date) return "";
    return date.toLocaleString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filterTransactionsByDate = (txList: Transaction[]) => {
    if (!dateRange.start || !dateRange.end) return txList;
    return txList.filter((tx) => {
      const txDate =
        tx.timestamp?.toDate?.() ??
        (tx.createdAt ? new Date(tx.createdAt) : null);
      if (!txDate) return false;
      return txDate >= dateRange.start! && txDate <= dateRange.end!;
    });
  };

  const allTransactions = transactions;
  const displayTransactions = filterTransactionsByDate(allTransactions);
  const totalPagesCount = Math.max(
    1,
    Math.ceil(displayTransactions.length / ITEMS_PER_PAGE),
  );
  const paginatedTransactions = displayTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

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

  const loadStoredTransferReceiptDetails = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("transfer_receipt_details_by_txid");
      if (!raw) {
        setTransferReceiptMap({});
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setTransferReceiptMap({});
        return;
      }
      setTransferReceiptMap(parsed as Record<string, StoredTransferReceiptDetails>);
    } catch {
      setTransferReceiptMap({});
    }
  }, []);

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
        const queryParams: {
          walletId?: string;
          limit: number;
          startDate?: string;
          endDate?: string;
        } = {
          // Fetch a broad history scope instead of a single wallet-only feed.
          // Time deposit requests/updates may not be tied to main walletId.
          limit: 500,
        };

        if (startDate) queryParams.startDate = startDate.toISOString();
        if (endDate) queryParams.endDate = endDate.toISOString();

        const txRes = await getTransactions(accessToken, queryParams);
        const [topUpRes, timeDepositRes, stockRes] = await Promise.all([
          getTopUpDepositRequests(accessToken),
          getTimeDeposits(accessToken),
          getStockInvestmentDepositRequests(accessToken),
        ]);

        // ✅ Ensure transactions is an array before mapping
        if (txRes.success && Array.isArray(txRes.transactions)) {
          const mappedApiTransactions: Transaction[] = (
            txRes.transactions as RawApiTransaction[]
          ).map((tx) => {
            const parties = resolveTransferParties(tx as unknown as Record<string, unknown>);
            return {
              id: String(tx.id ?? ""),
              type: String(tx.type ?? ""),
              amount: (() => {
              const a = parseFloat(String(tx.amount ?? 0));
              return Number.isNaN(a) ? 0 : a;
              })(),
              description: String(tx.description ?? ""),
              status: String(
                tx.status ?? tx.requestStatus ?? tx.request_status ?? "",
              ),
              timestamp: {
                toDate: () => new Date(String(tx.createdAt ?? "")),
              },
              createdAt: String(tx.createdAt ?? ""),
              senderName: parties.senderName,
              senderAccount: parties.senderAccount,
              recipientName: parties.recipientName,
              recipientAccount: parties.recipientAccount,
            };
          });

          const mapRequestStatusDescription = (
            requestLabel: string,
            rawStatus: unknown,
          ) => {
            const s = String(rawStatus ?? "").trim().toLowerCase();
            if (s === "approved" || s === "active" || s === "completed" || s === "matured") {
              return `${requestLabel} Approved`;
            }
            if (s === "rejected" || s === "cancelled" || s === "canceled") {
              return `${requestLabel} Rejected`;
            }
            return `${requestLabel} Requested`;
          };

          const mapDepositRequestsToTransactions = (
            list: unknown[] | undefined,
            type: string,
            requestLabel: string,
          ): Transaction[] => {
            if (!Array.isArray(list)) return [];
            return list.map((raw) => {
              const item = (raw ?? {}) as RawDepositRequestLike;
              const id = String(item.id ?? "").trim();
              const createdAt = String(item.createdAt ?? item.updatedAt ?? "").trim();
              const amountParsed = parseFloat(String(item.amount ?? 0));
              const amount = Number.isNaN(amountParsed) ? 0 : amountParsed;
              return {
                id: id || `${type}-${Math.random().toString(36).slice(2)}`,
                type,
                amount,
                status: String(item.status ?? ""),
                description: mapRequestStatusDescription(requestLabel, item.status),
                timestamp: {
                  toDate: () => (createdAt ? new Date(createdAt) : new Date()),
                },
                createdAt,
              };
            });
          };

          const mappedTopUpRequests = topUpRes.success
            ? mapDepositRequestsToTransactions(topUpRes.requests, "TOP_UP", "Top-up")
            : [];
          const mappedTimeDepositRequests = timeDepositRes.success
            ? mapDepositRequestsToTransactions(timeDepositRes.deposits, "TIME_DEPOSIT", "Time deposit")
            : [];
          const mappedStockRequests = stockRes.success
            ? mapDepositRequestsToTransactions(stockRes.requests, "STOCK_BUY", "Stock investment")
            : [];

          const mergedById = new Map<string, Transaction>();
          [...mappedTopUpRequests, ...mappedTimeDepositRequests, ...mappedStockRequests, ...mappedApiTransactions].forEach(
            (tx) => {
              const key = String(tx.id ?? "").trim();
              if (!key) return;
              mergedById.set(key, tx);
            },
          );

          const mapped = Array.from(mergedById.values()).sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          });

          // Keep one canonical dataset and paginate client-side.
          setTransactions(mapped);
          setHasMore(false);
          setTotalPages(Math.max(1, Math.ceil(mapped.length / ITEMS_PER_PAGE)));
        } else {
          // If no transactions or invalid response, set empty array
          if (!loadMore) setTransactions([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        if (!loadMore) setTransactions([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [], // No dependencies needed because ITEMS_PER_PAGE is a constant
  );

  useEffect(() => {
    loadStoredTransferReceiptDetails();
  }, [loadStoredTransferReceiptDetails]);

  useEffect(() => {
    let cancelled = false;

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

      // Subscribe to real‑time updates
      unsubRef.current = subscribeToTransactions(
        firebaseUser.uid,
        (list: TransactionDoc[]) => {
          if (cancelled) return;
          const mapped: Transaction[] = list.map((d) => {
            const parties = resolveTransferParties(d as unknown as Record<string, unknown>);
            return {
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
              senderName: parties.senderName,
              senderAccount: parties.senderAccount,
              recipientName: parties.recipientName,
              recipientAccount: parties.recipientAccount,
            };
          });
          setTransactions(mapped);
          setLoading(false);
        },
      );
    };

    init();

    return () => {
      cancelled = true;
      unsubRef.current?.(); // ✅ Cleanup using ref
    };
  }, [fetchTransactions]);

  const handleBack = () => {
    if (isSelectMode) {
      setIsSelectMode(false);
      setSelectedIds(new Set());
      setShowDeleteOptions(false);
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
      setSelectedTransaction(tx);
      setShowDetailModal(true);
    }
  };

  const handleViewReceipt = () => {
    if (!selectedTransaction) return;
    setShowDetailModal(false);
    setSelectedTransaction(null);
    const rawType = String(selectedTransaction.type ?? "").trim().toLowerCase();
    let receiptType = "Deposit";
    if (rawType.includes("transfer")) receiptType = "Transfer";
    else if (rawType.includes("withdraw")) receiptType = "Withdrawal";
    const receiptParams: Record<string, unknown> = {
      transactionId: selectedTransaction.id || t("investment.pending"),
      amount: String(selectedTransaction.amount ?? 0),
      status: selectedTransaction.status || "",
      currency: "PHP",
      type: receiptType,
      successMessage: getTransactionDisplayName(selectedTransaction),
      date: formatDateTime(selectedTransaction) || new Date().toLocaleString(),
      source: "history",
    };

    if (receiptType === "Transfer") {
      const txId = String(selectedTransaction.id || "").trim();
      const stored = txId ? transferReceiptMap[txId] : undefined;

      receiptParams.senderName =
        selectedTransaction.senderName ||
        stored?.senderName ||
        t("common.na");
      receiptParams.senderAccount =
        selectedTransaction.senderAccount ||
        stored?.senderAccount ||
        t("common.na");
      receiptParams.recipientName =
        selectedTransaction.recipientName ||
        stored?.recipientName ||
        t("common.na");
      receiptParams.recipientAccount =
        selectedTransaction.recipientAccount ||
        stored?.recipientAccount ||
        t("common.na");
    }

    (navigation as unknown as NavProp).navigate("depositReceipt", receiptParams);
  };

  const canViewReceipt = (tx: Transaction | null) => {
    if (!tx) return false;
    const normalizedDescription = String(tx.description ?? "").toLowerCase();
    const normalizedType = String(tx.type ?? "").toUpperCase();
    const normalizedStatus = String(tx.status ?? "").toLowerCase();

    const isApprovedStatus =
      normalizedStatus === "approved" ||
      normalizedStatus === "active" ||
      normalizedStatus === "completed" ||
      normalizedStatus === "matured";
    const isRejectedStatus =
      normalizedStatus === "rejected" ||
      normalizedStatus === "cancelled" ||
      normalizedStatus === "canceled";

    if (isRejectedStatus) return false;
    if (isApprovedStatus) return true;

    const isTimeDepositRequest =
      normalizedType === "TIME_DEPOSIT" ||
      normalizedDescription.includes("time deposit");
    if (isTimeDepositRequest && !normalizedDescription.includes("approved")) {
      return false;
    }

    if (
      normalizedDescription.includes("pending") ||
      normalizedDescription.includes("rejected")
    ) {
      return false;
    }
    if (
      normalizedDescription.includes("request") &&
      !normalizedDescription.includes("approved")
    ) {
      return false;
    }
    return true;
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const count = transactions.length;
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
    const itemsNeeded = page * ITEMS_PER_PAGE;
    const hasEnoughData = displayTransactions.length >= itemsNeeded;

    if (!hasEnoughData && hasMore) {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      fetchTransactions(
        true,
        offset + ITEMS_PER_PAGE,
        dateRange.start ?? undefined,
        dateRange.end ?? undefined,
      );
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPagesCount || hasMore) {
      handlePageChange(currentPage + 1);
    }
  };

  const canGoPrevious = currentPage > 1 && !loadingMore;
  const canGoNext = !loadingMore && (currentPage < totalPagesCount || hasMore);

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 3;
    let start = Math.max(1, currentPage - 1);
    let end = start + maxVisible - 1;

    if (!hasMore) {
      end = Math.min(totalPagesCount, end);
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  };

  const handleDeleteClick = () => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedIds(new Set());
      setShowDeleteOptions(false);
      return;
    }

    if (selectedIds.size > 0) {
      setShowDeleteOptions(true);
    } else {
      setIsSelectMode(false);
      setSelectedIds(new Set());
      setShowDeleteOptions(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      alert(t("auth.sessionExpired"));
      return;
    }

    // Optimistic UI update
    setTransactions((prev) => prev.filter((tx) => !selectedIds.has(tx.id)));

    try {
      const res = await deleteTransactions(accessToken, idsToDelete);
      if (!res.success) {
        await fetchTransactions(false, 0, dateRange.start ?? undefined, dateRange.end ?? undefined);
        alert(res.error || t("history.deleteFailed"));
      } else {
        await fetchTransactions(false, 0, dateRange.start ?? undefined, dateRange.end ?? undefined);
      }
    } catch {
      await fetchTransactions(false, 0, dateRange.start ?? undefined, dateRange.end ?? undefined);
      alert(t("history.deleteFailed"));
    } finally {
      setSelectedIds(new Set());
      setIsSelectMode(false);
      setShowDeleteOptions(false);
    }
  };

  const handleKeepSelected = () => {
    if (selectedIds.size === 0) return;
    setTransactions((prev) => prev.filter((tx) => selectedIds.has(tx.id)));
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
      case "last7days":
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
      alert(t("history.invalidDateRange"));
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
    if (Platform.OS === "android") setShowStartDatePicker(false);
    if (selectedDate) {
      setTempStartDate(selectedDate);
      setCustomStartDate(selectedDate.toISOString().split("T")[0]);
    }
    if (Platform.OS === "android") {
      setShowCustomDatePicker(true);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEndDatePicker(false);
    if (selectedDate) {
      setTempEndDate(selectedDate);
      setCustomEndDate(selectedDate.toISOString().split("T")[0]);
    }
    if (Platform.OS === "android") {
      setShowCustomDatePicker(true);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: contentBottomPadding,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#E25A17" />
      <LinearGradient
        colors={ORANGE_GRADIENT}
        style={[styles.header, { paddingHorizontal: headerPaddingHorizontal }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text
          style={[styles.headerTitle, isSmallWidth && styles.headerTitleSmall]}
          numberOfLines={1}
        >
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
              if (selectedIds.size === paginatedTransactions.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(
                  new Set(paginatedTransactions.map((tx) => tx.id)),
                );
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.selectAllButtonText}>
              {selectedIds.size === paginatedTransactions.length
                ? t("history.deselectAll")
                : t("history.selectAll")}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.transactionList}>
          {paginatedTransactions.map((tx) => (
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
                <Text style={styles.transactionDate}>{formatDateTime(tx)}</Text>
              </View>
              <Text style={styles.transactionAmount}>
                {CURRENCY_SYMBOL} {formatCurrency(tx.amount ?? 0)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {displayTransactions.length > 0 &&
          !hasMore &&
          currentPage >= totalPagesCount && (
            <View style={styles.endOfListContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.endOfListText}>{t("history.allLoaded")}</Text>
            </View>
          )}
      </ScrollView>

      {/* Pagination Bar */}
      {displayTransactions.length > 0 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationCard}>
            <View style={styles.paginationRow}>
              <View style={styles.paginationButtons}>
                <TouchableOpacity
                  style={[
                    styles.paginationArrow,
                    canGoPrevious && styles.paginationArrowEnabled,
                    !canGoPrevious && styles.paginationArrowDisabled,
                  ]}
                  onPress={handlePreviousPage}
                  disabled={!canGoPrevious}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={canGoPrevious ? "#E15816" : "#CCC"}
                  />
                </TouchableOpacity>

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

                <TouchableOpacity
                  style={[
                    styles.paginationArrow,
                    canGoNext && styles.paginationArrowEnabled,
                    !canGoNext && styles.paginationArrowDisabled,
                  ]}
                  onPress={handleNextPage}
                  disabled={!canGoNext}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={canGoNext ? "#E15816" : "#CCC"}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {loadingMore && (
              <View style={styles.paginationLoading}>
                <ActivityIndicator size="small" color="#E15816" />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Custom Date Picker Modal */}
      <ActivityModal
        visible={showFilterDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterDropdown(false)}
      >
        <TouchableOpacity
          style={styles.filterDropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterDropdown(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.filterDropdownMenu,
              { marginTop: insets.top + 52, marginRight: headerPaddingHorizontal },
            ]}
          >
            <Text style={styles.filterDropdownTitle}>
              {t("history.filterByDate")}
            </Text>
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
                  {t("history.customRange")}
                </Text>
                {selectedFilter === "custom" && (
                  <Ionicons name="checkmark" size={18} color="#E15816" />
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </ActivityModal>

      {/* Custom Date Picker Modal */}
      <ActivityModal
        visible={showCustomDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCustomDatePicker(false)}
          />
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="calendar-outline" size={28} color="#E15816" />
              </View>
              <Text style={styles.filterModalTitle}>
                {t("history.selectDateRange")}
              </Text>
              <Text style={styles.filterModalSubtitle}>
                {t("history.chooseDatesSubtitle")}
              </Text>
            </View>
            <View style={styles.customDateSection}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>{t("history.startDate")}</Text>
                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={() => {
                    if (Platform.OS === "android") {
                      setShowCustomDatePicker(false);
                    }
                    setShowStartDatePicker(true);
                  }}
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
                  onPress={() => {
                    if (Platform.OS === "android") {
                      setShowCustomDatePicker(false);
                    }
                    setShowEndDatePicker(true);
                  }}
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
                <Text style={styles.applyCustomButtonText}>
                  {t("history.applyFilter")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ActivityModal>

      {/* Date Pickers */}
      <ActivityModal
        visible={showStartDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowStartDatePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.pickerModalContainer}
          >
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleStartDateChange}
              maximumDate={new Date()}
            />
            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowStartDatePicker(false)}
              >
                <Text style={styles.pickerDoneText}>{t("common.close")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </ActivityModal>

      <ActivityModal
        visible={showEndDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowEndDatePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.pickerModalContainer}
          >
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleEndDateChange}
              maximumDate={new Date()}
              minimumDate={customStartDate ? new Date(customStartDate) : undefined}
            />
            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowEndDatePicker(false)}
              >
                <Text style={styles.pickerDoneText}>{t("common.close")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </ActivityModal>

      {/* Delete Options Modal */}
      {isSelectMode && selectedIds.size > 0 && (
        <ActivityModal
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
                    <Text style={styles.cancelOptionButtonText}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </ActivityModal>
      )}

      {/* Transaction Detail Modal */}
      <ActivityModal
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
                  name={
                    selectedTransaction
                      ? (getTransactionIcon(
                          selectedTransaction,
                        ) as keyof typeof Ionicons.glyphMap)
                      : "swap-horizontal"
                  }
                  size={24}
                  color="#E15816"
                />
              </View>
              <Text style={styles.detailModalTitle}>
                {t("history.transactionDetails")}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.detailModalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailAmountContainer}>
                <Text style={styles.detailAmountLabel}>
                  {t("history.amount")}
                </Text>
                <Text style={styles.detailAmountValue}>
                  {CURRENCY_SYMBOL}{" "}
                  {formatCurrency(selectedTransaction?.amount ?? 0)}
                </Text>
              </View>

              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>{t("history.type")}</Text>
                <Text style={styles.detailInfoValue}>
                  {selectedTransaction
                    ? getTransactionTypeLabel(selectedTransaction.type)
                    : "-"}
                </Text>
              </View>

              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>
                  {t("history.description")}
                </Text>
                <Text style={styles.detailInfoValue}>
                  {selectedTransaction
                    ? getTransactionDisplayName(selectedTransaction)
                    : "-"}
                </Text>
              </View>

              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>
                  {t("history.dateTime")}
                </Text>
                <Text style={styles.detailInfoValue}>
                  {selectedTransaction
                    ? formatDateTime(selectedTransaction)
                    : "-"}
                </Text>
              </View>

              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>{t("history.id")}</Text>
                <Text
                  style={[styles.detailInfoValue, styles.detailInfoValueMono]}
                >
                  {selectedTransaction?.id ?? "-"}
                </Text>
              </View>

              {canViewReceipt(selectedTransaction) ? (
                <TouchableOpacity
                  style={styles.detailModalViewReceiptButton}
                  onPress={handleViewReceipt}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailModalViewReceiptButtonText}>
                    {t("history.viewReceipt")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.receiptPendingHint}>
                  <Ionicons name="time-outline" size={16} color="#A86A45" />
                  <Text style={styles.receiptPendingHintText}>
                    {t("history.receiptPendingHint")}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.detailModalCloseButton}
                onPress={() => setShowDetailModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.detailModalCloseButtonText}>
                  {t("common.close")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </ActivityModal>
    </View>
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
    position: "relative",
    zIndex: 20,
    elevation: 20,
  },
  headerLeft: {
    minWidth: 80,
    alignItems: "flex-start",
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
  headerTitleSmall: {
    fontSize: 18,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
    zIndex: 30,
    elevation: 30,
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
    zIndex: 40,
    elevation: 40,
  },
  filterDropdownMenu: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    zIndex: 9999,
    elevation: 9999,
    minWidth: 180,
  },
  filterDropdownOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  pickerActions: {
    marginTop: 4,
    alignItems: "flex-end",
    paddingHorizontal: 8,
  },
  pickerDoneButton: {
    backgroundColor: "#E15816",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pickerDoneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
  transactionItemSelected: {
    backgroundColor: "#FFF5F0",
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
  selectAllButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: "#FFF5F0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E15816",
    minWidth: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  selectAllButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E15816",
    textAlign: "center",
  },
  paginationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  paginationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  paginationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paginationArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationArrowEnabled: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E15816",
  },
  paginationArrowDisabled: {
    opacity: 0.5,
  },
  pageButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  pageButtonActive: {
    backgroundColor: "#E15816",
  },
  pageButtonText: {
    fontSize: 14,
    color: "#687076",
    fontWeight: "600",
  },
  pageButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  paginationLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
    marginTop: 10,
    marginBottom: 24,
  },
  detailModalCloseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailModalViewReceiptButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E15816",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  detailModalViewReceiptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E15816",
  },
  receiptPendingHint: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#FFD8C2",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  receiptPendingHintText: {
    flex: 1,
    fontSize: 13,
    color: "#A86A45",
    fontWeight: "500",
  },
});
