import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DepositIndex() {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const depositTypes = [
    {
      id: "timedeposit",
      title: "Time Deposit",
      subtitle: "Minimum ₱50,000 for Time Deposit",
      icon: "time-outline" as const,
      route: "/timedeposit",
    },
    {
      id: "stock",
      title: "Stock Investment",
      subtitle: "Minimum ₱2,000,000 for Stock",
      icon: "bar-chart-outline" as const,
      route: "/stockinvestment",
    },
    {
      id: "topup",
      title: "Top Up Available Balance",
      subtitle: "Top Up Available Balance",
      icon: "wallet-outline" as const,
      route: "/topup",
    },
  ] as const;

  const handleContinue = () => {
    if (selectedType) {
      const selected = depositTypes.find((type) => type.id === selectedType);
      if (selected) {
        const screenName = selected.route.replace(/^\//, "");
        (navigation as { navigate: (name: string) => void }).navigate(screenName);
      }
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
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deposit Request</Text>

          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step Progress Bar */}
          <View style={styles.stepProgressContainer}>
            <View style={styles.stepProgressBar}>
              <View style={styles.stepProgressFill} />
            </View>
            <Text style={styles.stepText}>Step 1 of 3</Text>
          </View>

          {/* Icon Circle */}
          <View style={styles.iconCircle}>
            <Ionicons name="trending-up" size={48} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Select Deposit Type *</Text>
          <Text style={styles.subtitle}>Choose your investment type</Text>

          {/* Deposit Type Options */}
          <View style={styles.optionsContainer}>
            {depositTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionCard,
                  selectedType === type.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={styles.optionIconCircle}>
                  <Ionicons name={type.icon} size={32} color="#E25A17" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{type.title}</Text>
                  <Text style={styles.optionSubtitle}>{type.subtitle}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedType === type.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedType === type.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={!selectedType}
          >
            <LinearGradient
              colors={
                selectedType
                  ? ["#E25A17", "#F28934"]
                  : ["#CCCCCC", "#AAAAAA"]
              }
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
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
    paddingHorizontal: 20,
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepProgressContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  stepProgressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  stepProgressFill: {
    height: "100%",
    width: "33.33%",
    backgroundColor: "#E25A17",
  },
  stepText: {
    fontSize: 14,
    color: "#E25A17",
    textAlign: "center",
    fontWeight: "600",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E25A17",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionCardSelected: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF5F0",
  },
  optionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#999",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#E25A17",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E25A17",
  },
  continueButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
  bottomPadding: {
    height: 40,
  },
});
