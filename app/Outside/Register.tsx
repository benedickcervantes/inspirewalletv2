import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
  useWindowDimensions,
  View,
} from "react-native";
import { register as registerApi } from "../../configs/api";
import type { NavProp } from "../../types/navigation";
import { useResponsive } from "../../utils/responsive";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const filterCompanyInput = (text: string) =>
  text.replace(/[^A-Za-zÑñ0-9 ]/g, "");
const isValidEmail = (email: string) =>
  EMAIL_REGEX.test((email || "").trim().toLowerCase());

const filterEmailInput = (text: string) =>
  text.replace(/[^A-Za-z0-9.@\-_]/g, "");

// Allow only English letters (A–Z, a–z), Ñ/ñ, and spaces for name fields
const filterNameInput = (text: string) => text.replace(/[^A-Za-zÑñ ]/g, "");

// Allow digits only for phone number
const filterPhoneInput = (text: string) => text.replace(/[^0-9]/g, "");

const capitalizeWords = (text: string) =>
  text.replace(/\b\w/g, (char) => char.toUpperCase());

const COUNTRY_OPTIONS = [
  {
    code: "+63",
    label: "Philippines",
    flag: "🇵🇭",
    iso: "PH",
    mask: "#### ### ###",
    maxLength: 10,
  },
  {
    code: "+81",
    label: "Japan",
    flag: "🇯🇵",
    iso: "JP",
    mask: "## #### ####",
    maxLength: 10,
  },
  {
    code: "+966",
    label: "Saudi Arabia",
    flag: "🇸🇦",
    iso: "SA",
    mask: "## ### ####",
    maxLength: 9,
  },
  {
    code: "+82",
    label: "Korea",
    flag: "🇰🇷",
    iso: "KR",
    mask: "## #### ####",
    maxLength: 10,
  },
  {
    code: "+1",
    label: "United States",
    flag: "🇺🇸",
    iso: "US",
    mask: "### ### ####",
    maxLength: 10,
  },
];

const formatWithMask = (text: string, mask: string) => {
  const digits = text.replace(/\D/g, "");
  let formatted = "";
  let digitIndex = 0;
  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === "#") {
      formatted += digits[digitIndex++];
    } else {
      formatted += mask[i];
    }
  }
  return formatted;
};

