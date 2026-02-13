import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  Clipboard,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

export default function PlayAndEarn() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Trading");
  const [userData, setUserData] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [activeAction, setActiveAction] = useState("Buy");
  const [spendingAmount, setSpendingAmount] = useState("");
  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [selectedDepositCrypto, setSelectedDepositCrypto] = useState("BTC");
  const [uploadedReceipt, setUploadedReceipt] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setAvailableBalance(data.balance || 0);
      }
    });

    return () => unsubscribe();
  }, []);

  const cryptoData = [
    { symbol: "BTC", name: "Bitcoin", balance: "0.00000" },
    { symbol: "ETH", name: "Ethereum", balance: "0.00000" },
    { symbol: "USDT", name: "Tether", balance: "0.00000" },
  ];

  const forexData = [
    { symbol: "USD", name: "US Dollar", balance: "0.00" },
    { symbol: "JPY", name: "Japanese Yen", balance: "0.00" },
  ];

  const percentages = [25, 50, 75, 100];

  const handlePercentageSelect = (percentage) => {
    setSelectedPercentage(percentage);
    const amount = (availableBalance * percentage) / 100;
    setSpendingAmount(amount.toFixed(2));
  };

  const handleCopyAddress = () => {
    const walletAddress = "bc1qfdckdgu5vtcfnpxk4pnfed5tfgr5q3we8dztd";
    Clipboard.setString(walletAddress);
    Alert.alert("Copied!", "Wallet address copied to clipboard");
  };

  const handleUploadReceipt = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setUploadedReceipt(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#E15816" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Play and Earn</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color="#E15816" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Buttons */}
        <View style={styles.tabButtons}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "Trading" && styles.tabButtonActive]}
            onPress={() => setActiveTab("Trading")}
          >
            <Text style={[styles.tabButtonText, activeTab === "Trading" && styles.tabButtonTextActive]}>
              Trading
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "Deposit" && styles.tabButtonActive]}
            onPress={() => setActiveTab("Deposit")}
          >
            <Text style={[styles.tabButtonText, activeTab === "Deposit" && styles.tabButtonTextActive]}>
              Deposit via Crypto
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "Deposit" ? (
          // Deposit via Crypto Content
          <>
            {/* Account Holder Card */}
            <View style={styles.accountHolderCard}>
              <View style={styles.accountIconContainer}>
                <Ionicons name="person-circle-outline" size={40} color="#E15816" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Account Holder: {userData?.firstName || "User"}</Text>
                <Text style={styles.accountEmail}>Email: {userData?.email || "user@example.com"}</Text>
              </View>
            </View>

            {/* Crypto Selection Buttons */}
            <View style={styles.depositCryptoButtons}>
              <TouchableOpacity
                style={[
                  styles.depositCryptoButton,
                  selectedDepositCrypto === "BTC" && styles.depositCryptoButtonActiveBTC
                ]}
                onPress={() => setSelectedDepositCrypto("BTC")}
              >
                <Image 
                  source={require("../../assets/images/BTC.png")} 
                  style={selectedDepositCrypto === "BTC" ? styles.cryptoIconWhite : styles.cryptoIcon}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.depositCryptoText,
                  selectedDepositCrypto === "BTC" && styles.depositCryptoTextActive
                ]}>
                  BTC
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.depositCryptoButton,
                  selectedDepositCrypto === "ETHA" && styles.depositCryptoButtonActiveETHA
                ]}
                onPress={() => setSelectedDepositCrypto("ETHA")}
              >
                <Image 
                  source={require("../../assets/images/ETH.png")} 
                  style={styles.cryptoIcon}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.depositCryptoText,
                  selectedDepositCrypto === "ETHA" && styles.depositCryptoTextActive
                ]}>
                  ETHA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.depositCryptoButton,
                  selectedDepositCrypto === "USDT" && styles.depositCryptoButtonActiveUSDT
                ]}
                onPress={() => setSelectedDepositCrypto("USDT")}
              >
                <Image 
                  source={require("../../assets/images/USDT.png")} 
                  style={selectedDepositCrypto === "USDT" ? styles.cryptoIconWhite : styles.cryptoIcon}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.depositCryptoText,
                  selectedDepositCrypto === "USDT" && styles.depositCryptoTextActiveUSDT
                ]}>
                  USDT
                </Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Address Card */}
            <View style={styles.walletAddressCard}>
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodePlaceholder}>
                  <MaterialCommunityIcons name="qrcode" size={120} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.walletAddressInfo}>
                <Text style={styles.walletAddressLabel}>Wallet Address</Text>
                <Text style={styles.walletAddressText}>bc1qfdckdgu5vtcfnpxk4pnfed5tfgr5q3we8dztd</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyAddress}>
                  <Text style={styles.copyButtonText}>Tap to Copy</Text>
                  <MaterialCommunityIcons name="content-copy" size={18} color="#E15816" />
                </TouchableOpacity>
                <View style={styles.noteContainer}>
                  <Ionicons name="information-circle" size={16} color="#999" />
                  <Text style={styles.noteText}>
                    Note: This is a Native SegWit(bech32) address. Supported by: Binance, Coinbase, Trust Wallet, Ledger, Trezor, OKX, Bybit, Kraken, Huobi, Bitfinex, Exodus, Electrum, Sparrow Wallet, Wasabi Wallet.
                  </Text>
                </View>
              </View>
            </View>

            {/* Upload Receipt Card */}
            <TouchableOpacity style={styles.uploadCard} onPress={handleUploadReceipt}>
              <View style={styles.uploadIconContainer}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={48} color="#E15816" />
              </View>
              <View style={styles.uploadInfo}>
                <Text style={styles.uploadTitle}>Upload transaction receipt/screenshot</Text>
                <Text style={styles.uploadSubtitle}>
                  Your deposit will be processed once we verify the transaction receipt
                </Text>
                {uploadedReceipt && (
                  <Text style={styles.uploadedText}>✓ Receipt uploaded</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Deposit Request</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Trading Content
          <>

        {/* Available Balance Card */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>
            ₱ {availableBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </LinearGradient>

        {/* Crypto and Forex Lists */}
        <View style={styles.assetsContainer}>
          <View style={styles.assetColumn}>
            <View style={styles.assetHeader}>
              <Ionicons name="logo-bitcoin" size={16} color="#333" />
              <Text style={styles.assetHeaderText}>CRYPTO</Text>
            </View>
            {cryptoData.map((crypto) => (
              <View key={crypto.symbol} style={styles.assetRow}>
                <Text style={styles.assetSymbol}>{crypto.symbol}</Text>
                <Text style={styles.assetBalance}>{crypto.balance}</Text>
              </View>
            ))}
          </View>

          <View style={styles.assetColumn}>
            <View style={styles.assetHeader}>
              <Ionicons name="cash-outline" size={16} color="#333" />
              <Text style={styles.assetHeaderText}>FOREX</Text>
            </View>
            {forexData.map((forex) => (
              <View key={forex.symbol} style={styles.assetRow}>
                <Text style={styles.assetSymbol}>{forex.symbol}</Text>
                <Text style={styles.assetBalance}>{forex.balance}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Crypto Section */}
        <View style={styles.cryptoSection}>
          <Text style={styles.sectionTitle}>CRYPTO</Text>
          
          {/* Crypto Selection */}
          <View style={styles.cryptoButtons}>
            {cryptoData.map((crypto) => (
              <TouchableOpacity
                key={crypto.symbol}
                style={[
                  styles.cryptoButton,
                  selectedCrypto === crypto.symbol && styles.cryptoButtonActive
                ]}
                onPress={() => setSelectedCrypto(crypto.symbol)}
              >
                <Image 
                  source={
                    crypto.symbol === "BTC" 
                      ? require("../../assets/images/BTC.png")
                      : crypto.symbol === "ETH"
                      ? require("../../assets/images/ETH.png")
                      : require("../../assets/images/USDT.png")
                  }
                  style={styles.cryptoButtonIcon}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.cryptoButtonText,
                  selectedCrypto === crypto.symbol && styles.cryptoButtonTextActive
                ]}>
                  {crypto.symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Current Price */}
          <Text style={styles.priceLabel}>CURRENT PRICE</Text>
          <Text style={styles.priceValue}>₱ 3,845,755.81</Text>
          <View style={styles.priceChange}>
            <Text style={styles.priceChangeText}>+2.4%</Text>
            <Text style={styles.priceChangeTime}>(24h)</Text>
          </View>

          {/* Timeframe Selector */}
          <View style={styles.timeframeContainer}>
            <TouchableOpacity style={styles.timeframeButtonActive}>
              <Text style={styles.timeframeTextActive}>24h</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeframeButton}>
              <Text style={styles.timeframeText}>7d</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeframeButton}>
              <Text style={styles.timeframeText}>30d</Text>
            </TouchableOpacity>
          </View>

          {/* Buy/Sell Tabs */}
          <View style={styles.actionTabs}>
            <TouchableOpacity
              style={[styles.actionTab, activeAction === "Buy" && styles.actionTabActive]}
              onPress={() => setActiveAction("Buy")}
            >
              <Text style={[styles.actionTabText, activeAction === "Buy" && styles.actionTabTextActive]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionTab, activeAction === "Sell" && styles.actionTabActive]}
              onPress={() => setActiveAction("Sell")}
            >
              <Text style={[styles.actionTabText, activeAction === "Sell" && styles.actionTabTextActive]}>
                Sell
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spending Amount */}
          <Text style={styles.inputLabel}>SPENDING AMOUNT</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={spendingAmount}
              onChangeText={setSpendingAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#CCC"
            />
            <Text style={styles.currencyLabel}>PHP</Text>
          </View>

          {/* Percentage Buttons */}
          <View style={styles.percentageButtons}>
            {percentages.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  selectedPercentage === percentage && styles.percentageButtonActive
                ]}
                onPress={() => handlePercentageSelect(percentage)}
              >
                <Text style={[
                  styles.percentageButtonText,
                  selectedPercentage === percentage && styles.percentageButtonTextActive
                ]}>
                  {percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Confirm Purchase</Text>
          </TouchableOpacity>
        </View>
        </>
        )}
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
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  helpButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  tabButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#E15816",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  assetsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 40,
  },
  assetColumn: {
    flex: 1,
  },
  assetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  assetHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  assetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  assetSymbol: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  assetBalance: {
    fontSize: 13,
    color: "#999",
  },
  cryptoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E15816",
    marginBottom: 16,
    textAlign: "center",
  },
  cryptoButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  cryptoButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  cryptoButtonActive: {
    backgroundColor: "#FFF5F0",
  },
  cryptoButtonIcon: {
    width: 32,
    height: 32,
  },
  cryptoButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 8,
  },
  cryptoButtonTextActive: {
    color: "#E15816",
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  priceChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  priceChangeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  priceChangeTime: {
    fontSize: 12,
    color: "#999",
  },
  timeframeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  timeframeButtonActive: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E15816",
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  timeframeTextActive: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionTabs: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  actionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  actionTabActive: {
    backgroundColor: "#FFFFFF",
  },
  actionTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  actionTabTextActive: {
    color: "#E15816",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
  },
  percentageButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  percentageButtonActive: {
    backgroundColor: "#E15816",
  },
  percentageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  percentageButtonTextActive: {
    color: "#FFFFFF",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Deposit via Crypto Styles
  accountHolderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accountIconContainer: {
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 13,
    color: "#666",
  },
  depositCryptoButtons: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  depositCryptoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 26,
    backgroundColor: "transparent",
  },
  depositCryptoButtonActiveBTC: {
    backgroundColor: "#F7931A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  depositCryptoButtonActiveETHA: {
    backgroundColor: "#627EEA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  depositCryptoButtonActiveUSDT: {
    backgroundColor: "#26A17B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoIcon: {
    width: 24,
    height: 24,
  },
  cryptoIconWhite: {
    width: 24,
    height: 24,
    tintColor: "#FFFFFF",
  },
  depositCryptoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  depositCryptoTextActive: {
    color: "#FFFFFF",
  },
  depositCryptoTextActiveUSDT: {
    color: "#FFFFFF",
  },
  walletAddressCard: {
    backgroundColor: "#2C2C2C",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  qrCodeContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrCodePlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  walletAddressInfo: {
    alignItems: "center",
  },
  walletAddressLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  walletAddressText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E15816",
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  noteContainer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: "#CCC",
    lineHeight: 16,
  },
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E15816",
    padding: 20,
    marginBottom: 20,
  },
  uploadIconContainer: {
    marginRight: 16,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: "#999",
    lineHeight: 16,
  },
  uploadedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
    marginTop: 8,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E15816",
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
