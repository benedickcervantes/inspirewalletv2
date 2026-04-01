import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getRewardCampaignConfig,
  getRewardPointsHistory,
  getRewardPointsTotal,
  redeemRewardPoints,
} from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";

const ORANGE_GRADIENT: readonly [string, string] = ["#E25A17", "#F28934"];
const ITEMS_PER_PAGE = 20;

interface RewardTransaction {
  id: string;
  points: number;
  type: "EARNED" | "REDEEMED";
  description?: string;
  referenceId?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

interface CampaignConfig {
  enabled: boolean;
  percentage: number;
  maxDailyAmount: number;
  minEligibleAmount: number;
}

function SkeletonTransactionRow() {
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconCircle, styles.skeletonBase, { backgroundColor: "#F3F4F6" }]} />
      <View style={styles.txMiddle}>
        <View style={[styles.skeletonLine, { width: "55%", marginBottom: 7 }]} />
        <View style={[styles.skeletonLine, { width: "80%", height: 10, marginBottom: 5 }]} />
        <View style={[styles.skeletonLine, { width: "38%", height: 10 }]} />
      </View>
      <View style={styles.txRight}>
        <View style={[styles.skeletonLine, { width: 52, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: 44, height: 10 }]} />
      </View>
    </View>
  );
}

const MIN_REDEEM_POINTS = 1000;

