import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    generateReferralCode,
    getOrCreateMainWallet,
    getReferralCode,
    getReferralQrPayload,
    getReferralTree,
    getTransactions,
} from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import CustomLoader from "../Loader/CustomLoader";

interface CommissionTransaction {
  id: string;
  amount: number;
  currencySymbol: string;
  description: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const IPHONE_SE_WIDTH = 320;
const SMALL_PHONE_WIDTH = 375;

export default function AgentDashboard() {
  const navigation = useNavigation();
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
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [directReferralCount, setDirectReferralCount] = useState(0);
  const [totalDescendantCount, setTotalDescendantCount] = useState(0);
  const [directReferrals, setDirectReferrals] = useState<
    { userId: string; referralCode?: string; firstName?: string; lastName?: string }[]
  >([]);
  const [referredClientsWithDeposits, setReferredClientsWithDeposits] = useState<
    CommissionTransaction[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchData = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setError(t("agent.notAuthenticated"));
      return;
    }
    setError(null);
    try {
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
        const curr = wallet.currency as Record<string, string> | undefined;
        if (curr?.symbol) setCurrencySymbol(curr.symbol);
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
        const refs = tree.directReferrals as
          | { userId: string; referralCode?: string; firstName?: string; lastName?: string }[]
          | undefined;
        if (Array.isArray(refs)) setDirectReferrals(refs);
        else setDirectReferrals([]);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("agent.failedToLoad"));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchData().finally(() => setInitialLoad(false));
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

  if (initialLoad) {
    return <CustomLoader text={t("agent.loadingDashboard")} />;
  }

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
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={isXSScreen ? 22 : 24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </LinearGradient>

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

          {/* Referral Code & Share */}
          <View style={[styles.referralCard, isXSScreen && styles.cardCompact]}>
            <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>{t("agent.yourReferralCode")}</Text>
            
            {referralUrl && (
              <View style={[styles.qrCodeContainer, isXSScreen && styles.qrCodeContainerCompact]}>
                <QRCode
                  value={referralUrl}
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
            <View style={[styles.statCard, isXSScreen && styles.statCardCompact]}>
              <Text style={[styles.statValue, isXSScreen && styles.statValueCompact]}>{directReferralCount}</Text>
              <Text style={[styles.statLabel, isXSScreen && styles.textCompact]}>{t("agent.directReferrals")}</Text>
            </View>
            <View style={[styles.statCard, isXSScreen && styles.statCardCompact]}>
              <Text style={[styles.statValue, isXSScreen && styles.statValueCompact]}>{totalDescendantCount}</Text>
              <Text style={[styles.statLabel, isXSScreen && styles.textCompact]}>{t("agent.totalNetwork")}</Text>
            </View>
          </View>

          {/* My Referrals */}
          {(directReferrals.length > 0 || directReferralCount > 0) && (
            <View style={[styles.section, isXSScreen && styles.cardCompact]}>
              <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>{t("agent.myReferrals")}</Text>
              {directReferrals.length > 0 ? (
                directReferrals.map((ref) => (
                  <View key={ref.userId} style={[styles.referralItem, isXSScreen && styles.referralItemCompact]}>
                    <View style={styles.referralItemLeft}>
                      <Text style={[styles.referralItemName, isXSScreen && styles.textCompact]} numberOfLines={1}>
                        {[ref.firstName, ref.lastName].filter(Boolean).join(" ") || t("agent.referralFallback")}
                      </Text>
                      {ref.referralCode && (
                        <Text style={styles.referralItemCode}>{ref.referralCode}</Text>
                      )}
                    </View>
                    <Ionicons name="person-outline" size={20} color="#888" />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyHint}>
                  {directReferralCount} {t(directReferralCount === 1 ? "agent.directReferralInNetwork" : "agent.directReferralsInNetwork")}
                </Text>
              )}
            </View>
          )}

          {/* Referred Clients with Time Deposits */}
          <View style={[styles.section, isXSScreen && styles.cardCompact]}>
            <Text style={[styles.sectionTitle, isXSScreen && styles.sectionTitleCompact]}>
              {t("agent.referredClientsTitle")}
            </Text>
            <Text style={[styles.sectionSubtitle, isXSScreen && styles.textCompact]}>
              {t("agent.referredClientsSubtitle")}
            </Text>
            {referredClientsWithDeposits.length > 0 ? (
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
        </ScrollView>
      </SafeAreaView>
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
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
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
  qrCodeContainer: { alignItems: "center", marginVertical: 16 },
  qrCodeContainerCompact: { marginVertical: 12 },
  referralCodeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  referralCodeBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
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
  statCardCompact: { padding: 12 },
  statValue: { fontSize: 24, fontWeight: "700", color: "#E25A17" },
  statValueCompact: { fontSize: 20 },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 4 },
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
  referralItemLeft: { flex: 1, minWidth: 0 },
  referralItemCompact: { paddingVertical: 10 },
  referralItemName: { fontSize: 15, fontWeight: "500", color: "#1F2937" },
  referralItemCode: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
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
});
