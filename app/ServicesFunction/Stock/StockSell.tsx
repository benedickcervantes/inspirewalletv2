import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getWallets, submitStockSellRequest } from "../../../configs/api";
import { getStockInvestmentMinAmount } from "../../../configs/currencies";
import { useLanguage } from "../../../context/LanguageContext";

import ActivityModal from '../../components/ActivityModal';
const THEME_COLOR = "#E15816";
const STOCK_RATE_DEFAULT = 2_000_000;

type Step = "form" | "confirm";

export default function StockSell() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const isMediumScreen = width >= 360 && width < 400;
  const horizontalPadding = isSmallScreen ? 12 : isMediumScreen ? 16 : 20;
  const fontScale = isSmallScreen ? 0.9 : isMediumScreen ? 0.95 : 1;
  const contentPadding = isSmallScreen ? 14 : isMediumScreen ? 18 : 20;
  const params = (route.params || {}) as {
    stockCount?: number;
    totalPortfolioValue?: number;
  };
  const stockCount = params.stockCount ?? 0;
  const totalPortfolioValue = params.totalPortfolioValue ?? 0;

  const [step, setStep] = useState<Step>("form");
  const [stocksToSell, setStocksToSell] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stockRate, setStockRate] = useState(STOCK_RATE_DEFAULT);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });
  const [navigateAfterAlert, setNavigateAfterAlert] = useState(false);

  useEffect(() => {
    getStockInvestmentMinAmount().then((rate) => setStockRate(rate));
  }, []);

  const [sellPct, setSellPct] = useState(0); // 0‒100
  const sliderWidth = useRef(0);

  // Keep stocksToSell in sync with slider percentage
  const stocksFromSlider = (pct: number) =>
    parseFloat(((pct / 100) * stockCount).toFixed(8));

  const handlePctChange = (pct: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(pct)));
    setSellPct(clamped);
    setStocksToSell(stocksFromSlider(clamped).toString());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        if (sliderWidth.current > 0) {
          const pct = (gs.x0 / sliderWidth.current) * 100;
          handlePctChange(pct);
        }
      },
      onPanResponderMove: (_, gs) => {
        if (sliderWidth.current > 0) {
          const pct = (gs.moveX / sliderWidth.current) * 100;
          handlePctChange(pct);
        }
      },
    }),
  ).current;

  const stocksNum = parseFloat(stocksToSell) || 0;
  const sellAmount = stocksNum * stockRate;

  const handleContinue = () => {
    if (stocksNum <= 0) {
      setAlertConfig({
        title: t("stock.invalidAmountTitle"),
        message: t("stock.invalidAmountMessage"),
      });
      setShowAlertModal(true);
      return;
    }
    if (stocksNum > stockCount) {
      setAlertConfig({
        title: t("stock.insufficientStocksTitle"),
        message: t("stock.insufficientStocksMessage", { count: String(stockCount) }),
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
          title: t("stock.notAuthenticatedTitle"),
          message: t("stock.notAuthenticatedMessage"),
        });
        setShowAlertModal(true);
        return;
      }

      // Find the user's STOCK wallet (not PHP) — sell request must reference the STOCK wallet
      const walletsRes = await getWallets(accessToken);
      const wallets = walletsRes?.wallets ?? [];
      const stockWallet = Array.isArray(wallets)
        ? wallets.find(
            (w: { currency?: { code?: string }; currencyCode?: string }) =>
              (w.currency?.code ?? w.currencyCode) === "STOCK",
          )
        : null;

      if (!stockWallet?.id) {
        setAlertConfig({
          title: t("stock.walletNotFoundTitle"),
          message: t("stock.walletNotFoundMessage"),
        });
        setShowAlertModal(true);
        return;
      }

      const result = await submitStockSellRequest(accessToken, {
        walletId: stockWallet.id,
        stocksToSell: Math.round(stocksNum * 10000) / 10000, // round to 4 decimal places
      });

      if (result.success) {
        setAlertConfig({
          title: t("stock.requestSubmittedTitle"),
          message: t("stock.requestSubmittedMessage"),
        });
        setNavigateAfterAlert(true);
        setShowAlertModal(true);
      } else {
        setNavigateAfterAlert(false);
        setAlertConfig({
          title: t("stock.submissionFailedTitle"),
          message: result.error ?? t("stock.submissionFailed"),
        });
        setShowAlertModal(true);
      }
    } catch (err) {
      setAlertConfig({
        title: t("common.error"),
        message: t("stock.unexpectedError"),
      });
      setNavigateAfterAlert(false);
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header - same design as Deposit Request */}
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { fontSize: Math.round(18 * fontScale) },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t("stock.stockSellRequest")}
          </Text>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.pageSkeletonContainer}>
            <View style={styles.pageSkeletonBar} />
            <View style={styles.pageSkeletonCard}>
              <View style={styles.pageSkeletonLineLong} />
              <View style={styles.pageSkeletonLineShort} />
            </View>
            <View style={styles.pageSkeletonCard}>
              <View style={styles.pageSkeletonLineMedium} />
              <View style={styles.pageSkeletonLineLong} />
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.progressContainer,
            { paddingHorizontal: isSmallScreen ? 24 : 40 },
          ]}
        >
          <View style={styles.stepIndicator}>
            <View
              style={[
                styles.stepCircle,
                styles.stepActive,
                {
                  width: isSmallScreen ? 28 : 32,
                  height: isSmallScreen ? 28 : 32,
                  borderRadius: isSmallScreen ? 14 : 16,
                },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={isSmallScreen ? 14 : 16}
                color="#FFFFFF"
              />
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
                {
                  width: isSmallScreen ? 28 : 32,
                  height: isSmallScreen ? 28 : 32,
                  borderRadius: isSmallScreen ? 14 : 16,
                },
              ]}
            >
              {step === "confirm" ? (
                <MaterialCommunityIcons
                  name="lock"
                  size={isSmallScreen ? 14 : 16}
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    { fontSize: Math.round(14 * fontScale) },
                  ]}
                >
                  2
                </Text>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {step === "form" ? (
            <>
              <View
                style={[
                  styles.titleContainer,
                  { marginBottom: isSmallScreen ? 18 : 24 },
                ]}
              >
                <Text
                  style={[
                    styles.title,
                    { fontSize: Math.round(22 * fontScale) },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {t("stock.stockSell")}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { fontSize: Math.round(14 * fontScale) },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {t("stock.youHave")} {stockCount}{" "}
                  {stockCount !== 1 ? t("stock.stocks") : t("stock.stock")}{" "}
                  {t("stock.available")}
                </Text>
              </View>

              {/* ── Percentage Slider Card ── */}
              <View
                style={[
                  styles.formCard,
                  {
                    padding: contentPadding,
                    marginBottom: isSmallScreen ? 18 : 24,
                    borderRadius: isSmallScreen ? 12 : 16,
                  },
                ]}
              >
                <View style={styles.leftBorder} />

                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        width: isSmallScreen ? 28 : 32,
                        height: isSmallScreen ? 28 : 32,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="percent"
                      size={isSmallScreen ? 16 : 18}
                      color="#E25A17"
                    />
                  </View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { fontSize: Math.round(15 * fontScale) },
                    ]}
                  >
                    {t("stock.percentageToSell")}
                  </Text>
                </View>

                {/* Big % display */}
                <View style={styles.pctDisplay}>
                  <Text style={styles.pctValue}>{sellPct}</Text>
                  <Text style={styles.pctSymbol}>%</Text>
                </View>

                {/* Slider track */}
                <View
                  style={styles.sliderTrack}
                  onLayout={(e) => {
                    sliderWidth.current = e.nativeEvent.layout.width;
                  }}
                  {...panResponder.panHandlers}
                >
                  <View style={[styles.sliderFill, { width: `${sellPct}%` }]} />
                  <View style={[styles.sliderThumb, { left: `${sellPct}%` }]} />
                </View>

                {/* Quick-pick buttons */}
                <View style={styles.quickPick}>
                  {[25, 50, 75, 100].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={[
                        styles.quickBtn,
                        sellPct === pct && styles.quickBtnActive,
                      ]}
                      onPress={() => handlePctChange(pct)}
                    >
                      <Text
                        style={[
                          styles.quickBtnText,
                          sellPct === pct && styles.quickBtnTextActive,
                        ]}
                      >
                        {pct === 100 ? t("stock.all") : `${pct}%`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Live preview */}
                <View style={styles.previewRow}>
                  <View style={styles.previewCol}>
                    <Text style={styles.previewLabel}>{t("stock.stocksLabel")}</Text>
                    <Text style={styles.previewVal}>
                      {stocksNum.toFixed(8).replace(/\.?0+$/, "") || "0"}
                    </Text>
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewCol}>
                    <Text style={styles.previewLabel}>{t("stock.youReceive")}</Text>
                    <Text style={[styles.previewVal, { color: "#22c55e" }]}>
                      ₱
                      {(stocksNum * stockRate).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>

                {/* Manual input for precision */}
                <View style={styles.manualRow}>
                  <Text style={styles.manualLabel}>{t("stock.enterExactAmount")}</Text>
                  <View
                    style={[
                      styles.amountInput,
                      { paddingHorizontal: isSmallScreen ? 12 : 16 },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.input,
                        {
                          fontSize: Math.round(14 * fontScale),
                          paddingVertical: isSmallScreen ? 10 : 12,
                        },
                      ]}
                      placeholder="0.00000000"
                      placeholderTextColor="#bbb"
                      keyboardType="decimal-pad"
                      value={stocksToSell}
                      onChangeText={(v) => {
                        setStocksToSell(v);
                        const n = parseFloat(v) || 0;
                        const pct =
                          stockCount > 0
                            ? Math.min(100, Math.round((n / stockCount) * 100))
                            : 0;
                        setSellPct(pct);
                      }}
                    />
                    <Text style={{ color: "#999", fontSize: 12 }}>STK</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  stocksNum <= 0 && { opacity: 0.5 },
                ]}
                onPress={handleContinue}
                disabled={stocksNum <= 0}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={[
                    styles.continueGradient,
                    { paddingVertical: isSmallScreen ? 14 : 18 },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text
                    style={[
                      styles.continueText,
                      { fontSize: Math.round(18 * fontScale) },
                    ]}
                  >
                    {t("deposit.continue")}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={isSmallScreen ? 18 : 20}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.titleContainer,
                  { marginBottom: isSmallScreen ? 18 : 24 },
                ]}
              >
                <Text
                  style={[
                    styles.title,
                    { fontSize: Math.round(22 * fontScale) },
                  ]}
                  numberOfLines={2}
                >
                  {t("deposit.reviewConfirm")}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { fontSize: Math.round(14 * fontScale) },
                  ]}
                >
                  {t("deposit.reviewDetails")}
                </Text>
              </View>

              <View
                style={[
                  styles.detailCard,
                  {
                    padding: contentPadding,
                    marginBottom: isSmallScreen ? 12 : 16,
                    borderRadius: isSmallScreen ? 12 : 16,
                  },
                ]}
              >
                <View style={styles.leftBorder} />
                <Text style={styles.detailLabel}>{t("stock.stocksToSell")}</Text>
                <Text style={styles.detailValue}>
                  {stocksNum % 1 === 0 ? stocksNum : stocksNum.toFixed(4)}{" "}
                  {t("stock.stockUnit")}
                </Text>
              </View>

              <LinearGradient
                colors={["#F28934", "#E25A17"]}
                style={[
                  styles.amountCard,
                  {
                    padding: isSmallScreen ? 18 : 24,
                    marginBottom: isSmallScreen ? 18 : 24,
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Text
                  style={[
                    styles.amountCardTitle,
                    { fontSize: Math.round(14 * fontScale) },
                  ]}
                >
                  {t("deposit.investmentAmount")}
                </Text>
                <Text
                  style={[
                    styles.amountValue,
                    { fontSize: Math.round(22 * fontScale) },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  ₱{" "}
                  {sellAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  PHP
                </Text>
              </LinearGradient>

              <View
                style={[
                  styles.buttonContainer,
                  { gap: isSmallScreen ? 8 : 12 },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.backButtonBottom,
                    { paddingVertical: isSmallScreen ? 14 : 16, minWidth: 0 },
                  ]}
                  onPress={handleBack}
                >
                  <Text
                    style={[
                      styles.backButtonText,
                      { fontSize: Math.round(18 * fontScale) },
                    ]}
                    numberOfLines={1}
                  >
                    {t("deposit.back")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, { minWidth: 0 }]}
                  onPress={handleConfirm}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={[
                      styles.confirmGradient,
                      { paddingVertical: isSmallScreen ? 14 : 18 },
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text
                      style={[
                        styles.confirmText,
                        { fontSize: Math.round(18 * fontScale) },
                      ]}
                      numberOfLines={1}
                    >
                      {t("deposit.confirm")}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={isSmallScreen ? 18 : 20}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Alert Modal */}
        <ActivityModal
          visible={showAlertModal}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={[
                styles.alertContainer,
                {
                  padding: isSmallScreen ? 18 : 24,
                  marginHorizontal: horizontalPadding,
                },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => {
                  setShowAlertModal(false);
                  if (navigateAfterAlert) {
                    setNavigateAfterAlert(false);
                    (navigation as any).reset({
                      index: 1,
                      routes: [{ name: "Main" }, { name: "Stockholder" }],
                    });
                  }
                }}
              >
                <Text style={styles.alertButtonText}>{t("common.ok")}</Text>
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
  pageSkeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  pageSkeletonBar: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ECECEC",
  },
  pageSkeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  pageSkeletonLineLong: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "100%",
  },
  pageSkeletonLineMedium: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "82%",
  },
  pageSkeletonLineShort: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "60%",
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
    backgroundColor: "#E25A17",
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
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  amountCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  amountCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
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
  // ─── Slider ─────────────────────────────────────────────
  pctDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginVertical: 12,
  },
  pctValue: {
    fontSize: 52,
    fontWeight: "800",
    color: "#E25A17",
    lineHeight: 56,
  },
  pctSymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 8,
    marginLeft: 2,
  },
  sliderTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F0E8E4",
    marginHorizontal: 0,
    marginBottom: 4,
    position: "relative",
    justifyContent: "center",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: "#E25A17",
  },
  sliderThumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E25A17",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    marginLeft: -11,
    top: -6,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  // ─── Quick-pick ─────────────────────────────────────────
  quickPick: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E25A17",
    alignItems: "center",
  },
  quickBtnActive: {
    backgroundColor: "#E25A17",
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E25A17",
  },
  quickBtnTextActive: {
    color: "#FFFFFF",
  },
  // ─── Preview ────────────────────────────────────────────
  previewRow: {
    flexDirection: "row",
    backgroundColor: "#FFF8F5",
    borderRadius: 10,
    marginTop: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F5DDD2",
  },
  previewCol: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  previewDivider: {
    width: 1,
    backgroundColor: "#F5DDD2",
  },
  previewLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewVal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  // ─── Manual input ────────────────────────────────────────
  manualRow: {
    marginTop: 16,
  },
  manualLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
  },
});
