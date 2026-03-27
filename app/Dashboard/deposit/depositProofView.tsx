import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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

  const formattedAmount = `₱ ${displayAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

  const cryptoSubtitle = isCryptoDeposit
    ? `Funded with ${rawAmount} ${currency}`
    : null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={["#D44F10", "#E8722A"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t("deposit.depositRequest")}</Text>
            <Text style={styles.headerSubtitle}>Transaction Review</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Amount Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={["#D44F10", "#F08030"]}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Top row */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <View style={styles.heroBadgeDot} />
                  <Text style={styles.heroBadgeText}>{t("investment.pending")}</Text>
                </View>
                <Text style={styles.heroIdText}>#{requestId}</Text>
              </View>

              {/* Divider */}
              <View style={styles.heroDivider} />

              {/* Amount */}
              <Text style={styles.heroLabel}>{type}</Text>
              <Text style={styles.heroAmount}>{formattedAmount}</Text>
              {cryptoSubtitle && (
                <View style={styles.cryptoPill}>
                  <Ionicons name="logo-bitcoin" size={12} color="#FFFFFF" />
                  <Text style={styles.cryptoPillText}>{cryptoSubtitle}</Text>
                </View>
              )}

              {/* Bottom decorative circles */}
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
            </LinearGradient>
          </View>

          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconRing}>
              <Ionicons name="time" size={20} color="#D44F10" />
            </View>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>Under Review</Text>
              <Text style={styles.statusMessage}>
                Your request is pending admin approval. An official receipt will appear in History once confirmed.
              </Text>
            </View>
          </View>

          {/* Submitted Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardAccentBar} />
              <Text style={styles.cardTitle}>Submitted Information</Text>
            </View>

            <InfoRow label={t("history.id")} value={`#${requestId}`} />
            <InfoRow label={t("deposit.depositType")} value={type} />
            <InfoRow
              label={t("deposit.amount")}
              value={formattedAmount}
              subValue={cryptoSubtitle}
              highlight
            />
            <InfoRow label={t("deposit.depositMethod")} value={depositMethod} />
            {contractPeriod ? (
              <InfoRow
                label={t("deposit.contractPeriod")}
                value={contractPeriod}
                last
              />
            ) : null}
          </View>

          {/* Proof of Payment Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardAccentBar} />
              <Text style={styles.cardTitle}>{t("deposit.proofOfPayment")}</Text>
            </View>

            {proofUri ? (
              <View style={styles.proofWrapper}>
                <Image source={{ uri: proofUri }} style={styles.proofImage} />
                <View style={styles.proofOverlay}>
                  <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.proofOverlayText}>Tap to view</Text>
                </View>
              </View>
            ) : (
              <View style={styles.noProofBox}>
                <View style={styles.noProofIconWrap}>
                  <Ionicons name="image-outline" size={28} color="#C8C8C8" />
                </View>
                <Text style={styles.noProofTitle}>No Attachment</Text>
                <Text style={styles.noProofSub}>
                  No proof image was uploaded for this request.
                </Text>
              </View>
            )}
          </View>

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneButton}
            activeOpacity={0.85}
            onPress={() =>
              (navigation as { navigate: (name: string) => void }).navigate("Main")
            }
          >
            <LinearGradient
              colors={["#D44F10", "#F08030"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneText}>Done</Text>
              <View style={styles.doneIconWrap}>
                <Ionicons name="checkmark" size={16} color="#E8722A" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Questions? Contact support via the Help Center.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ─── Sub-component ─────────────────────────────────────────────────── */

function InfoRow({
  label,
  value,
  subValue,
  highlight,
  last,
}: {
  label: string;
  value: string;
  subValue?: string | null;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueBlock}>
        <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
          {value}
        </Text>
        {subValue && <Text style={styles.infoSubValue}>{subValue}</Text>}
      </View>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0EDE8" },
  safeArea: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  headerSpacer: { width: 38 },

  /* Scroll */
  scrollView: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 36 },

  /* Hero Card */
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#D44F10",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  heroGradient: {
    padding: 20,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFD580",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  heroIdText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
    maxWidth: "45%",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 36,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cryptoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  cryptoPillText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  heroCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -30,
    bottom: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: 50,
    bottom: -20,
  },

  /* Status Banner */
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FEF3EE",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F5CBAF",
    padding: 14,
    marginBottom: 14,
  },
  statusIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F5CBAF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusTextBlock: { flex: 1 },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 3,
  },
  statusMessage: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
  },
  cardAccentBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#E25A17",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: 0.1,
  },

  /* Info Rows */
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F4F4F4",
  },
  infoLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    flex: 1,
    fontWeight: "500",
  },
  infoValueBlock: {
    flex: 1.3,
    alignItems: "flex-end",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "right",
  },
  infoValueHighlight: {
    color: "#D44F10",
    fontSize: 14,
    fontWeight: "700",
  },
  infoSubValue: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "right",
    fontWeight: "500",
  },

  /* Proof Image */
  proofWrapper: {
    margin: 14,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  proofImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F3F3",
  },
  proofOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  proofOverlayText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  /* No Proof */
  noProofBox: {
    margin: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  noProofIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  noProofTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
    marginBottom: 4,
  },
  noProofSub: {
    fontSize: 12,
    color: "#AAAAAA",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  /* Done Button */
  doneButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 6,
    shadowColor: "#D44F10",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  doneGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  doneIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Footer */
  footerNote: {
    fontSize: 12,
    color: "#BBBBBB",
    textAlign: "center",
    marginTop: 14,
    fontWeight: "500",
  },
});