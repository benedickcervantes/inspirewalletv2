import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLanguageCode } from "../../../constants/locales";
import { useLanguage } from "../../../context/LanguageContext";

export default function DepositReceipt() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const params = (route.params || {}) as {
    transactionId?: string;
    amount?: string;
    currency?: string;
    depositMethod?: string;
    contractPeriod?: string;
    type?: string; 
    date?: string;
    successMessage?: string;
    source?: string;
  };

  const {
    transactionId = t("investment.pending"),
    amount = "0",
    currency = "PHP",
    depositMethod = "",
    contractPeriod,
    type = "Deposit",
    date = new Date().toLocaleString(),
    successMessage,
    source,
  } = params;

  const languageCode = getLanguageCode(language);
  const localeByLanguageCode: Record<string, string> = {
    en: "en-PH",
    ko: "ko-KR",
    ja: "ja-JP",
    ar: "ar-SA",
  };
  const locale = localeByLanguageCode[languageCode] ?? "en-PH";

  const getReceiptTypeLabel = () => {
    const normalized = String(type ?? "").trim().toLowerCase();
    if (normalized === "transfer") return t("tx.transfer");
    if (normalized === "withdrawal") return t("tx.withdraw");
    return t("tx.deposit");
  };

  const getSuccessSubtitle = () => {
    if (successMessage) return successMessage;
    if (String(type).trim().toLowerCase() === "time deposit") {
      return t("deposit.timeDepositSuccessMessage");
    }
    return t("deposit.uploadSuccessMessage");
  };

  const handleClose = () => {
    if (source === "history") {
      if (navigation.canGoBack?.()) {
        navigation.goBack();
      } else {
        navigation.navigate("history");
      }
      return;
    }
    // Navigate back to main Dashboard for non-history flows
    navigation.navigate("Main");
  };

  const logoWidth = Math.min(220, width * 0.55);
  const logoHeight = Math.round(logoWidth * (72 / 200));
  const isSmallScreen = width <= 375 || height <= 700;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#E25A17", "#F28934"]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={[styles.closeButton, { top: Math.max(insets.top + 8, 16), right: 12 }]}
          onPress={handleClose}
        >
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 48, 64),
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
        <View style={[styles.content, isSmallScreen && styles.contentSmall]}>
            <Image
              source={require("../../../assets/images/InpireLogo.png")}
              style={[styles.logo, { width: logoWidth, height: logoHeight }]}
              resizeMode="contain"
            />

          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={isSmallScreen ? 68 : 80} color="#FFFFFF" />
          </View>
          
          <Text style={[styles.successTitle, isSmallScreen && styles.successTitleSmall]}>{t("deposit.success")}</Text>
          <Text style={[styles.successSubtitle, isSmallScreen && styles.successSubtitleSmall]}>
            {getSuccessSubtitle()}
          </Text>

          <View style={[styles.cardContainer, isSmallScreen && styles.cardContainerSmall]}>
            <Text style={[styles.receiptHeader, isSmallScreen && styles.receiptHeaderSmall]}>{t("deposit.transactionReceipt")}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{t("history.id")}</Text>
              <Text style={styles.value} numberOfLines={2}>{transactionId}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>{t("investment.amount")}</Text>
              <Text style={styles.value}>
                {currency === "PHP" ? "₱" : ""}
                {Number(amount).toLocaleString(locale, { minimumFractionDigits: 2 })}
                {currency !== "PHP" ? ` ${currency}` : ""}
              </Text>
            </View>

            {contractPeriod && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.label}>{t("deposit.contractPeriod")}</Text>
                  <Text style={styles.value} numberOfLines={2}>{contractPeriod}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>
                {String(type).trim().toLowerCase() === "transfer"
                  ? t("sendMoney.from") 
                  : String(type).trim().toLowerCase() === "withdrawal"
                    ? t("withdraw.withdrawalMethod") 
                    : t("deposit.depositMethod")}
              </Text>
              <Text style={styles.value} numberOfLines={2}>
                {depositMethod || (
                  String(type).trim().toLowerCase() === "transfer" ? t("sendMoney.availableBalance") :
                  String(type).trim().toLowerCase() === "withdrawal" ? t("withdraw.bankTransfer") :
                  getReceiptTypeLabel()
                )}
              </Text>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>{t("history.date") || "Date"}</Text>
              <Text style={styles.value} numberOfLines={2}>{date}</Text>
            </View>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E25A17",
  },
  gradientBackground: {
    flex: 1,
    paddingHorizontal: 14,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  contentSmall: {
    justifyContent: "flex-start",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
  },
  logo: {
    marginBottom: 40,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  successTitleSmall: {
    fontSize: 24,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    marginBottom: 36,
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  successSubtitleSmall: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  cardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    maxWidth: 400,
  },
  cardContainerSmall: {
    padding: 14,
    borderRadius: 14,
  },
  receiptHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  receiptHeaderSmall: {
    fontSize: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    flex: 1,
    paddingRight: 6,
  },
  value: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    maxWidth: "58%",
    textAlign: "right",
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 12,
  },
});
