import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getWallets, submitStockSellRequest } from "../../../configs/api";
import CustomLoader from "../../Loader/CustomLoader";

const THEME_COLOR = "#E15816";
const STOCK_RATE_PHP = 2_000_000;

type Step = "form" | "confirm";

export default function StockSell() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as {
    stockCount?: number;
    totalPortfolioValue?: number;
  };
  const stockCount = params.stockCount ?? 0;
  const totalPortfolioValue = params.totalPortfolioValue ?? 0;

  const [step, setStep] = useState<Step>("form");
  const [stocksToSell, setStocksToSell] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });

  const stocksNum = parseInt(stocksToSell, 10) || 0;
  const sellAmount = stocksNum * STOCK_RATE_PHP;

  const handleContinue = () => {
    if (stocksNum <= 0) {
      setAlertConfig({
        title: "Invalid Amount",
        message: "Please enter a valid number of stocks to sell.",
      });
      setShowAlertModal(true);
      return;
    }
    if (stocksNum > stockCount) {
      setAlertConfig({
        title: "Insufficient Stocks",
        message: `You only have ${stockCount} stock(s). Please enter a number less than or equal to ${stockCount}.`,
      });
      setShowAlertModal(true);
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setAlertConfig({
          title: "Not Authenticated",
          message: "Please log in and try again.",
        });
        setShowAlertModal(true);
        return;
      }

      // Fetch the user's PHP wallet to get walletId
      const walletsRes = await getWallets(accessToken);
      const wallets = walletsRes?.wallets ?? [];
      const phpWallet = Array.isArray(wallets)
        ? wallets.find(
            (w: { currency?: { code?: string }; currencyCode?: string }) =>
              (w.currency?.code ?? w.currencyCode) === "PHP",
          )
        : null;

      if (!phpWallet?.id) {
        setAlertConfig({
          title: "Wallet Not Found",
          message: "Could not find your PHP wallet. Please try again.",
        });
        setShowAlertModal(true);
        return;
      }

      const result = await submitStockSellRequest(accessToken, {
        walletId: phpWallet.id,
        stocksToSell: stocksNum,
      });

      if (result.success) {
        setAlertConfig({
          title: "Request Submitted",
          message:
            "Your sell request has been submitted. You will be notified when it is processed.",
        });
        setShowAlertModal(true);
        setTimeout(() => {
          setShowAlertModal(false);
          navigation.navigate("Stockholder" as never);
        }, 2000);
      } else {
        setAlertConfig({
          title: "Submission Failed",
          message: result.error ?? "Something went wrong. Please try again.",
        });
        setShowAlertModal(true);
      }
    } catch (err) {
      setAlertConfig({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
      });
      setShowAlertModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("form");
    } else {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return <CustomLoader text={t("stock.processing")} />;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={["#C62828", "#E25A17"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === "form" ? "Sell Stocks" : "Confirm Sale"}
          </Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View
              style={[
                styles.stepLine,
                step === "confirm" && styles.stepLineActive,
              ]}
            />
            <View
              style={[
                styles.stepCircle,
                step === "confirm" && styles.stepActive,
              ]}
            >
              {step === "confirm" ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text style={styles.stepNumber}>2</Text>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === "form" ? (
            <>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Sell Your Stocks</Text>
                <Text style={styles.subtitle}>
                  You have {stockCount} stock(s) available · Enter amount below
                </Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.leftBorder} />
                <View style={styles.formSection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.iconBox}>
                      <MaterialCommunityIcons
                        name="chart-line"
                        size={20}
                        color={THEME_COLOR}
                      />
                    </View>
                    <Text style={styles.sectionTitle}>Stocks to Sell *</Text>
                  </View>
                  <View style={styles.amountInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter number of stocks"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={stocksToSell}
                      onChangeText={setStocksToSell}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.continueGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.continueText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Review & Confirm</Text>
                <Text style={styles.subtitle}>
                  Review your sell details before confirming
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.leftBorder} />
                <Text style={styles.detailLabel}>Stocks to Sell</Text>
                <Text style={styles.detailValue}>{stocksNum} Stock(s)</Text>
              </View>

              <LinearGradient
                colors={["#F28934", "#E25A17"]}
                style={styles.amountCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Text style={styles.amountCardTitle}>Total Amount</Text>
                <Text style={styles.amountValue}>
                  ₱
                  {sellAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </LinearGradient>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButtonBottom}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.confirmGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmText}>Confirm</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowAlertModal(false)}
              >
                <Text style={styles.alertButtonText}>OK</Text>
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
  headerSpacer: {
    width: 40,
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
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
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
    textAlign: "center",
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
    marginBottom: 24,
  },
  leftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME_COLOR,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  formSection: {
    marginBottom: 0,
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
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  continueButton: {
    marginTop: 8,
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
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  amountCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  amountCardTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
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
    color: THEME_COLOR,
  },
});
