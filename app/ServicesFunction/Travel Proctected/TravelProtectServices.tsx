import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { RootStackParamList } from "../../../types/navigation";

type AlertType = "success" | "error" | "warning" | "info";

interface CustomAlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
}

const CustomAlertModal = ({
  visible,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "OK",
}: CustomAlertModalProps) => {
  const getIconAndColor = (): { icon: string; color: string } => {
    switch (type) {
      case "success":
        return { icon: "✓", color: "#10B981" };
      case "error":
        return { icon: "!", color: "#E25A17" };
      case "warning":
        return { icon: "!", color: "#E25A17" };
      default:
        return { icon: "i", color: "#E25A17" };
    }
  };

  const { icon, color } = getIconAndColor();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={customAlertStyles.modalOverlay}>
        <View style={customAlertStyles.modalContent}>
          <LinearGradient
            colors={["#E25A17", "#F28934"]}
            style={customAlertStyles.modalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={customAlertStyles.iconContainer}>
              <Text style={[customAlertStyles.iconText, { color }]}>{icon}</Text>
            </View>
            <Text style={customAlertStyles.modalTitle}>{title}</Text>
            <Text style={customAlertStyles.modalMessage}>{message}</Text>
            <TouchableOpacity
              style={customAlertStyles.confirmButton}
              onPress={onClose}
            >
              <Text style={customAlertStyles.confirmButtonText}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const customAlertStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalGradient: {
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 32,
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.95,
  },
  confirmButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
});

interface AlertConfig {
  title: string;
  message: string;
  type: AlertType;
  confirmText: string;
}