export default function RewardPointsHistory() {
  const navigation = useNavigation<NavProp>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Redeem modal state
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showNotEnoughModal, setShowNotEnoughModal] = useState(false);
  const [showRedeemSuccessModal, setShowRedeemSuccessModal] = useState(false);
  const [redeemedPointsLabel, setRedeemedPointsLabel] = useState("0");
  const [passcode, setPasscode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  const tokenRef = useRef<string | null>(null);

  const loadData = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      const token = tokenRef.current ?? (await AsyncStorage.getItem("access_token"));
      if (!token) return;
      tokenRef.current = token;

      const [historyRes, totalRes, configRes] = await Promise.all([
        getRewardPointsHistory(token, page, ITEMS_PER_PAGE),
        page === 1 ? getRewardPointsTotal(token) : Promise.resolve(null),
        page === 1 ? getRewardCampaignConfig(token) : Promise.resolve(null),
      ]);

      if (historyRes.success) {
        const items: RewardTransaction[] = (historyRes.data?.data ?? []).map(
          (item: Record<string, unknown>) => ({
            id: String(item.id ?? ""),
            points: Number(item.points ?? 0),
            type: String(item.type ?? "EARNED") as "EARNED" | "REDEEMED",
            description: item.description ? String(item.description) : undefined,
            referenceId: item.referenceId ? String(item.referenceId) : undefined,
            balanceBefore: Number(item.balanceBefore ?? 0),
            balanceAfter: Number(item.balanceAfter ?? 0),
            createdAt: String(item.createdAt ?? ""),
          }),
        );

        const pagination = historyRes.data?.pagination;
        if (pagination) {
          setTotalCount(pagination.total ?? 0);
          setHasMore(page < (pagination.totalPages ?? 1));
        }

        setTransactions((prev) => (append ? [...prev, ...items] : items));
        setCurrentPage(page);
      }

      if (totalRes?.success) {
        setTotalPoints(totalRes.total ?? 0);
      }

      if (configRes?.success && configRes.data) {
        setCampaignConfig(configRes.data as CampaignConfig);
      }
    } catch (e) {
      if (__DEV__) console.error("[RewardPoints] loadData error", e);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData(1);
    }, [loadData]),
  );

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      void loadData(currentPage + 1, true);
    }
  };

  const handleRedeemPress = () => {
    if (totalPoints < MIN_REDEEM_POINTS) {
      setShowNotEnoughModal(true);
    } else {
      setPasscode("");
      setRedeemError("");
      setShowRedeemModal(true);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!passcode || passcode.length < 4) {
      setRedeemError(t("rewardPoints.passcodeTooShort"));
      return;
    }
    setIsRedeeming(true);
    setRedeemError("");
    try {
      const token = tokenRef.current;
      if (!token) {
        setRedeemError(t("rewardPoints.notAuthenticated"));
        return;
      }
      const res = await redeemRewardPoints(token, passcode);
      const pts = totalPoints.toLocaleString();
      if (res.success) {
        setShowRedeemModal(false);
        setPasscode("");
        setRedeemedPointsLabel(pts);
        setShowRedeemSuccessModal(true);
      } else {
        setRedeemError(res.error ?? t("rewardPoints.redemptionFailed"));
      }
    } catch (e) {
      setRedeemError(t("rewardPoints.genericError"));
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowRedeemSuccessModal(false);
    void loadData(1);
  };

  const dateLocale =
    language === "Korean" ? "ko-KR" : language === "Japanese" ? "ja-JP" : language === "Arabic" ? "ar-SA" : "en-PH";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderItem = (item: RewardTransaction) => {
    const isEarned = item.type === "EARNED";
    const pointsLabel = isEarned ? `+${item.points}` : String(item.points);
    const iconName = isEarned ? "star" : "arrow-up-circle";
    const iconColor = isEarned ? "#F28934" : "#3B82F6";
    const pointColor = isEarned ? "#16A34A" : "#2563EB";

    return (
      <View key={item.id} style={styles.txRow}>
        <View style={[styles.txIconCircle, { backgroundColor: isEarned ? "#FFF3E0" : "#EFF6FF" }]}>
          <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
        </View>
        <View style={styles.txMiddle}>
          <Text style={styles.txType} numberOfLines={1}>
            {isEarned ? t("rewardPoints.typeEarned") : t("rewardPoints.typeRedeemed")}
          </Text>
          {item.description ? (
            <Text style={styles.txDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txPoints, { color: pointColor }]}>
            {t("rewardPoints.pointsWithUnit", { value: pointsLabel })}
          </Text>
          <Text style={styles.txBalance}>
            {t("rewardPoints.balanceAfter", { points: String(item.balanceAfter) })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#E25A17" />

      {/* Header */}
      <LinearGradient
        colors={ORANGE_GRADIENT}
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("rewardPoints.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Points balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t("rewardPoints.yourBalance")}</Text>
          {isLoading ? (
            <View style={{ alignItems: "center", gap: 8, marginVertical: 8 }}>
              <View style={styles.skeletonBalanceAmount} />
            </View>
          ) : (
            <Text style={styles.balanceAmount}>{totalPoints.toLocaleString()}</Text>
          )}
          <Text style={styles.balanceSubLabel}>{t("rewardPoints.onePointEquals")}</Text>
        </View>

        {/* Campaign info pill */}
        {isLoading ? (
          <View style={styles.skeletonCampaignPill} />
        ) : campaignConfig?.enabled ? (
          <View style={styles.campaignPill}>
            <MaterialCommunityIcons name="star-circle" size={14} color="#F28934" />
            <Text style={styles.campaignPillText}>
              {t("rewardPoints.campaignPill", {
                percentage: String(campaignConfig.percentage),
                maxDaily: campaignConfig.maxDailyAmount.toLocaleString(),
              })}
            </Text>
          </View>
        ) : null}

        {/* Redeem button */}
        <TouchableOpacity
          style={[
            styles.redeemBtn,
            isLoading
              ? styles.redeemBtnDisabled
              : totalPoints >= MIN_REDEEM_POINTS
                ? styles.redeemBtnActive
                : styles.redeemBtnDisabled,
          ]}
          onPress={isLoading ? undefined : handleRedeemPress}
          activeOpacity={isLoading ? 1 : 0.85}
        >
          <MaterialCommunityIcons
            name="cash-plus"
            size={18}
            color={!isLoading && totalPoints >= MIN_REDEEM_POINTS ? "#FFFFFF" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.redeemBtnText,
              !isLoading && totalPoints >= MIN_REDEEM_POINTS ? styles.redeemBtnTextActive : styles.redeemBtnTextDisabled,
            ]}
          >
            {t("rewardPoints.redeemButton")}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Transaction list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
            handleLoadMore();
          }
        }}
      >
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>{t("rewardPoints.historyTitle")}</Text>
          {!isLoading && (
            <Text style={styles.listHeaderCount}>
              {t("rewardPoints.transactionsCount", { count: String(totalCount) })}
            </Text>
          )}
        </View>

        {isLoading ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonTransactionRow key={i} />
            ))}
          </>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="star-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t("rewardPoints.emptyTitle")}</Text>
            <Text style={styles.emptySubText}>
              {t("rewardPoints.emptySubtitle", {
                min: campaignConfig?.minEligibleAmount?.toLocaleString() ?? "1,000",
              })}
            </Text>
          </View>
        ) : (
          <>
            {transactions.map(renderItem)}
            {isLoadingMore && (
              <ActivityIndicator color="#E25A17" size="small" style={{ marginVertical: 16 }} />
            )}
            {!hasMore && transactions.length > 0 && (
              <Text style={styles.endText}>{t("rewardPoints.allTransactionsLoaded")}</Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Redeem Confirmation Modal */}
      <Modal
        visible={showRedeemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedeemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <MaterialCommunityIcons name="cash-plus" size={32} color="#E25A17" />
            </View>
            <Text style={styles.modalTitle}>{t("rewardPoints.convertTitle")}</Text>
            <Text style={styles.modalBody}>
              {t("rewardPoints.convertBody", {
                points: totalPoints.toLocaleString(),
                amount: totalPoints.toLocaleString(),
              })}
            </Text>
            <Text style={styles.modalPasscodeLabel}>{t("rewardPoints.enterPasscode")}</Text>
            <TextInput
              style={styles.passcodeInput}
              value={passcode}
              onChangeText={setPasscode}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder={t("rewardPoints.passcodePlaceholder")}
              placeholderTextColor="#9CA3AF"
            />
            {!!redeemError && (
              <Text style={styles.redeemError}>{redeemError}</Text>
            )}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRedeemModal(false)}
                disabled={isRedeeming}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isRedeeming && styles.modalConfirmBtnDisabled]}
                onPress={() => void handleConfirmRedeem()}
                disabled={isRedeeming}
              >
                {isRedeeming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("rewardPoints.confirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Not Enough Points Modal */}
      <Modal
        visible={showNotEnoughModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotEnoughModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <MaterialCommunityIcons name="star-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.modalTitle}>{t("rewardPoints.notEnoughTitle")}</Text>
            <Text style={styles.modalBody}>
              {t("rewardPoints.notEnoughBody", {
                minPoints: MIN_REDEEM_POINTS.toLocaleString(),
                current: totalPoints.toLocaleString(),
              })}
            </Text>
            {campaignConfig?.enabled && (
              <View style={styles.campaignInfoBox}>
                <Text style={styles.campaignInfoText}>
                  {t("rewardPoints.campaignInfo", {
                    min: campaignConfig.minEligibleAmount.toLocaleString(),
                    earned: String(
                      Math.floor(
                        (campaignConfig.minEligibleAmount * campaignConfig.percentage) / 100,
                      ),
                    ),
                    max: campaignConfig.maxDailyAmount.toLocaleString(),
                  })}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.modalSingleBtn}
              onPress={() => setShowNotEnoughModal(false)}
            >
              <Text style={styles.modalSingleBtnText}>{t("rewardPoints.gotIt")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Redeem Success Modal */}
      <Modal
        visible={showRedeemSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={32} color="#16A34A" />
            </View>
            <Text style={styles.modalTitle}>{t("rewardPoints.redeemSuccessTitle")}</Text>
            <Text style={styles.modalBody}>
              {t("rewardPoints.redeemSuccessMessage", {
                points: redeemedPointsLabel,
                amount: redeemedPointsLabel,
              })}
            </Text>
            <TouchableOpacity
              style={styles.modalSingleBtn}
              onPress={handleCloseSuccessModal}
            >
              <Text style={styles.modalSingleBtnText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { paddingBottom: 20, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  balanceCard: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  balanceLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  balanceAmount: { fontSize: 42, fontWeight: "800", color: "#FFFFFF", letterSpacing: 1 },
  balanceSubLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  campaignPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "center",
    marginBottom: 12,
    gap: 6,
  },
  campaignPillText: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  redeemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  redeemBtnActive: { backgroundColor: "#16A34A" },
  redeemBtnDisabled: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  redeemBtnText: { fontSize: 15, fontWeight: "700" },
  redeemBtnTextActive: { color: "#FFFFFF" },
  redeemBtnTextDisabled: { color: "#9CA3AF" },

  list: { flex: 1 },
  listContent: { paddingBottom: 32 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeaderTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  listHeaderCount: { fontSize: 12, color: "#9CA3AF" },
  txRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txMiddle: { flex: 1 },
  txType: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  txDesc: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  txDate: { fontSize: 11, color: "#9CA3AF" },
  txRight: { alignItems: "flex-end", minWidth: 80 },
  txPoints: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  txBalance: { fontSize: 10, color: "#9CA3AF" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 16 },
  emptySubText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 8 },
  endText: { textAlign: "center", color: "#9CA3AF", fontSize: 12, paddingVertical: 16 },

  // Skeleton loading
  skeletonBase: {
    backgroundColor: "#F3F4F6",
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E5E7EB",
  },
  skeletonBalanceAmount: {
    width: 140,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  skeletonCampaignPill: {
    width: 220,
    height: 30,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignSelf: "center",
    marginBottom: 12,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalIconRow: { alignItems: "center", marginBottom: 12 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  modalHighlight: { fontWeight: "700", color: "#16A34A" },
  modalPasscodeLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  passcodeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 8,
    color: "#1F2937",
  },
  redeemError: { color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 8 },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  modalCancelText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    alignItems: "center",
  },
  modalConfirmBtnDisabled: { backgroundColor: "#9CA3AF" },
  modalConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  campaignInfoBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  campaignInfoText: { fontSize: 12, color: "#92400E", textAlign: "center", lineHeight: 18 },
  modalSingleBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#E25A17",
    alignItems: "center",
  },
  modalSingleBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
