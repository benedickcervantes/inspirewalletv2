import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    Platform,
    RefreshControl,
    ScrollView,
    TextInput,
    Alert,
    Share,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import ActivityModal from "../components/ActivityModal";
import PasscodeModal from "../components/PasscodeModal";
import {
    generateReferralCode,
    getMe,
    getOrCreateMainWallet,
    getReferralCode,
    getReferralQrPayload,
    getReferralTreeList,
    getReferralTree,
    getTransactions,
    transferAgentCommissionToAvailable,
} from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import type { RootStackParamList } from "../../types/navigation";
import { formatAmountWithCommas, unformatNumberString } from "../../utils/numberFormat";

interface CommissionTransaction {
  id: string;
  amount: number;
  currencySymbol: string;
  description: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface PendingCommissionItem {
  id: string;
  amount: number;
  releaseAt: string;
}

interface ReferralTreeMember {
  userId: string;
  referredById?: string | null;
  referralCode?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  isAgent?: boolean;
  depth?: number;
  directReferralCount?: number;
}

type DetailSectionView =
  | "earned"
  | "pending"
  | "direct_referrals"
  | "total_network";

const IPHONE_SE_WIDTH = 320;
const SMALL_PHONE_WIDTH = 375;
const REFERRAL_PAGE_SIZE = 5;

export default function AgentDashboard() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isXSScreen = width <= IPHONE_SE_WIDTH;
  const isSmallScreen = width < SMALL_PHONE_WIDTH;
  const horizontalPadding = isXSScreen ? 12 : isSmallScreen ? 16 : 20;
  const qrSize = isXSScreen ? 110 : isSmallScreen ? 130 : 160;
  const stackReferralShare = isXSScreen;
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentCommission, setAgentCommission] = useState(0);
  const [mainWalletId, setMainWalletId] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("₱");

  const [convertAmount, setConvertAmount] = useState<string>("");
  const [convertError, setConvertError] = useState<string | null>(null);
  const [showConvertPasscodeModal, setShowConvertPasscodeModal] =
    useState(false);
  const [convertPasscode, setConvertPasscode] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [directReferralCount, setDirectReferralCount] = useState(0);
  const [totalDescendantCount, setTotalDescendantCount] = useState(0);
  const [uplines, setUplines] = useState<
    { userId: string; referralCode?: string | null; name: string; firstName: string; lastName: string; isAgent: boolean; depth: number }[]
  >([]);
  const [downlineReferrals, setDownlineReferrals] = useState<ReferralTreeMember[]>([]);
  const [directReferrals, setDirectReferrals] = useState<ReferralTreeMember[]>([]);
  const [networkReferrals, setNetworkReferrals] = useState<ReferralTreeMember[]>([]);
  const [referredClientsWithDeposits, setReferredClientsWithDeposits] = useState<
    CommissionTransaction[]
  >([]);
  const [pendingAgentCommissions, setPendingAgentCommissions] = useState<
    PendingCommissionItem[]
  >([]);
  const [detailSectionView, setDetailSectionView] =
    useState<DetailSectionView>("earned");
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downlinePage, setDownlinePage] = useState(1);
  const [directListPage, setDirectListPage] = useState(1);
  const [networkListPage, setNetworkListPage] = useState(1);
  const [downlineTotalPages, setDownlineTotalPages] = useState(1);
  const [directListTotalPages, setDirectListTotalPages] = useState(1);
  const [networkListTotalPages, setNetworkListTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] =
    useState(false);
  const showInlineCopyBanner = copySuccess && Platform.OS === "ios";

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const convertAmountPlain = unformatNumberString(convertAmount).trim();
  const convertAmountNum = parseFloat(convertAmountPlain);
  const isConvertAmountValid =
    /^\d+(\.\d{1,2})?$/.test(convertAmountPlain) &&
    Number.isFinite(convertAmountNum) &&
    convertAmountNum > 0 &&
    convertAmountNum <= agentCommission;
  const isConvertButtonDisabled =
    !mainWalletId || agentCommission <= 0 || !isConvertAmountValid || isConverting;
  const pendingCommissionCount = pendingAgentCommissions.length;
  const showingPendingCommissionList = detailSectionView === "pending";
  const showingDirectReferralsList = detailSectionView === "direct_referrals";
  const showingTotalNetworkList = detailSectionView === "total_network";
  const paginatedDownlines = downlineReferrals;
  const activeReferralList = showingTotalNetworkList ? networkReferrals : directReferrals;
  const activePage = showingTotalNetworkList ? networkListPage : directListPage;
  const totalActivePages = showingTotalNetworkList
    ? networkListTotalPages
    : directListTotalPages;
  const paginatedActiveReferralList = activeReferralList;
  const getReferralDisplayName = (item: ReferralTreeMember) =>
    item.name ||
    [item.firstName, item.lastName].filter(Boolean).join(" ") ||
    t("agent.referralFallback");
  const normalizeReferralMember = (
    member: Record<string, unknown>,
    fallbackDepth?: number
  ): ReferralTreeMember => ({
    userId: String(member.userId ?? ""),
    referredById:
      member.referredById == null ? null : String(member.referredById),
    referralCode:
      member.referralCode == null ? null : String(member.referralCode),
    name: typeof member.name === "string" ? member.name : undefined,
    firstName:
      typeof member.firstName === "string" ? member.firstName : undefined,
    lastName: typeof member.lastName === "string" ? member.lastName : undefined,
    isAgent: Boolean(member.isAgent),
    depth: Number(member.depth ?? fallbackDepth ?? 0),
    directReferralCount: Number(member.directReferralCount ?? 0),
  });

  const fetchReferralListPage = useCallback(
    async (args: { type: "direct" | "network"; page: number; target: "downline" | "directDetail" | "networkDetail" }) => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setError(t("agent.notAuthenticated"));
        return;
      }

      setListLoading(true);
      try {
        const res = await getReferralTreeList(accessToken, {
          type: args.type,
          page: args.page,
          limit: REFERRAL_PAGE_SIZE,
        });
        if (!res.success || !res.data) return;

        const normalized = Array.isArray(res.data.items)
          ? res.data.items.map((item) => normalizeReferralMember(item as Record<string, unknown>, args.type === "direct" ? 1 : undefined))
          : [];

        if (args.target === "downline") {
          setDownlineReferrals(normalized);
          setDownlinePage(res.data.page || 1);
          setDownlineTotalPages(res.data.totalPages || 1);
          return;
        }

        if (args.target === "directDetail") {
          setDirectReferrals(normalized);
          setDirectListPage(res.data.page || 1);
          setDirectListTotalPages(res.data.totalPages || 1);
          return;
        }

        setNetworkReferrals(normalized);
        setNetworkListPage(res.data.page || 1);
        setNetworkListTotalPages(res.data.totalPages || 1);
      } finally {
        setListLoading(false);
      }
    },
    [t]
  );

  const fetchData = useCallback(async (): Promise<boolean> => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setError(t("agent.notAuthenticated"));
      return true;
    }
    setError(null);
    try {
      const meRes = await getMe(accessToken);
      if (meRes.success && meRes.user && !(meRes.user as any).isAgent) {
        setShowAccessRestrictedModal(true);
        return false;
      }

      // Use allSettled so a failure in one call doesn't cancel the others
      const [walletResult, treeResult, qrResult, codeResult] = await Promise.allSettled([
        getOrCreateMainWallet(accessToken),
        getReferralTree(accessToken),
        getReferralQrPayload(accessToken),
        getReferralCode(accessToken),
      ]);

      const walletRes = walletResult.status === "fulfilled" ? walletResult.value : null;
      const treeRes = treeResult.status === "fulfilled" ? treeResult.value : null;
      const qrRes = qrResult.status === "fulfilled" ? qrResult.value : null;
      const codeRes = codeResult.status === "fulfilled" ? codeResult.value : null;

      if (__DEV__) {
        console.log("[AgentDashboard] codeRes:", JSON.stringify(codeRes));
        console.log("[AgentDashboard] qrRes:", JSON.stringify(qrRes));
        console.log("[AgentDashboard] treeRes:", JSON.stringify(treeRes));
      }

      // Agent Commission from wallet
      if (walletRes?.success && walletRes.wallet) {
        const wallet = walletRes.wallet as Record<string, unknown>;
        const commission = parseFloat(String(wallet.agentCommission ?? 0));
        setAgentCommission(Number.isNaN(commission) ? 0 : commission);
        const id = wallet.id;
        setMainWalletId(typeof id === "string" ? id : null);
        const curr = wallet.currency as Record<string, string> | undefined;
        if (curr?.symbol) setCurrencySymbol(curr.symbol);
        const pending = Array.isArray(wallet.pendingAgentCommissions)
          ? wallet.pendingAgentCommissions
              .map((item, index) => {
                const pendingItem = item as Record<string, unknown>;
                const amount = parseFloat(String(pendingItem.amount ?? 0));
                return {
                  id: `${String(pendingItem.releaseAt ?? "pending")}-${index}`,
                  amount: Number.isNaN(amount) ? 0 : amount,
                  releaseAt: String(pendingItem.releaseAt ?? ""),
                };
              })
              .sort((a, b) => {
                const first = a.releaseAt ? new Date(a.releaseAt).getTime() : 0;
                const second = b.releaseAt ? new Date(b.releaseAt).getTime() : 0;
                return first - second;
              })
          : [];
        setPendingAgentCommissions(pending);
      } else {
        setMainWalletId(null);
        setPendingAgentCommissions([]);
      }

      // Referral QR Payload
      if (qrRes?.success && qrRes.payload) {
        setReferralUrl((qrRes.payload as Record<string, string>).referralUrl ?? null);
      }

      // Referral Code — try dedicated /referrals/code first, then qr payload, then tree
      let resolvedCode: string | null = null;
      if (codeRes?.success && codeRes.referralCode) {
        resolvedCode = codeRes.referralCode;
      } else if (qrRes?.success && qrRes.payload) {
        const p = qrRes.payload as Record<string, string>;
        if (p.referralCode) resolvedCode = p.referralCode;
      } else if (treeRes?.success && treeRes.tree) {
        const tree = treeRes.tree as Record<string, unknown>;
        if (tree.referralCode) resolvedCode = tree.referralCode as string;
      }

      // Last resort: POST /referrals/generate to create one if none found
      if (!resolvedCode) {
        if (__DEV__) console.log("[AgentDashboard] No code found, calling generateReferralCode...");
        try {
          const genRes = await generateReferralCode(accessToken);
          if (genRes.success && genRes.referralCode) resolvedCode = genRes.referralCode;
          if (__DEV__) console.log("[AgentDashboard] generateReferralCode result:", JSON.stringify(genRes));
        } catch (genErr) {
          if (__DEV__) console.warn("[AgentDashboard] generateReferralCode failed:", genErr);
        }
      }

      setReferralCode(resolvedCode);

      // Referral tree (counts and direct referrals)
      if (treeRes?.success && treeRes.tree) {
        const tree = treeRes.tree as Record<string, unknown>;
        setDirectReferralCount(Number(tree.directReferralCount ?? 0));
        setTotalDescendantCount(Number(tree.totalDescendantCount ?? 0));
        
        console.log("==> REFERRAL TREE RES", JSON.stringify(tree, null, 2));

        setDownlineReferrals([]);
        setDirectReferrals([]);
        setDownlinePage(1);
        setDownlineTotalPages(Math.max(1, Math.ceil(Number(tree.directReferralCount ?? 0) / REFERRAL_PAGE_SIZE)));
        setDirectListPage(1);
        setDirectListTotalPages(Math.max(1, Math.ceil(Number(tree.directReferralCount ?? 0) / REFERRAL_PAGE_SIZE)));
        setNetworkReferrals([]);
        setNetworkListPage(1);
        setNetworkListTotalPages(Math.max(1, Math.ceil(Number(tree.totalDescendantCount ?? 0) / REFERRAL_PAGE_SIZE)));

        const ancs = tree.ancestors as
          | { userId: string; referralCode?: string | null; name: string; firstName: string; lastName: string; isAgent: boolean; depth: number }[]
          | undefined;
        // Sort ancestors by depth to show closest referrer first (depth 0 = direct referrer)
        if (Array.isArray(ancs)) setUplines([...ancs].sort((a, b) => a.depth - b.depth));
        else setUplines([]);
      } else {
        setDownlineReferrals([]);
        setDirectReferrals([]);
        setNetworkReferrals([]);
        setDownlinePage(1);
        setDownlineTotalPages(1);
        setDirectListPage(1);
        setDirectListTotalPages(1);
        setNetworkListPage(1);
        setNetworkListTotalPages(1);
      }

      // Referred clients who successfully added time deposit = AGENT_COMMISSION transactions
      const walletId = walletRes?.success && walletRes.wallet
        ? (walletRes.wallet as Record<string, string>).id
        : undefined;
      const txRes = await getTransactions(accessToken, {
        walletId,
        type: "AGENT_COMMISSION",
        limit: 50,
      });
      if (txRes.success && txRes.transactions) {
        const allTx = txRes.transactions as Record<string, unknown>[];
        const commissionTx = allTx.filter(
          (tx) => String(tx.type ?? "") === "AGENT_COMMISSION"
        );
        const items: CommissionTransaction[] = commissionTx.map(
          (tx: Record<string, unknown>) => {
            const amt = parseFloat(String(tx.amount ?? 0));
            const curr = tx.currency as Record<string, string> | undefined;
            const meta = tx.metadata as Record<string, unknown> | undefined;
            const desc = meta?.referredClientName as string;
            return {
              id: String(tx.id ?? ""),
              amount: Number.isNaN(amt) ? 0 : amt,
              currencySymbol: curr?.symbol ?? "₱",
              description: desc || (tx.description as string) || t("agent.commissionFromClient"),
              createdAt: String(tx.createdAt ?? ""),
              metadata: meta,
            };
          }
        );
        setReferredClientsWithDeposits(items);
      } else {
        setReferredClientsWithDeposits([]);
      }

      await Promise.all([
        fetchReferralListPage({ type: "direct", page: 1, target: "downline" }),
        fetchReferralListPage({ type: "direct", page: 1, target: "directDetail" }),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("agent.failedToLoad"));
      return true;
    }
    return true;
  }, [fetchReferralListPage, t]);

  useFocusEffect(
    useCallback(() => {
      setShowAccessRestrictedModal(false);
      setInitialLoad(true);
      fetchData().then((canAccessAgentDashboard) => {
        if (canAccessAgentDashboard) {
          setInitialLoad(false);
        }
      });
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleShareReferralCode = async () => {
    if (!referralCode) return;
    try {
      const shareMessage = referralUrl 
        ? `${t("agent.shareMessagePrefix")} ${referralUrl}` 
        : `${t("agent.shareMessagePrefix")} ${referralCode}`;

      await Share.share({
        message: shareMessage,
        title: t("agent.shareTitle"),
      });
    } catch {
      // User cancelled or share failed
    }
  };

  const handleDetailSectionPress = (view: DetailSectionView) => {
    setDetailSectionView((currentView) => {
      const nextView = currentView === view ? "earned" : view;
      if (nextView === "direct_referrals") {
        fetchReferralListPage({ type: "direct", page: 1, target: "directDetail" }).catch(() => null);
      }
      if (nextView === "total_network") {
        fetchReferralListPage({ type: "network", page: 1, target: "networkDetail" }).catch(() => null);
      }
      return nextView;
    });
  };

  const handleDownlinePrevPage = () => {
    const nextPage = Math.max(1, downlinePage - 1);
    if (nextPage === downlinePage) return;
    fetchReferralListPage({ type: "direct", page: nextPage, target: "downline" }).catch(() => null);
  };

  const handleDownlineNextPage = () => {
    const nextPage = Math.min(downlineTotalPages, downlinePage + 1);
    if (nextPage === downlinePage) return;
    fetchReferralListPage({ type: "direct", page: nextPage, target: "downline" }).catch(() => null);
  };

  const handleActivePrevPage = () => {
    if (showingTotalNetworkList) {
      const nextPage = Math.max(1, networkListPage - 1);
      if (nextPage === networkListPage) return;
      fetchReferralListPage({ type: "network", page: nextPage, target: "networkDetail" }).catch(() => null);
      return;
    }
    const nextPage = Math.max(1, directListPage - 1);
    if (nextPage === directListPage) return;
    fetchReferralListPage({ type: "direct", page: nextPage, target: "directDetail" }).catch(() => null);
  };

  const handleActiveNextPage = () => {
    if (showingTotalNetworkList) {
      const nextPage = Math.min(networkListTotalPages, networkListPage + 1);
      if (nextPage === networkListPage) return;
      fetchReferralListPage({ type: "network", page: nextPage, target: "networkDetail" }).catch(() => null);
      return;
    }
    const nextPage = Math.min(directListTotalPages, directListPage + 1);
    if (nextPage === directListPage) return;
    fetchReferralListPage({ type: "direct", page: nextPage, target: "directDetail" }).catch(() => null);
  };

  const handleCopyReferralCode = useCallback(async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1500);
    if (Platform.OS === "android") {
      ToastAndroid.show(t("settings.copySuccess"), ToastAndroid.SHORT);
    }
  }, [referralCode, t]);

  const handleRestrictedCancel = () => {
    setShowAccessRestrictedModal(false);
    navigation.goBack();
  };

  const handleRestrictedSubmit = () => {
    setShowAccessRestrictedModal(false);
    navigation.replace("AgentApplication");
  };

  const handleStartConvert = () => {
    setConvertError(null);

    if (!mainWalletId) {
      setConvertError(t("agent.failedToLoad"));
      return;
    }

    if (!isConvertAmountValid) {
      if (!convertAmountPlain) {
        setConvertError(t("deposit.enterAmount"));
        return;
      }
      if (Number.isFinite(convertAmountNum) && convertAmountNum > agentCommission) {
        setConvertError(t("agent.convertInsufficientCommission"));
        return;
      }
      setConvertError(t("deposit.invalidAmount") ?? "Invalid amount");
      return;
    }

    // Reset and open passcode modal
    setConvertPasscode("");
    setShowConvertPasscodeModal(true);
  };

  const handleConvertPasscodeConfirm = async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setIsConverting(false);
      setShowConvertPasscodeModal(false);
      setConvertPasscode("");
      setConvertError(t("agent.notAuthenticated"));
      return;
    }

    if (!mainWalletId) {
      setIsConverting(false);
      setShowConvertPasscodeModal(false);
      setConvertPasscode("");
      setConvertError(t("agent.failedToLoad"));
      return;
    }

    const payloadAmount = unformatNumberString(convertAmount).trim();
    if (!isConvertAmountValid || !payloadAmount) {
      setIsConverting(false);
      setShowConvertPasscodeModal(false);
      setConvertPasscode("");
      setConvertError(t("deposit.invalidAmount") ?? "Invalid amount");
      return;
    }

    setIsConverting(true);
    try {
      const res = await transferAgentCommissionToAvailable(accessToken, {
        walletId: mainWalletId,
        amount: payloadAmount,
        passcode: convertPasscode,
      });

      if (!res.success) {
        throw new Error(res.error || "Transfer to available balance failed");
      }

      const successMsg = t("agent.convertSuccess");
      if (Platform.OS === "android") {
        ToastAndroid.show(successMsg, ToastAndroid.SHORT);
      } else {
        Alert.alert(successMsg);
      }

      setShowConvertPasscodeModal(false);
      setConvertPasscode("");
      setConvertAmount("");
      setConvertError(null);

      // Reload data so commission + pending list are accurate
      await fetchData();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : t("agent.convertFailed") ?? "Transfer to available balance failed";
      if (Platform.OS === "android") {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert(msg);
      }
      setConvertError(null);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={[styles.header, isXSScreen && styles.headerCompact]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={isXSScreen ? 22 : 24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isXSScreen && styles.headerTitleCompact]} numberOfLines={1} ellipsizeMode="tail">
            {t("agent.title")}
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleCopyReferralCode}
            disabled={!referralCode}
          >
            <Ionicons
              name={copySuccess ? "checkmark-outline" : "copy-outline"}
              size={isXSScreen ? 22 : 24}
              color={referralCode ? "#FFFFFF" : "rgba(255,255,255,0.6)"}
            />
          </TouchableOpacity>
        </LinearGradient>
        {showInlineCopyBanner && (
          <View style={styles.copyBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.copyBannerText}>{t("settings.copySuccess")}</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingTop: isXSScreen ? 12 : 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E25A17"
            />
          }
        >
          {initialLoad ? (
            <View style={styles.pageSkeletonContainer}>
              <View style={styles.pageSkeletonCard}>
                <View style={styles.pageSkeletonLineMedium} />
                <View style={styles.pageSkeletonLineLong} />
              </View>
              <View style={styles.pageSkeletonCard}>
                <View style={styles.pageSkeletonLineLong} />
                <View style={styles.pageSkeletonLineShort} />
                <View style={styles.pageSkeletonLineLong} />
              </View>
              <View style={styles.pageSkeletonRow}>
                <View style={[styles.pageSkeletonCard, styles.pageSkeletonHalf]} />
                <View style={[styles.pageSkeletonCard, styles.pageSkeletonHalf]} />
              </View>
              <Text style={styles.pageSkeletonHint}>{t("agent.loading")}</Text>
            </View>
          ) : (
            <>
              {error && (
                <View style={[styles.errorBanner, isXSScreen && styles.errorBannerCompact]}>
                  <Ionicons name="warning-outline" size={20} color="#B45309" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

          {/* Agent Commission Card */}
          <View style={styles.commissionCard}>
            <View style={styles.commissionHeader}>
              <Ionicons name="cash-outline" size={28} color="#E25A17" />
              <Text style={styles.commissionLabel}>{t("agent.commission")}</Text>
            </View>
            <Text style={styles.commissionAmount}>
              {currencySymbol} {formatCurrency(agentCommission)}
            </Text>
            <Text style={styles.commissionHint}>
              {t("agent.commissionHint")}
            </Text>
          </View>

          {agentCommission > 0 && (
            <View style={styles.convertCard}>
              <View style={styles.convertHeader}>
                <Ionicons name="swap-horizontal" size={22} color="#E25A17" />
                <Text style={styles.convertTitle}>
                  {t("agent.convertCommissionTitle")}
                </Text>
              </View>

              <View
                style={[
                  styles.convertInputRow,
                  convertError && styles.convertInputRowError,
                ]}
              >
                <Text style={styles.convertCurrencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.convertInput}
                  placeholder={t("deposit.enterAmount")}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={convertAmount}
                  onChangeText={(text) => {
                    setConvertError(null);
                    setConvertAmount(formatAmountWithCommas(text));
                  }}
                />
              </View>

              <Text style={styles.convertMaxHint}>
                Available: {currencySymbol} {formatCurrency(agentCommission)}
              </Text>

              {convertError && <Text style={styles.errorText}>{convertError}</Text>}

              <TouchableOpacity
                style={[
                  styles.convertButton,
                  isConvertButtonDisabled && styles.convertButtonDisabled,
                ]}
                onPress={handleStartConvert}
                disabled={isConvertButtonDisabled}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.convertButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.convertButtonText}>
                    {isConverting ? "..." : t("agent.convertButton")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Referral Code & Share */}
          <View style={[styles.referralCard, isXSScreen && styles.cardCompact]}>
            <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>{t("agent.yourReferralCode")}</Text>

            {referralUrl && (
              <View style={[styles.qrCodeContainer, isXSScreen && styles.qrCodeContainerCompact]}>
                <QRCode
                  value={referralUrl ?? undefined}
                  size={qrSize}
                  color="#1F2937"
                  backgroundColor="#FFFFFF"
                />
              </View>
            )}

            <View style={[styles.referralCodeRow, stackReferralShare && styles.referralCodeColumn]}>
              <View style={[styles.referralCodeBox, stackReferralShare && styles.referralCodeBoxFull]}>
                <Text style={[styles.referralCodeText, isXSScreen && styles.referralCodeTextCompact]} numberOfLines={1} ellipsizeMode="middle">
                  {referralCode || "—"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.shareButton, stackReferralShare && styles.shareButtonFull]}
                onPress={handleShareReferralCode}
                disabled={!referralCode}
              >
                <Ionicons name="share-outline" size={isXSScreen ? 20 : 22} color="#FFFFFF" />
                <Text style={[styles.shareButtonText, isXSScreen && styles.textCompact]}>{t("agent.share")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Referral Stats */}
          <View style={[styles.statsRow, isXSScreen && styles.statsRowCompact]}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => handleDetailSectionPress("direct_referrals")}
              style={[
                styles.statCard,
                styles.statCardInteractive,
                isXSScreen && styles.statCardCompact,
                showingDirectReferralsList && styles.statCardActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: showingDirectReferralsList }}
            >
              <Text
                style={[
                  styles.statValue,
                  isXSScreen && styles.statValueCompact,
                  showingDirectReferralsList && styles.statValueActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {directReferralCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  isXSScreen && styles.textCompact,
                  showingDirectReferralsList && styles.statLabelActive,
                ]}
              >
                {t("agent.directReferrals")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => handleDetailSectionPress("total_network")}
              style={[
                styles.statCard,
                styles.statCardInteractive,
                isXSScreen && styles.statCardCompact,
                showingTotalNetworkList && styles.statCardActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: showingTotalNetworkList }}
            >
              <Text
                style={[
                  styles.statValue,
                  isXSScreen && styles.statValueCompact,
                  showingTotalNetworkList && styles.statValueActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {totalDescendantCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  isXSScreen && styles.textCompact,
                  showingTotalNetworkList && styles.statLabelActive,
                ]}
              >
                {t("agent.totalNetwork")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => handleDetailSectionPress("pending")}
              style={[
                styles.statCard,
                styles.statCardInteractive,
                isXSScreen && styles.statCardCompact,
                showingPendingCommissionList && styles.statCardActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: showingPendingCommissionList }}
            >
              <Text
                style={[
                  styles.statValue,
                  styles.pendingStatValue,
                  isXSScreen && styles.pendingStatValueCompact,
                  showingPendingCommissionList && styles.statValueActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {pendingCommissionCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  styles.statLabelCentered,
                  isXSScreen && styles.textCompact,
                  showingPendingCommissionList && styles.statLabelActive,
                ]}
              >
                {t("agent.pendingCommission")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* My Upline */}
          {uplines.length > 0 && (
            <View style={[styles.section, isXSScreen && styles.cardCompact]}>
              <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>{t("agent.myUplines")}</Text>
              {uplines.map((ref, index) => {
                let roleLabel = t("agent.referrer");
                if (index === 0) roleLabel = t("agent.referrer");
                else if (index === 1) roleLabel = t("agent.agent");
                else roleLabel = t("agent.masterAgent");

                return (
                <View key={ref.userId} style={[styles.referralItem, isXSScreen && styles.referralItemCompact]}>
                  <View style={styles.referralItemLeft}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.referralItemName, isXSScreen && styles.textCompact]} numberOfLines={1}>
                        {ref.name || [ref.firstName, ref.lastName].filter(Boolean).join(" ") || t("agent.referralFallback")}
                      </Text>
                      {ref.isAgent && (
                        <View style={styles.agentTag}>
                          <Text style={styles.agentTagText}>{t("agent.agentTag")}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.codeRoleRow}>
                      <Text style={styles.referralItemCode}>{roleLabel}</Text>
                      {ref.referralCode && (
                        <>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Text style={styles.referralItemCode}>{ref.referralCode}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons name="arrow-up-circle-outline" size={24} color="#E25A17" />
                </View>
              )})}
            </View>
          )}

          {/* My Downlines */}
          {(downlineReferrals.length > 0 || directReferralCount > 0) && (
            <View style={[styles.section, isXSScreen && styles.cardCompact]}>
              <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>{t("agent.myReferrals")}</Text>
              {downlineReferrals.length > 0 ? (
                <>
                {paginatedDownlines.map((ref) => (
                  <View key={ref.userId} style={[styles.referralItem, isXSScreen && styles.referralItemCompact]}>
                    <View style={styles.referralItemLeft}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.referralItemName, isXSScreen && styles.textCompact]} numberOfLines={1}>
                          {ref.name || [ref.firstName, ref.lastName].filter(Boolean).join(" ") || t("agent.referralFallback")}
                        </Text>
                        {ref.isAgent && (
                          <View style={styles.agentTag}>
                            <Text style={styles.agentTagText}>{t("agent.agentTag")}</Text>
                          </View>
                        )}
                      </View>
                      {ref.referralCode && (
                        <Text style={styles.referralItemCode}>{ref.referralCode}</Text>
                      )}
                    </View>
                    <Ionicons name="arrow-down-circle-outline" size={24} color="#059669" />
                  </View>
                ))}
                {downlineTotalPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.paginationButton, downlinePage === 1 && styles.paginationButtonDisabled]}
                      onPress={handleDownlinePrevPage}
                      disabled={downlinePage === 1 || listLoading}
                    >
                      <Text style={styles.paginationButtonText}>{"<"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.paginationInfo}>
                      {downlinePage} / {downlineTotalPages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        downlinePage === downlineTotalPages && styles.paginationButtonDisabled,
                      ]}
                      onPress={handleDownlineNextPage}
                      disabled={downlinePage === downlineTotalPages || listLoading}
                    >
                      <Text style={styles.paginationButtonText}>{">"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                </>
              ) : (
                <Text style={styles.emptyHint}>
                  {directReferralCount} {t(directReferralCount === 1 ? "agent.directReferralInNetwork" : "agent.directReferralsInNetwork")}
                </Text>
              )}
            </View>
          )}

          {/* Detail Section */}
          <View style={[styles.section, isXSScreen && styles.cardCompact]}>
            <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>
              {showingPendingCommissionList
                ? t("agent.pendingCommissionListTitle")
                : showingDirectReferralsList
                ? t("agent.directReferralListTitle")
                : showingTotalNetworkList
                ? t("agent.totalNetworkListTitle")
                : t("agent.referredClientsTitle")}
            </Text>
            <Text style={[styles.sectionSubtitle, isXSScreen && styles.textCompact]}>
              {showingPendingCommissionList
                ? t("agent.pendingCommissionListSubtitle")
                : showingDirectReferralsList
                ? t("agent.directReferralListSubtitle")
                : showingTotalNetworkList
                ? t("agent.totalNetworkListSubtitle")
                : t("agent.referredClientsSubtitle")}
            </Text>
            {showingPendingCommissionList ? (
              pendingAgentCommissions.length > 0 ? (
                pendingAgentCommissions.map((item) => (
                  <View key={item.id} style={[styles.commissionItem, isXSScreen && styles.commissionItemCompact]}>
                    <View style={[styles.commissionItemLeft, isXSScreen && styles.commissionItemLeftCompact]}>
                      <Text style={[styles.commissionItemDesc, isXSScreen && styles.textCompact]} numberOfLines={2}>
                        {t("agent.pendingCommissionItemTitle")}
                      </Text>
                      <Text style={styles.commissionItemDate}>
                        {item.releaseAt
                          ? `${t("agent.pendingCommissionReleasePrefix")} ${new Date(item.releaseAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}`
                          : ""}
                      </Text>
                    </View>
                    <Text style={[styles.commissionItemAmount, styles.pendingCommissionItemAmount, isXSScreen && styles.textCompact]}>
                      {currencySymbol} {formatCurrency(item.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={[styles.emptyState, isXSScreen && styles.emptyStateCompact]}>
                  <Ionicons name="timer-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateText}>
                    {t("agent.emptyPendingCommissions")}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {t("agent.emptyPendingCommissionsHint")}
                  </Text>
                </View>
              )
            ) : showingDirectReferralsList || showingTotalNetworkList ? (
              activeReferralList.length > 0 ? (
                <>
                {paginatedActiveReferralList.map((item) => (
                  <View
                    key={`${item.userId}-${item.depth ?? 1}`}
                    style={[styles.referralItem, isXSScreen && styles.referralItemCompact]}
                  >
                    <View style={styles.referralItemLeft}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[styles.referralItemName, isXSScreen && styles.textCompact]}
                          numberOfLines={1}
                        >
                          {getReferralDisplayName(item)}
                        </Text>
                        {item.isAgent && (
                          <View style={styles.agentTag}>
                            <Text style={styles.agentTagText}>{t("agent.agentTag")}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.codeRoleRow}>
                        <Text style={styles.referralItemCode}>
                          {`${t("agent.level")} ${Math.max(1, item.depth ?? 1)}`}
                        </Text>
                        {item.referralCode && (
                          <>
                            <Text style={styles.dotSeparator}>â€¢</Text>
                            <Text style={styles.referralItemCode}>{item.referralCode}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Ionicons
                      name={showingTotalNetworkList ? "people-outline" : "arrow-down-circle-outline"}
                      size={24}
                      color={showingTotalNetworkList ? "#E25A17" : "#059669"}
                    />
                  </View>
                ))}
                {totalActivePages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.paginationButton, activePage === 1 && styles.paginationButtonDisabled]}
                      onPress={handleActivePrevPage}
                      disabled={activePage === 1 || listLoading}
                    >
                      <Text style={styles.paginationButtonText}>{"<"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.paginationInfo}>
                      {activePage} / {totalActivePages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        activePage === totalActivePages && styles.paginationButtonDisabled,
                      ]}
                      onPress={handleActiveNextPage}
                      disabled={activePage === totalActivePages || listLoading}
                    >
                      <Text style={styles.paginationButtonText}>{">"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                </>
              ) : (
                <View style={[styles.emptyState, isXSScreen && styles.emptyStateCompact]}>
                  <Ionicons
                    name={showingTotalNetworkList ? "people-outline" : "person-add-outline"}
                    size={48}
                    color="#CCC"
                  />
                  <Text style={styles.emptyStateText}>
                    {showingTotalNetworkList
                      ? t("agent.emptyTotalNetwork")
                      : t("agent.emptyDirectReferrals")}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {showingTotalNetworkList
                      ? t("agent.emptyTotalNetworkHint")
                      : t("agent.emptyDirectReferralsHint")}
                  </Text>
                </View>
              )
            ) : referredClientsWithDeposits.length > 0 ? (
              referredClientsWithDeposits.map((item) => (
                <View key={item.id} style={[styles.commissionItem, isXSScreen && styles.commissionItemCompact]}>
                  <View style={[styles.commissionItemLeft, isXSScreen && styles.commissionItemLeftCompact]}>
                    <Text style={[styles.commissionItemDesc, isXSScreen && styles.textCompact]} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.commissionItemDate}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </Text>
                  </View>
                  <Text style={[styles.commissionItemAmount, isXSScreen && styles.textCompact]}>
                    +{item.currencySymbol} {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, isXSScreen && styles.emptyStateCompact]}>
                <Ionicons name="time-outline" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>
                  {t("agent.emptyReferredClients")}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {t("agent.emptyReferredClientsHint")}
                </Text>
              </View>
            )}
          </View>
          </>
        )}
        </ScrollView>
      </SafeAreaView>

      <PasscodeModal
        visible={showConvertPasscodeModal}
        passcode={convertPasscode}
        title={t("withdraw.enterPasscode")}
        confirmLabel={t("withdraw.confirm")}
        cancelLabel={t("common.cancel")}
        loading={isConverting}
        onChangePasscode={setConvertPasscode}
        onConfirm={handleConvertPasscodeConfirm}
        onCancel={() => {
          setShowConvertPasscodeModal(false);
          setConvertPasscode("");
          setConvertError(null);
        }}
      />

      <ActivityModal
        visible={showAccessRestrictedModal}
        transparent
        animationType="fade"
        onRequestClose={handleRestrictedCancel}
      >
        <View style={styles.restrictedModalOverlay}>
          <View style={styles.restrictedModalCard}>
            <View style={styles.restrictedModalHeader}>
              <View style={styles.restrictedModalIconCircle}>
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.restrictedModalTitle}>Access Restricted</Text>
            </View>
            <Text style={styles.restrictedModalMessage}>
              This feature is for agent only. Your current role is investor only.
            </Text>
            <View style={styles.restrictedModalActions}>
              <TouchableOpacity
                onPress={handleRestrictedCancel}
                style={[styles.restrictedModalButton, styles.restrictedModalButtonSecondary]}
              >
                <Text style={styles.restrictedModalButtonSecondaryText}>
                  {t("common.goBack")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRestrictedSubmit}
                style={[styles.restrictedModalButton, styles.restrictedModalButtonPrimary]}
              >
                <Text style={styles.restrictedModalButtonPrimaryText}>
                  {t("agentRequest.content.submitButton.submit")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ActivityModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  safeArea: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: { padding: 12, minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", flex: 1, textAlign: "center" },
  headerTitleCompact: { fontSize: 16 },
  refreshButton: { padding: 12, minWidth: 44, minHeight: 44, justifyContent: "center" },
  copyBanner: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copyBannerText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  pageSkeletonContainer: {
    paddingTop: 10,
    gap: 12,
    paddingBottom: 20,
  },
  pageSkeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  pageSkeletonLineLong: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "100%",
  },
  pageSkeletonLineMedium: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "82%",
  },
  pageSkeletonLineShort: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "60%",
  },
  pageSkeletonRow: {
    flexDirection: "row",
    gap: 12,
  },
  pageSkeletonHalf: {
    flex: 1,
    minHeight: 72,
  },
  pageSkeletonHint: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { flex: 1, color: "#B45309", fontSize: 14 },
  errorBannerCompact: { padding: 10, marginBottom: 12 },
  commissionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  commissionLabel: { fontSize: 14, color: "#666", fontWeight: "500" },
  commissionAmount: { fontSize: 28, fontWeight: "700", color: "#1F2937" },
  commissionAmountCompact: { fontSize: 22 },
  commissionHint: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
  convertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  convertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  convertTitle: { fontSize: 14, color: "#1F2937", fontWeight: "600" },
  convertInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  convertInputRowError: { borderColor: "#F59E0B" },
  convertCurrencySymbol: { fontWeight: "800", color: "#E25A17", fontSize: 14 },
  convertInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 0,
  },
  convertMaxHint: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  convertButton: {
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
  },
  convertButtonDisabled: { opacity: 0.55 },
  convertButtonGradient: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  convertButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  cardCompact: { padding: 14, marginBottom: 12 },
  textCompact: { fontSize: 12 },
  referralCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 },
  sectionTitleCompact: { fontSize: 14, marginBottom: 10 },
  qrCodeContainer: { alignItems: "center", marginVertical: 16 },
  qrCodeContainerCompact: { marginVertical: 12 },
  referralCodeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  referralCodeColumn: { flexDirection: "column", alignItems: "stretch" },
  referralCodeBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  referralCodeBoxFull: { width: "100%" },
  referralCodeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E25A17",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  shareButtonFull: { width: "100%", justifyContent: "center" },
  referralCodeTextCompact: { fontSize: 15, letterSpacing: 1 },
  shareButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statsRowCompact: { flexDirection: "column" },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardInteractive: {
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statCardActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#F59E0B",
  },
  statCardCompact: { padding: 12 },
  statValue: { fontSize: 24, fontWeight: "700", color: "#E25A17", textAlign: "center" },
  statValueCompact: { fontSize: 20 },
  pendingStatValue: { fontSize: 18 },
  pendingStatValueCompact: { fontSize: 16 },
  statValueActive: { color: "#C2410C" },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 4, textAlign: "center" },
  statLabelCentered: { textAlign: "center" },
  statLabelActive: { color: "#C2410C" },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionSubtitle: { fontSize: 13, color: "#6B7280", marginTop: -4, marginBottom: 12 },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  referralItemLeft: { flex: 1, minWidth: 0, justifyContent: 'center' },
  referralItemCompact: { paddingVertical: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  referralItemName: { fontSize: 15, fontWeight: "500", color: "#1F2937" },
  agentTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  agentTagText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },
  codeRoleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dotSeparator: { fontSize: 12, color: "#9CA3AF", marginHorizontal: 4 },
  referralItemCode: { fontSize: 12, color: "#9CA3AF" },
  emptyHint: { fontSize: 14, color: "#9CA3AF", paddingVertical: 12 },
  commissionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  commissionItemLeft: { flex: 1, minWidth: 0 },
  commissionItemCompact: { paddingVertical: 10 },
  commissionItemLeftCompact: { marginRight: 8 },
  commissionItemDesc: { fontSize: 15, color: "#1F2937" },
  commissionItemDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  commissionItemAmount: { fontSize: 15, fontWeight: "600", color: "#059669" },
  pendingCommissionItemAmount: { color: "#E25A17" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateCompact: { paddingVertical: 24, paddingHorizontal: 12 },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
  },
  paginationRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  paginationButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3C3B1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF7ED",
  },
  paginationButtonDisabled: {
    opacity: 0.45,
  },
  paginationButtonText: {
    color: "#D9480F",
    fontWeight: "700",
    fontSize: 13,
  },
  paginationInfo: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  restrictedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  restrictedModalCard: {
    width: "80%",
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  restrictedModalHeader: {
    alignItems: "center",
    marginBottom: 14,
  },
  restrictedModalIconCircle: {
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
  restrictedModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333333",
    textAlign: "center",
  },
  restrictedModalMessage: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    textAlign: "center",
  },
  restrictedModalActions: {
    marginTop: 24,
    width: "100%",
    gap: 10,
  },
  restrictedModalButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
  },
  restrictedModalButtonPrimary: {
    backgroundColor: "#E15816",
  },
  restrictedModalButtonSecondary: {
    backgroundColor: "#F3F4F6",
  },
  restrictedModalButtonSecondaryText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
  },
  restrictedModalButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
