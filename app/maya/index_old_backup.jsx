import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  useRef,
} from "react-native";
import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { getFirestore, doc, getDoc, addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../../constants/Colors";
import EwalletApplicationLoadingScreen from "../../components/EwalletApplicationLoadingScreen";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

export default function Index() {
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({ firstName: "", lastName: "", timeDepositAmount: 0 });
  const [open, setOpen] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [openCivilStatus, setOpenCivilStatus] = useState(false);
  const [openEwalletType, setOpenEwalletType] = useState(false);
  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(false); // Set initial loading to false
  const [submitting, setSubmitting] = useState(false); // New state for form submission
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [placeholderDate, setPlaceHolderDate] = useState(
    "Select your birthdate"
  );
  const [userLanguage, setUserLanguage] = useState("english");
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  
  // Step-by-step procedure states
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepErrors, setStepErrors] = useState({});

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
          setPlaceHolderDate(t(data.preferredLanguage || "english", "maya.content.selectBirthdate"));
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;

    // On Android, always close the picker after selection
    if (Platform.OS === "android") {
      setShow(false);
    }

    // Only update the date if user didn't cancel
    if (event.type === "set" && selectedDate) {
      setDate(currentDate);
      setPlaceHolderDate(currentDate.toLocaleDateString());
    }

    // On iOS, the picker dismisses automatically, but we still need to handle the event
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShow(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "maya.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    try {
      await fetchUserLanguage();
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        setLoading(false);
        showModal({
          title: t(userLanguage, "maya.modals.accessRestricted.title"),
          message: t(userLanguage, "maya.modals.accessRestricted.message").replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            navigation.goBack();
          }
        });
        return;
      }
      
      await fetchUserData();
    } catch (error) {
      console.error("Error checking account access:", error);
      setLoading(false);
      showModal({
        title: t(userLanguage, "maya.modals.error.title"),
        message: t(userLanguage, "maya.modals.error.message"),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        }
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser; // Get the currently signed-in user
      if (user) {
        const userDocRef = doc(db, "users", user.uid); // Reference to user's document
        const userDocSnap = await getDoc(userDocRef); // Fetch user document

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const timeDepositAmount = parseFloat(data.timeDepositAmount || 0);
          
          setUserData({
            firstName: data.firstName,
            lastName: data.lastName,
            timeDepositAmount: timeDepositAmount
          });

          // If timeDepositAmount is below 200,000, show warning and redirect
          if (timeDepositAmount < 200000) {
            showModal({
              title: t(userLanguage, "maya.modals.timeDepositInsufficient.title"),
              message: t(userLanguage, "maya.modals.timeDepositInsufficient.message").replace("{amount}", timeDepositAmount.toLocaleString()),
              type: "warning",
              onConfirm: () => {
                navigation.goBack();
              }
            });
          }
        } else {
          console.log("No such document!");
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showModal({
        title: t(userLanguage, "maya.modals.dataError.title"),
        message: t(userLanguage, "maya.modals.dataError.message"),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const [emailAddress, setEmailAddress] = useState();
  const [mobileNumber, setMobileNumber] = useState();
  const [landlineNumber, setLandlineNumber] = useState();
  const [address, setAddress] = useState();
  const [sourceFund, setSourceFund] = useState();
  const [grossIncome, setGrossIncome] = useState(0);
  const [gender, setGender] = useState();
  const [civilStatus, setCivilStatus] = useState("Single");
  const [citizenShip, setCitizenShip] = useState("Filipino");
  const [ewalletType, setEwalletType] = useState();

  // Step validation functions
  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1: // E-Wallet Selection
        if (!ewalletType) {
          errors.ewalletType = t(userLanguage, "maya.validation.selectEwallet");
        }
        break;
      case 2: // Contact Information
        if (!emailAddress) errors.emailAddress = t(userLanguage, "maya.validation.emailRequired");
        if (!mobileNumber) errors.mobileNumber = t(userLanguage, "maya.validation.mobileRequired");
        break;
      case 3: // Personal Details
        if (!gender) errors.gender = t(userLanguage, "maya.validation.genderRequired");
        if (placeholderDate === t(userLanguage, "maya.content.selectBirthdate")) {
          errors.birthdate = t(userLanguage, "maya.validation.birthdateRequired");
        }
        if (!civilStatus) errors.civilStatus = t(userLanguage, "maya.validation.civilStatusRequired");
        if (!citizenShip) errors.citizenship = t(userLanguage, "maya.validation.citizenshipRequired");
        break;
      case 4: // Address Information
        if (!address) errors.address = t(userLanguage, "maya.validation.addressRequired");
        break;
      case 5: // Financial Information
        if (!sourceFund) errors.sourceFund = t(userLanguage, "maya.validation.sourceFundRequired");
        if (!grossIncome || grossIncome <= 0) errors.grossIncome = t(userLanguage, "maya.validation.incomeRequired");
        break;
    }
    
    setStepErrors(prev => ({ ...prev, [step]: errors }));
    return Object.keys(errors).length === 0;
  };

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        onSubmit();
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step);
    }
  };

  const onSubmit = async () => {
    if (
      !emailAddress ||
      !mobileNumber ||
      !address ||
      !sourceFund ||
      !grossIncome ||
      !citizenShip ||
      !ewalletType
    ) {
      showModal({
        title: t(userLanguage, "maya.modals.missingInformation.title"),
        message: t(userLanguage, "maya.modals.missingInformation.message"),
        type: "warning",
      });
      return; // Exit the function if validation fails
    }

    setSubmitting(true); // Start submitting
    try {
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: t(userLanguage, "maya.modals.authenticationError.title"),
          message: t(userLanguage, "maya.modals.authenticationError.message"),
          type: "error",
        });
        return;
      }

      // Prepare application data for Firebase
      const applicationData = {
        // User information
        userId: user.uid,
        userName: `${userData.firstName} ${userData.lastName}`,
        userEmail: user.email,
        
        // Contact information
        emailAddress: emailAddress,
        mobileNumber: mobileNumber,
        landlineNumber: landlineNumber || "",
        
        // Personal details
        gender: gender || "",
        birthdate: date,
        civilStatus: civilStatus,
        citizenship: citizenShip,
        
        // E-Wallet information
        ewalletType: ewalletType,
        
        // Address information
        address: address,
        
        // Financial information
        sourceOfFund: sourceFund,
        grossMonthlyIncome: parseFloat(grossIncome) || 0,
        
        // Application metadata
        applicationType: `${ewalletType} Account Opening`,
        status: "Pending",
        submittedAt: new Date(),
        processedAt: null,
        
        // Additional fields
        notes: "",
        approvedBy: "",
        approvedAt: null,
      };

      // Save to Firebase - Create a new document in the 'ewalletApplications' collection
      const applicationRef = await addDoc(
        collection(db, "mayaApplications"),
        applicationData
      );

      console.log("✅ Application saved to Firebase with ID:", applicationRef.id);

      // Also save to user's personal applications subcollection
      const userApplicationRef = await addDoc(
        collection(db, "users", user.uid, "applications"),
        {
          ...applicationData,
          applicationId: applicationRef.id,
          applicationType: `${ewalletType} Account Opening`,
        }
      );

      console.log("✅ Application saved to user's personal collection with ID:", userApplicationRef.id);

      // Send email notification
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          emailAddress,
          message: `Name: ${userData.firstName} ${userData.lastName}\nEmail Address: ${emailAddress}\nLandline Number: ${landlineNumber}\nGender: ${gender}\nBirthdate: ${date}\nAddress: ${address}\nSource of Fund: ${sourceFund}\nGross Monthly Income: ${grossIncome}\nCivil Status: ${civilStatus}\nCitizenship: ${citizenShip}\nE-Wallet Type: ${ewalletType}\nType: ${ewalletType} Account Opening`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      console.log("✅ Email notification sent successfully!");

       showModal({
         title: t(userLanguage, "maya.modals.applicationSubmitted.title"),
         message: t(userLanguage, "maya.modals.applicationSubmitted.message").replace("{ewalletType}", ewalletType).replace("{applicationId}", applicationRef.id),
         type: "success",
         onConfirm: () => {
           // Reset form after successful submission
           setEmailAddress("");
           setMobileNumber("");
           setLandlineNumber("");
           setAddress("");
           setSourceFund("");
           setGrossIncome(0);
           setGender(null);
           setCivilStatus("Single");
           setCitizenShip("Filipino");
           setEwalletType(null);
           setDate(new Date());
           setPlaceHolderDate(t(userLanguage, "maya.content.selectBirthdate"));
           setCurrentStep(1);
           setCompletedSteps(new Set());
           setStepErrors({});
         }
       });

    } catch (err) {
      console.error("Error submitting application:", err);
      
      if (err instanceof EmailJSResponseStatus) {
        console.log("EmailJS Request Failed...", err);
        showModal({
          title: t(userLanguage, "maya.modals.partialSuccess.title"),
          message: t(userLanguage, "maya.modals.partialSuccess.message"),
          type: "warning",
        });
      } else {
        showModal({
          title: t(userLanguage, "maya.modals.submissionFailed.title"),
          message: t(userLanguage, "maya.modals.submissionFailed.message").replace("{error}", err.message),
          type: "error",
        });
      }
    } finally {
      setSubmitting(false); // Stop submitting
    }
  };

  if (submitting) {
    return <EwalletApplicationLoadingScreen message="Processing your e-wallet application..." />;
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View key={step} style={styles.stepIndicatorWrapper}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            completedSteps.has(step) && styles.stepCircleCompleted
          ]}>
            {completedSteps.has(step) ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive
              ]}>{step}</Text>
            )}
          </View>
          {step < 5 && (
            <View style={[
              styles.stepLine,
              completedSteps.has(step) && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="wallet-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.ewalletSelection.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.ewalletSelection.description")}
              </Text>
            </View>

            {/* E-Wallet Selection Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="wallet" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.selectEwalletProvider")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalSelector, stepErrors[1]?.ewalletType && styles.inputError]}
                onPress={() => setOpenEwalletType(true)}
              >
                <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                  {ewalletType || t(userLanguage, "maya.content.selectPreferredEwallet")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {stepErrors[1]?.ewalletType && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[1].ewalletType}
                </Text>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                Choose your preferred e-wallet provider for account opening
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="call-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.contactInfo.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.contactInfo.description")}
              </Text>
            </View>

            {/* Contact Information Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="mail" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.emailAddress")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[2]?.emailAddress && styles.inputError]}
                placeholder={t(userLanguage, "maya.content.emailPlaceholder")}
                placeholderTextColor="#999"
                keyboardType="email-address"
                value={emailAddress}
                onChangeText={(value) => setEmailAddress(value)}
                onPress={() => setShow(false)}
              />
              {stepErrors[2]?.emailAddress && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[2].emailAddress}
                </Text>
              )}
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="call" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.mobileNumber")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[2]?.mobileNumber && styles.inputError]}
                placeholder={t(userLanguage, "maya.content.mobilePlaceholder")}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={(value) => setMobileNumber(value)}
                onPress={() => setShow(false)}
              />
              {stepErrors[2]?.mobileNumber && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[2].mobileNumber}
                </Text>
              )}
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="phone-portrait" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.landlineNumber")}
                </Text>
              </View>
              <TextInput
                style={styles.modernInput}
                placeholder={t(userLanguage, "maya.content.landlinePlaceholder")}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={landlineNumber}
                onChangeText={(value) => setLandlineNumber(value)}
                onPress={() => setShow(false)}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="person-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.personalDetails.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.personalDetails.description")}
              </Text>
            </View>

            {/* Personal Details Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="person" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.gender")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalSelector, stepErrors[3]?.gender && styles.inputError]}
                onPress={() => setOpenGender(true)}
              >
                <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                  {gender || t(userLanguage, "maya.content.selectGender")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {stepErrors[3]?.gender && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[3].gender}
                </Text>
              )}
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="calendar" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.dateOfBirth")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.dateInput, stepErrors[3]?.birthdate && styles.inputError]}
                onPress={() => setShow(true)}
              >
                <Text
                  style={[
                    styles.dateText,
                    getRTLStyles(userLanguage),
                    placeholderDate === t(userLanguage, "maya.content.selectBirthdate") &&
                      styles.placeholderText,
                  ]}
                >
                  {placeholderDate}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.redTheme.background} />
              </TouchableOpacity>
              {stepErrors[3]?.birthdate && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[3].birthdate}
                </Text>
              )}
            </View>

            {show && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode={"date"}
                is24Hour={true}
                onChange={onChange}
                display="compact"
              />
            )}

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="heart" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.civilStatus")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalSelector, stepErrors[3]?.civilStatus && styles.inputError]}
                onPress={() => setOpenCivilStatus(true)}
              >
                <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                  {civilStatus}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {stepErrors[3]?.civilStatus && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[3].civilStatus}
                </Text>
              )}
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="flag" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.citizenship")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[3]?.citizenship && styles.inputError]}
                placeholder={t(userLanguage, "maya.content.citizenshipPlaceholder")}
                placeholderTextColor="#999"
                keyboardType="default"
                value={citizenShip}
                onChangeText={(value) => setCitizenShip(value)}
                onPress={() => setShow(false)}
              />
              {stepErrors[3]?.citizenship && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[3].citizenship}
                </Text>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="location-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.addressInfo.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.addressInfo.description")}
              </Text>
            </View>

            {/* Address Information Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="location" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.completeAddress")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernTextArea, stepErrors[4]?.address && styles.inputError]}
                placeholder={t(userLanguage, "maya.content.addressPlaceholder")}
                placeholderTextColor="#999"
                keyboardType="default"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={address}
                onChangeText={(value) => setAddress(value)}
                onPress={() => setShow(false)}
              />
              {stepErrors[4]?.address && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[4].address}
                </Text>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                Please provide your complete address including street, city, and postal code
              </Text>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="cash-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.financialInfo.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.steps.financialInfo.description")}
              </Text>
            </View>

            {/* Financial Information Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="trending-up" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.sourceOfFund")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[5]?.sourceFund && styles.inputError]}
                placeholder={t(userLanguage, "maya.content.sourcePlaceholder")}
                placeholderTextColor="#999"
                keyboardType="default"
                value={sourceFund}
                onChangeText={(value) => setSourceFund(value)}
                onPress={() => setShow(false)}
              />
              {stepErrors[5]?.sourceFund && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[5].sourceFund}
                </Text>
              )}
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="wallet" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "maya.content.grossMonthlyIncome")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[5]?.grossIncome && styles.inputError]}
                placeholder={t(userLanguage, "maya.content.incomePlaceholder")}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={grossIncome?.toString()}
                onChangeText={(value) => setGrossIncome(value)}
                onPress={() => setShow(false)}
              />
              {stepErrors[5]?.grossIncome && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[5].grossIncome}
                </Text>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                This information helps us understand your banking needs and ensure compliance
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card - Modern e-wallet style */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="wallet" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "maya.content.ewalletAccountOpening")}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "maya.content.digitalBankingMadeSimple")}
            </Text>
          </View>

          {/* Step Indicator - GCash/Maya style */}
          {renderStepIndicator()}

          {/* Step Content */}
          {renderStepContent()}

          {/* Disclaimer Card */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.disclaimerTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "maya.content.processingInformation")}
              </Text>
            </View>
            <Text style={[styles.disclaimerText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "maya.content.processingText")}
            </Text>
          </View>

          {/* Navigation Container */}
          <View style={styles.navigationContainer}>
            {currentStep > 1 ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={goToPreviousStep}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.backButtonText, getRTLStyles(userLanguage)]}>
                  Previous
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}
            
            <TouchableOpacity
              style={[
                currentStep === 5 ? styles.submitButton : styles.nextButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={goToNextStep}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons
                    name={currentStep === 5 ? "checkmark-circle" : "arrow-forward"}
                    size={20}
                    color="white"
                    style={styles.submitIcon}
                  />
                  <Text style={[styles.nextButtonText, getRTLStyles(userLanguage)]}>
                    {submitting 
                      ? t(userLanguage, "maya.content.processing") 
                      : currentStep === 5 
                      ? t(userLanguage, "maya.content.submitApplication")
                      : "Next"
                    }
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={openGender}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenGender(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenGender(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "maya.content.selectGenderModal")}</Text>
                <TouchableOpacity onPress={() => setOpenGender(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    gender === "Male" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setGender("Male");
                    setOpenGender(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    gender === "Male" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.male")}
                  </Text>
                  {gender === "Male" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    gender === "Female" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setGender("Female");
                    setOpenGender(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    gender === "Female" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.female")}
                  </Text>
                  {gender === "Female" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    gender === "Prefer not to say" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setGender("Prefer not to say");
                    setOpenGender(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    gender === "Prefer not to say" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.preferNotToSay")}
                  </Text>
                  {gender === "Prefer not to say" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={openCivilStatus}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenCivilStatus(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenCivilStatus(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "maya.content.selectCivilStatusModal")}</Text>
                <TouchableOpacity onPress={() => setOpenCivilStatus(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    civilStatus === "Single" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setCivilStatus("Single");
                    setOpenCivilStatus(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    civilStatus === "Single" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.single")}
                  </Text>
                  {civilStatus === "Single" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    civilStatus === "Married" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setCivilStatus("Married");
                    setOpenCivilStatus(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    civilStatus === "Married" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.married")}
                  </Text>
                  {civilStatus === "Married" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    civilStatus === "Legally Separated" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setCivilStatus("Legally Separated");
                    setOpenCivilStatus(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    civilStatus === "Legally Separated" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.legallySeparated")}
                  </Text>
                  {civilStatus === "Legally Separated" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    civilStatus === "Divorced" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setCivilStatus("Divorced");
                    setOpenCivilStatus(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    civilStatus === "Divorced" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.divorced")}
                  </Text>
                  {civilStatus === "Divorced" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    civilStatus === "Annulled" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setCivilStatus("Annulled");
                    setOpenCivilStatus(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    civilStatus === "Annulled" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.annulled")}
                  </Text>
                  {civilStatus === "Annulled" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    civilStatus === "Widow/er" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setCivilStatus("Widow/er");
                    setOpenCivilStatus(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    civilStatus === "Widow/er" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.widowEer")}
                  </Text>
                  {civilStatus === "Widow/er" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={openEwalletType}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenEwalletType(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenEwalletType(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "maya.content.selectEwalletTypeModal")}</Text>
                <TouchableOpacity onPress={() => setOpenEwalletType(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    ewalletType === "Maya" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setEwalletType("Maya");
                    setOpenEwalletType(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    ewalletType === "Maya" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.maya")}
                  </Text>
                  {ewalletType === "Maya" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    ewalletType === "GCash" && styles.selectedOption
                  ]}
                  onPress={() => {
                    setEwalletType("GCash");
                    setOpenEwalletType(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionText,
                    getRTLStyles(userLanguage),
                    ewalletType === "GCash" && styles.selectedOptionText
                  ]}>
                    {t(userLanguage, "maya.content.gCash")}
                  </Text>
                  {ewalletType === "GCash" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ProfessionalModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        onConfirm={modalConfig.onConfirm}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 60 : 50,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero Card - Modern e-wallet style
  heroCard: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
  },

  // Step Indicator - GCash/Maya style
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  stepCircleActive: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  stepCircleCompleted: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#999",
  },
  stepNumberActive: {
    color: "white",
  },
  stepLine: {
    width: 20,
    height: 3,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 2,
  },
  stepLineActive: {
    backgroundColor: "#4CAF50",
  },

  // Step Content
  stepContent: {
    marginBottom: 24,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Input Card - Modern design
  inputCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  modernInput: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
  },
  modernTextArea: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 120,
    textAlignVertical: "top",
  },

  // Info Card
  infoCard: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginLeft: 12,
  },

  // Navigation Container
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },

  // Back Button
  backButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonPlaceholder: {
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },

  // Next Button
  nextButton: {
    flex: 1,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginRight: 8,
  },

  // Submit Button
  submitButton: {
    flex: 1,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0.1,
  },
  submitIcon: {
    marginRight: 8,
  },

  // Error Styles
  inputError: {
    borderColor: '#FF5252',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    marginTop: 4,
    marginLeft: 4,
  },

  // Date Input
  dateInput: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },

  // Modal Selector Styles
  modalSelector: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalSelectorText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },


  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '92%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafbfc',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
    paddingLeft: 24,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
  },
  optionList: {
    paddingVertical: 8,
    maxHeight: 350,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 17,
    color: '#222',
    fontWeight: '500',
  },
  selectedOption: {
    backgroundColor: 'rgba(254,125,72,0.08)',
  },
  selectedOptionText: {
    color: Colors.redTheme.background,
    fontWeight: 'bold',
  },
  checkmarkCircle: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Disclaimer Card
  disclaimerCard: {
    backgroundColor: "rgba(255, 152, 0, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF9800",
    marginLeft: 8,
  },
  disclaimerText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
