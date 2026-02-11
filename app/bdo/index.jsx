import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, firestore } from "../../configs/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import * as DocumentPicker from "expo-document-picker";

export default function BankAccountServices() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBank, setSelectedBank] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [landlineNumber, setLandlineNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [sourceOfFund, setSourceOfFund] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [passportPhoto, setPassportPhoto] = useState(null);
  const [governmentId, setGovernmentId] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCivilStatusModal, setShowCivilStatusModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const banks = [
    "BDO Unibank",
    "Security Bank",
    "CTBC Bank",
    "UnionBank",
  ];

  const genders = ["Male", "Female", "Other"];
  const civilStatuses = ["Single", "Married", "Divorced", "Widowed"];

  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep === 1 && !selectedBank) {
      setAlertConfig({
        title: "Selection Required",
        message: "Please select your preferred bank"
      });
      setShowAlertModal(true);
      return;
    }

    if (currentStep === 2) {
      if (!emailAddress || !mobileNumber) {
        setAlertConfig({
          title: "Missing Information",
          message: "Please fill in all required fields"
        });
        setShowAlertModal(true);
        return;
      }
    }

    if (currentStep === 3) {
      if (!gender || !dateOfBirth || !civilStatus || !citizenship) {
        setAlertConfig({
          title: "Missing Information",
          message: "Please fill in all required fields"
        });
        setShowAlertModal(true);
        return;
      }
    }

    if (currentStep === 4) {
      if (!completeAddress) {
        setAlertConfig({
          title: "Missing Information",
          message: "Please fill in your complete address"
        });
        setShowAlertModal(true);
        return;
      }
    }

    if (currentStep === 5) {
      if (!sourceOfFund || !grossMonthlyIncome) {
        setAlertConfig({
          title: "Missing Information",
          message: "Please fill in all required fields"
        });
        setShowAlertModal(true);
        return;
      }
    }

    if (currentStep === 6) {
      if (!passportPhoto || !governmentId) {
        setAlertConfig({
          title: "Missing Documents",
          message: "Please upload all required documents"
        });
        setShowAlertModal(true);
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setAlertConfig({
          title: "Error",
          message: "User not authenticated"
        });
        setShowAlertModal(true);
        setIsSubmitting(false);
        return;
      }

      const applicationData = {
        userId: user.uid,
        preferredBank: selectedBank,
        emailAddress: emailAddress,
        mobileNumber: mobileNumber,
        landlineNumber: landlineNumber,
        gender: gender,
        dateOfBirth: dateOfBirth,
        civilStatus: civilStatus,
        citizenship: citizenship,
        completeAddress: completeAddress,
        sourceOfFund: sourceOfFund,
        grossMonthlyIncome: grossMonthlyIncome,
        passportPhoto: passportPhoto?.name || "Uploaded",
        governmentId: governmentId?.name || "Uploaded",
        applicationType: "Bank Account Services",
        status: "Pending",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, "bankApplications"), applicationData);

      setAlertConfig({
        title: "Success",
        message: "Your bank account application has been submitted successfully!"
      });
      setShowAlertModal(true);
      
      setTimeout(() => {
        router.push("/main");
      }, 2000);
    } catch (error) {
      console.error("Error submitting application:", error);
      setAlertConfig({
        title: "Error",
        message: "Failed to submit application. Please try again."
      });
      setShowAlertModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickDocument = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (type === "passport") {
          setPassportPhoto(file);
        } else if (type === "government") {
          setGovernmentId(file);
        }
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
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
            <Ionicons name="arrow-back" size={24} color="#E25A17" />
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
              <Ionicons name="business" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Bank Account Services</Text>
            <Text style={styles.heroSubtitle}>Professional Banking Solutions</Text>
          </LinearGradient>

          {/* Step Indicator */}
          <View style={styles.stepIndicatorContainer}>
            {[1, 2, 3, 4, 5, 6].map((step, index) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.stepCircle,
                    currentStep > step && styles.stepCircleCompleted,
                    currentStep === step && styles.stepCircleActive,
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
                {index < 5 && <View style={styles.stepLine} />}
              </React.Fragment>
            ))}
          </View>

          {/* Content Card - Step 1 */}
          {currentStep === 1 && (
            <View style={styles.contentCard}>
              {/* Icon */}
              <View style={styles.contentIconContainer}>
                <Ionicons name="business-outline" size={32} color="#E25A17" />
              </View>

              {/* Title */}
              <Text style={styles.contentTitle}>Choose Your Bank</Text>
              <Text style={styles.contentDescription}>
                Select your preferred bank for account opening. This will determine
                which banking services and features you'll have access to.
              </Text>

              {/* Bank Selection */}
              <View style={styles.inputSection}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="business" size={18} color="#E25A17" />
                  <Text style={styles.inputLabel}>Preferred Bank</Text>
                </View>

                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowBankModal(true)}
                >
                  <Text style={[styles.dropdownText, !selectedBank && styles.placeholderText]}>
                    {selectedBank || "Choose your preferred bank"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Content Card - Step 2 */}
          {currentStep === 2 && (
            <View style={styles.contentCard}>
              {/* Icon */}
              <View style={styles.contentIconContainer}>
                <Ionicons name="call-outline" size={32} color="#E25A17" />
              </View>

              {/* Title */}
              <Text style={styles.contentTitle}>Contact Information</Text>
              <Text style={styles.contentDescription}>
                Provide your contact details so we can reach you regarding your
                application status and account updates.
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
          )}

          {/* Content Card - Step 3 */}
          {currentStep === 3 && (
            <View style={styles.contentCard}>
              {/* Icon */}
              <View style={styles.contentIconContainer}>
                <Ionicons name="person-outline" size={32} color="#E25A17" />
              </View>

              {/* Title */}
              <Text style={styles.contentTitle}>Personal Details</Text>
              <Text style={styles.contentDescription}>
                Tell us more about yourself. This information helps us verify your
                identity and ensure compliance with banking regulations.
              </Text>

              {/* Gender */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Gender *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowGenderModal(true)}
                >
                  <Text style={[styles.dropdownText, !gender && styles.placeholderText]}>
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
                  <Text style={[styles.dropdownText, !dateOfBirth && styles.placeholderText]}>
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
                  <Text style={[styles.dropdownText, !civilStatus && styles.placeholderText]}>
                    {civilStatus || "Single"}
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
          )}

          {/* Content Card - Step 4 */}
          {currentStep === 4 && (
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
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* Content Card - Step 5 */}
          {currentStep === 5 && (
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
          )}

          {/* Content Card - Step 6 */}
          {currentStep === 6 && (
            <View style={styles.contentCard}>
              {/* Icon */}
              <View style={styles.contentIconContainer}>
                <Ionicons name="document-text-outline" size={32} color="#E25A17" />
              </View>

              {/* Title */}
              <Text style={styles.contentTitle}>Required Documents</Text>
              <Text style={styles.contentDescription}>
                Upload required documents for identity verification and account opening purposes.
              </Text>

              {/* Passport Photo */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Passport Photo *</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument("passport")}
                >
                  <Ionicons name="camera-outline" size={40} color="#E25A17" />
                  <Text style={styles.uploadText}>
                    {passportPhoto ? passportPhoto.name : "Upload Passport"}
                  </Text>
                  <Text style={styles.uploadSubtext}>Tap to select image</Text>
                </TouchableOpacity>
              </View>

              {/* Government ID */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Government ID *</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument("government")}
                >
                  <Ionicons name="card-outline" size={40} color="#E25A17" />
                  <Text style={styles.uploadText}>
                    {governmentId ? governmentId.name : "Upload Government ID"}
                  </Text>
                  <Text style={styles.uploadSubtext}>Driver's License, SSS, etc.</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={20} color="#E25A17" />
            </View>
            <Text style={styles.infoText}>
              By submitting these details, we will send you an email confirmation
              with your application status. Please note that this process will take
              approximately 5-7 working days for review and approval by the selected
              bank.
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
              style={styles.nextButton}
              onPress={handleNext}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.nextGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.nextText}>
                      {currentStep === 6 ? "Submit" : "Next"}
                    </Text>
                    <Ionicons 
                      name={currentStep === 6 ? "checkmark" : "play"} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Bank Selection Modal */}
        <Modal
          visible={showBankModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBankModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Bank</Text>
                <TouchableOpacity onPress={() => setShowBankModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {banks.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[
                      styles.bankOption,
                      selectedBank === bank && styles.bankOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedBank(bank);
                      setShowBankModal(false);
                    }}
                  >
                    <Text style={styles.bankOptionText}>{bank}</Text>
                    {selectedBank === bank && (
                      <Ionicons name="checkmark-circle" size={24} color="#E25A17" />
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
                {genders.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.bankOption,
                      gender === item && styles.bankOptionSelected,
                    ]}
                    onPress={() => {
                      setGender(item);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.bankOptionText}>{item}</Text>
                    {gender === item && (
                      <Ionicons name="checkmark-circle" size={24} color="#E25A17" />
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
                {civilStatuses.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.bankOption,
                      civilStatus === item && styles.bankOptionSelected,
                    ]}
                    onPress={() => {
                      setCivilStatus(item);
                      setShowCivilStatusModal(false);
                    }}
                  >
                    <Text style={styles.bankOptionText}>{item}</Text>
                    {civilStatus === item && (
                      <Ionicons name="checkmark-circle" size={24} color="#E25A17" />
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

        {/* Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}
        >
          <View style={styles.alertOverlay}>
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.alertContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => {
                  setShowAlertModal(false);
                  if (alertConfig.title === "Success") {
                    router.push("/main");
                  }
                }}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </LinearGradient>
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
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
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
    fontSize: 20,
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
    marginBottom: 16,
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
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
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
  nextButton: {
    flex: 1,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  nextText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
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
  bankOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9F9F9",
  },
  bankOptionSelected: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#E25A17",
  },
  bankOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  // Alert Modal Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.95,
  },
  alertButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
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
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  uploadBox: {
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E25A17",
    borderStyle: "dashed",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E25A17",
    marginTop: 12,
    textAlign: "center",
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
});
