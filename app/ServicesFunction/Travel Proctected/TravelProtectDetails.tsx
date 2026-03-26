import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

import { useLanguage } from "../../../context/LanguageContext";

const EMPTY_PLACEHOLDER = "__empty__";
const THEME_COLOR = "#E15816";

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
const YEARS = Array.from({ length: 20 }, (_, i) =>
  (new Date().getFullYear() + i).toString(),
); // Travel check-in can be current year or future
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0"),
);

export interface TravelProtectDetailsProps {
  destinationAddress: string;
  destinationAddressError?: string;
  setDestinationAddress: (value: string) => void;
  checkInDate: Date | null;
  checkInDateError?: string;
  checkInDateText: string;
  setShowCheckInModal: (value: boolean) => void;
  tempCheckInDate: { month: number; day: number; year: number };
  setTempCheckInDate: (value: {
    month: number;
    day: number;
    year: number;
  }) => void;
  duration: string;
  durationError?: string;
  setDuration: (value: string) => void;
  departureTime: Date;
  departureTimeError?: string;
  departureTimeText: string;
  setShowDepartureTimePicker: (value: boolean) => void;
  tempDepartureTime: { hour: number; minute: number };
  setTempDepartureTime: (value: { hour: number; minute: number }) => void;
  arrivalTime: Date;
  arrivalTimeError?: string;
  arrivalTimeText: string;
  setShowArrivalTimePicker: (value: boolean) => void;
  tempArrivalTime: { hour: number; minute: number };
  setTempArrivalTime: (value: { hour: number; minute: number }) => void;
  passportNumber: string;
  passportNumberError?: string;
  setPassportNumber: (value: string) => void;
  purposeOfTravel: string;
  purposeOfTravelError?: string;
  setPurposeOfTravel: (value: string) => void;
  showCheckInModal: boolean;
  showDepartureTimePicker: boolean;
  showArrivalTimePicker: boolean;
  applyCheckInDateFromTemp: (month: number, day: number, year: number) => void;
  applyDepartureTimeFromTemp: (hour: number, minute: number) => void;
  applyArrivalTimeFromTemp: (hour: number, minute: number) => void;
}

