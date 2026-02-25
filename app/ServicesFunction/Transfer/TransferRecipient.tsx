import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../../context/LanguageContext";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getOrCreateMainWallet } from "../../../configs/api";
import { auth, firestore } from "../../../configs/firebase";

const { width } = Dimensions.get("window");

interface Contact {
  id: string;
  name?: string;
  accountNumber?: string;
}

// Reusable function to fetch user balance by type (JWT or Firebase)
export const fetchBalanceByType = async (balanceType: string) => {
  const accessToken = await AsyncStorage.getItem("access_token");
  if (accessToken) {
    const { success, wallet } = await getOrCreateMainWallet(accessToken);
    if (success && wallet?.balance != null && balanceType === "available") {
      const bal = parseFloat(String(wallet.balance));
      return Number.isNaN(bal) ? 0 : bal;
    }
    return 0;
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
  if (balanceType === "available") {
    return Number(userData?.balance ?? userData?.availBalanceAmount ?? 0) || 0;
  }
  return Number(userData?.agentWallet ?? userData?.agentWalletAmount ?? 0) || 0;
};

// Reusable function to load user contacts
export const loadUserContacts = async () => {
  if (!auth || !firestore) return [];
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user found");
    }

    const contactsQuery = query(
      collection(firestore, "contacts"),
      where("userId", "==", user.uid)
    );
    const contactsSnapshot = await getDocs(contactsQuery);
    const contactsList = contactsSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    return contactsList;
  } catch (error) {
    console.error("Error loading contacts:", error);
    return [];
  }
};

// Reusable function to verify recipient account
export const verifyRecipientAccount = async (accountNumber: string) => {
  if (!firestore) {
    throw new Error("Firebase not configured");
  }
  try {
    const recipientQuery = query(
      collection(firestore, "users"),
      where("accountNumber", "==", accountNumber)
    );
    const recipientSnapshot = await getDocs(recipientQuery);

    if (recipientSnapshot.empty) {
      return { exists: false, data: null };
    }

    const recipientData = recipientSnapshot.docs[0].data() as Record<string, unknown>;
    return {
      exists: true,
      data: {
        recipientName: recipientData.fullName || recipientData.name || "Unknown",
        recipientId: recipientSnapshot.docs[0].id,
        ...recipientData
      }
    };
  } catch (error) {
    console.error("Error verifying recipient:", error);
    throw error;
  }
};

// Reusable function to validate transfer form (returns translation keys for message)
export const validateTransferForm = (accountNumber: string, amount: string, availableBalance: number) => {
  if (!accountNumber || !amount) {
    return {
      isValid: false,
      messageKey: "sendMoney.fillRequiredFields" as const,
    };
  }

  const transferAmount = parseFloat(amount);
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
  const params = (route.params || {}) as { balanceType?: string };
  const balanceType = params.balanceType;

  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    fetchBalance();
    loadContacts();
  }, []);

  const fetchBalance = async () => {
    try {
      const balance = await fetchBalanceByType(balanceType ?? 'available');
      setAvailableBalance(Number(balance) || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const loadContacts = async () => {
    try {
      const contactsList = await loadUserContacts();
      setContacts(contactsList as Contact[]);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const handleContinue = async () => {
    const validation = validateTransferForm(accountNumber, amount, Number(availableBalance) || 0);
    
    if (!validation.isValid && validation.messageKey) {
      setAlertMessage(validation.messageKey);
      setShowAlertModal(true);
      return;
    }

    // Verify recipient exists
    setIsLoading(true);
    try {
      const recipientResult = await verifyRecipientAccount(accountNumber);

      if (!recipientResult.exists || !recipientResult.data) {
        setAlertMessage("sendMoney.recipientNotFound");
        setShowAlertModal(true);
        setIsLoading(false);
        return;
      }

      const { recipientName, recipientId } = recipientResult.data;
      // Navigate to confirmation page
      navigation.navigate("TransferConfirm", {
        balanceType: balanceType ?? "available",
        accountNumber,
        amount,
        description,
        recipientName: String(recipientName ?? "Unknown"),
        recipientId: String(recipientId ?? "")
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
    setAccountNumber(contact.accountNumber ?? "");
    setShowContactsModal(false);
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
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="qr-code" size={28} color="#E25A17" />
              </View>
              <Text style={styles.quickActionText}>{t("sendMoney.myQr")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="scan" size={28} color="#E25A17" />
              </View>
              <Text style={styles.quickActionText}>{t("sendMoney.scanQr")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="people" size={28} color="#E25A17" />
              </View>
              <Text style={styles.quickActionText}>{t("sendMoney.contacts")}</Text>
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
          <Text style={styles.stepSubtitle}>{t("sendMoney.enterRecipientAndAmount")}</Text>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Recipient Account Number */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="person-outline" size={20} color="#E25A17" />
                <Text style={styles.inputLabel}>{t("sendMoney.recipientAccountNumber")}</Text>
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
                  <Text style={styles.contactsButtonText}>{t("sendMoney.showContacts")}</Text>
                  <Ionicons name="chevron-down" size={16} color="#E25A17" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="cash-outline" size={20} color="#E25A17" />
                <Text style={styles.inputLabel}>Amount</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#CCC"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.availableText}>
                {t("sendMoney.availableLabel")}: PHP {availableBalance.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>

            {/* Description */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="document-text-outline" size={20} color="#E25A17" />
                <Text style={styles.inputLabel}>{t("sendMoney.descriptionOptional")}</Text>
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
              (!accountNumber || !amount) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!accountNumber || !amount || isLoading}
          >
            <LinearGradient
              colors={
                (!accountNumber || !amount) ? ["#CCC", "#999"] : ["#E25A17", "#F28934"]
              }
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.continueText}>{t("sendMoney.continue")}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Alert Modal */}
        <Modal
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
                <Text style={styles.modalMessage}>{t(alertMessage)}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowAlertModal(false)}
                >
                  <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Contacts Modal */}
        <Modal
          visible={showContactsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowContactsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.contactsModalContainer}>
              <View style={styles.contactsModalHeader}>
                <Text style={styles.contactsModalTitle}>{t("sendMoney.selectContact")}</Text>
                <TouchableOpacity onPress={() => setShowContactsModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.contactsModalContent}>
                {contacts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyStateText}>{t("sendMoney.noContactsFound")}</Text>
                  </View>
                ) : (
                  contacts.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.contactItem}
                      onPress={() => selectContact(contact)}
                    >
                      <View style={styles.contactAvatar}>
                        <Ionicons name="person" size={24} color="#E25A17" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name ?? ""}</Text>
                        <Text style={styles.contactAccount}>{contact.accountNumber ?? ""}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
  stepLabel: {
    fontSize: 14,
    color: "#E25A17",
    textAlign: "left",
    marginBottom: 16,
    fontWeight: "500",
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
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
  },
  contactsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E25A17",
  },
  availableText: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
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
  contactsModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  contactsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  contactsModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  contactsModalContent: {
    padding: 16,
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
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginBottom: 12,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
    color: "#999",
  },
});
