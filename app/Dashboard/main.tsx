import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
import { setConnectionStatus } from "../../lib/connectionStatus";
import { getMaintenanceStatus } from "../../lib/maintenance";
import type { NavProp } from "../../types/navigation";
import { useResponsive } from "../../utils/responsive";
import CustomLoader from "../Loader/CustomLoader";
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
    .filter(
      (d) =>
        d.status === "ACTIVE" ||
        d.status === "MATURED" ||
        d.status === "PENDING",
    )
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
  const { t, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, horizontalPadding } = useResponsive();
  const carouselWidth = width - horizontalPadding * 2;
  const [navigatingToProfile, setNavigatingToProfile] = useState(false);
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [userData, setUserData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [availableBalance, setAvailableBalance] = useState(0);
  const [timeDeposit, setTimeDeposit] = useState(0);
  const [deposits, setDeposits] = useState<TimeDeposit[]>([]);
  const [activeTab, setActiveTab] = useState("Wallet");
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const languageScrollRef = useRef<ScrollView | null>(null);
  const mainWalletIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
  const [activeCardDesign, setActiveCardDesign] = useState<string | null>(null);

  const getActiveCardStorageKey = (accountNumber?: string) =>
    accountNumber ? `active_card_design_${accountNumber}` : "active_card_design";

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
      if (!user?.firstName) {
        const meRes = await getMe(accessToken);
        if (meRes.success && meRes.user)
          user = meRes.user as Record<string, unknown>;
      }
      if (user) {
        setUserData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountNumber: user.accountNumber,
        });

        // Load cached active card design once we know the account number
        try {
          const accountNumber = (user as { accountNumber?: string })?.accountNumber;
          if (accountNumber) {
            const key = getActiveCardStorageKey(accountNumber);
            const cachedDesign = await AsyncStorage.getItem(key);
            if (cachedDesign) {
              setActiveCardDesign(cachedDesign);
            }
          }
        } catch (e) {
          if (__DEV__) {
            console.error("[Dashboard] Failed to load cached active card design", e);
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
        walletId: w?.id,
        limit: 20,
      });
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

      // First-time login: show language picker if this user hasn't chosen yet
      const accountNumber = (user as { accountNumber?: string })?.accountNumber;
      const choiceKey = languageChoiceDoneKey(accountNumber);
      const hasChosen = await AsyncStorage.getItem(choiceKey);
      if (hasChosen !== "true") {
        setShowFirstTimeLanguageModal(true);
      }

      // Check maintenance status for all services
      const status = await getMaintenanceStatus();
      setMaintenanceStatus(status);

      // Fetch unread notifications count
      const notifRes = await getNotifications(accessToken, { limit: 50 });
      if (notifRes.success && notifRes.data) {
        const unreadCount = (notifRes.data as { isRead: boolean }[]).filter(n => !n.isRead).length;
        setUnreadNotifications(unreadCount);
      }

      setInitialLoad(false);
    };

    init();
  }, [navigation]);

  const refetchJwtData = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) return;
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
      const unreadCount = (notifRes.data as { isRead: boolean }[]).filter(n => !n.isRead).length;
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
    { icon: "headset", labelKey: "Support", route: "Message" },
    { icon: "chart-line", labelKey: "dashboard.stock", route: "Stockholder" },
    { icon: "format-list-bulleted", labelKey: "dashboard.task", route: "Task" },
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

  if (initialLoad) {
    return <CustomLoader text="LOADING DASHBOARD..." />;
  }

  if (navigatingToProfile) {
    return <CustomLoader text="LOADING" />;
  }

  if (navigatingAction === "AgentRequest") {
    return <CustomLoader text="LOADING AGENT..." />;
  }

  if (navigatingAction === "Message") {
    return <CustomLoader text="LOADING SUPPORT..." />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Modal
        visible={selectedMaintenanceService !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMaintenanceService(null)}
      >
        <View style={styles.maintenanceModalOverlay}>
          <View style={styles.maintenanceModalContent}>
            <View style={styles.maintenanceModalIconContainer}>
              <Text style={styles.maintenanceModalIcon}>🔧</Text>
            </View>
            <Text style={styles.maintenanceModalTitle}>Coming Soon</Text>
            <Text style={styles.maintenanceModalMessage}>
              This service is currently under maintenance. We're working hard to
              bring you an improved experience. Please check back soon!
            </Text>
            <TouchableOpacity
              style={styles.maintenanceModalButton}
              onPress={() => setSelectedMaintenanceService(null)}
            >
              <Text style={styles.maintenanceModalButtonText}>Got it</Text>
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
          <View style={styles.languageModalContent}>
            <Text style={styles.languageModalTitle}>
              {t("profile.selectLanguage")}
            </Text>
            <Text style={styles.languageModalSubtitle}>
              {t("profile.defaultIsEnglish")}
            </Text>
            <ScrollView
              style={styles.languageModalList}
              showsVerticalScrollIndicator={false}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.languageModalOption}
                  onPress={() => handleFirstTimeLanguageSelect(lang.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageModalFlag}>{lang.flag}</Text>
                  <Text style={styles.languageModalLabel}>{lang.label}</Text>
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
              onPress={() => {
                setNavigatingToProfile(true);
                setTimeout(() => {
                  setNavigatingToProfile(false);
                  navigation.navigate("Personal");
                }, 800);
              }}
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
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
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
          <View style={styles.tabs}>
            {(["Wallet", "Investment", "Cards"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
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
              formatCurrency={formatCurrency}
              flipAnimation={flipAnimation}
              isCardFlipped={isCardFlipped}
              flipCard={flipCard}
            />
          )}
          {activeTab === "Cards" && (
            <CardsTab
              userData={userData}
              availableBalance={availableBalance}
              formatCurrency={formatCurrency}
              flipAnimation={flipAnimation}
              isCardFlipped={isCardFlipped}
              flipCard={flipCard}
              initialDesign={activeCardDesign}
              onActiveDesignChange={setActiveCardDesign}
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
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Transfer")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>
                  {t("dashboard.transfer")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Bdo")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="bank"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>
                  {t("dashboard.bankingService")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Travel")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="airplane"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>
                  {t("dashboard.travelProtection")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("History")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="history"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>
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
                    Task: "task",
                    AgentRequest: "agent",
                    PlayEarn: "trading",
                  };
                  const serviceId =
                    routeToServiceMap[item.route] || item.route.toLowerCase();
                  const isUnderMaintenance = maintenanceStatus[serviceId];

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItem,
                        isUnderMaintenance && styles.menuItemDisabled,
                      ]}
                      onPress={() => {
                        if (isUnderMaintenance) {
                          setSelectedMaintenanceService(item.labelKey);
                        } else {
                          if (
                            item.route === "AgentRequest" ||
                            item.route === "Message"
                          ) {
                            setNavigatingAction(item.route);
                            setTimeout(() => {
                              setNavigatingAction(null);
                              (
                                navigation as {
                                  navigate: (name: string) => void;
                                }
                              ).navigate(item.route);
                            }, 800);
                          } else {
                            (
                              navigation as { navigate: (name: string) => void }
                            ).navigate(item.route);
                          }
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.menuIcon,
                          isUnderMaintenance && styles.menuIconDisabled,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            item.icon as React.ComponentProps<
                              typeof MaterialCommunityIcons
                            >["name"]
                          }
                          size={24}
                          color={isUnderMaintenance ? "#CCCCCC" : "#000000"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.menuLabel,
                          isUnderMaintenance && styles.menuLabelDisabled,
                        ]}
                      >
                        {t(item.labelKey)}
                      </Text>
                      {isUnderMaintenance && (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>Coming Soon</Text>
                        </View>
                      )}
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
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuIconDisabled: {
    backgroundColor: "#F0F0F0",
  },
  menuLabelDisabled: {
    color: "#999",
  },
  comingSoonBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 60,
    height: 14,
    backgroundColor: "#FFB84D",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 1,
    transform: [{ translateX: -30 }, { translateY: -7 }, { rotate: "-45deg" }],
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  comingSoonText: {
    fontSize: 6.5,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  maintenanceModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  maintenanceModalIcon: {
    fontSize: 40,
  },
  maintenanceModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
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
  languageModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    maxHeight: "80%",
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  languageModalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  languageModalList: { maxHeight: 280 },
  languageModalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    marginBottom: 8,
  },
  languageModalFlag: { fontSize: 24, marginRight: 12 },
  languageModalLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
});
