import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useResponsive } from "../../../utils/responsive";
import { formatWholeNumbersOnly } from "../../../utils/numberFormat";

const THEME_COLOR = "#E15816";

const SOURCE_OF_FUND_OPTIONS = [
  "Employment",
  "Business",
  "Investment",
  "Inheritance",
  "Pension",
  "Other",
];

const SOURCE_OF_FUND_KEY: Record<string, string> = {
  Employment: "travel.sourceEmployment",
  Business: "travel.sourceBusiness",
  Investment: "travel.sourceInvestment",
  Inheritance: "travel.sourceInheritance",
  Pension: "travel.sourcePension",
  Other: "travel.sourceOther",
};

export interface TravelProtectFinanInfoProps {
  sourceOfFund: string;
  sourceOfFundError?: string;
  setSourceOfFund: (value: string) => void;
  grossMonthlyIncome: string;
  grossMonthlyIncomeCurrency: string;
  grossMonthlyIncomeError?: string;
  setGrossMonthlyIncome: (value: string) => void;
  setGrossMonthlyIncomeError: (value: string) => void;
  setGrossMonthlyIncomeCurrency: (value: string) => void;
  cashOnHand: string;
  cashOnHandError?: string;
  setCashOnHand: (value: string) => void;
  setCashOnHandError: (value: string) => void;
}

const CURRENCY_OPTIONS = ["PHP", "USD", "EUR", "KRW"];

export default function TravelProtectFinanInfo({
  sourceOfFund,
  sourceOfFundError,
  setSourceOfFund,
  grossMonthlyIncome,
  grossMonthlyIncomeCurrency,
  grossMonthlyIncomeError,
  setGrossMonthlyIncome,
  setGrossMonthlyIncomeError,
  setGrossMonthlyIncomeCurrency,
  cashOnHand,
  cashOnHandError,
  setCashOnHand,
  setCashOnHandError,
}: TravelProtectFinanInfoProps) {
  const { t } = useLanguage();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { isSmallScreen, isTinyScreen } = useResponsive();
  const modalListMaxHeight = Math.min(420, windowHeight * 0.45);
  const [showSourceOfFundModal, setShowSourceOfFundModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const isCompactCurrency = isTinyScreen || isSmallScreen || windowWidth < 390;
  const currencyMinWidth = isTinyScreen ? 96 : isCompactCurrency ? 104 : 112;

  return (
    <View style={styles.formCard} pointerEvents="box-none">
      <View style={styles.formHeader} pointerEvents="box-none">
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={24}
            color={THEME_COLOR}
          />
        </View>
        <View style={styles.formHeaderTextContainer} pointerEvents="box-none">
          <Text style={styles.formTitle}>{t("travel.financialInfo")}</Text>
          <Text style={styles.formSubtitle}>
            {t("travel.financialSubtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.sourceOfFund")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            sourceOfFundError ? styles.inputError : null,
          ]}
          onPress={() => setShowSourceOfFundModal(true)}
        >
          <Text
            style={[
              styles.dropdownText,
              !sourceOfFund && styles.dropdownPlaceholder,
            ]}
          >
            {sourceOfFund
              ? t(SOURCE_OF_FUND_KEY[sourceOfFund] || sourceOfFund)
              : t("travel.selectSourceOfFund")}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>
        {sourceOfFundError ? (
          <Text style={styles.errorText}>{sourceOfFundError}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.grossMonthlyIncome")}{" "}
          <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.incomeRow}>
          <TouchableOpacity
            style={[
              styles.dropdown,
              styles.currencyDropdown,
              { minWidth: currencyMinWidth },
            ]}
            onPress={() => setShowCurrencyModal(true)}
          >
            <Text
              style={[
                styles.dropdownText,
              styles.currencyCodeText,
              isCompactCurrency && styles.currencyCodeTextCompact,
                !grossMonthlyIncomeCurrency && styles.dropdownPlaceholder,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            allowFontScaling={false}
            >
              {grossMonthlyIncomeCurrency
                ? grossMonthlyIncomeCurrency
                : t("travel.selectCurrency")}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={[
                styles.input,
                grossMonthlyIncomeError ? styles.inputError : null,
              ]}
              placeholder="0"
              placeholderTextColor="#999"
              value={grossMonthlyIncome}
              onChangeText={(text) => {
                const formatted = formatWholeNumbersOnly(text);
                setGrossMonthlyIncome(formatted);
                
                // Clear error if input becomes valid
                if (formatted) {
                  const cleanedIncome = formatted.replace(/,/g, "");
                  const incomeNum = parseFloat(cleanedIncome);
                  
                  if (!cleanedIncome.includes(".") && incomeNum >= 0 && Number.isInteger(incomeNum)) {
                    setGrossMonthlyIncomeError("");
                  }
                }
              }}
              keyboardType="numeric"
            />
          </View>
        </View>

        {grossMonthlyIncomeError ? (
          <Text style={styles.errorText}>{grossMonthlyIncomeError}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroup} pointerEvents="box-none">
        <Text style={styles.inputLabel}>
          {t("travel.cashOnHand")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, cashOnHandError ? styles.inputError : null]}
          placeholder="0"
          placeholderTextColor="#999"
          value={cashOnHand}
          onChangeText={(text) => {
            const formatted = formatWholeNumbersOnly(text);
            setCashOnHand(formatted);
            
            // Clear error if input becomes valid
            if (formatted) {
              const cleanedAmount = formatted.replace(/,/g, "");
              const amountNum = parseFloat(cleanedAmount);
              
              if (!cleanedAmount.includes(".") && amountNum >= 0 && Number.isInteger(amountNum)) {
                setCashOnHandError("");
              }
            }
          }}
          keyboardType="numeric"
        />
        {cashOnHandError ? (
          <Text style={styles.errorText}>{cashOnHandError}</Text>
        ) : null}
      </View>

      {/* Source of Fund Modal */}
      <Modal
        visible={showSourceOfFundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourceOfFundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("travel.modalSelectSourceOfFund")}
              </Text>
              <TouchableOpacity onPress={() => setShowSourceOfFundModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.modalContent, { maxHeight: modalListMaxHeight }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {SOURCE_OF_FUND_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    sourceOfFund === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setSourceOfFund(opt);
                    setShowSourceOfFundModal(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {t(SOURCE_OF_FUND_KEY[opt])}
                  </Text>
                  {sourceOfFund === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("travel.modalSelectCurrency")}
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.modalContent, { maxHeight: modalListMaxHeight }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    grossMonthlyIncomeCurrency === opt &&
                      styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setGrossMonthlyIncomeCurrency(opt);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {grossMonthlyIncomeCurrency === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  formHeaderTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
    flexShrink: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  required: {
    color: THEME_COLOR,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    flexShrink: 1,
    maxWidth: "100%",
  },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
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
    maxHeight: "60%",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  optionRowSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  incomeRow: {
    flexDirection: "row",
    gap: 12,
  },
  currencyDropdown: {
    flex: 0,
    minWidth: 100,
    paddingHorizontal: 12,
  },
  currencyCodeText: {
    flex: 0,
    marginRight: 6,
    fontSize: 15,
    fontWeight: "600",
  },
  currencyCodeTextCompact: {
    fontSize: 14,
    marginRight: 4,
  },
  amountInputContainer: {
    flex: 1,
  },
  amountInput: {
    flex: 1,
    flexShrink: 1,
  },

  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
