import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  TouchableOpacity as RNTouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getOrCreateMainWallet,
  getTimeDeposits,
  getTransactions,
  submitTravelProtection,
} from "../../../configs/api";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";
import { unformatNumberString } from "../../../utils/numberFormat";
import { useResponsive } from "../../../utils/responsive";
import Loader from "../../Loader/Loader";
import KeyboardAwareGHScrollView from "./KeyboardAwareGHScrollView";
import TravelProtectDetails from "./TravelProtectDetails";
import TravelProtectFinanInfo from "./TravelProtectFinanInfo";
import TravelProtectPerDeatails from "./TravelProtectPerDeatails";
import TravelProtectReviewSubmit from "./TravelProtectReview&Submit";
import TravelRequiredDocu from "./TravelRequiredDocu";

const EMPTY_PLACEHOLDER = "__empty__";
const FRONT_AND_BACK_GOVERNMENT_ID_TYPES = ["National_ID", "Driver_License"];
const TARGET_IMAGE_BYTES = 3 * 1024 * 1024;
const INITIAL_IMAGE_WIDTH = 1600;

/** Convert a local file URI to base64 data URL for API submission */
async function uriToBase64DataUrl(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    if (uri.startsWith("data:")) return uri;
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  let workingUri = uri;
  let width = INITIAL_IMAGE_WIDTH;
  let quality = 0.8;

  // Iteratively compress selected images to keep payloads manageable.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const manipulated = await ImageManipulator.manipulateAsync(
      workingUri,
      [{ resize: { width } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

    const base64 = manipulated.base64 ?? "";
    const approxDecodedBytes = Math.floor((base64.length * 3) / 4);
    if (approxDecodedBytes <= TARGET_IMAGE_BYTES || attempt === 3) {
      return `data:image/jpeg;base64,${base64}`;
    }

    workingUri = manipulated.uri;
    width = Math.max(900, Math.floor(width * 0.8));
    quality = Math.max(0.5, quality - 0.1);
  }

  throw new Error("Failed to optimize selected image");
}

interface TimeDeposit {
  id: string;
  amount?: string | number;
  principal?: string | number;
  status?: string;
  [key: string]: unknown;
}

function parseDepositAmount(d: TimeDeposit): number {
  const val = d?.amount ?? d?.principal ?? 0;
  const n =
    typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function computeTimeDepositTotal(deposits: TimeDeposit[]): number {
  return deposits
    .filter((d) => {
      const s = String(d?.status ?? "").toUpperCase();
      return s === "ACTIVE" || s === "MATURED" || s === "PENDING";
    })
    .reduce((sum, d) => sum + parseDepositAmount(d), 0);
}

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
              <Text style={[customAlertStyles.iconText, { color }]}>
                {icon}
              </Text>
            </View>
            <Text style={customAlertStyles.modalTitle}>{title}</Text>
            <Text style={customAlertStyles.modalMessage}>{message}</Text>
            <RNTouchableOpacity
              style={customAlertStyles.confirmButton}
              onPress={onClose}
            >
              <Text style={customAlertStyles.confirmButtonText}>
                {confirmText}
              </Text>
            </RNTouchableOpacity>
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
  const { height: windowHeight } = useWindowDimensions();
  const { scale, verticalScale, horizontalPadding, isTinyScreen, isSmallScreen } =
    useResponsive();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Travel">>();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isFeeLoading, setIsFeeLoading] = useState(true);
  const [userTimeDeposit, setUserTimeDeposit] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);

  // Travel protection fee: ₱625 if time deposit >= 200,000, otherwise ₱1,250
  const protectionFee = userTimeDeposit >= 50000 ? 625 : 1250;

  // Fetch user's time deposit total from backend
  const fetchTimeDeposits = useCallback(async () => {
    setIsFeeLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return;
      const result = await getTimeDeposits(accessToken);
      if (!result.success || !Array.isArray(result.deposits)) return;
      const list = result.deposits as TimeDeposit[];
      const total = computeTimeDepositTotal(list);
      setUserTimeDeposit(total);
    } finally {
      setIsFeeLoading(false);
    }
  }, []);

  const fetchAvailableBalance = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) return;
    const walletRes = await getOrCreateMainWallet(accessToken);
    const wallet = walletRes.wallet as { balance?: number | string } | undefined;
    const bal = parseFloat(String(wallet?.balance ?? 0));
    setAvailableBalance(Number.isNaN(bal) ? 0 : bal);
  }, []);

  useEffect(() => {
    fetchTimeDeposits();
    fetchAvailableBalance();
  }, [fetchTimeDeposits, fetchAvailableBalance]);

  useFocusEffect(
    useCallback(() => {
      fetchTimeDeposits();
      fetchAvailableBalance();
    }, [fetchTimeDeposits, fetchAvailableBalance]),
  );

  // Text input refs for Step 1
  const scrollViewRef = useRef<ComponentRef<typeof KeyboardAwareGHScrollView>>(null);
  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const landlineRef = useRef<TextInput>(null);
  const homeAddressRef = useRef<TextInput>(null);

  // Form fields - Step 1
  const [emailAddress, setEmailAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [landlineNumber, setLandlineNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [landlineError, setLandlineError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState({
    code: "PH",
    flag: "🇵🇭",
    dialCode: "+63",
    name: "Philippines",
    example: "0000 000 000",
  });
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [homeAddressError, setHomeAddressError] = useState("");

  const countries = [
    {
      code: "PH",
      flag: "🇵🇭",
      dialCode: "+63",
      name: "Philippines",
      example: "0000 000 000",
    },
    {
      code: "JP",
      flag: "🇯🇵",
      dialCode: "+81",
      name: "Japan",
      example: "00 0000 00000",
    },
    {
      code: "SA",
      flag: "🇸🇦",
      dialCode: "+966",
      name: "Saudi Arabia",
      example: "50 000 0000",
    },
    {
      code: "KR",
      flag: "🇰🇷",
      dialCode: "+82",
      name: "South Korea",
      example: "00 0000 00000",
    },
    {
      code: "US",
      flag: "🇺🇸",
      dialCode: "+1",
      name: "United States",
      example: "000 000 0000",
    },
  ];

  // Form fields - Step 2 (store internal values for dropdowns; display via t())
  const [gender, setGender] = useState("");
  const [genderError, setGenderError] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [dateOfBirthError, setDateOfBirthError] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateOfBirthText, setDateOfBirthText] = useState(EMPTY_PLACEHOLDER);
  const [tempDate, setTempDate] = useState({
    month: new Date().getMonth(),
    day: new Date().getDate(),
    year: new Date().getFullYear(),
  });
  const [civilStatus, setCivilStatus] = useState("Single");
  const [civilStatusError, setCivilStatusError] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [citizenshipError, setCitizenshipError] = useState("");

  // Form fields - Step 3
  const [sourceOfFund, setSourceOfFund] = useState("");
  const [sourceOfFundError, setSourceOfFundError] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [grossMonthlyIncomeCurrency, setGrossMonthlyIncomeCurrency] =
    useState("PHP");
  const [grossMonthlyIncomeError, setGrossMonthlyIncomeError] = useState("");
  const [cashOnHand, setCashOnHand] = useState("");
  const [cashOnHandError, setCashOnHandError] = useState("");

  // Form fields - Step 4
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationAddressError, setDestinationAddressError] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkInDateError, setCheckInDateError] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInDateText, setCheckInDateText] = useState(EMPTY_PLACEHOLDER);
  const [tempCheckInDate, setTempCheckInDate] = useState({
    month: new Date().getMonth(),
    day: new Date().getDate(),
    year: new Date().getFullYear(),
  });
  const [duration, setDuration] = useState("");
  const [durationError, setDurationError] = useState("");
  const [departureTime, setDepartureTime] = useState(new Date());

  const [departureTimeError, setDepartureTimeError] = useState("");
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [departureTimeText, setDepartureTimeText] = useState(EMPTY_PLACEHOLDER);
  const [tempDepartureTime, setTempDepartureTime] = useState({
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  });
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [arrivalTimeError, setArrivalTimeError] = useState("");
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [arrivalTimeText, setArrivalTimeText] = useState(EMPTY_PLACEHOLDER);
  const [tempArrivalTime, setTempArrivalTime] = useState({
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  });
  const [passportNumber, setPassportNumber] = useState("");
  const [passportNumberError, setPassportNumberError] = useState("");
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [purposeOfTravelError, setPurposeOfTravelError] = useState("");

  // Form fields - Step 5
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  const [passportPhotoError, setPassportPhotoError] = useState("");
  const [governmentIdType, setGovernmentIdType] = useState<string>("");
  const [governmentIdNumber, setGovernmentIdNumber] = useState<string>("");
  const [governmentIdFront, setGovernmentIdFront] = useState<string | null>(null);
  const [governmentIdBack, setGovernmentIdBack] = useState<string | null>(null);
  const [governmentIdFrontError, setGovernmentIdFrontError] = useState("");
  const [governmentIdBackError, setGovernmentIdBackError] = useState("");

  // Dropdown states
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showCivilStatusDropdown, setShowCivilStatusDropdown] = useState(false);
  const [showCitizenshipDropdown, setShowCitizenshipDropdown] = useState(false);

  // Custom alert modal states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
  });
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = "error",
  ) => {
    setAlertConfig({
      title,
      message,
      type,
      confirmText: t("common.ok"),
    });
    setAlertVisible(true);
  };

  const validateEmail = (email: string): boolean => {
    return email.includes("@");
  };

  const validateMobileNumber = (mobile: string): boolean => {
    const digitsOnly = mobile.replace(/\D/g, "");
    return digitsOnly.length >= 10 && digitsOnly.length <= 11;
  };

  const validateLandlineNumber = (landline: string): boolean => {
    const digitsOnly = landline.replace(/\D/g, "");
    return digitsOnly.length === 8;
  };

  const handleNext = () => {
    // Reset errors for current step
    if (currentStep === 1) {
      setEmailError("");
      setMobileError("");
      setLandlineError("");
      setHomeAddressError("");

      let hasError = false;
      if (!emailAddress) {
        setEmailError(t("travel.fieldRequired") || "Required");
        hasError = true;
      } else if (!validateEmail(emailAddress)) {
        setEmailError(t("travel.errorValidEmail"));
        hasError = true;
      }

      if (!mobileNumber) {
        setMobileError(t("travel.fieldRequired") || "Required");
        hasError = true;
      } else if (!validateMobileNumber(mobileNumber)) {
        setMobileError(t("travel.errorValidMobile"));
        hasError = true;
      }

      if (!homeAddress) {
        setHomeAddressError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }

      if (landlineNumber && !validateLandlineNumber(landlineNumber)) {
        setLandlineError(t("travel.errorValidLandline"));
        hasError = true;
      }

      if (hasError) {
        showAlert(
          t("travel.requiredFields"),
          t("travel.fillRequired"),
          "error",
        );
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setGenderError("");
      setDateOfBirthError("");
      setCivilStatusError("");
      setCitizenshipError("");

      let hasError = false;
      if (!gender) {
        setGenderError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (dateOfBirthText === EMPTY_PLACEHOLDER) {
        setDateOfBirthError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!civilStatus) {
        setCivilStatusError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!citizenship) {
        setCitizenshipError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }

      if (hasError) {
        showAlert(
          t("travel.requiredFields"),
          t("travel.fillRequired"),
          "error",
        );
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setSourceOfFundError("");
      setGrossMonthlyIncomeError("");
      setCashOnHandError("");

      let hasError = false;
      if (!sourceOfFund) {
        setSourceOfFundError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!grossMonthlyIncome) {
        setGrossMonthlyIncomeError(t("travel.fieldRequired") || "Required");
        hasError = true;
      } else {
        // Validate gross monthly income is a positive whole number (no decimals, no negatives)
        const cleanedIncome = grossMonthlyIncome.replace(/,/g, "");
        const incomeNum = parseInt(cleanedIncome, 10);
        
        // Must be a valid positive integer with no decimals
        if (!cleanedIncome || cleanedIncome.includes(".") || isNaN(incomeNum) || incomeNum <= 0) {
          setGrossMonthlyIncomeError(
            t("travel.grossMonthlyIncomeInvalid") || "Must be a positive whole number"
          );
          hasError = true;
        }
      }
      if (!cashOnHand) {
        setCashOnHandError(t("travel.fieldRequired") || "Required");
        hasError = true;
      } else {
        // Validate cash on hand is a positive whole number (no decimals, no negatives)
        const cleanedCash = cashOnHand.replace(/,/g, "");
        const cashNum = parseInt(cleanedCash, 10);
        
        // Must be a valid positive integer with no decimals
        if (!cleanedCash || cleanedCash.includes(".") || isNaN(cashNum) || cashNum <= 0) {
          setCashOnHandError(
            t("travel.cashOnHandInvalid") || "Must be a positive whole number"
          );
          hasError = true;
        }
      }

      if (hasError) {
        showAlert(
          t("travel.requiredFields"),
          t("travel.fillRequired"),
          "error",
        );
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setDestinationAddressError("");
      setCheckInDateError("");
      setDurationError("");
      setDepartureTimeError("");
      setArrivalTimeError("");
      setPassportNumberError("");
      setPurposeOfTravelError("");

      let hasError = false;
      if (!destinationAddress) {
        setDestinationAddressError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (checkInDateText === EMPTY_PLACEHOLDER) {
        setCheckInDateError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!duration) {
        setDurationError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (departureTimeText === EMPTY_PLACEHOLDER) {
        setDepartureTimeError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (arrivalTimeText === EMPTY_PLACEHOLDER) {
        setArrivalTimeError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!passportNumber) {
        setPassportNumberError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!purposeOfTravel) {
        setPurposeOfTravelError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }

      if (hasError) {
        showAlert(
          t("travel.requiredFields"),
          t("travel.fillRequired"),
          "error",
        );
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setPassportPhotoError("");
      setGovernmentIdFrontError("");
      setGovernmentIdBackError("");

      let hasError = false;
      if (!passportPhoto) {
        setPassportPhotoError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!governmentIdType) {
        setGovernmentIdFrontError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      if (!governmentIdFront) {
        setGovernmentIdFrontError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }
      const requiresFrontAndBack = FRONT_AND_BACK_GOVERNMENT_ID_TYPES.includes(governmentIdType);
      if (requiresFrontAndBack && !governmentIdBack) {
        setGovernmentIdBackError(t("travel.fieldRequired") || "Required");
        hasError = true;
      }

      if (hasError) {
        showAlert(
          t("travel.requiredDocuments"),
          t("travel.uploadBothDocs"),
          "error",
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
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Main");
      }
    }
  };

  const handleTopBackPress = () => {
    setShowExitConfirmModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    navigation.navigate("Main");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        showAlert(t("travel.error"), t("travel.notAuthenticated"), "error");
        return;
      }

      if (availableBalance < protectionFee) {
        showAlert(
          t("travel.error"),
          t("sendMoney.insufficientBalance") || t("travel.insufficientBalance"),
          "error",
        );
        return;
      }

      let passportPhotoBase64: string | undefined;
      if (passportPhoto) {
        passportPhotoBase64 = await uriToBase64DataUrl(passportPhoto);
      }

      let governmentIdPhotoFrontBase64: string | undefined;
      if (governmentIdFront) {
        governmentIdPhotoFrontBase64 = await uriToBase64DataUrl(governmentIdFront);
      }

      let governmentIdPhotoBackBase64: string | undefined;
      if (governmentIdBack) {
        governmentIdPhotoBackBase64 = await uriToBase64DataUrl(governmentIdBack);
      }

      // Formulate the time strings like "08:00 AM"
      const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const formatDate = (d: Date | null) =>
        d ? d.toISOString().split("T")[0] : "";

      // Prepare the data
      const applicationData = {
        email: emailAddress,
        mobile: `${selectedCountry.dialCode}${mobileNumber}`,
        landline: landlineNumber || undefined,
        homeAddress,
        gender,
        dateOfBirth: formatDate(dateOfBirth),
        civilStatus,
        citizenship,
        sourceOfFund,
        grossMonthlyIncome: `${unformatNumberString(grossMonthlyIncome)} ${grossMonthlyIncomeCurrency}`,
        cashOnHand: unformatNumberString(cashOnHand),
        destinationAddress,
        checkInDate: formatDate(checkInDate),
        duration,
        airlineType: "Commercial", // Backend requires this field
        departureTime: formatTime(departureTime),
        arrivalTime: formatTime(arrivalTime),
        passportNumber,
        purposeOfTravel,
        passportPhoto: passportPhotoBase64,
        // Government ID fields (optional)
        governmentIdType: governmentIdType || undefined,
        governmentIdNumber: governmentIdNumber || undefined,
        governmentIdPhotoFront: governmentIdPhotoFrontBase64,
        governmentIdPhotoBack: governmentIdPhotoBackBase64,
      };

      console.log("[TravelProtection] Submitting data:", JSON.stringify({
        ...applicationData,
        passportPhoto: applicationData.passportPhoto ? `[base64-${applicationData.passportPhoto.length} chars]` : undefined,
        governmentIdPhotoFront: applicationData.governmentIdPhotoFront ? `[base64-${String(applicationData.governmentIdPhotoFront).length} chars]` : undefined,
        governmentIdPhotoBack: applicationData.governmentIdPhotoBack ? `[base64-${String(applicationData.governmentIdPhotoBack).length} chars]` : undefined,
      }, null, 2));

      const result = await submitTravelProtection(accessToken, applicationData);

      console.log("[TravelProtection] API Response:", result);

      if (result.success) {
        const response = (result.data ?? {}) as {
          status?: string;
          price?: string | number;
        };
        const normalizedStatus = String(response.status ?? "").toUpperCase();
        if (normalizedStatus === "APPROVED" || normalizedStatus === "ACCEPTED") {
          await Promise.all([
            fetchAvailableBalance(),
            getTransactions(accessToken, { limit: 20 }),
          ]);
        }
        showAlert(
          t("travel.applicationSubmitted"),
          t("travel.applicationSuccess"),
          "success",
        );
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        showAlert(
          t("travel.error"),
          result.error || t("travel.submitFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("Travel protection API error:", error);
      showAlert(t("travel.error"), t("travel.unexpectedError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDateOfBirth = (d: Date) => {
    return `${t(MONTH_KEYS[d.getMonth()])} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const applyDateFromTemp = (month: number, day: number, year: number) => {
    const d = new Date(year, month, day);
    setDateOfBirth(d);
    setDateOfBirthText(formatDateOfBirth(d));
  };

  const applyCheckInDateFromTemp = (
    month: number,
    day: number,
    year: number,
  ) => {
    const d = new Date(year, month, day);
    setCheckInDate(d);
    setCheckInDateText(formatDateOfBirth(d));
  };

  const applyDepartureTimeFromTemp = (hour: number, minute: number) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setDepartureTime(d);
    setDepartureTimeText(
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    );
  };

  const applyArrivalTimeFromTemp = (hour: number, minute: number) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setArrivalTime(d);
    setArrivalTimeText(
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          "warning",
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

  const pickGovernmentIdPhoto = async (
    side: "front" | "back",
  ) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showAlert(
          t("travel.permissionRequired"),
          t("travel.allowPhotos"),
          "warning",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (side === "front") {
          setGovernmentIdFront(result.assets[0].uri);
          if (governmentIdFrontError) setGovernmentIdFrontError("");
        } else {
          setGovernmentIdBack(result.assets[0].uri);
          if (governmentIdBackError) setGovernmentIdBackError("");
        }
      }
    } catch (error) {
      console.error("Error picking government ID:", error);
      showAlert(t("travel.error"), t("travel.failedToPickImage"), "error");
    }
  };

  const dynamicStyles = {
    scrollContent: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: verticalScale(24),
    },
    heroCard: {
      padding: scale(24),
      marginTop: verticalScale(16),
      marginBottom: verticalScale(16),
    },
    heroIconContainer: {
      width: scale(80),
      height: scale(80),
      marginBottom: verticalScale(16),
    },
    heroTitle: { fontSize: scale(22) },
    heroSubtitle: { fontSize: scale(14) },
    infoBanner: { padding: scale(16), marginBottom: verticalScale(16) },
    feeCard: { padding: scale(20), marginBottom: verticalScale(16) },
    feeAmount: { fontSize: scale(32) },
    stepIndicator: { gap: scale(12), marginBottom: verticalScale(24) },
    stepDot: {
      width: isSmallScreen ? scale(28) : scale(32),
      height: isSmallScreen ? scale(28) : scale(32),
    },
    formCard: { padding: scale(20) },
    buttonContainer: {
      flexDirection: "row" as const,
      gap: 12,
    },
    countryDropdown: {
      paddingHorizontal: isTinyScreen ? 8 : isSmallScreen ? 10 : 16,
      paddingVertical: isTinyScreen ? 12 : 14,
      gap: isTinyScreen ? 2 : 6,
    },
    countryFlag: {
      fontSize: isTinyScreen ? 16 : 20,
      lineHeight: isTinyScreen ? 16 : 20,
    },
    countryCode: {
      fontSize: isTinyScreen ? 12 : isSmallScreen ? 14 : 16,
    },
    mobileInput: {
      paddingHorizontal: isTinyScreen ? 10 : 16,
      fontSize: isTinyScreen ? 14 : 16,
    },
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <Loader text={t("banking.submitting")} />
        </>
      ) : (
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "left", "right", "bottom"]}
          >
            {/* Top: Back arrow only */}
            <View
              style={[styles.topSection, { paddingHorizontal: horizontalPadding }]}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleTopBackPress}
              >
                <Ionicons name="arrow-back" size={scale(28)} color="#E25A17" />
              </TouchableOpacity>
            </View>

            <KeyboardAwareGHScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                dynamicStyles.scrollContent,
              ]}
              enableOnAndroid={true}
              enableAutomaticScroll={true}
              extraScrollHeight={Platform.OS === "ios" ? 150 : 120}
              extraHeight={Platform.OS === "android" ? 150 : 120}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              keyboardOpeningTime={0}
              enableResetScrollToCoords={false}
              nestedScrollEnabled
            >
              {/* Header card inside scroll */}
              <View style={styles.headerCard} pointerEvents="box-none">
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.headerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  pointerEvents="box-none"
                >
                  <MaterialCommunityIcons
                    name="airplane"
                    size={scale(40)}
                    color="#FFFFFF"
                    style={styles.headerIcon}
                  />
                  <Text style={[styles.heroTitle, dynamicStyles.heroTitle]}>
                    {t("travel.title")}
                  </Text>
                  <Text style={[styles.heroSubtitle, dynamicStyles.heroSubtitle]}>
                    {t("travel.subtitle")}
                  </Text>
                </LinearGradient>
              </View>
              <View
                style={[styles.infoBanner, dynamicStyles.infoBanner]}
                pointerEvents="box-none"
              >
                <View style={styles.infoBannerIcon}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color="#E25A17"
                  />
                </View>
                <Text style={styles.infoBannerText}>
                  {t("travel.infoBanner")}{" "}
                  <Text style={styles.infoBannerBold}>
                    {t("travel.infoBannerDays")}
                  </Text>{" "}
                  {t("travel.infoBannerAfter")}
                </Text>
              </View>

              <View
                style={[styles.feeCard, dynamicStyles.feeCard]}
                pointerEvents="box-none"
              >
                <View style={styles.feeHeader}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={20}
                    color="#E25A17"
                  />
                  <Text style={styles.feeLabel}>
                    {t("travel.protectionFee")}
                  </Text>
                </View>
                <Text style={[styles.feeAmount, dynamicStyles.feeAmount]}>
                  {isFeeLoading ? "..." : `₱ ${protectionFee.toLocaleString()}`}
                </Text>
                <Text style={styles.feeSubtext}>
                  {t("travel.availableBalance")}: ₱ {availableBalance.toLocaleString()}
                </Text>
              </View>

              <View
                style={[
                  styles.stepIndicatorContainer,
                  dynamicStyles.stepIndicator,
                  isSmallScreen && styles.stepIndicatorSmall,
                ]}
                pointerEvents="box-none"
              >
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
                      <Ionicons
                        name="checkmark"
                        size={scale(16)}
                        color="#FFFFFF"
                      />
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
                <View
                  style={[styles.formCard, dynamicStyles.formCard]}
                  pointerEvents="box-none"
                >
                  <View style={styles.formHeader} pointerEvents="box-none">
                    <View style={styles.formIconContainer}>
                      <MaterialCommunityIcons
                        name="home-account"
                        size={24}
                        color="#E25A17"
                      />
                    </View>
                    <View>
                      <Text style={styles.formTitle}>
                        {t("travel.contactInfo")}
                      </Text>
                      <Text style={styles.formSubtitle}>
                        {t("travel.contactSubtitle")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup} pointerEvents="box-none">
                    <Text style={styles.inputLabel}>
                      {t("travel.emailAddress")}{" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      ref={emailRef}
                      style={[styles.input, emailError && styles.inputError]}
                      placeholder={t("travel.placeholderEmail")}
                      placeholderTextColor="#999"
                      value={emailAddress}
                      onChangeText={(text) => {
                        setEmailAddress(text);
                        if (emailError) setEmailError("");
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => mobileRef.current?.focus()}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToFocusedInput(
                            emailRef.current as any,
                            70,
                          );
                        }, 100);
                      }}
                    />
                    {emailError && (
                      <Text style={styles.errorMessage}>{emailError}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup} pointerEvents="box-none">
                    <Text style={styles.inputLabel}>
                      {t("travel.mobileNumber")}{" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.mobileInputContainer} pointerEvents="box-none">
                      <TouchableOpacity
                        style={[styles.countryDropdown, dynamicStyles.countryDropdown]}
                        onPress={() => setShowCountryDropdown(true)}
                      >
                        <Text style={[styles.countryFlag, dynamicStyles.countryFlag]}>
                          {selectedCountry.flag}
                        </Text>
                        <Text style={[styles.countryCode, dynamicStyles.countryCode]}>
                          {selectedCountry.dialCode}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#666" />
                      </TouchableOpacity>
                      <TextInput
                        ref={mobileRef}
                        style={[
                          styles.mobileInput,
                          dynamicStyles.mobileInput,
                          mobileError && styles.inputError,
                        ]}
                        placeholder={selectedCountry.example}
                        placeholderTextColor="#999"
                        value={mobileNumber}
                        onChangeText={(text) => {
                          const digitsOnly = text.replace(/\D/g, "");
                          if (digitsOnly.length <= 11) {
                            setMobileNumber(digitsOnly);
                            if (mobileError) setMobileError("");
                          }
                        }}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                        onSubmitEditing={() => landlineRef.current?.focus()}
                        maxLength={11}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToFocusedInput(
                              mobileRef.current as any,
                            );
                          }, 100);
                        }}
                      />
                    </View>
                    <Modal
                      visible={showCountryDropdown}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setShowCountryDropdown(false)}
                    >
                      <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                          <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                              {t("travel.selectCountry")}
                            </Text>
                            <TouchableOpacity
                              onPress={() => setShowCountryDropdown(false)}
                            >
                              <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                          </View>
                          <ScrollView
                            style={[
                              styles.dropdownMenu,
                              { maxHeight: Math.min(420, windowHeight * 0.5) },
                            ]}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            {countries.map((country) => (
                              <TouchableOpacity
                                key={country.code}
                                style={[
                                  styles.dropdownItem,
                                  selectedCountry.code === country.code &&
                                    styles.dropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setSelectedCountry(country);
                                  setShowCountryDropdown(false);
                                }}
                              >
                                <Text style={styles.dropdownItemContent}>
                                  {country.flag} {country.dialCode}{" "}
                                  {country.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </Modal>
                    {mobileError && (
                      <Text style={styles.errorMessage}>{mobileError}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup} pointerEvents="box-none">
                    <Text style={styles.inputLabel}>
                      {t("travel.landlineNumber")}
                    </Text>
                    <TextInput
                      ref={landlineRef}
                      style={[styles.input, landlineError && styles.inputError]}
                      placeholder={t("travel.placeholderLandline")}
                      placeholderTextColor="#999"
                      value={landlineNumber}
                      onChangeText={(text) => {
                        const digitsOnly = text.replace(/\D/g, "");
                        if (digitsOnly.length <= 8) {
                          setLandlineNumber(digitsOnly);
                          if (landlineError) setLandlineError("");
                        }
                      }}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      onSubmitEditing={() => homeAddressRef.current?.focus()}
                      maxLength={8}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToFocusedInput(
                            landlineRef.current as any,
                          );
                        }, 100);
                      }}
                    />
                    {landlineError && (
                      <Text style={styles.errorMessage}>{landlineError}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup} pointerEvents="box-none">
                    <Text style={styles.inputLabel}>
                      {t("travel.homeAddress")}{" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      ref={homeAddressRef}
                      style={[
                        styles.input,
                        styles.textArea,
                        homeAddressError ? styles.inputError : null,
                      ]}
                      placeholder={t("travel.placeholderHomeAddress")}
                      placeholderTextColor="#999"
                      value={homeAddress}
                      onChangeText={(text) => {
                        setHomeAddress(text);
                        if (homeAddressError) setHomeAddressError("");
                      }}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToFocusedInput(
                            homeAddressRef.current as any,
                          );
                        }, 100);
                      }}
                    />
                    {homeAddressError && (
                      <Text style={styles.errorMessage}>
                        {homeAddressError}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Step 2: Personal Details */}
              {currentStep === 2 && (
                <TravelProtectPerDeatails
                  gender={gender}
                  genderError={genderError}
                  setGender={(val) => {
                    setGender(val);
                    if (genderError) setGenderError("");
                  }}
                  dateOfBirth={dateOfBirth}
                  dateOfBirthError={dateOfBirthError}
                  dateOfBirthText={dateOfBirthText}
                  showDateModal={showDateModal}
                  setShowDateModal={setShowDateModal}
                  tempDate={tempDate}
                  setTempDate={setTempDate}
                  civilStatus={civilStatus}
                  civilStatusError={civilStatusError}
                  setCivilStatus={(val) => {
                    setCivilStatus(val);
                    if (civilStatusError) setCivilStatusError("");
                  }}
                  citizenship={citizenship}
                  citizenshipError={citizenshipError}
                  setCitizenship={(val) => {
                    setCitizenship(val);
                    if (citizenshipError) setCitizenshipError("");
                  }}
                  showGenderDropdown={showGenderDropdown}
                  setShowGenderDropdown={setShowGenderDropdown}
                  showCivilStatusDropdown={showCivilStatusDropdown}
                  setShowCivilStatusDropdown={setShowCivilStatusDropdown}
                  showCitizenshipDropdown={showCitizenshipDropdown}
                  setShowCitizenshipDropdown={setShowCitizenshipDropdown}
                  applyDateFromTemp={(m, d, y) => {
                    applyDateFromTemp(m, d, y);
                    if (dateOfBirthError) setDateOfBirthError("");
                  }}
                />
              )}

              {/* Step 3: Financial Information */}
              {currentStep === 3 && (
                <TravelProtectFinanInfo
                  sourceOfFund={sourceOfFund}
                  sourceOfFundError={sourceOfFundError}
                  setSourceOfFund={(val) => {
                    setSourceOfFund(val);
                    if (sourceOfFundError) setSourceOfFundError("");
                  }}
                  grossMonthlyIncome={grossMonthlyIncome}
                  grossMonthlyIncomeError={grossMonthlyIncomeError}
                  grossMonthlyIncomeCurrency={grossMonthlyIncomeCurrency}
                  setGrossMonthlyIncome={(val) => {
                    setGrossMonthlyIncome(val);
                    if (grossMonthlyIncomeError) setGrossMonthlyIncomeError("");
                  }}
                  setGrossMonthlyIncomeError={setGrossMonthlyIncomeError}
                  setGrossMonthlyIncomeCurrency={setGrossMonthlyIncomeCurrency}
                  cashOnHand={cashOnHand}
                  cashOnHandError={cashOnHandError}
                  setCashOnHand={(val) => {
                    setCashOnHand(val);
                    if (cashOnHandError) setCashOnHandError("");
                  }}
                  setCashOnHandError={setCashOnHandError}
                />
              )}

              {/* Step 4: Travel Details */}
              {currentStep === 4 && (
                <TravelProtectDetails
                  destinationAddress={destinationAddress}
                  destinationAddressError={destinationAddressError}
                  setDestinationAddress={(val) => {
                    setDestinationAddress(val);
                    if (destinationAddressError) setDestinationAddressError("");
                  }}
                  checkInDate={checkInDate}
                  checkInDateError={checkInDateError}
                  checkInDateText={checkInDateText}
                  setShowCheckInModal={setShowCheckInModal}
                  tempCheckInDate={tempCheckInDate}
                  setTempCheckInDate={setTempCheckInDate}
                  duration={duration}
                  durationError={durationError}
                  setDuration={(val) => {
                    setDuration(val);
                    if (durationError) setDurationError("");
                  }}
                  departureTime={departureTime}
                  departureTimeError={departureTimeError}
                  departureTimeText={departureTimeText}
                  setShowDepartureTimePicker={setShowDepartureTimePicker}
                  tempDepartureTime={tempDepartureTime}
                  setTempDepartureTime={setTempDepartureTime}
                  arrivalTime={arrivalTime}
                  arrivalTimeError={arrivalTimeError}
                  arrivalTimeText={arrivalTimeText}
                  setShowArrivalTimePicker={setShowArrivalTimePicker}
                  tempArrivalTime={tempArrivalTime}
                  setTempArrivalTime={setTempArrivalTime}
                  passportNumber={passportNumber}
                  passportNumberError={passportNumberError}
                  setPassportNumber={(val) => {
                    setPassportNumber(val);
                    if (passportNumberError) setPassportNumberError("");
                  }}
                  purposeOfTravel={purposeOfTravel}
                  purposeOfTravelError={purposeOfTravelError}
                  setPurposeOfTravel={(val) => {
                    setPurposeOfTravel(val);
                    if (purposeOfTravelError) setPurposeOfTravelError("");
                  }}
                  showCheckInModal={showCheckInModal}
                  showDepartureTimePicker={showDepartureTimePicker}
                  showArrivalTimePicker={showArrivalTimePicker}
                  applyCheckInDateFromTemp={(m, d, y) => {
                    applyCheckInDateFromTemp(m, d, y);
                    if (checkInDateError) setCheckInDateError("");
                  }}
                  applyDepartureTimeFromTemp={(h, mi) => {
                    applyDepartureTimeFromTemp(h, mi);
                    if (departureTimeError) setDepartureTimeError("");
                  }}
                  applyArrivalTimeFromTemp={(h, mi) => {
                    applyArrivalTimeFromTemp(h, mi);
                    if (arrivalTimeError) setArrivalTimeError("");
                  }}
                />
              )}

              {/* Step 5: Required Documents */}
              {currentStep === 5 && (
                <TravelRequiredDocu
                  passportPhoto={passportPhoto}
                  passportPhotoError={passportPhotoError}
                  governmentIdFront={governmentIdFront}
                  governmentIdBack={governmentIdBack}
                  governmentIdFrontError={governmentIdFrontError}
                  governmentIdBackError={governmentIdBackError}
                  governmentIdType={governmentIdType}
                  governmentIdNumber={governmentIdNumber}
                  onPickPassportPhoto={() => {
                    pickPassportPhoto();
                    if (passportPhotoError) setPassportPhotoError("");
                  }}
                  onPickGovernmentIdFront={() => {
                    pickGovernmentIdPhoto("front");
                  }}
                  onPickGovernmentIdBack={() => {
                    pickGovernmentIdPhoto("back");
                  }}
                  onGovernmentIdTypeChange={(val) => {
                    setGovernmentIdType(val);
                    // Changing ID type requires re-upload to avoid stale/mismatched files.
                    setGovernmentIdFront(null);
                    setGovernmentIdBack(null);
                    setGovernmentIdFrontError("");
                    setGovernmentIdBackError("");
                  }}
                  onGovernmentIdNumberChange={(val) => {
                    setGovernmentIdNumber(val);
                  }}
                />
              )}

              {/* Step 6: Review & Submit */}
              {currentStep === 6 && (
                <TravelProtectReviewSubmit
                  emailAddress={emailAddress}
                  mobileDialCode={selectedCountry.dialCode}
                  mobileNumber={mobileNumber}
                  landlineNumber={landlineNumber}
                  homeAddress={homeAddress}
                  gender={gender}
                  dateOfBirthText={dateOfBirthText}
                  civilStatus={civilStatus}
                  citizenship={citizenship}
                  sourceOfFund={sourceOfFund}
                  grossMonthlyIncome={grossMonthlyIncome}
                  grossMonthlyIncomeCurrency={grossMonthlyIncomeCurrency}
                  cashOnHand={cashOnHand}
                  destinationAddress={destinationAddress}
                  checkInDateText={checkInDateText}
                  duration={duration}
                  departureTimeText={departureTimeText}
                  arrivalTimeText={arrivalTimeText}
                  passportNumber={passportNumber}
                  purposeOfTravel={purposeOfTravel}
                  governmentIdType={governmentIdType}
                  governmentIdNumber={governmentIdNumber}
                />
              )}
        </KeyboardAwareGHScrollView>

        {/* Footer buttons (Banking-style) */}
        <View style={styles.footer} pointerEvents="box-none">
          <View style={[styles.buttonContainer, dynamicStyles.buttonContainer]}>
            <RNTouchableOpacity style={styles.backButtonBottom} onPress={handleBack}>
              <Text style={styles.backButtonText}>{t("travel.back")}</Text>
            </RNTouchableOpacity>
            <RNTouchableOpacity style={styles.nextButton} onPress={handleNext}>
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
            </RNTouchableOpacity>
          </View>
        </View>
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
              {t("travel.cancelApplicationMessage")}
            </Text>
            <View style={styles.exitModalButtons}>
              <RNTouchableOpacity
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
              </RNTouchableOpacity>
              <RNTouchableOpacity
                style={[styles.exitModalButton, styles.exitModalDiscardButton]}
                onPress={handleConfirmExit}
              >
                <Text
                  style={[styles.exitModalButtonText, styles.exitModalDiscardButtonText]}
                >
                  {t("common.discardExit")}
                </Text>
              </RNTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </>
      )}
    </View>
  );
}

const THEME_COLOR = "#E15816";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 0,
  },
  headerCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  headerGradient: {
    padding: 24,
    alignItems: "center",
  },
  headerIcon: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    width: "100%",
    alignSelf: "stretch",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    backgroundColor: "#FFFFFF",
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
    borderLeftColor: THEME_COLOR,
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
    color: THEME_COLOR,
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
    color: THEME_COLOR,
    marginBottom: 4,
    textAlign: "center",
  },
  feeSubtext: {
    fontSize: 11,
    color: "#999",
    letterSpacing: 0.5,
    textAlign: "center",
    alignSelf: "center",
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  stepIndicatorSmall: {
    gap: 8,
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
    backgroundColor: THEME_COLOR,
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
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
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
  inputError: {
    borderColor: THEME_COLOR,
    borderWidth: 2,
  },
  errorMessage: {
    fontSize: 12,
    color: THEME_COLOR,
    marginTop: 6,
    fontWeight: "500",
  },
  mobileInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  countryDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    flexShrink: 0,
  },
  countryFlag: {
    fontSize: 20,
    lineHeight: 20,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  mobileInput: {
    flex: 1,
    minWidth: 0,
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
    height: 100,
    paddingTop: 14,
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
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
  dropdownMenu: {
    padding: 16,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9F9F9",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  dropdownItemContent: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  buttonContainer: {
    backgroundColor: "transparent",
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 12,
  },
  backButtonBottom: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME_COLOR,
    letterSpacing: 0.5,
  },
  nextButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  nextButtonGradient: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
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