export default function TravelProtection() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Travel">>();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [protectionFee, setProtectionFee] = useState(1250);
  const [userTimeDeposit, setUserTimeDeposit] = useState(0);

  // Form fields - Step 1
  const [emailAddress, setEmailAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [landlineNumber, setLandlineNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");

  // Form fields - Step 2
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirthText, setDateOfBirthText] =
    useState("Select your birthdate");
  const [civilStatus, setCivilStatus] = useState("Single");
  const [citizenship, setCitizenship] = useState("Filipino");

  // Form fields - Step 3
  const [sourceOfFund, setSourceOfFund] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [cashOnHand, setCashOnHand] = useState("");

  // Form fields - Step 4
  const [destinationAddress, setDestinationAddress] = useState("");
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [checkInDateText, setCheckInDateText] =
    useState("Select check-in date");
  const [duration, setDuration] = useState("");
  const [airline, setAirline] = useState("");
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [departureTimeText, setDepartureTimeText] =
    useState("Select departure time");
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [arrivalTimeText, setArrivalTimeText] =
    useState("Select arrival time");
  const [passportNumber, setPassportNumber] = useState("");
  const [purposeOfTravel, setPurposeOfTravel] = useState("");

  // Form fields - Step 5
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  const [governmentId, setGovernmentId] = useState<string | null>(null);

  // Dropdown states
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showCivilStatusDropdown, setShowCivilStatusDropdown] = useState(false);

  // Custom alert modal states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
  });

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = "error"
  ) => {
    setAlertConfig({
      title,
      message,
      type,
      confirmText: "OK",
    });
    setAlertVisible(true);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!emailAddress || !mobileNumber || !homeAddress) {
        showAlert("Required Fields", "Please fill in all required fields", "error");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (
        !gender ||
        dateOfBirthText === "Select your birthdate" ||
        !civilStatus ||
        !citizenship
      ) {
        showAlert("Required Fields", "Please fill in all required fields", "error");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!sourceOfFund || !grossMonthlyIncome || !cashOnHand) {
        showAlert("Required Fields", "Please fill in all required fields", "error");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (
        !destinationAddress ||
        checkInDateText === "Select check-in date" ||
        !duration ||
        !airline ||
        departureTimeText === "Select departure time" ||
        arrivalTimeText === "Select arrival time" ||
        !passportNumber ||
        !purposeOfTravel
      ) {
        showAlert("Required Fields", "Please fill in all required fields", "error");
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (!passportPhoto || !governmentId) {
        showAlert(
          "Required Documents",
          "Please upload both required documents",
          "error"
        );
        return;
      }
      setCurrentStep(6);
    } else if (currentStep === 6) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = () => {
    showAlert(
      "Application Submitted",
      "Your travel protection application has been submitted successfully! We will process your request within 5-7 working days.",
      "success"
    );
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "set" && selectedDate) {
      setDateOfBirth(selectedDate);
      setDateOfBirthText(selectedDate.toLocaleDateString());
    }
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowDatePicker(false);
    }
  };

  const onCheckInDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowCheckInPicker(false);
    }
    if (event.type === "set" && selectedDate) {
      setCheckInDate(selectedDate);
      setCheckInDateText(selectedDate.toLocaleDateString());
    }
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowCheckInPicker(false);
    }
  };

  const onDepartureTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDepartureTimePicker(false);
    }
    if (event.type === "set" && selectedTime) {
      setDepartureTime(selectedTime);
      setDepartureTimeText(
        selectedTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowDepartureTimePicker(false);
    }
  };

  const onArrivalTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowArrivalTimePicker(false);
    }
    if (event.type === "set" && selectedTime) {
      setArrivalTime(selectedTime);
      setArrivalTimeText(
        selectedTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowArrivalTimePicker(false);
    }
  };

  const pickPassportPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showAlert(
          "Permission Required",
          "Please allow access to your photos to upload documents.",
          "warning"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPassportPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking passport photo:", error);
      showAlert("Error", "Failed to pick image. Please try again.", "error");
    }
  };

  const pickGovernmentId = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showAlert(
          "Permission Required",
          "Please allow access to your photos to upload documents.",
          "warning"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setGovernmentId(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking government ID:", error);
      showAlert("Error", "Failed to pick image. Please try again.", "error");
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              currentStep === step && styles.stepDotActive,
              currentStep > step && styles.stepDotCompleted,
            ]}
          >
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.stepDotText,
                  currentStep === step && styles.stepDotTextActive,
                ]}
              >
                {step}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#E25A17" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E25A17" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.heroCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.heroIconContainer}>
                  <MaterialCommunityIcons
                    name="airplane"
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.heroTitle}>Travel Protection</Text>
                <Text style={styles.heroSubtitle}>Secure your journey</Text>
              </LinearGradient>

              <View style={styles.infoBanner}>
                <View style={styles.infoBannerIcon}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color="#E25A17"
                  />
                </View>
                <Text style={styles.infoBannerText}>
                  Complete this form to subscribe. Your application will be
                  processed within{" "}
                  <Text style={styles.infoBannerBold}>5-7 working days</Text>{" "}
                  after payment confirmation.
                </Text>
              </View>

              <View style={styles.feeCard}>
                <View style={styles.feeHeader}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={20}
                    color="#E25A17"
                  />
                  <Text style={styles.feeLabel}>Protection Fee</Text>
                </View>
                <Text style={styles.feeAmount}>
                  ₱ {protectionFee.toLocaleString()}
                </Text>
                <Text style={styles.feeSubtext}>
                  {userTimeDeposit > 0
                    ? "DISCOUNTED RATE (TIME DEPOSIT HOLDER)"
                    : "STANDARD PROTECTION RATE"}
                </Text>
              </View>

              {renderStepIndicator()}

              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <View style={styles.formIconContainer}>
                      <MaterialCommunityIcons
                        name="home-account"
                        size={24}
                        color="#E25A17"
                      />
                    </View>
                    <View>
                      <Text style={styles.formTitle}>Contact Information</Text>
                      <Text style={styles.formSubtitle}>
                        Please provide your contact details
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Email Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="youremail@example.com"
                      placeholderTextColor="#999"
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Mobile Number <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+63 9XX XXX XXXX"
                      placeholderTextColor="#999"
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Landline Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="(02) XXXX XXXX"
                      placeholderTextColor="#999"
                      value={landlineNumber}
                      onChangeText={setLandlineNumber}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Home Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="House/Unit no., Street, Barangay City, Province, ZIP Code"
                      placeholderTextColor="#999"
                      value={homeAddress}
                      onChangeText={setHomeAddress}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}

              {/* Step 2: Personal Details */}
              {currentStep === 2 && (
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
                      <Text style={styles.formTitle}>Personal Details</Text>
                      <Text style={styles.formSubtitle}>
                        Please provide your personal information
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Gender <Text style={styles.required}>*</Text>
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
                        {gender || "Select your gender"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    {showGenderDropdown && (
                      <View style={styles.dropdownMenu}>
                        {["Male", "Female", "Other"].map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setGender(option);
                              setShowGenderDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Date of Birth <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          dateOfBirthText === "Select your birthdate" &&
                            styles.dropdownPlaceholder,
                        ]}
                      >
                        {dateOfBirthText}
                      </Text>
                      <Ionicons name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={dateOfBirth}
                        mode="date"
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={onDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Civil Status <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() =>
                        setShowCivilStatusDropdown(!showCivilStatusDropdown)
                      }
                    >
                      <Text style={styles.dropdownText}>{civilStatus}</Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    {showCivilStatusDropdown && (
                      <View style={styles.dropdownMenu}>
                        {["Single", "Married", "Divorced", "Widowed"].map(
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
                                {option}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Citizenship <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Filipino"
                      placeholderTextColor="#999"
                      value={citizenship}
                      onChangeText={setCitizenship}
                    />
                  </View>
                </View>
              )}

              {/* Step 3: Financial Information */}
              {currentStep === 3 && (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <View style={styles.formIconContainer}>
                      <MaterialCommunityIcons
                        name="cash-multiple"
                        size={24}
                        color="#E25A17"
                      />
                    </View>
                    <View>
                      <Text style={styles.formTitle}>
                        Financial Information
                      </Text>
                      <Text style={styles.formSubtitle}>
                        Please provide your financial information
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Source of Fund <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Employment, Business, Investment etc."
                      placeholderTextColor="#999"
                      value={sourceOfFund}
                      onChangeText={setSourceOfFund}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Gross Monthly Income{" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="#999"
                      value={grossMonthlyIncome}
                      onChangeText={setGrossMonthlyIncome}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Cash on Hand <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="#999"
                      value={cashOnHand}
                      onChangeText={setCashOnHand}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Step 4: Travel Details */}
              {currentStep === 4 && (
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
                      <Text style={styles.formTitle}>Travel Details</Text>
                      <Text style={styles.formSubtitle}>
                        Please provide your travel information
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Destination Address{" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Hotel/Accommodation address where you'll be staying"
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
                      Check-in Date <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowCheckInPicker(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          checkInDateText === "Select check-in date" &&
                            styles.dropdownPlaceholder,
                        ]}
                      >
                        {checkInDateText}
                      </Text>
                      <Ionicons name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {showCheckInPicker && (
                      <DateTimePicker
                        value={checkInDate}
                        mode="date"
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={onCheckInDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Duration (Days) <Text style={styles.required}>*</Text>
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
                      Airline <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Philippine Airlines, Cebu Pacific, etc."
                      placeholderTextColor="#999"
                      value={airline}
                      onChangeText={setAirline}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Departure Time <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowDepartureTimePicker(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          departureTimeText === "Select departure time" &&
                            styles.dropdownPlaceholder,
                        ]}
                      >
                        {departureTimeText}
                      </Text>
                      <Ionicons name="time" size={20} color="#666" />
                    </TouchableOpacity>
                    {showDepartureTimePicker && (
                      <DateTimePicker
                        value={departureTime}
                        mode="time"
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={onDepartureTimeChange}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Arrival Time <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowArrivalTimePicker(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          arrivalTimeText === "Select arrival time" &&
                            styles.dropdownPlaceholder,
                        ]}
                      >
                        {arrivalTimeText}
                      </Text>
                      <Ionicons name="time" size={20} color="#666" />
                    </TouchableOpacity>
                    {showArrivalTimePicker && (
                      <DateTimePicker
                        value={arrivalTime}
                        mode="time"
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={onArrivalTimeChange}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Passport Number <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="P1234567"
                      placeholderTextColor="#999"
                      value={passportNumber}
                      onChangeText={setPassportNumber}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Purpose of Travel <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe the purpose of your travel (business, vacation, family, visit, etc.)"
                      placeholderTextColor="#999"
                      value={purposeOfTravel}
                      onChangeText={setPurposeOfTravel}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}

              {/* Step 5: Required Documents */}
              {currentStep === 5 && (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <View style={styles.formIconContainer}>
                      <MaterialCommunityIcons
                        name="file-document"
                        size={24}
                        color="#E25A17"
                      />
                    </View>
                    <View>
                      <Text style={styles.formTitle}>
                        Required Documents
                      </Text>
                      <Text style={styles.formSubtitle}>
                        Please upload your required documents
                      </Text>
                    </View>
                  </View>

                  {/* Passport Photo */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Passport Photo <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.uploadBox}
                      onPress={pickPassportPhoto}
                    >
                      <MaterialCommunityIcons
                        name="camera"
                        size={40}
                        color={passportPhoto ? "#4CAF50" : "#E25A17"}
                      />
                      <Text
                        style={[
                          styles.uploadText,
                          passportPhoto && styles.uploadTextSuccess,
                        ]}
                      >
                        {passportPhoto
                          ? "Passport Photo Uploaded"
                          : "Upload Passport"}
                      </Text>
                      <Text style={styles.uploadSubtext}>Tap to select image</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Government ID */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Government ID <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.uploadBox}
                      onPress={pickGovernmentId}
                    >
                      <MaterialCommunityIcons
                        name="card-account-details"
                        size={40}
                        color={governmentId ? "#4CAF50" : "#E25A17"}
                      />
                      <Text
                        style={[
                          styles.uploadText,
                          governmentId && styles.uploadTextSuccess,
                        ]}
                      >
                        {governmentId
                          ? "Government ID Uploaded"
                          : "Upload Government ID"}
                      </Text>
                      <Text style={styles.uploadSubtext}>
                        Tap to upload valid Gov't ID
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Step 6: Review & Submit */}
              {currentStep === 6 && (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <View style={styles.formIconContainer}>
                      <MaterialCommunityIcons
                        name="clipboard-check"
                        size={24}
                        color="#E25A17"
                      />
                    </View>
                    <View>
                      <Text style={styles.formTitle}>Review & Submit</Text>
                      <Text style={styles.formSubtitle}>
                        Review your application before submitting
                      </Text>
                    </View>
                  </View>

                  {/* Contact Information Summary */}
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewSectionHeader}>
                      <MaterialCommunityIcons
                        name="home-account"
                        size={18}
                        color="#E25A17"
                      />
                      <Text style={styles.reviewSectionTitle}>
                        Contact Information
                      </Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>EMAIL ADDRESS</Text>
                      <Text style={styles.reviewValue}>{emailAddress}</Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>MOBILE NUMBER</Text>
                      <Text style={styles.reviewValue}>{mobileNumber}</Text>
                    </View>
                    {landlineNumber && (
                      <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>LANDLINE NUMBER</Text>
                        <Text style={styles.reviewValue}>{landlineNumber}</Text>
                      </View>
                    )}
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>HOME ADDRESS</Text>
                      <Text style={styles.reviewValue}>{homeAddress}</Text>
                    </View>
                  </View>

                  {/* Travel Details Summary */}
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewSectionHeader}>
                      <MaterialCommunityIcons
                        name="airplane-takeoff"
                        size={18}
                        color="#E25A17"
                      />
                      <Text style={styles.reviewSectionTitle}>
                        Travel Details
                      </Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>
                        DESTINATION ADDRESS
                      </Text>
                      <Text style={styles.reviewValue}>
                        {destinationAddress || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>AIRLINE</Text>
                      <Text style={styles.reviewValue}>{airline || "N/A"}</Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>PASSPORT NUMBER</Text>
                      <Text style={styles.reviewValue}>
                        {passportNumber || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Terms & Conditions */}
                  <View style={styles.termsBox}>
                    <Text style={styles.termsText}>
                      By submitting this application, you confirm that all
                      information provided is accurate. Payment will be
                      processed securely through PayPal. Your travel protection
                      coverage will be activated within 5-7 working days after
                      successful payment and document verification.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.backButtonBottom} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.nextButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === 6 ? "Apply" : "Next"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  heroCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  infoBannerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  infoBannerBold: {
    fontWeight: "700",
    color: "#E25A17",
  },
  feeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  feeAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 4,
  },
  feeSubtext: {
    fontSize: 11,
    color: "#999",
    letterSpacing: 0.5,
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#E25A17",
  },
  stepDotCompleted: {
    backgroundColor: "#4CAF50",
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  stepDotTextActive: {
    color: "#FFFFFF",
  },
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
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E25A17",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
    letterSpacing: 0.5,
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  uploadBox: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E25A17",
    marginTop: 12,
  },
  uploadTextSuccess: {
    color: "#4CAF50",
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E25A17",
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  termsBox: {
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});
