import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../../context/LanguageContext";

export default function DepositReceipt() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t } = useLanguage();

  const params = (route.params || {}) as {
    transactionId?: string;
    amount?: string;
    currency?: string;
    depositMethod?: string;
    contractPeriod?: string;
    type?: string; 
    date?: string;
    successMessage?: string;
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
  } = params;

  const handleClose = () => {
    // Navigate back to main Dashboard
    navigation.navigate("Main"); 
  };

  const { width } = Dimensions.get("window");
  const logoWidth = Math.min(220, width * 0.55);
  const logoHeight = Math.round(logoWidth * (72 / 200));

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#E25A17", "#F28934"]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Image
            source={require("../../../assets/images/InpireLogo.png")}
            style={[styles.logo, { width: logoWidth, height: logoHeight }]}
            resizeMode="contain"
          />

          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#FFFFFF" />
          </View>
          
          <Text style={styles.successTitle}>{t("deposit.success")}</Text>
          <Text style={styles.successSubtitle}>
            {successMessage || (type === "Time Deposit" ? t("deposit.timeDepositSuccessMessage") : t("deposit.uploadSuccessMessage"))}
          </Text>

          <View style={styles.cardContainer}>
            <Text style={styles.receiptHeader}>{t("deposit.transactionReceipt")}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{t("history.id")}</Text>
              <Text style={styles.value}>{transactionId}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>{t("investment.amount")}</Text>
              <Text style={styles.value}>
                {currency === "PHP" ? "₱" : ""}
                {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {currency !== "PHP" ? ` ${currency}` : ""}
              </Text>
            </View>

            {contractPeriod && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.label}>{t("deposit.contractPeriod")}</Text>
                  <Text style={styles.value}>{contractPeriod}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>{t("deposit.depositMethod")}</Text>
              <Text style={styles.value}>{depositMethod}</Text>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>{t("history.date") || "Date"}</Text>
              <Text style={styles.value}>{date}</Text>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 20,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
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
  successSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    marginBottom: 36,
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  cardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  receiptHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 12,
  },
});
