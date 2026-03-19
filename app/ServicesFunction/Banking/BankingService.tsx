import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;

const BANKS = ["UnionBank", "Security Bank", "CTBC", "BDO"];

export default function BankingService() {
  const { t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Bdo">>();
  const [selectedBank, setSelectedBank] = useState("UnionBank");
  const [showBankModal, setShowBankModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [currentStep] = useState(1);

  const handleNext = () => {
    navigation.navigate("BankingContactInfo", { selectedBank });
  };

  const handleTopBackPress = () => {
    setShowExitConfirmModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    navigation.navigate("Main");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top: Back arrow + Header card */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleTopBackPress}
          >
            <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
          </TouchableOpacity>

          <View style={styles.headerCard}>
            <LinearGradient
              colors={ORANGE_GRADIENT}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <MaterialCommunityIcons
                name="bank"
                size={40}
                color="#FFFFFF"
                style={styles.headerIcon}
              />
              <Text style={styles.headerTitle}>{t("banking.headerTitle")}</Text>
              <Text style={styles.headerSubtitle}>{t("banking.headerSubtitle")}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Progress Stepper */}
        <View style={styles.progressContainer}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.stepCircle,
                    currentStep === step && styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      currentStep === step && styles.stepNumberActive,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
                {step < 6 && <View style={styles.stepLine} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Content Card - Step 1 */}
          <View style={styles.contentCard}>
            <View style={styles.stepIconWrapper}>
              <MaterialCommunityIcons
                name="bank"
                size={28}
                color={THEME_COLOR}
              />
            </View>
            <Text style={styles.contentTitle}>{t("banking.chooseBank")}</Text>
            <Text style={styles.contentDescription}>
              {t("banking.chooseBankDesc")}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t("banking.preferredBank")}</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowBankModal(true)}
              >
                <Text style={styles.dropdownText}>{selectedBank}</Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <Text style={styles.infoText}>
              {t("banking.infoNote")}
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Next Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={ORANGE_GRADIENT}
              style={styles.nextGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>{t("banking.next")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bank Selection Modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.selectBank")}</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {BANKS.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={[
                    styles.bankOption,
                    selectedBank === bank && styles.bankOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBank(bank);
                    setShowBankModal(false);
                  }}
                >
                  <Text style={styles.bankOptionText}>{bank}</Text>
                  {selectedBank === bank && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={showExitConfirmModal}
        onRequestClose={() => setShowExitConfirmModal(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContainer}>
            <View style={styles.exitModalIconWrap}>
              <Ionicons name="warning-outline" size={28} color={THEME_COLOR} />
            </View>
            <Text style={styles.exitModalTitle}>{t("common.cancelApplication")}</Text>
            <Text style={styles.exitModalMessage}>
              {t("banking.cancelApplicationMessage")}
            </Text>
            <View style={styles.exitModalButtons}>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.exitModalKeepEditingButton]}
                onPress={() => setShowExitConfirmModal(false)}
              >
                <Text
                  style={[
                    styles.exitModalButtonText,
                    styles.exitModalKeepEditingButtonText,
                  ]}
                >
                  {t("common.keepEditing")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.exitModalDiscardButton]}
                onPress={handleConfirmExit}
              >
                <Text
                  style={[styles.exitModalButtonText, styles.exitModalDiscardButtonText]}
                >
                  {t("common.discardExit")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    marginBottom: 12,
    padding: 4,
  },
  headerCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: "#9E9E9E",
    borderWidth: 2,
    borderColor: "#757575",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9E9E9E",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stepIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  contentDescription: {
    fontSize: 14,
    color: "#9E9E9E",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 235, 205, 0.9)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.35)",
  },
  infoIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#333333",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    backgroundColor: "#FFFFFF",
  },
  nextButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  bankOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  bankOptionSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  bankOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  exitModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ECEFF4",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  exitModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF7E9",
    borderWidth: 1,
    borderColor: "#FFE2AF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  exitModalTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  exitModalMessage: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  exitModalButtons: {
    width: "100%",
  },
  exitModalButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  exitModalDiscardButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3C3B1",
  },
  exitModalKeepEditingButton: {
    backgroundColor: THEME_COLOR,
    marginBottom: 10,
  },
  exitModalButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  exitModalDiscardButtonText: {
    color: "#D9480F",
  },
  exitModalKeepEditingButtonText: {
    color: "#FFFFFF",
  },
});
