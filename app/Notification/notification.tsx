import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  acceptReferralRequest as apiAcceptReferralRequest,
  declineReferralRequest as apiDeclineReferralRequest,
  deleteAllNotifications as apiDeleteAllNotifications,
  deleteNotification as apiDeleteNotification,
  deleteNotificationBatch as apiDeleteNotificationBatch,
  markAllNotificationsAsRead as apiMarkAllNotificationsAsRead,
  markNotificationAsRead as apiMarkNotificationAsRead,
  getNotifications,
} from "../../configs/api";
import { auth } from "../../configs/firebase";
import { useLanguage } from "../../context/LanguageContext";
import { useUnreadNotifications } from "../../context/UnreadNotificationsContext";
import ActivityModal from "../components/ActivityModal";
import Loader from "../Loader/Loader";
import notificationService, {
  type NotificationItem,
} from "./notificationService";

interface NotificationItemBackend {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
  referenceId?: string | null;
  referralHandled?: boolean;
}

const HANDLED_REFERRAL_NOTIFICATION_KEYS_KEY =
  "handled_referral_notification_keys";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DETAIL_MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 420);
const DETAIL_MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.78;
const NOTIFICATION_PAGE_SIZE = 5;

/**
 * Format notification messages to add comma separators to amounts
 * Looks for patterns like "5454.00" or "54554.00" and formats them with commas
 */
const formatNotificationMessage = (message: string): string => {
  if (!message) return message;

  // Pattern to match amounts in notification messages
  // Matches numbers with 2 decimal places (e.g., "5454.00", "54554.00")
  const amountPattern = /\b(\d{4,})\.(\d{2})\b/g;

  return message.replace(amountPattern, (match) => {
    const amount = parseFloat(match);
    if (!Number.isFinite(amount)) return match;

    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  });
};

