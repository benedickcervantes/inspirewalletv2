import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

export interface TravelProtectFinanInfoProps {
  sourceOfFund: string;
  setSourceOfFund: (value: string) => void;
  grossMonthlyIncome: string;
  setGrossMonthlyIncome: (value: string) => void;
  cashOnHand: string;
  setCashOnHand: (value: string) => void;
}

export default function TravelProtectFinanInfo({
  sourceOfFund,
  setSourceOfFund,
  grossMonthlyIncome,
  setGrossMonthlyIncome,
  cashOnHand,
  setCashOnHand,
}: TravelProtectFinanInfoProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={24}
            color="#E25A17"
          />
        </View>
        <View>
          <Text style={styles.formTitle}>{t("travel.financialInfo")}</Text>
          <Text style={styles.formSubtitle}>
            {t("travel.financialSubtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.sourceOfFund")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t("travel.placeholderSourceOfFund")}
          placeholderTextColor="#999"
          value={sourceOfFund}
          onChangeText={setSourceOfFund}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.grossMonthlyIncome")}{" "}
          <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#999"
          value={grossMonthlyIncome}
          onChangeText={setGrossMonthlyIncome}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.cashOnHand")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#999"
          value={cashOnHand}
          onChangeText={setCashOnHand}
          keyboardType="numeric"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E25A17",
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
});
