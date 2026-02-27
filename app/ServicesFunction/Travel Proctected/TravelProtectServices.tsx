import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
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
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";
import { useResponsive } from "../../../utils/responsive";
import TravelProtectDetails from "./TravelProtectDetails";
import TravelProtectFinanInfo from "./TravelProtectFinanInfo";
import TravelProtectPerDeatails from "./TravelProtectPerDeatails";
import TravelProtectReviewSubmit from "./TravelProtectReview&Submit";
import TravelRequiredDocu from "./TravelRequiredDocu";

const EMPTY_PLACEHOLDER = "__empty__";

const MONTH_KEYS = [
  "banking.january", "banking.february", "banking.march", "banking.april", "banking.may", "banking.june",
  "banking.july", "banking.august", "banking.september", "banking.october", "banking.november", "banking.december",
] as const;

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
  const { t } = useLanguage();
  const { scale, verticalScale, horizontalPadding } = useResponsive();
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

  // Form fields - Step 2 (store internal values for dropdowns; display via t())
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateOfBirthText, setDateOfBirthText] = useState(EMPTY_PLACEHOLDER);
  const [tempDate, setTempDate] = useState({ month: 0, day: 1, year: 2000 });
  const [civilStatus, setCivilStatus] = useState("Single");
  const [citizenship, setCitizenship] = useState("");

  // Form fields - Step 3
  const [sourceOfFund, setSourceOfFund] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [cashOnHand, setCashOnHand] = useState("");

  // Form fields - Step 4
  const [destinationAddress, setDestinationAddress] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInDateText, setCheckInDateText] = useState(EMPTY_PLACEHOLDER);
  const [tempCheckInDate, setTempCheckInDate] = useState({
    month: new Date().getMonth(),
    day: new Date().getDate(),
    year: new Date().getFullYear(),
  });
  const [duration, setDuration] = useState("");
  const [airline, setAirline] = useState("");
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [departureTimeText, setDepartureTimeText] = useState(EMPTY_PLACEHOLDER);
  const [tempDepartureTime, setTempDepartureTime] = useState({
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  });
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [arrivalTimeText, setArrivalTimeText] = useState(EMPTY_PLACEHOLDER);
  const [tempArrivalTime, setTempArrivalTime] = useState({
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  });
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
      confirmText: t("common.ok"),
    });
    setAlertVisible(true);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!emailAddress || !mobileNumber || !homeAddress) {
        showAlert(t("travel.requiredFields"), t("travel.fillRequired"), "error");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (
        !gender ||
        dateOfBirthText === EMPTY_PLACEHOLDER ||
        !civilStatus ||
        !citizenship
      ) {
        showAlert(t("travel.requiredFields"), t("travel.fillRequired"), "error");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!sourceOfFund || !grossMonthlyIncome || !cashOnHand) {
        showAlert(t("travel.requiredFields"), t("travel.fillRequired"), "error");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (
        !destinationAddress ||
        checkInDateText === EMPTY_PLACEHOLDER ||
        !duration ||
        !airline ||
        departureTimeText === EMPTY_PLACEHOLDER ||
        arrivalTimeText === EMPTY_PLACEHOLDER ||
        !passportNumber ||
        !purposeOfTravel
      ) {
        showAlert(t("travel.requiredFields"), t("travel.fillRequired"), "error");
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (!passportPhoto || !governmentId) {
        showAlert(
          t("travel.requiredDocuments"),
          t("travel.uploadBothDocs"),
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
      t("travel.applicationSubmitted"),
      t("travel.applicationSuccess"),
      "success"
    );
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  };

  const formatDateOfBirth = (d: Date) => {
    return `${t(MONTH_KEYS[d.getMonth()])} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const applyDateFromTemp = (month: number, day: number, year: number) => {
    const d = new Date(year, month, day);
    setDateOfBirth(d);
    setDateOfBirthText(formatDateOfBirth(d));
  };

  const applyCheckInDateFromTemp = (month: number, day: number, year: number) => {
    const d = new Date(year, month, day);
    setCheckInDate(d);
    setCheckInDateText(formatDateOfBirth(d));
  };

  const applyDepartureTimeFromTemp = (hour: number, minute: number) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setDepartureTime(d);
    setDepartureTimeText(
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const applyArrivalTimeFromTemp = (hour: number, minute: number) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setArrivalTime(d);
    setArrivalTimeText(
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const pickPassportPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showAlert(
          t("travel.permissionRequired"),
          t("travel.allowPhotos"),
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
      showAlert(t("travel.error"), t("travel.failedToPickImage"), "error");
    }
  };

  const pickGovernmentId = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showAlert(
          t("travel.permissionRequired"),
          t("travel.allowPhotos"),
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
      showAlert(t("travel.error"), t("travel.failedToPickImage"), "error");
    }
  };

  const dynamicStyles = {
    scrollContent: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: verticalScale(100),
    },
    heroCard: { padding: scale(24), marginTop: verticalScale(16), marginBottom: verticalScale(16) },
    heroIconContainer: { width: scale(80), height: scale(80), marginBottom: verticalScale(16) },
    heroTitle: { fontSize: scale(22) },
    heroSubtitle: { fontSize: scale(14) },
    infoBanner: { padding: scale(16), marginBottom: verticalScale(16) },
    feeCard: { padding: scale(20), marginBottom: verticalScale(16) },
    feeAmount: { fontSize: scale(32) },
    stepIndicator: { gap: scale(12), marginBottom: verticalScale(24) },
    stepDot: { width: scale(32), height: scale(32) },
    formCard: { padding: scale(20) },
    buttonContainer: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: verticalScale(16),
      paddingBottom: Platform.OS === "ios" ? verticalScale(32) : verticalScale(16),
    },
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : StatusBar.currentHeight ?? 20}
      >
        <SafeAreaView style={styles.container}>
          <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={scale(24)} color="#E25A17" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E25A17" />
              <Text style={[styles.loadingText, { fontSize: scale(14) }]}>{t("travel.loading")}</Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onScrollBeginDrag={Keyboard.dismiss}
              >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={[styles.heroCard, dynamicStyles.heroCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.heroIconContainer, dynamicStyles.heroIconContainer]}>
                  <MaterialCommunityIcons
                    name="airplane"
                    size={scale(40)}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.heroTitle, dynamicStyles.heroTitle]}>{t("travel.title")}</Text>
                <Text style={[styles.heroSubtitle, dynamicStyles.heroSubtitle]}>{t("travel.subtitle")}</Text>
              </LinearGradient>

              <View style={[styles.infoBanner, dynamicStyles.infoBanner]}>
                <View style={styles.infoBannerIcon}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color="#E25A17"
                  />
                </View>
                <Text style={styles.infoBannerText}>
                  {t("travel.infoBanner")}{" "}
                  <Text style={styles.infoBannerBold}>{t("travel.infoBannerDays")}</Text>{" "}
                  {t("travel.infoBannerAfter")}
                </Text>
              </View>

              <View style={[styles.feeCard, dynamicStyles.feeCard]}>
                <View style={styles.feeHeader}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={20}
                    color="#E25A17"
                  />
                  <Text style={styles.feeLabel}>{t("travel.protectionFee")}</Text>
                </View>
                <Text style={[styles.feeAmount, dynamicStyles.feeAmount]}>
                  ₱ {protectionFee.toLocaleString()}
                </Text>
                <Text style={styles.feeSubtext}>
                  {userTimeDeposit > 0
                    ? t("travel.discountedRate")
                    : t("travel.standardRate")}
                </Text>
              </View>

              <View style={[styles.stepIndicatorContainer, dynamicStyles.stepIndicator]}>
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.stepDot,
                      dynamicStyles.stepDot,
                      currentStep === step && styles.stepDotActive,
                      currentStep > step && styles.stepDotCompleted,
                    ]}
                  >
                    {currentStep > step ? (
                      <Ionicons name="checkmark" size={scale(16)} color="#FFFFFF" />
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

              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <View style={[styles.formCard, dynamicStyles.formCard]}>
                  <View style={styles.formHeader}>
                    <View style={styles.formIconContainer}>
                      <MaterialCommunityIcons
                        name="home-account"
                        size={24}
                        color="#E25A17"
                      />
                    </View>
                    <View>
                      <Text style={styles.formTitle}>{t("travel.contactInfo")}</Text>
                      <Text style={styles.formSubtitle}>
                        {t("travel.contactSubtitle")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("travel.emailAddress")} <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t("travel.placeholderEmail")}
                      placeholderTextColor="#999"
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("travel.mobileNumber")} <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t("travel.placeholderMobile")}
                      placeholderTextColor="#999"
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t("travel.landlineNumber")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t("travel.placeholderLandline")}
                      placeholderTextColor="#999"
                      value={landlineNumber}
                      onChangeText={setLandlineNumber}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("travel.homeAddress")} <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder={t("travel.placeholderHomeAddress")}
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
                <TravelProtectPerDeatails
                  gender={gender}
                  setGender={setGender}
                  dateOfBirth={dateOfBirth}
                  dateOfBirthText={dateOfBirthText}
                  showDateModal={showDateModal}
                  setShowDateModal={setShowDateModal}
                  tempDate={tempDate}
                  setTempDate={setTempDate}
                  civilStatus={civilStatus}
                  setCivilStatus={setCivilStatus}
                  citizenship={citizenship}
                  setCitizenship={setCitizenship}
                  showGenderDropdown={showGenderDropdown}
                  setShowGenderDropdown={setShowGenderDropdown}
                  showCivilStatusDropdown={showCivilStatusDropdown}
                  setShowCivilStatusDropdown={setShowCivilStatusDropdown}
                  applyDateFromTemp={applyDateFromTemp}
                />
              )}

              {/* Step 3: Financial Information */}
              {currentStep === 3 && (
                <TravelProtectFinanInfo
                  sourceOfFund={sourceOfFund}
                  setSourceOfFund={setSourceOfFund}
                  grossMonthlyIncome={grossMonthlyIncome}
                  setGrossMonthlyIncome={setGrossMonthlyIncome}
                  cashOnHand={cashOnHand}
                  setCashOnHand={setCashOnHand}
                />
              )}

              {/* Step 4: Travel Details */}
              {currentStep === 4 && (
                <TravelProtectDetails
                  destinationAddress={destinationAddress}
                  setDestinationAddress={setDestinationAddress}
                  checkInDate={checkInDate}
                  checkInDateText={checkInDateText}
                  showCheckInModal={showCheckInModal}
                  setShowCheckInModal={setShowCheckInModal}
                  tempCheckInDate={tempCheckInDate}
                  setTempCheckInDate={setTempCheckInDate}
                  applyCheckInDateFromTemp={applyCheckInDateFromTemp}
                  duration={duration}
                  setDuration={setDuration}
                  airline={airline}
                  setAirline={setAirline}
                  departureTime={departureTime}
                  departureTimeText={departureTimeText}
                  showDepartureTimePicker={showDepartureTimePicker}
                  setShowDepartureTimePicker={setShowDepartureTimePicker}
                  tempDepartureTime={tempDepartureTime}
                  setTempDepartureTime={setTempDepartureTime}
                  applyDepartureTimeFromTemp={applyDepartureTimeFromTemp}
                  arrivalTime={arrivalTime}
                  arrivalTimeText={arrivalTimeText}
                  showArrivalTimePicker={showArrivalTimePicker}
                  setShowArrivalTimePicker={setShowArrivalTimePicker}
                  tempArrivalTime={tempArrivalTime}
                  setTempArrivalTime={setTempArrivalTime}
                  applyArrivalTimeFromTemp={applyArrivalTimeFromTemp}
                  passportNumber={passportNumber}
                  setPassportNumber={setPassportNumber}
                  purposeOfTravel={purposeOfTravel}
                  setPurposeOfTravel={setPurposeOfTravel}
                />
              )}

              {/* Step 5: Required Documents */}
              {currentStep === 5 && (
                <TravelRequiredDocu
                  passportPhoto={passportPhoto}
                  governmentId={governmentId}
                  onPickPassportPhoto={pickPassportPhoto}
                  onPickGovernmentId={pickGovernmentId}
                />
              )}

              {/* Step 6: Review & Submit */}
              {currentStep === 6 && (
                <TravelProtectReviewSubmit
                  emailAddress={emailAddress}
                  mobileNumber={mobileNumber}
                  landlineNumber={landlineNumber}
                  homeAddress={homeAddress}
                  destinationAddress={destinationAddress}
                  airline={airline}
                  passportNumber={passportNumber}
                />
              )}
            </ScrollView>

            <View style={[styles.buttonContainer, dynamicStyles.buttonContainer]}>
              <TouchableOpacity style={styles.backButtonBottom} onPress={handleBack}>
                <Text style={styles.backButtonText}>{t("travel.back")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.nextButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === 6 ? t("travel.apply") : t("travel.next")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
        </SafeAreaView>
      </KeyboardAvoidingView>

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
});