const Notification = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { setUnreadCount } = useUnreadNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [backendNotifications, setBackendNotifications] = useState<
    NotificationItemBackend[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readAllLoading, setReadAllLoading] = useState(false);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [useBackend, setUseBackend] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({ title: "", message: "", onConfirm: () => {} });
  const [detailModalNotification, setDetailModalNotification] = useState<
    NotificationItem | NotificationItemBackend | null
  >(null);
  const [referralActionLoading, setReferralActionLoading] = useState(false);
  const [handledReferralNotificationKeys, setHandledReferralNotificationKeys] =
    useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(NOTIFICATION_PAGE_SIZE);

  const loadHandledReferralNotificationKeys = async () => {
    try {
      const raw = await AsyncStorage.getItem(
        HANDLED_REFERRAL_NOTIFICATION_KEYS_KEY,
      );
      if (!raw) {
        setHandledReferralNotificationKeys(new Set());
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      setHandledReferralNotificationKeys(
        new Set(Array.isArray(parsed) ? parsed : []),
      );
    } catch {
      setHandledReferralNotificationKeys(new Set());
    }
  };

  const isHandledReferralNotification = (
    item: Pick<
      NotificationItemBackend,
      "id" | "referenceId" | "referralHandled"
    >,
    handledKeys: Set<string>,
  ) => {
    return Boolean(
      item.referralHandled ||
      handledKeys.has(item.id) ||
      (item.referenceId ? handledKeys.has(item.referenceId) : false),
    );
  };

  const persistHandledReferralNotification = async (
    notificationId: string,
    referenceId?: string | null,
  ) => {
    try {
      const next = new Set(handledReferralNotificationKeys);
      next.add(notificationId);
      if (referenceId) next.add(referenceId);
      setHandledReferralNotificationKeys(next);
      await AsyncStorage.setItem(
        HANDLED_REFERRAL_NOTIFICATION_KEYS_KEY,
        JSON.stringify(Array.from(next)),
      );
    } catch {
      // no-op
    }
  };

  const getTranslatedNotificationTitle = (title?: string): string => {
    const normalized = String(title ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return "";

    const titleKeyMap: Record<string, string> = {
      "top up requested": "notification.titleTopUpRequested",
      "top-up requested": "notification.titleTopUpRequested",
      "top-up approved": "notification.titleTopUpApproved",
      "top up approved": "notification.titleTopUpApproved",
      "top-up rejected": "notification.titleTopUpRejected",
      "top up rejected": "notification.titleTopUpRejected",
      "stock investment requested":
        "notification.titleStockInvestmentRequested",
      "withdrawal requested": "notification.titleWithdrawalRequested",
      "withdrawal approved": "notification.titleWithdrawalApproved",
      "withdrawal rejected": "notification.titleWithdrawalRejected",
      "time deposit requested": "notification.titleTimeDepositRequested",
      "time deposit approved": "notification.titleTimeDepositApproved",
      "time deposit rejected": "notification.titleTimeDepositRejected",
      "transfer received": "notification.titleTransferReceived",
      "transfer sent": "notification.titleTransferSent",
      "new referral signup": "notification.titleNewReferralSignup",
      "referral commission released":
        "notification.titleReferralCommissionReleased",
      "ticket update": "notification.titleTicketUpdate",
      "new support reply": "notification.titleNewSupportReply",
      "new customer reply": "notification.titleNewCustomerReply",
      "new message": "notification.titleNewMessage",
      "account updated": "notification.titleAccountUpdated",
      "invoice generated": "notification.titleInvoiceGenerated",
      "subscription activated": "notification.titleSubscriptionActivated",
      "subscription cancelled": "notification.titleSubscriptionCancelled",
      "subscription expired": "notification.titleSubscriptionExpired",
      "your stock was sold!": "notification.titleYourStockWasSold",
      "stock purchase successful": "notification.titleStockPurchaseSuccessful",
    };

    const key = titleKeyMap[normalized];
    return key ? t(key) : (title ?? "");
  };

  const fetchBackendNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return;

      const result = await getNotifications(accessToken, { limit: 50 });
      if (result.success && result.data) {
        const storedHandledKeysRaw = await AsyncStorage.getItem(
          HANDLED_REFERRAL_NOTIFICATION_KEYS_KEY,
        );
        const storedHandledKeys = new Set<string>(
          storedHandledKeysRaw
            ? (JSON.parse(storedHandledKeysRaw) as string[])
            : [],
        );
        const list = (result.data as NotificationItemBackend[]).map((item) => ({
          ...item,
          referralHandled: isHandledReferralNotification(
            item,
            storedHandledKeys,
          ),
        }));
        setBackendNotifications(list);
        const unread = list.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    const checkAuth = async () => {
      await loadHandledReferralNotificationKeys();
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        setUseBackend(true);
        fetchBackendNotifications();
      } else if (auth) {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
          setUser(currentUser);
          if (!currentUser) {
            setNotifications([]);
            setLoading(false);
          }
        });
        return () => unsubscribeAuth();
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [fetchBackendNotifications]);

  useEffect(() => {
    if (!useBackend) return;
    setBackendNotifications((prev) =>
      prev.map((item) =>
        isHandledReferralNotification(item, handledReferralNotificationKeys)
          ? { ...item, referralHandled: true }
          : item,
      ),
    );
  }, [handledReferralNotificationKeys, useBackend]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (notificationsList: NotificationItem[]) => {
        setNotifications(notificationsList);
        setLoading(false);
        setRefreshing(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setVisibleCount(NOTIFICATION_PAGE_SIZE);
  }, [useBackend, backendNotifications.length, notifications.length]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (useBackend) {
      fetchBackendNotifications();
    } else {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const unreadCount = useBackend
    ? backendNotifications.filter((n) => !n.isRead).length
    : notifications.filter((n) => !n.read).length;

  const getBackendCreatedAtMs = (item: NotificationItemBackend): number => {
    const parsed = new Date(item.createdAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getFirebaseTimestampMs = (item: NotificationItem): number => {
    const raw = item.timestamp;
    if (!raw) return 0;

    if (typeof (raw as { toDate?: () => Date }).toDate === "function") {
      const date = (raw as { toDate: () => Date }).toDate();
      const value = date.getTime();
      return Number.isFinite(value) ? value : 0;
    }

    const value = new Date(raw as Date).getTime();
    return Number.isFinite(value) ? value : 0;
  };

  const orderedBackendNotifications = useMemo(
    () =>
      [...backendNotifications].sort((a, b) => {
        const unreadPriority = Number(a.isRead) - Number(b.isRead); // unread first
        if (unreadPriority !== 0) return unreadPriority;
        return getBackendCreatedAtMs(b) - getBackendCreatedAtMs(a);
      }),
    [backendNotifications],
  );

  const orderedFirebaseNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const unreadPriority = Number(!!a.read) - Number(!!b.read); // unread first
        if (unreadPriority !== 0) return unreadPriority;
        return getFirebaseTimestampMs(b) - getFirebaseTimestampMs(a);
      }),
    [notifications],
  );

  const visibleBackendNotifications = orderedBackendNotifications.slice(
    0,
    visibleCount,
  );
  const visibleFirebaseNotifications = orderedFirebaseNotifications.slice(
    0,
    visibleCount,
  );
  const hasMoreNotifications = useBackend
    ? orderedBackendNotifications.length > visibleCount
    : orderedFirebaseNotifications.length > visibleCount;
  const allNotificationIds = useMemo(
    () =>
      useBackend
        ? orderedBackendNotifications.map((n) => n.id)
        : orderedFirebaseNotifications.map((n) => n.id),
    [useBackend, orderedBackendNotifications, orderedFirebaseNotifications],
  );

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + NOTIFICATION_PAGE_SIZE);
  };

  const handleReadAll = async () => {
    if (unreadCount === 0 || readAllLoading) return;
    setReadAllLoading(true);
    try {
      if (useBackend) {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (accessToken) {
          const result = await apiMarkAllNotificationsAsRead(accessToken);
          if (result.success) {
            setBackendNotifications((prev) =>
              prev.map((n) => ({ ...n, isRead: true })),
            );
            setUnreadCount(0); // Real-time update: bubble number
          }
        }
      } else if (user) {
        await notificationService.markAllAsRead(user.uid);
        setUnreadCount(0); // Real-time update: bubble number
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setReadAllLoading(false);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteOne = (
    id: string,
    e?: { stopPropagation?: () => void },
  ) => {
    e?.stopPropagation?.();
    setDeleteModalConfig({
      title: t("notification.delete"),
      message: t("notification.deleteConfirmOne"),
      onConfirm: async () => {
        setShowDeleteModal(false);
        if (deleteLoading) return;
        setDeleteLoading(true);
        try {
          if (useBackend) {
            const accessToken = await AsyncStorage.getItem("access_token");
            if (accessToken) {
              const result = await apiDeleteNotification(accessToken, id);
              if (result.success) {
                setBackendNotifications((prev) =>
                  prev.filter((n) => n.id !== id),
                );
              }
            }
          } else if (user) {
            await notificationService.deleteNotification(user.uid, id);
          }
        } catch (error) {
          console.error("Error deleting notification:", error);
        } finally {
          setDeleteLoading(false);
        }
      },
    });
    setShowDeleteModal(true);
  };

  const handleDeleteAll = () => {
    const total = useBackend
      ? backendNotifications.length
      : notifications.length;
    if (total === 0) return;
    setDeleteModalConfig({
      title: t("notification.delete"),
      message: t("notification.deleteConfirmAll"),
      onConfirm: async () => {
        setShowDeleteModal(false);
        if (deleteLoading) return;
        setDeleteLoading(true);
        try {
          if (useBackend) {
            const accessToken = await AsyncStorage.getItem("access_token");
            if (accessToken) {
              const result = await apiDeleteAllNotifications(accessToken);
              if (result.success) {
                setBackendNotifications([]);
              }
            }
          } else if (user) {
            await notificationService.deleteAllNotifications(user.uid);
          }
          setSelectMode(false);
          setSelectedIds(new Set());
        } catch (error) {
          console.error("Error deleting all notifications:", error);
        } finally {
          setDeleteLoading(false);
        }
      },
    });
    setShowDeleteModal(true);
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleteModalConfig({
      title: t("notification.delete"),
      message: t("notification.deleteConfirmSelected").replace(
        "{count}",
        String(ids.length),
      ),
      onConfirm: async () => {
        setShowDeleteModal(false);
        if (deleteLoading) return;
        setDeleteLoading(true);
        try {
          if (useBackend) {
            const accessToken = await AsyncStorage.getItem("access_token");
            if (accessToken) {
              const result = await apiDeleteNotificationBatch(accessToken, ids);
              if (result.success) {
                setBackendNotifications((prev) =>
                  prev.filter((n) => !ids.includes(n.id)),
                );
              }
            }
          } else if (user) {
            await notificationService.deleteNotifications(user.uid, ids);
          }
          setSelectMode(false);
          setSelectedIds(new Set());
        } catch (error) {
          console.error("Error deleting selected notifications:", error);
        } finally {
          setDeleteLoading(false);
        }
      },
    });
    setShowDeleteModal(true);
  };

  const handleSelectAll = () => {
    if (allNotificationIds.length === 0) return;
    setSelectedIds((prev) => {
      const areAllSelected = allNotificationIds.every((id) => prev.has(id));
      if (areAllSelected) {
        return new Set();
      }
      return new Set(allNotificationIds);
    });
  };

  const handleNotificationPress = async (
    notification: NotificationItem | NotificationItemBackend,
  ) => {
    const id = notification.id;
    if (selectMode) {
      toggleSelect(id);
      return;
    }

    if (useBackend) {
      const notif = notification as NotificationItemBackend;
      if (!notif.isRead) {
        try {
          const accessToken = await AsyncStorage.getItem("access_token");
          if (accessToken) {
            await apiMarkNotificationAsRead(accessToken, notif.id);
            setBackendNotifications((prev) =>
              prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        } catch (error) {
          console.error("Error marking backend notification as read:", error);
        }
      }

      setDetailModalNotification(notification);
      return;
    }

    const notif = notification as NotificationItem;

    // Open detail modal to show all notification info
    setDetailModalNotification(notification);

    if (!notif.read && user) {
      try {
        await notificationService.markAsRead(user.uid, notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1)); // Real-time update: bubble number
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const getNotificationIcon = (type?: string, title?: string): string => {
    const titleLower = (title ?? "").toLowerCase();
    const isReferralSignup =
      titleLower.includes("referral") && titleLower.includes("signup");
    const isReferralCommission =
      titleLower.includes("referral") && titleLower.includes("commission");
    switch (type) {
      case "referral_request":
      case "REFERRAL_REQUEST":
        return "person-add";
      case "referral_approved":
        return "checkmark-circle";
      case "transaction":
      case "TRANSFER_RECEIVED":
        return "cash";
      case "DEPOSIT_APPROVED":
      case "DEPOSIT_REJECTED":
      case "WITHDRAWAL_APPROVED":
      case "WITHDRAWAL_REJECTED":
        return "wallet";
      case "TICKET_UPDATE":
      case "NEW_MESSAGE":
        return "chatbubble";
      case "KYC_APPROVED":
      case "KYC_REJECTED":
        return "document-text";
      case "TIME_DEPOSIT_MATURED":
        return "time";
      case "SYSTEM_ALERT":
      case "system":
        if (isReferralSignup) return "person-add";
        if (isReferralCommission) return "checkmark-circle";
        return "notifications";
      default:
        return "information-circle";
    }
  };

  const formatTimestamp = (timestamp: NotificationItem["timestamp"]) => {
    if (!timestamp) return "";

    const date = (timestamp as { toDate?: () => Date }).toDate
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as Date);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleString("en-US", options);
  };

  const formatDetailTimestamp = (
    notif: NotificationItem | NotificationItemBackend,
  ): string => {
    if ("createdAt" in notif && notif.createdAt) {
      const val = notif.createdAt as string | number;
      return new Date(val).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if ("timestamp" in notif && notif.timestamp) {
      return formatTimestamp(notif.timestamp);
    }
    return t("notification.noDate") ?? "—";
  };

  const getDetailFields = (
    notif: NotificationItem | NotificationItemBackend,
  ): { label: string; value: string }[] => {
    const isBackend = "isRead" in notif;
    const fields: { label: string; value: string }[] = [];

    fields.push({
      label: t("notification.detailTitle") ?? "Title",
      value: getTranslatedNotificationTitle(notif.title) || "—",
    });
    fields.push({
      label: t("notification.detailMessage") ?? "Message",
      value: formatNotificationMessage(notif.message ?? "—"),
    });
    fields.push({
      label: t("notification.detailDate") ?? "Date",
      value: formatDetailTimestamp(notif),
    });
    fields.push({
      label: t("notification.detailStatus") ?? "Status",
      value: isBackend
        ? (notif as NotificationItemBackend).isRead
          ? (t("notification.read") ?? "Read")
          : (t("notification.unread") ?? "Unread")
        : (notif as NotificationItem).read
          ? (t("notification.read") ?? "Read")
          : (t("notification.unread") ?? "Unread"),
    });

    if (!isBackend) {
      const item = notif as NotificationItem;
      // Include any other non-standard fields
      const skip = new Set([
        "id",
        "read",
        "type",
        "title",
        "message",
        "timestamp",
        "readAt",
      ]);
      Object.entries(item).forEach(([key, val]) => {
        if (!skip.has(key) && val != null && typeof val !== "object") {
          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase());
          fields.push({ label, value: String(val) });
        }
      });
    } else {
      // Intentionally hide technical IDs from the detail view
    }

    return fields;
  };

  const isNewReferralNotification = (
    notif: NotificationItem | NotificationItemBackend | null,
  ): boolean => {
    if (!notif) return false;
    const isBackend = "isRead" in notif;
    if (isBackend) {
      const b = notif as NotificationItemBackend;
      return Boolean(
        (b.type === "REFERRAL_REQUEST" ||
          (b.title?.toLowerCase().includes("referral") &&
            b.title?.toLowerCase().includes("signup"))) &&
        b.referenceId &&
        !b.referralHandled,
      );
    }
    const n = notif as NotificationItem;
    const hasRef = (n as NotificationItem & { referenceId?: string })
      .referenceId;
    return Boolean(
      (n.type === "referral_request" ||
        (n.title?.toLowerCase().includes("referral") &&
          n.title?.toLowerCase().includes("signup"))) &&
      hasRef,
    );
  };

  const handleAcceptReferral = async () => {
    if (!detailModalNotification || !useBackend || referralActionLoading)
      return;
    const id = detailModalNotification.id;
    setReferralActionLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return;
      const result = await apiAcceptReferralRequest(accessToken, id);
      if (result.success) {
        const referralReferenceId =
          "referenceId" in detailModalNotification
            ? ((detailModalNotification as any).referenceId as string | null)
            : null;
        await persistHandledReferralNotification(id, referralReferenceId);
        setBackendNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true, referralHandled: true } : n,
          ),
        );
        setDetailModalNotification(null);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      if (__DEV__) console.error("[Referral] Accept error", e);
    } finally {
      setReferralActionLoading(false);
    }
  };

  const handleDeclineReferral = async () => {
    if (!detailModalNotification || !useBackend || referralActionLoading)
      return;
    const id = detailModalNotification.id;
    setReferralActionLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return;
      const result = await apiDeclineReferralRequest(accessToken, id);
      if (result.success) {
        const referralReferenceId =
          "referenceId" in detailModalNotification
            ? ((detailModalNotification as any).referenceId as string | null)
            : null;
        await persistHandledReferralNotification(id, referralReferenceId);
        setBackendNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true, referralHandled: true } : n,
          ),
        );
        setDetailModalNotification(null);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      if (__DEV__) console.error("[Referral] Decline error", e);
    } finally {
      setReferralActionLoading(false);
    }
  };

  const renderBackendNotification = ({
    item,
  }: {
    item: NotificationItemBackend;
  }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.isRead && styles.unreadCard,
        selectMode && selectedIds.has(item.id) && styles.selectedCard,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {selectMode ? (
          <TouchableOpacity
            style={styles.selectCheckbox}
            onPress={() => toggleSelect(item.id)}
          >
            <Ionicons
              name={selectedIds.has(item.id) ? "checkbox" : "checkbox-outline"}
              size={28}
              color={selectedIds.has(item.id) ? "#E25A17" : "#999"}
            />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.iconContainer,
              !item.isRead && styles.unreadIconContainer,
            ]}
          >
            <Ionicons
              name={
                getNotificationIcon(
                  item.type,
                  item.title,
                ) as "information-circle"
              }
              size={24}
              color="#E25A17"
            />
          </View>
        )}

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle}>
              {getTranslatedNotificationTitle(item.title)}
            </Text>
            {item.title?.toLowerCase().includes("referral commission") &&
              !selectMode && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
            {!item.isRead && !selectMode && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {t("notification.newBadge")}
                </Text>
              </View>
            )}
            {!selectMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => handleDeleteOne(item.id, e)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={22} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.notificationMessage} numberOfLines={3}>
            {formatNotificationMessage(item.message)}
          </Text>

          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {item.isRead && !selectMode && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#CCC"
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.read && styles.unreadCard,
        selectMode && selectedIds.has(item.id) && styles.selectedCard,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {selectMode ? (
          <TouchableOpacity
            style={styles.selectCheckbox}
            onPress={() => toggleSelect(item.id)}
          >
            <Ionicons
              name={selectedIds.has(item.id) ? "checkbox" : "checkbox-outline"}
              size={28}
              color={selectedIds.has(item.id) ? "#E25A17" : "#999"}
            />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.iconContainer,
              !item.read && styles.unreadIconContainer,
            ]}
          >
            <Ionicons
              name={
                getNotificationIcon(
                  item.type ?? "system",
                  item.title,
                ) as "information-circle"
              }
              size={24}
              color="#E25A17"
            />
          </View>
        )}

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle}>
              {getTranslatedNotificationTitle(item.title)}
            </Text>
            {(item.type === "referral_approved" ||
              item.title?.toLowerCase().includes("referral commission")) &&
              !selectMode && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
            {!item.read && !selectMode && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {t("notification.newBadge")}
                </Text>
              </View>
            )}
            {!selectMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => handleDeleteOne(item.id, e)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={22} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.notificationMessage} numberOfLines={3}>
            {formatNotificationMessage(item.message ?? "")}
          </Text>

          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>

        {item.read && !selectMode && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#CCC"
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
      <Text style={styles.emptyText}>{t("notification.noNotifications")}</Text>
      <Text style={styles.emptySubtext}>
        {t("notification.noNotificationsSubtext")}
      </Text>
    </View>
  );

  const renderLoadMoreFooter = () => {
    if (!hasMoreNotifications || loading) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        activeOpacity={0.85}
      >
        <Text style={styles.loadMoreText}>
          {t("history.loadMore") ?? "Load More"}
        </Text>
      </TouchableOpacity>
    );
  };

  const contentBottomPadding = Math.max(insets.bottom, 16);

  if (!user && !useBackend) {
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
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("notification.title")}</Text>
          <View style={styles.refreshButton} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("notification.loginToView")}</Text>
        </View>
      </View>
    );
  }

  // While loading notifications, remove the header to keep the loader uniform.
  if (loading) {
    return <Loader text={t("common.loading")} />;
  }

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
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notification.title")}</Text>
        <View style={styles.headerRight}>
          {selectMode ? (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={toggleSelectMode}
              accessibilityRole="button"
              accessibilityLabel={t("notification.cancel")}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={toggleSelectMode}
              accessibilityRole="button"
              accessibilityLabel={t("notification.select")}
            >
              <Ionicons name="checkbox-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {selectMode && (
        <View style={styles.deleteActionBar}>
          <TouchableOpacity
            onPress={handleSelectAll}
            disabled={deleteLoading || allNotificationIds.length === 0}
            style={[
              styles.deleteActionButton,
              styles.deleteActionButtonCompact,
              allNotificationIds.length === 0 &&
                styles.deleteActionButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.deleteActionText,
                allNotificationIds.length === 0 &&
                  styles.deleteActionTextDisabled,
              ]}
            >
              {selectedIds.size === allNotificationIds.length &&
              allNotificationIds.length > 0
                ? "Unselect All"
                : "Select All"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAll}
            disabled={deleteLoading}
            style={[styles.deleteActionButton, styles.deleteActionButtonCompact]}
          >
            {deleteLoading ? (
              <ActivityIndicator size="small" color="#E25A17" />
            ) : (
              <Text style={styles.deleteActionText}>
                {t("notification.deleteAll")}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteSelected}
            disabled={deleteLoading || selectedIds.size === 0}
            style={[
              styles.deleteActionButton,
              styles.deleteActionButtonWide,
              selectedIds.size === 0 && styles.deleteActionButtonDisabled,
            ]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.deleteActionText,
                selectedIds.size === 0 && styles.deleteActionTextDisabled,
              ]}
            >
              {`${t("notification.deleteSelected")}${
                selectedIds.size > 0 ? ` (${selectedIds.size})` : ""
              }`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {unreadCount > 0 && !selectMode && (
        <View style={styles.readAllBar}>
          <TouchableOpacity
            onPress={handleReadAll}
            disabled={readAllLoading}
            style={styles.readAllButton}
          >
            {readAllLoading ? (
              <ActivityIndicator size="small" color="#E25A17" />
            ) : (
              <Text style={styles.readAllText}>
                {t("notification.readAll")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {useBackend ? (
        <FlatList<NotificationItemBackend>
          data={visibleBackendNotifications}
          renderItem={renderBackendNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            visibleBackendNotifications.length === 0 && styles.emptyListContent,
            { paddingBottom: contentBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderLoadMoreFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#E25A17"]}
              tintColor="#E25A17"
            />
          }
        />
      ) : (
        <FlatList<NotificationItem>
          data={visibleFirebaseNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            visibleFirebaseNotifications.length === 0 &&
              styles.emptyListContent,
            { paddingBottom: contentBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderLoadMoreFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#E25A17"]}
              tintColor="#E25A17"
            />
          }
        />
      )}

      {/* Delete confirmation modal - updated to modern white card style */}
      <ActivityModal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{deleteModalConfig.title}</Text>
            <Text style={styles.alertMessage}>{deleteModalConfig.message}</Text>
            <View style={styles.alertButtonRow}>
              <TouchableOpacity
                style={styles.alertCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.alertCancelButtonText}>
                  {t("notification.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertConfirmButton}
                onPress={() => deleteModalConfig.onConfirm()}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.alertConfirmButtonText}>
                    {t("notification.delete")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ActivityModal>

      {/* Notification detail modal - modern white card with full details */}
      <ActivityModal
        visible={!!detailModalNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalNotification(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setDetailModalNotification(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.detailModalTouchable}
          >
            <View style={styles.detailModal}>
              <LinearGradient
                colors={["#E15816", "#F28934"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailHeader}
              >
                <View style={styles.detailHeaderTop}>
                  <View style={styles.detailHeaderSlotLeft}>
                    <View style={styles.detailIconWrapper}>
                      <Ionicons
                        name={
                          detailModalNotification &&
                          "createdAt" in detailModalNotification
                            ? (getNotificationIcon(
                                (
                                  detailModalNotification as NotificationItemBackend
                                )?.type,
                                detailModalNotification?.title,
                              ) as "information-circle")
                            : (getNotificationIcon(
                                (detailModalNotification as NotificationItem)
                                  ?.type ?? "system",
                                detailModalNotification?.title,
                              ) as "information-circle")
                        }
                        size={28}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  <Text style={styles.detailTitle} numberOfLines={2}>
                    {getTranslatedNotificationTitle(
                      detailModalNotification?.title,
                    ) || "—"}
                  </Text>
                  <View style={styles.detailHeaderSlotRight}>
                    <TouchableOpacity
                      style={styles.detailCloseButton}
                      onPress={() => setDetailModalNotification(null)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={28}
                        color="rgba(255,255,255,0.9)"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
              <ScrollView
                style={styles.detailScroll}
                contentContainerStyle={styles.detailScrollContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                nestedScrollEnabled={true}
                bounces={true}
              >
                {detailModalNotification &&
                  getDetailFields(detailModalNotification).map(
                    ({ label, value }, idx) => (
                      <View key={idx} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue} selectable>
                          {value}
                        </Text>
                      </View>
                    ),
                  )}
              </ScrollView>
              {useBackend &&
                detailModalNotification &&
                isNewReferralNotification(detailModalNotification) && (
                  <View style={styles.referralActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.referralButton,
                        styles.referralDeclineButton,
                      ]}
                      onPress={handleDeclineReferral}
                      disabled={referralActionLoading}
                    >
                      {referralActionLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.referralButtonText}>
                          {t("notification.declineReferral") ?? "Decline"}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.referralButton,
                        styles.referralAcceptButton,
                      ]}
                      onPress={handleAcceptReferral}
                      disabled={referralActionLoading}
                    >
                      {referralActionLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.referralButtonText}>
                          {t("notification.acceptReferral") ?? "Accept"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              <TouchableOpacity
                style={styles.detailCloseTextButton}
                onPress={() => setDetailModalNotification(null)}
              >
                <Text style={styles.detailCloseText}>
                  {t("notification.close") ?? "Close"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </ActivityModal>
    </View>
  );
};

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
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    minWidth: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  deleteActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    gap: 6,
  },
  deleteActionButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  deleteActionButtonCompact: {
    flex: 0.8,
  },
  deleteActionButtonWide: {
    flex: 1.4,
  },
  deleteActionButtonDisabled: {
    opacity: 0.5,
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E25A17",
    textAlign: "center",
  },
  deleteActionTextDisabled: {
    color: "#999",
  },
  readAllBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  readAllButton: {
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  readAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E25A17",
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: "#E25A17",
    backgroundColor: "#FFF9F5",
  },
  selectCheckbox: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  unreadIconContainer: {
    backgroundColor: "#FFE8D6",
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  newBadge: {
    backgroundColor: "#FFE8D6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E25A17",
  },
  divider: {
    height: 1,
    backgroundColor: "#E25A17",
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  chevron: {
    alignSelf: "center",
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  loadMoreButton: {
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E25A17",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E25A17",
  },
  // Delete confirmation modal - modern white card
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: DETAIL_MODAL_WIDTH,
    maxWidth: DETAIL_MODAL_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: "#444444",
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  alertButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  alertCancelButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  alertCancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555555",
  },
  alertConfirmButton: {
    backgroundColor: "#E15816",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 96,
    alignItems: "center",
  },
  alertConfirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Detail modal - white card with full notification details
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailModalTouchable: {
    width: "90%",
    maxWidth: DETAIL_MODAL_WIDTH,
  },
  detailModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    maxHeight: DETAIL_MODAL_MAX_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  detailHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    marginHorizontal: -18,
    marginTop: -18,
    marginBottom: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  detailHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detailHeaderSlotLeft: {
    width: 44,
    alignItems: "flex-start",
  },
  detailHeaderSlotRight: {
    width: 44,
    alignItems: "flex-end",
  },
  detailIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  detailCloseButton: {
    padding: 2,
  },
  detailScroll: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: DETAIL_MODAL_MAX_HEIGHT - 140,
  },
  detailScrollContent: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 20,
    flexGrow: 1,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E15816",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: "#111111",
    lineHeight: 22,
    opacity: 0.98,
  },
  referralActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 0,
  },
  referralButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  referralAcceptButton: {
    backgroundColor: "rgba(76, 175, 80, 0.95)",
  },
  referralDeclineButton: {
    backgroundColor: "rgba(244, 67, 54, 0.95)",
  },
  referralButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailCloseTextButton: {
    marginHorizontal: 0,
    marginBottom: 0,
    marginTop: 4,
    backgroundColor: "#F4F4F4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  detailCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
});

export default Notification;
