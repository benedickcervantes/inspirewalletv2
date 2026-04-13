import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import { getTransactions } from "../../../configs/api";
import {
  DEFAULT_TRANSFER_SUCCESS_SOUND,
  getTransferSuccessSound,
  refreshAdminTransferSuccessSound,
} from "../../../constants/adminAudio";
import { getLanguageCode } from "../../../constants/locales";
import { useLanguage } from "../../../context/LanguageContext";

const CRYPTO_MARGIN_MULTIPLIER = 0.99;

const normalizeTextValue = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return "";
  return text;
};

const pickFirstText = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeTextValue(value);
    if (normalized) return normalized;
  }
  return "";
};

const getNameFromParts = (obj: Record<string, unknown>) => {
  const first = normalizeTextValue(obj.firstName ?? obj.first_name);
  const last = normalizeTextValue(obj.lastName ?? obj.last_name);
  return normalizeTextValue([first, last].filter(Boolean).join(" "));
};

const resolveTransferParties = (
  raw: Record<string, unknown>,
): {
  senderName: string;
  senderAccount: string;
  recipientName: string;
  recipientAccount: string;
} => {
  const senderObj = (raw.sender as Record<string, unknown> | undefined) || {};
  const recipientObj =
    (raw.recipient as Record<string, unknown> | undefined) ||
    (raw.receiver as Record<string, unknown> | undefined) ||
    (raw.reciever as Record<string, unknown> | undefined) ||
    (raw.beneficiary as Record<string, unknown> | undefined) ||
    {};
  const fromUser = (raw.fromUser as Record<string, unknown> | undefined) || {};
  const toUser = (raw.toUser as Record<string, unknown> | undefined) || {};

  return {
    senderName: pickFirstText(
      raw.senderName,
      raw.sender_name,
      raw.fromName,
      raw.from_name,
      senderObj.name,
      senderObj.fullName,
      getNameFromParts(senderObj),
      fromUser.fullName,
      fromUser.name,
      getNameFromParts(fromUser),
    ),
    senderAccount: pickFirstText(
      raw.senderAccount,
      raw.sender_account,
      raw.senderAccountNumber,
      raw.sender_account_number,
      raw.fromAccount,
      raw.from_account,
      raw.fromAccountNumber,
      raw.from_account_number,
      senderObj.accountNumber,
      senderObj.accountNo,
      senderObj.account_number,
      fromUser.accountNumber,
      fromUser.accountNo,
      fromUser.account_number,
    ),
    recipientName: pickFirstText(
      raw.recipientName,
      raw.recipient_name,
      raw.receiverName,
      raw.receiver_name,
      raw.recieverName,
      raw.reciever_name,
      raw.toName,
      raw.to_name,
      recipientObj.name,
      recipientObj.fullName,
      getNameFromParts(recipientObj),
      toUser.fullName,
      toUser.name,
      getNameFromParts(toUser),
    ),
    recipientAccount: pickFirstText(
      raw.recipientAccount,
      raw.recipient_account,
      raw.recipientAccountNumber,
      raw.recipient_account_number,
      raw.receiverAccount,
      raw.receiver_account,
      raw.receiverAccountNumber,
      raw.receiver_account_number,
      raw.recieverAccount,
      raw.reciever_account,
      raw.recieverAccountNumber,
      raw.reciever_account_number,
      raw.toAccount,
      raw.to_account,
      raw.toAccountNumber,
      raw.to_account_number,
      recipientObj.accountNumber,
      recipientObj.accountNo,
      recipientObj.account_number,
      toUser.accountNumber,
      toUser.accountNo,
      toUser.account_number,
    ),
  };
};

// ─── Thin separator ───────────────────────────────────────────────────────────
function Separator({ style }: { style?: object }) {
  return <View style={[sepStyles.line, style]} />;
}
const sepStyles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E8E2DA",
    marginVertical: 2,
  },
});

