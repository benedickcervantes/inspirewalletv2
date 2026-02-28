import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { isServiceUnderMaintenance } from "../../../lib/maintenance";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT: readonly [string, string] = ["#E25A17", "#F28934"];
const GREEN_BUTTON = "#22C55E";

const CRYPTO_ASSETS: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "BTC", label: "BTC", icon: "logo-bitcoin" },
  { id: "ETH", label: "ETH", icon: "diamond-outline" },
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

export default function PlayEarnServices() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("trading");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("24h");
  const [isBuy, setIsBuy] = useState(true);
  const [spendingAmount, setSpendingAmount] = useState("0.00");
  const [availableBalance] = useState(205115);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

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

  const handlePercentagePress = (pct: number): void => {
    const amount = (availableBalance * pct) / 100;
    setSpendingAmount(amount.toFixed(2));
  };

  if (checkingMaintenance) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isUnderMaintenance) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
            <Text style={styles.loadingText}>Service under maintenance</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header - Orange Gradient (matches Deposit screens) */}
        <LinearGradient
          colors={ORANGE_GRADIENT}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Main")}
          >
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color={THEME_COLOR} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("playEarn.title")}</Text>
          <TouchableOpacity style={styles.helpButton}>
            <View style={styles.helpIconCircle}>
              <Text style={styles.helpIconText}>?</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "trading" && styles.tabActive]}
              onPress={() => setActiveTab("trading")}
              activeOpacity={0.9}
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
              activeOpacity={0.9}
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

          {/* Available Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t("playEarn.availableBalance")}</Text>
            <Text style={styles.balanceValue}>
              P {formatCurrency(availableBalance)}
            </Text>
          </View>

          {/* Asset Cards Row - CRYPTO & FOREX */}
          <View style={styles.assetCardsRow}>
            <View style={styles.assetCard}>
              <View style={styles.assetCardHeader}>
                <Text style={styles.assetCardTitle}>{t("playEarn.crypto")}</Text>
                <Ionicons name="logo-bitcoin" size={18} color={THEME_COLOR} />
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>BTC</Text>
                <Text style={styles.assetValue}>0.00000</Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>ETH</Text>
                <Text style={styles.assetValue}>0.00000</Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>USDT</Text>
                <Text style={styles.assetValue}>0.00000</Text>
              </View>
            </View>
            <View style={styles.assetCard}>
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
                <Text style={styles.assetValue}>0.00</Text>
              </View>
              <View style={styles.assetItem}>
                <Text style={styles.assetLabel}>JPY</Text>
                <Text style={styles.assetValue}>0.00</Text>
              </View>
            </View>
          </View>

          {/* CRYPTO Section Label */}
          <Text style={styles.sectionLabel}>{t("playEarn.crypto")}</Text>

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
                      asset.id === "USDT"
                        ? THEME_COLOR
                        : "#FFF"
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
              <Text style={styles.currentPrice}>P 3,845,755.81</Text>
              <Text style={styles.priceChange}>+2.4% (24h)</Text>
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

          {/* Buy / Sell Toggle */}
          <View style={styles.buySellToggle}>
            <TouchableOpacity
              style={[styles.toggleOption, isBuy && styles.toggleOptionActive]}
              onPress={() => setIsBuy(true)}
            >
              <Text
                style={[styles.toggleText, isBuy && styles.toggleTextActive]}
              >
                {t("playEarn.buy")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, !isBuy && styles.toggleOptionActive]}
              onPress={() => setIsBuy(false)}
            >
              <Text
                style={[styles.toggleText, !isBuy && styles.toggleTextActive]}
              >
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
            activeOpacity={0.9}
            onPress={() => {}}
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
    paddingTop: Platform.OS === "android" ? 24 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
  },
  helpButton: {
    padding: 4,
  },
  helpIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  helpIconText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
    backgroundColor: THEME_COLOR,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },
  assetCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  assetCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  assetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  assetCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  assetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  assetLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  assetValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 12,
    color: THEME_COLOR,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.9,
  },
  cryptoButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  cryptoButton: {
    alignItems: "center",
  },
  cryptoButtonSelected: {
    opacity: 1,
  },
  cryptoIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  cryptoIconBtc: {
    backgroundColor: THEME_COLOR,
  },
  cryptoIconEth: {
    backgroundColor: "#333",
  },
  cryptoIconUsdt: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cryptoButtonLabel: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  currentPriceLabel: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  priceChange: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600",
    marginTop: 4,
  },
  timeRangeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  timeRangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeRangeBtnActive: {
    backgroundColor: THEME_COLOR,
  },
  timeRangeText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  timeRangeTextActive: {
    color: "#FFF",
  },
  buySellToggle: {
    flexDirection: "row",
    backgroundColor: "#E8E8E8",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#000",
  },
  inputLabel: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    padding: 0,
  },
  currencyLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginLeft: 8,
  },
  percentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  percentButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#E8E8E8",
    borderRadius: 10,
    alignItems: "center",
  },
  percentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  confirmButton: {
    backgroundColor: GREEN_BUTTON,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  bottomSpacing: {
    height: 32,
  },
});
