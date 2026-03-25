import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
    BackHandler,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { isServiceUnderMaintenance } from "../../../lib/maintenance";
import { formatAmountWithCommas } from "../../../utils/numberFormat";
import CryptoPriceChart, { CHART_COLORS } from "./CryptoPriceChart";
import { COIN_IDS, fetchCoinGeckoMarketChart } from "./coingecko";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT: readonly [string, string] = ["#E15816", "#FF7E47"];
const PREMIUM_DARK = "#1A1A1A";
const SOFT_GRAY = "#F9FAFB";
const GREEN_SUCCESS = "#22C55E";

const IPHONE_SE_WIDTH = 320;
const SMALL_PHONE_WIDTH = 375;

const CRYPTO_ASSETS: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "BTC", label: "BTC", icon: "logo-bitcoin" },
  { id: "ETH", label: "ETH", icon: "diamond" },
  { id: "USDT", label: "USDT", icon: "cash-outline" },
];

const TIME_RANGES = ["1h", "24h", "7d"] as const;
const PERCENTAGES = [25, 50, 75, 100];

type TabType = "trading" | "deposit";
type TimeRange = (typeof TIME_RANGES)[number];

const CryptoCard = React.memo(({
  id,
  label,
  fullName,
  price,
  change,
  icon,
  selectedTimeRange,
  selected = false
}: {
  id: string;
  label: string;
  fullName: string;
  price: string;
  change: string;
  icon: any;
  selectedTimeRange: string;
  selected?: boolean;
}) => {
  const hasChange = change !== "—";
  const isPositive = hasChange && change.startsWith("+");
  const badgeColor = hasChange ? (isPositive ? "#22C55E" : "#EF4444") : "#6B7280";
  const badgeBg = hasChange
    ? isPositive
      ? "rgba(34, 197, 94, 0.1)"
      : "rgba(239, 68, 68, 0.1)"
    : "rgba(107, 114, 128, 0.1)";

  return (
    <View style={[styles.newAssetCard, selected && styles.newAssetCardSelected]}>
      <View style={styles.newAssetHeader}>
        <View style={styles.newAssetMainInfo}>
          <View style={styles.newAssetIconContainer}>
            <Ionicons
              name={icon}
              size={18}
              color={
                id === "BTC" ? "#F7931A" :
                  id === "ETH" ? "#627EEA" :
                    id === "USD" ? "#22C55E" :
                      id === "JPY" ? "#EF4444" :
                        "#26A17B"
              }
            />
          </View>
          <Text style={styles.newAssetSymbol}>{label}</Text>
        </View>
      </View>

      <Text style={styles.newAssetName}>{fullName}</Text>
      <Text style={styles.newAssetPrice}>{price === "—" ? "—" : `₱ ${price}`}</Text>

      <View style={[styles.changeBadge, { backgroundColor: badgeBg }]}>
        {hasChange && (
          <Ionicons
            name={isPositive ? "caret-up" : "caret-down"}
            size={12}
            color={badgeColor}
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={[styles.changeText, { color: badgeColor }]}>
          {hasChange ? change.replace(/[+-]/, "") : change}
        </Text>
      </View>
    </View>
  );
});

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

const NO_DATA = "—";

const BalanceCard = React.memo(
  ({ balance, label }: { balance: number | null; label: string }) => (
  <LinearGradient
    colors={ORANGE_GRADIENT}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.balanceCard}
  >
    <View style={styles.balanceHeader}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <MaterialCommunityIcons name="wallet-outline" size={24} color="#FFF" opacity={0.7} />
    </View>
    <Text style={styles.balanceValue}>
      {balance == null ? NO_DATA : `₱ ${formatCurrency(balance)}`}
    </Text>
    <View style={styles.balanceDecorativeCircle} />
  </LinearGradient>
  )
);

const FOREX_ASSETS = [
  { id: "USD", label: "USD", fullName: "US Dollar", icon: "logo-usd" },
  { id: "JPY", label: "JPY", fullName: "JPY", icon: "logo-yen" },
];

export default function PlayEarnServices() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();

  const isXSScreen = width <= IPHONE_SE_WIDTH;
  const isSmallScreen = width < SMALL_PHONE_WIDTH;
  const horizontalPadding = isXSScreen ? 12 : isSmallScreen ? 16 : 20;

  const [activeTab, setActiveTab] = useState<TabType>("trading");
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; fullName: string; type: 'crypto' | 'forex' } | null>({ id: "BTC", fullName: "Bitcoin", type: 'crypto' });
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("24h");
  const [selectedForexTimeRange, setSelectedForexTimeRange] = useState<TimeRange>("24h");
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [forexBalances, setForexBalances] = useState<Record<string, number | null>>({
    USD: null,
    JPY: null,
  });

  // Trade Modal State
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeAmount, setTradeAmount] = useState('');
  const [cryptoBalances, setCryptoBalances] = useState<{
    BTC: number | null;
    ETH: number | null;
    USDT: number | null;
  }>({
    BTC: null,
    ETH: null,
    USDT: null,
  });
  const [cryptoPricesRaw, setCryptoPricesRaw] = useState<Record<string, number | null>>({
    BTC: null,
    ETH: null,
    USDT: null,
  });
  const [forexPrices, setForexPrices] = useState<Record<string, string>>({});
  const [forexChanges, setForexChanges] = useState<Record<string, any>>({});
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Graph: filter (null = show all), modal, chart data from CoinGecko
  const [graphFilter, setGraphFilter] = useState<"BTC" | "ETH" | "USDT" | null>("BTC");
  const [graphModalVisible, setGraphModalVisible] = useState(false);
  const [chartData, setChartData] = useState<Record<string, [number, number][]>>({});
  const [chartLoading, setChartLoading] = useState(false);

  // Price States
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, string>>({});
  const [priceChanges, setPriceChanges] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const isFetchingRef = React.useRef(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Check maintenance status on focus
  useFocusEffect(
    useCallback(() => {
      setCheckingMaintenance(true);
      const checkMaintenance = async () => {
        try {
          const isMaintenance = await isServiceUnderMaintenance("trading");
          setIsUnderMaintenance(isMaintenance);
          if (isMaintenance) {
            setShowMaintenanceModal(true);
          }
        } catch (error) {
          console.error("Error checking maintenance:", error);
        } finally {
          setCheckingMaintenance(false);
        }
      };
      checkMaintenance();
    }, [])
  );

  // Fetch Balances on Focus
  useFocusEffect(
    useCallback(() => {
      const fetchUserBalances = () => {
        setIsLoadingBalance(true);
        try {
          // Placeholder until real balances are wired from backend.
          setAvailableBalance(null);
          setCryptoBalances({
            BTC: null,
            ETH: null,
            USDT: null,
          });
          setForexBalances({
            USD: null,
            JPY: null,
          });
        } catch (error) {
          console.error("[Balance] Error updating mock balance:", error);
        } finally {
          setIsLoadingBalance(false);
        }
      };

      fetchUserBalances();
    }, [])
  );

  // Fetch Prices on Focus
  useFocusEffect(
    useCallback(() => {
      const fetchPrices = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
          const baseUrl = (process.env.EXPO_PUBLIC_WALLET_BACKEND_URL || "").replace(/\/$/, "");
          const apiKey = process.env.EXPO_PUBLIC_API_KEY;
          if (!baseUrl) return;

          // Parallel fetch for Crypto and Forex
          const [resCrypto, resForex] = await Promise.all([
            fetch(`${baseUrl}/prices/all`, { headers: { "x-api-key": apiKey || "" } }),
            fetch(`${baseUrl}/exchange-rate/all`, { headers: { "x-api-key": apiKey || "" } })
          ]);

          if (resCrypto.ok) {
            const data = await resCrypto.json();
            setCryptoPricesRaw(prev => ({
              ...prev,
              ...(data.BTC?.php != null ? { BTC: Number(data.BTC.php) } : {}),
              ...(data.ETH?.php != null ? { ETH: Number(data.ETH.php) } : {}),
              ...(data.USDT?.php != null ? { USDT: Number(data.USDT.php) } : {}),
            }));

            setCryptoPrices(prev => ({
              ...prev,
              ...(data.BTC?.php != null ? { BTC: formatCurrency(data.BTC.php) } : {}),
              ...(data.ETH?.php != null ? { ETH: formatCurrency(data.ETH.php) } : {}),
              ...(data.USDT?.php != null ? { USDT: formatCurrency(data.USDT.php) } : {}),
            }));

            setPriceChanges(prev => {
              const newChanges = { ...prev };
              Object.entries(data).forEach(([key, val]: [string, any]) => {
                const crypto = key.toUpperCase();
                newChanges[crypto] = {
                  "1h": String(val?.change1h ?? NO_DATA),
                  "24h": String(val?.change24h ?? NO_DATA),
                  "7d": String(val?.change7d ?? NO_DATA),
                };
              });
              return newChanges;
            });
          }

          if (resForex.ok) {
            const data = await resForex.json();
            const prices: Record<string, string> = {};
            const changes: Record<string, any> = {};

            Object.entries(data).forEach(([key, val]: [string, any]) => {
              const phpValue = (1 / val.rate);
              prices[key] = phpValue.toFixed(2);
              changes[key] = {
                "1h": String(val?.change1h ?? NO_DATA),
                "24h": String(val?.change24h ?? NO_DATA),
                "7d": String(val?.change7d ?? NO_DATA),
              };
            });
            setForexPrices(prices);
            setForexChanges(changes);
          }
        } catch (error) {
          console.error("[Data] Fetch Error:", error);
        } finally {
          isFetchingRef.current = false;
        }
      };

      fetchPrices();
      const interval = setInterval(fetchPrices, 5000);
      return () => clearInterval(interval);
    }, [selectedAsset, selectedTimeRange, selectedForexTimeRange])
  );

  // Fetch CoinGecko chart data for graph
  useFocusEffect(
    useCallback(() => {
      const days = selectedTimeRange === "7d" ? 7 : 1;
      const ids = graphFilter ? [graphFilter] : (["BTC", "ETH", "USDT"] as const);
      const fetchChart = async () => {
        setChartLoading(true);
        try {
          const results = await Promise.all(
            ids.map(async (id) => {
              const coinId = COIN_IDS[id];
              const res = coinId ? await fetchCoinGeckoMarketChart(coinId, days, "php") : null;
              const prices = res?.prices ?? [];
              return { id, prices };
            })
          );
          const next: Record<string, [number, number][]> = {};
          results.forEach(({ id, prices }) => {
            next[id] = prices;
          });
          setChartData(next);
        } catch (e) {
          console.error("[Chart] CoinGecko fetch error:", e);
        } finally {
          setChartLoading(false);
        }
      };
      fetchChart();
    }, [graphFilter, selectedTimeRange])
  );

  useEffect(() => {
    const backAction = () => {
      navigation.navigate("Main");
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [navigation]);

  const handleBack = useCallback(() => navigation.navigate("Main"), [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        {/* Custom Header Bar (Exact AgentDashboard Style) */}
        <LinearGradient
          colors={ORANGE_GRADIENT}
          style={[styles.header, isXSScreen && styles.headerCompact]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={isXSScreen ? 22 : 24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isXSScreen && styles.headerTitleCompact]} numberOfLines={1}>
            {t("playEarn.title")}
          </Text>
          <View style={{ width: 44 }} />
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* The previous headerCard is removed to match AgentDashboard's flat list style if desired, 
                but keeping the rest of the functional content below */}
          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "trading" && styles.tabActive]}
              onPress={() => setActiveTab("trading")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "trading" && styles.tabTextActive,
                ]}
              >
                {t("playEarn.trading")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                styles.tabOutline,
                activeTab === "deposit" && styles.tabActive,
              ]}
              onPress={() => navigation.navigate("DepositCrypto")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabTextOutline,
                  activeTab === "deposit" && styles.tabTextActive,
                ]}
              >
                {t("playEarn.depositViaCrypto")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.balanceCard, isXSScreen && styles.cardCompact]}>
            <BalanceCard balance={availableBalance} label={t("playEarn.availableBalance")} />
          </View>

          {/* Asset Cards Row - CRYPTO & FOREX (below available balance) */}
          <View style={styles.assetCardsRow}>
            <View style={[styles.assetCard, isXSScreen && styles.cardCompact]}>
              <View style={styles.assetCardHeader}>
                <Text style={styles.assetCardTitle}>{t("playEarn.crypto")}</Text>
                <Ionicons name="logo-bitcoin" size={18} color={THEME_COLOR} />
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>BTC</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.assetValue}>
                    {cryptoBalances.BTC == null ? NO_DATA : cryptoBalances.BTC.toFixed(5)}
                  </Text>
                  <Text style={styles.assetSubValue}>
                    {cryptoBalances.BTC != null && cryptoPricesRaw.BTC != null
                      ? `₱ ${formatCurrency(cryptoBalances.BTC * cryptoPricesRaw.BTC)}`
                      : NO_DATA}
                  </Text>
                </View>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>ETH</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.assetValue}>
                    {cryptoBalances.ETH == null ? NO_DATA : cryptoBalances.ETH.toFixed(5)}
                  </Text>
                  <Text style={styles.assetSubValue}>
                    {cryptoBalances.ETH != null && cryptoPricesRaw.ETH != null
                      ? `₱ ${formatCurrency(cryptoBalances.ETH * cryptoPricesRaw.ETH)}`
                      : NO_DATA}
                  </Text>
                </View>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>USDT</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.assetValue}>
                    {cryptoBalances.USDT == null ? NO_DATA : cryptoBalances.USDT.toFixed(5)}
                  </Text>
                  <Text style={styles.assetSubValue}>
                    {cryptoBalances.USDT != null && cryptoPricesRaw.USDT != null
                      ? `₱ ${formatCurrency(cryptoBalances.USDT * cryptoPricesRaw.USDT)}`
                      : NO_DATA}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.assetCard, isXSScreen && styles.cardCompact]}>
              <View style={styles.assetCardHeader}>
                <Text style={styles.assetCardTitle}>{t("playEarn.forex")}</Text>
                <MaterialCommunityIcons
                  name="cube-outline"
                  size={18}
                  color={THEME_COLOR}
                />
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>USD</Text>
                <Text style={styles.assetValue}>
                  {forexBalances.USD == null ? NO_DATA : forexBalances.USD.toFixed(2)}
                </Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>JPY</Text>
                <Text style={styles.assetValue}>
                  {forexBalances.JPY == null ? NO_DATA : forexBalances.JPY.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Price Graph - below crypto & forex cards */}
          <View style={styles.graphSection}>
            <View style={styles.graphHeaderRow}>
              <View style={styles.timeRangeFilters}>
                {TIME_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.rangeFilterBtn,
                      selectedTimeRange === range && styles.rangeFilterBtnActive,
                    ]}
                    onPress={() => setSelectedTimeRange(range)}
                  >
                    <Text
                      style={[
                        styles.rangeFilterText,
                        selectedTimeRange === range && styles.rangeFilterTextActive,
                      ]}
                    >
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {graphFilter !== null && (
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => {
                    setGraphFilter(null);
                    setSelectedAsset(null);
                  }}
                >
                  <Text style={styles.clearFilterText}>Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>
            <CryptoPriceChart
              series={(["BTC", "ETH", "USDT"] as const).map((id) => ({
                id,
                label: id,
                color: CHART_COLORS[id] ?? "#666",
                data: (chartData[id] ?? []).map(([t, v]) => ({ t, v })),
              }))}
              visibleIds={graphFilter ? [graphFilter] : ["BTC", "ETH", "USDT"]}
              selectedPrice={
                chartLoading
                  ? null
                  : (() => {
                      const vid = graphFilter ?? "BTC";
                      const raw = cryptoPricesRaw[vid];
                      return raw != null && raw > 0 ? `₱ ${formatCurrency(raw)}` : null;
                    })()
              }
              isLoading={chartLoading}
              compact={true}
              onPress={() => setGraphModalVisible(true)}
            />
          </View>

          {/* ALL CRYPTO Section - time range is in graph above */}
          <View style={styles.allCryptoHeader}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.allCryptoTitle}>ALL CRYPTO</Text>
              <View style={styles.headerActionRow}>
                <TouchableOpacity
                  style={[styles.headerActionButton, { backgroundColor: GREEN_SUCCESS }]}
                  onPress={() => {
                    setTradeMode('BUY');
                    setTradeModalVisible(true);
                  }}
                >
                  <Text style={styles.headerActionButtonText}>BUY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerActionButton, { backgroundColor: "#EF4444" }]}
                  onPress={() => {
                    setTradeMode('SELL');
                    setTradeModalVisible(true);
                  }}
                >
                  <Text style={styles.headerActionButtonText}>SELL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Crypto Grid */}
          <View style={styles.cryptoGrid}>
            {CRYPTO_ASSETS.map((asset) => (
              <TouchableOpacity
                key={asset.id}
                onPress={() => {
                  setSelectedAsset({ id: asset.id, fullName: asset.id === "BTC" ? "Bitcoin" : asset.id === "ETH" ? "Ethereum" : "Tether", type: "crypto" });
                  setGraphFilter(asset.id as "BTC" | "ETH" | "USDT");
                }}
                activeOpacity={0.7}
                style={{ width: "48%" }}
              >
                <CryptoCard
                  id={asset.id}
                  label={asset.label}
                  fullName={asset.id === "BTC" ? "Bitcoin" : asset.id === "ETH" ? "Ethereum" : "Tether"}
                  price={cryptoPrices[asset.id] ?? NO_DATA}
                  change={priceChanges[asset.id]?.[selectedTimeRange] ?? NO_DATA}
                  icon={asset.icon}
                  selectedTimeRange={selectedTimeRange}
                  selected={selectedAsset?.id === asset.id}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* ALL FOREX Section */}
          <View style={[styles.allCryptoHeader, { marginTop: 24 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.allCryptoTitle}>ALL FOREX</Text>
              <View style={styles.headerActionRow}>
                <TouchableOpacity
                  style={[styles.headerActionButton, { backgroundColor: GREEN_SUCCESS }]}
                  onPress={() => {
                    setTradeMode('BUY');
                    setTradeModalVisible(true);
                  }}
                >
                  <Text style={styles.headerActionButtonText}>BUY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerActionButton, { backgroundColor: "#EF4444" }]}
                  onPress={() => {
                    setTradeMode('SELL');
                    setTradeModalVisible(true);
                  }}
                >
                  <Text style={styles.headerActionButtonText}>SELL</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.timeRangeFilters}>
              {TIME_RANGES.map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.rangeFilterBtn,
                    selectedForexTimeRange === range && styles.rangeFilterBtnActive,
                  ]}
                  onPress={() => setSelectedForexTimeRange(range)}
                >
                  <Text
                    style={[
                      styles.rangeFilterText,
                      selectedForexTimeRange === range && styles.rangeFilterTextActive,
                    ]}
                  >
                    {range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Forex Grid */}
          <View style={styles.cryptoGrid}>
            {FOREX_ASSETS.map((asset) => (
              <TouchableOpacity
                key={asset.id}
                onPress={() => setSelectedAsset({ id: asset.id, fullName: asset.fullName, type: 'forex' })}
                activeOpacity={0.7}
                style={{ width: "48%" }}
              >
                <CryptoCard
                  id={asset.id}
                  label={asset.label}
                  fullName={asset.fullName}
                  price={forexPrices[asset.id] ?? NO_DATA}
                  change={forexChanges[asset.id]?.[selectedForexTimeRange] ?? NO_DATA}
                  icon={asset.icon}
                  selectedTimeRange={selectedForexTimeRange}
                  selected={selectedAsset?.id === asset.id}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Price Chart / Stats for Selected Asset */}
          <View style={styles.selectionFocus}>
            <Text style={styles.selectedCryptoTitle}>
              Selected: <Text style={{ color: THEME_COLOR }}>{selectedAsset?.fullName || selectedAsset?.id}</Text>
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Graph fullscreen modal - enhanced */}
      <Modal
        visible={graphModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setGraphModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.graphModalOverlay}
          activeOpacity={1}
          onPress={() => setGraphModalVisible(false)}
        >
          <SafeAreaView style={styles.graphModalSafe} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.graphModalCard}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.graphModalHeader}>
                <Text style={styles.graphModalTitle}>Price chart</Text>
                <TouchableOpacity
                  onPress={() => setGraphModalVisible(false)}
                  style={styles.graphModalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={26} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.graphModalScroll}
                contentContainerStyle={styles.graphModalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.graphModalTimeRow}>
                  {TIME_RANGES.map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.graphModalRangeBtn,
                        selectedTimeRange === range && styles.graphModalRangeBtnActive,
                      ]}
                      onPress={() => setSelectedTimeRange(range)}
                    >
                      <Text
                        style={[
                          styles.graphModalRangeText,
                          selectedTimeRange === range && styles.graphModalRangeTextActive,
                        ]}
                      >
                        {range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.graphModalValueWrap}>
                  <Text style={styles.graphModalValueLabel}>PRICE GRAPH</Text>
                  <Text style={styles.graphModalValue} numberOfLines={1}>
                    {chartLoading
                      ? "Loading..."
                      : (() => {
                          const vid = graphFilter ?? "BTC";
                          const raw = cryptoPricesRaw[vid];
                          return raw != null && raw > 0 ? `₱ ${formatCurrency(raw)}` : "—";
                        })()}
                  </Text>
                </View>
                <View style={styles.graphModalChartWrap}>
                  <CryptoPriceChart
                    series={(["BTC", "ETH", "USDT"] as const).map((id) => ({
                      id,
                      label: id,
                      color: CHART_COLORS[id] ?? "#666",
                      data: (chartData[id] ?? []).map(([t, v]) => ({ t, v })),
                    }))}
                    visibleIds={graphFilter ? [graphFilter] : ["BTC", "ETH", "USDT"]}
                    selectedPrice={null}
                    isLoading={chartLoading}
                    compact={false}
                    showHeader={false}
                  />
                </View>
                <Text style={styles.graphModalHint}>Tap outside to close</Text>
              </ScrollView>
            </TouchableOpacity>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>

      {/* Trade Modal */}
      <Modal
        visible={tradeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tradeMode} {selectedAsset?.fullName || selectedAsset?.id}
              </Text>
              <TouchableOpacity onPress={() => setTradeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Enter Amount (PHP)</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={styles.modalInput}
                  value={tradeAmount}
                  onChangeText={(text) => setTradeAmount(formatAmountWithCommas(text))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  autoFocus
                />
                <Text style={styles.modalCurrencyLabel}>PHP</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  { backgroundColor: tradeMode === 'BUY' ? GREEN_SUCCESS : "#EF4444" }
                ]}
                onPress={() => {
                  setTradeModalVisible(false);
                  setTradeAmount('');
                }}
              >
                <Text style={styles.modalConfirmButtonText}>
                  CONFIRM {tradeMode}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
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
  backButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerTitleCompact: {
    fontSize: 16,
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0E0E0",
  },
  tabActive: {
    backgroundColor: THEME_COLOR,
  },
  tabOutline: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: THEME_COLOR,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#FFF",
  },
  tabTextOutline: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceDecorativeCircle: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  assetCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  assetCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  assetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  assetCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  assetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  assetLabel: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
  },
  assetValue: {
    fontSize: 13,
    color: PREMIUM_DARK,
    fontWeight: "700",
  },
  assetSubValue: {
    fontSize: 10,
    color: "#71717A",
    fontWeight: "600",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionTitleCompact: {
    fontSize: 12,
  },
  cryptoButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  cryptoButton: {
    alignItems: "center",
    opacity: 0.6,
  },
  cryptoButtonSelected: {
    opacity: 1,
  },
  cryptoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: SOFT_GRAY,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cryptoIconBtc: {
    backgroundColor: "#FFF",
    borderColor: "#F7931A",
    borderWidth: 2,
  },
  cryptoIconEth: {
    backgroundColor: "#FFF",
    borderColor: "#627EEA",
    borderWidth: 2,
  },
  cryptoIconUsdt: {
    backgroundColor: "#FFF",
    borderColor: "#26A17B",
    borderWidth: 2,
  },
  cryptoButtonLabel: {
    fontSize: 12,
    color: PREMIUM_DARK,
    fontWeight: "700",
  },
  currentPriceLabel: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "600",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  priceChange: {
    fontSize: 14,
    color: GREEN_SUCCESS,
    fontWeight: "700",
    marginTop: 2,
  },
  timeRangeButtons: {
    flexDirection: "row",
    backgroundColor: SOFT_GRAY,
    padding: 4,
    borderRadius: 20,
    gap: 4,
  },
  timeRangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeRangeBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "700",
  },
  timeRangeTextActive: {
    color: "#E25A17",
  },
  textCompact: {
    fontSize: 12,
  },
  cardCompact: {
    padding: 14,
    marginBottom: 12,
  },
  tradeActionSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  mainTradeButton: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  mainTradeButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  headerActionButtonText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PREMIUM_DARK,
  },
  modalBody: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: PREMIUM_DARK,
  },
  modalCurrencyLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9CA3AF",
    marginLeft: 8,
  },
  modalConfirmButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  bottomSpacing: {
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  // New Styles for Redesign
  allCryptoHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  allCryptoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PREMIUM_DARK,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timeRangeFilters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  rangeFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rangeFilterBtnActive: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  rangeFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  rangeFilterTextActive: {
    color: "#FFFFFF",
  },
  cryptoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 8,
  },
  newAssetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  newAssetCardSelected: {
    borderColor: THEME_COLOR,
    backgroundColor: "#FFF9F5",
  },
  newAssetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  newAssetMainInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  newAssetIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  newAssetSymbol: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  newAssetName: {
    fontSize: 16,
    fontWeight: "700",
    color: PREMIUM_DARK,
    marginBottom: 4,
  },
  newAssetPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: PREMIUM_DARK,
    marginBottom: 12,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  selectionFocus: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  selectedCryptoTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  graphSection: {
    marginBottom: 8,
  },
  graphHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  graphModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  graphModalSafe: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  graphModalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  graphModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  graphModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: PREMIUM_DARK,
  },
  graphModalCloseBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  graphModalTimeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  graphModalRangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  graphModalRangeBtnActive: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  graphModalRangeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  graphModalRangeTextActive: {
    color: "#FFF",
  },
  graphModalValueWrap: {
    marginBottom: 12,
  },
  graphModalValueLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  graphModalValue: {
    fontSize: 24,
    fontWeight: "800",
    color: PREMIUM_DARK,
    letterSpacing: -0.5,
  },
  graphModalChartWrap: {
    minHeight: 280,
    marginBottom: 12,
  },
  graphModalScroll: {
    flexGrow: 0,
    maxHeight: 520,
  },
  graphModalScrollContent: {
    paddingBottom: 8,
  },
  graphModalHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