export default function Register() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { horizontalPadding } = useResponsive();
  const [currentStep, setCurrentStep] = useState(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] = useState("+63");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lineContact, setLineContact] = useState("");
  const [viberContact, setViberContact] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [activeQRField, setActiveQRField] = useState<
    "referral" | "line" | "viber" | "whatsapp" | null
  >(null);
  const [permission, requestPermission] = useCameraPermissions();

  const handleNextStep = () => {
    setRegisterError("");
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!firstName.trim()) {
        newErrors.firstName = "Please enter your first name";
      }
      if (!lastName.trim()) {
        newErrors.lastName = "Please enter your last name";
      }
      if (hasCompany && !companyName.trim()) {
        newErrors.companyName = "Please enter your company name";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (isAgent === null) {
        newErrors.isAgent = "Please select if you are an agent or investor";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const email = emailAddress.trim();
      if (!email) {
        newErrors.emailAddress = "Please enter your email address";
      } else if (!isValidEmail(email)) {
        newErrors.emailAddress =
          "Please enter a valid email address (e.g. name@example.com)";
      }
      if (!password.trim()) {
        newErrors.password = "Please enter a password";
      } else if (password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setRegisterError("");
    setRegisterLoading(true);
    try {
      const country = COUNTRY_OPTIONS.find(
        (c) => c.code === selectedCountryCode,
      );
      // Strip non-digits from phoneNumber before prepending country code
      const phoneDigits = phoneNumber.replace(/\D/g, "");
      const phone = phoneDigits ? selectedCountryCode + phoneDigits : "";
      const body: Record<string, unknown> = {
        email: emailAddress.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.length > 0 && phone.length <= 30 ? phone : undefined,
        countryCode: country?.iso,
        referralCode: referralCode.trim() || undefined,
        companyName:
          hasCompany && companyName.trim() ? companyName.trim() : undefined,
        lineContact: lineContact.trim() || undefined,
        viberContact: viberContact.trim() || undefined,
        whatsappContact: whatsappContact.trim() || undefined,
        isAgent: isAgent ?? false,
      };
      const result = await registerApi(body);

      if (!result.success) {
        setRegisterError(
          result.error || "Registration failed. Please try again.",
        );
        return;
      }

      await AsyncStorage.setItem("access_token", result.access_token || "");
      await AsyncStorage.setItem("user", JSON.stringify(result.user || {}));
      await AsyncStorage.setItem("registrationPasscodePending", "true");
      (navigation as unknown as NavProp).replace("CreatePasscode");
    } catch (_err) {
      setRegisterError("An unexpected error occurred. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      (navigation as unknown as NavProp).replace("Welcome");
    }
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    setIsQRScannerVisible(false);

    // Handle based on which field's QR scanner was opened
    if (activeQRField === "referral") {
      // Check if the scanned data is a URL with a 'ref' parameter
      try {
        if (data.includes("ref=")) {
          // e.g. http://localhost:3000/register?ref=ABCDE
          const urlParams = new URL(data);
          const ref = urlParams.searchParams.get("ref");
          if (ref) {
            setReferralCode(ref.toUpperCase());
            setActiveQRField(null);
            return;
          }
        }
      } catch (_urlErr) {
        // Not a valid URL, ignore URL parsing error
      }
      // fallback to setting exactly what was scanned
      setReferralCode(data.toUpperCase());
    } else if (activeQRField === "line") {
      setLineContact(data);
    } else if (activeQRField === "viber") {
      setViberContact(data);
    } else if (activeQRField === "whatsapp") {
      setWhatsappContact(data);
    }

    setActiveQRField(null);
  };

  const openScanner = async (
    fieldType: "referral" | "line" | "viber" | "whatsapp",
  ) => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        alert("Camera permission is required to scan QR codes.");
        return;
      }
    }
    setActiveQRField(fieldType);
    setIsQRScannerVisible(true);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "web"
              ? undefined
              : Platform.OS === "ios"
                ? "padding"
                : "height"
          }
          style={styles.keyboardView}
        >
          <View
            style={[styles.header, { paddingHorizontal: horizontalPadding }]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackStep}
            >
              <Ionicons name="arrow-back" size={24} color="#E25A17" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account Registration</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                {currentStep > 1 ? (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                ) : (
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                )}
              </View>
              <View
                style={[
                  styles.stepLine,
                  currentStep > 1 && styles.stepLineActive,
                ]}
              />
            </View>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= 2 && styles.stepActive,
                ]}
              >
                {currentStep > 2 ? (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="call"
                    size={20}
                    color={currentStep >= 2 ? "#FFFFFF" : "#E25A17"}
                  />
                )}
              </View>
              <View
                style={[
                  styles.stepLine,
                  currentStep > 2 && styles.stepLineActive,
                ]}
              />
            </View>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= 3 && styles.stepActive,
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={currentStep >= 3 ? "#FFFFFF" : "#E25A17"}
                />
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: 20,
                paddingHorizontal: horizontalPadding,
                paddingBottom: 100,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 1 && (
              <>
                <Text style={styles.welcomeText}>Welcome Investor!</Text>
                <View style={styles.infoBanner}>
                  <MaterialCommunityIcons
                    name="office-building"
                    size={24}
                    color="#E25A17"
                  />
                  <View style={styles.infoBannerTextContainer}>
                    <Text style={styles.infoBannerText}>
                      Start your investment journey with{" "}
                      <Text style={styles.infoBannerBold}>Inspire Wallet.</Text>
                    </Text>
                    <Text style={styles.infoBannerText}>
                      Complete your profile to unlock all features.
                    </Text>
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <View style={styles.sectionUnderline} />
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      First Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.firstName && styles.inputError,
                      ]}
                      placeholder="e.g. John"
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(capitalizeWords(filterNameInput(text)));
                        if (errors.firstName) {
                          setErrors((prev) => {
                            const { firstName, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                    {errors.firstName && (
                      <Text style={styles.errorText}>{errors.firstName}</Text>
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Last Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.lastName && styles.inputError,
                      ]}
                      placeholder="e.g. Doe"
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(capitalizeWords(filterNameInput(text)));
                        if (errors.lastName) {
                          setErrors((prev) => {
                            const { lastName, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                    {errors.lastName && (
                      <Text style={styles.errorText}>{errors.lastName}</Text>
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.phoneInputContainer}>
                      <TouchableOpacity
                        style={styles.countrySelector}
                        onPress={() => setIsCountryModalVisible(true)}
                      >
                        <Text style={styles.countryFlag}>
                          {
                            COUNTRY_OPTIONS.find(
                              (c) => c.code === selectedCountryCode,
                            )?.flag
                          }
                        </Text>
                        <Text style={styles.countryCode}>
                          {selectedCountryCode}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder={
                          COUNTRY_OPTIONS.find(
                            (c) => c.code === selectedCountryCode,
                          )?.mask.replace(/#/g, "0") || "000 000 0000"
                        }
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={phoneNumber}
                        onChangeText={(text) => {
                          const country = COUNTRY_OPTIONS.find(
                            (c) => c.code === selectedCountryCode,
                          );
                          if (country) {
                            setPhoneNumber(formatWithMask(text, country.mask));
                          } else {
                            setPhoneNumber(filterPhoneInput(text));
                          }
                        }}
                        maxLength={
                          COUNTRY_OPTIONS.find(
                            (c) => c.code === selectedCountryCode,
                          )?.mask.length
                        }
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setHasCompany(!hasCompany)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        hasCompany && styles.checkboxChecked,
                      ]}
                    >
                      {hasCompany && (
                        <Ionicons name="checkmark" size={16} color="#E25A17" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>I have a company</Text>
                  </TouchableOpacity>
                  {hasCompany && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Company Name <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          errors.companyName && styles.inputError,
                        ]}
                        placeholder="Enter your company name"
                        placeholderTextColor="#999"
                        autoCapitalize="words"
                        value={companyName}
                        onChangeText={(text) => {
                          setCompanyName(
                            capitalizeWords(filterCompanyInput(text)),
                          );
                          if (errors.companyName) {
                            setErrors((prev) => {
                              const { companyName, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                      />
                      {errors.companyName && (
                        <Text style={styles.errorText}>
                          {errors.companyName}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}

            {currentStep === 2 && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Contact Information (Optional)
                  </Text>
                  <View style={styles.sectionUnderline} />
                  <View
                    style={
                      width < 768
                        ? styles.contactFieldsContainerMobile
                        : styles.contactFieldsContainerDesktop
                    }
                  >
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>LINE Account Link</Text>
                      <View style={styles.scannerInputContainer}>
                        <MaterialCommunityIcons
                          name="chat"
                          size={20}
                          color="#00B900"
                          style={{ marginLeft: 12 }}
                        />
                        <TextInput
                          style={styles.scannerInput}
                          placeholder="Enter your LINE Account Link"
                          placeholderTextColor="#999"
                          keyboardType="default"
                          autoComplete="off"
                          value={lineContact}
                          onChangeText={setLineContact}
                        />
                        <TouchableOpacity
                          style={styles.scannerButton}
                          onPress={() => openScanner("line")}
                        >
                          <Ionicons
                            name="qr-code-outline"
                            size={20}
                            color="#E25A17"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Viber</Text>
                      <View style={styles.scannerInputContainer}>
                        <MaterialCommunityIcons
                          name="phone"
                          size={20}
                          color="#7360F2"
                          style={{ marginLeft: 12 }}
                        />
                        <TextInput
                          style={styles.scannerInput}
                          placeholder="Enter your Viber contact"
                          placeholderTextColor="#999"
                          keyboardType="default"
                          autoComplete="off"
                          value={viberContact}
                          onChangeText={setViberContact}
                        />
                        <TouchableOpacity
                          style={styles.scannerButton}
                          onPress={() => openScanner("viber")}
                        >
                          <Ionicons
                            name="qr-code-outline"
                            size={20}
                            color="#E25A17"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WhatsApp</Text>
                      <View style={styles.scannerInputContainer}>
                        <MaterialCommunityIcons
                          name="whatsapp"
                          size={20}
                          color="#25D366"
                          style={{ marginLeft: 12 }}
                        />
                        <TextInput
                          style={styles.scannerInput}
                          placeholder="Enter your WhatsApp contact"
                          placeholderTextColor="#999"
                          keyboardType="default"
                          autoComplete="off"
                          value={whatsappContact}
                          onChangeText={setWhatsappContact}
                        />
                        <TouchableOpacity
                          style={styles.scannerButton}
                          onPress={() => openScanner("whatsapp")}
                        >
                          <Ionicons
                            name="qr-code-outline"
                            size={20}
                            color="#E25A17"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.section, { marginTop: 20 }]}>
                  <Text style={styles.sectionTitle}>Account Type</Text>
                  <View style={styles.sectionUnderline} />
                  <Text style={styles.inputLabel}>
                    Are you an agent or investor?{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => setIsAgent(true)}
                  >
                    <View
                      style={[
                        styles.radio,
                        isAgent === true && styles.radioChecked,
                      ]}
                    >
                      {isAgent === true && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioLabel}>I&apos;m an agent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => setIsAgent(false)}
                  >
                    <View
                      style={[
                        styles.radio,
                        isAgent === false && styles.radioChecked,
                      ]}
                    >
                      {isAgent === false && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioLabel}>I&apos;m an investor</Text>
                  </TouchableOpacity>
                  {errors.isAgent && (
                    <Text style={styles.errorText}>{errors.isAgent}</Text>
                  )}
                  {isAgent !== null && (
                    <View style={styles.agentQRSection}>
                      <View style={styles.agentQRHeader}>
                        <MaterialCommunityIcons
                          name="shield-star"
                          size={24}
                          color="#E25A17"
                        />
                        <Text style={styles.agentQRTitle}>Referral Code</Text>
                      </View>
                      <Text style={styles.agentNumberSubtext}>
                        You will receive your unique referral code after
                        registration. Share it so others can register under you.
                      </Text>
                    </View>
                  )}
                  <View style={[styles.inputGroup, { marginTop: 20 }]}>
                    <Text style={styles.inputLabel}>
                      Referrer&apos;s code (Optional)
                    </Text>
                    <View style={styles.scannerInputContainer}>
                      <TextInput
                        style={styles.scannerInput}
                        placeholder="Enter referrer's code"
                        placeholderTextColor="#999"
                        value={referralCode}
                        onChangeText={(text) =>
                          setReferralCode(text.toUpperCase())
                        }
                        autoCapitalize="characters"
                        maxLength={5}
                      />
                      <TouchableOpacity
                        style={styles.scannerButton}
                        onPress={() => openScanner("referral")}
                      >
                        <Ionicons
                          name="qr-code-outline"
                          size={20}
                          color="#E25A17"
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>
                      Enter your referrer&apos;s code if you were invited by
                      someone.
                    </Text>
                    <Text style={[styles.helperText, { marginTop: 4 }]}>
                      Maximum 5 characters
                    </Text>
                  </View>
                </View>
              </>
            )}

            {currentStep === 3 && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account Credentials</Text>
                  <View style={styles.sectionUnderline} />
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Email Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.emailAddress && styles.inputError,
                      ]}
                      placeholder="your.email@example.com"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={emailAddress}
                      onChangeText={(text) => {
                        setEmailAddress(filterEmailInput(text));
                        if (errors.emailAddress) {
                          setErrors((prev) => {
                            const { emailAddress, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                    {errors.emailAddress && (
                      <Text style={styles.errorText}>
                        {errors.emailAddress}
                      </Text>
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Password <Text style={styles.required}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.passwordContainer,
                        errors.password && styles.inputError,
                      ]}
                    >
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Create a secure password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (errors.password) {
                            setErrors((prev) => {
                              const { password, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Confirm Password <Text style={styles.required}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.passwordContainer,
                        errors.confirmPassword && styles.inputError,
                      ]}
                    >
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Re-enter your password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (errors.confirmPassword) {
                            setErrors((prev) => {
                              const { confirmPassword, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    )}
                    {errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>
                </View>
                {registerError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{registerError}</Text>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                registerLoading && styles.nextButtonDisabled,
              ]}
              onPress={handleNextStep}
              activeOpacity={0.8}
              disabled={registerLoading}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.nextButtonGradient}
              >
                {registerLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {currentStep === 3 ? "Register" : "Next Step"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={isCountryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity
                  onPress={() => setIsCountryModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {COUNTRY_OPTIONS.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={styles.countryOption}
                    onPress={() => {
                      setSelectedCountryCode(country.code);
                      setPhoneNumber(""); // Reset phone number when country changes
                      setIsCountryModalVisible(false);
                    }}
                  >
                    <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                    <Text style={styles.countryOptionLabel}>
                      {country.label}
                    </Text>
                    <Text style={styles.countryOptionCode}>{country.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* QR Scanner Modal */}
        <Modal
          visible={isQRScannerVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsQRScannerVisible(false)}
        >
          <View style={styles.qrScannerContainer}>
            {!permission?.granted ? (
              <View style={styles.qrPermissionContainer}>
                <Ionicons name="camera-outline" size={64} color="#666" />
                <Text style={styles.qrPermissionText}>
                  Camera Access Required
                </Text>
                <Text style={styles.qrPermissionSubText}>
                  Please grant camera permission to scan referral QR codes.
                </Text>
                <TouchableOpacity
                  style={styles.qrCloseButton}
                  onPress={() => setIsQRScannerVisible(false)}
                >
                  <Text style={styles.qrCloseButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={styles.qrCamera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={handleBarCodeScanned}
              >
                <View style={styles.qrOverlay}>
                  <View style={styles.qrTopOverlay}>
                    <Text style={styles.qrInstructionText}>
                      {activeQRField === "referral" &&
                        "Scan Referrer's QR Code"}
                      {activeQRField === "line" && "Scan LINE QR Code"}
                      {activeQRField === "viber" && "Scan Viber QR Code"}
                      {activeQRField === "whatsapp" && "Scan WhatsApp QR Code"}
                    </Text>
                  </View>
                  <View style={styles.qrCenterRow}>
                    <View style={styles.qrSideOverlay} />
                    <View style={styles.qrFrameContainer}>
                      <View style={[styles.qrCorner, styles.qrTopLeft]} />
                      <View style={[styles.qrCorner, styles.qrTopRight]} />
                      <View style={[styles.qrCorner, styles.qrBottomLeft]} />
                      <View style={[styles.qrCorner, styles.qrBottomRight]} />
                    </View>
                    <View style={styles.qrSideOverlay} />
                  </View>
                  <View style={styles.qrBottomOverlay}>
                    <TouchableOpacity
                      style={styles.qrCancelButton}
                      onPress={() => {
                        setIsQRScannerVisible(false);
                        setActiveQRField(null);
                      }}
                    >
                      <Text style={styles.qrCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#E25A17" },
  placeholder: { width: 40 },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E25A17",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: { backgroundColor: "#E25A17" },
  stepLine: { width: 60, height: 2, backgroundColor: "#E0E0E0" },
  stepLineActive: { backgroundColor: "#E25A17" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  infoBannerTextContainer: { flex: 1, marginLeft: 12 },
  infoBannerText: { fontSize: 13, color: "#666", lineHeight: 20 },
  infoBannerBold: { fontWeight: "700", color: "#E25A17" },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sectionUnderline: {
    height: 2,
    backgroundColor: "#E25A17",
    width: 60,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  required: { color: "#E25A17" },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  phoneInputContainer: { flexDirection: "row", gap: 8 },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    gap: 6,
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 14, color: "#333", fontWeight: "500" },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#E25A17",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#FFF5F0" },
  checkboxLabel: { fontSize: 14, color: "#333" },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E25A17",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  radioChecked: { borderColor: "#E25A17" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E25A17",
  },
  radioLabel: { fontSize: 14, color: "#333" },
  searchInputContainer: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  scannerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
  },
  scannerInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  scannerButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  qrButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  helperText: { fontSize: 12, color: "#999", marginTop: 8, lineHeight: 16 },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  eyeButton: { padding: 12 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  nextButton: { borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  nextButtonDisabled: { opacity: 0.7 },
  nextButtonGradient: { paddingVertical: 16, alignItems: "center" },
  nextButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  errorBannerText: { fontSize: 14, color: "#DC2626" },
  termsText: { fontSize: 12, color: "#999", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  countryOptionFlag: { fontSize: 24, marginRight: 12 },
  countryOptionLabel: { flex: 1, fontSize: 14, color: "#333" },
  countryOptionCode: { fontSize: 14, color: "#666", fontWeight: "500" },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalContent: {
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
  successModalGradient: { padding: 32, alignItems: "center" },
  successIconContainer: { marginBottom: 20 },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.95,
  },
  successButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  successButtonText: { fontSize: 16, fontWeight: "700", color: "#E25A17" },
  successButtonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  successButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  qrScannerContainer: { flex: 1, backgroundColor: "#000" },
  qrPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  qrPermissionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
  },
  qrPermissionSubText: {
    color: "#999",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  qrCloseButton: {
    backgroundColor: "#E25A17",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
  },
  qrCloseButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  qrCamera: { flex: 1, width: "100%" },
  qrOverlay: { flex: 1, backgroundColor: "transparent" },
  qrTopOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  qrCenterRow: {
    flexDirection: "row",
    height: Dimensions.get("window").width * 0.7,
  },
  qrSideOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)" },
  qrFrameContainer: {
    width: Dimensions.get("window").width * 0.7,
    height: Dimensions.get("window").width * 0.7,
    position: "relative" as const,
    justifyContent: "center",
    alignItems: "center",
  },
  qrCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#E25A17",
  },
  qrTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  qrTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  qrBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  qrBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  qrBottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  qrInstructionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  qrCancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  qrCancelButtonText: { color: "#E25A17", fontSize: 16, fontWeight: "600" },
  qrScannedOverlay: { alignItems: "center" },
  qrScannedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  agentQRSection: {
    marginTop: 24,
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E25A17",
  },
  agentQRHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  agentQRTitle: { fontSize: 16, fontWeight: "700", color: "#E25A17" },
  agentNumberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  agentNumberLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  agentNumberValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 8,
  },
  agentNumberSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  viewQRButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E25A17",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  viewQRButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  agentQRModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  agentQRModalContent: {
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
  agentQRModalGradient: { padding: 24, alignItems: "center" },
  agentQRCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  agentQRIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  agentQRModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  agentQRModalSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 24,
    textAlign: "center",
  },
  qrCodeContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agentQRInfoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  agentQRInfoLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    marginBottom: 4,
  },
  agentQRInfoValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  agentQRInfoName: { fontSize: 14, color: "#FFFFFF", opacity: 0.9 },
  agentQRShareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  agentQRShareButtonText: { fontSize: 16, fontWeight: "700", color: "#E25A17" },
  agentQRHelpText: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 18,
  },
  contactFieldsContainerMobile: {
    flexDirection: "column",
    gap: 16,
  },
  contactFieldsContainerDesktop: {
    flexDirection: "row",
    gap: 12,
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
