import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SavingsTab({ userData, timeDeposit, formatCurrency }) {
  return (
    <View style={styles.container}>
      <View style={styles.savingsCard}>
        <Text style={styles.title}>Savings Account</Text>
        <Text style={styles.subtitle}>Time Deposit Total</Text>
        <Text style={styles.amount}>₱ {formatCurrency(timeDeposit)}</Text>
        <Text style={styles.description}>
          Your savings are growing! Keep investing for better returns.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    marginBottom: 10,
  },
  savingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 200,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  amount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#E15816",
    marginBottom: 16,
  },
  description: {
    fontSize: 13,
    color: "#999",
    lineHeight: 18,
  },
});
