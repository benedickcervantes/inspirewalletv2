import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import QRCode from "react-native-qrcode-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_COLOR = "#E15816";
const IPHONE_SE_WIDTH = 320;
const SMALL_PHONE_WIDTH = 375;
const ORANGE_GRADIENT: readonly [string, string] = ["#E15816", "#FF7E47"];
const PREMIUM_DARK = "#1A1A1A";
const SOFT_GRAY = "#F9FAFB";
const ETH_ACTIVE_COLOR = "#627EEA";
const BTC_ACTIVE_COLOR = "#F7931A";
const USDT_ACTIVE_COLOR = "#26A17B";

const CRYPTO_OPTIONS: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "BTC", label: "BTC", icon: "logo-bitcoin" },
  { id: "ETH", label: "ETH", icon: "diamond" },
  { id: "USDT", label: "USDT", icon: "cash-outline" },
];

const MOCK_DATA = {
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f8bB7E",
  accountName: "Aries Dev",
  accountEmail: "Aries_dev@gmail.com",
  supportNote: "Note: This address is for MetaMask and other Ethereum-compatible wallets"
};


export default function DepositCryptoEth() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const isXSScreen = width <= IPHONE_SE_WIDTH;
  const isSmallScreen = width < SMALL_PHONE_WIDTH;
  const horizontalPadding = isXSScreen ? 12 : isSmallScreen ? 16 : 20;
  const qrSize = isXSScreen ? 110 : isSmallScreen ? 130 : 160;

  const [selectedCrypto, setSelectedCrypto] = useState("ETH");
  const [accountName, setAccountName] = useState(MOCK_DATA.accountName);
  const [accountEmail, setAccountEmail] = useState(MOCK_DATA.accountEmail);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const { t } = useLanguage();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => {
      navigation.navigate("PlayEarn");
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [navigation]);

  const handleBack = useCallback(() => navigation.navigate("PlayEarn"), [navigation]);

  const loadUser = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || accountName;
        const email = user.email || accountEmail;
        setAccountName(name || accountName);
        setAccountEmail(email || accountEmail);
      }
    } catch {
      // use defaults
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleCopyAddress = async () => {
    try {
      await Clipboard.setStringAsync(MOCK_DATA.walletAddress);
      Alert.alert("Copied", "Wallet address copied to clipboard");
    } catch {
      Alert.alert("Error", "Could not copy address");
    }
  };

  const handleUploadReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library to upload a receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
      Alert.alert("Uploaded", "Receipt uploaded successfully");
    }
  };

  const handleSubmit = () => {
    if (!receiptUri) {
      Alert.alert("Upload required", "Please upload your transaction receipt/screenshot before submitting.");
      return;
    }
    Alert.alert("Deposit request submitted", "Your deposit will be processed once we verify the transaction receipt.");
    navigation.navigate("PlayEarn");
  };

  const getCryptoPillActiveStyle = () => {
    if (selectedCrypto === "ETH") return styles.cryptoPillActiveEth;
    if (selectedCrypto === "USDT") return styles.cryptoPillActiveUsdt;
    return styles.cryptoPillActive;
  };

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
              onPress={() => navigation.navigate("PlayEarn")}
            >
              <Ionicons name="arrow-back" size={isXSScreen ? 22 : 24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isXSScreen && styles.headerTitleCompact]} numberOfLines={1}>
              Deposit ETH
            </Text>
            <View style={{ width: 44 }} />
          </LinearGradient>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
            showsVerticalScrollIndicator={false}
          >
          {/* Premium Account Holder Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={24} color={THEME_COLOR} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{accountName}</Text>
              <Text style={styles.profileEmail}>{accountEmail}</Text>
            </View>
            <View style={styles.profileStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Verified</Text>
            </View>
          </View>

          {/* Crypto Selection Pills */}
          <View style={styles.cryptoPillsContainer}>
            {CRYPTO_OPTIONS.map((crypto) => {
              const isActive = selectedCrypto === crypto.id;
              const iconCircleActiveStyle =
                crypto.id === "BTC" ? styles.cryptoPillIconCircleActiveBtc :
                crypto.id === "ETH" ? styles.cryptoPillIconCircleActiveEth :
                styles.cryptoPillIconCircleActiveUsdt;
              return (
                <TouchableOpacity
                  key={crypto.id}
                  style={[
                    styles.cryptoPill,
                    isActive && getCryptoPillActiveStyle(),
                  ]}
                  onPress={() => {
                    if (crypto.id === "BTC") {
                      (navigation as any).replace("DepositCrypto");
                    } else if (crypto.id === "USDT") {
                      (navigation as any).replace("DepositCryptoUSDT");
                    } else {
                      setSelectedCrypto(crypto.id);
                    }
                  }}
                >
                  <View style={[
                    styles.cryptoPillIconCircle,
                    isActive && iconCircleActiveStyle,
                  ]}>
                    <Ionicons
                      name={crypto.icon}
                      size={18}
                      color={isActive ? "#FFF" : "#555"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.cryptoPillText,
                      isActive && styles.cryptoPillTextActive,
                    ]}
                  >
                    {crypto.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Wallet Address Card - Dark */}
          <View style={styles.walletCard}>
            <View style={styles.walletCardRow}>
              <View style={[styles.qrWrapper, { padding: isXSScreen ? 8 : 12 }]}>
                <QRCode
                  value={MOCK_DATA.walletAddress}
                  size={qrSize}
                  color="#000"
                  backgroundColor="#FFF"
                />
              </View>
              <View style={styles.walletAddressSection}>
                <Text style={styles.walletLabel}>Wallet Address</Text>
                <Text style={styles.walletAddress} numberOfLines={2}>
                  {MOCK_DATA.walletAddress}
                </Text>
                <View style={styles.copyRow}>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyAddress}
                  >
                    <Text style={styles.copyButtonText}>Tap to Copy</Text>
                  </TouchableOpacity>
                  <Ionicons name="copy-outline" size={20} color="#FFF" />
                </View>
              </View>
            </View>
            <View style={styles.supportNote}>
              <Ionicons name="information-circle-outline" size={18} color="#999" />
              <Text style={styles.supportNoteText}>{MOCK_DATA.supportNote}</Text>
            </View>
          </View>

          {/* Modern Upload Area */}
          <TouchableOpacity
            style={styles.uploadZone}
            onPress={handleUploadReceipt}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconWrapper}>
              <MaterialCommunityIcons
                name="cloud-upload"
                size={40}
                color={THEME_COLOR}
              />
            </View>
            <Text style={styles.uploadTitle}>
              Click to upload receipt
            </Text>
            <Text style={styles.uploadSubtitle}>
              JPG, PNG or PDF (Max 5MB)
            </Text>
            {receiptUri && (
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <Text style={styles.successText}>Attached successfully</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={ORANGE_GRADIENT}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.submitIconCircle}>
                <Ionicons name="checkmark" size={24} color="#FFF" />
              </View>
              <Text style={styles.submitText}>Submit Deposit Request</Text>
            </LinearGradient>
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
    backgroundColor: "#F0F0F0",
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCompact: {
    padding: 14,
    marginBottom: 12,
  },
  textCompact: {
    fontSize: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SOFT_GRAY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: PREMIUM_DARK,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
  },
  profileStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  cryptoPillsContainer: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: SOFT_GRAY,
    borderRadius: 20,
    padding: 6,
    gap: 8,
  },
  cryptoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  cryptoPillActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cryptoPillActiveEth: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cryptoPillActiveUsdt: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cryptoPillIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  cryptoPillIconCircleActiveBtc: {
    backgroundColor: BTC_ACTIVE_COLOR,
  },
  cryptoPillIconCircleActiveEth: {
    backgroundColor: ETH_ACTIVE_COLOR,
  },
  cryptoPillIconCircleActiveUsdt: {
    backgroundColor: USDT_ACTIVE_COLOR,
  },
  cryptoPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#71717A",
  },
  cryptoPillTextActive: {
    color: PREMIUM_DARK,
  },
  walletCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  walletCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginRight: 20,
  },
  walletAddressSection: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 13,
    color: "#FFF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 16,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copyButton: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },
  supportNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  supportNoteText: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 16,
    marginLeft: 8,
  },
  uploadZone: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
  },
  uploadIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: SOFT_GRAY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PREMIUM_DARK,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  successText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginLeft: 6,
  },
  submitButton: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  submitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  bottomSpacing: {
    height: 32,
  },
});
