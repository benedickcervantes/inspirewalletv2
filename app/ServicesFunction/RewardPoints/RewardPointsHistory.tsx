import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import Svg, { Path } from "react-native-svg";
import {
  getRewardCampaignConfig,
  getRewardPointsHistory,
  getRewardPointsTotal,
  redeemRewardPoints,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import type { NavProp } from "../../../types/navigation";

// ─── constants ─────────────────────────────────────────────────────────────────
const GRADIENT: readonly [string, string, string, string] = [
  "#DE5212", "#E15816", "#E8752A", "#F5A54A",
];
const ITEMS_PER_PAGE = 20;
const MIN_REDEEM_POINTS = 1000;

// ─── types ─────────────────────────────────────────────────────────────────────
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

type FilterType = "ALL" | "EARNED" | "REDEEMED";

// ─── skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <View style={styles.txCard}>
      <View style={[styles.txIcon, { backgroundColor: "#F3F4F6" }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.skLine, { width: "40%" }]} />
        <View style={[styles.skLine, { width: "68%", height: 10 }]} />
        <View style={[styles.skLine, { width: "32%", height: 10 }]} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 5 }}>
        <View style={[styles.skLine, { width: 54 }]} />
        <View style={[styles.skLine, { width: 38, height: 10 }]} />
      </View>
    </View>
  );
}

