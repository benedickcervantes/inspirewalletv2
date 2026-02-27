import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

const EMPTY_PLACEHOLDER = "__empty__";

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
const YEARS = Array.from({ length: 71 }, (_, i) => (2010 - i).toString());

export interface TravelProtectPerDeatailsProps {
  gender: string;
  setGender: (value: string) => void;
  dateOfBirth: Date | null;
  dateOfBirthText: string;
  showDateModal: boolean;
  setShowDateModal: (value: boolean) => void;
  tempDate: { month: number; day: number; year: number };
  setTempDate: (value: { month: number; day: number; year: number }) => void;
  civilStatus: string;
  setCivilStatus: (value: string) => void;
  citizenship: string;
  setCitizenship: (value: string) => void;
  showGenderDropdown: boolean;
  setShowGenderDropdown: (value: boolean) => void;
  showCivilStatusDropdown: boolean;
  setShowCivilStatusDropdown: (value: boolean) => void;
  applyDateFromTemp: (month: number, day: number, year: number) => void;
}

export default function TravelProtectPerDeatails({
  gender,
  setGender,
  dateOfBirth,
  dateOfBirthText,
  showDateModal,
  setShowDateModal,
  tempDate,
  setTempDate,
  civilStatus,
  setCivilStatus,
  citizenship,
  setCitizenship,
  showGenderDropdown,
  setShowGenderDropdown,
  showCivilStatusDropdown,
  setShowCivilStatusDropdown,
  applyDateFromTemp,
}: TravelProtectPerDeatailsProps) {
  const { t } = useLanguage();

  return (
    <>
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formIconContainer}>
            <MaterialCommunityIcons
              name="account-circle"
              size={24}
              color="#E25A17"
            />
          </View>
          <View>
            <Text style={styles.formTitle}>{t("travel.personalDetails")}</Text>
            <Text style={styles.formSubtitle}>
              {t("travel.personalSubtitle")}
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.gender")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowGenderDropdown(!showGenderDropdown)}
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
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          {showGenderDropdown && (
            <View style={styles.dropdownMenu}>
              {(["Male", "Female", "Other"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setGender(option);
                    setShowGenderDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>
                    {option === "Male"
                      ? t("travel.genderMale")
                      : option === "Female"
                        ? t("travel.genderFemale")
                        : t("travel.genderOther")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.dateOfBirth")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
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
                dateOfBirthText === EMPTY_PLACEHOLDER && styles.dropdownPlaceholder,
              ]}
            >
              {dateOfBirthText === EMPTY_PLACEHOLDER
                ? t("travel.selectBirthdate")
                : dateOfBirthText}
            </Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.civilStatus")} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() =>
              setShowCivilStatusDropdown(!showCivilStatusDropdown)
            }
          >
            <Text style={styles.dropdownText}>
              {civilStatus === "Single"
                ? t("travel.single")
                : civilStatus === "Married"
                  ? t("travel.married")
                  : civilStatus === "Divorced"
                    ? t("travel.divorced")
                    : t("travel.widowed")}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          {showCivilStatusDropdown && (
            <View style={styles.dropdownMenu}>
              {(["Single", "Married", "Divorced", "Widowed"] as const).map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCivilStatus(option);
                      setShowCivilStatusDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>
                      {option === "Single"
                        ? t("travel.single")
                        : option === "Married"
                          ? t("travel.married")
                          : option === "Divorced"
                            ? t("travel.divorced")
                            : t("travel.widowed")}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.citizenship")} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t("travel.placeholderCitizenship")}
            placeholderTextColor="#999"
            value={citizenship}
            onChangeText={setCitizenship}
          />
        </View>
      </View>

      {/* Date of Birth Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.dateModalOverlay}>
          <TouchableOpacity
            style={styles.dateModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDateModal(false)}
          />
          <View style={styles.dateModalContainer}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>
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
                >
                  {MONTH_KEYS.map((key, i) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dateOption,
                        tempDate.month === i && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = { ...tempDate, month: i };
                        setTempDate(next);
                        applyDateFromTemp(next.month, next.day, next.year);
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
                        const next = { ...tempDate, day: parseInt(d, 10) };
                        setTempDate(next);
                        applyDateFromTemp(next.month, next.day, next.year);
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
                        const next = { ...tempDate, year: parseInt(y, 10) };
                        setTempDate(next);
                        applyDateFromTemp(next.month, next.day, next.year);
                      }}
                    >
                      <Text style={styles.dateOptionText}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E25A17",
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dropdown: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  dropdownPlaceholder: {
    color: "#999",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  dateModalBackdrop: {
    flex: 1,
  },
  dateModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
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
});
