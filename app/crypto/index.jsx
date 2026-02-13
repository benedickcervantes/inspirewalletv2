import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function TradingPage() {
  const router = useRouter();
  const [availableBalance, setAvailableBalance] = useState(0);
  const [selectedTab, setSelectedTab] = useState("Crypto");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [loading, setLoading] = useState(true);

  const cryptoData = [
    { symbol: "BTC", name: "Bitcoin", balance: "0.00000000", image: require("../../assets/images/BTC.png"), color: "#F7931A" },
    { symbol: "ETH", name: "Ethereum", balance: "0.00000000", image: require("../../assets/images/ETH.png"), color: "#627EEA" },
    { symbol: "USDT", name: "Tether", balance: "0.00000000", image: require("../../assets/images/USDT.png"), color: "#26A17B" },
  ];

  const forexData = [
    { symbol: "USD", name: "US Dollar", balance: "0.00", icon: "logo-usd", color: "#85BB65" },
    { symbol: "JPY", name: "Japanese Yen", balance: "0.00", icon: "cash-outline", color: "#BC002D" },
  ];

  const timeframes = ["24h", "7d", "30d"];
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(firestore, "users", user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAvailableBalance(data.balance || 0);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderChart = () => {
    // Simple bar chart representation
    const bars = [
      { height: 40, color: "#4CAF50" },
      { height: 60, color: "#4CAF50" },
      { height: 50, color: "#4CAF50" },
      { height: 45, color: "#4CAF50" },
      { height: 70, color: "#4CAF50" },
      { height: 55, color: "#4CAF50" },
      { height: 80, color: "#4CAF50" },
      { height: 65, color: "#4CAF50" },
      { height: 90, color: "#4CAF50" },
      { height: 100, color: "#4CAF50" },
      { height: 85, color: "#F44336" },
      { height: 95, color: "#F44336" },
      { height: 110, color: "#F44336" },
      { height: 120, color: "#F44336" },
    ];

    return (
      <View style={styles.chartContainer}>
        {bars.map((bar, index) => (
          <View key={index} style={styles.barWrapper}>
            <View style={[styles.bar, { height: bar.height, backgroundColor: bar.color }]} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TRADING</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Available Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceValue}>
            ₱ {availableBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Crypto and Forex Lists */}
        <View style={styles.assetsSection}>
          <View style={styles.assetsRow}>
            <View style={styles.assetColumn}>
              <Text style={styles.assetColumnTitle}>CRYPTO</Text>
              {cryptoData.map((crypto) => (
                <View key={crypto.symbol} style={styles.assetItem}>
                  <Text style={styles.assetSymbol}>{crypto.symbol}</Text>
                  <Text style={styles.assetBalance}>{crypto.balance}</Text>
                </View>
              ))}
            </View>

            <View style={styles.assetColumn}>
              <Text style={styles.assetColumnTitle}>FOREX</Text>
              {forexData.map((forex) => (
                <View key={forex.symbol} style={styles.assetItem}>
                  <Text style={styles.assetSymbol}>{forex.symbol}</Text>
                  <Text style={styles.assetBalance}>{forex.balance}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "Crypto" && styles.tabActive]}
            onPress={() => setSelectedTab("Crypto")}
          >
            <Text style={[styles.tabText, selectedTab === "Crypto" && styles.tabTextActive]}>
              Crypto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "Forex" && styles.tabActive]}
            onPress={() => setSelectedTab("Forex")}
          >
            <Text style={[styles.tabText, selectedTab === "Forex" && styles.tabTextActive]}>
              Forex
            </Text>
          </TouchableOpacity>
        </View>

        {/* Crypto Selection */}
        <View style={styles.cryptoSelector}>
          {cryptoData.map((crypto) => (
            <TouchableOpacity
              key={crypto.symbol}
              style={[
                styles.cryptoButton,
                selectedCrypto === crypto.symbol && styles.cryptoButtonActive
              ]}
              onPress={() => setSelectedCrypto(crypto.symbol)}
            >
              <Image source={crypto.image} style={styles.cryptoIcon} />
              <Text style={[
                styles.cryptoButtonText,
                selectedCrypto === crypto.symbol && styles.cryptoButtonTextActive
              ]}>
                {crypto.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Market Rate */}
        <View style={styles.marketRateSection}>
          <Text style={styles.marketRateLabel}>1 {selectedCrypto} MARKET RATE</Text>
          <Text style={styles.marketRateValue}>₱3,919,883.72</Text>
          <View style={styles.marketRateSubInfo}>
            <Text style={styles.marketRateUSD}>$67,422.00 USD</Text>
            <View style={styles.changeContainer}>
              <Ionicons name="trending-down" size={14} color="#F44336" />
              <Text style={styles.changeText}>-2.30%</Text>
            </View>
          </View>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {timeframes.map((timeframe) => (
            <TouchableOpacity
              key={timeframe}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe(timeframe)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === timeframe && styles.timeframeTextActive
              ]}>
                {timeframe}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        {renderChart()}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E15816",
    letterSpacing: 2,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  balanceSection: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#333",
  },
  assetsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  assetsRow: {
    flexDirection: "row",
    gap: 40,
  },
  assetColumn: {
    flex: 1,
  },
  assetColumnTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E15816",
    letterSpacing: 1,
    marginBottom: 16,
  },
  assetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  assetSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  assetBalance: {
    fontSize: 14,
    color: "#999",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#FFF5F0",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#E15816",
  },
  cryptoSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  cryptoButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cryptoButtonActive: {
    borderColor: "#E15816",
    backgroundColor: "#FFF5F0",
  },
  cryptoButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginTop: 8,
  },
  cryptoButtonTextActive: {
    color: "#333",
  },
  cryptoIcon: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  marketRateSection: {
    marginBottom: 24,
  },
  marketRateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  marketRateValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  marketRateSubInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marketRateUSD: {
    fontSize: 14,
    color: "#999",
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
  },
  timeframeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  timeframeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  timeframeButtonActive: {
    backgroundColor: "#333",
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  timeframeTextActive: {
    color: "#FFFFFF",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  barWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
