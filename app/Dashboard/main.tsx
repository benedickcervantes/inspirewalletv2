import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  getActiveAnnouncements,
  getMe,
  getNotifications,
  getOrCreateMainWallet,
  getReferralTree,
  getTimeDeposits,
  getTransactions,
} from "../../configs/api";
import {
  languageChoiceDoneKey,
  SUPPORTED_LANGUAGES,
} from "../../constants/locales";
import { useLanguage } from "../../context/LanguageContext";
import { useSocket } from "../../context/SocketContext";
import { useUnreadNotifications } from "../../context/UnreadNotificationsContext";
import { setConnectionStatus } from "../../lib/connectionStatus";
import { getMaintenanceStatus } from "../../lib/maintenance";
import type { NavProp } from "../../types/navigation";
import { useResponsive } from "../../utils/responsive";
import AccountDeletionModal from "../AccountDeletion/AccountDeletionModal";
import {
  AnnouncementModal,
  type AnnouncementItem,
} from "../AnnouncementModal/AnnouncementModal";
import NotificationBadge from "../Notification/NotificationBadge";
import CardsTab from "./CardsTab";
import SavingsTab from "./SavingsTab";
import WalletTab from "./WalletTab";

// API returns raw enums; keys for translation (use t() when displaying)
const TRANSACTION_TYPE_KEYS: Record<string, string> = {
  TOP_UP: "tx.deposit",
  PAYMENT: "tx.withdraw",
  TRANSFER_OUT: "tx.transfer",
  TRANSFER_IN: "tx.received",
  FEE: "tx.fee",
  REFUND: "tx.refund",
  TIME_DEPOSIT: "tx.timeDeposit",
};

interface Transaction {
  id: string;
  type?: string;
  amount?: number;
  timestamp?: { toDate?: () => Date };
}

interface PayoutScheduleItem {
  payoutIndex: number;
  expectedDate: string;
  amount: string;
  status: "PENDING" | "PAID";
  isLastPayout?: boolean;
  principalReturned?: string;
}

// Wallet shape from API (wallet may be typed as object)
interface RawApiWallet {
  id?: string;
  balance?: number | string;
}

// Raw transaction shape from API (transactions array is unknown[])
interface RawApiTransaction {
  id?: unknown;
  type?: unknown;
  amount?: unknown;
  createdAt?: unknown;
}

interface TimeDeposit {
  id: string;
  contractType: string;
  depositSource?: "AVAILABLE_BALANCE" | "REQUEST_AMOUNT";
  amount: string;
  interestRate: string;
  status: "PENDING" | "ACTIVE" | "MATURED" | "CANCELLED";
  startDate: string | null;
  maturityDate: string | null;
  projectedStartDate: string;
  projectedMaturityDate: string;
  createdAt?: string;
  dividendEarned?: string;
  dividend?: string;
  payoutSchedule?: PayoutScheduleItem[];
  payout_schedule?: PayoutScheduleItem[]; // API may return snake_case
}

function computeTimeDepositTotal(deposits: TimeDeposit[]): number {
  return deposits
    .filter((d) => d.status === "ACTIVE" || d.status === "MATURED")
    .reduce((sum, d) => sum + (parseFloat(String(d?.amount ?? 0)) || 0), 0);
}

function computeDividend(deposits: TimeDeposit[]): number {
  // Expected dividend = sum per contract (ACTIVE/MATURED only) of dividend from schedule.
  // For each payout: use only dividend (if principalReturned is set, amount includes principal so subtract it).
  const activeOnly = deposits.filter((d) => d.status === "ACTIVE");
  return activeOnly.reduce((total, d) => {
    const schedule = d.payoutSchedule ?? d.payout_schedule ?? [];
    const contractDividend = (Array.isArray(schedule) ? schedule : []).reduce(
      (
        s: number,
        p: {
          amount?: string | number;
          principalReturned?: string | number;
          principal_returned?: string;
        },
      ) => {
        const amt =
          typeof p?.amount === "number"
            ? p.amount
            : parseFloat(String(p?.amount ?? 0));
        const principal = parseFloat(
          String(p?.principalReturned ?? p?.principal_returned ?? 0),
        );
        const dividendOnly = Number.isNaN(amt)
          ? 0
          : principal > 0
            ? Math.max(0, amt - principal)
            : amt;
        return s + dividendOnly;
      },
      0,
    );
    return total + contractDividend;
  }, 0);
}

function computeDepositGrowth(
  deposits: TimeDeposit[],
): { month: string; amount: number }[] {
  const months: { month: string; amount: number }[] = [];
  const year = new Date().getFullYear();
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  for (let m = 0; m < 12; m++) {
    const monthEnd = new Date(year, m + 1, 0);
    let amount = 0;
    for (const dep of deposits) {
      if (dep.status !== "ACTIVE" && dep.status !== "MATURED") continue;
      const start = dep.startDate
        ? new Date(dep.startDate)
        : new Date(dep.projectedStartDate);
      const maturity = dep.maturityDate
        ? new Date(dep.maturityDate)
        : new Date(dep.projectedMaturityDate);
      if (start <= monthEnd && maturity > monthEnd) {
        amount += parseFloat(dep.amount) || 0;
      }
    }
    months.push({ month: monthLabels[m], amount });
  }
  return months;
}

