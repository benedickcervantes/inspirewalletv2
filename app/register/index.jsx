import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Alert,
  Share,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, Camera } from "expo-camera";
import QRCode from "react-native-qrcode-svg";

const { width } = Dimensions.get("window");

const COUNTRY_OPTIONS = [
  { code: "+63", label: "Philippines", flag: "🇵🇭" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+82", label: "Korea", flag: "🇰🇷" },
  { code: "+1", label: "United States", flag: "🇺🇸" },
];

export default function Register() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form fields - Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  
  // Form fields - Step 2
  const [lineAccountLink, setLineAccountLink] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+63");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isAgent, setIsAgent] = useState(null); // null, true, or false
  const [agentReferral, setAgentReferral] = useState("");
  
  // Form fields - Step 3
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  
  // QR Scanner states
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  
  // Agent QR Code states
  const [showAgentQRCode, setShowAgentQRCode] = useState(false);
  const [agentNumber, setAgentNumber] = useState("");
  const qrCodeRef = useRef(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    getCameraPermissions();
  }, []);
  
  // Generate agent number when user selects "Yes, I'm an agent"
  useEffect(() => {
    if (isAgent === true && !agentNumber) {
      // Generate a unique agent number (you can customize this logic)
      const generatedNumber = `AG${Date.now().toString().slice(-8)}`;
      setAgentNumber(generatedNumber);
    }
  }, [isAgent]);

  const handleQRScan = () => {
    if (hasPermission === false) {
      Alert.alert(
        "Camera Permission Required",
        "Please grant camera permissions in your device settings to scan QR codes.",
        [{ text: "OK" }]
      );
      return;
    }
    setScanned(false);
    setShowQRScanner(true);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    
    try {
      // Parse the QR code data
      const qrData = JSON.parse(data);
      
      if (qrData.type === "inspire_agent_referral" && qrData.agentNumber) {
        // Set the agent referral number
        setAgentReferral(qrData.agentNumber);
        setShowQRScanner(false);
        Alert.alert(
          "Agent Found!",
          `Agent ${qrData.agentName || qrData.agentNumber} has been added as your referral.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Invalid QR Code",
          "This QR code is not a valid Inspire agent referral code.",
          [
            { text: "Cancel", onPress: () => setShowQRScanner(false) },
            { text: "Scan Again", onPress: () => setScanned(false) }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        "Invalid QR Code",
        "Unable to read QR code data. Please try again.",
        [
          { text: "Cancel", onPress: () => setShowQRScanner(false) },
          { text: "Scan Again", onPress: () => setScanned(false) }
        ]
      );
    }
  };
  
  const handleShareQRCode = async () => {
    try {
      // Get QR code as data URL
      if (qrCodeRef.current) {
        qrCodeRef.current.toDataURL(async (dataURL) => {
          try {
            await Share.share({
              message: `Join Inspire Wallet with my referral!\n\nAgent Number: ${agentNumber}\n\nScan my QR code or enter my agent number during registration.`,
              title: "Inspire Wallet Agent Referral",
            });
          } catch (error) {
            console.error("Error sharing:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code. Please try again.");
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Step 1 validation
      if (!firstName.trim()) {
        alert("Please enter your first name");
        return;
      }
      if (!lastName.trim()) {
        alert("Please enter your last name");
        return;
      }
      if (hasCompany && !companyName.trim()) {
        alert("Please enter your company name");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Step 2 validation
      if (!lineAccountLink.trim()) {
        alert("Please enter your LINE account link");
        return;
      }
      if (!phoneNumber.trim()) {
        alert("Please enter your contact number");
        return;
      }
      if (isAgent === null) {
        alert("Please select if you are an agent or investor");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Step 3 validation
      if (!emailAddress.trim()) {
        alert("Please enter your email address");
        return;
      }
      if (!password.trim()) {
        alert("Please enter a password");
        return;
      }
      if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      // Handle registration
      handleRegister();
    }
  };

  const handleRegister = () => {
    console.log("Registration data:", {
      firstName,
      lastName,
      hasCompany,
      companyName,
      lineAccountLink,
      phoneNumber: selectedCountryCode + phoneNumber,
      isAgent,
      agentReferral,
      emailAddress,
      password,
    });
    // Add your registration logic here
    setShowSuccessModal(true);
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackStep}
            >
              <Ionicons name="arrow-back" size={24} color="#E25A17" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account Registration</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                {currentStep > 1 ? (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                ) : (
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                )}
              </View>
              <View style={[styles.stepLine, currentStep > 1 && styles.stepLineActive]} />
            </View>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= 2 && styles.stepActive]}>
                {currentStep > 2 ? (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                ) : (
                  <Ionicons name="call" size={20} color={currentStep >= 2 ? "#FFFFFF" : "#E25A17"} />
                )}
              </View>
              <View style={[styles.stepLine, currentStep > 2 && styles.stepLineActive]} />
            </View>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= 3 && styles.stepActive]}>
                <Ionicons name="lock-closed" size={20} color={currentStep >= 3 ? "#FFFFFF" : "#E25A17"} />
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {currentStep === 1 && (
              <>
                {/* Welcome Message */}
                <Text style={styles.welcomeText}>Welcome Investor!</Text>

                {/* Info Banner */}
                <View style={styles.infoBanner}>
                  <MaterialCommunityIcons name="office-building" size={24} color="#E25A17" />
                  <View style={styles.infoBannerTextContainer}>
                    <Text style={styles.infoBannerText}>
                      Start your investment journey with <Text style={styles.infoBannerBold}>Inspire Wallet.</Text>
                    </Text>
                    <Text style={styles.infoBannerText}>
                      Complete your profile to unlock all features.
                    </Text>
                  </View>
                </View>

                {/* Personal Information Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <View style={styles.sectionUnderline} />

                  {/* First Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      First Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. John"
                      placeholderTextColor="#999"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>

                  {/* Last Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Last Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Doe"
                      placeholderTextColor="#999"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>

                  {/* Phone Number */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.phoneInputContainer}>
                      <TouchableOpacity
                        style={styles.countrySelector}
                        onPress={() => setIsCountryModalVisible(true)}
                      >
                        <Text style={styles.countryFlag}>
                          {COUNTRY_OPTIONS.find(c => c.code === selectedCountryCode)?.flag}
                        </Text>
                        <Text style={styles.countryCode}>{selectedCountryCode}</Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="e.g. 555 123 4567"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                      />
                    </View>
                  </View>

                  {/* Company Checkbox */}
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setHasCompany(!hasCompany)}
                  >
                    <View style={[styles.checkbox, hasCompany && styles.checkboxChecked]}>
                      {hasCompany && <Ionicons name="checkmark" size={16} color="#E25A17" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I have a company</Text>
                  </TouchableOpacity>

                  {/* Company Name (conditional) */}
                  {hasCompany && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Company Name <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your company name"
                        placeholderTextColor="#999"
                        value={companyName}
                        onChangeText={setCompanyName}
                      />
                    </View>
                  )}
                </View>
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* Contact Information Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <View style={styles.sectionUnderline} />

                  {/* LINE Account Link */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      LINE Account Link <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. John"
                      placeholderTextColor="#999"
                      value={lineAccountLink}
                      onChangeText={setLineAccountLink}
                    />
                  </View>

                  {/* Contact Number */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Contact Number <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.phoneInputContainer}>
                      <TouchableOpacity
                        style={styles.countrySelector}
                        onPress={() => setIsCountryModalVisible(true)}
                      >
                        <Text style={styles.countryFlag}>
                          {COUNTRY_OPTIONS.find(c => c.code === selectedCountryCode)?.flag}
                        </Text>
                        <Text style={styles.countryCode}>{selectedCountryCode}</Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="e.g. 555 123 4567"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                      />
                    </View>
                  </View>
                </View>

                {/* Account Type Section */}
                <View style={[styles.section, { marginTop: 20 }]}>
                  <Text style={styles.sectionTitle}>Account Type</Text>
                  <View style={styles.sectionUnderline} />

                  {/* Are you an agent? */}
                  <Text style={styles.inputLabel}>
                    Are you an agent? <Text style={styles.required}>*</Text>
                  </Text>

                  <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => setIsAgent(true)}
                  >
                    <View style={[styles.radio, isAgent === true && styles.radioChecked]}>
                      {isAgent === true && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioLabel}>Yes, I'm an agent</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => setIsAgent(false)}
                  >
                    <View style={[styles.radio, isAgent === false && styles.radioChecked]}>
                      {isAgent === false && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioLabel}>No, I'm an investor</Text>
                  </TouchableOpacity>

                  {/* Agent QR Code Section */}
                  {isAgent === true && agentNumber && (
                    <View style={styles.agentQRSection}>
                      <View style={styles.agentQRHeader}>
                        <MaterialCommunityIcons name="shield-star" size={24} color="#E25A17" />
                        <Text style={styles.agentQRTitle}>Your Agent Code</Text>
                      </View>
                      
                      <View style={styles.agentNumberCard}>
                        <Text style={styles.agentNumberLabel}>Agent Number</Text>
                        <Text style={styles.agentNumberValue}>{agentNumber}</Text>
                        <Text style={styles.agentNumberSubtext}>
                          Share this code with investors to earn referral rewards
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.viewQRButton}
                        onPress={() => setShowAgentQRCode(true)}
                      >
                        <MaterialCommunityIcons name="qrcode" size={20} color="#FFFFFF" />
                        <Text style={styles.viewQRButtonText}>View QR Code</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Agent Referral (Optional) */}
                  <View style={[styles.inputGroup, { marginTop: 20 }]}>
                    <Text style={styles.inputLabel}>
                      Search your Agent Referral (Optional)
                    </Text>
                    <View style={styles.searchInputContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter exact agent number..."
                        placeholderTextColor="#999"
                        value={agentReferral}
                        onChangeText={setAgentReferral}
                      />
                      <TouchableOpacity 
                        style={styles.qrButton}
                        onPress={handleQRScan}
                      >
                        <MaterialCommunityIcons name="qrcode-scan" size={24} color="#E25A17" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>
                      Enter the exact agent number or scan QR code to automatically find and select the agent.
                    </Text>
                  </View>
                </View>
              </>
            )}

            {currentStep === 3 && (
              <>
                {/* Account Credentials Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account Credentials</Text>
                  <View style={styles.sectionUnderline} />

                  {/* Email Address */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Email Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@example.com"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Password <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Create a secure password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
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

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Confirm Password <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Re-enter your password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Next Step Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextStep}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === 3 ? "Register" : "Next Step"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </KeyboardAvoidingView>

        {/* Country Selector Modal */}
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
                <TouchableOpacity onPress={() => setIsCountryModalVisible(false)}>
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
                      setIsCountryModalVisible(false);
                    }}
                  >
                    <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                    <Text style={styles.countryOptionLabel}>{country.label}</Text>
                    <Text style={styles.countryOptionCode}>{country.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowSuccessModal(false);
            router.push("/main");
          }}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.successModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={80} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Registration Successful!</Text>
                <Text style={styles.successMessage}>
                  Your account has been created successfully. Welcome to Inspire!
                </Text>
                <TouchableOpacity
                  style={styles.successButton}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push("/main");
                  }}
                >
                  <Text style={styles.successButtonText}>Continue</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* QR Scanner Modal */}
        <Modal
          visible={showQRScanner}
          animationType="slide"
          onRequestClose={() => setShowQRScanner(false)}
        >
          <View style={styles.qrScannerContainer}>
            {hasPermission === null ? (
              <View style={styles.qrPermissionContainer}>
                <Text style={styles.qrPermissionText}>Requesting camera permission...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.qrPermissionContainer}>
                <Ionicons name="camera-off" size={64} color="#999" />
                <Text style={styles.qrPermissionText}>No access to camera</Text>
                <Text style={styles.qrPermissionSubText}>
                  Please grant camera permissions in your device settings to scan QR codes.
                </Text>
                <TouchableOpacity
                  style={styles.qrCloseButton}
                  onPress={() => setShowQRScanner(false)}
                >
                  <Text style={styles.qrCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={styles.qrCamera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
              >
                <View style={styles.qrOverlay}>
                  {/* Top overlay */}
                  <View style={styles.qrTopOverlay}>
                    <Text style={styles.qrInstructionText}>
                      Position the agent's QR code within the frame
                    </Text>
                  </View>

                  {/* Center frame */}
                  <View style={styles.qrCenterRow}>
                    <View style={styles.qrSideOverlay} />
                    <View style={styles.qrFrameContainer}>
                      {/* Corner brackets */}
                      <View style={[styles.qrCorner, styles.qrTopLeft]} />
                      <View style={[styles.qrCorner, styles.qrTopRight]} />
                      <View style={[styles.qrCorner, styles.qrBottomLeft]} />
                      <View style={[styles.qrCorner, styles.qrBottomRight]} />

                      {scanned && (
                        <View style={styles.qrScannedOverlay}>
                          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                          <Text style={styles.qrScannedText}>QR Code Scanned!</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.qrSideOverlay} />
                  </View>

                  {/* Bottom overlay */}
                  <View style={styles.qrBottomOverlay}>
                    <TouchableOpacity
                      style={styles.qrCancelButton}
                      onPress={() => setShowQRScanner(false)}
                    >
                      <Text style={styles.qrCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>
            )}
          </View>
        </Modal>

        {/* Agent QR Code Display Modal */}
        <Modal
          visible={showAgentQRCode}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAgentQRCode(false)}
        >
          <View style={styles.agentQRModalOverlay}>
            <View style={styles.agentQRModalContent}>
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.agentQRModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity
                  style={styles.agentQRCloseButton}
                  onPress={() => setShowAgentQRCode(false)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.agentQRIconContainer}>
                  <MaterialCommunityIcons name="shield-star" size={40} color="#FFFFFF" />
                </View>

                <Text style={styles.agentQRModalTitle}>Your Agent QR Code</Text>
                <Text style={styles.agentQRModalSubtitle}>
                  Share this code with investors
                </Text>

                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={JSON.stringify({
                      type: "inspire_agent_referral",
                      agentNumber: agentNumber,
                      agentName: `${firstName} ${lastName}`.trim() || agentNumber,
                    })}
                    size={200}
                    backgroundColor="white"
                    color="#E25A17"
                    getRef={(ref) => (qrCodeRef.current = ref)}
                  />
                </View>

                <View style={styles.agentQRInfoCard}>
                  <Text style={styles.agentQRInfoLabel}>Agent Number</Text>
                  <Text style={styles.agentQRInfoValue}>{agentNumber}</Text>
                  <Text style={styles.agentQRInfoName}>
                    {`${firstName} ${lastName}`.trim() || "Agent"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.agentQRShareButton}
                  onPress={handleShareQRCode}
                >
                  <Ionicons name="share-social" size={20} color="#E25A17" />
                  <Text style={styles.agentQRShareButtonText}>Share QR Code</Text>
                </TouchableOpacity>

                <Text style={styles.agentQRHelpText}>
                  Investors can scan this QR code during registration to add you as their referral agent.
                </Text>
              </LinearGradient>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  keyboardView: {
    flex: 1,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#E25A17",
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  stepActive: {
    backgroundColor: "#E25A17",
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: "#E0E0E0",
  },
  stepLineActive: {
    backgroundColor: "#E25A17",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
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
  infoBannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  infoBannerBold: {
    fontWeight: "700",
    color: "#E25A17",
  },
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E25A17",
  },
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
  phoneInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
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
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
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
  checkboxChecked: {
    backgroundColor: "#FFF5F0",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
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
  radioChecked: {
    borderColor: "#E25A17",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E25A17",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  searchInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
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
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    lineHeight: 16,
  },
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
  eyeButton: {
    padding: 12,
  },
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
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  termsText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
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
    fontWeight: "600",
    color: "#333",
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  countryOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryOptionLabel: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  countryOptionCode: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  // Success Modal Styles
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
  successModalGradient: {
    padding: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 20,
  },
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
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  // QR Scanner Styles
  qrScannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
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
  qrCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  qrCamera: {
    flex: 1,
    width: "100%",
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  qrTopOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  qrCenterRow: {
    flexDirection: "row",
    height: width * 0.7,
  },
  qrSideOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  qrFrameContainer: {
    width: width * 0.7,
    height: width * 0.7,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  qrCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#E25A17",
  },
  qrTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  qrTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
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
  qrCancelButtonText: {
    color: "#E25A17",
    fontSize: 16,
    fontWeight: "600",
  },
  qrScannedOverlay: {
    alignItems: "center",
  },
  qrScannedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  // Agent QR Code Styles
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
  agentQRTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  agentNumberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  agentNumberLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
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
  viewQRButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Agent QR Modal Styles
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
  agentQRModalGradient: {
    padding: 24,
    alignItems: "center",
  },
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
  agentQRInfoName: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
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
  agentQRShareButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  agentQRHelpText: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 18,
  },
});
