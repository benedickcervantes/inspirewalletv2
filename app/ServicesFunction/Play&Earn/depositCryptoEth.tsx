import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT: readonly [string, string] = ["#E25A17", "#F28934"];
const ETH_ACTIVE_COLOR = "#5BA3D0";
const BTC_ACTIVE_COLOR = "#F7931A";

const CRYPTO_OPTIONS: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "BTC", label: "BTC", icon: "logo-bitcoin" },
  { id: "ETH", label: "ETHA", icon: "bulb-outline" },
  { id: "USDT", label: "USDT", icon: "cash-outline" },
];

const SAMPLE_ETH_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f8bB7E";
const SUPPORT_NOTE =
  "Note: This address is for MetaMask and other Ethereum-compatible wallets";

export default function DepositCryptoEth() {
  const navigation = useNavigation();
  const [selectedCrypto, setSelectedCrypto] = useState("ETH");
  const [accountName, setAccountName] = useState("Aries Dev");
  const [accountEmail, setAccountEmail] = useState("Aries_dev@gmail.com");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

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
      await Clipboard.setStringAsync(SAMPLE_ETH_WALLET_ADDRESS);
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
      <SafeAreaView style={styles.safeArea}>
        {/* Header - Orange Gradient */}
        <LinearGradient
          colors={ORANGE_GRADIENT}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("PlayEarn")}
          >
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color={THEME_COLOR} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deposit via Crypto</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Account Holder Card */}
          <View style={styles.card}>
            <View style={styles.cardIconCircle}>
              <Ionicons name="person-outline" size={28} color={THEME_COLOR} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Account Holder: {accountName}</Text>
              <Text style={styles.cardSubtitle}>Email: {accountEmail}</Text>
            </View>
          </View>

          {/* Crypto Selection Pills - Segmented pill design with circular icons */}
          <View style={styles.cryptoPillsContainer}>
            {CRYPTO_OPTIONS.map((crypto, index) => {
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
                    index === 0 && styles.cryptoPillFirst,
                    index === CRYPTO_OPTIONS.length - 1 && styles.cryptoPillLast,
                    isActive && getCryptoPillActiveStyle(),
                  ]}
                  onPress={() => {
                    if (crypto.id === "BTC") {
                      navigation.navigate("DepositCrypto");
                    } else if (crypto.id === "USDT") {
                      navigation.navigate("DepositCryptoUSDT");
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
              <View style={styles.qrWrapper}>
                <QRCode
                  value={SAMPLE_ETH_WALLET_ADDRESS}
                  size={100}
                  color="#000"
                  backgroundColor="#FFF"
                />
              </View>
              <View style={styles.walletAddressSection}>
                <Text style={styles.walletLabel}>Wallet Address</Text>
                <Text style={styles.walletAddress} numberOfLines={2}>
                  {SAMPLE_ETH_WALLET_ADDRESS}
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
              <Text style={styles.supportNoteText}>{SUPPORT_NOTE}</Text>
            </View>
          </View>

          {/* Upload Receipt Card - with orange border */}
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={handleUploadReceipt}
            activeOpacity={0.8}
          >
            <View style={styles.uploadIconCircle}>
              <MaterialCommunityIcons
                name="cloud-upload-outline"
                size={36}
                color={THEME_COLOR}
              />
            </View>
            <View style={styles.uploadContent}>
              <Text style={styles.uploadTitle}>
                Upload transaction receipt/screenshot
              </Text>
              <Text style={styles.uploadSubtitle}>
                Your deposit will be processed once we verify the transaction receipt
              </Text>
              {receiptUri && (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.uploadedText}>Receipt uploaded</Text>
                </View>
              )}
            </View>
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
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  cryptoPillsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#E8E8E8",
    borderRadius: 20,
    padding: 5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cryptoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  cryptoPillFirst: {
    marginRight: 0,
  },
  cryptoPillLast: {
    marginLeft: 0,
  },
  cryptoPillActive: {
    backgroundColor: BTC_ACTIVE_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoPillActiveEth: {
    backgroundColor: ETH_ACTIVE_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoPillActiveUsdt: {
    backgroundColor: "#22C55E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoPillIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D5D5D5",
    justifyContent: "center",
    alignItems: "center",
  },
  cryptoPillIconCircleActiveBtc: {
    backgroundColor: "#D67B0A",
  },
  cryptoPillIconCircleActiveEth: {
    backgroundColor: "#3B8BB5",
  },
  cryptoPillIconCircleActiveUsdt: {
    backgroundColor: "#1A1A1A",
  },
  cryptoPillText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
  },
  cryptoPillTextActive: {
    color: "#FFF",
  },
  walletCard: {
    backgroundColor: "#2D2D2D",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  walletCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginRight: 16,
  },
  walletAddressSection: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 12,
    color: "#FFF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 12,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyButton: {
    borderWidth: 2,
    borderColor: THEME_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  supportNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  supportNoteText: {
    flex: 1,
    fontSize: 11,
    color: "#999",
    lineHeight: 16,
  },
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  uploadContent: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  uploadedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22C55E",
  },
  submitButton: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  submitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  bottomSpacing: {
    height: 32,
  },
});
