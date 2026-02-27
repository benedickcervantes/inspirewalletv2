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
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export interface TravelProtectDetailsProps {
  destinationAddress: string;
  setDestinationAddress: (value: string) => void;
  checkInDate: Date | null;
  checkInDateText: string;
  showCheckInModal: boolean;
  setShowCheckInModal: (value: boolean) => void;
  tempCheckInDate: { month: number; day: number; year: number };
  setTempCheckInDate: (value: { month: number; day: number; year: number }) => void;
  applyCheckInDateFromTemp: (month: number, day: number, year: number) => void;
  duration: string;
  setDuration: (value: string) => void;
  airline: string;
  setAirline: (value: string) => void;
  departureTime: Date;
  departureTimeText: string;
  showDepartureTimePicker: boolean;
  setShowDepartureTimePicker: (value: boolean) => void;
  tempDepartureTime: { hour: number; minute: number };
  setTempDepartureTime: (value: { hour: number; minute: number }) => void;
  applyDepartureTimeFromTemp: (hour: number, minute: number) => void;
  arrivalTime: Date;
  arrivalTimeText: string;
  showArrivalTimePicker: boolean;
  setShowArrivalTimePicker: (value: boolean) => void;
  tempArrivalTime: { hour: number; minute: number };
  setTempArrivalTime: (value: { hour: number; minute: number }) => void;
  applyArrivalTimeFromTemp: (hour: number, minute: number) => void;
  passportNumber: string;
  setPassportNumber: (value: string) => void;
  purposeOfTravel: string;
  setPurposeOfTravel: (value: string) => void;
}

export default function TravelProtectDetails({
  destinationAddress,
  setDestinationAddress,
  checkInDate,
  checkInDateText,
  showCheckInModal,
  setShowCheckInModal,
  tempCheckInDate,
  setTempCheckInDate,
  applyCheckInDateFromTemp,
  duration,
  setDuration,
  airline,
  setAirline,
  departureTime,
  departureTimeText,
  showDepartureTimePicker,
  setShowDepartureTimePicker,
  tempDepartureTime,
  setTempDepartureTime,
  applyDepartureTimeFromTemp,
  arrivalTime,
  arrivalTimeText,
  showArrivalTimePicker,
  setShowArrivalTimePicker,
  tempArrivalTime,
  setTempArrivalTime,
  applyArrivalTimeFromTemp,
  passportNumber,
  setPassportNumber,
  purposeOfTravel,
  setPurposeOfTravel,
}: TravelProtectDetailsProps) {
  const { t } = useLanguage();

  return (
    <>
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="airplane-takeoff"
            size={24}
            color="#E25A17"
          />
        </View>
        <View>
          <Text style={styles.formTitle}>{t("travel.travelDetails")}</Text>
          <Text style={styles.formSubtitle}>
            {t("travel.travelSubtitle")}
          </Text>
        </View>
      </View>

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
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.checkInDate")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            if (checkInDate) {
              setTempCheckInDate({
                month: checkInDate.getMonth(),
                day: checkInDate.getDate(),
                year: checkInDate.getFullYear(),
              });
            } else {
              const today = new Date();
              setTempCheckInDate({
                month: today.getMonth(),
                day: today.getDate(),
                year: today.getFullYear(),
              });
            }
            setShowCheckInModal(true);
          }}
        >
          <Text
            style={[
              styles.dropdownText,
              checkInDateText === EMPTY_PLACEHOLDER && styles.dropdownPlaceholder,
            ]}
          >
            {checkInDateText === EMPTY_PLACEHOLDER
              ? t("travel.selectCheckIn")
              : checkInDateText}
          </Text>
          <Ionicons name="calendar" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.durationDays")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#999"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.airline")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t("travel.placeholderAirline")}
          placeholderTextColor="#999"
          value={airline}
          onChangeText={setAirline}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.departureTime")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            setTempDepartureTime({
              hour: departureTime.getHours(),
              minute: departureTime.getMinutes(),
            });
            setShowDepartureTimePicker(true);
          }}
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
          <Ionicons name="time" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.arrivalTime")} <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            setTempArrivalTime({
              hour: arrivalTime.getHours(),
              minute: arrivalTime.getMinutes(),
            });
            setShowArrivalTimePicker(true);
          }}
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
          <Ionicons name="time" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.passportNumber")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t("travel.placeholderPassport")}
          placeholderTextColor="#999"
          value={passportNumber}
          onChangeText={setPassportNumber}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {t("travel.purposeOfTravel")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t("travel.placeholderPurpose")}
          placeholderTextColor="#999"
          value={purposeOfTravel}
          onChangeText={setPurposeOfTravel}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>

      {/* Check-in Date Modal */}
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
                      onPress={() => {
                        const next = { ...tempCheckInDate, month: i };
                        setTempCheckInDate(next);
                        applyCheckInDateFromTemp(next.month, next.day, next.year);
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
                        tempCheckInDate.day === parseInt(d, 10) &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = { ...tempCheckInDate, day: parseInt(d, 10) };
                        setTempCheckInDate(next);
                        applyCheckInDateFromTemp(next.month, next.day, next.year);
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
                  {Array.from(
                    { length: 16 },
                    (_, i) => new Date().getFullYear() + i
                  ).map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.dateOption,
                        tempCheckInDate.year === y && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = { ...tempCheckInDate, year: y };
                        setTempCheckInDate(next);
                        applyCheckInDateFromTemp(next.month, next.day, next.year);
                      }}
                    >
                      <Text style={styles.dateOptionText}>{y.toString()}</Text>
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
                <Text style={styles.datePickerLabel}>{t("banking.hour")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.dateOption,
                        tempDepartureTime.hour === h &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = {
                          ...tempDepartureTime,
                          hour: h,
                        };
                        setTempDepartureTime(next);
                        applyDepartureTimeFromTemp(next.hour, next.minute);
                      }}
                    >
                      <Text style={styles.dateOptionText}>
                        {h.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.minute")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.dateOption,
                        tempDepartureTime.minute === m &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = {
                          ...tempDepartureTime,
                          minute: m,
                        };
                        setTempDepartureTime(next);
                        applyDepartureTimeFromTemp(next.hour, next.minute);
                      }}
                    >
                      <Text style={styles.dateOptionText}>
                        {m.toString().padStart(2, "0")}
                      </Text>
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
                <Text style={styles.datePickerLabel}>{t("banking.hour")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.dateOption,
                        tempArrivalTime.hour === h &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = {
                          ...tempArrivalTime,
                          hour: h,
                        };
                        setTempArrivalTime(next);
                        applyArrivalTimeFromTemp(next.hour, next.minute);
                      }}
                    >
                      <Text style={styles.dateOptionText}>
                        {h.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.minute")}</Text>
                <ScrollView
                  style={styles.dateScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.dateOption,
                        tempArrivalTime.minute === m &&
                          styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        const next = {
                          ...tempArrivalTime,
                          minute: m,
                        };
                        setTempArrivalTime(next);
                        applyArrivalTimeFromTemp(next.hour, next.minute);
                      }}
                    >
                      <Text style={styles.dateOptionText}>
                        {m.toString().padStart(2, "0")}
                      </Text>
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
  textArea: {
    height: 80,
    paddingTop: 14,
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
