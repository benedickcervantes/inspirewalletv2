import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/LanguageContext";
import ActivityModal from '../../components/ActivityModal';
export default function TimeDepositConfirm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params || {}) as {
    depositMethod?: string;
    contractPeriod?: string;
    amount?: string;
    submittedCryptoAmount?: string;
    cryptoType?: "BTC" | "ETH" | "USDT";
    amountInPhp?: number;
    currency?: string;
  };

  const [loading, setLoading] = useState(false);
  const [showEmailSentModal, setShowEmailSentModal] = useState(false);

  const depositMethod = params.depositMethod || "Request Amount";
  const contractPeriod = params.contractPeriod || "";
  const amount = params.amount || "0";
  const submittedCryptoAmount = params.submittedCryptoAmount || amount;
  const cryptoType = params.cryptoType;
  const isCryptoDeposit = depositMethod === "Crypto Deposit";
  const amountInPhp = params.amountInPhp ?? (parseFloat(amount) || 0);
  const currency = params.currency || "PHP";

  const shouldShowBankDetailsModal =
    depositMethod !== "Available Balance" && 
    depositMethod !== "available_balance" && 
    !isCryptoDeposit;

  const getMaturityDate = () => {
    const months =
      contractPeriod === "6 Months" ? 6 : contractPeriod === "1 Year" ? 12 : 24;
    return t("deposit.months", { count: String(months) });
  };

  const createRequestAndGoToFinalStep = () => {
    navigation.navigate("TimeDepositProof", {
      amount,
      currency,
      depositMethod,
      contractPeriod,
      amountInPhp,
      submittedCryptoAmount,
      cryptoType: cryptoType as "BTC" | "ETH" | "USDT" | undefined,
    });
  };


  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (shouldShowBankDetailsModal) {
        setShowEmailSentModal(true);
        return;
      }
      await createRequestAndGoToFinalStep();
    } catch (error) {
      console.error("Error moving to final step:", error);
    } finally {
      setLoading(false);
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
          end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("deposit.depositRequest")}</Text>

        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepCircle} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("deposit.reviewConfirm")}</Text>
            <Text style={styles.subtitle}>{t("deposit.reviewDetails")}</Text>
          </View>

          <LinearGradient
            colors={["#F28934", "#E25A17"]}
            style={styles.amountCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}>
            <Text style={styles.amountCardTitle}>
              {t("deposit.investmentAmount")}
            </Text>
            <View style={styles.amountDisplay}>
              <Text style={styles.amountValue}>
                ₱ {amountInPhp.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              {isCryptoDeposit && (
                <Text style={styles.phpEquivalentText}>
                  Funded with {Number(submittedCryptoAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} {cryptoType || currency}
                </Text>
              )}
              {!isCryptoDeposit && currency !== "PHP" && amountInPhp !== parseFloat(amount) && (
                <Text style={styles.phpEquivalentText}>
                  ≈ {Number(amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} {currency}
                </Text>
              )}
            </View>
          </LinearGradient>

          {/* Deposit Details Container */}
          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t("deposit.depositType")}</Text>
              <Text style={styles.detailValue}>{t("deposit.timeDeposit")}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                {t("deposit.contractPeriod")}
              </Text>
              <Text style={styles.detailValue}>{contractPeriod}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                {t("deposit.depositMethod")}
              </Text>
              <Text style={styles.detailValue}>{depositMethod}</Text>
            </View>
          </View>

          {/* Deposit Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {t("deposit.depositSummary")}
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  {t("deposit.principalAmount")}
                </Text>
                <Text style={styles.summaryValue}>
                  ₱ {amountInPhp.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("deposit.maturity")}</Text>
                <Text style={styles.summaryValue}>{getMaturityDate()}</Text>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>{t("deposit.status")}</Text>
              <Text style={styles.statusValue}>{t("investment.pending")}</Text>
            </View>
          </View>



          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{t("deposit.back")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={loading}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.confirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.confirmText}>
                  {loading ? t("deposit.processing") : t("deposit.continue")}
                </Text>
                {!loading && (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Bank Details Sent Modal */}
        <ActivityModal
          visible={showEmailSentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEmailSentModal(false)}>
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}>
              <Text style={styles.alertTitle}>
                {t("deposit.bankDetailsSentTitle")}
              </Text>
              <Text style={styles.alertMessage}>
                {t("deposit.bankDetailsSentMessage")}
              </Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={async () => {
                  setShowEmailSentModal(false);
                  setLoading(true);
                  try {
                    await createRequestAndGoToFinalStep();
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}>
                <Text style={styles.alertButtonText}>{t("deposit.ok")}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ActivityModal>
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
  stepLineActive: {
    backgroundColor: "#E25A17",
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
  detailsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  detailItem: {
    marginBottom: 18,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  detailValue: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  amountCard: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  amountCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  amountDisplay: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: "100%",
    alignItems: "center",
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  phpEquivalentText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    fontWeight: "500",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#B71C1C",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#B71C1C",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  statusContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statusLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF50",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    backgroundColor: "#E25A17",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 20,
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
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
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
