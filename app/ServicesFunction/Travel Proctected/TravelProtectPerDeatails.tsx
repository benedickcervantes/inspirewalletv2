import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

import ActivityModal from '../../components/ActivityModal';
const EMPTY_PLACEHOLDER = "__empty__";
const THEME_COLOR = "#E15816";

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Separated",
  "Divorced",
] as const;
const CITIZENSHIP_OPTIONS = [
  "Filipino",
  "Dual Citizen",
  "Foreign National",
] as const;

const MONTH_KEYS = [
  "banking.january",
  "banking.february",
  "banking.march",
  "banking.april",
  "banking.may",
  "banking.june",
  "banking.july",
  "banking.august",
  "banking.september",
  "banking.october",
  "banking.november",
  "banking.december",
] as const;
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const YEARS = Array.from({ length: 100 }, (_, i) =>
  (new Date().getFullYear() - i).toString(),
);

export interface TravelProtectPerDeatailsProps {
  gender: string;
  genderError?: string;
  setGender: (value: string) => void;
  dateOfBirth: Date | null;
  dateOfBirthError?: string;
  dateOfBirthText: string;
  showDateModal: boolean;
  setShowDateModal: (value: boolean) => void;
  tempDate: { month: number; day: number; year: number };
  setTempDate: (value: { month: number; day: number; year: number }) => void;
  civilStatus: string;
  civilStatusError?: string;
  setCivilStatus: (value: string) => void;
  citizenship: string;
  citizenshipError?: string;
  setCitizenship: (value: string) => void;
  showGenderDropdown: boolean;
  setShowGenderDropdown: (value: boolean) => void;
  showCivilStatusDropdown: boolean;
  setShowCivilStatusDropdown: (value: boolean) => void;
  showCitizenshipDropdown: boolean;
  setShowCitizenshipDropdown: (value: boolean) => void;
  applyDateFromTemp: (month: number, day: number, year: number) => void;
}

