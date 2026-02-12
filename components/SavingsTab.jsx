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
      {/* Time Deposit Card - Using card2.0 background */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={require("../assets/cards/default/card2.0.png")}
          style={styles.depositCard}
          imageStyle={styles.depositCardImage}
          resizeMode="cover"
        >
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={60} color="rgba(255, 255, 255, 0.3)" style={styles.cardIcon} />
          </View>
          <View style={styles.depositInfo}>
            <Text style={styles.depositLabel}>Time Deposit</Text>
            <Text style={styles.depositAmount}>PHP {formatCurrency(timeDeposit)}</Text>
          </View>
        </ImageBackground>
      </View>

      {/* Amount Wallet */}
      <View style={styles.amountWalletContainer}>
        <View style={styles.amountWalletCard}>
          <View style={styles.amountWalletContent}>
            <View style={styles.amountWalletLeft}>
              <View style={styles.amountWalletHeader}>
                <Text style={styles.amountWalletLabel}>Amount Wallet</Text>
                <Ionicons name="flame-outline" size={18} color="#E15816" />
              </View>
              <Text style={styles.amountWalletAmount}>PHP {formatCurrency(timeDeposit * 0.31)}</Text>
            </View>
            <View style={styles.amountWalletIcon}>
              <Ionicons name="trending-up" size={40} color="#E15816" />
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
            <Ionicons name="bar-chart-outline" size={20} color="#FFFFFF" />
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

      {/* Services Section */}
      <View style={styles.servicesContainer}>
        <Text style={styles.servicesTitle}>Services</Text>
        <View style={styles.servicesGrid}>
          <TouchableOpacity style={styles.serviceItem}>
            <View style={styles.serviceIcon}>
              <Ionicons name="pie-chart-outline" size={28} color="#E15816" />
            </View>
            <Text style={styles.serviceLabel}>Investment Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serviceItem}>
            <View style={styles.serviceIcon}>
              <Ionicons name="wallet-outline" size={28} color="#E15816" />
            </View>
            <Text style={styles.serviceLabel}>E-Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serviceItem}>
            <View style={styles.serviceIcon}>
              <Ionicons name="stats-chart-outline" size={28} color="#E15816" />
            </View>
            <Text style={styles.serviceLabel}>Stock</Text>
          </TouchableOpacity>

          <View style={styles.serviceColumn}>
            <TouchableOpacity style={styles.serviceItem}>
              <View style={styles.serviceIcon}>
                <Ionicons name="list-outline" size={28} color="#E15816" />
              </View>
              <Text style={styles.serviceLabel}>Total</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.serviceItem}>
              <View style={styles.serviceIcon}>
                <Ionicons name="ellipsis-horizontal" size={28} color="#E15816" />
              </View>
              <Text style={styles.serviceLabel}>More</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.serviceItem}>
            <View style={styles.serviceIcon}>
              <Ionicons name="people-outline" size={28} color="#E15816" />
            </View>
            <Text style={styles.serviceLabel}>Agent</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serviceItem}>
            <View style={styles.serviceIcon}>
              <Ionicons name="trending-up-outline" size={28} color="#E15816" />
            </View>
            <Text style={styles.serviceLabel}>Tracking</Text>
          </TouchableOpacity>
        </View>
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
    minHeight: 160,
    overflow: "hidden",
  },
  depositCardImage: {
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardIcon: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  depositInfo: {
    marginTop: 0,
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
    marginBottom: 8,
  },
  depositAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
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
  amountWalletLeft: {
    flex: 1,
  },
  amountWalletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  amountWalletLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
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
  servicesContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  serviceItem: {
    width: (width - 80) / 3,
    alignItems: "center",
    marginBottom: 20,
  },
  serviceColumn: {
    width: (width - 80) / 3,
    alignItems: "center",
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 14,
  },
});
