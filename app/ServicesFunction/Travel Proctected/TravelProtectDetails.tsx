import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
const YEARS = Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() + i).toString());
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export interface TravelProtectDetailsProps {
  destinationAddress: string;
  setDestinationAddress: (value: string) => void;
  checkInDate: Date | null;
  checkInDateText: string;
  setShowCheckInModal: (value: boolean) => void;
  tempCheckInDate: { month: number; day: number; year: number };
  setTempCheckInDate: (value: { month: number; day: number; year: number }) => void;
  duration: string;
  setDuration: (value: string) => void;
  airline: string;
  setAirline: (value: string) => void;
  departureTime: Date;
  departureTimeText: string;
  setShowDepartureTimePicker: (value: boolean) => void;
  tempDepartureTime: { hour: number; minute: number };
  setTempDepartureTime: (value: { hour: number; minute: number }) => void;
  arrivalTime: Date;
  arrivalTimeText: string;
  setShowArrivalTimePicker: (value: boolean) => void;
  tempArrivalTime: { hour: number; minute: number };
  setTempArrivalTime: (value: { hour: number; minute: number }) => void;
  passportNumber: string;
  setPassportNumber: (value: string) => void;
  purposeOfTravel: string;
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
  setDestinationAddress,
  checkInDateText,
  setShowCheckInModal,
  tempCheckInDate,
  setTempCheckInDate,
  duration,
  setDuration,
  airline,
  setAirline,
  departureTimeText,
  setShowDepartureTimePicker,
  tempDepartureTime,
  setTempDepartureTime,
  arrivalTimeText,
  setShowArrivalTimePicker,
  tempArrivalTime,
  setTempArrivalTime,
  passportNumber,
  setPassportNumber,
  purposeOfTravel,
  setPurposeOfTravel,
  showCheckInModal,
  showDepartureTimePicker,
  showArrivalTimePicker,
  applyCheckInDateFromTemp,
  applyDepartureTimeFromTemp,
  applyArrivalTimeFromTemp,
}: TravelProtectDetailsProps) {
  const { t } = useLanguage();

  return (
    <>
    <View style={styles.container}>
      <View style={styles.formCard}>
        
        {/* HEADER */}
        <View style={styles.formHeader}>
          <View style={styles.formIconContainer}>
            <MaterialCommunityIcons
              name="airplane-takeoff"
              size={24}
              color="#E25A17"
            />
          </View>

          <View>
            <Text style={styles.formTitle}>
              {t("travel.travelDetails")}
            </Text>

            <Text style={styles.formSubtitle}>
              {t("travel.travelSubtitle")}
            </Text>
          </View>
        </View>


        {/* DESTINATION */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.destinationAddress")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("travel.placeholderDestination")}
            placeholderTextColor="#999"
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            multiline
            textAlignVertical="top"
            returnKeyType="next"
          />
        </View>


        {/* CHECK IN DATE */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.checkInDate")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TouchableOpacity
            style={styles.dropdown}
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

            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>


        {/* DURATION */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.durationDays")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#999"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            returnKeyType="next"
          />
        </View>


        {/* AIRLINE */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.airline")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder={t("travel.placeholderAirline")}
            placeholderTextColor="#999"
            value={airline}
            onChangeText={setAirline}
            returnKeyType="next"
          />
        </View>


        {/* DEPARTURE TIME */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.departureTime")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TouchableOpacity
            style={styles.dropdown}
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

            <Ionicons name="time-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>


        {/* ARRIVAL TIME */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.arrivalTime")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TouchableOpacity
            style={styles.dropdown}
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

            <Ionicons name="time-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>


        {/* PASSPORT */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.passportNumber")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder={t("travel.placeholderPassport")}
            placeholderTextColor="#999"
            value={passportNumber}
            onChangeText={setPassportNumber}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </View>


        {/* PURPOSE */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("travel.purposeOfTravel")}{" "}
            <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("travel.placeholderPurpose")}
            placeholderTextColor="#999"
            value={purposeOfTravel}
            onChangeText={setPurposeOfTravel}
            multiline
            textAlignVertical="top"
          />
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
      <View style={styles.dateModalOverlay}>
        <TouchableOpacity
          style={styles.dateModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCheckInModal(false)}
        />
        <View style={styles.dateModalContainer}>
          <View style={styles.dateModalHeader}>
            <Text style={styles.dateModalTitle}>
              {t("travel.selectCheckIn")}
            </Text>
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
              >
                {MONTH_KEYS.map((key, i) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dateOption,
                      tempCheckInDate.month === i && styles.dateOptionSelected,
                    ]}
                    onPress={() => applyCheckInDateFromTemp(i, tempCheckInDate.day, tempCheckInDate.year)}
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
                      tempCheckInDate.day === parseInt(d, 10) &&
                        styles.dateOptionSelected,
                    ]}
                    onPress={() => applyCheckInDateFromTemp(tempCheckInDate.month, parseInt(d, 10), tempCheckInDate.year)}
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
                      tempCheckInDate.year === parseInt(y, 10) &&
                        styles.dateOptionSelected,
                    ]}
                    onPress={() => applyCheckInDateFromTemp(tempCheckInDate.month, tempCheckInDate.day, parseInt(y, 10))}
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

    {/* Departure Time Modal */}
    <Modal
      visible={showDepartureTimePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDepartureTimePicker(false)}
    >
      <View style={styles.dateModalOverlay}>
        <TouchableOpacity
          style={styles.dateModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDepartureTimePicker(false)}
        />
        <View style={styles.dateModalContainer}>
          <View style={styles.dateModalHeader}>
            <Text style={styles.dateModalTitle}>
              {t("travel.selectDeparture")}
            </Text>
            <TouchableOpacity onPress={() => setShowDepartureTimePicker(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.datePickerRow}>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Hour</Text>
              <ScrollView
                style={styles.dateScroll}
                showsVerticalScrollIndicator={false}
              >
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.dateOption,
                      tempDepartureTime.hour === parseInt(h, 10) && styles.dateOptionSelected,
                    ]}
                    onPress={() => applyDepartureTimeFromTemp(parseInt(h, 10), tempDepartureTime.minute)}
                  >
                    <Text style={styles.dateOptionText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Minute</Text>
              <ScrollView
                style={styles.dateScroll}
                showsVerticalScrollIndicator={false}
              >
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.dateOption,
                      tempDepartureTime.minute === parseInt(m, 10) &&
                        styles.dateOptionSelected,
                    ]}
                    onPress={() => applyDepartureTimeFromTemp(tempDepartureTime.hour, parseInt(m, 10))}
                  >
                    <Text style={styles.dateOptionText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
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
      <View style={styles.dateModalOverlay}>
        <TouchableOpacity
          style={styles.dateModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowArrivalTimePicker(false)}
        />
        <View style={styles.dateModalContainer}>
          <View style={styles.dateModalHeader}>
            <Text style={styles.dateModalTitle}>
              {t("travel.selectArrival")}
            </Text>
            <TouchableOpacity onPress={() => setShowArrivalTimePicker(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.datePickerRow}>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Hour</Text>
              <ScrollView
                style={styles.dateScroll}
                showsVerticalScrollIndicator={false}
              >
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.dateOption,
                      tempArrivalTime.hour === parseInt(h, 10) && styles.dateOptionSelected,
                    ]}
                    onPress={() => applyArrivalTimeFromTemp(parseInt(h, 10), tempArrivalTime.minute)}
                  >
                    <Text style={styles.dateOptionText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Minute</Text>
              <ScrollView
                style={styles.dateScroll}
                showsVerticalScrollIndicator={false}
              >
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.dateOption,
                      tempArrivalTime.minute === parseInt(m, 10) &&
                        styles.dateOptionSelected,
                    ]}
                    onPress={() => applyArrivalTimeFromTemp(tempArrivalTime.hour, parseInt(m, 10))}
                  >
                    <Text style={styles.dateOptionText}>{m}</Text>
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
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
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

  textArea: {
    height: 80,
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
