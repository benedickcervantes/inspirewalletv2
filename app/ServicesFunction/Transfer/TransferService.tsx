import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getOrCreateMainWallet } from "../../../configs/api";
import { auth, firestore } from "../../../configs/firebase";
import { useLanguage } from "../../../context/LanguageContext";
import ContactsModal from "./ContactsModal";
import QRScanner from "./QRScanner";

import ActivityModal from '../../components/ActivityModal';
const getScreenWidth = () => {
  try {
    const D = require("react-native").Dimensions;
    return D?.get?.("window")?.width ?? 375;
  } catch {
    return 375;
  }
};
const width = getScreenWidth();
const INSPIRE_TRANSFER_QR_PREFIX = "INSPIREWALLET:TRANSFER:";

const normalizeAccountNumber = (value: string): string => value.replace(/\D/g, "");
const isValidAccountNumber = (value: string): boolean =>
  /^\d{12}$/.test(normalizeAccountNumber(value));
const buildInspireTransferQrPayload = (accountNumber: string): string =>
  `${INSPIRE_TRANSFER_QR_PREFIX}${normalizeAccountNumber(accountNumber)}`;
const parseInspireTransferQrPayload = (raw: string): string | null => {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const lowerText = text.toLowerCase();
  if (
    lowerText.startsWith("http://") ||
    lowerText.startsWith("https://") ||
    lowerText.startsWith("expo://") ||
    lowerText.includes("://")
  ) {
    return null;
  }
  if (text.startsWith(INSPIRE_TRANSFER_QR_PREFIX)) {
    const account = text.slice(INSPIRE_TRANSFER_QR_PREFIX.length).trim();
    return isValidAccountNumber(account) ? normalizeAccountNumber(account) : null;
  }
  try {
    const parsed = JSON.parse(text) as {
      app?: string;
      type?: string;
      accountNumber?: string;
    };
    if (
      String(parsed.app ?? "").toUpperCase() === "INSPIREWALLET" &&
      String(parsed.type ?? "").toUpperCase() === "TRANSFER" &&
      typeof parsed.accountNumber === "string" &&
      isValidAccountNumber(parsed.accountNumber)
    ) {
      return normalizeAccountNumber(parsed.accountNumber);
    }
  } catch {
    // Ignore non-JSON payloads.
  }
  // Backward compatibility for older Inspire QR codes that only encoded account number.
  if (/^[\d\s-]+$/.test(text) && isValidAccountNumber(text)) {
    return normalizeAccountNumber(text);
  }
  return null;
};

// Reusable function to fetch user balances (JWT or Firebase)
export const fetchUserBalances = async () => {
  const accessToken = await AsyncStorage.getItem("access_token");
  if (accessToken) {
    const { success, wallet } = await getOrCreateMainWallet(accessToken);
    const bal = success && wallet?.balance != null ? parseFloat(String(wallet.balance)) : 0;
    const agent = success && (wallet as { agentCommission?: number | string })?.agentCommission != null
      ? parseFloat(String((wallet as { agentCommission?: number | string }).agentCommission))
      : 0;
    return {
      availableBalance: Number.isNaN(bal) ? 0 : bal,
      agentWallet: Number.isNaN(agent) ? 0 : agent,
      userData: null,
    };
  }
  if (!auth || !firestore) {
    throw new Error("Firebase not configured");
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found");
  }
  const userDoc = await getDoc(doc(firestore, "users", user.uid));
  if (!userDoc.exists()) {
    throw new Error("User document not found");
  }
  const userData = userDoc.data() as Record<string, unknown>;
  return {
    availableBalance: Number(userData?.balance ?? userData?.availBalanceAmount ?? 0) || 0,
    agentWallet: Number(userData?.agentWallet ?? userData?.agentWalletAmount ?? 0) || 0,
    userData,
  };
};

// Reusable function to validate balance selection
export const validateBalanceSelection = (selectedBalance: string | null, agentWallet: number) => {
  if (!selectedBalance) {
    return {
      isValid: false,
      message: "sendMoney.selectBalanceToContinue",
    };
  }

  if (selectedBalance === "agent" && agentWallet === 0) {
    return {
      isValid: false,
      message: "sendMoney.agentWalletInsufficient",
    };
  }

  return {
    isValid: true,
    message: "Balance selection is valid",
  };
};

