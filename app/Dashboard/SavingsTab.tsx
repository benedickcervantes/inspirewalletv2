import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface PayoutScheduleItem {
  payoutIndex: number;
  expectedDate: string;
  amount: string;
  status: "PENDING" | "PAID";
  isLastPayout?: boolean;
  principalReturned?: string;
}

interface TimeDeposit {
  id: string;
  contractType: string;
  depositSource?: "AVAILABLE_BALANCE" | "REQUEST_AMOUNT";
  amount: string;
  interestRate: string;
  status: "PENDING" | "ACTIVE" | "MATURED" | "CANCELLED";
  startDate: string | null;
  maturityDate: string | null;
  projectedStartDate: string;
  projectedMaturityDate: string;
  createdAt?: string;
  payoutSchedule?: PayoutScheduleItem[];
}

interface SavingsTabProps {
  userData: Record<string, unknown> | null;
  timeDeposit: number;
  dividend: number;
  depositGrowthData: { month: string; amount: number }[];
  deposits: TimeDeposit[];
  formatCurrency: (amount: number) => string;
  onRefresh?: () => Promise<void>;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  sixMonths: "6 Months",
  oneYear: "1 Year",
  twoYears: "2 Years",
};

export default function SavingsTab({
  userData,
  timeDeposit,
  dividend,
  depositGrowthData,
  deposits,
  formatCurrency,
  onRefresh,
}: SavingsTabProps) {
  const [contractTab, setContractTab] = useState<"Active" | "Completed" | "Pending">("Active");
  const [selectedContract, setSelectedContract] = useState<TimeDeposit | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredDeposits = deposits.filter((d) => {
    if (contractTab === "Active") return d.status === "ACTIVE";
    if (contractTab === "Completed") return d.status === "MATURED" || d.status === "CANCELLED";
    return d.status === "PENDING";
  });

  const maxAmount = Math.max(
    1,
    ...depositGrowthData.map((d) => d.amount)
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    if (status === "ACTIVE") return "#059669";
    if (status === "MATURED") return "#2563EB";
    if (status === "PENDING") return "#D97706";
    return "#6B7280";
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#E25A17"
        />
      }
    >
      <View style={styles.cardContainer}>
        <ImageBackground
          source={require("../../assets/cards/default/card2.0.png")}
          style={styles.depositCard}
          imageStyle={styles.depositCardImage}
          resizeMode="cover"
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name="trending-up"
              size={60}
              color="rgba(255, 255, 255, 0.3)"
              style={styles.cardIcon}
            />
          </View>
          <View style={styles.depositInfo}>
            <Text style={styles.depositLabel}>Time Deposit</Text>
            <Text style={styles.depositAmount}>₱ {formatCurrency(timeDeposit)}</Text>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.amountWalletContainer}>
        <View style={styles.amountWalletCard}>
          <View style={styles.amountWalletContent}>
            <View style={styles.amountWalletLeft}>
              <View style={styles.amountWalletHeader}>
                <Text style={styles.amountWalletLabel}>Amount Wallet (Expected Dividend)</Text>
                <Ionicons name="flame-outline" size={18} color="#E15816" />
              </View>
              <Text style={styles.amountWalletAmount}>
                ₱ {formatCurrency(dividend)}
              </Text>
              <Text style={styles.amountWalletHint}>
                Total expected dividend from all contracts
              </Text>
            </View>
            <View style={styles.amountWalletIcon}>
              <Ionicons name="trending-up" size={40} color="#E15816" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.graphContainer}>
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.graphCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>Deposit Growth ({new Date().getFullYear()})</Text>
            <Ionicons name="bar-chart-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.chartContainer}>
            <View style={styles.barsContainer}>
              {depositGrowthData.map((data, index) => {
                const barHeight = (data.amount / maxAmount) * 120;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View style={styles.barColumn}>
                      <View style={[styles.bar, { height: Math.max(barHeight, 4) }]} />
                    </View>
                    <Text style={styles.barLabel}>{data.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contractsSection}>
        <Text style={styles.contractsSectionTitle}>Contracts</Text>
        <View style={styles.contractTabs}>
          {(["Active", "Completed", "Pending"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.contractTab, contractTab === tab && styles.contractTabActive]}
              onPress={() => setContractTab(tab)}
            >
              <Text
                style={[
                  styles.contractTabText,
                  contractTab === tab && styles.contractTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contractList}>
          {filteredDeposits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>
                No {contractTab.toLowerCase()} contracts
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {contractTab === "Pending" && "Submitted deposits will appear here once created."}
                {contractTab === "Active" && "Approved time deposits will appear here."}
                {contractTab === "Completed" && "Matured or cancelled contracts will appear here."}
              </Text>
            </View>
          ) : (
            filteredDeposits.map((dep) => (
              <TouchableOpacity
                key={dep.id}
                style={styles.contractCard}
                onPress={() => setSelectedContract(dep)}
                activeOpacity={0.7}
              >
                <View style={styles.contractCardTop}>
                  <View>
                    <Text style={styles.contractCardAmount}>
                      ₱ {formatCurrency(parseFloat(dep.amount) || 0)}
                    </Text>
                    <Text style={styles.contractCardType}>
                      {CONTRACT_TYPE_LABELS[dep.contractType] ?? dep.contractType}
                    </Text>
                  </View>
                  <View style={styles.contractCardRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(dep.status)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getStatusColor(dep.status) },
                        ]}
                      >
                        {dep.status}
                      </Text>
                    </View>
                    <Text style={styles.contractCardRate}>
                      {dep.interestRate}% p.a.
                    </Text>
                  </View>
                </View>
                <View style={styles.contractCardBottom}>
                  <Text style={styles.contractCardDates}>
                    {dep.startDate
                      ? formatDate(dep.startDate)
                      : formatDate(dep.projectedStartDate)}
                    {" → "}
                    {dep.maturityDate
                      ? formatDate(dep.maturityDate)
                      : formatDate(dep.projectedMaturityDate)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      <View style={{ height: 20 }} />

      <Modal
        visible={!!selectedContract}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedContract(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedContract && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Contract Details</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedContract(null)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: `${getStatusColor(selectedContract.status)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: getStatusColor(selectedContract.status) },
                      ]}
                    >
                      {selectedContract.status}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Amount</Text>
                    <Text style={styles.modalDetailValue}>
                      ₱ {formatCurrency(parseFloat(selectedContract.amount) || 0)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Interest Rate</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContract.interestRate}% per annum
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Contract Type</Text>
                    <Text style={styles.modalDetailValue}>
                      {CONTRACT_TYPE_LABELS[selectedContract.contractType] ??
                        selectedContract.contractType}
                    </Text>
                  </View>
                  {selectedContract.depositSource && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Deposit Source</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedContract.depositSource === "AVAILABLE_BALANCE"
                          ? "Available Balance"
                          : "Request Amount"}
                      </Text>
                    </View>
                  )}
                  {selectedContract.createdAt && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Created</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(selectedContract.createdAt)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Start Date</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContract.startDate
                        ? formatDate(selectedContract.startDate)
                        : formatDate(selectedContract.projectedStartDate)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Maturity Date</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedContract.maturityDate
                        ? formatDate(selectedContract.maturityDate)
                        : formatDate(selectedContract.projectedMaturityDate)}
                    </Text>
                  </View>

                  <Text style={styles.payoutSectionTitle}>Payout Schedule</Text>
                  <View style={styles.payoutStepper}>
                    {(selectedContract.payoutSchedule ?? []).map((payout, idx) => (
                      <View key={payout.payoutIndex} style={styles.payoutItem}>
                        <View style={styles.payoutItemLeft}>
                          <View
                            style={[
                              styles.payoutDot,
                              payout.status === "PAID"
                                ? styles.payoutDotPaid
                                : styles.payoutDotPending,
                            ]}
                          />
                          {idx < (selectedContract.payoutSchedule?.length ?? 1) - 1 && (
                            <View
                              style={[
                                styles.payoutLine,
                                payout.status === "PAID"
                                  ? styles.payoutLinePaid
                                  : styles.payoutLinePending,
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.payoutItemRight}>
                          <Text style={styles.payoutDate}>
                            {formatDate(payout.expectedDate)}
                          </Text>
                          <Text style={styles.payoutAmount}>
                            ₱ {formatCurrency(parseFloat(payout.amount) || 0)}
                            {payout.isLastPayout &&
                              payout.principalReturned &&
                              ` + ₱ ${formatCurrency(
                                parseFloat(payout.principalReturned) || 0
                              )} principal`}
                          </Text>
                          <View
                            style={[
                              styles.payoutStatusChip,
                              payout.status === "PAID"
                                ? styles.payoutStatusPaid
                                : styles.payoutStatusPending,
                            ]}
                          >
                            <Ionicons
                              name={payout.status === "PAID" ? "checkmark-circle" : "time-outline"}
                              size={14}
                              color={payout.status === "PAID" ? "#059669" : "#D97706"}
                            />
                            <Text
                              style={[
                                styles.payoutStatusText,
                                { color: payout.status === "PAID" ? "#059669" : "#D97706" },
                              ]}
                            >
                              {payout.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  {(selectedContract.payoutSchedule?.length ?? 0) === 0 && (
                    <Text style={styles.noPayoutsText}>No payout schedule</Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  cardContainer: { paddingHorizontal: 20, paddingTop: 16 },
  depositCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 160,
    overflow: "hidden",
  },
  depositCardImage: { borderRadius: 20 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardIcon: { position: "absolute", right: 0, top: 0 },
  depositInfo: { marginTop: 0 },
  depositLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 8,
  },
  depositAmount: { fontSize: 32, fontWeight: "700", color: "#FFFFFF" },
  amountWalletContainer: { paddingHorizontal: 20, paddingTop: 16 },
  amountWalletCard: {
    backgroundColor: "#FFE8D6",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountWalletContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
  },
  amountWalletLeft: { flex: 1 },
  amountWalletHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  amountWalletLabel: { fontSize: 16, fontWeight: "700", color: "#333" },
  amountWalletAmount: { fontSize: 20, fontWeight: "700", color: "#E15816" },
  amountWalletHint: { fontSize: 11, color: "#999", marginTop: 4 },
  amountWalletIcon: { marginLeft: 12 },
  graphContainer: { paddingHorizontal: 20, paddingTop: 16 },
  graphCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  graphHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  graphTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  chartContainer: { height: 150, justifyContent: "flex-end" },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
  },
  barWrapper: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barColumn: {
    width: "70%",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  bar: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 9, color: "#FFFFFF", marginTop: 4, fontWeight: "600" },
  contractsSection: { paddingHorizontal: 20, paddingTop: 16 },
  contractsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  contractTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  contractTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contractTabActive: {
    backgroundColor: "#E25A17",
    borderColor: "#E25A17",
  },
  contractTabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  contractTabTextActive: { color: "#FFFFFF" },
  contractList: { gap: 12 },
  contractCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contractCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  contractCardAmount: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  contractCardType: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  contractCardRight: { alignItems: "flex-end" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  contractCardRate: { fontSize: 13, color: "#059669", fontWeight: "600" },
  contractCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  contractCardDates: { fontSize: 12, color: "#9CA3AF" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  modalCloseButton: { padding: 4 },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalStatusText: { fontSize: 13, fontWeight: "600" },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalDetailLabel: { fontSize: 14, color: "#6B7280" },
  modalDetailValue: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  payoutSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 16,
  },
  payoutStepper: { marginLeft: 8 },
  payoutItem: { flexDirection: "row", marginBottom: 8 },
  payoutItemLeft: { width: 24, alignItems: "center" },
  payoutDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  payoutDotPaid: { backgroundColor: "#059669" },
  payoutDotPending: { backgroundColor: "#D97706", opacity: 0.6 },
  payoutLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 24,
  },
  payoutLinePaid: { backgroundColor: "#059669" },
  payoutLinePending: { backgroundColor: "#E5E7EB" },
  payoutItemRight: { flex: 1, marginLeft: 12, paddingBottom: 16 },
  payoutDate: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  payoutAmount: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  payoutStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 6,
  },
  payoutStatusPaid: {},
  payoutStatusPending: {},
  payoutStatusText: { fontSize: 12, fontWeight: "600" },
  noPayoutsText: { fontSize: 14, color: "#9CA3AF", fontStyle: "italic" },
});