// ─── component ─────────────────────────────────────────────────────────────────
export default function RewardPointsHistory() {
  const navigation = useNavigation<NavProp>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [monthlyEarned, setMonthlyEarned] = useState(0);
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>("ALL");

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

        if (!append) {
          const now = new Date();
          const earned = items
            .filter((i) => {
              const d = new Date(i.createdAt);
              return (
                i.type === "EARNED" &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            })
            .reduce((sum, i) => sum + i.points, 0);
          setMonthlyEarned(earned);
        }
      }

      if (totalRes?.success) setTotalPoints(totalRes.total ?? 0);
      if (configRes?.success && configRes.data)
        setCampaignConfig(configRes.data as CampaignConfig);
    } catch (e) {
      if (__DEV__) console.error("[RewardPoints] loadData error", e);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadData(1); }, [loadData]));

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) void loadData(currentPage + 1, true);
  };

  const handleRedeemPress = () => {
    if (totalPoints < MIN_REDEEM_POINTS) setShowNotEnoughModal(true);
    else { setPasscode(""); setRedeemError(""); setShowRedeemModal(true); }
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
      if (!token) { setRedeemError(t("rewardPoints.notAuthenticated")); return; }
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
    } catch {
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
    language === "Korean" ? "ko-KR"
    : language === "Japanese" ? "ja-JP"
    : language === "Arabic" ? "ar-SA"
    : "en-PH";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString(dateLocale, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  };

  const filteredTransactions = transactions.filter(
    (tx) => filter === "ALL" || tx.type === filter,
  );

  const canRedeem = !isLoading && totalPoints >= MIN_REDEEM_POINTS;

  const renderItem = (item: RewardTransaction) => {
    const isEarned = item.type === "EARNED";
    const pointsLabel = isEarned
      ? `+${item.points.toLocaleString()}`
      : `-${item.points.toLocaleString()}`;
    const iconName = isEarned ? "star-four-points" : "arrow-top-right";
    const iconBg = isEarned ? "#FFF5F0" : "#F5F5F5";
    const iconColor = isEarned ? "#E15816" : "#666666";
    const pointColor = isEarned ? "#E15816" : "#666666";
    const pillBg = isEarned ? "#FFF5F0" : "#F2F2F2";
    const pillText = isEarned ? "#DE5212" : "#666666";
    const accentStart = isEarned ? "#E15816" : "#CCCCCC";
    const accentEnd = isEarned ? "#F5A54A" : "#E5E5E5";
    const typeLabel = isEarned
      ? t("rewardPoints.typeEarned")
      : t("rewardPoints.typeRedeemed");

    return (
      <View key={item.id} style={styles.txCard}>
        <LinearGradient
          colors={[accentStart, accentEnd]}
          style={styles.txAccentBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={iconName as any} size={18} color={iconColor} />
        </View>
        <View style={styles.txBody}>
          <View style={[styles.txTypePill, { backgroundColor: pillBg }]}>
            <Text style={[styles.txTypePillText, { color: pillText }]}>{typeLabel}</Text>
          </View>
          {item.description ? (
            <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txPts, { color: pointColor }]}>{pointsLabel}</Text>
          <Text style={styles.txPtsUnit}>pts</Text>
          <Text style={styles.txBal}>
            {t("rewardPoints.balanceAfter", { points: item.balanceAfter.toLocaleString() })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#DE5212" />

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 26) }]}
      >
        <View style={styles.orb1} pointerEvents="none" />
        <View style={styles.orb2} pointerEvents="none" />

        {/* nav bar */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>{t("rewardPoints.title")}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("RewardPointsTerms")}
            style={styles.iconBtn}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t("rewardPoints.termsScreenTitle")}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* balance card */}
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>{t("rewardPoints.yourBalance")}</Text>
          {isLoading ? (
            <View style={styles.skBalAmount} />
          ) : (
            <View style={styles.balRow}>
              <Text style={styles.balAmount}>{totalPoints.toLocaleString()}</Text>
              <Text style={styles.balUnit}>pts</Text>
            </View>
          )}
          <View style={styles.balDivider} />
          <Text style={styles.balSub}>{t("rewardPoints.onePointEquals")}</Text>
        </View>

        {/* stats row */}
        {isLoading ? (
          <View style={styles.skStatsRow}>
            {[0, 1, 2].map((i) => <View key={i} style={styles.skStatPill} />)}
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statVal}>+{monthlyEarned.toLocaleString()}</Text>
              <Text style={styles.statLbl}>{t("This Month") ?? "This month"}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statVal}>₱{totalPoints.toLocaleString()}</Text>
              <Text style={styles.statLbl}>{t("Total Value") ?? "Total value"}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statVal}>{totalCount}</Text>
              <Text style={styles.statLbl}>{t("Transactions") ?? "Transactions"}</Text>
            </View>
          </View>
        )}

        {/* campaign pill */}
        {isLoading ? (
          <View style={styles.skCampaignPill} />
        ) : campaignConfig?.enabled ? (
          <View style={styles.campaignPill}>
            <MaterialCommunityIcons name="lightning-bolt" size={12} color="#E25A17" />
            <Text style={styles.campaignPillText}>
              {t("rewardPoints.campaignPill", {
                percentage: String(campaignConfig.percentage),
                maxDaily: campaignConfig.maxDailyAmount.toLocaleString(),
              })}
            </Text>
          </View>
        ) : null}

        {/* redeem button */}
        <TouchableOpacity
          style={[styles.redeemBtn, canRedeem ? styles.redeemBtnOn : styles.redeemBtnOff]}
          onPress={isLoading ? undefined : handleRedeemPress}
          activeOpacity={canRedeem ? 0.8 : 1}
        >
          <View style={[styles.redeemIconWrap, canRedeem ? styles.redeemIconOn : styles.redeemIconOff]}>
            <MaterialCommunityIcons
              name="cash-fast"
              size={16}
              color={canRedeem ? "#16A34A" : "#9CA3AF"}
            />
          </View>
          <Text style={[styles.redeemBtnText, canRedeem ? styles.redeemTextOn : styles.redeemTextOff]}>
            {t("rewardPoints.redeemButton")}
          </Text>
          {canRedeem && (
            <>
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>{t("rewardPoints.readyLabel") ?? "Ready"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(22,163,74,0.45)" />
            </>
          )}
        </TouchableOpacity>

        {/* wave divider */}
        <View style={{ marginHorizontal: -18, marginBottom: -1 }}>
          <Svg width={width} height={28} viewBox={`0 0 ${width} 28`} preserveAspectRatio="none">
            <Path
              d={`M0,28 L0,14 Q${width * 0.13},0 ${width * 0.25},10 T${width * 0.5},5 T${width * 0.76},12 T${width},3 L${width},28 Z`}
              fill="#F7F5F2"
            />
          </Svg>
        </View>
      </LinearGradient>

      {/* ══ TRANSACTION LIST ══════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 28, 40) },
        ]}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80)
            handleLoadMore();
        }}
      >
        {/* section header */}
        <View style={styles.listHead}>
          <View style={styles.listHeadLeft}>
            <LinearGradient
              colors={["#E15816", "#F5A54A"]}
              style={styles.listAccentBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={styles.listHeadTitle}>{t("rewardPoints.historyTitle")}</Text>
          </View>
          {!isLoading && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {t("rewardPoints.transactionsCount", { count: String(totalCount) })}
              </Text>
            </View>
          )}
        </View>

        {/* filter chips */}
        {!isLoading && transactions.length > 0 && (
          <View style={styles.filterRow}>
            {(["ALL", "EARNED", "REDEEMED"] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f ? styles.filterOn : styles.filterOff]}
                onPress={() => setFilter(f)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, filter === f ? styles.filterTextOn : styles.filterTextOff]}>
                  {f === "ALL"
                    ? t("All") ?? "All"
                    : f === "EARNED"
                    ? t("rewardPoints.typeEarned")
                    : t("rewardPoints.typeRedeemed")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* rows */}
        {isLoading ? (
          <>{[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}</>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="star-outline" size={34} color="#E15816" />
            </View>
            <Text style={styles.emptyTitle}>{t("rewardPoints.emptyTitle")}</Text>
            <Text style={styles.emptySub}>
              {t("rewardPoints.emptySubtitle", {
                min: campaignConfig?.minEligibleAmount?.toLocaleString() ?? "1,000",
              })}
            </Text>
          </View>
        ) : (
          <>
            {filteredTransactions.map(renderItem)}
            {isLoadingMore && (
              <ActivityIndicator color="#E15816" size="small" style={{ marginVertical: 18 }} />
            )}
            {!hasMore && filteredTransactions.length > 0 && (
              <View style={styles.endRow}>
                <View style={styles.endLine} />
                <Text style={styles.endText}>{t("rewardPoints.allTransactionsLoaded")}</Text>
                <View style={styles.endLine} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ══ REDEEM MODAL ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showRedeemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRedeemModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowRedeemModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <LinearGradient colors={["#FFF5F0", "#FFFFFF"]} style={styles.sheetBanner}>
              <View style={styles.sheetIconCircle}>
                <MaterialCommunityIcons name="cash-fast" size={26} color="#E15816" />
              </View>
            </LinearGradient>
            <Text style={styles.modalTitle}>{t("rewardPoints.convertTitle")}</Text>
            <Text style={styles.modalBody}>
              {t("rewardPoints.convertBody", {
                points: totalPoints.toLocaleString(),
                amount: totalPoints.toLocaleString(),
              })}
            </Text>
            <Text style={styles.passcodeLabel}>{t("rewardPoints.enterPasscode")}</Text>
            <TextInput
              style={[styles.passcodeInput, redeemError ? styles.passcodeErr : null]}
              value={passcode}
              onChangeText={setPasscode}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="• • • • • •"
              placeholderTextColor="#D1D5DB"
            />
            {!!redeemError && <Text style={styles.redeemError}>{redeemError}</Text>}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRedeemModal(false)}
                disabled={isRedeeming}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, isRedeeming && styles.confirmBtnDisabled]}
                onPress={() => void handleConfirmRedeem()}
                disabled={isRedeeming}
              >
                {isRedeeming
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmBtnText}>{t("rewardPoints.confirm")}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ NOT ENOUGH MODAL ══════════════════════════════════════════════════ */}
      <Modal
        visible={showNotEnoughModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotEnoughModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowNotEnoughModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetIconCircle, { backgroundColor: "#FFFBEB", marginTop: 18, marginBottom: 4 }]}>
              <MaterialCommunityIcons name="star-half-full" size={26} color="#F59E0B" />
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
                <MaterialCommunityIcons name="lightning-bolt" size={13} color="#92400E" style={{ marginBottom: 4 }} />
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
            {/* progress toward minimum */}
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={["#E15816", "#F5A54A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (totalPoints / MIN_REDEEM_POINTS) * 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {totalPoints.toLocaleString()} / {MIN_REDEEM_POINTS.toLocaleString()} pts
            </Text>
            <TouchableOpacity style={styles.singleBtn} onPress={() => setShowNotEnoughModal(false)}>
              <Text style={styles.singleBtnText}>{t("rewardPoints.gotIt")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ SUCCESS MODAL ═════════════════════════════════════════════════════ */}
      <Modal
        visible={showRedeemSuccessModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <LinearGradient colors={["#F0FDF4", "#FFFFFF"]} style={styles.sheetBanner}>
              <View style={[styles.sheetIconCircle, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons name="check-circle" size={26} color="#16A34A" />
              </View>
            </LinearGradient>
            <Text style={styles.modalTitle}>{t("rewardPoints.redeemSuccessTitle")}</Text>
            <Text style={styles.modalBody}>
              {t("rewardPoints.redeemSuccessMessage", {
                points: redeemedPointsLabel,
                amount: redeemedPointsLabel,
              })}
            </Text>
            <TouchableOpacity style={styles.singleBtn} onPress={handleCloseSuccessModal}>
              <Text style={styles.singleBtnText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },

  // header
  header: { paddingBottom: 0, paddingHorizontal: 18, overflow: "hidden" },
  orb1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.12)", top: -90, right: -70,
  },
  orb2: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,245,240,0.2)", bottom: 50, left: -30,
  },
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
    justifyContent: "center", alignItems: "center",
  },
  navTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.2 },

  // balance card
  balCard: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 22, paddingVertical: 20, paddingHorizontal: 20,
    alignItems: "center", marginBottom: 14,
  },
  balLabel: {
    fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10,
  },
  balRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 14 },
  balAmount: {
    fontSize: 54, fontWeight: "900", color: "#fff",
    letterSpacing: -2, lineHeight: 58,
  },
  balUnit: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 7 },
  balDivider: {
    width: 28, height: 2, borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.28)", marginBottom: 12,
  },
  balSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "500" },

  // stats row
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statPill: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 14, paddingVertical: 10, alignItems: "center",
  },
  statVal: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  statLbl: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },

  // campaign pill
  campaignPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 22,
    paddingHorizontal: 13, paddingVertical: 7,
    alignSelf: "center", marginBottom: 14, gap: 5,
    shadowColor: "#E15816", shadowOpacity: 0.18,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  campaignPillText: { fontSize: 11, color: "#666666", fontWeight: "600" },

  // redeem button
  redeemBtn: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, paddingVertical: 13, paddingHorizontal: 15,
    gap: 10, marginBottom: 4,
  },
  redeemBtnOn: {
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.12,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  redeemBtnOff: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  redeemIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    justifyContent: "center", alignItems: "center",
  },
  redeemIconOn: { backgroundColor: "#F0FDF4" },
  redeemIconOff: { backgroundColor: "rgba(255,255,255,0.12)" },
  redeemBtnText: { fontSize: 14, fontWeight: "700", flex: 1 },
  redeemTextOn: { color: "#E15816" },
  redeemTextOff: { color: "rgba(255,255,255,0.5)" },
  readyBadge: {
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  readyBadgeText: { fontSize: 10, fontWeight: "700", color: "#E15816" },

  // list
  list: { flex: 1, backgroundColor: "#F5F5F5" },
  listContent: { paddingTop: 0 },
  listHead: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16,
    paddingTop: 18, paddingBottom: 12,
  },
  listHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  listAccentBar: { width: 4, height: 18, borderRadius: 2 },
  listHeadTitle: { fontSize: 15, fontWeight: "800", color: "#333333", letterSpacing: 0.1 },
  countBadge: {
    backgroundColor: "#FFF5F0", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countBadgeText: { fontSize: 10, color: "#E15816", fontWeight: "700" },

  // filter chips
  filterRow: { flexDirection: "row", gap: 7, paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterOn: { backgroundColor: "#E15816" },
  filterOff: { backgroundColor: "#EEEEEE" },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  filterTextOn: { color: "#fff" },
  filterTextOff: { color: "#666666" },

  // transaction card
  txCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 14, marginBottom: 8,
    paddingLeft: 16, paddingRight: 13, paddingVertical: 13,
    backgroundColor: "#fff",
    borderRadius: 16, borderWidth: 1, borderColor: "#F0F0F0",
    shadowColor: "#000000", shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1, overflow: "hidden", gap: 11,
  },
  txAccentBar: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: 3, borderRadius: 2,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  txBody: { flex: 1, gap: 3, minWidth: 0 },
  txTypePill: {
    alignSelf: "flex-start", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 1,
  },
  txTypePillText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  txDesc: { fontSize: 11, color: "#666666" },
  txDate: { fontSize: 10, color: "#999999" },
  txRight: { alignItems: "flex-end", gap: 1, flexShrink: 0 },
  txPts: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, lineHeight: 20 },
  txPtsUnit: { fontSize: 9, fontWeight: "600", color: "#999999" },
  txBal: { fontSize: 9, color: "#B3B3B3", marginTop: 4 },

  // empty state
  empty: {
    alignItems: "center", marginHorizontal: 16, marginTop: 44,
    paddingVertical: 40, paddingHorizontal: 24,
    backgroundColor: "#fff", borderRadius: 20,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  emptyIconWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: "#FFF5F0",
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#333333", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },

  // end of list
  endRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 22, paddingVertical: 22, gap: 10,
  },
  endLine: { flex: 1, height: 1, backgroundColor: "#E5E5E5" },
  endText: { fontSize: 11, color: "#999999", fontWeight: "500" },

  // skeleton
  skLine: { height: 14, borderRadius: 7, backgroundColor: "#EDECEA" },
  skBalAmount: {
    width: 140, height: 56, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4,
  },
  skStatsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  skStatPill: {
    flex: 1, height: 58, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  skCampaignPill: {
    width: 200, height: 32, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center", marginBottom: 14,
  },

  // modals / sheet
  sheetOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 36,
    alignItems: "center",
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB", marginTop: 12, marginBottom: 2,
  },
  sheetBanner: {
    width: "100%", alignItems: "center",
    paddingVertical: 18, borderRadius: 16,
    marginTop: 10, marginBottom: 6,
  },
  sheetIconCircle: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: "#FFF3E0",
    justifyContent: "center", alignItems: "center",
  },
  modalTitle: {
    fontSize: 19, fontWeight: "800", color: "#333333",
    textAlign: "center", marginBottom: 8, letterSpacing: -0.3,
  },
  modalBody: {
    fontSize: 14, color: "#6B7280",
    textAlign: "center", lineHeight: 22, marginBottom: 20,
  },
  passcodeLabel: {
    fontSize: 11, color: "#9CA3AF", fontWeight: "600",
    letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 10,
  },
  passcodeInput: {
    width: "100%", borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, textAlign: "center", letterSpacing: 10,
    marginBottom: 10, color: "#1A1208", backgroundColor: "#FAFAF8",
  },
  passcodeErr: { borderColor: "#EF4444" },
  redeemError: {
    color: "#EF4444", fontSize: 12, fontWeight: "500",
    textAlign: "center", marginBottom: 8,
  },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 8, width: "100%" },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E5E7EB", alignItems: "center",
  },
  cancelBtnText: { color: "#6B7280", fontWeight: "700", fontSize: 15 },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: "#E15816", alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#D1D5DB" },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  singleBtn: {
    width: "100%", paddingVertical: 14, borderRadius: 14,
    backgroundColor: "#E15816", alignItems: "center", marginTop: 6,
  },
  singleBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },
  campaignInfoBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A",
    padding: 14, marginBottom: 16,
    width: "100%", alignItems: "center",
  },
  campaignInfoText: { fontSize: 12, color: "#92400E", textAlign: "center", lineHeight: 18 },
  progressTrack: {
    width: "100%", height: 8, borderRadius: 4,
    backgroundColor: "#F3EDE5", marginBottom: 6, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: {
    fontSize: 11, color: "#9CA3AF", fontWeight: "600",
    marginBottom: 16, textAlign: "center",
  },
});