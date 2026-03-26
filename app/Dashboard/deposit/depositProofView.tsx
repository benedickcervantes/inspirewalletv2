import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/LanguageContext";

export default function DepositProofView() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();

  const params = (route.params || {}) as {
    requestId?: string;
    amount?: string;
    amountInPhp?: number;
    currency?: string;
    depositMethod?: string;
    contractPeriod?: string;
    type?: string;
    proofUri?: string | null;
  };

  const requestId = params.requestId || t("investment.pending");
  const rawAmount = params.amount || "0";
  const amountInPhp = params.amountInPhp;
  const currency = params.currency || "PHP";
  const depositMethod = params.depositMethod || "-";
  const contractPeriod = params.contractPeriod || "";
  const type = params.type || t("tx.deposit");
  const proofUri = params.proofUri || null;

  const isCryptoDeposit = ["BTC", "ETH", "USDT"].includes(currency);
  const displayAmount = isCryptoDeposit && amountInPhp 
    ? amountInPhp 
    : Number(rawAmount);

  const formattedAmount = `₱ ${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  
  const cryptoSubtitle = isCryptoDeposit 
    ? `Funded with ${rawAmount} ${currency}` 
    : null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
          <View style={styles.pendingCard}>
            <View style={styles.pendingIconWrap}>
              <Ionicons name="time-outline" size={26} color="#E25A17" />
            </View>
            <Text style={styles.pendingTitle}>{t("investment.pending")}</Text>
            <Text style={styles.pendingMessage}>
              Your deposit request is still pending. Please wait for admin
              approval. The official receipt will be available in History once
              approved.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Submitted Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("history.id")}</Text>
              <Text style={styles.infoValue}>{requestId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("deposit.depositType")}</Text>
              <Text style={styles.infoValue}>{type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("deposit.amount")}</Text>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{formattedAmount}</Text>
                {cryptoSubtitle && (
                  <Text style={styles.cryptoSubtitleText}>{cryptoSubtitle}</Text>
                )}
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("deposit.depositMethod")}</Text>
              <Text style={styles.infoValue}>{depositMethod}</Text>
            </View>
            {contractPeriod ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("deposit.contractPeriod")}</Text>
                <Text style={styles.infoValue}>{contractPeriod}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("deposit.proofOfPayment")}</Text>
            {proofUri ? (
              <Image source={{ uri: proofUri }} style={styles.proofImage} />
            ) : (
              <View style={styles.noProofBox}>
                <Ionicons name="image-outline" size={24} color="#999" />
                <Text style={styles.noProofText}>
                  No proof image uploaded for this request.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() =>
              (navigation as { navigate: (name: string) => void }).navigate(
                "Main",
              )
            }
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  safeArea: { flex: 1 },
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
  headerSpacer: { width: 40, height: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 28 },
  pendingCard: {
    backgroundColor: "#FFF5F0",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD8C2",
    padding: 16,
    marginBottom: 16,
  },
  pendingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  pendingMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEEEEE",
  },
  infoLabel: {
    fontSize: 13,
    color: "#777",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "right",
  },
  infoValueContainer: {
    flex: 1.2,
    alignItems: "flex-end",
  },
  cryptoSubtitleText: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
    textAlign: "right",
  },
  proofImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
  },
  noProofBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D8D8D8",
    borderRadius: 10,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noProofText: {
    fontSize: 13,
    color: "#888",
  },
  doneButton: {
    backgroundColor: "#E25A17",
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
