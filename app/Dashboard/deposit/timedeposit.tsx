import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, doc, firestore, getDoc } from "../../../configs/firebase";
import { useLanguage } from "../../../context/LanguageContext";

export default function TimeDeposit() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [depositMethod, setDepositMethod] = useState("Request Amount");
  const [selectedCurrency, setSelectedCurrency] = useState("PHP");
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [contractPeriod, setContractPeriod] = useState("");
  const [userData, setUserData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [availableBalance, setAvailableBalance] = useState(0);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
  }>({ title: "", message: "" });

  const currencies = [
    { code: "PHP", name: "Philippine Peso", flag: "🇵🇭", symbol: "₱" },
    { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", symbol: "¥" },
    { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", symbol: "﷼" },
    { code: "KRW", name: "Korean Won", flag: "🇰🇷", symbol: "₩" },
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (!auth || !firestore) return;
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as Record<string, unknown>;
          setUserData(data);
          const balance = data.availBalanceAmount ?? data.availableBalance;
          setAvailableBalance(Number(balance) || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const contractOptions = [
    { labelKey: "deposit.contract6Months", value: "6 Months" },
    { labelKey: "deposit.contract1Year", value: "1 Year" },
    { labelKey: "deposit.contract2Years", value: "2 Years" },
  ];

  const handleContinue = () => {
    if (!contractPeriod) {
      setAlertConfig({
        title: t("deposit.selectContract"),
        message: t("deposit.selectContractPeriod"),
      });
      setShowAlertModal(true);
      return;
    }

    navigation.navigate("TimeDepositAmount", {
      depositMethod,
      contractPeriod,
      currency: selectedCurrency,
    });
  };

  const getSelectedCurrency = () => {
    return currencies.find((c) => c.code === selectedCurrency) || currencies[0];
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("deposit.depositRequest")}</Text>

          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.stepLine} />
            <View
              style={[
                styles.stepCircle,
                currentStep >= 2 && styles.stepActive,
              ]}>
              {currentStep >= 2 ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : null}
            </View>
            <View style={styles.stepLine} />
            <View
              style={[styles.stepCircle, currentStep >= 3 && styles.stepActive]}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("deposit.timeDeposit")}</Text>
            <Text style={styles.subtitle}>
              {t("deposit.timeDepositMinShort")}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.leftBorder} />

            {/* Deposit Method */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={20}
                    color="#E25A17"
                  />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("deposit.depositMethod")}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.radioOption,
                  depositMethod === "Request Amount" &&
                    styles.radioOptionSelected,
                ]}
                onPress={() => setDepositMethod("Request Amount")}>
                <View style={styles.radioCircle}>
                  {depositMethod === "Request Amount" && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>
                  {t("investment.requestAmount")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioOption,
                  depositMethod === "Available Balance" &&
                    styles.radioOptionSelected,
                ]}
                onPress={() => setDepositMethod("Available Balance")}>
                <View style={styles.radioCircle}>
                  {depositMethod === "Available Balance" && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>
                  {t("investment.availableBalance")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Select Currency */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={20}
                    color="#E25A17"
                  />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("deposit.selectCurrency")}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.currencySelector}
                onPress={() => setShowCurrencyModal(true)}>
                <View style={styles.flagContainer}>
                  <Text style={styles.flagEmoji}>
                    {getSelectedCurrency().flag}
                  </Text>
                </View>
                <Text style={styles.currencyText}>
                  {getSelectedCurrency().code}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Contract Period */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={20}
                    color="#E25A17"
                  />
                </View>
                <Text style={styles.sectionTitle}>
                  {t("deposit.contractPeriod")}
                </Text>
              </View>

              {contractOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.contractOption,
                    contractPeriod === option.value &&
                      styles.contractOptionSelected,
                  ]}
                  onPress={() => setContractPeriod(option.value)}>
                  <Text style={styles.contractLabel}>{t(option.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}>
            <LinearGradient
              colors={["#E25A17", "#F28934"]}
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Text style={styles.continueText}>{t("deposit.continue")}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Currency Selector Modal */}
        <Modal
          visible={showCurrencyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCurrencyModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("deposit.selectCurrency")}
                </Text>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {currencies.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      selectedCurrency === currency.code &&
                        styles.currencyOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedCurrency(currency.code);
                      setShowCurrencyModal(false);
                    }}>
                    <Text style={styles.currencyFlag}>{currency.flag}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                    </View>
                    {selectedCurrency === currency.code && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#E25A17"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Custom Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}>
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowAlertModal(false)}>
                <Text style={styles.alertButtonText}>{t("deposit.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#E25A17",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  radioOptionSelected: {
    backgroundColor: "#FFF5F0",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E25A17",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E25A17",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  flagContainer: {
    marginRight: 8,
  },
  flagEmoji: {
    fontSize: 20,
  },
  currencyText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  contractOption: {
    backgroundColor: "#F9F9F9",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  contractOptionSelected: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E25A17",
  },
  contractLabel: {
    fontSize: 14,
    color: "#333",
  },
  continueButton: {
    marginTop: 24,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
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
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9F9F9",
  },
  currencyOptionSelected: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E25A17",
  },
  currencyFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 13,
    color: "#666",
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.95,
  },
  alertButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
});
