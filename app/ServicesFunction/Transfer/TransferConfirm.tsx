import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createBeneficiary,
  getOrCreateMainWallet,
  submitTransfer,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import CustomLoader from "../../Loader/CustomLoader";
import ContactsModal from "./ContactsModal";
import QRScanner from "./QRScanner";
import { getMe } from "../../../configs/api";

const width = (() => {
  try {
    return require("react-native").Dimensions?.get?.("window")?.width ?? 375;
  } catch {
    return 375;
  }
})();

// Reusable function to get user initials
export const getUserInitials = (name: string) => {
  if (!name) return "??";
  const names = name.split(" ");
  if (names.length >= 2) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function TransferConfirm() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as {
    balanceType?: string;
    accountNumber?: string;
    amount?: string;
    description?: string;
    recipientName?: string;
    recipientId?: string;
    mainWalletId?: string;
  };
  const balanceType = params.balanceType || "";
  const accountNumber = params.accountNumber || "";
  const amount = Number(parseFloat(params.amount || "0")) || 0;
  const description = params.description || "N/A";
  const recipientName = params.recipientName || "";
  const mainWalletId = params.mainWalletId || "";

  const saveRecentRecipient = async (recipient: {
    name: string;
    accountNumber: string;
  }) => {
    try {
      const acct = String(recipient.accountNumber || "").replace(/\D/g, "");
      if (!acct) return;
      const name = (recipient.name || "").trim() || t("common.unknown");

      const raw = await AsyncStorage.getItem("saved_accounts");
      const existing = raw ? (JSON.parse(raw) as Array<{ id: string; name: string; accountNumber: string }>) : [];
      const without = existing.filter((x) => String(x.accountNumber || "").replace(/\D/g, "") !== acct);
      const next = [{ id: acct, name, accountNumber: acct }, ...without].slice(0, 20);
      await AsyncStorage.setItem("saved_accounts", JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save recent recipient:", e);
    }
  };

  const [currentBalance, setCurrentBalance] = useState(0);
  const [newBalance, setNewBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [hasPasscode, setHasPasscode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [userAccountNumber, setUserAccountNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const qrRef = useRef<any | null>(null);

  useEffect(() => {
    loadBalance();
    loadUserAccountNumber();
    (async () => {
      const userJson = await AsyncStorage.getItem("user");
      if (userJson) {
        try {
          const user = JSON.parse(userJson) as { hasPasscode?: boolean };
          setHasPasscode(!!user?.hasPasscode);
        } catch (_) { }
      }
    })();
  }, []);

  const refreshHasPasscode = async (): Promise<boolean> => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return hasPasscode;

      const me = await getMe(accessToken);
      if (!me.success || !me.user) return hasPasscode;

      // Keep local storage in sync so other screens stay accurate.
      await AsyncStorage.setItem("user", JSON.stringify(me.user));
      const next = !!(me.user as { hasPasscode?: boolean })?.hasPasscode;
      setHasPasscode(next);
      return next;
    } catch (e) {
      console.warn("Failed to refresh hasPasscode:", e);
      return hasPasscode;
    }
  };

  const isPasscodeRequiredError = (message: string) => {
    const m = (message || "").toLowerCase();
    return m.includes("passcode is required") || m.includes("set a passcode") || m.includes("provide your current passcode");
  };

  const loadBalance = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return;
      const { success, wallet } = await getOrCreateMainWallet(accessToken);
      if (!success || !wallet) return;
      if (balanceType === "agent") {
        const agentBal =
          (wallet as { agentCommission?: number | string })?.agentCommission != null
            ? parseFloat(String((wallet as { agentCommission?: number | string }).agentCommission))
            : NaN;
        const balanceNum = Number.isNaN(agentBal) ? 0 : agentBal;
        setCurrentBalance(balanceNum);
        setNewBalance(Math.max(0, balanceNum - amount));
      } else if (wallet?.balance != null) {
        const balanceNum = parseFloat(String(wallet.balance)) || 0;
        setCurrentBalance(balanceNum);
        setNewBalance(Math.max(0, balanceNum - amount));
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const loadUserAccountNumber = async () => {
    try {
      const userJson = await AsyncStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson) as {
          accountNumber?: string;
          firstName?: string;
          lastName?: string;
        };
        setUserAccountNumber(user?.accountNumber || "");
        const fullName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ");
        setUserName(fullName || t("common.user"));
      }
    } catch (error) {
      console.error("Error loading user account number:", error);
    }
  };

  const doTransfer = async (passcodeToSend?: string) => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setErrorMessage(t("sendMoney.loginRequired"));
      setShowErrorModal(true);
      return;
    }
    if (!mainWalletId) {
      setErrorMessage(
        t("sendMoney.errorResolveWallet"),
      );
      setShowErrorModal(true);
      return;
    }
    setIsProcessing(true);
    try {
      const { success: walletSuccess, wallet } =
        await getOrCreateMainWallet(accessToken);
      if (!walletSuccess || !wallet?.id) {
        setErrorMessage(t("sendMoney.errorLoadWallet"));
        setShowErrorModal(true);
        setIsProcessing(false);
        return;
      }
      const fromWalletId =
        balanceType === "available" ? (wallet.id as string) : undefined;
      const beneficiaryBody: Record<string, string> = {
        nickname: recipientName || t("common.unknown"),
        accountIdentifier: mainWalletId,
        type: "WALLET_ID",
      };
      if (hasPasscode && passcodeToSend)
        beneficiaryBody.passcode = passcodeToSend;
      const createRes = await createBeneficiary(accessToken, beneficiaryBody);
      if (!createRes.success || !createRes.data) {
        const msg = createRes.error || t("sendMoney.errorSetupRecipient");
        // If the backend now requires passcode (e.g. passcode recently updated),
        // prompt immediately instead of failing the flow.
        if (!passcodeToSend && isPasscodeRequiredError(msg)) {
          await refreshHasPasscode();
          setShowPasscodeModal(true);
        } else {
          setErrorMessage(msg);
          setShowErrorModal(true);
        }
        if (passcodeToSend) setPasscode("");
        setIsProcessing(false);
        return;
      }
      const beneficiaryId = (createRes.data as { id?: string }).id;
      if (!beneficiaryId) {
        setErrorMessage(t("sendMoney.errorInvalidResponse"));
        setShowErrorModal(true);
        setIsProcessing(false);
        return;
      }
      const transferBody: Record<string, string> = {
        beneficiaryId,
        amount: amount.toFixed(2),
        description: description || "",
      };
      if (fromWalletId) transferBody.fromWalletId = fromWalletId;
      transferBody.balanceType = balanceType || "available";
      if (hasPasscode && passcodeToSend) transferBody.passcode = passcodeToSend;
      const result = await submitTransfer(accessToken, transferBody);
      if (result.success) {
        await saveRecentRecipient({ name: recipientName, accountNumber });
        setShowPasscodeModal(false);
        setPasscode("");
        
        const txId = (result.data as any)?.id || t("investment.pending");
        (navigation as any).navigate("depositReceipt", {
          transactionId: txId,
          amount: amount.toString(),
          currency: "PHP",
          depositMethod: balanceType === "agent" ? t("sendMoney.agentWallet") : t("sendMoney.availableBalance"),
          type: "Transfer",
          successMessage: t("sendMoney.transferSuccessMessage")
                  .replace(
                    "{amount}",
                    amount.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }),
                  )
                  .replace("{name}", recipientName),
          date: new Date().toLocaleString()
        });
      } else {
        const msg = result.error || t("sendMoney.transferFailed");
        if (!passcodeToSend && isPasscodeRequiredError(msg)) {
          await refreshHasPasscode();
          setShowPasscodeModal(true);
        } else {
          setErrorMessage(msg);
          setShowErrorModal(true);
        }
        if (passcodeToSend) setPasscode("");
      }
    } catch (error) {
      console.error("Error processing transfer:", error);
      setErrorMessage(t("sendMoney.transferFailed"));
      setShowErrorModal(true);
      if (passcodeToSend) setPasscode("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    const latestHasPasscode = await refreshHasPasscode();
    if (latestHasPasscode) {
      setShowPasscodeModal(true);
      return;
    }
    await doTransfer();
  };

  const handlePasscodeConfirm = () => {
    if (passcode.length !== 4) return;
    doTransfer(passcode);
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

  if (isProcessing) {
    return <CustomLoader text={t("sendMoney.processing")} />;
  }

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
            <Text style={styles.quickActionText}>
              {t("sendMoney.contacts")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={[styles.stepLine, styles.stepLineCompleted]} />
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={[styles.stepLine, styles.stepLineCompleted]} />
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Step Title */}
        <Text style={styles.stepTitle}>{t("sendMoney.confirmTransfer")}</Text>
        <Text style={styles.stepSubtitle}>
          {t("sendMoney.reviewTransferDetails")}
        </Text>

        {/* Recipient Card */}
        <View style={styles.recipientCard}>
          <Text style={styles.recipientLabel}>{t("sendMoney.to")}</Text>
          <View style={styles.recipientInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getUserInitials(recipientName)}
              </Text>
            </View>
            <View style={styles.recipientDetails}>
              <Text style={styles.recipientName}>{recipientName}</Text>
              <Text style={styles.recipientAccount}>{accountNumber}</Text>
            </View>
          </View>
        </View>

        {/* Transfer Details Card */}
        <LinearGradient
          colors={["#F28934", "#E25A17"]}
          style={styles.detailsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsLabel}>
              {t("sendMoney.amountToTransfer")}
            </Text>
          </View>
          <Text style={styles.amountText}>
            PHP{" "}
            {amount.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.detailsRowColumn}>
            <Text style={styles.detailsRowLabel}>{t("sendMoney.from")}</Text>
            <View style={styles.detailsRowValueWrap}>
              <Text style={styles.detailsRowText}>
                {balanceType === "available"
                  ? t("sendMoney.availableBalance")
                  : t("sendMoney.agentWallet")}
              </Text>
            </View>
          </View>
          <View style={styles.detailsRowColumn}>
            <Text style={styles.detailsRowLabel}>
              {t("sendMoney.descriptionOptional")}
            </Text>
            <View style={styles.detailsRowValueWrap}>
              <Text
                style={styles.detailsRowTextWrap}
                numberOfLines={4}
                ellipsizeMode="tail"
              >
                {description}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Balance Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t("sendMoney.currentBalance")}</Text>
              <Text style={styles.summaryValue}>
                PHP{" "}
                {currentBalance.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                {t("sendMoney.newBalance")}
              </Text>
              <Text style={styles.summaryValue}>
                PHP{" "}
                {newBalance.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
          <View style={styles.transferAmountRow}>
            <Text style={styles.transferAmountLabel}>
              {t("sendMoney.transferAmount")}
            </Text>
            <Text style={styles.transferAmountValue}>
              -
              {amount.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={["#E25A17", "#F28934"]}
            style={styles.confirmGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.confirmText}>{t("sendMoney.confirm")}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Passcode modal (when user has passcode set) */}
      <Modal
        visible={showPasscodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessing && setShowPasscodeModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.passcodeModalContent}>
            <Text style={styles.passcodeModalTitle}>{t("sendMoney.enterPasscode")}</Text>
            <TextInput
              style={styles.passcodeInput}
              value={passcode}
              onChangeText={(t) =>
                setPasscode(t.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="••••"
              placeholderTextColor="#999"
              secureTextEntry
              maxLength={4}
              keyboardType="number-pad"
              editable={!isProcessing}
            />
            <View style={styles.passcodeModalButtons}>
              <TouchableOpacity
                style={[
                  styles.passcodeModalButton,
                  styles.passcodeModalButtonCancel,
                ]}
                onPress={() => {
                  setShowPasscodeModal(false);
                  setPasscode("");
                }}
                disabled={isProcessing}
              >
                <Text style={styles.passcodeModalButtonCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.passcodeModalButton,
                  styles.passcodeModalButtonConfirm,
                ]}
                onPress={handlePasscodeConfirm}
                disabled={isProcessing || passcode.length !== 4}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.passcodeModalButtonGradient}
                >
                  <Text style={styles.passcodeModalButtonConfirmText}>
                    {t("sendMoney.confirm")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.checkIconContainer}>
                <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>{t("sendMoney.error")}</Text>
              <Text style={styles.modalMessage}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
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
              <Text style={styles.qrShareText}>
                {t("sendMoney.shareQrInstruction")}
              </Text>

              <View style={styles.qrUserInfoCard}>
                <Text style={styles.qrUserName}>{userName}</Text>
                <Text style={styles.qrUserAccount}>
                  {userAccountNumber || t("common.na")}
                </Text>

                <View style={styles.qrCodeWrapper}>
                  {userAccountNumber ? (
                    <QRCode
                      value={userAccountNumber}
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
                      <Text style={styles.qrPlaceholderText}>
                        {t("sendMoney.noAccountNumber")}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.secureCodeBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                  <Text style={styles.secureCodeText}>
                    {t("sendMoney.secureTransferCode")}
                  </Text>
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
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#8B4A4A"
                />
                <Text style={styles.qrInfoFooterText}>
                  {t("sendMoney.qrFooterInfo")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contacts Modal */}
      <ContactsModal
        visible={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        onSelectContact={(contact) => {
          setShowContactsModal(false);
          // Note: This is the confirm screen, showing contacts for reference
        }}
      />

      {/* QR Scanner */}
      <QRScanner
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(data: string) => {
          setShowQRScanner(false);
          // Note: This is the confirm screen, scanning here would be for reference only
          // You might want to navigate back or show the scanned account
        }}
      />
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
    marginBottom: 24,
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
  stepCircleCompleted: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: "#E25A17",
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  recipientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recipientLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 12,
  },
  recipientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFD4B8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E25A17",
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  recipientAccount: {
    fontSize: 14,
    color: "#999",
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  detailsHeader: {
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  amountText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailsRowColumn: {
    flexDirection: "column",
    marginBottom: 12,
    width: "100%",
  },
  detailsRowLabel: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 8,
  },
  detailsRowValue: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsRowValueWrap: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 7,
    width: "100%",
  },
  detailsRowText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  detailsRowTextWrap: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
    flexWrap: "wrap",
    lineHeight: 18,
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  transferAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  transferAmountLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  transferAmountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  confirmButton: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  confirmText: {
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
  checkIconContainer: {
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
  passcodeModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 340,
  },
  passcodeModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  passcodeInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 20,
  },
  passcodeModalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  passcodeModalButton: {
    minWidth: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  passcodeModalButtonCancel: {
    backgroundColor: "#E8E8E8",
    paddingVertical: 12,
    alignItems: "center",
  },
  passcodeModalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  passcodeModalButtonConfirm: {},
  passcodeModalButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  passcodeModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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