// Reusable function to format currency
export const formatCurrency = (amount: number) => {
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Reusable function to check if balance is sufficient
export const checkSufficientBalance = (balanceType: string, availableBalance: number, agentWallet: number, amount: number) => {
  const balance = balanceType === "available" ? availableBalance : agentWallet;
  return balance >= amount;
};

export default function SendMoney() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedBalance, setSelectedBalance] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [agentWallet, setAgentWallet] = useState(0);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessageKey, setAlertMessageKey] = useState("sendMoney.selectBalanceToContinue");
  const [showQRModal, setShowQRModal] = useState(false);
  const [userAccountNumber, setUserAccountNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showInvalidQrModal, setShowInvalidQrModal] = useState(false);
  const [invalidQrMessage, setInvalidQrMessage] = useState(
    "Only Inspire Wallet transfer QR codes are accepted.",
  );
  const [showContactsModal, setShowContactsModal] = useState(false);
  const qrRef = useRef<any | null>(null);

  useEffect(() => {
    loadBalances();
    loadUserAccountNumber();
  }, []);

  const loadBalances = async () => {
    try {
      const balances = await fetchUserBalances();
      setAvailableBalance(Number(balances.availableBalance) || 0);
      setAgentWallet(Number(balances.agentWallet) || 0);
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  };
  const loadUserAccountNumber = async () => {
    try {
      const userJson = await AsyncStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson) as { accountNumber?: string; firstName?: string; lastName?: string };
        setUserAccountNumber(user?.accountNumber || "");
        const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
        setUserName(fullName || t("common.user"));
      }
    } catch (error) {
      console.error("Error loading user account number:", error);
    }
  };

  const handleContinue = () => {
    const validation = validateBalanceSelection(selectedBalance, agentWallet);

    if (!validation.isValid) {
      setAlertMessageKey(validation.message);
      setShowAlertModal(true);
      return;
    }

    // Navigate to next step with selected balance
    navigation.navigate("TransferRecipient", { balanceType: selectedBalance ?? "available" });
  };

  const handleShareQr = async () => {
    try {
      if (!userAccountNumber) {
        alert(t("sendMoney.noAccountNumber") || "No account number to share.");
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        await Share.share({
          message:
            `${t("sendMoney.shareQrFallbackText") || "Here is my wallet account number"}: ` +
            userAccountNumber,
        });
        return;
      }

      if (!qrRef.current || typeof qrRef.current.toDataURL !== "function") {
        alert(
          t("sendMoney.qrNotReady") ||
            "QR code is not ready yet. Please try again.",
        );
        return;
      }

      qrRef.current.toDataURL(async (data: string) => {
        try {
          const baseDir =
            FileSystem.cacheDirectory || FileSystem.documentDirectory;

          if (!baseDir) {
            await Share.share({
              message:
                `${t("sendMoney.shareQrFallbackText") || "Here is my wallet account number"}: ` +
                userAccountNumber,
            });
            return;
          }

          const fileUri = `${baseDir}my-qr-${Date.now()}.png`;

          await FileSystem.writeAsStringAsync(fileUri, data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await Sharing.shareAsync(fileUri, {
            mimeType: "image/png",
            dialogTitle: t("sendMoney.shareQr") || "Share my QR",
          });
        } catch (error) {
          console.error("Error sharing QR code:", error);
          alert(
            t("sendMoney.errorShareQr") ||
              "Failed to share QR code. Please try again.",
          );
        }
      });
    } catch (error) {
      console.error("Error preparing QR share:", error);
      alert(
        t("sendMoney.errorShareQr") ||
          "Failed to share QR code. Please try again.",
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("sendMoney.title")}</Text>
        <View style={styles.headerRightPlaceholder} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowQRModal(true)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="qr-code" size={28} color="#E25A17" />
            </View>
            <Text style={styles.quickActionText}>{t("sendMoney.myQr")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowQRScanner(true)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="scan" size={28} color="#E25A17" />
            </View>
            <Text style={styles.quickActionText}>{t("sendMoney.scanQr")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowContactsModal(true)}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="people" size={28} color="#E25A17" />
            </View>
            <Text style={styles.quickActionText}>{t("sendMoney.contacts")}</Text>
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <View style={styles.stepCircle} />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <View style={styles.stepCircle} />
          </View>
        </View>

        <Text style={styles.stepLabel}>{t("sendMoney.step1Of3")}</Text>

        {/* Step Title */}
        <Text style={styles.stepTitle}>{t("sendMoney.selectBalanceType")}</Text>
        <Text style={styles.stepSubtitle}>
          {t("sendMoney.selectBalanceSubtitle")}
        </Text>

        {/* Balance Cards */}
        <View style={styles.balanceCardsContainer}>
          {/* Available Balance Card */}
          <TouchableOpacity
            style={[
              styles.balanceCard,
              selectedBalance === "available" && styles.balanceCardSelected,
            ]}
            onPress={() => setSelectedBalance("available")}
          >
            <View style={styles.balanceCardHeader}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={24} color="#E25A17" />
              </View>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceTitle}>{t("sendMoney.availableBalance")}</Text>
                <Text style={styles.balanceSubtitle}>{t("sendMoney.mainWalletBalance")}</Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedBalance === "available" && styles.radioButtonSelected,
                ]}
              >
                {selectedBalance === "available" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <View style={styles.balanceAmountContainer}>
              <Text style={styles.balanceAmount}>
                PHP {formatCurrency(availableBalance)}
              </Text>
              <View style={styles.availableBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.availableBadgeText}>{t("sendMoney.available")}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Agent Wallet Card */}
          <TouchableOpacity
            style={[
              styles.balanceCard,
              selectedBalance === "agent" && styles.balanceCardSelected,
              agentWallet === 0 && styles.balanceCardDisabled,
            ]}
            onPress={() => agentWallet > 0 && setSelectedBalance("agent")}
            disabled={agentWallet === 0}
          >
            <View style={styles.balanceCardHeader}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="briefcase" size={24} color="#E25A17" />
              </View>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceTitle}>{t("sendMoney.agentWallet")}</Text>
                <Text style={styles.balanceSubtitle}>{t("sendMoney.commissionEarnings")}</Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedBalance === "agent" && styles.radioButtonSelected,
                ]}
              >
                {selectedBalance === "agent" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <View style={styles.balanceAmountContainer}>
              <Text style={styles.balanceAmount}>
                PHP {formatCurrency(agentWallet)}
              </Text>
              {agentWallet === 0 ? (
                <View style={styles.insufficientBadge}>
                  <Ionicons name="alert-circle" size={14} color="#F44336" />
                  <Text style={styles.insufficientBadgeText}>{t("sendMoney.insufficient")}</Text>
                </View>
              ) : (
                <View style={styles.availableBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.availableBadgeText}>{t("sendMoney.available")}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedBalance && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedBalance}
        >
          <LinearGradient
            colors={
              !selectedBalance ? ["#CCC", "#999"] : ["#E25A17", "#F28934"]
            }
            style={styles.continueGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueText}>{t("sendMoney.continue")}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Alert Modal */}
      <ActivityModal
        visible={showAlertModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>{t("sendMoney.selectionRequired")}</Text>
              <Text style={styles.modalMessage}>
                {t(alertMessageKey)}
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAlertModal(false)}
              >
                <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </ActivityModal>

      {/* QR Code Modal */}
      <ActivityModal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>{t("sendMoney.myQr")}</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={28} color="#3d3737ff" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrModalBody}>
              <View style={styles.qrUserInfoCard}>
                <Text style={styles.qrUserName}>{userName}</Text>
                <Text style={styles.qrUserAccount}>{userAccountNumber || t("common.na")}</Text>

                <View style={styles.qrCodeWrapper}>
                  {userAccountNumber ? (
                    <QRCode
                      value={buildInspireTransferQrPayload(userAccountNumber)}
                      size={200}
                      color="#E25A17"
                      backgroundColor="#FFFFFF"
                      logo={require("../../../assets/images/TranferLogo.png")}
                      logoSize={40}
                      logoBackgroundColor="transparent"
                      logoMargin={2}
                      logoBorderRadius={8}
                      getRef={(ref) => {
                        qrRef.current = ref;
                      }}
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code-outline" size={80} color="#CCC" />
                      <Text style={styles.qrPlaceholderText}>{t("sendMoney.noAccountNumber")}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.secureCodeBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                  <Text style={styles.secureCodeText}>{t("sendMoney.secureTransferCode")}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.shareQRButton}
                onPress={handleShareQr}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.shareQRGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="share-social" size={20} color="#FFFFFF" />
                  <Text style={styles.shareQRButtonText}>{t("sendMoney.shareQr")}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.qrInfoFooter}>
                <Ionicons name="information-circle-outline" size={16} color="#8B4A4A" />
                <Text style={styles.qrInfoFooterText}>
                  {t("sendMoney.qrFooterInfo")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ActivityModal>

      {/* Contacts Modal */}
      <ContactsModal
        visible={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        onSelectContact={(contact) => {
          setShowContactsModal(false);
          // Navigate to recipient screen with selected contact
          (navigation.navigate as any)("TransferRecipient", {
            balanceType: selectedBalance ?? "available",
            scannedAccount: contact.accountNumber,
            recipientName: contact.name
          });
        }}
      />

      {/* QR Scanner */}
      <QRScanner
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(data: string) => {
          setShowQRScanner(false);
          const parsedAccount = parseInspireTransferQrPayload(data);
          if (!parsedAccount) {
            const translated = t("sendMoney.invalidInspireQr");
            const fallback =
              "Invalid QR code. Please scan an Inspire Wallet transfer QR code only.";
            setInvalidQrMessage(
              translated &&
                translated !== "sendMoney.invalidInspireQr" &&
                translated !== "sendMoney.invalidInspireQR"
                ? translated
                : fallback,
            );
            setShowInvalidQrModal(true);
            return;
          }
          // Navigate to recipient screen with scanned account number
          (navigation.navigate as any)("TransferRecipient", {
            balanceType: selectedBalance ?? "available",
            scannedAccount: parsedAccount,
          });
        }}
      />

      <ActivityModal
        visible={showInvalidQrModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInvalidQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="close-circle" size={80} color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>Invalid QR</Text>
              <Text style={styles.modalMessage}>{invalidQrMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowInvalidQrModal(false)}
              >
                <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </ActivityModal>
    </View>
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
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRightPlaceholder: {
    width: 40,
    height: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: width * 0.05,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: width * 0.03,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
  },
  quickActionIcon: {
    width: width * 0.17,
    height: width * 0.17,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionText: {
    fontSize: width * 0.034,
    fontWeight: "500",
    color: "#333",
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    paddingHorizontal: 40,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLabel: {
    fontSize: 14,
    color: "#E25A17",
    textAlign: "left",
    marginBottom: 16,
    fontWeight: "500",
  },
  stepTitle: {
    fontSize: width * 0.058,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: width * 0.037,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  balanceCardsContainer: {
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: width * 0.05,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceCardSelected: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF5F0",
  },
  balanceCardDisabled: {
    opacity: 0.6,
  },
  balanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 13,
    color: "#999",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#E25A17",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E25A17",
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  availableBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  insufficientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  insufficientBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F44336",
  },
  continueButton: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  continueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.95,
  },
  modalButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E25A17",
    textAlign: "center",
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: "#fbeaeaff",
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 500,
  },
  qrModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#8B4A4A",
  },
  qrModalBody: {
    paddingHorizontal: 24,
  },
  qrShareText: {
    fontSize: 14,
    color: "#8B4A4A",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  qrUserInfoCard: {
    backgroundColor: "#e3d7d2ff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  qrUserName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  qrUserAccount: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  qrCodeWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
  secureCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secureCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  shareQRButton: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shareQRGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  shareQRButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  qrInfoFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 8,
  },
  qrInfoFooterText: {
    flex: 1,
    fontSize: 12,
    color: "#8B4A4A",
    lineHeight: 18,
  },
});



