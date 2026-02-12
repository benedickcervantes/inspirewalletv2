import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function EWalletAccountOpening() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEWallet, setSelectedEWallet] = useState(null);
  const [showEWalletModal, setShowEWalletModal] = useState(false);
  
  // Step 2 fields
  const [emailAddress, setEmailAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [landlineNumber, setLandlineNumber] = useState("");
  
  // Step 3 fields
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [civilStatus, setCivilStatus] = useState("Single");
  const [citizenship, setCitizenship] = useState("Filipino");
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCivilStatusModal, setShowCivilStatusModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Step 4 fields
  const [completeAddress, setCompleteAddress] = useState("");
  
  // Step 5 fields
  const [sourceOfFund, setSourceOfFund] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");

  const ewalletOptions = ["GCash", "Maya"];
  const genderOptions = ["Male", "Female", "Other"];
  const civilStatusOptions = ["Single", "Married", "Divorced", "Widowed"];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedEWallet) {
        alert("Please select an E-Wallet provider");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!emailAddress || !mobileNumber) {
        alert("Please fill in all required fields");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!gender || !dateOfBirth || !civilStatus || !citizenship) {
        alert("Please fill in all required fields");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!completeAddress) {
        alert("Please fill in your complete address");
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (!sourceOfFund || !grossMonthlyIncome) {
        alert("Please fill in all required fields");
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    alert("Application submitted successfully!");
    // Here you would typically send the data to your backend
    router.back();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#E25A17" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <LinearGradient
            colors={["#E25A17", "#F28934"]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroIconContainer}>
              <Ionicons name="wallet" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>E-Wallet Account Opening</Text>
            <Text style={styles.heroSubtitle}>Digital Banking Made Simple</Text>
          </LinearGradient>

          {/* Step Indicator */}
          <View style={styles.stepIndicatorContainer}>
            {[1, 2, 3, 4, 5].map((step, index) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.stepCircle,
                    currentStep >= step && styles.stepCircleActive,
                    currentStep > step && styles.stepCircleCompleted,
                  ]}
                >
                  {currentStep > step ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        currentStep >= step && styles.stepNumberActive,
                      ]}
                    >
                      {step}
                    </Text>
                  )}
                </View>
                {index < 4 && <View style={styles.stepLine} />}
              </React.Fragment>
            ))}
          </View>

          {/* Step 1: E-Wallet Selection */}
          {currentStep === 1 && (
            <>
              {/* Content Card */}
              <View style={styles.contentCard}>
                {/* Icon */}
                <View style={styles.contentIconContainer}>
                  <Ionicons name="wallet-outline" size={32} color="#E25A17" />
                </View>

                {/* Title */}
                <Text style={styles.contentTitle}>Choose Your E-Wallet Provider</Text>
                <Text style={styles.contentDescription}>
                  This will be determine which digital banking services you'll have access to.
                </Text>

                {/* E-Wallet Selection */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Select E-Wallet type</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowEWalletModal(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !selectedEWallet && styles.placeholderText,
                      ]}
                    >
                      {selectedEWallet || "Select your preferred E-Wallet"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#E25A17" />
                </View>
                <Text style={styles.infoText}>
                  By submitting these details, we will send you an email confirmation
                  with you application status. Please note that this process will take
                  approximately 5-7 working days for review and approval.
                </Text>
              </View>

              {/* Next Button */}
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={styles.nextGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextText}>Next</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <>
              {/* Content Card */}
              <View style={styles.contentCard}>
                {/* Icon */}
                <View style={styles.contentIconContainer}>
                  <Ionicons name="call-outline" size={32} color="#E25A17" />
                </View>

                {/* Title */}
                <Text style={styles.contentTitle}>Contact Information</Text>
                <Text style={styles.contentDescription}>
                  Provide your contact details so we can reach you regarding your application status and account updates.
                </Text>

                {/* Email Address */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#CCC"
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Mobile Number */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Mobile Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+63 9XX XXX XXXX"
                    placeholderTextColor="#CCC"
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Landline Number */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Landline Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(02) XXXX XXXX"
                    placeholderTextColor="#CCC"
                    value={landlineNumber}
                    onChangeText={setLandlineNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#E25A17" />
                </View>
                <Text style={styles.infoText}>
                  By submitting these details, we will send you an email confirmation
                  with you application status. Please note that this process will take
                  approximately 5-7 working days for review and approval.
                </Text>
              </View>

              {/* Navigation Buttons */}
              <View style={styles.navigationContainer}>
                <TouchableOpacity
                  style={styles.backButton2}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextButton2}
                  onPress={handleNext}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.nextText}>Next</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: Personal Details */}
          {currentStep === 3 && (
            <>
              {/* Content Card */}
              <View style={styles.contentCard}>
                {/* Icon */}
                <View style={styles.contentIconContainer}>
                  <Ionicons name="person-outline" size={32} color="#E25A17" />
                </View>

                {/* Title */}
                <Text style={styles.contentTitle}>Personal Details</Text>
                <Text style={styles.contentDescription}>
                  Tell us about yourself. This information is required for identity verification and compliance purposes.
                </Text>

                {/* Gender */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Gender *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowGenderModal(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !gender && styles.placeholderText,
                      ]}
                    >
                      {gender || "Select your gender"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Date of Birth */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Date of Birth *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !dateOfBirth && styles.placeholderText,
                      ]}
                    >
                      {dateOfBirth || "Select your birthdate"}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Civil Status */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Civil Status *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowCivilStatusModal(true)}
                  >
                    <Text style={styles.dropdownText}>
                      {civilStatus}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Citizenship */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Citizenship *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Filipino"
                    placeholderTextColor="#CCC"
                    value={citizenship}
                    onChangeText={setCitizenship}
                  />
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#E25A17" />
                </View>
                <Text style={styles.infoText}>
                  By submitting these details, we will send you an email confirmation
                  with you application status. Please note that this process will take
                  approximately 5-7 working days for review and approval.
                </Text>
              </View>

              {/* Navigation Buttons */}
              <View style={styles.navigationContainer}>
                <TouchableOpacity
                  style={styles.backButton2}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextButton2}
                  onPress={handleNext}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.nextText}>Next</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 4: Address Information */}
          {currentStep === 4 && (
            <>
              {/* Content Card */}
              <View style={styles.contentCard}>
                {/* Icon */}
                <View style={styles.contentIconContainer}>
                  <Ionicons name="location-outline" size={32} color="#E25A17" />
                </View>

                {/* Title */}
                <Text style={styles.contentTitle}>Address Information</Text>
                <Text style={styles.contentDescription}>
                  Provide your complete address for verification and account setup purposes.
                </Text>

                {/* Complete Address */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Complete Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="House/Unit No., Street, Barangay, City, Province, ZIP Code"
                    placeholderTextColor="#CCC"
                    value={completeAddress}
                    onChangeText={setCompleteAddress}
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#E25A17" />
                </View>
                <Text style={styles.infoText}>
                  By submitting these details, we will send you an email confirmation
                  with you application status. Please note that this process will take
                  approximately 5-7 working days for review and approval.
                </Text>
              </View>

              {/* Navigation Buttons */}
              <View style={styles.navigationContainer}>
                <TouchableOpacity
                  style={styles.backButton2}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextButton2}
                  onPress={handleNext}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.nextText}>Next</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 5: Financial Information */}
          {currentStep === 5 && (
            <>
              {/* Content Card */}
              <View style={styles.contentCard}>
                {/* Icon */}
                <View style={styles.contentIconContainer}>
                  <Ionicons name="wallet-outline" size={32} color="#E25A17" />
                </View>

                {/* Title */}
                <Text style={styles.contentTitle}>Financial Information</Text>
                <Text style={styles.contentDescription}>
                  Share your financial details to help us understand your banking needs and ensure compliance.
                </Text>

                {/* Source of Fund */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Source of Fund *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Employment, Business, Investment etc."
                    placeholderTextColor="#CCC"
                    value={sourceOfFund}
                    onChangeText={setSourceOfFund}
                  />
                </View>

                {/* Gross Monthly Income */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Gross Monthly Income *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₱"
                    placeholderTextColor="#CCC"
                    value={grossMonthlyIncome}
                    onChangeText={setGrossMonthlyIncome}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#E25A17" />
                </View>
                <Text style={styles.infoText}>
                  By submitting these details, we will send you an email confirmation
                  with you application status. Please note that this process will take
                  approximately 5-7 working days for review and approval.
                </Text>
              </View>

              {/* Navigation Buttons */}
              <View style={styles.navigationContainer}>
                <TouchableOpacity
                  style={styles.backButton2}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextButton2}
                  onPress={handleNext}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.nextText}>Submit</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* E-Wallet Selection Modal */}
        <Modal
          visible={showEWalletModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEWalletModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select E-Wallet</Text>
                <TouchableOpacity onPress={() => setShowEWalletModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {ewalletOptions.map((ewallet) => (
                  <TouchableOpacity
                    key={ewallet}
                    style={[
                      styles.modalOption,
                      selectedEWallet === ewallet && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedEWallet(ewallet);
                      setShowEWalletModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{ewallet}</Text>
                    {selectedEWallet === ewallet && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#E25A17"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Gender Selection Modal */}
        <Modal
          visible={showGenderModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowGenderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {genderOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.modalOption,
                      gender === item && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setGender(item);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{item}</Text>
                    {gender === item && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#E25A17"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Civil Status Selection Modal */}
        <Modal
          visible={showCivilStatusModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCivilStatusModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Civil Status</Text>
                <TouchableOpacity onPress={() => setShowCivilStatusModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {civilStatusOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.modalOption,
                      civilStatus === item && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setCivilStatus(item);
                      setShowCivilStatusModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{item}</Text>
                    {civilStatus === item && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#E25A17"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#999"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
                <TouchableOpacity
                  style={styles.dateConfirmButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <LinearGradient
                    colors={["#E25A17", "#F28934"]}
                    style={styles.dateConfirmGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.dateConfirmText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
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
    padding: 20,
  },
  heroCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: "#E25A17",
  },
  stepCircleCompleted: {
    backgroundColor: "#4CAF50",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  inputSection: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  infoIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  nextButton: {
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  nextText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  navigationContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  backButton2: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E25A17",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E25A17",
  },
  nextButton2: {
    flex: 1,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  bottomPadding: {
    height: 20,
  },
  // Modal Styles
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
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9F9F9",
  },
  modalOptionSelected: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E25A17",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  datePickerContent: {
    padding: 20,
  },
  dateInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  dateConfirmButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  dateConfirmGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  dateConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