function getTransactionTypeLabel(
  t: (key: string) => string,
  type?: string,
): string {
  if (!type) return t("tx.transaction");
  const key = TRANSACTION_TYPE_KEYS[type];
  return key ? t(key) : type;
}

export default function Dashboard() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, horizontalPadding, isSmallScreen } = useResponsive();
  const qaSpacing = width < 360 ? 0.75 : isSmallScreen ? 0.85 : 1;
  const qaLabelSize = width < 360 ? 8 : isSmallScreen ? 9 : 11;
  const qaIconSize = width < 360 ? 18 : isSmallScreen ? 20 : 24;
  const carouselWidth = width - horizontalPadding * 2;
  const [userData, setUserData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [timeDeposit, setTimeDeposit] = useState(0);
  const [deposits, setDeposits] = useState<TimeDeposit[]>([]);
  const [activeTab, setActiveTab] = useState("Wallet");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const languageScrollRef = useRef<ScrollView | null>(null);
  const mainWalletIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);
  const { unreadCount: unreadNotifications, setUnreadCount: setUnreadNotifications } =
    useUnreadNotifications();
  const [userReferrer, setUserReferrer] = useState<{
    referralCode?: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);
  const [showFirstTimeLanguageModal, setShowFirstTimeLanguageModal] =
    useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState<
    Record<string, boolean>
  >({});
  const [selectedMaintenanceService, setSelectedMaintenanceService] = useState<
    string | null
  >(null);
  const [showBankingServiceLockedModal, setShowBankingServiceLockedModal] =
    useState(false);
  const [showKycLockedModal, setShowKycLockedModal] = useState(false);
  const [activeCardDesign, setActiveCardDesign] = useState<string | null>(null);

  const BANKING_SERVICE_MIN_BALANCE = 200_000;
  const isBankingServiceLocked = timeDeposit < BANKING_SERVICE_MIN_BALANCE;
  const userRole = String(userData?.role ?? "").toUpperCase();
  const kycAccountStatus = String(userData?.kycAccountStatus ?? "").toUpperCase();
  const kycStatus = String(userData?.kycStatus ?? "").toUpperCase();
  const isKycVerified =
    kycAccountStatus === "VERIFIED" ||
    kycStatus === "APPROVED" ||
    kycStatus === "VERIFIED";
  const isKycRestrictedUser = userRole === "USER" && !isKycVerified;

  const getActiveCardStorageKey = (accountNumber?: string) =>
    accountNumber
      ? `active_card_design_${accountNumber}`
      : "active_card_design";

  const languageSlides = [
    {
      image: require("../../assets/banner/DeskHRX.png"),
      url: "https://www.deskhrx.com/",
    },
    {
      image: require("../../assets/banner/Loopwork.png"),
      url: "https://www.inspire-loopwork.com",
    },
    { image: require("../../assets/banner/BuyCards.png"), action: "cards" },
    { image: require("../../assets/banner/CryptoinIwallet.png") },
    { image: require("../../assets/banner/DepositviaCrypto.png") },
    { image: require("../../assets/banner/ChangeLanguage.png") },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.goodMorning");
    if (hour < 18) return t("dashboard.goodAfternoon");
    return t("dashboard.goodEvening");
  };

  useEffect(() => {
    const params = route.params as
      | { initialTab?: "Wallet" | "Investment" | "Cards" }
      | undefined;
    if (params?.initialTab) {
      setActiveTab(params.initialTab);
    }
  }, [route.params]);

  useEffect(() => {
    const init = async () => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        (navigation as unknown as NavProp).replace("Welcome");
        return;
      }

      // Backend only — no Firebase
      let user: Record<string, unknown> | null = null;
      const userJson = await AsyncStorage.getItem("user");
      if (userJson) {
        try {
          user = JSON.parse(userJson) as Record<string, unknown>;
        } catch {
          user = null;
        }
      }
      const meRes = await getMe(accessToken);
      if (meRes.success && meRes.user) {
        user = {
          ...(user ?? {}),
          ...(meRes.user as Record<string, unknown>),
        };
      }
      if (user) {
        setUserData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountNumber: user.accountNumber,
          role: (user as Record<string, unknown>).role ?? 'USER',
          kycAccountStatus: (user as Record<string, unknown>).kycAccountStatus,
          kycStatus: (user as Record<string, unknown>).kycStatus,
        });

        // Load cached active card design once we know the account number
        try {
          const accountNumber = (user as { accountNumber?: string })
            ?.accountNumber;
          if (accountNumber) {
            const key = getActiveCardStorageKey(accountNumber);
            const cachedDesign = await AsyncStorage.getItem(key);
            if (cachedDesign) {
              setActiveCardDesign(cachedDesign);
            }
          }
        } catch (e) {
          if (__DEV__) {
            console.error(
              "[Dashboard] Failed to load cached active card design",
              e,
            );
          }
        }
      }

      setAvailableBalance(0);
      setTimeDeposit(0);
      setDeposits([]);
      setUnreadNotifications(0);

      const { success, wallet } = await getOrCreateMainWallet(accessToken);
      const w = wallet as RawApiWallet | undefined;
      mainWalletIdRef.current = w?.id ?? null;
      if (success && w?.balance != null) {
        const bal = parseFloat(String(w.balance));
        setAvailableBalance(Number.isNaN(bal) ? 0 : bal);
      }
      setIsBalanceLoading(false);

      const walletId = w?.id;
      const [tdRes, treeRes, txRes, status, notifRes, hasChosen, annRes] =
        await Promise.all([
          getTimeDeposits(accessToken),
          getReferralTree(accessToken),
          getTransactions(accessToken, { walletId, limit: 20 }),
          getMaintenanceStatus(),
          getNotifications(accessToken, { limit: 50 }),
          AsyncStorage.getItem(
            languageChoiceDoneKey(
              (user as { accountNumber?: string })?.accountNumber,
            ),
          ),
          getActiveAnnouncements(accessToken),
        ]);

      if (tdRes.success && Array.isArray(tdRes.deposits)) {
        const list = tdRes.deposits as TimeDeposit[];
        setDeposits(list);
        setTimeDeposit(computeTimeDepositTotal(list));
      } else if (!tdRes.success && __DEV__) {
        console.warn("[Dashboard] getTimeDeposits failed:", tdRes.error);
      }

      if (treeRes.success && treeRes.tree) {
        const tree = treeRes.tree as {
          ancestors?: {
            referralCode?: string;
            firstName?: string;
            lastName?: string;
          }[];
        };
        const first = tree.ancestors?.[0];
        if (
          first &&
          (first.referralCode ??
            (first as { referral_code?: string }).referral_code)
        ) {
          setUserReferrer({
            referralCode:
              first.referralCode ??
              (first as { referral_code?: string }).referral_code,
            firstName:
              first.firstName ?? (first as { first_name?: string }).first_name,
            lastName:
              first.lastName ?? (first as { last_name?: string }).last_name,
          });
        } else {
          setUserReferrer(null);
        }
      } else {
        setUserReferrer(null);
      }

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
          timestamp: {
            toDate: () => new Date(String(tx.createdAt ?? "")),
          },
        }));
        setRecentTransactions(mapped);
      }

      if (hasChosen !== "true") {
        setShowFirstTimeLanguageModal(true);
      }

      setMaintenanceStatus(status);

      if (notifRes.success && notifRes.data) {
        const unreadCount = (notifRes.data as { isRead: boolean }[]).filter(
          (n) => !n.isRead,
        ).length;
        setUnreadNotifications(unreadCount);
      }

      if (annRes?.success && Array.isArray(annRes.data) && annRes.data.length) {
        const list = (annRes.data as AnnouncementItem[]).map((a) => ({
          id: a.id,
          title: (a as { title?: string }).title ?? "Announcement",
          message: (a as { message?: string }).message ?? "",
          imageUrl: (a as { imageUrl?: string | null }).imageUrl ?? null,
        }));
        setAnnouncements(list);
        setAnnouncementIndex(0);
        setAnnouncementVisible(true);
      } else {
        setAnnouncements([]);
        setAnnouncementVisible(false);
      }
    };

    init();
  }, [navigation]);

  useEffect(() => {
    if (!announcementVisible) return;
    if (!announcements.length) return;
    const timer = setTimeout(() => {
      const next = announcementIndex + 1;
      if (next >= announcements.length) {
        setAnnouncementVisible(false);
      } else {
        setAnnouncementIndex(next);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [announcementVisible, announcementIndex, announcements.length]);

  const refetchJwtData = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) return;
    const meRes = await getMe(accessToken);
    if (meRes.success && meRes.user) {
      const user = meRes.user as Record<string, unknown>;
      setUserData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountNumber: user.accountNumber,
        role: (user as Record<string, unknown>).role ?? "USER",
        kycAccountStatus: (user as Record<string, unknown>).kycAccountStatus,
        kycStatus: (user as Record<string, unknown>).kycStatus,
      });
    }
    const { success: walletSuccess, wallet } =
      await getOrCreateMainWallet(accessToken);
    const w = wallet as RawApiWallet | undefined;
    if (walletSuccess && w?.balance != null) {
      const bal = parseFloat(String(w.balance));
      setAvailableBalance(Number.isNaN(bal) ? 0 : bal);
    }
    const tdRes = await getTimeDeposits(accessToken);
    if (tdRes.success && Array.isArray(tdRes.deposits)) {
      const list = tdRes.deposits as TimeDeposit[];
      setDeposits(list);
      setTimeDeposit(computeTimeDepositTotal(list));
    } else if (!tdRes.success && __DEV__) {
      console.warn("[Dashboard] getTimeDeposits failed:", tdRes.error);
    }
    const treeRes = await getReferralTree(accessToken);
    if (treeRes.success && treeRes.tree) {
      const tree = treeRes.tree as {
        ancestors?: {
          referralCode?: string;
          firstName?: string;
          lastName?: string;
        }[];
      };
      const first = tree.ancestors?.[0];
      if (
        first &&
        (first.referralCode ??
          (first as { referral_code?: string }).referral_code)
      ) {
        setUserReferrer({
          referralCode:
            first.referralCode ??
            (first as { referral_code?: string }).referral_code,
          firstName:
            first.firstName ?? (first as { first_name?: string }).first_name,
          lastName:
            first.lastName ?? (first as { last_name?: string }).last_name,
        });
      } else {
        setUserReferrer(null);
      }
    } else {
      setUserReferrer(null);
    }
    const txRes = await getTransactions(accessToken, {
      walletId: w?.id ?? mainWalletIdRef.current ?? undefined,
      limit: 20,
    });
    if (txRes.success && txRes.transactions) {
      const txs = txRes.transactions as RawApiTransaction[];
      const mapped: Transaction[] = txs.map((tx) => ({
        id: String(tx.id ?? ""),
        type: String(tx.type ?? ""),
        amount: (() => {
          const a = parseFloat(String(tx.amount ?? 0));
          return Number.isNaN(a) ? 0 : a;
        })(),
        timestamp: {
          toDate: () => new Date(String(tx.createdAt ?? "")),
        },
      }));
      setRecentTransactions(mapped);
    }

    const notifRes = await getNotifications(accessToken, { limit: 50 });
    if (notifRes.success && notifRes.data) {
      const unreadCount = (notifRes.data as { isRead: boolean }[]).filter(
        (n) => !n.isRead,
      ).length;
      setUnreadNotifications(unreadCount);
    }
  }, []);

  const { getSocket, isConnected: isSocketConnected } = useSocket();

  useEffect(() => {
    const startPolling = () => {
      if (pollIntervalRef.current) return;
      refetchJwtData();
      pollIntervalRef.current = setInterval(refetchJwtData, 15000);
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    if (!isSocketConnected) {
      startPolling();
    } else {
      stopPolling();
    }

    setConnectionStatus(isSocketConnected);
    const socket = getSocket();

    if (socket && isSocketConnected) {
      const handleWalletUpdate = (payload: {
        walletId?: string;
        balance?: number | string;
      }) => {
        if (
          payload?.walletId === mainWalletIdRef.current &&
          payload?.balance != null
        ) {
          const bal = parseFloat(String(payload.balance));
          setAvailableBalance(Number.isNaN(bal) ? 0 : bal);
          // Also refresh time deposits & related locks in real-time
          refetchJwtData();
        }
      };

      const handleTransactionCreated = () => {
        refetchJwtData();
      };

      socket.on("WALLET_UPDATE", handleWalletUpdate);
      socket.on("TRANSACTION_CREATED", handleTransactionCreated);

      return () => {
        socket.off("WALLET_UPDATE", handleWalletUpdate);
        socket.off("TRANSACTION_CREATED", handleTransactionCreated);
      };
    }

    return () => {
      stopPolling();
    };
  }, [isSocketConnected, getSocket, refetchJwtData]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("access_token").then((token) => {
        if (token) refetchJwtData();
      });
      // Also refresh maintenance status
      getMaintenanceStatus().then(setMaintenanceStatus);
    }, [refetchJwtData]),
  );

  useEffect(() => {
    if (activeTab !== "Cards" && isCardFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsCardFlipped(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLanguageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % languageSlides.length;
        if (languageScrollRef.current) {
          languageScrollRef.current.scrollTo({
            x: nextIndex * carouselWidth,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselWidth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const flipCard = () => {
    if (activeTab !== "Cards") return;
    if (isCardFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(flipAnimation, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
    setIsCardFlipped(!isCardFlipped);
  };

  const menuItems = [
    {
      icon: "wallet-outline",
      labelKey: "dashboard.eWallet",
      route: "EwalletService",
    },
    { icon: "headset", labelKey: "support.title", route: "Message" },
    { icon: "chart-line", labelKey: "dashboard.stock", route: "Stockholder" },
    { icon: "account", labelKey: "dashboard.agent", route: "AgentRequest" },
    {
      icon: "chart-areaspline",
      labelKey: "dashboard.trading",
      route: "PlayEarn",
    },
  ];

  const handleFirstTimeLanguageSelect = (label: string) => {
    setLanguage(label);
    const accountNumber = userData?.accountNumber as string | undefined;
    AsyncStorage.setItem(languageChoiceDoneKey(accountNumber), "true");
    setShowFirstTimeLanguageModal(false);
  };

  const handleBannerPress = async (url?: string, action?: string) => {
    if (action === "cards") {
      setActiveTab("Cards");
      return;
    }
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AnnouncementModal
        visible={announcementVisible && announcements.length > 0}
        announcement={announcements[announcementIndex] ?? null}
        onClose={() => {
          const next = announcementIndex + 1;
          if (next >= announcements.length) {
            setAnnouncementVisible(false);
          } else {
            setAnnouncementIndex(next);
          }
        }}
      />
      <Modal
        visible={selectedMaintenanceService !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMaintenanceService(null)}
      >
        <View style={styles.maintenanceModalOverlay}>
          <View style={styles.maintenanceModalContent}>
            <View style={styles.maintenanceHeader}>
              <View style={styles.maintenanceIconCircle}>
                <MaterialCommunityIcons
                  name="tools"
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.maintenanceTitle}>{t("dashboard.underMaintenance")}</Text>
              {selectedMaintenanceService && (
                <Text style={styles.maintenanceSubtitle}>
                  {t(selectedMaintenanceService)}
                </Text>
              )}
            </View>
            <Text style={styles.maintenanceModalMessage}>
              {t("dashboard.maintenanceMessage")}
            </Text>
            <TouchableOpacity
              style={styles.maintenanceModalButton}
              onPress={() => setSelectedMaintenanceService(null)}
            >
              <Text style={styles.maintenanceModalButtonText}>{t("dashboard.gotIt")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showBankingServiceLockedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankingServiceLockedModal(false)}
      >
        <View style={styles.maintenanceModalOverlay}>
          <View style={styles.bankingLockModalContent}>
            <View style={styles.bankingLockHeader}>
              <View style={styles.bankingLockIconCircle}>
                <MaterialCommunityIcons
                  name="lock"
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.bankingLockTitle}>
                {t("dashboard.bankingServiceLockedTitle")}
              </Text>
            </View>
            <View style={styles.bankingLockRequirementBox}>
              <Text style={styles.bankingLockRequirementLabel}>
                {t("dashboard.bankingServiceLockedRequirement")}
              </Text>
              <Text style={styles.bankingLockRequirementValue}>₱200,000</Text>
            </View>
            <Text style={styles.bankingLockMessage}>
              {t("dashboard.bankingServiceLockedMessage")}
            </Text>
            <TouchableOpacity
              style={styles.maintenanceModalButton}
              onPress={() => setShowBankingServiceLockedModal(false)}
            >
              <Text style={styles.maintenanceModalButtonText}>{t("dashboard.gotIt")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showKycLockedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKycLockedModal(false)}
      >
        <View style={styles.maintenanceModalOverlay}>
          <View style={styles.bankingLockModalContent}>
            <View style={styles.bankingLockHeader}>
              <View style={styles.bankingLockIconCircle}>
                <MaterialCommunityIcons
                  name="shield-alert"
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.bankingLockTitle}>
                {t("dashboard.kycLockedTitle")}
              </Text>
            </View>
            <View style={styles.bankingLockRequirementBox}>
              <Text style={styles.bankingLockRequirementLabel}>
                {t("dashboard.kycLockedRequirement")}
              </Text>
              <Text style={styles.bankingLockRequirementValue}>
                {t("dashboard.kycLockedRequirementValue")}
              </Text>
            </View>
            <Text style={styles.bankingLockMessage}>
              {t("dashboard.kycLockedMessage")}
            </Text>
            <TouchableOpacity
              style={styles.kycVerifyModalButton}
              onPress={() => {
                setShowKycLockedModal(false);
                (navigation as { navigate: (name: string) => void }).navigate(
                  "KYCVerification",
                );
              }}
            >
              <Text style={styles.kycVerifyModalButtonText}>
                {t("profile.verify")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.maintenanceModalButton}
              onPress={() => setShowKycLockedModal(false)}
            >
              <Text style={styles.maintenanceModalButtonText}>{t("dashboard.gotIt")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showFirstTimeLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.languageModalOverlay}>
          <View style={styles.languageModalContentOuter}>
            <View style={styles.languageModalHeader}>
              <View style={styles.languageMapGlobe}>
                <Ionicons name="globe-outline" size={40} color="#DE5212" />
              </View>
              <Text style={styles.languageModalTitle}>
                {t("profile.selectLanguage")}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.languageOption}
                  onPress={() => handleFirstTimeLanguageSelect(label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageOptionFlag}>{flag}</Text>
                  <Text style={styles.languageOptionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Personal")}
              activeOpacity={0.7}
              style={styles.avatar}
            >
              <Ionicons name="person" size={28} color="#E15816" />
            </TouchableOpacity>
            <View style={styles.headerUserText}>
              <Text style={styles.greeting} numberOfLines={1}>
                {getGreeting()}
              </Text>
              <Text
                style={styles.userName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {(userData?.firstName as string) ||
                  (userData?.fullName as string) ||
                  "User"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("Notification")}
            >
              <Ionicons name="notifications" size={24} color="#E15816" />
          <NotificationBadge />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons name="settings-outline" size={24} color="#E15816" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.tabs,
              {
                paddingHorizontal: horizontalPadding,
                paddingVertical: isSmallScreen ? 10 : 12,
                gap: isSmallScreen ? 10 : 16,
              },
            ]}
          >
            {(["Wallet", "Investment", "Cards"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                  {
                    paddingHorizontal: width < 360 ? 16 : width < 400 ? 22 : 28,
                    paddingVertical: isSmallScreen ? 10 : 12,
                    minWidth: width < 360 ? 80 : width < 400 ? 90 : 100,
                    minHeight: isSmallScreen ? 38 : 44,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                    { fontSize: width < 360 ? 12 : width < 400 ? 13 : 14 },
                  ]}
                  numberOfLines={1}
                >
                  {t(
                    tab === "Wallet"
                      ? "dashboard.wallet"
                      : tab === "Investment"
                        ? "dashboard.investment"
                        : "dashboard.cards",
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "Wallet" && (
            <WalletTab
              userData={userData}
              availableBalance={availableBalance}
              isBalanceLoading={isBalanceLoading}
              formatCurrency={formatCurrency}
              flipAnimation={flipAnimation}
              isCardFlipped={isCardFlipped}
              flipCard={flipCard}
              isWithdrawalLocked={isKycRestrictedUser}
              onWithdrawalLockedPress={() => setShowKycLockedModal(true)}
            />
          )}
          {activeTab === "Cards" && (
            <CardsTab
              userData={userData}
              availableBalance={availableBalance}
              isBalanceLoading={isBalanceLoading}
              formatCurrency={formatCurrency}
              flipAnimation={flipAnimation}
              isCardFlipped={isCardFlipped}
              flipCard={flipCard}
              initialDesign={activeCardDesign}
              onActiveDesignChange={setActiveCardDesign}
              onRefresh={refetchJwtData}
              isBuyingCardsLocked={isKycRestrictedUser}
              onBuyingCardsLockedPress={() => setShowKycLockedModal(true)}
            />
          )}
          {activeTab === "Investment" && (
            <SavingsTab
              userData={userData}
              timeDeposit={timeDeposit}
              dividend={computeDividend(deposits)}
              depositGrowthData={computeDepositGrowth(deposits)}
              deposits={deposits}
              formatCurrency={formatCurrency}
              onRefresh={refetchJwtData}
              userReferrer={userReferrer}
            />
          )}

          {activeTab !== "Cards" && activeTab !== "Investment" && (
            <View
              style={[
                styles.quickActionsContainer,
                {
                  paddingHorizontal: horizontalPadding,
                  paddingVertical: Math.round(16 * qaSpacing),
                  gap: Math.round(10 * qaSpacing),
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isKycRestrictedUser && styles.quickActionButtonLocked,
                  {
                    paddingVertical: Math.round(14 * qaSpacing),
                    paddingHorizontal: Math.round(6 * qaSpacing),
                    minWidth: 0,
                  },
                ]}
                onPress={() => {
                  if (isKycRestrictedUser) {
                    setShowKycLockedModal(true);
                  } else {
                    navigation.navigate("Transfer");
                  }
                }}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    isKycRestrictedUser && styles.quickActionIconLocked,
                    {
                      width: Math.round(48 * qaSpacing),
                      height: Math.round(48 * qaSpacing),
                      marginBottom: Math.round(6 * qaSpacing),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={qaIconSize}
                    color={isKycRestrictedUser ? "#CCCCCC" : "#E15816"}
                  />
                  {isKycRestrictedUser && (
                    <View style={styles.quickActionLockBadge}>
                      <MaterialCommunityIcons
                        name="lock"
                        size={13}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.quickActionLabel,
                    { fontSize: qaLabelSize },
                    isKycRestrictedUser && styles.quickActionLabelLocked,
                  ]}
                  numberOfLines={2}
                >
                  {t("dashboard.transfer")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isBankingServiceLocked && styles.quickActionButtonLocked,
                  {
                    paddingVertical: Math.round(14 * qaSpacing),
                    paddingHorizontal: Math.round(6 * qaSpacing),
                    minWidth: 0,
                  },
                ]}
                onPress={() => {
                  if (isBankingServiceLocked) {
                    setShowBankingServiceLockedModal(true);
                  } else {
                    (
                      navigation as { navigate: (name: string) => void }
                    ).navigate("Bdo");
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    isBankingServiceLocked && styles.quickActionIconLocked,
                    {
                      width: Math.round(48 * qaSpacing),
                      height: Math.round(48 * qaSpacing),
                      marginBottom: Math.round(6 * qaSpacing),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bank"
                    size={qaIconSize}
                    color={isBankingServiceLocked ? "#CCCCCC" : "#E15816"}
                  />
                  {isBankingServiceLocked && (
                    <View style={styles.quickActionLockBadge}>
                      <MaterialCommunityIcons
                        name="lock"
                        size={13}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.quickActionLabel,
                    { fontSize: qaLabelSize },
                    isBankingServiceLocked && styles.quickActionLabelLocked,
                  ]}
                  numberOfLines={2}
                >
                  {t("dashboard.bankingService")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isKycRestrictedUser && styles.quickActionButtonLocked,
                  {
                    paddingVertical: Math.round(14 * qaSpacing),
                    paddingHorizontal: Math.round(6 * qaSpacing),
                    minWidth: 0,
                  },
                ]}
                onPress={() => {
                  if (isKycRestrictedUser) {
                    setShowKycLockedModal(true);
                  } else {
                    navigation.navigate("Travel");
                  }
                }}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    isKycRestrictedUser && styles.quickActionIconLocked,
                    {
                      width: Math.round(48 * qaSpacing),
                      height: Math.round(48 * qaSpacing),
                      marginBottom: Math.round(6 * qaSpacing),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="airplane"
                    size={qaIconSize}
                    color={isKycRestrictedUser ? "#CCCCCC" : "#E15816"}
                  />
                  {isKycRestrictedUser && (
                    <View style={styles.quickActionLockBadge}>
                      <MaterialCommunityIcons
                        name="lock"
                        size={13}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.quickActionLabel,
                    { fontSize: qaLabelSize },
                    isKycRestrictedUser && styles.quickActionLabelLocked,
                  ]}
                  numberOfLines={2}
                >
                  {t("dashboard.travelProtection")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  {
                    paddingVertical: Math.round(14 * qaSpacing),
                    paddingHorizontal: Math.round(6 * qaSpacing),
                    minWidth: 0,
                  },
                ]}
                onPress={() => navigation.navigate("History")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      width: Math.round(48 * qaSpacing),
                      height: Math.round(48 * qaSpacing),
                      marginBottom: Math.round(6 * qaSpacing),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="history"
                    size={qaIconSize}
                    color="#E15816"
                  />
                </View>
                <Text
                  style={[styles.quickActionLabel, { fontSize: qaLabelSize }]}
                  numberOfLines={2}
                >
                  {t("dashboard.history")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab !== "Cards" && activeTab !== "Investment" && (
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderTitle}>
                  {t("dashboard.services")}
                </Text>
              </View>
              <View style={styles.menuGrid}>
                {menuItems.map((item, index) => {
                  // Map route names to service IDs
                  const routeToServiceMap: Record<string, string> = {
                    EwalletService: "ewallet",
                    Message: "message",
                    Stockholder: "stock",
                    AgentRequest: "agent",
                    PlayEarn: "trading",
                  };
                  const serviceId =
                    routeToServiceMap[item.route] || item.route.toLowerCase();
                  const isUnderMaintenance = maintenanceStatus[serviceId];
                  const isEwalletLockedByDeposit =
                    item.route === "EwalletService" && isBankingServiceLocked;
                  const isTradingLockedByKyc =
                    item.route === "PlayEarn" && isKycRestrictedUser;
                  // DEVELOPER, ADMIN and SUPER_ADMIN bypass maintenance blocks
                  const userRole = userData?.role as string | undefined;
                  const isDeveloperOrAdmin =
                    userRole === 'DEVELOPER' ||
                    userRole === 'ADMIN' ||
                    userRole === 'SUPER_ADMIN';
                  const isBlocked =
                    (isUnderMaintenance && !isDeveloperOrAdmin) ||
                    isEwalletLockedByDeposit ||
                    isTradingLockedByKyc;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItem,
                        isBlocked && styles.menuItemDisabled,
                      ]}
                      onPress={() => {
                        if (isBlocked) {
                          if (isEwalletLockedByDeposit) {
                            setShowBankingServiceLockedModal(true);
                            return;
                          }
                          if (isTradingLockedByKyc) {
                            setShowKycLockedModal(true);
                            return;
                          }
                          setSelectedMaintenanceService(item.labelKey);
                        } else {
                          (
                            navigation as { navigate: (name: string) => void }
                          ).navigate(item.route);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.menuIcon,
                          isBlocked && styles.menuIconDisabled,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            item.icon as React.ComponentProps<
                              typeof MaterialCommunityIcons
                            >["name"]
                          }
                          size={24}
                          color={isBlocked ? "#CCCCCC" : "#000000"}
                        />
                        {isBlocked && (
                          <View style={styles.quickActionLockBadge}>
                            <MaterialCommunityIcons
                              name="lock"
                              size={13}
                              color="#FFFFFF"
                            />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.menuLabel,
                          isBlocked && styles.menuLabelDisabled,
                        ]}
                      >
                        {t(item.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {activeTab !== "Investment" && activeTab !== "Cards" && (
            <View
              style={[
                styles.languageCarouselContainer,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              <View style={styles.languageCarouselWrapper}>
                <ScrollView
                  ref={languageScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x / carouselWidth,
                    );
                    setCurrentLanguageIndex(index);
                  }}
                  style={styles.languageScrollView}
                >
                  {languageSlides.map((slide, index) => (
                    <View
                      key={index}
                      style={[styles.languageSlide, { width: carouselWidth }]}
                    >
                      {slide.url || slide.action ? (
                        <TouchableOpacity
                          onPress={() =>
                            handleBannerPress(slide.url, slide.action)
                          }
                          activeOpacity={0.8}
                          style={styles.languageSlideImageContainer}
                        >
                          <Image
                            source={slide.image}
                            style={styles.languageSlideImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        <Image
                          source={slide.image}
                          style={styles.languageSlideImage}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.languagePaginationDots}>
                {languageSlides.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.languageDot,
                      currentLanguageIndex === index &&
                        styles.languageActiveDot,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {activeTab !== "Investment" && activeTab !== "Cards" && (
            <View style={styles.transactionSection}>
              <View style={styles.transactionHeader}>
                <Ionicons name="time-outline" size={20} color="#E15816" />
                <Text style={styles.transactionTitle}>
                  {t("dashboard.transactionHistory")}
                </Text>
              </View>
              {recentTransactions.length > 0 ? (
                recentTransactions.slice(0, 3).map((transaction) => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      <MaterialCommunityIcons
                        name="swap-horizontal"
                        size={24}
                        color="#E15816"
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionName}>
                        {getTransactionTypeLabel(t, transaction.type)}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {transaction.timestamp
                          ?.toDate?.()
                          ?.toLocaleDateString() || ""}
                      </Text>
                    </View>
                    <Text style={styles.transactionAmount}>
                      ₱{formatCurrency(transaction.amount || 0)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={24}
                      color="#E15816"
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName}>
                      {t("dashboard.freeDefaultCard")}
                    </Text>
                    <Text style={styles.transactionDate}>
                      February 03, 2026
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>₱0.00</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t("dashboard.createdByInspire")}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      <AccountDeletionModal />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  headerUserTouch: { flex: 1, minWidth: 0 },
  headerUserText: { flex: 1, minWidth: 0, justifyContent: "center" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E15816",
  },
  greeting: { fontSize: 14, color: "#999", marginBottom: 2 },
  userName: { fontSize: 16, fontWeight: "700", color: "#333" },
  headerRight: { flexDirection: "row", gap: 12 },
  iconButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    gap: 16,
  },
  tab: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 100,
    minHeight: 44,
    alignItems: "center",
  },
  activeTab: { backgroundColor: "#E15816" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#666" },
  activeTabText: { color: "#FFFFFF" },
  quickActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    position: "relative",
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 14,
  },
  quickActionButtonLocked: {
    backgroundColor: "#FAFAFA",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
  },
  quickActionIconLocked: {
    backgroundColor: "#F0F0F0",
  },
  quickActionLabelLocked: {
    color: "#999",
  },
  quickActionLockBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 26,
    height: 26,
    marginTop: -13,
    marginLeft: -13,
    borderRadius: 13,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  bankingLockModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  bankingLockHeader: {
    alignItems: "center",
    marginBottom: 18,
  },
  bankingLockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  bankingLockTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
  },
  bankingLockRequirementBox: {
    backgroundColor: "#FFF8F5",
    borderWidth: 1,
    borderColor: "#FFE4D6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: "center",
    width: "100%",
  },
  bankingLockRequirementLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  bankingLockRequirementValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E15816",
  },
  bankingLockMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  menuContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuHeader: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuHeaderTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 0,
  },
  menuItem: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
    position: "relative",
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
    position: "relative",
  },
  customIconImage: { width: 24, height: 24 },
  menuLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 12,
  },
  menuItemDisabled: {},
  menuIconDisabled: {
    backgroundColor: "#FAFAFA",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
  },
  menuLabelDisabled: {
    color: "#999",
  },
  languageCarouselContainer: { marginVertical: 16 },
  languageCarouselWrapper: { position: "relative", marginBottom: 12 },
  languageScrollView: { borderRadius: 16 },
  languageSlide: {
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
  },
  languageSlideImageContainer: { width: "100%", height: "100%" },
  languageSlideImage: { width: "100%", height: "100%", borderRadius: 16 },
  languagePaginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
  },
  languageActiveDot: { backgroundColor: "#E15816", width: 24 },
  transactionSection: { paddingHorizontal: 20, marginBottom: 20 },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  transactionTitle: { fontSize: 16, fontWeight: "600", color: "#E15816" },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: { flex: 1 },
  transactionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  transactionDate: { fontSize: 12, color: "#999" },
  transactionAmount: { fontSize: 14, fontWeight: "600", color: "#E15816" },
  footer: { paddingVertical: 24, alignItems: "center" },
  footerText: { fontSize: 12, color: "#999", letterSpacing: 1 },
  // First-time language modal
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  maintenanceModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  maintenanceModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  maintenanceHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  maintenanceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  maintenanceTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
  },
  maintenanceSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  maintenanceModalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  maintenanceModalButton: {
    backgroundColor: "#E15816",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: "100%",
  },
  maintenanceModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  kycVerifyModalButton: {
    width: "100%",
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E15816",
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 10,
  },
  kycVerifyModalButtonText: {
    color: "#E15816",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  languageModalContentOuter: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  languageModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  languageMapGlobe: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(222, 82, 18, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(222, 82, 18, 0.3)",
  },
  languageModalTitle: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk-Bold",
    color: "#333333",
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  languageOptionSelected: {
    backgroundColor: "#FFF0E8",
    borderColor: "#E15816",
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "SF-Pro-Rounded-Medium",
    color: "#333333",
  },
  languageOptionTextSelected: {
    fontFamily: "SF-Pro-Rounded-Bold",
    color: "#E15816",
  },
});
