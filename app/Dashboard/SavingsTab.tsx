import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useResponsive } from "../../utils/responsive";

interface PayoutScheduleItem {
  payoutIndex?: number;
  expectedDate?: string;
  amount?: string | number;
  status?: "PENDING" | "PAID";
  isLastPayout?: boolean;
  principalReturned?: string;
  principal_returned?: string;
}

/** Referrer from backend (primary agent who referred you). Supports camelCase and snake_case. */
interface ReferrerInfo {
  userId?: string;
  user_id?: string;
  referralCode?: string;
  referral_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
}

/** Matches API-TIME-DEPOSITS.md TimeDepositWithSchedule */
interface TimeDeposit {
  id: string;
  contractType: string;
  depositSource?: "AVAILABLE_BALANCE" | "REQUEST_AMOUNT";
  amount: string | number;
  interestRate: string;
  status: "PENDING" | "ACTIVE" | "MATURED" | "CANCELLED";
  startDate: string | null;
  maturityDate: string | null;
  projectedStartDate: string;
  projectedMaturityDate: string;
  createdAt?: string;
  payoutSchedule?: PayoutScheduleItem[];
  payout_schedule?: PayoutScheduleItem[];
  commission?: unknown;
  referrer?: ReferrerInfo | null;
}

interface SavingsTabProps {
  userData: Record<string, unknown> | null;
  timeDeposit: number;
  dividend: number;
  depositGrowthData: { month: string; amount: number }[];
  deposits: TimeDeposit[];
  formatCurrency: (amount: number) => string;
  onRefresh?: () => Promise<void>;
  /** Fallback: user's referrer from GET /referrals/tree (when contract has no referrer/commission) */
  userReferrer?: { referralCode?: string; firstName?: string; lastName?: string } | null;
}

const ITEMS_PER_PAGE = 4;

const CONTRACT_TYPE_KEYS: Record<string, string> = {
  sixMonths: "investment.sixMonths",
  oneYear: "investment.oneYear",
  twoYears: "investment.twoYears",
};

