import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function SavingsTab({ userData, timeDeposit, formatCurrency }) {
  const router = useRouter();
  // Sample data for deposit growth (last 12 months)
  const [depositData, setDepositData] = useState([
    { month: "Jan", amount: 5000 },
    { month: "Feb", amount: 8000 },
    { month: "Mar", amount: 12000 },
    { month: "Apr", amount: 15000 },
    { month: "May", amount: 18000 },
    { month: "Jun", amount: 22000 },
    { month: "Jul", amount: 28000 },
    { month: "Aug", amount: 35000 },
    { month: "Sep", amount: 40000 },
    { month: "Oct", amount: 45000 },
    { month: "Nov", amount: 48000 },
    { month: "Dec", amount: 50000 },
  ]);

  const maxAmount = Math.max(...depositData.map(d => d.amount));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Time Deposit Card */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={require("../assets/cards/default/card2.0.png")}
          style={styles.depositCard}
          imageStyle={styles.depositCardImage}
          resizeMode="cover"
        >
          <View style={styles.depositInfo}>
            <View style={styles.depositLabelRow}>
              <Text style={styles.depositLabel}>Time Deposit</Text>
              <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.depositAmount}>PHP {formatCurrency(timeDeposit)}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.withdrawButton}>
            <MaterialCommunityIcons name="bank-transfer-out" size={18} color="#E15816" />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* Select Deposit Type */}
      <View style={styles.depositTypeContainer}>
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.depositTypeCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.depositTypeContent}>
            <View>
              <Text style={styles.depositTypeTitle}>Select Deposit Type *</Text>
              <Text style={styles.depositTypeSubtitle}>Choose your investment type</Text>
            </View>
            <View style={styles.depositTypeIcons}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="#FFFFFF" />
              <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" style={{ marginLeft: 12 }} />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Deposit Type Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => router.push("/timedeposit")}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="time-outline" size={28} color="#E15816" />
          </View>
          <Text style={styles.optionLabel}>Time Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => router.push("/stockinvestment")}
        >
          <View style={styles.optionIcon}>
            <MaterialCommunityIcons name="chart-line" size={28} color="#E15816" />
          </View>
          <Text style={styles.optionLabel}>Stock Investment</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => router.push("/topup")}
        >
          <View style={styles.optionIcon}>
            <MaterialCommunityIcons name="arrow-up-circle" size={28} color="#E15816" />
          </View>
          <Text style={styles.optionLabel}>Top Up Balance</Text>
        </TouchableOpacity>
      </View>

      {/* Amount Wallet */}
      <View style={styles.amountWalletContainer}>
        <View style={styles.amountWalletCard}>
          <View style={styles.amountWalletContent}>
            <View>
              <Text style={styles.amountWalletLabel}>Amount Wallet</Text>
              <Text style={styles.amountWalletAmount}>PHP {formatCurrency(timeDeposit * 0.31)}</Text>
            </View>
            <View style={styles.amountWalletIcon}>
              <MaterialCommunityIcons name="chart-line-variant" size={40} color="#E15816" />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#333" style={styles.amountWalletArrow} />
        </View>
      </View>

      {/* Deposit Growth Graph */}
      <View style={styles.graphContainer}>
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.graphCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>Deposit Growth</Text>
            <MaterialCommunityIcons name="chart-bar" size={20} color="#FFFFFF" />
          </View>
          
          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.barsContainer}>
              {depositData.map((data, index) => {
                const barHeight = (data.amount / maxAmount) * 120;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View style={styles.barColumn}>
                      <View style={[styles.bar, { height: barHeight }]} />
                    </View>
                    <Text style={styles.barLabel}>{data.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  depositCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
    justifyContent: "center",
    minHeight: 200,
  },
  depositCardImage: {
    borderRadius: 20,
  },
  depositInfo: {
    marginBottom: 16,
  },
  depositLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  depositLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  depositAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 16,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "flex-end",
    gap: 6,
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  depositTypeContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  depositTypeCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  depositTypeContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  depositTypeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  depositTypeSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  depositTypeIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 14,
  },
  amountWalletContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
  amountWalletLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  amountWalletAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E15816",
  },
  amountWalletIcon: {
    marginLeft: 12,
  },
  amountWalletArrow: {
    marginLeft: 8,
  },
  graphContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
  graphTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chartContainer: {
    height: 150,
    justifyContent: "flex-end",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
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
    minHeight: 10,
  },
  barLabel: {
    fontSize: 9,
    color: "#FFFFFF",
    marginTop: 4,
    fontWeight: "600",
  },
});
