import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Contacts from "expo-contacts";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import {
    getOrCreateMainWallet,
    getRecipientByAccountNumber,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import {
    formatAmountWithCommas,
    unformatNumberString,
} from "../../../utils/numberFormat";
import { useResponsive } from "../../../utils/responsive";
import Loader from "../../Loader/Loader";
import ContactsModal from "./ContactsModal";
import QRScanner from "./QRScanner";

import ActivityModal from '../../components/ActivityModal';
const width = (() => {
  try {
    return require("react-native").Dimensions?.get?.("window")?.width ?? 375;
  } catch {
    return 375;
  }
})();

interface Contact {
  id: string;
  name?: string;
  accountNumber?: string;
  phoneNumbers?: string[];
}

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

  // Preferred Inspire Wallet transfer QR format.
  if (text.startsWith(INSPIRE_TRANSFER_QR_PREFIX)) {
    const account = text.slice(INSPIRE_TRANSFER_QR_PREFIX.length).trim();
    return isValidAccountNumber(account) ? normalizeAccountNumber(account) : null;
  }

  // Optional JSON format support for future-proofing.
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
    // Not JSON; ignore.
  }

  // Backward compatibility for old Inspire transfer QR payloads (plain account number).
  if (/^[\d\s-]+$/.test(text) && isValidAccountNumber(text)) {
    return normalizeAccountNumber(text);
  }

  return null;
};

const resolveInitialAccountValue = (raw: string | undefined): string => {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const parsed = parseInspireTransferQrPayload(value);
  if (parsed) return parsed;
  // Allow direct/manual account number values passed from contacts/navigation.
  return isValidAccountNumber(value) ? normalizeAccountNumber(value) : "";
};

const getInvalidInspireQrMessage = (t: (key: string) => string): string => {
  const translated = t("sendMoney.invalidInspireQr");
  const fallback =
    "Invalid QR code. Please scan an Inspire Wallet transfer QR code only.";
  if (
    translated &&
    translated !== "sendMoney.invalidInspireQr" &&
    translated !== "sendMoney.invalidInspireQR"
  ) {
    return translated;
  }
  return fallback;
};

// Reusable function to fetch user balance by type (backend only)
export const fetchBalanceByType = async (balanceType: string) => {
  const accessToken = await AsyncStorage.getItem("access_token");
  if (!accessToken) return 0;
  const { success, wallet } = await getOrCreateMainWallet(accessToken);
  if (!success || !wallet) return 0;
  if (balanceType === "agent") {
    const agentBal =
      (wallet as { agentCommission?: number | string })?.agentCommission != null
        ? parseFloat(
            String(
              (wallet as { agentCommission?: number | string }).agentCommission,
            ),
          )
        : NaN;
    return Number.isNaN(agentBal) ? 0 : agentBal;
  }
  if (wallet?.balance != null) {
    const bal = parseFloat(String(wallet.balance));
    return Number.isNaN(bal) ? 0 : bal;
  }
  return 0;
};

// Reusable function to load user contacts (loads from device contacts)
export const loadUserContacts = async (
  t: (key: string) => string,
): Promise<Contact[]> => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Contact permission not granted");
      return [];
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    if (data.length > 0) {
      return data.map((contact: any, index: number) => ({
        id: contact.id || `contact-${index}`,
        name: contact.name || t("common.unknown"),
        phoneNumbers:
          contact.phoneNumbers?.map((phone: any) => phone.number || "") || [],
        accountNumber:
          contact.phoneNumbers?.[0]?.number?.replace(/\D/g, "") || "",
      }));
    }
    return [];
  } catch (error) {
    console.error("Error loading contacts:", error);
    return [];
  }
};

// Reusable function to validate transfer form (returns translation keys for message)
export const validateTransferForm = (
  accountNumber: string,
  amount: string,
  availableBalance: number,
) => {
  if (!accountNumber || !amount) {
    return {
      isValid: false,
      messageKey: "sendMoney.fillRequiredFields" as const,
    };
  }

  const transferAmount = parseFloat(unformatNumberString(amount));
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return {
      isValid: false,
      messageKey: "sendMoney.enterValidAmount" as const,
    };
  }

  if (transferAmount > availableBalance) {
    return {
      isValid: false,
      messageKey: "sendMoney.insufficientBalance" as const,
    };
  }

  return {
    isValid: true,
    messageKey: null,
  };
};

