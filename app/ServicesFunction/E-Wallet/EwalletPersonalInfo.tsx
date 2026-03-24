import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
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
import type { EwalletApplicationData, RootStackParamList } from "../../../types/navigation";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated", "Divorced"];
const CITIZENSHIP_OPTIONS = ["Filipino", "Dual Citizen", "Foreign National"];
const MONTH_KEYS = [
  "banking.january", "banking.february", "banking.march", "banking.april", "banking.may", "banking.june",
  "banking.july", "banking.august", "banking.september", "banking.october", "banking.november", "banking.december",
];
const GENDER_KEY: Record<string, string> = { Male: "banking.genderMale", Female: "banking.genderFemale", Other: "banking.genderOther" };
const CIVIL_STATUS_KEY: Record<string, string> = { Single: "banking.single", Married: "banking.married", Widowed: "banking.widowed", Separated: "banking.separated", Divorced: "banking.divorced" };
const CITIZENSHIP_KEY: Record<string, string> = { Filipino: "banking.filipino", "Dual Citizen": "banking.dualCitizen", "Foreign National": "banking.foreignNational" };
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const YEARS = Array.from({ length: 71 }, (_, i) => (2010 - i).toString());

export default function EwalletPersonalInfo() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "EwalletPersonalInfo">
    >();
  const route =
    useRoute<RouteProp<RootStackParamList, "EwalletPersonalInfo">>();
  const { t } = useLanguage();
  const selectedProvider = route.params?.selectedProvider ?? "";

  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [civilStatus, setCivilStatus] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [errors, setErrors] = useState<{ gender?: string; dob?: string; civilStatus?: string; citizenship?: string }>({});

  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCivilStatusModal, setShowCivilStatusModal] = useState(false);
  const [showCitizenshipModal, setShowCitizenshipModal] = useState(false);

  const [tempDate, setTempDate] = useState({ month: 0, day: 1, year: 2000 });
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const currentStep = 3;

  const formatDate = (d: Date | null) => {
    if (!d) return "";
    return `${t(MONTH_KEYS[d.getMonth()])} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const handleDateConfirm = () => {
    const d = new Date(tempDate.year, tempDate.month, tempDate.day);
    setDateOfBirth(d);
    if (errors.dob) setErrors({ ...errors, dob: undefined });
    setShowDateModal(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTopBackPress = () => {
    setShowExitConfirmModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    navigation.navigate("Main");
  };

  const handleNext = () => {
    const newErrors: typeof errors = {};
    if (!gender) newErrors.gender = "Gender is required";
    if (!dateOfBirth) newErrors.dob = "Date of birth is required";
    if (!civilStatus) newErrors.civilStatus = "Civil status is required";
    if (!citizenship) newErrors.citizenship = "Citizenship is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const applicationData: EwalletApplicationData = {
      ...(route.params?.applicationData || {}),
      personalInfo: {
        gender: gender.trim(),
        dateOfBirth: dateOfBirth!.toISOString(),
        civilStatus: civilStatus.trim(),
        citizenship: citizenship.trim(),
      },
    };

    navigation.navigate("EwalletAddressInfo", { 
      selectedProvider,
      applicationData
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top: Back arrow + Header card */}
        <View style={styles.topSection}>
          <TouchableOpacity style={styles.backButton} onPress={handleTopBackPress}>
            <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
          </TouchableOpacity>

          <View style={styles.headerCard}>
            <LinearGradient
              colors={ORANGE_GRADIENT}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.headerIconWrapper}>
                <MaterialCommunityIcons
                  name="wallet"
                  size={40}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.headerTitle}>{t("ewallet.headerTitle")}</Text>
              <Text style={styles.headerSubtitle}>
                {t("ewallet.headerSubtitle")}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Progress Stepper - 5 steps, Steps 1-2 complete, Step 3 active */}
        <View style={styles.progressContainer}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.stepCircle,
                    step < currentStep && styles.stepCircleComplete,
                    step === currentStep && styles.stepCircleActive,
                  ]}
                >
                  {step < currentStep ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        step === currentStep && styles.stepNumberActive,
                      ]}
                    >
                      {step}
                    </Text>
                  )}
                </View>
                {step < 6 && (
                  <View
                    style={[
                      styles.stepLine,
                      step < currentStep && styles.stepLineComplete,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Content Card - Personal Details */}
          <View style={styles.contentCard}>
            <View style={styles.stepIconWrapper}>
              <Ionicons name="person-outline" size={28} color={THEME_COLOR} />
            </View>
            <Text style={styles.contentTitle}>{t("banking.personalDetails")}</Text>
            <Text style={styles.contentDescription}>
              {t("banking.personalDetailsDesc")}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("banking.gender")}<Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.gender && styles.inputError]}
                onPress={() => setShowGenderModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !gender && styles.dropdownPlaceholder,
                  ]}
                >
                  {gender ? t(GENDER_KEY[gender]) : t("banking.selectGender")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("banking.dateOfBirth")}<Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.dob && styles.inputError]}
                onPress={() => {
                  if (dateOfBirth) {
                    setTempDate({
                      month: dateOfBirth.getMonth(),
                      day: dateOfBirth.getDate(),
                      year: dateOfBirth.getFullYear(),
                    });
                  }
                  setShowDateModal(true);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !dateOfBirth && styles.dropdownPlaceholder,
                  ]}
                >
                  {dateOfBirth ? formatDate(dateOfBirth) : t("banking.selectBirthdate")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#999" />
              </TouchableOpacity>
              {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("banking.civilStatus")}<Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.civilStatus && styles.inputError]}
                onPress={() => setShowCivilStatusModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !civilStatus && styles.dropdownPlaceholder,
                  ]}
                >
                  {civilStatus ? t(CIVIL_STATUS_KEY[civilStatus]) : t("banking.selectCivilStatus")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {errors.civilStatus && <Text style={styles.errorText}>{errors.civilStatus}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("banking.citizenship")}<Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.citizenship && styles.inputError]}
                onPress={() => setShowCitizenshipModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !citizenship && styles.dropdownPlaceholder,
                  ]}
                >
                  {citizenship ? t(CITIZENSHIP_KEY[citizenship]) : t("banking.selectCitizenship")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {errors.citizenship && <Text style={styles.errorText}>{errors.citizenship}</Text>}
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <Text style={styles.infoText}>
              {t("ewallet.infoNote")}
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Back & Next Buttons */}
        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButtonFooter}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>{t("ewallet.back")}</Text>
            </TouchableOpacity>
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
                <Text style={styles.nextButtonText}>{t("ewallet.next")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectGender")}</Text>
              <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    gender === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setGender(opt);
                    if (errors.gender) setErrors({ ...errors, gender: undefined });
                    setShowGenderModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(GENDER_KEY[opt])}</Text>
                  {gender === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date of Birth Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.dateModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectBirthdate")}</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.month")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {MONTH_KEYS.map((key, i) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dateOption,
                        tempDate.month === i && styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempDate((p) => ({ ...p, month: i }))
                      }
                    >
                      <Text style={styles.dateOptionText}>{t(key)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.day")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dateOption,
                        tempDate.day === parseInt(d, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempDate((p) => ({ ...p, day: parseInt(d, 10) }))
                      }
                    >
                      <Text style={styles.dateOptionText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.year")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.dateOption,
                        tempDate.year === parseInt(y, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempDate((p) => ({ ...p, year: parseInt(y, 10) }))
                      }
                    >
                      <Text style={styles.dateOptionText}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dateConfirmButton}
              onPress={handleDateConfirm}
            >
              <Text style={styles.dateConfirmText}>{t("banking.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Civil Status Modal */}
      <Modal
        visible={showCivilStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCivilStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectCivilStatus")}</Text>
              <TouchableOpacity onPress={() => setShowCivilStatusModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {CIVIL_STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    civilStatus === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setCivilStatus(opt);
                    if (errors.civilStatus) setErrors({ ...errors, civilStatus: undefined });
                    setShowCivilStatusModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(CIVIL_STATUS_KEY[opt])}</Text>
                  {civilStatus === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Citizenship Modal */}
      <Modal
        visible={showCitizenshipModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCitizenshipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectCitizenship")}</Text>
              <TouchableOpacity onPress={() => setShowCitizenshipModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {CITIZENSHIP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    citizenship === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setCitizenship(opt);
                    if (errors.citizenship) setErrors({ ...errors, citizenship: undefined });
                    setShowCitizenshipModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(CITIZENSHIP_KEY[opt])}</Text>
                  {citizenship === opt && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={THEME_COLOR}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Exit confirmation modal */}
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
              {t("ewallet.cancelApplicationMessage")}
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
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
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
    borderWidth: 2,
    borderColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleComplete: {
    backgroundColor: GREEN_COMPLETE,
    borderColor: GREEN_COMPLETE,
  },
  stepCircleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#9E9E9E",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9E9E9E",
  },
  stepNumberActive: {
    color: "#757575",
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  stepLineComplete: {
    backgroundColor: GREEN_COMPLETE,
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  required: {
    color: THEME_COLOR,
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
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonFooter: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  nextButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
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
  dateModalContainer: {
    maxHeight: "70%",
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
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  optionRowSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  datePickerRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  datePickerColumn: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  dateScroll: {
    maxHeight: 180,
  },
  dateOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  dateOptionSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  dateOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dateConfirmButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  dateConfirmText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
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