export default function TravelProtectDetails({
  destinationAddress,
  destinationAddressError,
  setDestinationAddress,
  checkInDateText,
  checkInDateError,
  setShowCheckInModal,
  tempCheckInDate,
  setTempCheckInDate,
  duration,
  durationError,
  setDuration,
  departureTimeText,
  departureTimeError,
  setShowDepartureTimePicker,
  tempDepartureTime,
  setTempDepartureTime,
  arrivalTimeText,
  arrivalTimeError,
  setShowArrivalTimePicker,
  tempArrivalTime,
  setTempArrivalTime,
  passportNumber,
  passportNumberError,
  setPassportNumber,
  purposeOfTravel,
  purposeOfTravelError,
  setPurposeOfTravel,
  showCheckInModal,
  showDepartureTimePicker,
  showArrivalTimePicker,
  applyCheckInDateFromTemp,
  applyDepartureTimeFromTemp,
  applyArrivalTimeFromTemp,
}: TravelProtectDetailsProps) {
  const { t } = useLanguage();

  const handleCheckInConfirm = () => {
    applyCheckInDateFromTemp(
      tempCheckInDate.month,
      tempCheckInDate.day,
      tempCheckInDate.year,
    );
    setShowCheckInModal(false);
  };

  const handleDepartureConfirm = () => {
    applyDepartureTimeFromTemp(
      tempDepartureTime.hour,
      tempDepartureTime.minute,
    );
    setShowDepartureTimePicker(false);
  };

  const handleArrivalConfirm = () => {
    applyArrivalTimeFromTemp(tempArrivalTime.hour, tempArrivalTime.minute);
    setShowArrivalTimePicker(false);
  };

  return (
    <>
      <View style={styles.container} pointerEvents="box-none">
        <View style={styles.formCard} pointerEvents="box-none">
          {/* HEADER */}
          <View style={styles.formHeader} pointerEvents="box-none">
            <View style={styles.formIconContainer}>
              <MaterialCommunityIcons
                name="airplane-takeoff"
                size={24}
                color={THEME_COLOR}
              />
            </View>

            <View style={styles.formHeaderTextContainer} pointerEvents="box-none">
              <Text style={styles.formTitle}>{t("travel.travelDetails")}</Text>

              <Text style={styles.formSubtitle}>
                {t("travel.travelSubtitle")}
              </Text>
            </View>
          </View>

          {/* DESTINATION */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.destinationAddress")}{" "}
              <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
                destinationAddressError ? styles.inputError : null,
              ]}
              placeholder={t("travel.placeholderDestination")}
              placeholderTextColor="#999"
              value={destinationAddress}
              onChangeText={setDestinationAddress}
              multiline
              textAlignVertical="top"
              returnKeyType="next"
            />
            {destinationAddressError ? (
              <Text style={styles.errorText}>{destinationAddressError}</Text>
            ) : null}
          </View>

          {/* CHECK IN DATE */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.checkInDate")} <Text style={styles.required}>*</Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.dropdown,
                checkInDateError ? styles.inputError : null,
              ]}
              onPress={() => setShowCheckInModal(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  checkInDateText === EMPTY_PLACEHOLDER &&
                    styles.dropdownPlaceholder,
                ]}
              >
                {checkInDateText === EMPTY_PLACEHOLDER
                  ? t("travel.selectCheckIn")
                  : checkInDateText}
              </Text>

              <Ionicons name="calendar-outline" size={20} color="#999" />
            </TouchableOpacity>
            {checkInDateError ? (
              <Text style={styles.errorText}>{checkInDateError}</Text>
            ) : null}
          </View>

          {/* DURATION */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.durationDays")} <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[styles.input, durationError ? styles.inputError : null]}
              placeholder="0"
              placeholderTextColor="#999"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {durationError ? (
              <Text style={styles.errorText}>{durationError}</Text>
            ) : null}
          </View>

          {/* DEPARTURE TIME */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.departureTime")} <Text style={styles.required}>*</Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.dropdown,
                departureTimeError ? styles.inputError : null,
              ]}
              onPress={() => setShowDepartureTimePicker(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  departureTimeText === EMPTY_PLACEHOLDER &&
                    styles.dropdownPlaceholder,
                ]}
              >
                {departureTimeText === EMPTY_PLACEHOLDER
                  ? t("travel.selectDeparture")
                  : departureTimeText}
              </Text>

              <Ionicons name="time-outline" size={20} color="#999" />
            </TouchableOpacity>
            {departureTimeError ? (
              <Text style={styles.errorText}>{departureTimeError}</Text>
            ) : null}
          </View>

          {/* ARRIVAL TIME */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.arrivalTime")} <Text style={styles.required}>*</Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.dropdown,
                arrivalTimeError ? styles.inputError : null,
              ]}
              onPress={() => setShowArrivalTimePicker(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  arrivalTimeText === EMPTY_PLACEHOLDER &&
                    styles.dropdownPlaceholder,
                ]}
              >
                {arrivalTimeText === EMPTY_PLACEHOLDER
                  ? t("travel.selectArrival")
                  : arrivalTimeText}
              </Text>

              <Ionicons name="time-outline" size={20} color="#999" />
            </TouchableOpacity>
            {arrivalTimeError ? (
              <Text style={styles.errorText}>{arrivalTimeError}</Text>
            ) : null}
          </View>

          {/* PASSPORT */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.passportNumber")}{" "}
              <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[
                styles.input,
                passportNumberError ? styles.inputError : null,
              ]}
              placeholder={t("travel.placeholderPassport")}
              placeholderTextColor="#999"
              value={passportNumber}
              onChangeText={setPassportNumber}
              autoCapitalize="characters"
              returnKeyType="next"
            />
            {passportNumberError ? (
              <Text style={styles.errorText}>{passportNumberError}</Text>
            ) : null}
          </View>

          {/* PURPOSE */}
          <View style={styles.inputGroup} pointerEvents="box-none">
            <Text style={styles.inputLabel}>
              {t("travel.purposeOfTravel")}{" "}
              <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
                purposeOfTravelError ? styles.inputError : null,
              ]}
              placeholder={t("travel.placeholderPurpose")}
              placeholderTextColor="#999"
              value={purposeOfTravel}
              onChangeText={setPurposeOfTravel}
              multiline
              textAlignVertical="top"
            />
            {purposeOfTravelError ? (
              <Text style={styles.errorText}>{purposeOfTravelError}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Check-In Date Modal */}
      <Modal
        visible={showCheckInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.dateModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("travel.selectCheckIn")}</Text>
              <TouchableOpacity onPress={() => setShowCheckInModal(false)}>
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
                        tempCheckInDate.month === i &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempCheckInDate({ ...tempCheckInDate, month: i })
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
                  nestedScrollEnabled
                >
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dateOption,
                        tempCheckInDate.day === parseInt(d, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempCheckInDate({
                          ...tempCheckInDate,
                          day: parseInt(d, 10),
                        })
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
                  nestedScrollEnabled
                >
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.dateOption,
                        tempCheckInDate.year === parseInt(y, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempCheckInDate({
                          ...tempCheckInDate,
                          year: parseInt(y, 10),
                        })
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
              onPress={handleCheckInConfirm}
            >
              <Text style={styles.dateConfirmText}>{t("banking.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Departure Time Modal */}
      <Modal
        visible={showDepartureTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDepartureTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.dateModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("travel.selectDeparture")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDepartureTimePicker(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t("banking.hour") || "Hour"}
                </Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.dateOption,
                        tempDepartureTime.hour === parseInt(h, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempDepartureTime({
                          ...tempDepartureTime,
                          hour: parseInt(h, 10),
                        })
                      }
                    >
                      <Text style={styles.dateOptionText}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t("banking.minute") || "Minute"}
                </Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.dateOption,
                        tempDepartureTime.minute === parseInt(m, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempDepartureTime({
                          ...tempDepartureTime,
                          minute: parseInt(m, 10),
                        })
                      }
                    >
                      <Text style={styles.dateOptionText}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dateConfirmButton}
              onPress={handleDepartureConfirm}
            >
              <Text style={styles.dateConfirmText}>{t("banking.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Arrival Time Modal */}
      <Modal
        visible={showArrivalTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowArrivalTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.dateModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("travel.selectArrival")}</Text>
              <TouchableOpacity onPress={() => setShowArrivalTimePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t("banking.hour") || "Hour"}
                </Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.dateOption,
                        tempArrivalTime.hour === parseInt(h, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempArrivalTime({
                          ...tempArrivalTime,
                          hour: parseInt(h, 10),
                        })
                      }
                    >
                      <Text style={styles.dateOptionText}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t("banking.minute") || "Minute"}
                </Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.dateOption,
                        tempArrivalTime.minute === parseInt(m, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() =>
                        setTempArrivalTime({
                          ...tempArrivalTime,
                          minute: parseInt(m, 10),
                        })
                      }
                    >
                      <Text style={styles.dateOptionText}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dateConfirmButton}
              onPress={handleArrivalConfirm}
            >
              <Text style={styles.dateConfirmText}>{t("banking.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 200,
  },

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

  textArea: {
    height: 80,
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