// ─── Receipt data row ─────────────────────────────────────────────────────────
function ReceiptRow({
  label,
  value,
  valueBold = false,
  valueColor,
}: {
  label: string;
  value: string;
  valueBold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text
        style={[
          rowStyles.value,
          valueBold && rowStyles.bold,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 9,
    gap: 16,
  },
  label: {
    fontSize: 12,
    color: "#A09488",
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 12,
    color: "#1E160E",
    fontWeight: "600",
    maxWidth: "58%",
    textAlign: "right",
  },
  bold: {
    fontSize: 13,
    fontWeight: "700",
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function DepositReceipt() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const viewShotRef = useRef<ViewShot>(null);
  const transferSuccessSoundRef = useRef<{
    unloadAsync: () => Promise<unknown>;
    playAsync: () => Promise<unknown>;
    setPositionAsync?: (millis: number) => Promise<unknown>;
    setOnPlaybackStatusUpdate: (
      callback:
        | ((status: { isLoaded?: boolean; didJustFinish?: boolean }) => void)
        | null,
    ) => void;
  } | null>(null);

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("common.error") || "Error",
          "Permission to access media library is required to save the receipt.",
        );
        return;
      }

      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert(
          t("common.success") || "Success",
          "Receipt saved to your photos successfully.",
        );
      }
    } catch (error) {
      console.error("Failed to download receipt:", error);
      Alert.alert(t("common.error") || "Error", "Failed to save receipt.");
    }
  };

  const handleShare = async () => {
    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert(
            t("common.error") || "Error",
            "Sharing is not available on this device.",
          );
        }
      }
    } catch (error) {
      console.error("Failed to share receipt:", error);
      Alert.alert(t("common.error") || "Error", "Failed to share receipt.");
    }
  };

  const params = (route.params || {}) as {
    transactionId?: string;
    amount?: string;
    amountInPhp?: number;
    currency?: string;
    depositMethod?: string;
    contractPeriod?: string;
    type?: string;
    date?: string;
    successMessage?: string;
    source?: string;
    playTransferSuccessAudio?: boolean;
    senderName?: string;
    senderAccount?: string;
    recipientName?: string;
    recipientAccount?: string;
    processingFee?: string | number;
    status?: string;
  };

  const {
    transactionId = t("investment.pending"),
    amount = "0",
    amountInPhp,
    currency = "PHP",
    depositMethod = "",
    contractPeriod,
    type = "Deposit",
    date = new Date().toLocaleString(),
    successMessage,
    source,
    playTransferSuccessAudio = false,
    senderName = "",
    senderAccount = "",
    recipientName = "",
    recipientAccount = "",
    processingFee = 0,
    status = "",
  } = params;

  const [liveStatus, setLiveStatus] = useState<string>(String(status || ""));
  const [liveTransferParties, setLiveTransferParties] = useState<{
    senderName: string;
    senderAccount: string;
    recipientName: string;
    recipientAccount: string;
  }>({
    senderName: "",
    senderAccount: "",
    recipientName: "",
    recipientAccount: "",
  });

  const languageCode = getLanguageCode(language);
  const localeByLanguageCode: Record<string, string> = {
    en: "en-PH",
    ko: "ko-KR",
    ja: "ja-JP",
    ar: "ar-SA",
  };
  const locale = localeByLanguageCode[languageCode] ?? "en-PH";
  const normalizedType = String(type ?? "")
    .trim()
    .toLowerCase();

  useEffect(() => {
    let isMounted = true;

    const playReceiptAudio = async () => {
      if (!playTransferSuccessAudio || normalizedType !== "transfer") {
        return;
      }

      try {
        await refreshAdminTransferSuccessSound().catch(() => {
          // no-op
        });

        if (!Audio || !isMounted) {
          return;
        }

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        }).catch(() => {
          // Continue playback even if mode setup fails on some runtimes.
        });

        if (transferSuccessSoundRef.current) {
          await transferSuccessSoundRef.current.unloadAsync();
          transferSuccessSoundRef.current = null;
        }

        let sound: {
          unloadAsync: () => Promise<unknown>;
          playAsync: () => Promise<unknown>;
          setPositionAsync?: (millis: number) => Promise<unknown>;
          setOnPlaybackStatusUpdate: (
            callback:
              | ((status: {
                  isLoaded?: boolean;
                  didJustFinish?: boolean;
                }) => void)
              | null,
          ) => void;
        };
        try {
          ({ sound } = await Audio.Sound.createAsync(
            getTransferSuccessSound(),
            {
              shouldPlay: false,
              volume: 1.0,
            },
          ));
        } catch {
          ({ sound } = await Audio.Sound.createAsync(
            DEFAULT_TRANSFER_SUCCESS_SOUND,
            {
              shouldPlay: false,
              volume: 1.0,
            },
          ));
        }
        transferSuccessSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {
              // no-op
            });
            if (transferSuccessSoundRef.current === sound) {
              transferSuccessSoundRef.current = null;
            }
          }
        });
        if (typeof sound.setPositionAsync === "function") {
          await sound.setPositionAsync(0).catch(() => {
            // no-op
          });
        }
        await sound.playAsync();
      } catch {
        // Ignore optional sound failures to keep receipt UX uninterrupted.
      }
    };

    void playReceiptAudio();

    return () => {
      isMounted = false;
      if (transferSuccessSoundRef.current) {
        transferSuccessSoundRef.current.setOnPlaybackStatusUpdate(null);
        transferSuccessSoundRef.current.unloadAsync().catch(() => {
          // no-op
        });
        transferSuccessSoundRef.current = null;
      }
    };
  }, [normalizedType, playTransferSuccessAudio]);

  useEffect(() => {
    let mounted = true;

    const refreshLatestStatus = async () => {
      if (source !== "history") return;
      const id = String(transactionId || "").trim();
      if (!id || id === t("investment.pending")) return;

      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) return;

        const response = await getTransactions(token, { limit: 200 });
        if (!response?.success || !Array.isArray(response.transactions)) return;

        const hit = response.transactions.find((tx: any) => {
          const txId = String(tx?.id ?? tx?.transactionId ?? "").trim();
          return txId === id;
        }) as Record<string, unknown> | undefined;

        if (!mounted || !hit) return;

        const nextStatus = String(
          hit["status"] ?? hit["requestStatus"] ?? hit["request_status"] ?? "",
        ).trim();
        if (nextStatus) {
          setLiveStatus(nextStatus);
        }
        const resolvedParties = resolveTransferParties(hit);
        setLiveTransferParties(resolvedParties);
      } catch {
        // Keep fallback status from route params when refresh fails.
      }
    };

    void refreshLatestStatus();
    const unsubscribe = navigation.addListener?.("focus", refreshLatestStatus);

    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [navigation, source, t, transactionId]);

  const getReceiptTypeLabel = () => {
    if (normalizedType === "transfer") return t("tx.transfer");
    if (normalizedType === "withdrawal") return t("tx.withdraw");
    return t("tx.deposit");
  };

  const getSuccessSubtitle = () => {
    if (successMessage) return successMessage;
    if (normalizedType === "time deposit")
      return t("deposit.timeDepositSuccessMessage");
    return t("deposit.uploadSuccessMessage");
  };

  const getMethodLabel = () => {
    if (depositMethod) return depositMethod;
    if (normalizedType === "transfer") return t("sendMoney.availableBalance");
    if (normalizedType === "withdrawal") return t("withdraw.bankTransfer");
    return getReceiptTypeLabel();
  };

  const getMethodKey = () => {
    if (normalizedType === "transfer") return t("sendMoney.from");
    if (normalizedType === "withdrawal") return t("withdraw.withdrawalMethod");
    return t("deposit.depositMethod");
  };

  const normalizedStatus = String(liveStatus || "")
    .trim()
    .toLowerCase();
  const isSuccessfulStatus =
    !normalizedStatus ||
    normalizedStatus === "successful" ||
    normalizedStatus === "success" ||
    normalizedStatus === "approved" ||
    normalizedStatus === "active" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "matured";
  const statusLabel = isSuccessfulStatus
    ? "Successful"
    : normalizedStatus
      ? normalizedStatus
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Successful";
  const statusColor = isSuccessfulStatus ? "#1A7A36" : "#B54708";
  const effectiveSenderName = pickFirstText(
    liveTransferParties.senderName,
    senderName,
  );
  const effectiveSenderAccount = pickFirstText(
    liveTransferParties.senderAccount,
    senderAccount,
  );
  const effectiveRecipientName = pickFirstText(
    liveTransferParties.recipientName,
    recipientName,
  );
  const effectiveRecipientAccount = pickFirstText(
    liveTransferParties.recipientAccount,
    recipientAccount,
  );

  const handleClose = () => {
    if (source === "history") {
      if (navigation.canGoBack?.()) navigation.goBack();
      else navigation.navigate("history");
      return;
    }
    navigation.navigate("Main");
  };

  const formattedAmount = `${currency === "PHP" ? "₱" : ""}${Number(
    amount,
  ).toLocaleString(locale, { minimumFractionDigits: 2 })}${
    currency !== "PHP" ? ` ${currency}` : ""
  }`;
  const parsedTransferAmount = Number(amount);
  const parsedProcessingFee = Number(processingFee ?? 0);
  const transferAmount = Number.isFinite(parsedTransferAmount)
    ? parsedTransferAmount
    : 0;
  const transferProcessingFee = Number.isFinite(parsedProcessingFee)
    ? parsedProcessingFee
    : 0;
  const transferTotalDebit = transferAmount + transferProcessingFee;
  const formattedTransferFee = `₱${transferProcessingFee.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedTransferTotalDebit = `₱${transferTotalDebit.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const isCryptoTimeDepositReceipt =
    normalizedType === "time deposit" &&
    (depositMethod || "").toLowerCase() === "crypto deposit" &&
    currency !== "PHP";
  const hasPhpEquivalent = Number.isFinite(amountInPhp);
  const phpEquivalentWithMargin = Number(amountInPhp ?? 0);
  const formattedPhpEquivalent = hasPhpEquivalent
    ? `₱${phpEquivalentWithMargin.toLocaleString(locale, { minimumFractionDigits: 2 })}`
    : "";

  const receiptWidth = Math.min(380, width - 32);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#191410", "#231A11", "#191410"]}
        style={styles.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(insets.top + 20, 28),
              paddingBottom: Math.max(insets.bottom + 24, 32),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══════════════ RECEIPT CARD ═══════════════ */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 1.0 }}
            style={{ backgroundColor: "transparent" }}
          >
            <View style={[styles.card, { width: receiptWidth }]}>
              {/* ── Brand header ── */}
              <LinearGradient
                colors={["#C44A0C", "#E06828"]}
                style={styles.headerBand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Decorative circles */}
                <View style={styles.deco1} />
                <View style={styles.deco2} />

                <View style={styles.headerInner}>
                  <Image
                    source={require("../../../assets/images/InpireLogo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <View style={styles.headerMeta}>
                    <Text style={styles.headerLabel}>OFFICIAL RECEIPT</Text>
                    <Text style={styles.headerDateText}>{date}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* ── Status badge ── */}
              <View style={styles.statusBar}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {isSuccessfulStatus
                      ? "TRANSACTION SUCCESSFUL"
                      : "TRANSACTION UPDATE"}
                  </Text>
                </View>
                <Text style={styles.receiptNo}>
                  #{String(transactionId).slice(-8).toUpperCase()}
                </Text>
              </View>

              <Separator style={{ marginHorizontal: 20 }} />

              {/* ── Amount hero ── */}
              <View style={styles.amountBlock}>
                <Text style={styles.txTypeTag}>
                  {getReceiptTypeLabel().toUpperCase()}
                </Text>
                <Text style={styles.amountFigure}>{formattedAmount}</Text>
                <Text style={styles.amountCaption}>{getSuccessSubtitle()}</Text>
              </View>

              <Separator style={{ marginHorizontal: 20 }} />

              {/* ── Transaction details ── */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionLabel}>TRANSACTION DETAILS</Text>

                <ReceiptRow
                  label={t("history.id") || "Transaction ID"}
                  value={transactionId}
                />
                <Separator />
                <ReceiptRow
                  label={t("history.date") || "Date & Time"}
                  value={date}
                />
                <Separator />
                <ReceiptRow label={getMethodKey()} value={getMethodLabel()} />
                {normalizedType === "transfer" ? (
                  <>
                    <Separator />
                    <ReceiptRow
                      label="Transfer Amount"
                      value={`₱${transferAmount.toLocaleString(locale, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                    />
                    <Separator />
                    <ReceiptRow label="Processing Fee" value={formattedTransferFee} />
                  </>
                ) : null}
                {normalizedType === "transfer" && effectiveSenderName ? (
                  <>
                    <Separator />
                    <ReceiptRow label="Sender Name" value={effectiveSenderName} />
                  </>
                ) : null}
                {normalizedType === "transfer" && effectiveSenderAccount ? (
                  <>
                    <Separator />
                    <ReceiptRow
                      label="Sender Account"
                      value={effectiveSenderAccount}
                    />
                  </>
                ) : null}
                {normalizedType === "transfer" && effectiveRecipientName ? (
                  <>
                    <Separator />
                    <ReceiptRow
                      label="Recipient Name"
                      value={effectiveRecipientName}
                    />
                  </>
                ) : null}
                {normalizedType === "transfer" && effectiveRecipientAccount ? (
                  <>
                    <Separator />
                    <ReceiptRow
                      label="Recipient Account"
                      value={effectiveRecipientAccount}
                    />
                  </>
                ) : null}
                {contractPeriod && (
                  <>
                    <Separator />
                    <ReceiptRow
                      label={t("deposit.contractPeriod")}
                      value={contractPeriod}
                    />
                  </>
                )}
                {isCryptoTimeDepositReceipt && hasPhpEquivalent && (
                  <>
                    <Separator />
                    <ReceiptRow
                      label="PHP Equivalent"
                      value={formattedPhpEquivalent}
                    />
                  </>
                )}
                <Separator />
                <ReceiptRow
                  label="Status"
                  value={statusLabel}
                  valueBold
                  valueColor={statusColor}
                />
              </View>

              <Separator style={{ marginHorizontal: 20 }} />

              {/* ── Total summary ── */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {normalizedType === "transfer"
                    ? formattedTransferTotalDebit
                    : formattedAmount}
                </Text>
              </View>

              {/* ── Footer strip ── */}
              <View style={styles.footerStrip}>
                <Text style={styles.footerMain}>
                  Thank you for using Inpire Financial Services
                </Text>
                <Text style={styles.footerSub}>
                  Please keep this receipt for your records
                </Text>
              </View>
            </View>
          </ViewShot>

          {/* ═══════════════ ACTION BUTTONS ═══════════════ */}
          <View style={[styles.actionsRow, { width: receiptWidth }]}>
            {/* Download — primary */}
            <TouchableOpacity
              style={styles.downloadBtn}
              activeOpacity={0.82}
              onPress={handleDownload}
            >
              <LinearGradient
                colors={["#C44A0C", "#E06828"]}
                style={styles.downloadGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="download-outline" size={19} color="#FFF" />
                <Text
                  style={styles.downloadText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  allowFontScaling={false}
                >
                  {t("history.downloadReceipt")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Share — secondary */}
            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.82}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={19} color="#E06828" />
              <Text style={styles.shareText}>{t("history.shareReceipt")}</Text>
            </TouchableOpacity>
          </View>

          {/* Done */}
          <TouchableOpacity
            style={[styles.doneBtn, { width: receiptWidth }]}
            onPress={handleClose}
            activeOpacity={0.75}
          >
            <Text style={styles.doneText}>{t("history.receiptDone")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#191410" },
  bg: { flex: 1 },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FDFAF6",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 24,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerBand: {
    paddingVertical: 22,
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -70,
    right: -40,
  },
  deco2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -35,
    left: 10,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 126, height: 38 },
  headerMeta: { alignItems: "flex-end", gap: 4 },
  headerLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 2.6,
    fontWeight: "700",
  },
  headerDateText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },

  // ── Status bar ────────────────────────────────────────────────────────────
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF5ED",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1A7A36",
  },
  statusText: {
    fontSize: 9,
    color: "#1A7A36",
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  receiptNo: {
    fontSize: 11,
    color: "#C0B5AB",
    fontWeight: "600",
    letterSpacing: 1,
  },

  // ── Amount ────────────────────────────────────────────────────────────────
  amountBlock: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  txTypeTag: {
    fontSize: 10,
    color: "#B8AFA6",
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 6,
  },
  amountFigure: {
    fontSize: 40,
    fontWeight: "800",
    color: "#1C1410",
    letterSpacing: -1,
    marginBottom: 8,
  },
  amountCaption: {
    fontSize: 12,
    color: "#9C9189",
    lineHeight: 18,
  },

  // ── Details ───────────────────────────────────────────────────────────────
  detailsSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 9,
    color: "#C8BEB4",
    letterSpacing: 2.2,
    fontWeight: "700",
    marginBottom: 4,
  },

  // ── Total ─────────────────────────────────────────────────────────────────
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1C1410",
    letterSpacing: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#C44A0C",
    letterSpacing: -0.4,
  },

  // ── Footer strip ──────────────────────────────────────────────────────────
  footerStrip: {
    backgroundColor: "#F3EDE5",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E4DDD4",
  },
  footerMain: {
    fontSize: 11,
    color: "#6B6256",
    fontWeight: "600",
    textAlign: "center",
  },
  footerSub: {
    fontSize: 10,
    color: "#A89A8C",
    textAlign: "center",
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  downloadBtn: {
    flex: 1,
    minWidth: 0,
  },
  downloadGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  downloadText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: "center",
    textAlignVertical: "center",
  },
  shareBtn: {
    width: 140,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E06828",
    backgroundColor: "rgba(224, 104, 40, 0.07)",
  },
  shareText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E06828",
    letterSpacing: 0.2,
  },

  // ── Done ──────────────────────────────────────────────────────────────────
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
  },
  doneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B8AFA6",
    letterSpacing: 0.4,
  },
});
