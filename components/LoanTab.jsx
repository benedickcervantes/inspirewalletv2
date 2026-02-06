import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function LoanTab({ userData }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.loanCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="cash-outline" size={48} color="#E15816" />
        </View>
        <Text style={styles.title}>Loan Services</Text>
        <Text style={styles.description}>
          Apply for personal loans, business loans, and more. Get quick approval and competitive rates.
        </Text>
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => {
            // Navigate to loan application page when available
            alert("Loan application feature coming soon!");
          }}
        >
          <Text style={styles.applyButtonText}>Apply for Loan</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    marginBottom: 10,
  },
  loanCard: {
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
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E15816",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