function parseAmount(val: string | number | undefined): number {
  if (val == null) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

function getPayoutSchedule(dep: TimeDeposit): PayoutScheduleItem[] {
  const schedule = dep.payoutSchedule ?? dep.payout_schedule;
  return Array.isArray(schedule) ? schedule : [];
}

/** Get referrer from top-level referrer or commission.distribution[0] (primary agent). Normalizes camelCase/snake_case. */
function getReferrer(dep: TimeDeposit): ReferrerInfo | null {
  const ref = dep.referrer;
  if (ref && typeof ref === "object") {
    return {
      referralCode: ref.referralCode ?? ref.referral_code,
      firstName: ref.firstName ?? ref.first_name,
      lastName: ref.lastName ?? ref.last_name,
    };
  }
  const comm = dep.commission as {
    distribution?: {
      referralCode?: string;
      referral_code?: string;
      firstName?: string;
      first_name?: string;
      lastName?: string;
      last_name?: string;
    }[];
  } | undefined;
  const dist = comm?.distribution;
  if (Array.isArray(dist) && dist.length > 0) {
    const first = dist[0];
    return {
      referralCode: first.referralCode ?? first.referral_code,
      firstName: first.firstName ?? first.first_name,
      lastName: first.lastName ?? first.last_name,
    };
  }
  return null;
}

export default function SavingsTab({
  userData,
  timeDeposit,
  dividend,
  depositGrowthData,
  deposits,
  formatCurrency,
  onRefresh,
  userReferrer,
}: SavingsTabProps) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const { horizontalPadding, isTinyScreen } = useResponsive();
  const isSmallScreen = width < 360;
  const fontScale = isTinyScreen ? 0.8 : isSmallScreen ? 0.88 : width < 400 ? 0.94 : 1;
  const compact = isTinyScreen || isSmallScreen;
  const [contractTab, setContractTab] = useState<"Active" | "Completed" | "Cancelled" | "Pending">("Active");
  const [contractPage, setContractPage] = useState(1);
  const [selectedContract, setSelectedContract] = useState<TimeDeposit | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const contractsSectionYRef = useRef(0);
  const isInitialPageMount = useRef(true);

  useEffect(() => {
    setContractPage(1);
  }, [contractTab]);

  useEffect(() => {
    if (isInitialPageMount.current) {
      isInitialPageMount.current = false;
      return;
    }
    scrollViewRef.current?.scrollTo({
      y: contractsSectionYRef.current,
      animated: true,
    });
  }, [contractPage]);

  const getContractTypeLabel = (contractType: string) => {
    const key = CONTRACT_TYPE_KEYS[contractType];
    return key ? t(key) : contractType;
  };

  const filteredDeposits = deposits.filter((d) => {
    if (contractTab === "Active") return d.status === "ACTIVE";
    if (contractTab === "Completed") return d.status === "MATURED";
    if (contractTab === "Cancelled") return d.status === "CANCELLED";
    return d.status === "PENDING";
  });

  const totalPages = Math.max(1, Math.ceil(filteredDeposits.length / ITEMS_PER_PAGE));
  const displayPage = Math.min(contractPage, totalPages);
  const startIdx = (displayPage - 1) * ITEMS_PER_PAGE;
  const paginatedDeposits = filteredDeposits.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const maxAmount = Math.max(
    1,
    ...depositGrowthData.map((d) => d.amount)
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    if (status === "ACTIVE") return "#059669";
    if (status === "MATURED") return "#2563EB";
    if (status === "PENDING") return "#D97706";
    return "#6B7280";
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#E25A17"
        />
      }
    >
      <View style={[styles.cardContainer, { paddingHorizontal: horizontalPadding }]}>
        <ImageBackground
          source={require("../../assets/cards/default/card2.0.png")}
          style={[
            styles.depositCard,
            {
              padding: isTinyScreen ? 12 : isSmallScreen ? 14 : 20,
              minHeight: isTinyScreen ? 120 : isSmallScreen ? 140 : 160,
            },
          ]}
          imageStyle={styles.depositCardImage}
          resizeMode="cover"
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name="trending-up"
              size={isTinyScreen ? 40 : isSmallScreen ? 48 : 60}
              color="rgba(255, 255, 255, 0.3)"
              style={styles.cardIcon}
            />
          </View>
          <View style={styles.depositInfo}>
            <Text style={[styles.depositLabel, { fontSize: Math.round(14 * fontScale) }]}>{t("investment.timeDeposit")}</Text>
            <Text
              style={[styles.depositAmount, { fontSize: Math.round(32 * fontScale) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ₱ {formatCurrency(timeDeposit)}
            </Text>
          </View>
        </ImageBackground>
      </View>

      <View style={[styles.amountWalletContainer, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.amountWalletCard, { padding: compact ? 12 : 16 }]}>
          <View style={styles.amountWalletContent}>
            <View style={[styles.amountWalletLeft, { flex: 1, minWidth: 0 }]}>
              <View style={styles.amountWalletHeader}>
                <Text
                  style={[styles.amountWalletLabel, { fontSize: Math.round(16 * fontScale) }]}
                  numberOfLines={isTinyScreen ? 2 : 1}
                >
                  {t("investment.amountWalletLabel")}
                </Text>
                {!isTinyScreen && <Ionicons name="flame-outline" size={18} color="#E15816" />}
              </View>
              <Text
                style={[styles.amountWalletAmount, { fontSize: Math.round(20 * fontScale) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₱ {formatCurrency(dividend)}
              </Text>
              <Text
                style={[styles.amountWalletHint, { fontSize: isTinyScreen ? 10 : 11 }]}
                numberOfLines={2}
              >
                {t("investment.amountWalletHint")}
              </Text>
            </View>
            {!isTinyScreen && (
              <View style={styles.amountWalletIcon}>
                <Ionicons name="trending-up" size={compact ? 32 : 40} color="#E15816" />
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.graphContainer, { paddingHorizontal: horizontalPadding }]}>
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={[styles.graphCard, { padding: compact ? 12 : 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.graphHeader}>
            <Text
              style={[styles.graphTitle, { fontSize: Math.round(16 * fontScale) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t("investment.depositGrowth")} ({new Date().getFullYear()})
            </Text>
            {!isTinyScreen && <Ionicons name="bar-chart-outline" size={20} color="#FFFFFF" />}
          </View>
          <View style={[styles.chartContainer, { height: compact ? 120 : 150 }]}>
            <View style={[styles.barsContainer, { height: compact ? 100 : 140 }]}>
              {depositGrowthData.map((data, index) => {
                const maxBarH = compact ? 80 : 120;
                const barHeight = (data.amount / maxAmount) * maxBarH;
                return (
                  <View key={index} style={[styles.barWrapper, { minWidth: 0 }]}>
                    <View style={styles.barColumn}>
                      <View style={[styles.bar, { height: Math.max(barHeight, 4) }]} />
                    </View>
                    <Text style={[styles.barLabel, { fontSize: isTinyScreen ? 8 : 9 }]} numberOfLines={1}>
                      {data.month}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </LinearGradient>
      </View>

      <View
        style={[styles.contractsSection, { paddingHorizontal: horizontalPadding }]}
        onLayout={(e) => {
          contractsSectionYRef.current = e.nativeEvent.layout.y;
        }}
      >
        <Text style={[styles.contractsSectionTitle, { fontSize: Math.round(16 * fontScale) }]}>{t("investment.contracts")}</Text>
        <View style={[
          styles.contractTabs,
          { gap: isTinyScreen ? 4 : isSmallScreen ? 6 : 8, marginBottom: compact ? 12 : 16 },
        ]}
        >
          {(["Active", "Completed", "Cancelled", "Pending"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.contractTab,
                contractTab === tab && styles.contractTabActive,
                { paddingVertical: compact ? 8 : 10, minWidth: 0, flex: 1 },
              ]}
              onPress={() => setContractTab(tab)}
            >
              <Text
                style={[
                  styles.contractTabText,
                  contractTab === tab && styles.contractTabTextActive,
                  { fontSize: Math.round(isTinyScreen ? 11 : 13 * fontScale) },
                ]}
                numberOfLines={1}
              >
                {t(tab === "Active" ? "investment.active" : tab === "Completed" ? "investment.completed" : tab === "Cancelled" ? "investment.cancelled" : "investment.pending")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.contractList, { gap: compact ? 8 : 12 }]}>
          {filteredDeposits.length === 0 ? (
            <View style={[styles.emptyState, { paddingVertical: compact ? 24 : 40, paddingHorizontal: compact ? 16 : 24 }]}>
              <Ionicons name="document-text-outline" size={compact ? 40 : 48} color="#CCC" />
              <Text style={[styles.emptyStateText, { fontSize: compact ? 14 : 16 }]}>
                {contractTab === "Active" ? t("investment.noActiveContracts") : contractTab === "Completed" ? t("investment.noCompletedContracts") : contractTab === "Cancelled" ? t("investment.noCancelledContracts") : t("investment.noPendingContracts")}
              </Text>
              <Text style={[styles.emptyStateSubtext, { fontSize: compact ? 12 : 13 }]}>
                {contractTab === "Pending" && t("investment.emptyPending")}
                {contractTab === "Active" && t("investment.emptyActive")}
                {contractTab === "Completed" && t("investment.emptyCompleted")}
                {contractTab === "Cancelled" && t("investment.emptyCancelled")}
              </Text>
            </View>
          ) : (
            <>
              {paginatedDeposits.map((dep) => (
              <TouchableOpacity
                key={dep.id}
                style={[styles.contractCard, { padding: compact ? 12 : 16 }]}
                onPress={() => {
                  if (__DEV__) {
                    console.log("[SavingsTab] Contract selected:", {
                      id: dep.id,
                      referrer: dep.referrer,
                      commission: dep.commission,
                      commissionKeys: dep.commission ? Object.keys(dep.commission as object) : [],
                    });
                  }
                  setSelectedContract(dep);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.contractCardTop, { marginBottom: compact ? 8 : 12 }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.contractCardAmount, { fontSize: compact ? 16 : 18 }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      ₱ {formatCurrency(parseAmount(dep.amount))}
                    </Text>
                    <Text
                      style={[styles.contractCardType, { fontSize: compact ? 12 : 13 }]}
                      numberOfLines={1}
                    >
                      {getContractTypeLabel(dep.contractType)}
                    </Text>
                  </View>
                  <View style={[styles.contractCardRight, { flexShrink: 0 }]}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${getStatusColor(dep.status)}20`,
                          paddingHorizontal: compact ? 6 : 8,
                          paddingVertical: compact ? 3 : 4,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getStatusColor(dep.status), fontSize: compact ? 10 : 11 },
                        ]}
                      >
                        {dep.status}
                      </Text>
                    </View>
                    <Text style={[styles.contractCardRate, { fontSize: compact ? 12 : 13 }]}>
                      {dep.interestRate}% {t("investment.perAnnum")}
                    </Text>
                  </View>
                </View>
                <View style={[styles.contractCardBottom, { paddingTop: compact ? 8 : 12 }]}>
                  <Text
                    style={[styles.contractCardDates, { fontSize: compact ? 11 : 12, flex: 1, minWidth: 0 }]}
                    numberOfLines={1}
                  >
                    {dep.startDate
                      ? formatDate(dep.startDate)
                      : formatDate(dep.projectedStartDate)}
                    {" → "}
                    {dep.maturityDate
                      ? formatDate(dep.maturityDate)
                      : formatDate(dep.projectedMaturityDate)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
              ))}
              {totalPages > 1 && (
                <View style={[styles.paginationRow, { marginTop: compact ? 12 : 16, gap: compact ? 8 : 12 }]}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      displayPage <= 1 && styles.paginationButtonDisabled,
                      { paddingVertical: compact ? 8 : 10, paddingHorizontal: compact ? 12 : 16 },
                    ]}
                    onPress={() => setContractPage((p) => Math.max(1, p - 1))}
                    disabled={displayPage <= 1}
                  >
                    <Ionicons name="chevron-back" size={18} color={displayPage <= 1 ? "#9CA3AF" : "#E25A17"} />
                    <Text style={[styles.paginationButtonText, { color: displayPage <= 1 ? "#9CA3AF" : "#E25A17", fontSize: compact ? 13 : 14 }]}>
                      {t("tickets.previous")}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.paginationIndicator, { fontSize: compact ? 12 : 13 }]}>
                    {t("tickets.pageIndicator", { page: String(displayPage), total: String(totalPages) })}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      displayPage >= totalPages && styles.paginationButtonDisabled,
                      { paddingVertical: compact ? 8 : 10, paddingHorizontal: compact ? 12 : 16 },
                    ]}
                    onPress={() => setContractPage((p) => Math.min(totalPages, p + 1))}
                    disabled={displayPage >= totalPages}
                  >
                    <Text style={[styles.paginationButtonText, { color: displayPage >= totalPages ? "#9CA3AF" : "#E25A17", fontSize: compact ? 13 : 14 }]}>
                      {t("tickets.next")}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={displayPage >= totalPages ? "#9CA3AF" : "#E25A17"} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <View style={{ height: 20 }} />

      <Modal
        visible={!!selectedContract}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedContract(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, compact && { maxHeight: "92%" }]}>
            {selectedContract && (
              <>
                <View style={[styles.modalHeader, { padding: compact ? 16 : 20 }]}>
                  <Text
                    style={[styles.modalTitle, { fontSize: compact ? 16 : 18 }]}
                    numberOfLines={1}
                  >
                    {t("investment.contractDetails")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedContract(null)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={[styles.modalBody, { padding: compact ? 16 : 20, paddingBottom: compact ? 32 : 40 }]}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: `${getStatusColor(selectedContract.status)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: getStatusColor(selectedContract.status) },
                      ]}
                    >
                      {selectedContract.status}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t("investment.amount")}</Text>
                    <Text style={styles.modalDetailValue}>
                      ₱ {formatCurrency(parseAmount(selectedContract.amount))}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t("investment.interestRate")}</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContract.interestRate}% {t("investment.perAnnum")}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t("investment.contractType")}</Text>
                    <Text style={styles.modalDetailValue}>
                      {getContractTypeLabel(selectedContract.contractType)}
                    </Text>
                  </View>
                  {selectedContract.depositSource && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>{t("investment.depositSource")}</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedContract.depositSource === "AVAILABLE_BALANCE"
                          ? t("investment.availableBalance")
                          : t("investment.requestAmount")}
                      </Text>
                    </View>
                  )}
                  {selectedContract.createdAt && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>{t("investment.created")}</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(selectedContract.createdAt)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t("investment.startDate")}</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContract.startDate
                        ? formatDate(selectedContract.startDate)
                        : formatDate(selectedContract.projectedStartDate)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t("investment.maturityDate")}</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContract.maturityDate
                        ? formatDate(selectedContract.maturityDate)
                        : formatDate(selectedContract.projectedMaturityDate)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t("investment.referredBy")}</Text>
                    <Text style={styles.modalDetailValue}>
                      {(() => {
                        const ref = getReferrer(selectedContract) ?? userReferrer;
                        if (!ref) return t("investment.noReferrer");
                        const name = `${ref.firstName ?? ""} ${ref.lastName ?? ""}`.trim() || "—";
                        const code = ref.referralCode ?? (ref as ReferrerInfo).referral_code;
                        return code ? (name ? `${name} (${code})` : `(${code})`) : name || "—";
                      })()}
                    </Text>
                  </View>

                  <Text style={styles.payoutSectionTitle}>{t("investment.payoutSchedule")}</Text>
                  <View style={styles.payoutStepper}>
                    {getPayoutSchedule(selectedContract).map((payout, idx) => (
                      <View key={payout.payoutIndex ?? idx} style={styles.payoutItem}>
                        <View style={styles.payoutItemLeft}>
                          <View
                            style={[
                              styles.payoutDot,
                              (payout.status ?? "PENDING") === "PAID"
                                ? styles.payoutDotPaid
                                : styles.payoutDotPending,
                            ]}
                          />
                          {idx < getPayoutSchedule(selectedContract).length - 1 && (
                            <View
                            style={[
                              styles.payoutLine,
                              (payout.status ?? "PENDING") === "PAID"
                                ? styles.payoutLinePaid
                                : styles.payoutLinePending,
                            ]}
                            />
                          )}
                        </View>
                        <View style={styles.payoutItemRight}>
                          <Text style={styles.payoutDate}>
                            {payout.expectedDate ? formatDate(payout.expectedDate) : "—"}
                          </Text>
                          <Text style={styles.payoutAmount}>
                            ₱ {formatCurrency(parseAmount(payout.amount))}
                            {payout.isLastPayout &&
                              (payout.principalReturned ?? payout.principal_returned) &&
                              ` + ₱ ${formatCurrency(
                                parseAmount(payout.principalReturned ?? payout.principal_returned)
                              )} ${t("investment.principal")}`}
                          </Text>
                          <View
                            style={[
                              styles.payoutStatusChip,
                              (payout.status ?? "PENDING") === "PAID"
                                ? styles.payoutStatusPaid
                                : styles.payoutStatusPending,
                            ]}
                          >
                            <Ionicons
                              name={(payout.status ?? "PENDING") === "PAID" ? "checkmark-circle" : "time-outline"}
                              size={14}
                              color={(payout.status ?? "PENDING") === "PAID" ? "#059669" : "#D97706"}
                            />
                            <Text
                              style={[
                                styles.payoutStatusText,
                                { color: (payout.status ?? "PENDING") === "PAID" ? "#059669" : "#D97706" },
                              ]}
                            >
                              {payout.status ?? "PENDING"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  {getPayoutSchedule(selectedContract).length === 0 && (
                    <Text style={styles.noPayoutsText}>{t("investment.noPayoutSchedule")}</Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  cardContainer: { paddingHorizontal: 20, paddingTop: 16 },
  depositCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 160,
    overflow: "hidden",
  },
  depositCardImage: { borderRadius: 20 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardIcon: { position: "absolute", right: 0, top: 0 },
  depositInfo: { marginTop: 0 },
  depositLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 8,
  },
  depositAmount: { fontSize: 32, fontWeight: "700", color: "#FFFFFF" },
  amountWalletContainer: { paddingHorizontal: 20, paddingTop: 16 },
  amountWalletCard: {
    backgroundColor: "#FFE8D6",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountWalletContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
  },
  amountWalletLeft: { flex: 1 },
  amountWalletHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  amountWalletLabel: { fontSize: 16, fontWeight: "700", color: "#333" },
  amountWalletAmount: { fontSize: 20, fontWeight: "700", color: "#E15816" },
  amountWalletHint: { fontSize: 11, color: "#999", marginTop: 4 },
  amountWalletIcon: { marginLeft: 12 },
  graphContainer: { paddingHorizontal: 20, paddingTop: 16 },
  graphCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  graphHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  graphTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  chartContainer: { height: 150, justifyContent: "flex-end" },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
  },
  barWrapper: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barColumn: {
    width: "70%",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  bar: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 9, color: "#FFFFFF", marginTop: 4, fontWeight: "600" },
  contractsSection: { paddingHorizontal: 20, paddingTop: 16 },
  contractsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  contractTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  contractTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contractTabActive: {
    backgroundColor: "#E25A17",
    borderColor: "#E25A17",
  },
  contractTabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  contractTabTextActive: { color: "#FFFFFF" },
  contractList: { gap: 12 },
  contractCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contractCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  contractCardAmount: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  contractCardType: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  contractCardRight: { alignItems: "flex-end" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  contractCardRate: { fontSize: 13, color: "#059669", fontWeight: "600" },
  contractCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  contractCardDates: { fontSize: 12, color: "#9CA3AF" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
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
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E25A17",
  },
  paginationButtonDisabled: {
    borderColor: "#E5E7EB",
  },
  paginationButtonText: {
    fontWeight: "600",
  },
  paginationIndicator: {
    color: "#6B7280",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  modalCloseButton: { padding: 4 },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalStatusText: { fontSize: 13, fontWeight: "600" },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalDetailLabel: { fontSize: 14, color: "#6B7280" },
  modalDetailValue: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  payoutSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 16,
  },
  payoutStepper: { marginLeft: 8 },
  payoutItem: { flexDirection: "row", marginBottom: 8 },
  payoutItemLeft: { width: 24, alignItems: "center" },
  payoutDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  payoutDotPaid: { backgroundColor: "#059669" },
  payoutDotPending: { backgroundColor: "#D97706", opacity: 0.6 },
  payoutLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 24,
  },
  payoutLinePaid: { backgroundColor: "#059669" },
  payoutLinePending: { backgroundColor: "#E5E7EB" },
  payoutItemRight: { flex: 1, marginLeft: 12, paddingBottom: 16 },
  payoutDate: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  payoutAmount: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  payoutStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 6,
  },
  payoutStatusPaid: {},
  payoutStatusPending: {},
  payoutStatusText: { fontSize: 12, fontWeight: "600" },
  noPayoutsText: { fontSize: 14, color: "#9CA3AF", fontStyle: "italic" },
});
