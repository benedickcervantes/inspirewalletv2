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
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  collection,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../../constants/Colors";
import {
  ref,
  getDownloadURL,
  uploadBytesResumable,
  uploadBytes,
} from "firebase/storage";
import { storage, auth } from "../../configs/firebase";
import axios from "axios";
import TravelProtectionLoadingScreen from "../../components/TravelProtectionLoadingScreen";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const db = getFirestore();
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const [userLanguage, setUserLanguage] = useState("english");
  const [open, setOpen] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [openCivilStatus, setOpenCivilStatus] = useState(false);
  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Step-by-step flow
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [placeholderDate, setPlaceHolderDate] = useState(
    t(userLanguage, "travelProtection.content.selectBirthdate")
  );
  const [placeholderStayInDate, setPlaceHolderStayInDate] = useState(
    t(userLanguage, "travelProtection.content.selectCheckInDate")
  );
  const [placeholderArrivalTime, setPlaceHolderArrivalTime] = useState(
    t(userLanguage, "travelProtection.content.selectArrivalTime")
  );
  const [placeholderDepartureTime, setPlaceHolderDepartureTime] = useState(
    t(userLanguage, "travelProtection.content.selectDepartureTime")
  );
  const [showStayIn, setShowStayIn] = useState(false);
  const [showArrivalTime, setShowArrivalTime] = useState(false);
  const [showDepartureTime, setShowDepartureTime] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [imageGovtId, setImageGovtId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [userAmount, setUserAmount] = useState(0);
  const [amount, setAmount] = useState(0);
  const [approvalUrl, setApprovalUrl] = useState(null);
  const [transactionId, setTransactionId] = useState(null);

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

  const stayInOnChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDateStayIn;

    // On Android, always close the picker after selection
    if (Platform.OS === "android") {
      setShowStayIn(false);
    }

    // Only update the date if user didn't cancel
    if (event.type === "set" && selectedDate) {
      setPlaceHolderStayInDate(currentDate.toLocaleDateString());
      setStartDateStayIn(currentDate);
    }

    // On iOS, the picker dismisses automatically, but we still need to handle the event
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowStayIn(false);
    }
  };

  const arrivalTimeOnChange = (event, selectedTime) => {
    const currentTime = selectedTime || arrivalTime;

    // On Android, always close the picker after selection
    if (Platform.OS === "android") {
      setShowArrivalTime(false);
    }

    // Only update the time if user didn't cancel
    if (event.type === "set" && selectedTime) {
      setPlaceHolderArrivalTime(
        currentTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setArrivalTime(currentTime);
    }

    // On iOS, the picker dismisses automatically, but we still need to handle the event
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowArrivalTime(false);
    }
  };

  const departureTimeOnChange = (event, selectedTime) => {
    const currentTime = selectedTime || departureTime;

    // On Android, always close the picker after selection
    if (Platform.OS === "android") {
      setShowDepartureTime(false);
    }

    // Only update the time if user didn't cancel
    if (event.type === "set" && selectedTime) {
      setPlaceHolderDepartureTime(
        currentTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setDepartureTime(currentTime);
    }

    // On iOS, the picker dismisses automatically, but we still need to handle the event
    if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowDepartureTime(false);
    }
  };

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
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
    setPlaceHolderDate(t(userLanguage, "travelProtection.content.selectBirthdate"));
    setPlaceHolderStayInDate(t(userLanguage, "travelProtection.content.selectCheckInDate"));
    setPlaceHolderArrivalTime(t(userLanguage, "travelProtection.content.selectArrivalTime"));
    setPlaceHolderDepartureTime(t(userLanguage, "travelProtection.content.selectDepartureTime"));
    setCivilStatus(t(userLanguage, "travelProtection.content.single"));
    setCitizenShip(t(userLanguage, "travelProtection.content.citizenshipPlaceholder"));
  }, [userLanguage]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "travelProtection.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  useEffect(() => {
    checkAccessAndInitialize();
  }, []);

  const checkAccessAndInitialize = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        showModal({
          title: t(userLanguage, "travelProtection.modals.accessRestricted"),
          message: t(userLanguage, "travelProtection.modals.premiumRequired").replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            navigation.goBack();
          }
        });
        return;
      }
      
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid); // Reference to the user's document
        const unsubscribe = onSnapshot(
          userRef,
          (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData({
                firstName: data.firstName,
                lastName: data.lastName,
              });
              setUserAmount(data.timeDepositAmount); // Update state with time deposit amount
            } else {
              showModal({
                title: t(userLanguage, "travelProtection.modals.error"),
                message: t(userLanguage, "travelProtection.modals.noUserData"),
                type: "error",
              });
            }
          },
          (error) => {
            showModal({
              title: t(userLanguage, "travelProtection.modals.error"),
              message: error.message,
              type: "error",
            });
          }
        );

        // Cleanup function to unsubscribe from the listener
        return () => unsubscribe();
      }
    } catch (error) {
      console.error("Error checking account access:", error);
      showModal({
        title: t(userLanguage, "travelProtection.modals.error"),
        message: t(userLanguage, "travelProtection.modals.errorMessage"),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        }
      });
    }
  };

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t(userLanguage, "travelProtection.modals.error"), t(userLanguage, "travelProtection.modals.uploadFailed"));
    }
  };

  const selectGovtImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageGovtId(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t(userLanguage, "travelProtection.modals.error"), t(userLanguage, "travelProtection.modals.uploadFailed"));
    }
  };

  const uploadImage = async () => {
    if (!imageUri) {
      showModal({
        title: t(userLanguage, "travelProtection.modals.error"),
        message: t(userLanguage, "travelProtection.modals.selectImageFirst"),
        type: "error",
      });
      setLoading(false);
      return;
    }

    if (!auth.currentUser) {
      showModal({
        title: "Error",
        message: "You must be logged in to upload an image.",
        type: "error",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        `gs://inspire-wallet.firebasestorage.app/passport/${
          auth.currentUser.uid
        }_${new Date()}.jpg`
      );
      // console.log(storageRef);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // console.log("Image uploaded successfully:", downloadURL);
    } catch (error) {
      // console.error("Error uploading image:", error);
      if (error.serverResponse) {
        // console.error("Server response:", error.serverResponse);
      }
      showModal({
        title: "Error",
        message: "Failed to upload image. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadGovtId = async () => {
    if (!imageGovtId) {
      showModal({
        title: "Error",
        message: "Please select an image first.",
        type: "error",
      });
      setLoading(false);
      return;
    }

    if (!auth.currentUser) {
      showModal({
        title: "Error",
        message: "You must be logged in to upload an image.",
        type: "error",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(imageGovtId);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        `gs://inspire-wallet.firebasestorage.app/governmentid/${
          auth.currentUser.uid
        }_${new Date()}.jpg`
      );
      // console.log(storageRef);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // console.log("Image uploaded successfully:", downloadURL);
    } catch (error) {
      // console.error("Error uploading image:", error);
      if (error.serverResponse) {
        // console.error("Server response:", error.serverResponse);
      }
      showModal({
        title: "Error",
        message: "Failed to upload image. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAmount > 0) {
      setAmount(625);
    } else {
      setAmount(1250);
    }
  }, [userAmount]);

  const [emailAddress, setEmailAddress] = useState();
  const [mobileNumber, setMobileNumber] = useState();
  const [landlineNumber, setLandlineNumber] = useState();
  const [address, setAddress] = useState();
  const [sourceFund, setSourceFund] = useState();
  const [grossIncome, setGrossIncome] = useState(0);
  const [gender, setGender] = useState();
  const [civilStatus, setCivilStatus] = useState(t(userLanguage, "travelProtection.content.single"));
  const [citizenShip, setCitizenShip] = useState(t(userLanguage, "travelProtection.content.citizenshipPlaceholder"));
  const [cashOnHand, setCashOnHand] = useState(0);
  const [stayInAddress, setStayInAddress] = useState();
  const [startDateStayIn, setStartDateStayIn] = useState(new Date());
  const [stayInDuration, setStayInDuration] = useState(0);
  const [airlineType, setAirlineType] = useState();
  const [departureTime, setDepartureTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [passportNumber, setPassportNumber] = useState();
  const [purpose, setPurpose] = useState();
  const [isCaptureSuccessful, setIsCaptureSuccessful] = useState(false);

  const createOrder = async () => {
    try {
      const response = await axios.post(
        "https://elevated-agent-447620-i5.de.r.appspot.com/create-order",
        {
          amount,
        }
      );

      // console.log("Amount:", amount);

      const { id, approvalUrl } = response.data;

      setOrderId(id); // Update the Order ID
      setApprovalUrl(approvalUrl); // Save the approval URL
    } catch (error) {
      showModal({
        title: "Error",
        message: "Failed to create order",
        type: "error",
      });
      // console.log("Error: " + error);
    }
  };

  const captureOrder = async (id) => {
    try {
      const response = await axios.post(
        "https://elevated-agent-447620-i5.de.r.appspot.com/capture-order",
        {
          orderId: id,
        }
      );
      const { transactionId } = response.data;
      setTransactionId(transactionId);
      setIsCaptureSuccessful(true);
      uploadImage();
      uploadGovtId();
    } catch (error) {
      showModal({
        title: "Error",
        message: "Failed to capture payment",
        type: "error",
      });
      // console.log("Capture error:", error);
      setLoading(false);
    }
  };

  // useEffect to handle actions when orderId is updated
  useEffect(() => {
    if (orderId && approvalUrl) {
      // console.log("Order ID updated:", orderId);

      // Show confirmation alert when order ID is updated
      showModal({
        title: "Order Created",
        message: "Please click CONFIRM to confirm the payment",
        type: "info",
        confirmText: "CONFIRM",
        onConfirm: () => {
          hideModal();
          captureOrder(orderId);
        },
      });

      // Open approval URL in the browser
      Linking.openURL(approvalUrl);
    }
  }, [orderId, approvalUrl]);

  useEffect(() => {
    const onProcessSubmission = async () => {
      if (orderId) {
        setLoading(false);
        try {
          await send(
            process.env.EXPO_PUBLIC_SERVICE_ID,
            process.env.EXPO_PUBLIC_TEMPLATE_ID,
            {
              emailAddress,
              message: `Type: Travel Protection\nName: ${userData.firstName} ${userData.lastName}\nEmail Address: ${emailAddress}\nLandline Number: ${landlineNumber}\nGender: ${gender}\nBirthdate: ${date}\nAddress: ${address}\nSource of Fund: ${sourceFund}\nGross Monthly Income: ${grossIncome}\nCivil Status: ${civilStatus}\nCitizenship: ${citizenShip}\nCash On Hand: ${cashOnHand}\nStay In Address: ${stayInAddress}\nStay Date: ${startDateStayIn}\nStay In Duration: ${stayInDuration}\nAirline Type: ${airlineType}\nArrival Time: ${arrivalTime}\nDeparture Time: ${departureTime}\nPassport Number: ${passportNumber}\nPurpose: ${purpose}\nTransaction ID: ${transactionId}`,
            },
            {
              publicKey: process.env.EXPO_PUBLIC_API_KEY,
            }
          );

          // console.log("SUCCESS!");

          showModal({
            title: "SUCCESS",
            message: "It is successfully sent",
            type: "success",
            onConfirm: () => {
              hideModal();
              router.back();
            },
          });
        } catch (err) {
          if (err instanceof EmailJSResponseStatus) {
            // console.log("EmailJS Request Failed...", err);
          }

          // console.log("ERROR", err);
          showModal({
            title: "FAILURE",
            message: "It is unsuccessfully sent",
            type: "error",
          });
        } finally {
          setLoading(false); // Stop loading
        }
      }
    };
    onProcessSubmission();
  }, [isCaptureSuccessful]);

  const onSubmit = async () => {
    setShow(false);
    setShowStayIn(false);
    setShowArrivalTime(false);
    setShowDepartureTime(false);

    // Validate required fields
    if (
      !emailAddress ||
      !mobileNumber ||
      !address ||
      !sourceFund ||
      !grossIncome ||
      !citizenShip ||
      !cashOnHand ||
      !stayInAddress ||
      !startDateStayIn ||
      !stayInDuration ||
      !airlineType ||
      !arrivalTime ||
      !departureTime ||
      !passportNumber ||
      !purpose ||
      !imageUri ||
      !imageGovtId
    ) {
      showModal({
        title: "Missing Information",
        message:
          "Please fill in all required fields and upload both passport photo and government ID before submitting.",
        type: "warning",
      });
      return; // Exit the function if validation fails
    }

    setLoading(true); // Start loading
    try {
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: "Authentication Error",
          message: "Please log in to submit your application.",
          type: "error",
        });
        return;
      }

      // Upload passport photo to Firebase Storage
      let passportPhotoUrl = "";
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const passportStorageRef = ref(
            storage,
            `gs://inspire-wallet.firebasestorage.app/passport/${
              user.uid
            }_${new Date().getTime()}.jpg`
          );
          await uploadBytes(passportStorageRef, blob);
          passportPhotoUrl = await getDownloadURL(passportStorageRef);
          // console.log("✅ Passport photo uploaded:", passportPhotoUrl);
        } catch (uploadError) {
          // console.error("Error uploading passport photo:", uploadError);
          showModal({
            title: "Upload Error",
            message: "Failed to upload passport photo. Please try again.",
            type: "error",
          });
          return;
        }
      }

      // Upload government ID to Firebase Storage
      let govtIdUrl = "";
      if (imageGovtId) {
        try {
          const response = await fetch(imageGovtId);
          const blob = await response.blob();
          const govtIdStorageRef = ref(
            storage,
            `gs://inspire-wallet.firebasestorage.app/governmentid/${
              user.uid
            }_${new Date().getTime()}.jpg`
          );
          await uploadBytes(govtIdStorageRef, blob);
          govtIdUrl = await getDownloadURL(govtIdStorageRef);
          // console.log("✅ Government ID uploaded:", govtIdUrl);
        } catch (uploadError) {
          // console.error("Error uploading government ID:", uploadError);
          showModal({
            title: "Upload Error",
            message: "Failed to upload government ID. Please try again.",
            type: "error",
          });
          return;
        }
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
        homeAddress: address,

        // Financial information
        sourceOfFund: sourceFund,
        grossMonthlyIncome: parseFloat(grossIncome) || 0,
        cashOnHand: parseFloat(cashOnHand) || 0,

        // Travel details
        destinationAddress: stayInAddress,
        checkInDate: startDateStayIn,
        stayDuration: parseInt(stayInDuration) || 0,
        airline: airlineType,
        departureTime: departureTime,
        arrivalTime: arrivalTime,
        passportNumber: passportNumber,
        purposeOfTravel: purpose,

        // Document URLs
        passportPhotoUrl: passportPhotoUrl,
        governmentIdUrl: govtIdUrl,

        // Payment information
        protectionFee: amount,
        userTimeDepositAmount: userAmount,
        isDiscountedRate: userAmount > 0,

        // Application metadata
        applicationType: "Travel Protection",
        status: "Pending",
        submittedAt: new Date(),
        processedAt: null,

        // Additional fields
        notes: "",
        approvedBy: "",
        approvedAt: null,
      };

      // Save to Firebase - Create a new document in the 'travelApplications' collection
      const applicationRef = await addDoc(
        collection(db, "travelApplications"),
        applicationData
      );

      // console.log(
      //   "✅ Travel application saved to Firebase with ID:",
      //   applicationRef.id
      // );

      // Also save to user's personal applications subcollection
      const userApplicationRef = await addDoc(
        collection(db, "users", user.uid, "applications"),
        {
          ...applicationData,
          applicationId: applicationRef.id,
          applicationType: "Travel Protection",
        }
      );

      // console.log(
      //   "✅ Application saved to user's personal collection with ID:",
      //   userApplicationRef.id
      // );

      // Send email notification
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          emailAddress,
          message: `Type: Travel Protection\nName: ${userData.firstName} ${userData.lastName}\nEmail Address: ${emailAddress}\nLandline Number: ${landlineNumber}\nGender: ${gender}\nBirthdate: ${date}\nAddress: ${address}\nSource of Fund: ${sourceFund}\nGross Monthly Income: ${grossIncome}\nCivil Status: ${civilStatus}\nCitizenship: ${citizenShip}\nCash On Hand: ${cashOnHand}\nStay In Address: ${stayInAddress}\nStay Date: ${startDateStayIn}\nStay In Duration: ${stayInDuration}\nAirline Type: ${airlineType}\nArrival Time: ${arrivalTime}\nDeparture Time: ${departureTime}\nPassport Number: ${passportNumber}\nPurpose: ${purpose}\nProtection Fee: ₱${amount}`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      // console.log("✅ Email notification sent successfully!");

      showModal({
        title: "Application Submitted Successfully!",
        message:
          "Your travel protection application has been submitted and saved to our database. You will receive an email confirmation shortly. Application ID: " +
          applicationRef.id,
        type: "success",
        onConfirm: () => {
          hideModal();
          router.back();
        },
      });

      // Reset form after successful submission
      setEmailAddress("");
      setMobileNumber("");
      setLandlineNumber("");
      setAddress("");
      setSourceFund("");
      setGrossIncome(0);
      setGender(null);
      setCivilStatus(t(userLanguage, "travelProtection.content.single"));
      setCitizenShip(t(userLanguage, "travelProtection.content.citizenshipPlaceholder"));
      setCashOnHand(0);
      setStayInAddress("");
      setStartDateStayIn(new Date());
      setStayInDuration(0);
      setAirlineType("");
      setDepartureTime(new Date());
      setArrivalTime(new Date());
      setPassportNumber("");
      setPurpose("");
      setImageUri(null);
      setImageGovtId(null);
      setDate(new Date());
      setPlaceHolderDate(t(userLanguage, "travelProtection.content.selectBirthdate"));
      setPlaceHolderStayInDate(t(userLanguage, "travelProtection.content.selectCheckInDate"));
      setPlaceHolderArrivalTime(t(userLanguage, "travelProtection.content.selectArrivalTime"));
      setPlaceHolderDepartureTime(t(userLanguage, "travelProtection.content.selectDepartureTime"));
    } catch (err) {
      // console.error("Error submitting application:", err);

      if (err instanceof EmailJSResponseStatus) {
        // console.log("EmailJS Request Failed...", err);
        showModal({
          title: "Partial Success",
          message:
            "Your application was saved but we couldn't send the email notification. Please check your email address.",
          type: "warning",
        });
      } else {
        showModal({
          title: "Submission Failed",
          message:
            "Unable to submit your application. Please try again later. Error: " +
            err.message,
          type: "error",
        });
      }
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const hideAllPickers = () => {
    setShow(false);
    setShowStayIn(false);
    setShowArrivalTime(false);
    setShowDepartureTime(false);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate contact information
      if (!emailAddress || !mobileNumber || !address) {
        showModal({
          title: t(userLanguage, "travelProtection.modals.missingInformation"),
          message: t(userLanguage, "travelProtection.modals.contactRequired"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate personal details
      if (!gender || !citizenShip) {
        showModal({
          title: t(userLanguage, "travelProtection.modals.missingInformation"),
          message: t(userLanguage, "travelProtection.modals.personalRequired"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Validate financial information
      if (!sourceFund || !grossIncome || !cashOnHand) {
        showModal({
          title: t(userLanguage, "travelProtection.modals.missingInformation"),
          message: t(userLanguage, "travelProtection.modals.financialRequired"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Validate travel details
      if (!stayInAddress || !airlineType || !passportNumber || !purpose) {
        showModal({
          title: t(userLanguage, "travelProtection.modals.missingInformation"),
          message: t(userLanguage, "travelProtection.modals.travelRequired"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      // Validate documents
      if (!imageUri || !imageGovtId) {
        showModal({
          title: t(userLanguage, "travelProtection.modals.missingInformation"),
          message: t(userLanguage, "travelProtection.modals.documentsRequired"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(6);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return <TravelProtectionLoadingScreen message="Processing your travel protection application..." />;
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4, 5, 6].map((step) => (
        <View key={step} style={styles.stepIndicatorWrapper}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            currentStep > step && styles.stepCircleCompleted
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={12} color="white" />
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
              currentStep > step && styles.stepLineActive
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
                <Ionicons name="person-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.contactInformation")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.contactDescription") || "Please provide your contact information"}
              </Text>
            </View>

            {/* Contact Information Form */}
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.emailAddress")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.emailPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={emailAddress}
                  onChangeText={(value) => setEmailAddress(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.mobileNumber")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.mobilePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={mobileNumber}
                  onChangeText={(value) => setMobileNumber(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.landlineNumber")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.landlinePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={landlineNumber}
                  onChangeText={(value) => setLandlineNumber(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.homeAddress")}</Text>
                <TextInput
                  style={[styles.textArea, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.addressPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={address}
                  onChangeText={(value) => setAddress(value)}
                  onPress={hideAllPickers}
                />
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="person-circle-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.personalDetails")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.personalDescription") || "Please provide your personal information"}
              </Text>
            </View>

            {/* Personal Details Form */}
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.gender")}</Text>
                <TouchableOpacity
                  style={styles.modalSelector}
                  onPress={() => setOpenGender(true)}
                >
                  <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                    {gender || t(userLanguage, "travelProtection.content.selectGender")}
                  </Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.dateOfBirth")}</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    setShow(true);
                    setShowStayIn(false);
                    setShowArrivalTime(false);
                    setShowDepartureTime(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateText,
                      getRTLStyles(userLanguage),
                      placeholderDate === t(userLanguage, "travelProtection.content.selectBirthdate") &&
                        styles.placeholderText,
                    ]}
                  >
                    {placeholderDate}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
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

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.civilStatus")}</Text>
                <TouchableOpacity
                  style={styles.modalSelector}
                  onPress={() => setOpenCivilStatus(true)}
                >
                  <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                    {civilStatus || t(userLanguage, "travelProtection.content.selectCivilStatus")}
                  </Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.citizenship")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.citizenshipPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={citizenShip}
                  onChangeText={(value) => setCitizenShip(value)}
                  onPress={hideAllPickers}
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="cash-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.financialInformation")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.financialDescription") || "Please provide your financial information"}
              </Text>
            </View>

            {/* Financial Information Form */}
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.sourceOfFund")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.sourcePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={sourceFund}
                  onChangeText={(value) => setSourceFund(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.grossMonthlyIncome")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.incomePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={grossIncome?.toString()}
                  onChangeText={(value) => setGrossIncome(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.cashOnHand")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.cashPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={cashOnHand?.toString()}
                  onChangeText={(value) => setCashOnHand(value)}
                  onPress={hideAllPickers}
                />
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="airplane-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.travelDetails")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.travelDescription") || "Please provide your travel information"}
              </Text>
            </View>

            {/* Travel Details Form */}
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.destinationAddress")}</Text>
                <TextInput
                  style={[styles.textArea, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.destinationPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={stayInAddress}
                  onChangeText={(value) => setStayInAddress(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.checkInDate")}</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    setShowStayIn(true);
                    setShow(false);
                    setShowArrivalTime(false);
                    setShowDepartureTime(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateText,
                      getRTLStyles(userLanguage),
                      placeholderStayInDate === t(userLanguage, "travelProtection.content.selectCheckInDate") &&
                        styles.placeholderText,
                    ]}
                  >
                    {placeholderStayInDate}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
              </View>

              {showStayIn && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={startDateStayIn}
                  mode={"date"}
                  is24Hour={true}
                  onChange={stayInOnChange}
                  display="compact"
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.duration")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.durationPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={stayInDuration?.toString()}
                  onChangeText={(value) => setStayInDuration(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.airline")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.airlinePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={airlineType}
                  onChangeText={(value) => setAirlineType(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.departureTime")}</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    setShowDepartureTime(true);
                    setShow(false);
                    setShowStayIn(false);
                    setShowArrivalTime(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateText,
                      getRTLStyles(userLanguage),
                      placeholderDepartureTime === t(userLanguage, "travelProtection.content.selectDepartureTime") &&
                        styles.placeholderText,
                    ]}
                  >
                    {placeholderDepartureTime}
                  </Text>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
              </View>

              {showDepartureTime && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={departureTime}
                  mode={"time"}
                  is24Hour={false}
                  onChange={departureTimeOnChange}
                  display="compact"
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.arrivalTime")}</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    setShowArrivalTime(true);
                    setShow(false);
                    setShowStayIn(false);
                    setShowDepartureTime(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateText,
                      getRTLStyles(userLanguage),
                      placeholderArrivalTime === t(userLanguage, "travelProtection.content.selectArrivalTime") &&
                        styles.placeholderText,
                    ]}
                  >
                    {placeholderArrivalTime}
                  </Text>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
              </View>

              {showArrivalTime && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={arrivalTime}
                  mode={"time"}
                  is24Hour={false}
                  onChange={arrivalTimeOnChange}
                  display="compact"
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.passportNumber")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.passportPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={passportNumber}
                  onChangeText={(value) => setPassportNumber(value)}
                  onPress={hideAllPickers}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.purposeOfTravel")}</Text>
                <TextInput
                  style={[styles.textArea, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "travelProtection.content.purposePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={purpose}
                  onChangeText={(value) => setPurpose(value)}
                  onPress={hideAllPickers}
                />
              </View>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="document-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.requiredDocuments")}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.documentsDescription") || "Please upload your required documents"}
              </Text>
            </View>

            {/* Document Upload Form */}
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.passportPhoto")}</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={selectImage}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.uploadedImage}
                    />
                  ) : (
                    <View style={styles.uploadContent}>
                      <Ionicons
                        name="camera-outline"
                        size={32}
                        color={Colors.redTheme.background}
                      />
                      <Text style={[styles.uploadText, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.uploadPassport")}</Text>
                      <Text style={[styles.uploadSubtext, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "travelProtection.content.tapToSelect")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.governmentId")}</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={selectGovtImage}
                >
                  {imageGovtId ? (
                    <Image
                      source={{ uri: imageGovtId }}
                      style={styles.uploadedImage}
                    />
                  ) : (
                    <View style={styles.uploadContent}>
                      <Ionicons
                        name="card-outline"
                        size={32}
                        color={Colors.redTheme.background}
                      />
                      <Text style={[styles.uploadText, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "travelProtection.content.uploadGovernmentId")}
                      </Text>
                      <Text style={[styles.uploadSubtext, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, "travelProtection.content.idTypes")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.reviewAndSubmit") || "Review & Submit"}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.reviewDescription") || "Please review your information before submitting"}
              </Text>
            </View>

            {/* Review Card */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="person-outline" size={20} color={Colors.redTheme.background} />
                  <Text style={[styles.reviewSectionTitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, "travelProtection.content.contactInformation")}
                  </Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, "travelProtection.content.emailAddress")}</Text>
                  <Text style={styles.reviewValue}>{emailAddress}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, "travelProtection.content.mobileNumber")}</Text>
                  <Text style={styles.reviewValue}>{mobileNumber}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, "travelProtection.content.homeAddress")}</Text>
                  <Text style={styles.reviewValue}>{address}</Text>
                </View>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="airplane-outline" size={20} color={Colors.redTheme.background} />
                  <Text style={[styles.reviewSectionTitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, "travelProtection.content.travelDetails")}
                  </Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, "travelProtection.content.destinationAddress")}</Text>
                  <Text style={styles.reviewValue}>{stayInAddress}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, "travelProtection.content.airline")}</Text>
                  <Text style={styles.reviewValue}>{airlineType}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, "travelProtection.content.passportNumber")}</Text>
                  <Text style={styles.reviewValue}>{passportNumber}</Text>
                </View>
              </View>
            </View>

            {/* Disclaimer Card */}
            <View style={styles.disclaimerCard}>
              <View style={styles.disclaimerHeader}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#FF9800"
                />
                <Text style={[styles.disclaimerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.importantInformation")}</Text>
              </View>
              <Text style={[styles.disclaimerText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "travelProtection.content.disclaimerText")}
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
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="airplane" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "travelProtection.content.title")}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "travelProtection.content.subtitle")}
            </Text>
          </View>

          {/* Instructions Card */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "travelProtection.content.instructionText")}
            </Text>
          </View>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Ionicons
                name="card-outline"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.pricingTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.content.protectionFee")}</Text>
            </View>
            <View style={styles.pricingContent}>
              <Text style={[styles.pricingAmount, getRTLStyles(userLanguage)]}>₱ {amount}</Text>
              <Text style={[styles.pricingNote, getRTLStyles(userLanguage)]}>
                {userAmount > 0
                  ? t(userLanguage, "travelProtection.content.discountedRate")
                  : t(userLanguage, "travelProtection.content.standardRate")}
              </Text>
            </View>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handlePreviousStep}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.redTheme.background} />
                <Text style={styles.backButtonText}>
                  {t(userLanguage, "travelProtection.buttons.back") || "Back"}
                </Text>
              </TouchableOpacity>
            )}

            {currentStep < 6 ? (
              <TouchableOpacity
                style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
                onPress={handleNextStep}
              >
                <Text style={styles.nextButtonText}>
                  {t(userLanguage, "travelProtection.buttons.next") || "Next"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="white" style={styles.submitIcon} />
                    <Text style={styles.submitButtonText}>
                      {t(userLanguage, "travelProtection.content.applyForProtection")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

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

      {/* Gender Selection Modal */}
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
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.modals.selectGender")}</Text>
                <TouchableOpacity onPress={() => setOpenGender(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setGender(t(userLanguage, "travelProtection.content.male"));
                    setOpenGender(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.male")}</Text>
                  </View>
                  {gender === t(userLanguage, "travelProtection.content.male") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setGender(t(userLanguage, "travelProtection.content.female"));
                    setOpenGender(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.female")}</Text>
                  </View>
                  {gender === t(userLanguage, "travelProtection.content.female") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setGender(t(userLanguage, "travelProtection.content.preferNotToSay"));
                    setOpenGender(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.preferNotToSay")}</Text>
                  </View>
                  {gender === t(userLanguage, "travelProtection.content.preferNotToSay") && (
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

      {/* Civil Status Selection Modal */}
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
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "travelProtection.modals.selectCivilStatus")}</Text>
                <TouchableOpacity onPress={() => setOpenCivilStatus(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus(t(userLanguage, "travelProtection.content.single"));
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.single")}</Text>
                  </View>
                  {civilStatus === t(userLanguage, "travelProtection.content.single") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus(t(userLanguage, "travelProtection.content.married"));
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.married")}</Text>
                  </View>
                  {civilStatus === t(userLanguage, "travelProtection.content.married") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus(t(userLanguage, "travelProtection.content.legallySeparated"));
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.legallySeparated")}</Text>
                  </View>
                  {civilStatus === t(userLanguage, "travelProtection.content.legallySeparated") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus(t(userLanguage, "travelProtection.content.divorced"));
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.divorced")}</Text>
                  </View>
                  {civilStatus === t(userLanguage, "travelProtection.content.divorced") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus(t(userLanguage, "travelProtection.content.annulled"));
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.annulled")}</Text>
                  </View>
                  {civilStatus === t(userLanguage, "travelProtection.content.annulled") && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCivilStatus(t(userLanguage, "travelProtection.content.widow"));
                    setOpenCivilStatus(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "travelProtection.content.widow")}</Text>
                  </View>
                  {civilStatus === t(userLanguage, "travelProtection.content.widow") && (
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

  // Step Indicator - Ultra Compact style
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  stepIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
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
    fontSize: 10,
    fontWeight: "bold",
    color: "#999",
  },
  stepNumberActive: {
    color: "white",
  },
  stepLine: {
    width: 30,
    height: 1.5,
    backgroundColor: "#e8e8e8",
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

  // Review Card
  reviewCard: {
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
  reviewSection: {
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  reviewDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
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
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginRight: 8,
  },

  // Progress Indicator
  progressContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  progressSteps: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  progressStep: {
    alignItems: "center",
    flex: 1,
  },
  progressStepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  progressStepActive: {
    backgroundColor: Colors.redTheme.background,
  },
  progressStepLabel: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 12,
  },
  progressStepLabelActive: {
    color: Colors.redTheme.background,
    fontWeight: "bold",
  },

  // Info Card
  infoCard: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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

  // Pricing Card
  pricingCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  pricingContent: {
    alignItems: "center",
  },
  pricingAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 8,
  },
  pricingNote: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },

  // Form Card
  formCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
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
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    textAlignVertical: "top",
  },

  // Date/Time Input
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

  // Upload Styles
  uploadButton: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 20,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadContent: {
    alignItems: "center",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    resizeMode: "cover",
  },

  // Disclaimer Card
  disclaimerCard: {
    backgroundColor: "rgba(255, 152, 0, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  loadingIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Legacy styles compatibility
  addressInput: {
    // Replaced by textArea
  },
  image: {
    // Replaced by uploadedImage
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
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 0,
    width: "92%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fafbfc",
    position: "relative",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
    textAlign: "center",
    paddingRight: 40,
    paddingLeft: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  optionText: {
    fontSize: 17,
    color: "#222",
    fontWeight: "500",
  },
  checkmarkCircle: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
