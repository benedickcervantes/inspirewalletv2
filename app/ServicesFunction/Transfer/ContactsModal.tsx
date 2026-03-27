import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getBeneficiaries } from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";

import ActivityModal from "../../components/ActivityModal";

interface Contact {
  id: string;
  name: string;
  accountNumber: string;
  phoneNumbers?: string[];
  type: "saved" | "device";
}

interface SavedAccount {
  id: string;
  name: string;
  accountNumber: string;
}

interface ContactsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
}

export default function ContactsModal({
  visible,
  onClose,
  onSelectContact,
}: ContactsModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"saved" | "device">("saved");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<Contact[]>([]);
  const [filteredSaved, setFilteredSaved] = useState<SavedAccount[]>([]);
  const [filteredDevice, setFilteredDevice] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab("saved");
      loadSavedAccounts();
    }
  }, [visible]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, savedAccounts, deviceContacts, activeTab]);

  useEffect(() => {
    if (!visible) return;
    if (activeTab !== "device") return;
    if (deviceContacts.length === 0 && !isLoadingDeviceContacts) {
      loadDeviceContacts();
    }
  }, [activeTab, visible]);

  const loadSavedAccounts = async () => {
    let localAccounts: SavedAccount[] = [];
    try {
      const saved = await AsyncStorage.getItem("saved_accounts");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localAccounts = Array.isArray(parsed) ? (parsed as SavedAccount[]) : [];
        } catch {
          localAccounts = [];
        }
      }
    } catch (error) {
      console.error("Error reading local saved accounts:", error);
    }

    // Load phone number mapping
    let phoneMapping: Record<string, string> = {};
    try {
      const mappingData = await AsyncStorage.getItem("beneficiary_phone_mapping");
      if (mappingData) {
        phoneMapping = JSON.parse(mappingData);
        console.log("Phone mapping loaded:", phoneMapping);
      }
    } catch (error) {
      console.warn("Error loading phone mapping:", error);
    }

    let backendAccounts: SavedAccount[] = [];
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        const beneficiariesRes = await getBeneficiaries(accessToken);
        if (beneficiariesRes.success && Array.isArray(beneficiariesRes.beneficiaries)) {
          console.log("Beneficiaries from backend:", JSON.stringify(beneficiariesRes.beneficiaries, null, 2));
          backendAccounts = beneficiariesRes.beneficiaries
            .map((item: any, index: number) => {
              const beneficiaryId = String(item?.id || "").trim();
              const accountIdentifier = String(
                item?.accountIdentifier ||
                  item?.walletId ||
                  item?.identifier ||
                  "",
              ).trim();
              
              console.log(`Beneficiary ${index}: id=${beneficiaryId}, accountIdentifier=${accountIdentifier}`);
              
              // Check if we have a phone number mapping for beneficiary ID or wallet ID
              const phoneNumber = phoneMapping[beneficiaryId] || phoneMapping[accountIdentifier] || "";
              
              console.log(`Phone number lookup: beneficiaryId=${beneficiaryId} -> ${phoneMapping[beneficiaryId] || "NOT FOUND"}`);
              console.log(`Phone number lookup: accountIdentifier=${accountIdentifier} -> ${phoneMapping[accountIdentifier] || "NOT FOUND"}`);
              console.log(`Final phone number: ${phoneNumber || "NOT FOUND"}`);
              
              // Use phone number if available, otherwise use wallet ID
              const displayNumber = phoneNumber || accountIdentifier;
              
              if (!displayNumber) return null;
              
              const name = String(
                item?.nickname ||
                  item?.name ||
                  item?.recipientName ||
                  item?.recipient?.user?.fullName ||
                  item?.recipient?.user?.name ||
                  item?.recipient?.fullName ||
                  item?.fullName ||
                  "",
              ).trim();
              
              const id = String(item?.id || displayNumber || `beneficiary-${index}`);
              
              return {
                id,
                name: name || t("common.unknown"),
                accountNumber: displayNumber,
              } as SavedAccount;
            })
            .filter(Boolean) as SavedAccount[];
        }
      }
    } catch (error) {
      console.warn("Unable to load beneficiaries from backend:", error);
    }

    try {
      const mergedMap = new Map<string, SavedAccount>();
      [...backendAccounts, ...localAccounts].forEach((acc) => {
        const acct = String(acc.accountNumber || "").trim();
        if (!acct) return;
        const key = acct.replace(/\s+/g, "").toLowerCase();
        mergedMap.set(key, {
          id: String(acc.id || acct),
          name: String(acc.name || t("common.unknown")),
          accountNumber: acct,
        });
      });
      const mergedAccounts = Array.from(mergedMap.values());

      await AsyncStorage.setItem("saved_accounts", JSON.stringify(mergedAccounts));

      setSavedAccounts(mergedAccounts);
      setFilteredSaved(mergedAccounts);
      if ((mergedAccounts?.length ?? 0) === 0) {
        setActiveTab("device");
      } else {
        setActiveTab("saved");
      }
    } catch (error) {
      console.error("Error merging saved accounts:", error);
      setSavedAccounts(localAccounts);
      setFilteredSaved(localAccounts);
      if ((localAccounts?.length ?? 0) === 0) {
        setActiveTab("device");
      } else {
        setActiveTab("saved");
      }
    }
  };

  const loadDeviceContacts = async () => {
    try {
      setIsLoadingDeviceContacts(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setHasContactPermission(false);
        setDeviceContacts([]);
        setFilteredDevice([]);
        return;
      }
      setHasContactPermission(true);

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        const contacts: Contact[] = data.map((contact: any, index: number) => ({
          id: contact.id || `contact-${index}`,
          name: contact.name || t("common.unknown"),
          phoneNumbers:
            contact.phoneNumbers?.map((phone: any) => phone.number || "") || [],
          accountNumber:
            contact.phoneNumbers?.[0]?.number?.replace(/\D/g, "") || "",
          type: "device" as const,
        }));
        setDeviceContacts(contacts);
        setFilteredDevice(contacts);
      } else {
        setDeviceContacts([]);
        setFilteredDevice([]);
      }
    } catch (error) {
      console.error("Error loading device contacts:", error);
      setDeviceContacts([]);
      setFilteredDevice([]);
    } finally {
      setIsLoadingDeviceContacts(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const searchLower = query.toLowerCase().trim();

    if (!searchLower) {
      setFilteredSaved(savedAccounts);
      setFilteredDevice(deviceContacts);
      return;
    }

    if (activeTab === "saved") {
      const filtered = savedAccounts.filter(
        (account) =>
          account.name.toLowerCase().includes(searchLower) ||
          account.accountNumber.includes(searchLower),
      );
      setFilteredSaved(filtered);
    } else {
      const filtered = deviceContacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchLower) ||
          contact.phoneNumbers?.some((phone) => phone.includes(searchLower)) ||
          contact.accountNumber.includes(searchLower),
      );
      setFilteredDevice(filtered);
    }
  };

  const handleSelectContact = (contact: Contact | SavedAccount) => {
    const rawAccount =
      (contact as Contact)?.accountNumber ||
      (contact as Contact)?.phoneNumbers?.[0] ||
      (contact as SavedAccount)?.accountNumber ||
      "";
    const trimmedRaw = String(rawAccount).trim();
    const selectedContact: Contact = {
      ...(contact as any),
      accountNumber: trimmedRaw,
      type: activeTab,
    };
    onSelectContact(selectedContact);
    handleClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setSearchQuery("");
    onClose();
  };

  return (
    <ActivityModal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* Overlay tap-to-close area */}
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Modal sheet — does NOT move when keyboard opens */}
        <View style={styles.modalContainer}>

          {/* Header — always visible */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("sendMoney.contacts")}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Tabs — always visible */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "saved" && styles.tabActive]}
              onPress={() => setActiveTab("saved")}
            >
              <Ionicons
                name="bookmark"
                size={20}
                color={activeTab === "saved" ? "#E25A17" : "#999"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "saved" && styles.tabTextActive,
                ]}
              >
                {t("sendMoney.savedAccounts")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "device" && styles.tabActive]}
              onPress={() => setActiveTab("device")}
            >
              <Ionicons
                name="phone-portrait"
                size={20}
                color={activeTab === "device" ? "#E25A17" : "#999"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "device" && styles.tabTextActive,
                ]}
              >
                {t("sendMoney.deviceContacts")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar — always visible */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === "saved"
                  ? t("sendMoney.searchSavedPlaceholder")
                  : t("sendMoney.searchDevicePlaceholder")
              }
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/*
            KeyboardAvoidingView wraps ONLY the ScrollView so the list
            shrinks when the keyboard appears — the header/tabs/search
            stay anchored and never get pushed off screen.
          */}
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
          >
            <ScrollView
              style={styles.contentContainer}
              contentContainerStyle={styles.contentContainerInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {activeTab === "saved" ? (
                filteredSaved.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyStateTitle}>
                      {searchQuery
                        ? t("sendMoney.noContactsFound")
                        : t("sendMoney.noSavedAccounts")}
                    </Text>
                    <Text style={styles.emptyStateText}>
                      {searchQuery
                        ? t("sendMoney.tryDifferentSearch")
                        : t("sendMoney.saveAccountsInstruction")}
                    </Text>
                  </View>
                ) : (
                  filteredSaved.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={styles.contactItem}
                      onPress={() => handleSelectContact(account)}
                    >
                      <View style={styles.contactAvatar}>
                        <Ionicons name="bookmark" size={24} color="#E25A17" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{account.name}</Text>
                        <Text style={styles.contactAccount}>
                          {account.accountNumber}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  ))
                )
              ) : isLoadingDeviceContacts ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color="#E25A17" />
                  <Text style={styles.emptyStateTitle}>
                    {t("common.loading")}
                  </Text>
                </View>
              ) : !hasContactPermission ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={64}
                    color="#CCC"
                  />
                  <Text style={styles.emptyStateTitle}>
                    {t("sendMoney.permissionRequiredTitle")}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {t("sendMoney.grantContactsPermission")}
                  </Text>
                  <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={loadDeviceContacts}
                  >
                    <Text style={styles.permissionButtonText}>
                      {t("sendMoney.grantPermission")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : filteredDevice.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? "No contacts found" : "No Contacts"}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery
                      ? "Try a different search term"
                      : "No contacts available on your device"}
                  </Text>
                </View>
              ) : (
                filteredDevice.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => handleSelectContact(contact)}
                  >
                    <View style={styles.contactAvatar}>
                      <Ionicons name="person" size={24} color="#E25A17" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactAccount}>
                        {contact.phoneNumbers?.[0] ||
                          contact.accountNumber ||
                          t("sendMoney.noPhone")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </ActivityModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  // Transparent touchable that fills the space above the sheet
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Fixed height — does NOT shift when keyboard opens
    maxHeight: "85%",
    minHeight: "70%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#FFF5F0",
    borderWidth: 2,
    borderColor: "#E25A17",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#E25A17",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  // KeyboardAvoidingView fills remaining space below search bar
  keyboardAvoidingContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  contentContainerInner: {
    paddingBottom: 32,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: "#E25A17",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});