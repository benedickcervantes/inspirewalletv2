import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
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

const TIME_RANGES = ["24h", "7d", "30d"] as const;
const PERCENTAGES = [25, 50, 75, 100];

type TabType = "trading" | "deposit";
type TimeRange = (typeof TIME_RANGES)[number];

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

const MOCK_DATA = {
  price: "3,845,755.81",
  priceChange: "+2.4%",
  balance: 205115,
  cryptoBalances: {
    BTC: "0.00000",
    ETH: "0.00000",
    USDT: "0.00000",
  },
  forexBalances: {
    USD: "0.00",
    JPY: "0.00",
  }
};


const BalanceCard = React.memo(({ balance, label }: { balance: number; label: string }) => (
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
      ₱ {formatCurrency(balance)}
    </Text>
    <View style={styles.balanceDecorativeCircle} />
  </LinearGradient>
));

export default function PlayEarnServices() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();

  const isXSScreen = width <= IPHONE_SE_WIDTH;
  const isSmallScreen = width < SMALL_PHONE_WIDTH;
  const horizontalPadding = isXSScreen ? 12 : isSmallScreen ? 16 : 20;

  const [activeTab, setActiveTab] = useState<TabType>("trading");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("24h");
  const [isBuy, setIsBuy] = useState(true);
  const [spendingAmount, setSpendingAmount] = useState("0.00");
  const [availableBalance] = useState(MOCK_DATA.balance);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Price States
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, string>>({
    BTC: MOCK_DATA.price,
    ETH: "150,000.00",
    USDT: "56.00"
  });
  const [priceChange, setPriceChange] = useState(MOCK_DATA.priceChange);
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

          const url = `${baseUrl}/prices/all`;
          const response = await fetch(url, {
            headers: { "x-api-key": apiKey || "" },
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          console.log("[Crypto] Received from backend:", JSON.stringify(data));

          setCryptoPrices(prev => {
            const newPrices = { ...prev };
            if (data.BTC?.php) newPrices.BTC = formatCurrency(data.BTC.php);
            if (data.ETH?.php) newPrices.ETH = formatCurrency(data.ETH.php);
            if (data.USDT?.php) newPrices.USDT = formatCurrency(data.USDT.php);
            return newPrices;
          });

          if (data[selectedCrypto]?.change24h) {
            setPriceChange(data[selectedCrypto].change24h);
          } else if (data[selectedCrypto.toUpperCase()]?.change24h) {
            setPriceChange(data[selectedCrypto.toUpperCase()].change24h);
          }
        } catch (error) {
          console.error("[Crypto] Fetch Error:", error);
        } finally {
          isFetchingRef.current = false;
        }
      };

      fetchPrices();
      const interval = setInterval(fetchPrices, 60000);
      return () => clearInterval(interval);
    }, [selectedCrypto])
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
  const handlePercentagePress = useCallback((pct: number): void => {
    const amount = (availableBalance * pct) / 100;
    setSpendingAmount(amount.toFixed(2));
  }, [availableBalance]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        {/* Custom Header Bar (Exact AgentDashboard Style) */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
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

          {/* Asset Cards Row - CRYPTO & FOREX */}
          <View style={styles.assetCardsRow}>
            <View style={[styles.assetCard, isXSScreen && styles.cardCompact]}>
              <View style={styles.assetCardHeader}>
                <Text style={styles.assetCardTitle}>{t("playEarn.crypto")}</Text>
                <Ionicons name="logo-bitcoin" size={18} color={THEME_COLOR} />
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>BTC</Text>
                <Text style={styles.assetValue}>{MOCK_DATA.cryptoBalances.BTC}</Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>ETH</Text>
                <Text style={styles.assetValue}>{MOCK_DATA.cryptoBalances.ETH}</Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>USDT</Text>
                <Text style={styles.assetValue}>{MOCK_DATA.cryptoBalances.USDT}</Text>
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
                <Text style={styles.assetValue}>{MOCK_DATA.forexBalances.USD}</Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>JPY</Text>
                <Text style={styles.assetValue}>{MOCK_DATA.forexBalances.JPY}</Text>
              </View>
            </View>
          </View>

          {/* CRYPTO Section Label */}
          <Text style={[styles.sectionLabel, isXSScreen && styles.sectionTitleCompact]}>{t("playEarn.crypto")}</Text>

          {/* Crypto Selection Buttons */}
          <View style={styles.cryptoButtons}>
            {CRYPTO_ASSETS.map((asset) => (
              <TouchableOpacity
                key={asset.id}
                style={[
                  styles.cryptoButton,
                  selectedCrypto === asset.id && styles.cryptoButtonSelected,
                ]}
                onPress={() => setSelectedCrypto(asset.id)}
              >
                <View
                  style={[
                    styles.cryptoIconCircle,
                    asset.id === "BTC" && styles.cryptoIconBtc,
                    asset.id === "ETH" && styles.cryptoIconEth,
                    asset.id === "USDT" && styles.cryptoIconUsdt,
                  ]}
                >
                  <Ionicons
                    name={asset.icon}
                    size={24}
                    color={
                      asset.id === "BTC" ? "#F7931A" :
                        asset.id === "ETH" ? "#627EEA" :
                          asset.id === "USDT" ? "#26A17B" :
                            "#FFF"
                    }
                  />
                </View>
                <Text style={styles.cryptoButtonLabel}>{asset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Current Price */}
          <Text style={styles.currentPriceLabel}>{t("playEarn.currentPrice")}</Text>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.currentPrice}>P {cryptoPrices[selectedCrypto as keyof typeof cryptoPrices] || "0.00"}</Text>
              <Text style={styles.priceChange}>{priceChange} (24h)</Text>
            </View>
            <View style={styles.timeRangeButtons}>
              {TIME_RANGES.map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.timeRangeBtn,
                    selectedTimeRange === range && styles.timeRangeBtnActive,
                  ]}
                  onPress={() => setSelectedTimeRange(range)}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      selectedTimeRange === range && styles.timeRangeTextActive,
                    ]}
                  >
                    {range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Buy / Sell Tab Segment */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, isBuy && styles.segmentActive]}
              onPress={() => setIsBuy(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, isBuy && styles.segmentTextActive]}>
                {t("playEarn.buy")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, !isBuy && styles.segmentActive]}
              onPress={() => setIsBuy(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, !isBuy && styles.segmentTextActive]}>
                {t("playEarn.sell")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spending Amount */}
          <Text style={styles.inputLabel}>{t("playEarn.spendingAmount")}</Text>
          <View style={styles.amountInputRow}>
            <TextInput
              style={styles.amountInput}
              value={spendingAmount}
              onChangeText={setSpendingAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <Text style={styles.currencyLabel}>PHP</Text>
          </View>

          {/* Percentage Buttons */}
          <View style={styles.percentRow}>
            {PERCENTAGES.map((pct) => (
              <TouchableOpacity
                key={pct}
                style={styles.percentButton}
                onPress={() => handlePercentagePress(pct)}
              >
                <Text style={styles.percentText}>{pct}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm Purchase Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            activeOpacity={0.8}
            onPress={() => { }}
          >
            <Text style={styles.confirmButtonText}>
              {isBuy ? t("playEarn.confirmPurchase") : t("playEarn.confirmSell")}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
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
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: SOFT_GRAY,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    color: "#71717A",
    fontWeight: "700",
  },
  segmentTextActive: {
    color: PREMIUM_DARK,
  },
  inputLabel: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: PREMIUM_DARK,
    padding: 0,
  },
  currencyLabel: {
    fontSize: 16,
    color: "#71717A",
    fontWeight: "700",
    marginLeft: 12,
  },
  percentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
  },
  percentButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: SOFT_GRAY,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  percentText: {
    fontSize: 14,
    fontWeight: "700",
    color: PREMIUM_DARK,
  },
  confirmButton: {
    backgroundColor: GREEN_SUCCESS,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN_SUCCESS,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
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
});
