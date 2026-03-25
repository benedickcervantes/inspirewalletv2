import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    AppStateStatus,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getStockInvestmentDepositRequests,
    getStockMarketplaceListings,
    getStockSellRequests,
    getWallets,
    purchaseStockListing,
} from "../../../configs/api";
import { getStockInvestmentMinAmount } from "../../../configs/currencies";
import { getLanguageCode } from "../../../constants/locales";
import { useLanguage } from "../../../context/LanguageContext";

const THEME_COLOR = "#E15816";

type Tab = "portfolio" | "orders" | "marketplace";
type OrderHistoryFilter = "buy" | "sell";

const ORDERS_PER_PAGE = 5;

interface MarketplaceListing {
  id: string;
  stocksToSell: number;
  phpAmount: number;
  createdAt: string;
}

interface StockRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  amount?: string;
  stocksToSell?: number;
  createdAt: string;
  type?: "buy" | "sell";
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const colors: Record<string, string> = {
    PENDING: "#F59E0B",
    APPROVED: "#10B981",
    REJECTED: "#EF4444",
  };
  const normalized = String(status).toUpperCase();
  const label =
    normalized === "PENDING"
      ? t("stock.statusPending")
      : normalized === "APPROVED"
        ? t("stock.statusApproved")
        : normalized === "REJECTED"
          ? t("stock.statusRejected")
          : status;
  return (
    <View
      style={[styles.badge, { backgroundColor: colors[normalized] ?? "#999" }]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function StockService() {
  const { t, language } = useLanguage();
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  /** iPhone SE / narrow devices — translated tab labels need smaller type & wrapping */
  const isCompactStockTabs = windowWidth < 375;
  const isTinyStockTabs = windowWidth < 340;
  /** Android: adjustsFontSizeToFit is limited; allow horizontal scroll on very narrow widths */
  const useScrollableTabs = windowWidth < 360;
  const tabScrollMinWidth = Math.max(96, Math.round(windowWidth * 0.34));

  const locale = useMemo(() => {
    const code = getLanguageCode(language);
    const map: Record<string, string> = {
      en: "en-PH",
      ko: "ko-KR",
      ja: "ja-JP",
      ar: "ar-SA",
    };
    return map[code] ?? "en-PH";
  }, [language]);

  const formatCurrency = useCallback(
    (value: number) =>
      value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const formatStocks = useCallback(
    (count: number) => {
      if (count === 0) return "0";
      if (count >= 1)
        return count.toLocaleString(locale, { maximumFractionDigits: 4 });
      return count.toFixed(8).replace(/\.?0+$/, "");
    },
    [locale],
  );

  const [activeTab, setActiveTab] = useState<Tab>("portfolio");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Portfolio state
  const [stockCount, setStockCount] = useState(0);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [stockRate, setStockRate] = useState(2_000_000);

  // My Orders state
  const [buyRequests, setBuyRequests] = useState<StockRequest[]>([]);
  const [sellListings, setSellListings] = useState<StockRequest[]>([]);
  const [orderHistoryFilter, setOrderHistoryFilter] =
    useState<OrderHistoryFilter>("buy");
  const [ordersPage, setOrdersPage] = useState(1);

  // Marketplace state
  const [marketplaceListings, setMarketplaceListings] = useState<
    MarketplaceListing[]
  >([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [confirmListing, setConfirmListing] =
    useState<MarketplaceListing | null>(null);

  // Alert modal
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });
  const [showAlert, setShowAlert] = useState(false);

  const showAlertModal = (title: string, message: string) => {
    setAlertConfig({ title, message });
    setShowAlert(true);
  };

  // ── Realtime polling ────────────────────────────────────────────────────
  const POLL_INTERVAL_MS = 15_000; // 15 seconds
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      // --- Portfolio: fetch STOCK wallet + rate ---
      const [walletsRes, rate] = await Promise.all([
        accessToken
          ? getWallets(accessToken)
          : Promise.resolve({ wallets: [] }),
        getStockInvestmentMinAmount(),
      ]);

      const wallets = walletsRes?.wallets ?? [];
      const stockWallet = Array.isArray(wallets)
        ? wallets.find(
            (w: any) => (w.currency?.code ?? w.currencyCode) === "STOCK",
          )
        : null;

      const balance = stockWallet
        ? parseFloat(
            String(stockWallet.balance ?? stockWallet.decryptedBalance ?? "0"),
          )
        : 0;

      setStockRate(rate);
      setStockCount(isNaN(balance) ? 0 : balance);
      setTotalPortfolioValue(isNaN(balance) ? 0 : balance * rate);

      if (!accessToken) return;

      // --- My Orders ---
      const [buyRes, sellRes] = await Promise.all([
        getStockInvestmentDepositRequests(accessToken),
        getStockSellRequests(accessToken),
      ]);

      setBuyRequests(
        (Array.isArray(buyRes?.requests) ? buyRes.requests : []).map(
          (r: any) => ({
            ...r,
            type: "buy" as const,
          }),
        ),
      );
      setSellListings(
        (Array.isArray(sellRes?.data) ? sellRes.data : []).map((r: any) => ({
          ...r,
          type: "sell" as const,
        })),
      );

      // --- Marketplace ---
      const mktRes = await getStockMarketplaceListings(accessToken);
      setMarketplaceListings(Array.isArray(mktRes?.data) ? mktRes.data : []);
    } catch (err) {
      console.error("[StockService] loadData error", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  // AppState-aware polling: refresh every 15 s while foregrounded
  useEffect(() => {
    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        loadData();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Start immediately
    startPolling();

    // Pause/resume based on app foreground state
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          // App came to foreground — refresh immediately + restart polling
          loadData();
          startPolling();
        } else if (nextState.match(/inactive|background/)) {
          stopPolling();
        }
        appStateRef.current = nextState;
      },
    );

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // --- P2P Purchase ---
  const handlePurchase = async (listing: MarketplaceListing) => {
    setBuyingId(listing.id);
    setConfirmListing(null);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        showAlertModal(t("stock.notAuthenticatedTitle"), t("stock.notAuthenticatedMessage"));
        return;
      }
      const result = await purchaseStockListing(accessToken, listing.id);
      if (result.success) {
        showAlertModal(
          t("stock.purchaseSuccessTitle"),
          t("stock.purchaseSuccessMessage", { count: String(formatStocks(listing.stocksToSell)), amount: formatCurrency(listing.phpAmount) }),
        );
        await loadData();
      } else {
        showAlertModal(
          t("stock.purchaseFailedTitle"),
          result.error ?? t("stock.purchaseFailed"),
        );
      }
    } catch {
      showAlertModal(
        t("common.error"),
        t("stock.unexpectedError"),
      );
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
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
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("stock.dashboardHeader")}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        {/* Tab Bar — responsive for long translations (KR/JA/AR) on small screens */}
        {useScrollableTabs ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarScrollContent}
          >
            {(["portfolio", "orders", "marketplace"] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItemScroll,
                  { minWidth: tabScrollMinWidth },
                  isCompactStockTabs && styles.tabItemCompact,
                  isTinyStockTabs && styles.tabItemTiny,
                  activeTab === tab && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isCompactStockTabs && styles.tabLabelCompact,
                    isTinyStockTabs && styles.tabLabelTiny,
                    activeTab === tab && styles.tabLabelActive,
                  ]}
                  numberOfLines={Platform.OS === "ios" ? 2 : 3}
                  {...(Platform.OS === "ios"
                    ? {
                        adjustsFontSizeToFit: true,
                        minimumFontScale: isTinyStockTabs ? 0.68 : 0.78,
                      }
                    : {})}
                >
                  {tab === "portfolio"
                    ? t("stock.portfolio")
                    : tab === "orders"
                      ? t("stock.myOrders")
                      : t("stock.marketplace")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.tabBar}>
            {(["portfolio", "orders", "marketplace"] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  isCompactStockTabs && styles.tabItemCompact,
                  isTinyStockTabs && styles.tabItemTiny,
                  activeTab === tab && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isCompactStockTabs && styles.tabLabelCompact,
                    isTinyStockTabs && styles.tabLabelTiny,
                    activeTab === tab && styles.tabLabelActive,
                  ]}
                  numberOfLines={Platform.OS === "ios" ? 2 : 3}
                  {...(Platform.OS === "ios"
                    ? {
                        adjustsFontSizeToFit: true,
                        minimumFontScale: isTinyStockTabs ? 0.68 : 0.78,
                      }
                    : {})}
                >
                  {tab === "portfolio"
                    ? t("stock.portfolio")
                    : tab === "orders"
                      ? t("stock.myOrders")
                      : t("stock.marketplace")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.pageSkeletonContainer}>
            <View style={styles.pageSkeletonBanner} />
            <View style={styles.pageSkeletonCard}>
              <View style={styles.pageSkeletonLineLong} />
              <View style={styles.pageSkeletonLineShort} />
              <View style={styles.pageSkeletonLineLong} />
            </View>
            <View style={styles.pageSkeletonCard}>
              <View style={styles.pageSkeletonLineMedium} />
              <View style={styles.pageSkeletonLineLong} />
            </View>
          </View>
        ) : activeTab === "portfolio" && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={THEME_COLOR}
              />
            }
          >
            {/* Stock Rate Banner */}
            <LinearGradient
              colors={["#F28934", "#E25A17"]}
              style={styles.rateBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons
                name="chart-line"
                size={20}
                color="#fff"
              />
              <Text style={styles.rateBannerText}>
                {t("stock.rateEqualsPhp", { rate: formatCurrency(stockRate) })}
              </Text>
            </LinearGradient>

            {/* Stock Portfolio Card */}
            <View style={styles.portfolioCard}>
              <View style={styles.leftBorder} />
              <Text style={styles.cardLabel}>
                {t("stock.stockPortfolioCard")}
              </Text>
              <Text style={styles.cardMainValue}>
                {formatStocks(stockCount)}{" "}
                <Text style={styles.cardUnit}>
                  {stockCount === 1 ? t("stock.stock") : t("stock.stocks")}
                </Text>
              </Text>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>
                {t("stock.totalPortfolioValue")}
              </Text>
              <Text style={styles.cardSubValue}>
                ₱{formatCurrency(totalPortfolioValue)} PHP
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("StockBuy", {
                    stockCount,
                    totalPortfolioValue,
                    stockRate,
                  })
                }
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.actionBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="trending-up" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>{t("stock.buyStock")}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("StockSell", {
                    stockCount,
                    totalPortfolioValue,
                  })
                }
              >
                <LinearGradient
                  colors={["#F28934", "#E25A17"]}
                  style={styles.actionBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="trending-down" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>{t("stock.sellStock")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Info note */}
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#E25A17"
              />
              <Text style={styles.infoText}>
                {t("stock.portfolioMarketplaceHint")}
              </Text>
            </View>
          </ScrollView>
        )}

        {activeTab === "orders" && (() => {
          const orders =
            orderHistoryFilter === "buy" ? buyRequests : sellListings;
          const totalPages = Math.max(
            1,
            Math.ceil(orders.length / ORDERS_PER_PAGE),
          );
          const currentPage = Math.min(ordersPage, totalPages);
          const startIdx = (currentPage - 1) * ORDERS_PER_PAGE;
          const paginatedOrders = orders.slice(
            startIdx,
            startIdx + ORDERS_PER_PAGE,
          );

          return (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={THEME_COLOR}
                />
              }
            >
              {/* Buy / Sell History Toggle */}
              <View style={styles.orderHistoryToggle}>
                <TouchableOpacity
                  style={[
                    styles.orderHistoryBtn,
                    orderHistoryFilter === "buy" && styles.orderHistoryBtnActive,
                  ]}
                  onPress={() => {
                    setOrderHistoryFilter("buy");
                    setOrdersPage(1);
                  }}
                >
                  <Ionicons
                    name="trending-up"
                    size={18}
                    color={
                      orderHistoryFilter === "buy" ? "#fff" : THEME_COLOR
                    }
                  />
                  <Text
                    style={[
                      styles.orderHistoryBtnText,
                      orderHistoryFilter === "buy" &&
                        styles.orderHistoryBtnTextActive,
                    ]}
                  >
                    {t("stock.buyHistory")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.orderHistoryBtn,
                    orderHistoryFilter === "sell" &&
                      styles.orderHistoryBtnActive,
                  ]}
                  onPress={() => {
                    setOrderHistoryFilter("sell");
                    setOrdersPage(1);
                  }}
                >
                  <Ionicons
                    name="trending-down"
                    size={18}
                    color={
                      orderHistoryFilter === "sell" ? "#fff" : THEME_COLOR
                    }
                  />
                  <Text
                    style={[
                      styles.orderHistoryBtnText,
                      orderHistoryFilter === "sell" &&
                        styles.orderHistoryBtnTextActive,
                    ]}
                  >
                    {t("stock.sellHistory")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Order list */}
              {paginatedOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name={
                      orderHistoryFilter === "buy"
                        ? "chart-timeline-variant"
                        : "tag-outline"
                    }
                    size={36}
                    color="#ccc"
                  />
                  <Text style={styles.emptyText}>
                    {orderHistoryFilter === "buy"
                      ? t("stock.noBuyRequests")
                      : t("stock.noSellListings")}
                  </Text>
                </View>
              ) : (
                <>
                  {paginatedOrders.map((r) => (
                    <View key={r.id} style={styles.orderCard}>
                      <View style={styles.leftBorderOrange} />
                      <View style={styles.orderCardContent}>
                        <View style={styles.orderRow}>
                          <Text style={styles.orderLabel}>
                            {orderHistoryFilter === "buy"
                              ? t("stock.orderAmountLabel")
                              : t("stock.stocksToSell")}
                          </Text>
                          <Text style={styles.orderValue}>
                            {orderHistoryFilter === "buy"
                              ? `₱${formatCurrency(
                                  parseFloat(r.amount ?? "0"),
                                )}`
                              : formatStocks(r.stocksToSell ?? 0)}
                          </Text>
                        </View>
                        <View style={styles.orderRow}>
                          <Text style={styles.orderLabel}>
                            {new Date(r.createdAt).toLocaleDateString(locale)}
                          </Text>
                          <StatusBadge status={r.status} />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <View style={styles.pagination}>
                      <TouchableOpacity
                        style={[
                          styles.paginationBtn,
                          currentPage <= 1 && styles.paginationBtnDisabled,
                        ]}
                        onPress={() =>
                          setOrdersPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage <= 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color={
                            currentPage <= 1 ? "#ccc" : THEME_COLOR
                          }
                        />
                        <Text
                          style={[
                            styles.paginationBtnText,
                            currentPage <= 1 &&
                              styles.paginationBtnTextDisabled,
                          ]}
                        >
                          {t("stock.paginationPrev")}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.paginationInfo}>
                        {t("stock.paginationPageOf", {
                          current: String(currentPage),
                          total: String(totalPages),
                        })}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.paginationBtn,
                          currentPage >= totalPages &&
                            styles.paginationBtnDisabled,
                        ]}
                        onPress={() =>
                          setOrdersPage((p) =>
                            Math.min(totalPages, p + 1),
                          )
                        }
                        disabled={currentPage >= totalPages}
                      >
                        <Text
                          style={[
                            styles.paginationBtnText,
                            currentPage >= totalPages &&
                              styles.paginationBtnTextDisabled,
                          ]}
                        >
                          {t("stock.paginationNext")}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={
                            currentPage >= totalPages ? "#ccc" : THEME_COLOR
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          );
        })()}

        {activeTab === "marketplace" && (
          <FlatList
            data={marketplaceListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.scrollContent,
              marketplaceListings.length === 0 && styles.emptyListContent,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={THEME_COLOR}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="storefront-outline"
                  size={48}
                  color="#ccc"
                />
                <Text style={styles.emptyText}>{t("stock.noListingsAvailable")}</Text>
                <Text style={styles.emptySubText}>
                  {t("stock.beTheFirst")}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.listingCard}>
                <View style={styles.leftBorderOrange} />
                <View style={styles.listingContent}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingStocks}>
                      {formatStocks(item.stocksToSell)}{" "}
                      {item.stocksToSell === 1
                        ? t("stock.stock")
                        : t("stock.stocks")}
                    </Text>
                    <Text style={styles.listingPrice}>
                      ₱{formatCurrency(item.phpAmount)}
                    </Text>
                    <Text style={styles.listingDate}>
                      {new Date(item.createdAt).toLocaleDateString(locale)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.buyListingBtn}
                    onPress={() => setConfirmListing(item)}
                    disabled={buyingId === item.id}
                  >
                    {buyingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cart" size={16} color="#fff" />
                        <Text style={styles.buyListingText}>
                          {t("stock.buyListing")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* Confirm Purchase Modal */}
        <Modal
          visible={!!confirmListing}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmListing(null)}
        >
          <View style={styles.alertOverlay}>
            <View style={styles.confirmCard}>
              <MaterialCommunityIcons
                name="cart-check"
                size={36}
                color={THEME_COLOR}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.confirmTitle}>
                {t("stock.confirmPurchaseTitle")}
              </Text>
              {confirmListing && (
                <>
                  <Text style={styles.confirmDetail}>
                    {formatStocks(confirmListing.stocksToSell)}{" "}
                    {confirmListing.stocksToSell === 1
                      ? t("stock.stock")
                      : t("stock.stocks")}
                  </Text>
                  <LinearGradient
                    colors={["#F28934", "#E25A17"]}
                    style={styles.confirmAmountBox}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmAmountLabel}>
                      {t("stock.totalCost")}
                    </Text>
                    <Text style={styles.confirmAmount}>
                      ₱{formatCurrency(confirmListing.phpAmount)}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.confirmNote}>
                    {t("stock.purchaseDeductNote")}
                  </Text>
                </>
              )}
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setConfirmListing(null)}
                >
                  <Text style={styles.confirmCancelText}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBuyBtn}
                  onPress={() =>
                    confirmListing && handlePurchase(confirmListing)
                  }
                >
                  <Text style={styles.confirmBuyText}>
                    {t("deposit.confirm")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Alert Modal */}
        <Modal
          visible={showAlert}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAlert(false)}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowAlert(false)}
              >
                <Text style={styles.alertButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  pageSkeletonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  pageSkeletonBanner: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ECECEC",
  },
  pageSkeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
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
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabBarScrollContent: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemCompact: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  tabItemTiny: {
    paddingVertical: 8,
    paddingHorizontal: 1,
  },
  tabItemActive: { borderBottomColor: THEME_COLOR },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#999",
    width: "100%",
    textAlign: "center",
  },
  tabLabelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabLabelTiny: {
    fontSize: 10,
    lineHeight: 13,
  },
  tabLabelActive: { color: THEME_COLOR, fontWeight: "700" },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyListContent: { flexGrow: 1 },

  // Rate Banner
  rateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  rateBannerText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Portfolio Card
  portfolioCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME_COLOR,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  leftBorderOrange: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME_COLOR,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  cardLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  cardMainValue: { fontSize: 28, fontWeight: "800", color: "#333" },
  cardUnit: { fontSize: 14, fontWeight: "500", color: "#999" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 14 },
  cardSubValue: { fontSize: 20, fontWeight: "700", color: THEME_COLOR },

  // Actions
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, borderRadius: 30, overflow: "hidden", elevation: 4 },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Info
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFF5F0",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFD5C0",
  },
  infoText: { flex: 1, fontSize: 12, color: "#666", lineHeight: 18 },

  // Section
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },

  // Order history toggle (Buy / Sell)
  orderHistoryToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  orderHistoryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME_COLOR,
    backgroundColor: "#fff",
  },
  orderHistoryBtnActive: {
    backgroundColor: THEME_COLOR,
  },
  orderHistoryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  orderHistoryBtnTextActive: {
    color: "#fff",
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  paginationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  paginationBtnDisabled: {
    opacity: 0.5,
  },
  paginationBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  paginationBtnTextDisabled: {
    color: "#ccc",
  },
  paginationInfo: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  // Order card
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardContent: { paddingLeft: 12 },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  orderLabel: { fontSize: 12, color: "#999" },
  orderValue: { fontSize: 14, fontWeight: "600", color: "#333" },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // Empty
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: { fontSize: 15, color: "#999", marginTop: 10, fontWeight: "500" },
  emptySubText: { fontSize: 12, color: "#bbb", marginTop: 4 },

  // Marketplace listing
  listingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listingContent: {
    paddingLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listingInfo: { flex: 1 },
  listingStocks: { fontSize: 16, fontWeight: "700", color: "#333" },
  listingPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLOR,
    marginTop: 2,
  },
  listingDate: { fontSize: 11, color: "#999", marginTop: 2 },
  buyListingBtn: {
    backgroundColor: THEME_COLOR,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 70,
    justifyContent: "center",
  },
  buyListingText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Confirm modal
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  confirmDetail: { fontSize: 16, color: "#555", marginBottom: 12 },
  confirmAmountBox: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  confirmAmountLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  confirmAmount: { fontSize: 22, fontWeight: "800", color: "#fff" },
  confirmNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmBtns: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 15, fontWeight: "600", color: "#666" },
  confirmBuyBtn: {
    flex: 1,
    backgroundColor: THEME_COLOR,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmBuyText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Alert modal
  alertContainer: {
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.95,
  },
  alertButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  alertButtonText: { fontSize: 15, fontWeight: "600", color: THEME_COLOR },
});