export default function TransferRecipient() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useResponsive();
  const params = (route.params || {}) as {
    balanceType?: string;
    scannedAccount?: string;
  };
  const balanceType = params.balanceType;

  const [accountNumber, setAccountNumber] = useState(
    resolveInitialAccountValue(params.scannedAccount),
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [userAccountNumber, setUserAccountNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const viewShotRef = useRef<ViewShot | null>(null);

  useEffect(() => {
    fetchBalance();
    loadContacts();
    loadUserAccountNumber();
    loadMostRecentRecipientIntoField();
  }, []);

  const loadMostRecentRecipientIntoField = async () => {
    try {
      if ((params.scannedAccount || "").trim()) return;
      if ((accountNumber || "").trim()) return;
      const raw = await AsyncStorage.getItem("saved_accounts");
      if (!raw) return;
      const saved = JSON.parse(raw) as Array<{ accountNumber?: string }>;
      const mostRecent = saved?.[0]?.accountNumber;
      if (mostRecent) setAccountNumber(String(mostRecent));
    } catch (e) {
      console.warn("Failed to load recent recipient:", e);
    }
  };

  const fetchBalance = async () => {
    try {
      const balance = await fetchBalanceByType(balanceType ?? "available");
      setAvailableBalance(Number(balance) || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const loadContacts = async () => {
    try {
      const contactsList = await loadUserContacts(t);
      setContacts(contactsList as Contact[]);
      setFilteredContacts(contactsList as Contact[]);
    } catch (error) {
      console.error("Error loading contacts:", error);
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
        const fullName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ");
        setUserName(fullName || t("common.user"));

        if (user?.accountNumber) {
          setUserAccountNumber(user.accountNumber);
        } else {
          const accessToken = await AsyncStorage.getItem("access_token");
          if (accessToken) {
            const { success, wallet } = await getOrCreateMainWallet(accessToken);
            if (success && (wallet as any)?.accountNumber) {
              const accountNum = String((wallet as any).accountNumber);
              setUserAccountNumber(accountNum);
              const updatedUser = { ...user, accountNumber: accountNum };
              await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading user account number:", error);
    }
  };

  const handleContactSearch = (query: string) => {
    setContactSearchQuery(query);
    if (!query.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    const filtered = contacts.filter((contact) => {
      const name = contact.name?.toLowerCase() || "";
      const phone = contact.phoneNumbers?.join(" ").toLowerCase() || "";
      const searchLower = query.toLowerCase();
      return name.includes(searchLower) || phone.includes(searchLower);
    });
    setFilteredContacts(filtered);
  };

  const handleContinue = async () => {
    const validation = validateTransferForm(
      accountNumber,
      amount,
      Number(availableBalance) || 0,
    );
    if (!validation.isValid && validation.messageKey) {
      setAlertMessage(t(validation.messageKey));
      setShowAlertModal(true);
      return;
    }
    setIsLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setAlertMessage(t("sendMoney.loginRequired"));
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }
      const recipientResult = await getRecipientByAccountNumber(
        accessToken,
        accountNumber,
      );
      if (!recipientResult.success || !recipientResult.data) {
        setAlertMessage(
          recipientResult.error || t("sendMoney.errorRecipientNotFound"),
        );
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }
      const data = recipientResult.data as {
        mainWalletId?: string;
        firstName?: string;
        lastName?: string;
        accountNumber?: string;
      };
      const recipientName =
        [data.firstName, data.lastName].filter(Boolean).join(" ") ||
        t("common.unknown");
      navigation.navigate("TransferConfirm", {
        balanceType: balanceType ?? "available",
        accountNumber,
        amount: unformatNumberString(amount),
        description,
        recipientName,
        recipientId: "",
        mainWalletId: data.mainWalletId ?? "",
      });
    } catch (error) {
      console.error("Error verifying recipient:", error);
      setAlertMessage("sendMoney.errorVerifyingRecipient");
      setShowAlertModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const selectContact = (contact: Contact) => {
    // Use account number from contact
    const accountNum =
      contact.accountNumber ||
      contact.phoneNumbers?.[0]?.replace(/\D/g, "") ||
      "";
    setAccountNumber(accountNum);
    setShowContactsModal(false);
    setContactSearchQuery("");
  };

  const handleQRScan = (scannedData: string) => {
    const parsedAccount = parseInspireTransferQrPayload(scannedData);
    if (!parsedAccount) {
      setAlertMessage(getInvalidInspireQrMessage(t));
      setShowAlertModal(true);
      setShowQRScanner(false);
      return;
    }

    setAccountNumber(parsedAccount);
    setShowQRScanner(false);
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
            `${t("sendMoney.shareQrFallbackText") || "Here is my wallet account number"} (${userName}): ${userAccountNumber}`,
        });
        return;
      }

      if (!viewShotRef.current || typeof viewShotRef.current.capture !== "function") {
        alert(
          t("sendMoney.qrNotReady") ||
            "QR code is not ready yet. Please try again.",
        );
        return;
      }

      const fileUri = await viewShotRef.current.capture();
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: t("sendMoney.shareQr") || "Share my QR",
      });
    } catch (error) {
      console.error("Error preparing QR share:", error);
      alert(
        t("sendMoney.errorShareQr") ||
          "Failed to share QR code. Please try again.",
      );
    }
  };

  if (isLoading) {
    return <Loader text={t("sendMoney.verifying")} />;
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

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
              <Text style={styles.quickActionText}>
                {t("sendMoney.scanQr")}
              </Text>
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
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle} />
            </View>
          </View>

          <Text style={styles.stepLabel}>{t("sendMoney.step2Of3")}</Text>

          {/* Step Title */}
          <Text style={styles.stepTitle}>{t("sendMoney.transferDetails")}</Text>
          <Text style={styles.stepSubtitle}>
            {t("sendMoney.enterRecipientAndAmount")}
          </Text>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Recipient Account Number */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="person-outline" size={20} color="#E25A17" />
                <Text style={styles.inputLabel}>
                  {t("sendMoney.recipientAccountNumber")}
                </Text>
              </View>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={styles.input}
                  placeholder={t("sendMoney.placeholderAccountNumber")}
                  placeholderTextColor="#CCC"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.contactsButton}
                  onPress={() => setShowContactsModal(true)}
                >
                  <Text style={styles.contactsButtonText}>
                    {t("sendMoney.showContacts")}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#E25A17" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="cash-outline" size={20} color="#E25A17" />
                <Text style={styles.inputLabel}>{t("sendMoney.amount")}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#CCC"
                value={amount}
                onChangeText={(text) => setAmount(formatAmountWithCommas(text))}
                keyboardType="decimal-pad"
              />
              <Text style={styles.availableText}>
                {t("sendMoney.availableLabel")}: PHP{" "}
                {availableBalance.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Description */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#E25A17"
                />
                <Text style={styles.inputLabel}>
                  {t("sendMoney.descriptionOptional")}
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t("sendMoney.placeholderNote")}
                placeholderTextColor="#CCC"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={100}
              />
              <Text style={styles.charCount}>{description.length}/100</Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!accountNumber || !amount) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!accountNumber || !amount || isLoading}
          >
            <LinearGradient
              colors={
                !accountNumber || !amount
                  ? ["#CCC", "#999"]
                  : ["#E25A17", "#F28934"]
              }
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.continueText}>
                    {t("sendMoney.continue")}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

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
              <Text style={styles.modalTitle}>{t("sendMoney.alert")}</Text>
              <Text style={styles.modalMessage}>
                {alertMessage.startsWith("sendMoney.")
                  ? t(alertMessage)
                  : alertMessage}
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

      {/* Contacts Modal */}
      <ContactsModal
        visible={showContactsModal}
        onClose={() => {
          setShowContactsModal(false);
          setContactSearchQuery("");
        }}
        onSelectContact={(contact) => {
          const accountNum =
            contact.accountNumber ||
            contact.phoneNumbers?.[0]?.replace(/\D/g, "") ||
            "";
          setAccountNumber(accountNum);
          setShowContactsModal(false);
          setContactSearchQuery("");
        }}
      />

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
              <Text style={styles.qrShareText}>
                {t("sendMoney.shareQrInstruction")}
              </Text>

              <View style={styles.qrDisplayCard}>
                <Text style={styles.qrDisplayName}>{userName}</Text>
                <Text style={styles.qrDisplayAccount}>
                  {userAccountNumber || t("common.na")}
                </Text>
                <View style={styles.qrDisplayCodeWrapper}>
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
                <View style={styles.qrDisplaySecureBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                  <Text style={styles.qrDisplaySecureText}>
                    {t("sendMoney.secureTransferCode")}
                  </Text>
                </View>
              </View>
              <View style={styles.hiddenShareCaptureContainer} pointerEvents="none">
                <ViewShot
                  ref={viewShotRef}
                  options={{ format: "png", quality: 1, result: "tmpfile" }}
                  style={styles.shareCardCapture}
                >
                  <View style={styles.shareCardHeader}>
                    <Text style={styles.shareCardHeaderTitle}>Inspire Wallet</Text>
                    <Text style={styles.shareCardSubtitle}>Scan to transfer</Text>
                  </View>
                  <View style={styles.qrUserInfoCard}>
                    <View style={styles.qrCodeWrapper}>
                      <QRCode
                        value={buildInspireTransferQrPayload(userAccountNumber)}
                        size={210}
                        color="#E25A17"
                        backgroundColor="#FFFFFF"
                        logo={require("../../../assets/images/TranferLogo.png")}
                        logoSize={40}
                        logoBackgroundColor="transparent"
                        logoMargin={2}
                        logoBorderRadius={8}
                      />
                    </View>
                    <Text style={styles.qrUserName}>{userName}</Text>
                    <Text style={styles.qrUserIdText}>
                      User ID: {userAccountNumber || t("common.na")}
                    </Text>
                  </View>
                </ViewShot>
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
                  <Text style={styles.shareQRButtonText}>
                    {t("sendMoney.shareQr")}
                  </Text>
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
      </ActivityModal>

      {/* QR Scanner */}
      <QRScanner
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  keyboardView: {
    flex: 1,
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
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#FFE8DC",
  },
  quickActionText: {
    fontSize: width * 0.034,
    fontWeight: "600",
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
    backgroundColor: "#FFE8DC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  stepCircleActive: {
    backgroundColor: "#E25A17",
    borderColor: "#E25A17",
  },
  stepCircleCompleted: {
    backgroundColor: "#E25A17",
    borderColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#FFE8DC",
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: "#E25A17",
  },
  stepLabel: {
    fontSize: 14,
    color: "#E25A17",
    textAlign: "left",
    marginBottom: 16,
    fontWeight: "600",
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
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1.5,
    borderColor: "#FFE8DC",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWithButton: {
    position: "relative",
  },
  contactsButton: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FFE8DC",
  },
  contactsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E25A17",
  },
  availableText: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    fontWeight: "500",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
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
    backgroundColor: "rgba(226, 90, 23, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#E25A17",
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
  contactsModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    width: "100%",
    position: "absolute",
    bottom: 0,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  contactsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8DC",
    backgroundColor: "#FFFFFF",
  },
  contactsModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  contactsModalContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FFE8DC",
  },
  searchIcon: {
    marginRight: 8,
    color: "#E25A17",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFE8DC",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#FFE8DC",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  contactAccount: {
    fontSize: 14,
    color: "#666",
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
  qrDisplayCard: {
    backgroundColor: "#e3d7d2ff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  qrDisplayName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  qrDisplayAccount: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  qrDisplayCodeWrapper: {
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
  qrDisplaySecureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qrDisplaySecureText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  hiddenShareCaptureContainer: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  shareCardCapture: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1D7C7",
    overflow: "hidden",
    width: 340,
  },
  shareCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#F2DFD3",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FFF7F2",
  },
  shareCardHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E25A17",
  },
  shareCardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#8A8A8A",
  },
  qrUserInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 0,
    margin: 0,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  qrUserName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D2D2D",
    marginBottom: 4,
    textAlign: "center",
  },
  qrCodeWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0DCCC",
    marginBottom: 20,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
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
  qrUserIdText: {
    fontSize: 13,
    color: "#8A8A8A",
    textAlign: "center",
    fontWeight: "500",
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



