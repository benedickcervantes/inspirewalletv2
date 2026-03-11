import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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

export default function WithdrawRequest() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const withdrawalMethods = [
    {
      id: "local-bank",
      titleKey: "withdraw.bankTransfer",
      subtitleKey: "withdraw.bankTransferSubtitle",
      icon: "business" as const,
      useImage: true,
    },
    {
      id: "e-wallet",
      titleKey: "withdraw.ewallet",
      subtitleKey: "withdraw.ewalletSubtitle",
      icon: "wallet" as const,
      useImage: false,
    },
  ];

  const handleContinue = () => {
    if (!selectedMethod) {
      setErrors({
        selectedMethod: t("withdraw.validation.method"),
      });
      return;
    }

    setErrors({});

    // Navigate to next step based on selected method
    if (selectedMethod === "local-bank") {
      navigation.navigate("WithdrawBank");
    } else if (selectedMethod === "e-wallet") {
      navigation.navigate("WithdrawEwallet");
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

          <Text style={styles.headerTitle}>{t("withdraw.title")}</Text>

          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFilled} />
          </View>
          <Text style={styles.progressText}>
            {t("withdraw.stepIndicator").replace("{step}", "2")}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon Circle */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="credit-card-outline"
              size={48}
              color="#FFFFFF"
            />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("withdraw.selectMethod")}</Text>
            <Text style={styles.subtitle}>{t("withdraw.chooseHowToWithdraw")}</Text>
          </View>

          {/* Withdrawal Method Options */}
          <View style={styles.methodsContainer}>
            {withdrawalMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodOption,
                  selectedMethod === method.id && styles.methodOptionSelected,
                ]}
                onPress={() => {
                  setSelectedMethod(method.id);
                  if (errors.selectedMethod) {
                    setErrors({});
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.methodIconBox}>
                  {method.useImage ? (
                    <Image
                      source={require("../../../assets/images/local_bank_icon.png")}
                      style={styles.bankIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={
                        method.icon as React.ComponentProps<
                          typeof MaterialCommunityIcons
                        >["name"]
                      }
                      size={28}
                      color="#E25A17"
                    />
                  )}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>{t(method.titleKey)}</Text>
                  <Text style={styles.methodSubtitle}>{t(method.subtitleKey)}</Text>
                </View>
                <View style={styles.radioButton}>
                  {selectedMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {errors.selectedMethod && (
              <Text style={styles.errorText}>{errors.selectedMethod}</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#E25A17" />
              <Text style={styles.backButtonText}>{t("withdraw.back")}</Text>
            </TouchableOpacity>

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
                <Text style={styles.continueText}>{t("withdraw.continue")}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

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
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFilled: {
    width: "40%",
    height: "100%",
    backgroundColor: "#E25A17",
  },
  progressText: {
    fontSize: 14,
    color: "#E25A17",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E25A17",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  methodsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  methodOptionSelected: {
    borderColor: "#E25A17",
    backgroundColor: "#FFF5F0",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  methodIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  bankIcon: {
    width: 28,
    height: 28,
    tintColor: "#E25A17",
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 13,
    color: "#999",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E25A17",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E25A17",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  continueButton: {
    flex: 1,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueGradient: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 20,
  },
  // Alert Modal Styles
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
    color: "#E15816",
  },
});
