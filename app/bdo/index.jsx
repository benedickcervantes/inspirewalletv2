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
  Alert,
  ToastAndroid,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { getFirestore, doc, getDoc, addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../../constants/Colors";
import SimpleLoadingScreen from "../../components/SimpleLoadingScreen";
import BankApplicationLoadingScreen from "../../components/BankApplicationLoadingScreen";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

export default function Index() {
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const storage = getStorage();
  const [userData, setUserData] = useState({ firstName: "", lastName: "", timeDepositAmount: 0 });
  const [userLanguage, setUserLanguage] = useState("english");
  const [open, setOpen] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [openCivilStatus, setOpenCivilStatus] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(true); // Set initial loading to true
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [placeholderDate, setPlaceHolderDate] = useState(
    "Select your birthdate"
  );

  // Document upload states
  const [passportImage, setPassportImage] = useState(null);
  const [driverLicenseImage, setDriverLicenseImage] = useState(null);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);

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

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    if (userLanguage !== "english") {
      setPlaceHolderDate(t(userLanguage, "bdo.content.selectBirthdate"));
    }
  }, [userLanguage]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "bdo.header.title"),
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
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        setLoading(false);
        showModal({
          title: t(userLanguage, "bdo.modals.accessRestricted.title"),
          message: t(userLanguage, "bdo.modals.accessRestricted.message").replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            navigation.goBack();
          }
        });
        return;
      }

      // If access is allowed, proceed with fetching user data
      await fetchUserData();
    } catch (error) {
      console.error("Error checking account access:", error);
      setLoading(false);
      showModal({
        title: t(userLanguage, "bdo.modals.error.title"),
        message: t(userLanguage, "bdo.modals.error.message"),
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
              title: t(userLanguage, "bdo.modals.timeDepositInsufficient.title"),
              message: t(userLanguage, "bdo.modals.timeDepositInsufficient.message").replace("{amount}", timeDepositAmount.toLocaleString()),
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
        title: t(userLanguage, "bdo.modals.fetchError.title"),
        message: t(userLanguage, "bdo.modals.fetchError.message"),
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
  const [BankType, setBankType] = useState("");
  const [citizenShip, setCitizenShip] = useState("Filipino");

  // Step-by-step procedure states
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepErrors, setStepErrors] = useState({});

  // Document upload functions
  const pickImage = async (type) => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showModal({
          title: t(userLanguage, "bdo.modals.permissionDenied.title"),
          message: t(userLanguage, "bdo.modals.permissionDenied.message"),
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'passport') {
          setPassportImage(result.assets[0]);
        } else if (type === 'driverLicense') {
          setDriverLicenseImage(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showModal({
        title: t(userLanguage, "bdo.modals.imagePickerError.title"),
        message: t(userLanguage, "bdo.modals.imagePickerError.message"),
        type: "error",
      });
    }
  };

  const uploadDocumentToStorage = async (image, documentType) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Create a reference to the file in Firebase Storage
      const fileName = `${documentType}_${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `documents/${user.uid}/${fileName}`);

      // Convert image URI to blob
      const response = await fetch(image.uri);
      const blob = await response.blob();

      // Upload the file
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      throw error;
    }
  };

  // Step validation functions
  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1: // Bank Selection
        if (!BankType) {
          errors.bankType = t(userLanguage, "bdo.validation.selectBank");
        }
        break;
      case 2: // Contact Information
        if (!emailAddress) errors.emailAddress = t(userLanguage, "bdo.validation.emailRequired");
        if (!mobileNumber) errors.mobileNumber = t(userLanguage, "bdo.validation.mobileRequired");
        break;
      case 3: // Personal Details
        if (!gender) errors.gender = t(userLanguage, "bdo.validation.genderRequired");
        if (placeholderDate === t(userLanguage, "bdo.content.selectBirthdate")) {
          errors.birthdate = t(userLanguage, "bdo.validation.birthdateRequired");
        }
        if (!civilStatus) errors.civilStatus = t(userLanguage, "bdo.validation.civilStatusRequired");
        if (!citizenShip) errors.citizenship = t(userLanguage, "bdo.validation.citizenshipRequired");
        break;
      case 4: // Address Information
        if (!address) errors.address = t(userLanguage, "bdo.validation.addressRequired");
        break;
      case 5: // Financial Information
        if (!sourceFund) errors.sourceFund = t(userLanguage, "bdo.validation.sourceFundRequired");
        if (!grossIncome || grossIncome <= 0) errors.grossIncome = t(userLanguage, "bdo.validation.incomeRequired");
        break;
      case 6: // Document Upload
        if (!passportImage) errors.passportImage = t(userLanguage, "bdo.validation.passportRequired");
        if (!driverLicenseImage) errors.driverLicenseImage = t(userLanguage, "bdo.validation.driverLicenseRequired");
        break;
    }
    
    setStepErrors(prev => ({ ...prev, [step]: errors }));
    return Object.keys(errors).length === 0;
  };

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < 6) {
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
    console.log('🔍 Form validation check:', {
      emailAddress: !!emailAddress,
      mobileNumber: !!mobileNumber,
      address: !!address,
      sourceFund: !!sourceFund,
      grossIncome: !!grossIncome,
      citizenShip: !!citizenShip,
      BankType: !!BankType,
      passportImage: !!passportImage,
      driverLicenseImage: !!driverLicenseImage
    });

    if (
      !emailAddress ||
      !mobileNumber ||
      !address ||
      !sourceFund ||
      !grossIncome ||
      !citizenShip ||
      !BankType ||
      !passportImage ||
      !driverLicenseImage
    ) {
      console.log('❌ Form validation failed - missing required fields');
      showModal({
        title: t(userLanguage, "bdo.modals.missingInformation.title"),
        message: t(userLanguage, "bdo.modals.missingInformation.message"),
        type: "warning",
      });
      return; // Exit the function if validation fails
    }

    console.log('🚀 Starting form submission...');
    setSubmittingForm(true); // Start form submission loading
    setUploadingDocuments(true);
    console.log('📱 Loading states set:', { submittingForm: true, uploadingDocuments: true });
    try {
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        setSubmittingForm(false);
        setUploadingDocuments(false);
        showModal({
          title: t(userLanguage, "bdo.modals.authenticationError.title"),
          message: t(userLanguage, "bdo.modals.authenticationError.message"),
          type: "error",
        });
        return;
      }

      // Upload documents to Firebase Storage
      let passportURL = null;
      let driverLicenseURL = null;

      try {
        console.log('📤 Starting document upload...');
        passportURL = await uploadDocumentToStorage(passportImage, 'passport');
        console.log('✅ Passport uploaded:', passportURL);
        driverLicenseURL = await uploadDocumentToStorage(driverLicenseImage, 'driverLicense');
        console.log('✅ Driver license uploaded:', driverLicenseURL);
      } catch (uploadError) {
        console.error('Error uploading documents:', uploadError);
        setSubmittingForm(false);
        setUploadingDocuments(false);
        showModal({
          title: t(userLanguage, "bdo.modals.documentUploadError.title"),
          message: t(userLanguage, "bdo.modals.documentUploadError.message"),
          type: "error",
        });
        return;
      }

      setUploadingDocuments(false);
      console.log('💾 Documents uploaded, now saving to Firebase...');

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
        
        // Address information
        address: address,
        
        // Banking information
        preferredBank: BankType,
        
        // Financial information
        sourceOfFund: sourceFund,
        grossMonthlyIncome: parseFloat(grossIncome) || 0,
        
        // Application metadata
        applicationType: "Bank Account Services",
        status: "Pending",
        submittedAt: new Date(),
        processedAt: null,
        
        // Document URLs
        passportURL: passportURL,
        driverLicenseURL: driverLicenseURL,
        
        // Additional fields
        notes: "",
        approvedBy: "",
        approvedAt: null,
      };

      // Save to Firebase - Create a new document in the 'bankApplications' collection
      const applicationRef = await addDoc(
        collection(db, "bankApplications"),
        applicationData
      );

      console.log("✅ Bank application saved to Firebase with ID:", applicationRef.id);

      // Also save to user's personal applications subcollection
      const userApplicationRef = await addDoc(
        collection(db, "users", user.uid, "applications"),
        {
          ...applicationData,
          applicationId: applicationRef.id,
          applicationType: "Bank Account Services",
        }
      );

      console.log("✅ Application saved to user's personal collection with ID:", userApplicationRef.id);

      // Send email notification
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          emailAddress,
          message: `Name: ${userData.firstName} ${userData.lastName}\nEmail Address: ${emailAddress}\nLandline Number: ${landlineNumber}\nGender: ${gender}\nBirthdate: ${date}\nAddress: ${address}\nBankType: ${BankType}\nSource of Fund: ${sourceFund}\nGross Monthly Income: ${grossIncome}\nCivil Status: ${civilStatus}\nCitizenship: ${citizenShip}\nType: Bank Account Services`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      console.log("SUCCESS!");
      showModal({
        title: t(userLanguage, "bdo.modals.success.title"),
        message: t(userLanguage, "bdo.modals.success.message"),
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
          setBankType("");
          setCitizenShip("Filipino");
          setDate(new Date());
          setPlaceHolderDate(t(userLanguage, "bdo.content.selectBirthdate"));
          setPassportImage(null);
          setDriverLicenseImage(null);
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
          title: t(userLanguage, "bdo.modals.partialSuccess.title"),
          message: t(userLanguage, "bdo.modals.partialSuccess.message"),
          type: "warning",
        });
      } else {
        showModal({
          title: t(userLanguage, "bdo.modals.submissionFailed.title"),
          message: t(userLanguage, "bdo.modals.submissionFailed.message").replace("{error}", err.message),
          type: "error",
        });
      }
    } finally {
      setSubmittingForm(false); // Stop form submission loading
      setUploadingDocuments(false); // Stop document upload loading
    }
  };

  // Only show the old loading screen for initial data loading, not form submission
  if (loading && !submittingForm) {
    return <SimpleLoadingScreen message="Loading BDO deposit form..." />;
  }

  if (submittingForm) {
    return <BankApplicationLoadingScreen message="Processing your bank application..." />;
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4, 5, 6].map((step) => (
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
          {step < 6 && (
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
                <Ionicons name="business-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.bankSelection.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.bankSelection.description")}
              </Text>
            </View>

            {/* Bank Selection Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="business" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.preferredBank")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalSelector, stepErrors[1]?.bankType && styles.inputError]}
                onPress={() => setOpenBank(true)}
              >
                <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                  {BankType || t(userLanguage, "bdo.content.chooseBank")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
              {stepErrors[1]?.bankType && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[1].bankType}
                </Text>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                Choose your preferred bank for account opening
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
                {t(userLanguage, "bdo.steps.contactInfo.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.contactInfo.description")}
              </Text>
            </View>

            {/* Contact Information Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="mail" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.emailAddress")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[2]?.emailAddress && styles.inputError]}
                placeholder={t(userLanguage, "bdo.content.emailPlaceholder")}
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
                  {t(userLanguage, "bdo.content.mobileNumber")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[2]?.mobileNumber && styles.inputError]}
                placeholder={t(userLanguage, "bdo.content.mobilePlaceholder")}
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
                  {t(userLanguage, "bdo.content.landlineNumber")}
                </Text>
              </View>
              <TextInput
                style={styles.modernInput}
                placeholder={t(userLanguage, "bdo.content.landlinePlaceholder")}
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
                {t(userLanguage, "bdo.steps.personalDetails.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.personalDetails.description")}
              </Text>
            </View>

            {/* Personal Details Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="person" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.gender")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalSelector, stepErrors[3]?.gender && styles.inputError]}
                onPress={() => setOpenGender(true)}
              >
                <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                  {gender || t(userLanguage, "bdo.content.selectGender")}
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
                  {t(userLanguage, "bdo.content.dateOfBirth")}
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
                    placeholderDate === t(userLanguage, "bdo.content.selectBirthdate") &&
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
                  {t(userLanguage, "bdo.content.civilStatus")}
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
                  {t(userLanguage, "bdo.content.citizenship")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[3]?.citizenship && styles.inputError]}
                placeholder={t(userLanguage, "bdo.content.citizenshipPlaceholder")}
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
                {t(userLanguage, "bdo.steps.addressInfo.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.addressInfo.description")}
              </Text>
            </View>

            {/* Address Information Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="location" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.completeAddress")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernTextArea, stepErrors[4]?.address && styles.inputError]}
                placeholder={t(userLanguage, "bdo.content.addressPlaceholder")}
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
                {t(userLanguage, "bdo.steps.financialInfo.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.financialInfo.description")}
              </Text>
            </View>

            {/* Financial Information Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="trending-up" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.sourceOfFund")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[5]?.sourceFund && styles.inputError]}
                placeholder={t(userLanguage, "bdo.content.sourcePlaceholder")}
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
                  {t(userLanguage, "bdo.content.grossMonthlyIncome")}
                </Text>
              </View>
              <TextInput
                style={[styles.modernInput, stepErrors[5]?.grossIncome && styles.inputError]}
                placeholder={t(userLanguage, "bdo.content.incomePlaceholder")}
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

      case 6:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="document-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.documentUpload.title")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "bdo.steps.documentUpload.description")}
              </Text>
            </View>

            {/* Document Upload Cards */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="camera" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.passportUpload")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.uploadButton, stepErrors[6]?.passportImage && styles.inputError]}
                onPress={() => pickImage('passport')}
              >
                <View style={styles.uploadButtonContent}>
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={Colors.redTheme.background}
                    style={styles.uploadIcon}
                  />
                  <Text style={[styles.uploadButtonText, getRTLStyles(userLanguage)]}>
                    {passportImage ? t(userLanguage, "bdo.content.changePassport") : t(userLanguage, "bdo.content.selectPassport")}
                  </Text>
                </View>
              </TouchableOpacity>
              {passportImage && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: passportImage.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setPassportImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}
              {stepErrors[6]?.passportImage && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[6].passportImage}
                </Text>
              )}
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="card" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "bdo.content.driverLicenseUpload")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.uploadButton, stepErrors[6]?.driverLicenseImage && styles.inputError]}
                onPress={() => pickImage('driverLicense')}
              >
                <View style={styles.uploadButtonContent}>
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={Colors.redTheme.background}
                    style={styles.uploadIcon}
                  />
                  <Text style={[styles.uploadButtonText, getRTLStyles(userLanguage)]}>
                    {driverLicenseImage ? t(userLanguage, "bdo.content.changeDriverLicense") : t(userLanguage, "bdo.content.selectDriverLicense")}
                  </Text>
                </View>
              </TouchableOpacity>
              {driverLicenseImage && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: driverLicenseImage.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setDriverLicenseImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}
              {stepErrors[6]?.driverLicenseImage && (
                <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                  {stepErrors[6].driverLicenseImage}
                </Text>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                Please upload clear, high-quality images of your documents
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
              <Ionicons name="business" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "bdo.content.headerTitle")}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "bdo.content.headerSubtitle")}
            </Text>
          </View>

          {/* Step Indicator - Modern style */}
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
                {t(userLanguage, "bdo.content.processingInfo")}
              </Text>
            </View>
            <Text style={[styles.disclaimerText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "bdo.content.processingText")}
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
                currentStep === 6 ? styles.submitButton : styles.nextButton,
                (submittingForm || uploadingDocuments) && styles.submitButtonDisabled,
              ]}
              onPress={goToNextStep}
              disabled={submittingForm || uploadingDocuments}
            >
              {(submittingForm || uploadingDocuments) ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons
                    name={currentStep === 6 ? "checkmark-circle" : "arrow-forward"}
                    size={20}
                    color="white"
                    style={styles.submitIcon}
                  />
                  <Text style={[styles.nextButtonText, getRTLStyles(userLanguage)]}>
                    {(submittingForm || uploadingDocuments)
                      ? t(userLanguage, "bdo.content.processing") 
                      : currentStep === 6 
                      ? t(userLanguage, "bdo.content.submitApplication")
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
        visible={openBank}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenBank(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenBank(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "bdo.content.selectBankModal")}</Text>
                <TouchableOpacity onPress={() => setOpenBank(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setBankType("BDO");
                    setOpenBank(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.bdoUnibank")}</Text>
                  </View>
                  {BankType === "BDO" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setBankType("Security Bank");
                    setOpenBank(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.securityBank")}</Text>
                  </View>
                  {BankType === "Security Bank" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setBankType("CTBC Bank");
                    setOpenBank(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.ctbcBank")}</Text>
                  </View>
                  {BankType === "CTBC Bank" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setBankType("UnionBank");
                    setOpenBank(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.unionBank")}</Text>
                  </View>
                  {BankType === "UnionBank" && (
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
        visible={openGender}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenGender(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenGender(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "bdo.content.selectGenderModal")}</Text>
                <TouchableOpacity onPress={() => setOpenGender(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setGender("Male");
                    setOpenGender(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.male")}</Text>
                  </View>
                  {gender === "Male" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setGender("Female");
                    setOpenGender(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.female")}</Text>
                  </View>
                  {gender === "Female" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setGender("Prefer not to say");
                    setOpenGender(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.preferNotToSay")}</Text>
                  </View>
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
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "bdo.content.selectCivilStatusModal")}</Text>
                <TouchableOpacity onPress={() => setOpenCivilStatus(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus("Single");
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.single")}</Text>
                  </View>
                  {civilStatus === "Single" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus("Married");
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.married")}</Text>
                  </View>
                  {civilStatus === "Married" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus("Legally Separated");
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.legallySeparated")}</Text>
                  </View>
                  {civilStatus === "Legally Separated" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus("Divorced");
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.divorced")}</Text>
                  </View>
                  {civilStatus === "Divorced" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus("Annulled");
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.annulled")}</Text>
                  </View>
                  {civilStatus === "Annulled" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus("Widow/er");
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "bdo.content.widow")}</Text>
                  </View>
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

      {/* Loading Overlay */}
      {(submittingForm || uploadingDocuments) && (
        <Modal
          visible={submittingForm || uploadingDocuments}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingContent}>
                <ActivityIndicator
                  size="large"
                  color={Colors.redTheme.background}
                  style={styles.mainLoadingSpinner}
                />
                <Text style={[styles.loadingTitle, getRTLStyles(userLanguage)]}>
                  {uploadingDocuments 
                    ? t(userLanguage, "bdo.content.uploadingDocuments")
                    : t(userLanguage, "bdo.content.processingApplication")
                  }
                </Text>
                <Text style={[styles.loadingSubtitle, getRTLStyles(userLanguage)]}>
                  {uploadingDocuments 
                    ? t(userLanguage, "bdo.content.uploadingSubtitle")
                    : t(userLanguage, "bdo.content.processingSubtitle")
                  }
                </Text>
                
                {/* Progress Steps */}
                <View style={styles.progressSteps}>
                  <View style={[
                    styles.progressStep,
                    uploadingDocuments && styles.progressStepActive
                  ]}>
                    <View style={[
                      styles.progressStepIcon,
                      uploadingDocuments && styles.progressStepIconActive
                    ]}>
                      <Ionicons 
                        name="cloud-upload-outline" 
                        size={16} 
                        color={uploadingDocuments ? "white" : "#999"} 
                      />
                    </View>
                    <Text style={[
                      styles.progressStepText,
                      uploadingDocuments && styles.progressStepTextActive
                    ]}>
                      {t(userLanguage, "bdo.content.uploadingStep")}
                    </Text>
                  </View>
                  
                  <View style={[
                    styles.progressStep,
                    submittingForm && !uploadingDocuments && styles.progressStepActive
                  ]}>
                    <View style={[
                      styles.progressStepIcon,
                      submittingForm && !uploadingDocuments && styles.progressStepIconActive
                    ]}>
                      <Ionicons 
                        name="checkmark-outline" 
                        size={16} 
                        color={submittingForm && !uploadingDocuments ? "white" : "#999"} 
                      />
                    </View>
                    <Text style={[
                      styles.progressStepText,
                      submittingForm && !uploadingDocuments && styles.progressStepTextActive
                    ]}>
                      {t(userLanguage, "bdo.content.savingStep")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCloseButton={modalConfig.showCloseButton}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
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

  // Step Indicator - Modern style
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  stepIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 14,
    fontWeight: "bold",
    color: "#999",
  },
  stepNumberActive: {
    color: "white",
  },
  stepLine: {
    width: 16,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 1,
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

  // Upload Button
  uploadButton: {
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  uploadButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  imagePreview: {
    position: "relative",
    marginTop: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 12,
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
  checkmarkCircle: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header Card
  headerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 5,
    borderLeftColor: Colors.redTheme.background,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 16,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  // Instruction Card
  instructionCard: {
    backgroundColor: "rgba(255, 245, 242, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Form Card
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 20,
    textAlign: "center",
  },

  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204, 33, 53, 0.2)",
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Date Input
  dateInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  dateInputDisabled: {
    opacity: 0.5,
    backgroundColor: "#f5f5f5",
  },

  // Dropdown Styles
  dropdownContainer: {
    marginBottom: 0,
  },
  dropdown: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownList: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
    borderWidth: 2,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Modal Styles
  modalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
},
modalSelectorText: {
  flex: 1,
  fontSize: 16,
  color: '#333',
  fontWeight: '500',
},
modalSelectorDisabled: {
  opacity: 0.5,
  backgroundColor: '#f5f5f5',
},
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
    backgroundColor: "rgba(255, 245, 242, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Submit Button
  submitButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Document Upload Styles
  uploadButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  uploadButtonDisabled: {
    opacity: 0.5,
    borderColor: "#ccc",
  },
  imagePreview: {
    marginTop: 12,
    position: "relative",
    alignItems: "center",
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "500",
  },

  // Loading Overlay Styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 32,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingContent: {
    alignItems: "center",
  },
  mainLoadingSpinner: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  progressSteps: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  progressStepActive: {
    // Active state styling handled by child elements
  },
  progressStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  progressStepIconActive: {
    backgroundColor: Colors.redTheme.background,
  },
  progressStepText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontWeight: "500",
  },
  progressStepTextActive: {
    color: Colors.redTheme.background,
    fontWeight: "600",
  },

  // Debug Styles
  debugInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
