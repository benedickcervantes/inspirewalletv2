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
    getOrCreateMainWallet,
    getReferralQrPayload,
    getReferralTree,
    getTransactions,
} from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";

interface CommissionTransaction {
  id: string;
  amount: number;
  currencySymbol: string;
  description: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export default function AgentDashboard() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 375 ? 16 : 20;
  const [loading, setLoading] = useState(true);
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
      const [walletRes, treeRes, qrRes] = await Promise.all([
        getOrCreateMainWallet(accessToken),
        getReferralTree(accessToken),
        getReferralQrPayload(accessToken),
      ]);

      // Agent Commission from wallet
      if (walletRes.success && walletRes.wallet) {
        const wallet = walletRes.wallet as Record<string, unknown>;
        const commission = parseFloat(String(wallet.agentCommission ?? 0));
        setAgentCommission(Number.isNaN(commission) ? 0 : commission);
        const curr = wallet.currency as Record<string, string> | undefined;
        if (curr?.symbol) setCurrencySymbol(curr.symbol);
      }

      // Referral QR Payload
      if (qrRes.success && qrRes.payload) {
        setReferralUrl(qrRes.payload.referralUrl ?? null);
      }

      // Referral tree (referral code, counts, and direct referrals if present)
      if (treeRes.success && treeRes.tree) {
        const tree = treeRes.tree as Record<string, unknown>;
        setReferralCode((tree.referralCode as string) ?? null);
        setDirectReferralCount(Number(tree.directReferralCount ?? 0));
        setTotalDescendantCount(Number(tree.totalDescendantCount ?? 0));
        const refs = tree.directReferrals as
          | { userId: string; referralCode?: string; firstName?: string; lastName?: string }[]
          | undefined;
        if (Array.isArray(refs)) setDirectReferrals(refs);
        else setDirectReferrals([]);
      }

      // Referred clients who successfully added time deposit = AGENT_COMMISSION transactions
      const walletId = walletRes.success && walletRes.wallet
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
      setLoading(true);
      fetchData().finally(() => setLoading(false));
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>{t("agent.title")}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingTop: 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading || refreshing}
              onRefresh={onRefresh}
              tintColor="#E25A17"
            />
          }
        >
          {error && (
            <View style={styles.errorBanner}>
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
          <View style={styles.referralCard}>
            <Text style={styles.sectionTitle}>{t("agent.yourReferralCode")}</Text>
            
            {referralUrl && (
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={referralUrl}
                  size={160}
                  color="#1F2937"
                  backgroundColor="#FFFFFF"
                />
              </View>
            )}

            <View style={styles.referralCodeRow}>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCodeText}>
                  {referralCode || "—"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareReferralCode}
                disabled={!referralCode}
              >
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>{t("agent.share")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Referral Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{directReferralCount}</Text>
              <Text style={styles.statLabel}>{t("agent.directReferrals")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalDescendantCount}</Text>
              <Text style={styles.statLabel}>{t("agent.totalNetwork")}</Text>
            </View>
          </View>

          {/* My Referrals */}
          {(directReferrals.length > 0 || directReferralCount > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("agent.myReferrals")}</Text>
              {directReferrals.length > 0 ? (
                directReferrals.map((ref) => (
                  <View key={ref.userId} style={styles.referralItem}>
                    <View style={styles.referralItemLeft}>
                      <Text style={styles.referralItemName}>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("agent.referredClientsTitle")}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t("agent.referredClientsSubtitle")}
            </Text>
            {referredClientsWithDeposits.length > 0 ? (
              referredClientsWithDeposits.map((item) => (
                <View key={item.id} style={styles.commissionItem}>
                  <View style={styles.commissionItemLeft}>
                    <Text style={styles.commissionItemDesc}>{item.description}</Text>
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
                  <Text style={styles.commissionItemAmount}>
                    +{item.currencySymbol} {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
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
  backButton: { padding: 12, minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
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
  commissionHint: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
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
  statValue: { fontSize: 24, fontWeight: "700", color: "#E25A17" },
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  referralItemLeft: { flex: 1 },
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
  commissionItemLeft: { flex: 1 },
  commissionItemDesc: { fontSize: 15, color: "#1F2937" },
  commissionItemDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  commissionItemAmount: { fontSize: 15, fontWeight: "600", color: "#059669" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
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
