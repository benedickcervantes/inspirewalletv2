import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/LanguageContext";

export default function DepositIndex() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset loading when user navigates back to this screen
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
    }, [])
  );

  const depositTypes = [
    {
      id: "timedeposit",
      titleKey: "deposit.timeDeposit",
      subtitleKey: "deposit.timeDepositMin",
      icon: "time-outline" as const,
      route: "/timedeposit",
    },
    {
      id: "stock",
      titleKey: "deposit.stockInvestment",
      subtitleKey: "deposit.stockInvestmentMin",
      icon: "bar-chart-outline" as const,
      route: "/stockinvestment",
    },
    {
      id: "topup",
      titleKey: "deposit.topUpBalance",
      subtitleKey: "deposit.topUpBalance",
      icon: "wallet-outline" as const,
      route: "/topup",
    },
  ] as const;

  const handleContinue = () => {
    if (!selectedType || loading) return;
    setLoading(true);
    const selected = depositTypes.find((type) => type.id === selectedType);
    if (selected) {
      const screenName = selected.route.replace(/^\//, "");
      (navigation as { navigate: (name: string) => void }).navigate(screenName);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>{t("deposit.depositRequest")}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon Circle */}
          <View style={styles.iconCircle}>
            <Ionicons name="trending-up" size={48} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t("deposit.selectDepositType")}</Text>
          <Text style={styles.subtitle}>{t("deposit.chooseInvestmentType")}</Text>

          {/* Deposit Type Options */}
          <View style={styles.optionsContainer}>
            {depositTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionCard,
                  selectedType === type.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={styles.optionIconCircle}>
                  <Ionicons name={type.icon} size={32} color="#E25A17" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{t(type.titleKey)}</Text>
                  <Text style={styles.optionSubtitle}>{t(type.subtitleKey)}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedType === type.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedType === type.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedType || loading) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedType || loading}
          >
            <LinearGradient
              colors={
                selectedType && !loading
                  ? ["#E25A17", "#F28934"]
                  : ["#CCCCCC", "#AAAAAA"]
              }
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.continueText}>{t("deposit.continue")}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E25A17",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionCardSelected: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF5F0",
  },
  optionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  optionSubtitle: {
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
  continueButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.6,
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
});