export default function TravelProtectPerDeatails({
  gender,
  genderError,
  setGender,
  dateOfBirth,
  dateOfBirthError,
  dateOfBirthText,
  showDateModal,
  setShowDateModal,
  tempDate,
  setTempDate,
  civilStatus,
  civilStatusError,
  setCivilStatus,
  citizenship,
  citizenshipError,
  setCitizenship,
  showGenderDropdown,
  setShowGenderDropdown,
  showCivilStatusDropdown,
  setShowCivilStatusDropdown,
  showCitizenshipDropdown,
  setShowCitizenshipDropdown,
  applyDateFromTemp,
}: TravelProtectPerDeatailsProps) {
  const { t } = useLanguage();
  const { height: windowHeight } = useWindowDimensions();
  const modalListMaxHeight = Math.min(420, windowHeight * 0.45);

  const handleDateConfirm = () => {
    applyDateFromTemp(tempDate.month, tempDate.day, tempDate.year);
    setShowDateModal(false);
  };

  return (
    <>
      <View style={styles.formCard} pointerEvents="box-none">
        <View style={styles.formHeader} pointerEvents="box-none">
          <View style={styles.formIconContainer}>
            <MaterialCommunityIcons
              name="account-circle"
              size={24}
              color={THEME_COLOR}
            />
          </View>
          <View style={styles.formHeaderTextContainer} pointerEvents="box-none">
            <Text style={styles.formTitle}>{t("travel.personalDetails")}</Text>
            <Text style={styles.formSubtitle}>
              {t("travel.personalSubtitle")}
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup} pointerEvents="box-none">
          <Text style={styles.inputLabel}>
            {t("travel.gender")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.dropdown, genderError ? styles.inputError : null]}
            onPress={() => setShowGenderDropdown(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                !gender && styles.dropdownPlaceholder,
              ]}
            >
              {gender
                ? gender === "Male"
                  ? t("travel.genderMale")
                  : gender === "Female"
                    ? t("travel.genderFemale")
                    : t("travel.genderOther")
                : t("travel.selectGender")}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
          {genderError ? (
            <Text style={styles.errorText}>{genderError}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup} pointerEvents="box-none">
          <Text style={styles.inputLabel}>
            {t("travel.dateOfBirth")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdown,
              dateOfBirthError ? styles.inputError : null,
            ]}
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
                dateOfBirthText === EMPTY_PLACEHOLDER &&
                  styles.dropdownPlaceholder,
              ]}
            >
              {dateOfBirthText === EMPTY_PLACEHOLDER
                ? t("travel.selectBirthdate")
                : dateOfBirthText}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#999" />
          </TouchableOpacity>
          {dateOfBirthError ? (
            <Text style={styles.errorText}>{dateOfBirthError}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup} pointerEvents="box-none">
          <Text style={styles.inputLabel}>
            {t("travel.civilStatus")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdown,
              civilStatusError ? styles.inputError : null,
            ]}
            onPress={() => setShowCivilStatusDropdown(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                !civilStatus && styles.dropdownPlaceholder,
              ]}
            >
              {civilStatus
                ? civilStatus === "Single"
                  ? t("travel.single")
                  : civilStatus === "Married"
                    ? t("travel.married")
                    : civilStatus === "Divorced"
                      ? t("travel.divorced")
                      : civilStatus === "Widowed"
                        ? t("travel.widowed")
                        : t("travel.separated")
                : t("travel.selectCivilStatus")}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
          {civilStatusError ? (
            <Text style={styles.errorText}>{civilStatusError}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup} pointerEvents="box-none">
          <Text style={styles.inputLabel}>
            {t("travel.citizenship")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdown,
              citizenshipError ? styles.inputError : null,
            ]}
            onPress={() => setShowCitizenshipDropdown(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                !citizenship && styles.dropdownPlaceholder,
              ]}
            >
              {citizenship
                ? citizenship === "Filipino"
                  ? t("banking.filipino")
                  : citizenship === "Dual Citizen"
                    ? t("banking.dualCitizen")
                    : t("banking.foreignNational")
                : t("travel.selectCitizenship")}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
          {citizenshipError ? (
            <Text style={styles.errorText}>{citizenshipError}</Text>
          ) : null}
        </View>
      </View>

      {/* Gender Modal */}
      <ActivityModal
        visible={showGenderDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("banking.modalSelectGender")}
              </Text>
              <TouchableOpacity onPress={() => setShowGenderDropdown(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.modalContent, { maxHeight: modalListMaxHeight }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    gender === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setGender(opt);
                    setShowGenderDropdown(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {opt === "Male"
                      ? t("travel.genderMale")
                      : opt === "Female"
                        ? t("travel.genderFemale")
                        : t("travel.genderOther")}
                  </Text>
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
      </ActivityModal>

      {/* Civil Status Modal */}
      <ActivityModal
        visible={showCivilStatusDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCivilStatusDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("banking.modalSelectCivilStatus")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCivilStatusDropdown(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.modalContent, { maxHeight: modalListMaxHeight }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {CIVIL_STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    civilStatus === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setCivilStatus(opt);
                    setShowCivilStatusDropdown(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {opt === "Single"
                      ? t("travel.single")
                      : opt === "Married"
                        ? t("travel.married")
                        : opt === "Widowed"
                          ? t("travel.widowed")
                          : opt === "Separated"
                            ? t("travel.separated")
                            : t("travel.divorced")}
                  </Text>
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
      </ActivityModal>

      {/* Date of Birth Modal */}
      <ActivityModal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.dateModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("travel.selectBirthdate")}
              </Text>
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
                  nestedScrollEnabled
                >
                  {MONTH_KEYS.map((key, i) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dateOption,
                        tempDate.month === i && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        setTempDate({ ...tempDate, month: i });
                      }}
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
                  nestedScrollEnabled
                >
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dateOption,
                        tempDate.day === parseInt(d, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        setTempDate({ ...tempDate, day: parseInt(d, 10) });
                      }}
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
                  nestedScrollEnabled
                >
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.dateOption,
                        tempDate.year === parseInt(y, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        setTempDate({ ...tempDate, year: parseInt(y, 10) });
                      }}
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
      </ActivityModal>
      {/* Citizenship Modal */}
      <ActivityModal
        visible={showCitizenshipDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCitizenshipDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("banking.modalSelectCitizenship")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCitizenshipDropdown(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.modalContent, { maxHeight: modalListMaxHeight }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {CITIZENSHIP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    citizenship === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setCitizenship(opt);
                    setShowCitizenshipDropdown(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {opt === "Filipino"
                      ? t("banking.filipino")
                      : opt === "Dual Citizen"
                        ? t("banking.dualCitizen")
                        : t("banking.foreignNational")}
                  </Text>
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
      </ActivityModal>
    </>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  formHeaderTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
    flexShrink: 1,
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
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
    borderWidth: 2,
    borderColor: "#E0E0E0",
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
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
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
    flexDirection: "column",
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
    backgroundColor: "rgba(226, 90, 23, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(226, 90, 23, 0.3)",
  },
  dateOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dateConfirmButton: {
    margin: 20,
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
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
