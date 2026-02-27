import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { useLanguage } from "../../../context/LanguageContext";

const EMPTY_PLACEHOLDER = "__empty__";

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
}

export default function TravelProtectDetails({
  destinationAddress,
  setDestinationAddress,
  checkInDateText,
  setShowCheckInModal,
  duration,
  setDuration,
  airline,
  setAirline,
  departureTimeText,
  setShowDepartureTimePicker,
  arrivalTimeText,
  setShowArrivalTimePicker,
  passportNumber,
  setPassportNumber,
  purposeOfTravel,
  setPurposeOfTravel,
}: TravelProtectDetailsProps) {
  const { t } = useLanguage();

  return (
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

});