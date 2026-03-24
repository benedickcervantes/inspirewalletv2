import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

const width = (() => {
  try {
    return require("react-native").Dimensions?.get?.("window")?.width ?? 375;
  } catch {
    return 375;
  }
})();

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

export default function ContactsModal({ visible, onClose, onSelectContact }: ContactsModalProps) {
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
      loadSavedAccounts();
      loadDeviceContacts();
    }
  }, [visible]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, savedAccounts, deviceContacts, activeTab]);

  useEffect(() => {
    if (!visible) return;
    if (activeTab !== "device") return;
    // Ensure device list is fresh when user switches tabs.
    loadDeviceContacts();
  }, [activeTab, visible]);

  const loadSavedAccounts = async () => {
    try {
      const saved = await AsyncStorage.getItem("saved_accounts");
      if (saved) {
        const accounts = JSON.parse(saved) as SavedAccount[];
        setSavedAccounts(accounts);
        setFilteredSaved(accounts);
        if ((accounts?.length ?? 0) === 0) setActiveTab("device");
      } else {
        setSavedAccounts([]);
        setFilteredSaved([]);
        setActiveTab("device");
      }
    } catch (error) {
      console.error("Error loading saved accounts:", error);
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
          phoneNumbers: contact.phoneNumbers?.map((phone: any) => phone.number || "") || [],
          accountNumber: contact.phoneNumbers?.[0]?.number?.replace(/\D/g, "") || "",
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
      const filtered = savedAccounts.filter((account) =>
        account.name.toLowerCase().includes(searchLower) ||
        account.accountNumber.includes(searchLower)
      );
      setFilteredSaved(filtered);
    } else {
      const filtered = deviceContacts.filter((contact) =>
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phoneNumbers?.some(phone => phone.includes(searchLower)) ||
        contact.accountNumber.includes(searchLower)
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
    const selectedContact: Contact = {
      ...(contact as any),
      accountNumber: String(rawAccount).replace(/\D/g, ""),
      type: activeTab,
    };
    onSelectContact(selectedContact);
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("sendMoney.contacts")}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
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
              <Text style={[styles.tabText, activeTab === "saved" && styles.tabTextActive]}>
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
              <Text style={[styles.tabText, activeTab === "device" && styles.tabTextActive]}>
                {t("sendMoney.deviceContacts")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === "saved" ? t("sendMoney.searchSavedPlaceholder") : t("sendMoney.searchDevicePlaceholder")}
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

          {/* Content */}
          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {activeTab === "saved" ? (
              filteredSaved.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? t("sendMoney.noContactsFound") : t("sendMoney.noSavedAccounts")}
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
                      <Text style={styles.contactAccount}>{account.accountNumber}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))
              )
            ) : isLoadingDeviceContacts ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#E25A17" />
                <Text style={styles.emptyStateTitle}>{t("common.loading")}</Text>
                <Text style={styles.emptyStateText}>
                  {t("sendMoney.loadingContacts") || "Loading device contacts..."}
                </Text>
              </View>
            ) : !hasContactPermission ? (
              <View style={styles.emptyState}>
                <Ionicons name="lock-closed-outline" size={64} color="#CCC" />
                <Text style={styles.emptyStateTitle}>{t("sendMoney.permissionRequiredTitle")}</Text>
                <Text style={styles.emptyStateText}>
                  {t("sendMoney.grantContactsPermission")}
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={loadDeviceContacts}
                >
                  <Text style={styles.permissionButtonText}>{t("sendMoney.grantPermission")}</Text>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
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
