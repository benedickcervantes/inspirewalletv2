import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Clipboard,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation, useRouter } from "expo-router";
import { auth, firestore, storage } from "../../configs/firebase";
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { validatePhoneNumber, getMaxLength } from "../../utils/phoneValidationUtils";

// IMMEDIATE LOG - This should show up as soon as file is loaded
console.log("═══════════════════════════════════════");
console.log("📱 PERSONAL.JSX FILE LOADED");
console.log("═══════════════════════════════════════");

export default function Personal() {
  console.log("🚀 PERSONAL COMPONENT FUNCTION CALLED");
  const navigation = useNavigation();
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempLastName, setTempLastName] = useState("");
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [tempCompanyName, setTempCompanyName] = useState("");
  const [isEditingLine, setIsEditingLine] = useState(false);
  const [tempLineAccountLink, setTempLineAccountLink] = useState("");
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [tempContactNumber, setTempContactNumber] = useState("");
  // Contact number with country code support
  const COUNTRY_OPTIONS = [
    { code: "+81", label: "Japan", flag: "🇯🇵" },
    { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+82", label: "Korea (South Korea)", flag: "🇰🇷" },
    { code: "+1", label: "America (United States)", flag: "🇺🇸" },
    { code: "+63", label: "Philippines", flag: "🇵🇭" },
  ];
  const [selectedCountryCode, setSelectedCountryCode] = useState("+63");
  const [localContactNumber, setLocalContactNumber] = useState("");
  const [contactNumberError, setContactNumberError] = useState("");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [tempLanguage, setTempLanguage] = useState("");
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [agentReferrerInfo, setAgentReferrerInfo] = useState(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  
  // Business Requirements Modal state
  const [showBusinessRequirementsModal, setShowBusinessRequirementsModal] = useState(false);
  const [commercialRegister, setCommercialRegister] = useState(null);
  const [bankStatement, setBankStatement] = useState(null);
  const [proofOfBilling, setProofOfBilling] = useState(null);
  const [uploadingBusinessDocuments, setUploadingBusinessDocuments] = useState(false);

  // Language options
  const languageOptions = ["English", "Japanese", "Saudi Arabia", "Korea"];

  useEffect(() => {
    console.log("========================================");
    console.log("=== Personal Component Mounted ===");
    console.log("========================================");
    console.log("Business Requirements Modal state:", showBusinessRequirementsModal);
    console.log("User data loaded:", !!userData);
    console.log("Company name:", userData?.company || "N/A");
    const user = auth.currentUser;
    if (!user) {
      console.log("No user found, redirecting to register");
      navigation.replace("/register");
      return;
    }
    console.log("User authenticated:", user.uid);

    const userRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  // Force re-render when language changes
  useEffect(() => {
    // This will trigger a re-render when preferredLanguage changes
    if (userData.preferredLanguage) {
      // Update local state to reflect the change immediately
      setUserData(prev => ({ ...prev, preferredLanguage: userData.preferredLanguage }));
    }
  }, [userData.preferredLanguage]);

  // Fetch agent referrer information
  useEffect(() => {
    const fetchAgentReferrer = async () => {
      // Fetch for both agents and investors
      if (!userData) {
        setAgentReferrerInfo(null);
        return;
      }

      // For agents, parse their agentCode
      if (userData.agent && userData.agentCode && userData.agentCode !== "0" && userData.agentCode !== "pending") {
        setLoadingReferrer(true);
        try {
          const agentCodeParts = userData.agentCode.split("-");
          
          // Check if this is a Master Agent (format: ABC12-00000-00000)
          if (agentCodeParts.length === 3 && agentCodeParts[1] === "00000" && agentCodeParts[2] === "00000") {
            setAgentReferrerInfo({
              type: "Master Agent",
              name: "Master Agent",
              agentNumber: agentCodeParts[0],
            });
            setLoadingReferrer(false);
            return;
          }

          // For sub-agents, determine the referrer
          let referrerAgentNumber = null;
          let referrerType = null;

          // If format is ABC12-XYZ34-00000, this is an Agent under a Master Agent
          if (agentCodeParts.length === 3 && agentCodeParts[2] === "00000") {
            referrerAgentNumber = agentCodeParts[0]; // Master Agent number
            referrerType = "Master Agent";
          }
          // If format is ABC12-XYZ34-DEF56, this is a Consultant Agent under an Agent
          else if (agentCodeParts.length === 3 && agentCodeParts[2] !== "00000") {
            referrerAgentNumber = agentCodeParts[1]; // Agent number (or Consultant Agent)
            referrerType = "Agent";
          }

          // Fetch referrer information from Firestore
          if (referrerAgentNumber) {
            const usersRef = collection(firestore, "users");
            const q = query(usersRef, where("agentNumber", "==", referrerAgentNumber));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const referrerData = querySnapshot.docs[0].data();
              setAgentReferrerInfo({
                type: referrerType,
                name: `${referrerData.firstName || ""} ${referrerData.lastName || ""}`.trim(),
                agentNumber: referrerAgentNumber,
              });
            } else {
              // If referrer not found with agent number, they might be a Consultant Agent too
              // Try to find them by checking if their agentCode contains this number in the middle position
              const allAgentsQuery = query(usersRef, where("agent", "==", true));
              const allAgentsSnapshot = await getDocs(allAgentsQuery);
              
              let consultantReferrerFound = false;
              allAgentsSnapshot.forEach((doc) => {
                const agentData = doc.data();
                if (agentData.agentCode && agentData.agentCode !== "0" && agentData.agentCode !== "pending") {
                  const parts = agentData.agentCode.split("-");
                  // Check if this agent's middle segment matches our search (consultant agent)
                  if (parts.length === 3 && parts[1] === referrerAgentNumber && parts[2] !== "00000") {
                    setAgentReferrerInfo({
                      type: "Consultant Agent",
                      name: `${agentData.firstName || ""} ${agentData.lastName || ""}`.trim(),
                      agentNumber: agentData.agentNumber,
                      note: t(userData.preferredLanguage || 'English', 'personal.values.consultantAgentNote'),
                    });
                    consultantReferrerFound = true;
                  }
                }
              });

              if (!consultantReferrerFound) {
                // If still not found, show not found message
                setAgentReferrerInfo({
                  type: referrerType,
                  name: t(userData.preferredLanguage || 'English', 'personal.values.notFound'),
                  agentNumber: referrerAgentNumber,
                });
              }
            }
          } else {
            setAgentReferrerInfo(null);
          }
        } catch (error) {
          console.error("Error fetching agent referrer:", error);
          setAgentReferrerInfo(null);
        } finally {
          setLoadingReferrer(false);
        }
      }
      // For investors, check if they have a refferedAgent field
      else if (!userData.agent && userData.refferedAgent && userData.refferedAgent !== "0") {
        setLoadingReferrer(true);
        try {
          const usersRef = collection(firestore, "users");
          const q = query(usersRef, where("agentNumber", "==", userData.refferedAgent));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const referrerData = querySnapshot.docs[0].data();
            setAgentReferrerInfo({
              type: "Agent",
              name: `${referrerData.firstName || ""} ${referrerData.lastName || ""}`.trim(),
              agentNumber: userData.refferedAgent,
            });
          } else {
            setAgentReferrerInfo({
              type: "Agent",
              name: t(userData.preferredLanguage || 'English', 'personal.values.notFound'),
              agentNumber: userData.refferedAgent,
            });
          }
        } catch (error) {
          console.error("Error fetching investor referrer:", error);
          setAgentReferrerInfo(null);
        } finally {
          setLoadingReferrer(false);
        }
      } else {
        setAgentReferrerInfo(null);
      }
    };

    fetchAgentReferrer();
  }, [userData.agent, userData.agentCode, userData.refferedAgent]);

  console.log("Personal Component: Checking loading state...", loading);

  if (loading) {
    console.log("Personal Component: Still loading, showing loading screen");
    return (
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t(userData.preferredLanguage || 'English', 'personal.loading.text')}</Text>
        </View>
      </ImageBackground>
    );
  }

  console.log("Personal Component: Loading complete! Rendering main UI");

  const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  const accountType = userData.agent ? "Agent" : "Investor";
  const agentNumber = userData.agentNumber || "N/A";

  // Function to start editing name
  const startEditingName = () => {
    setTempFirstName(userData.firstName || "");
    setTempLastName(userData.lastName || "");
    setIsEditingName(true);
  };

  // Function to save name changes
  const saveNameChanges = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        firstName: tempFirstName.trim(),
        lastName: tempLastName.trim(),
      });

      setIsEditingName(false);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.success.nameUpdated'),
        type: "success",
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Error updating name:", error);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.nameUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel name editing
  const cancelNameEditing = () => {
    setIsEditingName(false);
    setTempFirstName("");
    setTempLastName("");
  };

  // Function to start editing company name
  const startEditingCompany = () => {
    setTempCompanyName(userData.company || "");
    setIsEditingCompany(true);
  };

  // Function to save company name changes
  const saveCompanyChanges = async () => {
    try {
      console.log("saveCompanyChanges: Starting...");
      const user = auth.currentUser;
      if (!user) {
        console.log("saveCompanyChanges: No user found");
        return;
      }

      // Check if company name is being added (was empty/null, now has value)
      const previousCompany = userData.company || "";
      const newCompany = tempCompanyName.trim();
      const isAddingCompany = (!previousCompany || previousCompany.trim() === "") && newCompany !== "";
      
      console.log("saveCompanyChanges: Previous company:", previousCompany);
      console.log("saveCompanyChanges: New company:", newCompany);
      console.log("saveCompanyChanges: Is adding company:", isAddingCompany);

      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        company: newCompany,
      });

      console.log("saveCompanyChanges: Company updated in Firestore");

      setIsEditingCompany(false);
      
      // If company name was added, show Business Requirements modal
      if (isAddingCompany) {
        console.log("saveCompanyChanges: Showing Business Requirements modal");
        setShowBusinessRequirementsModal(true);
      } else {
        console.log("saveCompanyChanges: Showing success modal");
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.success.companyUpdated'),
          type: "success",
          confirmText: "OK",
        });
      }
    } catch (error) {
      console.error("Error updating company name:", error);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.companyUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel company name editing
  const cancelCompanyEditing = () => {
    setIsEditingCompany(false);
    setTempCompanyName("");
  };

  // Function to start editing LINE account link
  const startEditingLine = () => {
    setTempLineAccountLink(userData.lineAccountLink || "");
    setIsEditingLine(true);
  };

  // Function to save LINE account link changes
  const saveLineAccountLinkChanges = async () => {
    try {
      const newLineLink = tempLineAccountLink.trim();

      if (!newLineLink) {
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.warning.missingContactInfo'),
          type: "warning",
          confirmText: "OK",
        });
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        lineAccountLink: newLineLink,
      });

      setIsEditingLine(false);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.success.lineUpdated'),
        type: "success",
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Error updating LINE account link:", error);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.lineUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel LINE account link editing
  const cancelLineEditing = () => {
    setIsEditingLine(false);
    setTempLineAccountLink("");
  };

  // Function to start editing contact number
  const startEditingContact = () => {
    const currentContact = userData.contactNumber || "";
    setTempContactNumber(currentContact);
    setContactNumberError(""); // Reset error when starting edit
    
    // Parse existing contact number to extract country code and local number
    if (currentContact) {
      const matchedCountry = COUNTRY_OPTIONS.find(country => 
        currentContact.startsWith(country.code)
      );
      
      if (matchedCountry) {
        setSelectedCountryCode(matchedCountry.code);
        // Extract local number (remove country code and trim)
        const local = currentContact.substring(matchedCountry.code.length).trim();
        setLocalContactNumber(local);
      } else {
        // Default to Philippines if no match
        setSelectedCountryCode("+63");
        setLocalContactNumber(currentContact);
      }
    } else {
      setSelectedCountryCode("+63");
      setLocalContactNumber("");
    }
    
    setIsEditingContact(true);
  };

  // Function to save contact number changes
  const saveContactNumberChanges = async () => {
    try {
      const newContactNumber = tempContactNumber.trim();

      // If contact number is empty, it's allowed - just check country code exists
      if (!newContactNumber && !localContactNumber.trim()) {
        // Allow saving empty contact number
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, {
          contactNumber: "",
        });

        setIsEditingContact(false);
        setLocalContactNumber("");
        setContactNumberError("");
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.success.contactUpdated'),
          type: "success",
          confirmText: "OK",
        });
        return;
      }

      // If user entered something, validate it
      if (localContactNumber.trim()) {
        const validation = validatePhoneNumber(localContactNumber, selectedCountryCode);
        if (!validation.isValid) {
          setContactNumberError(validation.error);
          return;
        }
      }

      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        contactNumber: newContactNumber,
      });

      setIsEditingContact(false);
      setLocalContactNumber("");
      setContactNumberError("");
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.success.contactUpdated'),
        type: "success",
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Error updating contact number:", error);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.contactUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel contact number editing
  const cancelContactEditing = () => {
    setIsEditingContact(false);
    setTempContactNumber("");
    setLocalContactNumber("");
    setContactNumberError("");
    setSelectedCountryCode("+63");
  };

  // Function to copy account number to clipboard
  const copyAccountNumber = async () => {
    try {
      const accountNumber = userData.accountNumber || t(userData.preferredLanguage || 'English', 'personal.values.notProvided');
      if (accountNumber !== t(userData.preferredLanguage || 'English', 'personal.values.notProvided')) {
        await Clipboard.setString(accountNumber);
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.copied'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.success.copied'),
          type: "success",
          confirmText: "OK",
        });
      } else {
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.noAccountNumber'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.warning.noAccountNumber'),
          type: "warning",
          confirmText: "OK",
        });
      }
    } catch (error) {
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.copyFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to start editing language
  const startEditingLanguage = () => {
    setTempLanguage(userData.preferredLanguage || "English");
    setIsEditingLanguage(true);
  };

  // Function to save language changes
  const saveLanguageChanges = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Start loading state
      setIsChangingLanguage(true);

      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        preferredLanguage: tempLanguage,
      });

      setIsEditingLanguage(false);
      
      // Wait 5 seconds to ensure the language change is processed and loaded
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Stop loading state
      setIsChangingLanguage(false);
      
      // Show success message and then navigate to main page
      showModal({
        title: t(tempLanguage || 'English', 'personal.messages.titles.success'),
        message: t(tempLanguage || 'English', 'personal.messages.success.languageUpdated'),
        type: "success",
        confirmText: "OK",
        onConfirm: () => {
          hideModal();
          // Navigate to main page with the new language
          router.push("/main");
        },
      });
    } catch (error) {
      console.error("Error updating language preference:", error);
      setIsChangingLanguage(false); // Stop loading on error
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.languageUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel language editing
  const cancelLanguageEditing = () => {
    setIsEditingLanguage(false);
    setTempLanguage("");
  };

  // Function to pick PDF document
  const pickPDFDocument = async (documentType) => {
    try {
      console.log(`pickPDFDocument: Starting for ${documentType}`);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log("pickPDFDocument: Document picker result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("pickPDFDocument: Selected file:", file.name, "MIME type:", file.mimeType);
        
        // Validate PDF file
        if (file.mimeType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          console.log("pickPDFDocument: Invalid file type");
          showModal({
            title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
            message: 'Please select a PDF file only.',
            type: "error",
            confirmText: "OK",
          });
          return;
        }

        // Set the selected file based on document type
        console.log(`pickPDFDocument: Setting file for ${documentType}`);
        if (documentType === 'commercialRegister') {
          setCommercialRegister(file);
        } else if (documentType === 'bankStatement') {
          setBankStatement(file);
        } else if (documentType === 'proofOfBilling') {
          setProofOfBilling(file);
        }
        console.log(`pickPDFDocument: File set successfully for ${documentType}`);
      } else {
        console.log("pickPDFDocument: User canceled or no file selected");
      }
    } catch (error) {
      console.error("Error picking PDF document:", error);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: 'Failed to select PDF file. Please try again.',
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to remove selected PDF document
  const removePDFDocument = (documentType) => {
    if (documentType === 'commercialRegister') {
      setCommercialRegister(null);
    } else if (documentType === 'bankStatement') {
      setBankStatement(null);
    } else if (documentType === 'proofOfBilling') {
      setProofOfBilling(null);
    }
  };

  // Function to upload business document to Firebase Storage
  const uploadBusinessDocument = async (file, documentType) => {
    try {
      console.log(`uploadBusinessDocument: Starting upload for ${documentType}`);
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const fileName = `${documentType}_${user.uid}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `businessDocuments/${user.uid}/${fileName}`);
      console.log(`uploadBusinessDocument: Storage path: businessDocuments/${user.uid}/${fileName}`);

      // Convert file URI to blob
      console.log(`uploadBusinessDocument: Fetching file from URI: ${file.uri}`);
      const response = await fetch(file.uri);
      const blob = await response.blob();
      console.log(`uploadBusinessDocument: Blob created, size: ${blob.size} bytes`);

      // Upload the file
      console.log(`uploadBusinessDocument: Uploading to Firebase Storage...`);
      const snapshot = await uploadBytes(storageRef, blob);
      console.log(`uploadBusinessDocument: Upload complete, getting download URL...`);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`uploadBusinessDocument: Download URL obtained for ${documentType}`);
      
      return downloadURL;
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      throw error;
    }
  };

  // Function to save business documents
  const saveBusinessDocuments = async () => {
    console.log("saveBusinessDocuments: Starting...");
    console.log("saveBusinessDocuments: commercialRegister:", !!commercialRegister);
    console.log("saveBusinessDocuments: bankStatement:", !!bankStatement);
    console.log("saveBusinessDocuments: proofOfBilling:", !!proofOfBilling);

    if (!commercialRegister || !bankStatement || !proofOfBilling) {
      console.log("saveBusinessDocuments: Missing documents");
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: 'Please upload all three business documents.',
        type: "error",
        confirmText: "OK",
      });
      return;
    }

    setUploadingBusinessDocuments(true);
    console.log("saveBusinessDocuments: Upload started");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log("saveBusinessDocuments: Uploading commercial register...");
      // Upload all three documents
      const commercialRegisterUrl = await uploadBusinessDocument(commercialRegister, 'commercialRegister');
      console.log("saveBusinessDocuments: Commercial register uploaded:", commercialRegisterUrl);

      console.log("saveBusinessDocuments: Uploading bank statement...");
      const bankStatementUrl = await uploadBusinessDocument(bankStatement, 'bankStatement');
      console.log("saveBusinessDocuments: Bank statement uploaded:", bankStatementUrl);

      console.log("saveBusinessDocuments: Uploading proof of billing...");
      const proofOfBillingUrl = await uploadBusinessDocument(proofOfBilling, 'proofOfBilling');
      console.log("saveBusinessDocuments: Proof of billing uploaded:", proofOfBillingUrl);

      // Update Firestore user document with document URLs
      console.log("saveBusinessDocuments: Updating Firestore...");
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        businessDocuments: {
          commercialRegisterUrl,
          bankStatementUrl,
          proofOfBillingUrl,
        }
      });
      console.log("saveBusinessDocuments: Firestore updated successfully");

      // Create business documents KYC request
      console.log("saveBusinessDocuments: Creating businessDocumentsKYC request...");
      const businessKycData = {
        userId: user.uid,
        userEmail: userData.emailAddress || user.email,
        companyName: userData.company || '',
        status: 'pending',
        submittedAt: serverTimestamp(),
        documents: {
          commercialRegisterUrl,
          bankStatementUrl,
          proofOfBillingUrl,
        },
        userInfo: {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
        }
      };

      const businessKycRef = collection(firestore, 'businessDocumentsKYC');
      await addDoc(businessKycRef, businessKycData);
      console.log("saveBusinessDocuments: businessDocumentsKYC request created successfully");

      setUploadingBusinessDocuments(false);
      setShowBusinessRequirementsModal(false);
      
      // Reset document states
      setCommercialRegister(null);
      setBankStatement(null);
      setProofOfBilling(null);

      console.log("saveBusinessDocuments: Success!");
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.success.businessDocumentsUploaded'),
        type: "success",
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Error saving business documents:", error);
      setUploadingBusinessDocuments(false);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: 'Failed to upload business documents. Please try again.',
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel business requirements modal
  const cancelBusinessRequirements = () => {
    setShowBusinessRequirementsModal(false);
    setCommercialRegister(null);
    setBankStatement(null);
    setProofOfBilling(null);
  };

  // Debug log before render
  console.log("=== Personal Component Rendering ===");
  console.log("showBusinessRequirementsModal:", showBusinessRequirementsModal);
  console.log("userData.company:", userData.company);

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.redTheme.background} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
              {t(userData.preferredLanguage || 'English', 'personal.header.title')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Hero Profile Section */}
          <View style={styles.heroCard}>
            <View style={styles.profileIconContainer}>
              <View style={styles.profileIconInner}>
                <Ionicons name="person" size={48} color={Colors.redTheme.background} />
              </View>
            </View>
            <Text style={[styles.profileName, getRTLStyles(userData.preferredLanguage || 'English')]}>
              {fullName || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
            </Text>
            <Text style={styles.profileEmail}>{userData.emailAddress || ""}</Text>
            <View style={styles.profileBadges}>
              <View style={[styles.badge, { backgroundColor: accountType === "Agent" ? "#e74c3c" : "#27ae60" }]}>
                <Ionicons 
                  name={accountType === "Agent" ? "briefcase" : "wallet"} 
                  size={12} 
                  color="white" 
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{accountType}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: userData.accountType === "Premium" ? "#f39c12" : "#95a5a6" }]}>
                <Ionicons 
                  name={userData.accountType === "Premium" ? "diamond" : "star"} 
                  size={12} 
                  color="white" 
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>{userData.accountType || t(userData.preferredLanguage || 'English', 'personal.values.basic')}</Text>
              </View>
            </View>
          </View>

          {/* Personal Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="person-outline" size={24} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.cardTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
                {t(userData.preferredLanguage || 'English', 'personal.cards.accountDetails.title')}
              </Text>
            </View>

          <View style={styles.infoContainer}>
            {/* Name */}
            {!isEditingName ? (
              <TouchableOpacity 
                style={styles.infoRowTouchable}
                onPress={startEditingName}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowVertical}>
                  <View style={styles.infoLabelVertical}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name="person" size={18} color={Colors.redTheme.background} />
                    </View>
                    <Text style={[styles.labelTextVertical, getRTLStyles(userData.preferredLanguage || 'English')]}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.name')}
                    </Text>
                  </View>
                  <View style={styles.valueContainerVertical}>
                    <Text style={styles.valueTextVertical}>
                      {fullName || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
                    </Text>
                    <View style={styles.editIconWrapper}>
                      <Ionicons name="create-outline" size={18} color="#999" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.editSection}>
                <View style={styles.editHeader}>
                  <Text style={styles.editSectionTitle}>
                    {t(userData.preferredLanguage || 'English', 'personal.buttons.editName')}
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>
                      {t(userData.preferredLanguage || 'English', 'personal.placeholders.firstName') || 'First Name'}
                    </Text>
                    <TextInput
                      style={styles.modernInput}
                      value={tempFirstName}
                      onChangeText={setTempFirstName}
                      placeholder={t(userData.preferredLanguage || 'English', 'personal.placeholders.firstName') || 'First Name'}
                      placeholderTextColor="#bbb"
                      autoFocus
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>
                      {t(userData.preferredLanguage || 'English', 'personal.placeholders.lastName') || 'Last Name'}
                    </Text>
                    <TextInput
                      style={styles.modernInput}
                      value={tempLastName}
                      onChangeText={setTempLastName}
                      placeholder={t(userData.preferredLanguage || 'English', 'personal.placeholders.lastName') || 'Last Name'}
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveActionButton]}
                    onPress={saveNameChanges}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.save')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelActionButton]}
                    onPress={cancelNameEditing}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Company Name */}
            {!isEditingCompany ? (
              <TouchableOpacity 
                style={styles.infoRowTouchable}
                onPress={startEditingCompany}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowVertical}>
                  <View style={styles.infoLabelVertical}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name="business" size={18} color={Colors.redTheme.background} />
                    </View>
                    <Text style={[styles.labelTextVertical, getRTLStyles(userData.preferredLanguage || 'English')]}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.companyName')}
                    </Text>
                  </View>
                  <View style={styles.valueContainerVertical}>
                    <Text style={styles.valueTextVertical}>
                      {userData.company || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
                    </Text>
                    <View style={styles.editIconWrapper}>
                      <Ionicons name="create-outline" size={18} color="#999" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.editSection}>
                <View style={styles.editHeader}>
                  <Text style={styles.editSectionTitle}>
                    {t(userData.preferredLanguage || 'English', 'personal.fields.editCompanyName')}
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.companyName')}
                    </Text>
                    <TextInput
                      style={styles.modernInput}
                      value={tempCompanyName}
                      onChangeText={setTempCompanyName}
                      placeholder={t(userData.preferredLanguage || 'English', 'personal.placeholders.companyName') || 'Company Name'}
                      placeholderTextColor="#bbb"
                      autoFocus
                    />
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.saveActionButton,
                      !tempCompanyName.trim() && styles.disabledActionButton
                    ]}
                    onPress={saveCompanyChanges}
                    activeOpacity={0.7}
                    disabled={!tempCompanyName.trim()}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.save')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelActionButton]}
                    onPress={cancelCompanyEditing}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* LINE Account Link */}
            {!isEditingLine ? (
              <TouchableOpacity
                style={styles.infoRowTouchable}
                onPress={startEditingLine}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowVertical}>
                  <View style={styles.infoLabelVertical}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name="link" size={18} color={Colors.redTheme.background} />
                    </View>
                    <Text style={[styles.labelTextVertical, getRTLStyles(userData.preferredLanguage || 'English')]}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.lineAccountLink')}
                    </Text>
                  </View>
                  <View style={styles.valueContainerVertical}>
                    <Text style={styles.valueTextVertical} numberOfLines={2}>
                      {userData.lineAccountLink || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
                    </Text>
                    <View style={styles.editIconWrapper}>
                      <Ionicons name="create-outline" size={18} color="#999" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.editSection}>
                <View style={styles.editHeader}>
                  <Text style={styles.editSectionTitle}>
                    {t(userData.preferredLanguage || 'English', 'personal.fields.lineAccountLink')}
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.lineAccountLink')}
                    </Text>
                    <TextInput
                      style={styles.modernInput}
                      value={tempLineAccountLink}
                      onChangeText={setTempLineAccountLink}
                      placeholder="https://line.me/ti/p/..."
                      placeholderTextColor="#bbb"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.saveActionButton,
                      (!tempLineAccountLink.trim() ||
                        tempLineAccountLink.trim() === (userData.lineAccountLink || "")) && styles.disabledActionButton
                    ]}
                    onPress={saveLineAccountLinkChanges}
                    activeOpacity={0.7}
                    disabled={
                      !tempLineAccountLink.trim() ||
                      tempLineAccountLink.trim() === (userData.lineAccountLink || "")
                    }
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.save')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelActionButton]}
                    onPress={cancelLineEditing}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Contact Number */}
            {!isEditingContact ? (
              <TouchableOpacity
                style={styles.infoRowTouchable}
                onPress={startEditingContact}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowVertical}>
                  <View style={styles.infoLabelVertical}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name="call" size={18} color={Colors.redTheme.background} />
                    </View>
                    <Text style={[styles.labelTextVertical, getRTLStyles(userData.preferredLanguage || 'English')]}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.contactNumber')}
                    </Text>
                  </View>
                  <View style={styles.valueContainerVertical}>
                    <Text style={styles.valueTextVertical}>
                      {userData.contactNumber || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
                    </Text>
                    <View style={styles.editIconWrapper}>
                      <Ionicons name="create-outline" size={18} color="#999" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.editSection}>
                <View style={styles.editHeader}>
                  <Text style={styles.editSectionTitle}>
                    {t(userData.preferredLanguage || 'English', 'personal.fields.contactNumber')}
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.contactNumber')}
                    </Text>
                    <View style={styles.phoneInputContainer}>
                      {/* Country selector button */}
                      <TouchableOpacity
                        style={styles.countrySelectorButton}
                        onPress={() => setIsCountryModalVisible(true)}
                      >
                        <Text style={styles.countrySelectorFlag}>
                          {COUNTRY_OPTIONS.find(c => c.code === selectedCountryCode)?.flag}
                        </Text>
                        <Text style={styles.countrySelectorText}>
                          {selectedCountryCode}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={Colors.redTheme.background}
                        />
                      </TouchableOpacity>
                      
                      {/* Phone number input */}
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="901 234 5678"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        value={localContactNumber}
                        maxLength={getMaxLength(selectedCountryCode)}
                        onChangeText={(value) => {
                          const sanitized = value.replace(/[^\d\s]/g, "");
                          setLocalContactNumber(sanitized);
                          const combined =
                            selectedCountryCode +
                            (sanitized ? " " + sanitized : "");
                          setTempContactNumber(combined);
                          
                          // Real-time validation
                          if (sanitized.trim()) {
                            const validation = validatePhoneNumber(sanitized, selectedCountryCode);
                            setContactNumberError(validation.error || "");
                          } else {
                            setContactNumberError("");
                          }
                        }}
                      />
                    </View>
                    {/* Error message display */}
                    {contactNumberError ? (
                      <Text style={styles.errorText}>{contactNumberError}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.saveActionButton,
                      (!tempContactNumber.trim() || !!contactNumberError ||
                        tempContactNumber.trim() === (userData.contactNumber || "")) && styles.disabledActionButton
                    ]}
                    onPress={saveContactNumberChanges}
                    activeOpacity={0.7}
                    disabled={
                      !tempContactNumber.trim() || !!contactNumberError ||
                      tempContactNumber.trim() === (userData.contactNumber || "")
                    }
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.save')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelActionButton]}
                    onPress={cancelContactEditing}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Account Number */}
            <View style={styles.infoRowVertical}>
              <View style={styles.infoLabelVertical}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="card" size={18} color={Colors.redTheme.background} />
                </View>
                <Text style={styles.labelTextVertical}>
                  {t(userData.preferredLanguage || 'English', 'personal.fields.accountNumber')}
                </Text>
              </View>
              <View style={styles.valueContainerVertical}>
                <Text style={styles.valueTextVertical}>
                  {userData.accountNumber || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyAccountNumber}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={18} color={Colors.redTheme.background} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Type */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="briefcase" size={18} color={Colors.redTheme.background} />
                </View>
                <Text style={styles.labelText}>
                  {t(userData.preferredLanguage || 'English', 'personal.fields.accountType')}
                </Text>
              </View>
              <View style={[styles.badgeContainer, { backgroundColor: accountType === "Agent" ? "rgba(231, 76, 60, 0.1)" : "rgba(39, 174, 96, 0.1)" }]}>
                <Text style={[
                  styles.badgeValueText,
                  { color: accountType === "Agent" ? "#e74c3c" : "#27ae60" }
                ]}>
                  {accountType}
                </Text>
              </View>
            </View>

            {/* Account Level (Basic/Premium) */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="star" size={18} color={Colors.redTheme.background} />
                </View>
                <Text style={styles.labelText}>
                  {t(userData.preferredLanguage || 'English', 'personal.fields.accountLevel')}
                </Text>
              </View>
              <View style={styles.accountLevelContainer}>
                <View style={[styles.badgeContainer, { backgroundColor: userData.accountType === "Premium" ? "rgba(243, 156, 18, 0.1)" : "rgba(149, 165, 166, 0.1)" }]}>
                  <Text style={[
                    styles.badgeValueText,
                    { color: userData.accountType === "Premium" ? "#f39c12" : "#95a5a6" }
                  ]}>
                    {userData.accountType || t(userData.preferredLanguage || 'English', 'personal.values.basic')}
                  </Text>
                </View>
                {/* Upgrade to Premium Button - Show when KYC is not approved */}
                {!userData.kycApproved && (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={() => {
                      router.push("/inspirekyc");
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="diamond" size={14} color="#fff" />
                    <Text style={styles.upgradeButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.verify')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Agent Number (only show if account type is Agent) */}
            {accountType === "Agent" && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <View style={styles.iconWrapper}>
                    <Ionicons name="id-card" size={18} color={Colors.redTheme.background} />
                  </View>
                  <Text style={styles.labelText}>
                    {t(userData.preferredLanguage || 'English', 'personal.fields.agentNumber')}
                  </Text>
                </View>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">{agentNumber}</Text>
                </View>
              </View>
            )}

            {/* Agent Referrer (show for both Agents and Investors) */}
            {agentReferrerInfo !== null && (
              <View style={styles.infoRowVertical}>
                <View style={styles.infoLabelVertical}>
                  <View style={styles.iconWrapper}>
                    <Ionicons name="people" size={18} color={Colors.redTheme.background} />
                  </View>
                  <Text style={styles.labelTextVertical}>
                    {t(userData.preferredLanguage || 'English', 'personal.fields.agentReferrer')}
                  </Text>
                </View>
                {loadingReferrer ? (
                  <ActivityIndicator size="small" color={Colors.redTheme.background} />
                ) : agentReferrerInfo ? (
                  <View style={styles.referrerContainerVertical}>
                    {agentReferrerInfo.type === "Master Agent" && agentReferrerInfo.name === "Master Agent" ? (
                      <View style={[styles.badgeContainer, { backgroundColor: "rgba(243, 156, 18, 0.1)" }]}>
                        <Text style={[styles.badgeValueText, { color: "#f39c12" }]}>
                          {t(userData.preferredLanguage || 'English', 'personal.values.masterAgent')}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.valueTextVertical}>
                          {agentReferrerInfo.name}
                        </Text>
                        {agentReferrerInfo.type === "Consultant Agent" && (
                          <View style={styles.consultantBadge}>
                            <Text style={styles.consultantBadgeText}>
                              {t(userData.preferredLanguage || 'English', 'personal.values.consultantAgent')}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ) : (
                  <Text style={styles.valueTextVertical}>
                    {t(userData.preferredLanguage || 'English', 'personal.values.notAvailable')}
                  </Text>
                )}
              </View>
            )}

            {/* Agent Referrer Note (only show if note exists) */}
            {agentReferrerInfo && agentReferrerInfo.note && (
              <View style={styles.noteContainer}>
                <Ionicons name="information-circle" size={14} color="#3498db" />
                <Text style={styles.noteText}>{agentReferrerInfo.note}</Text>
              </View>
            )}

            {/* Language Preference */}
            {!isEditingLanguage ? (
              <TouchableOpacity 
                style={styles.infoRowTouchable}
                onPress={startEditingLanguage}
                activeOpacity={0.7}
              >
                <View style={styles.infoRowVertical}>
                  <View style={styles.infoLabelVertical}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name="language" size={18} color={Colors.redTheme.background} />
                    </View>
                    <Text style={styles.labelTextVertical}>
                      {t(userData.preferredLanguage || 'English', 'personal.fields.language')}
                    </Text>
                  </View>
                  <View style={styles.valueContainerVertical}>
                    <Text style={styles.valueTextVertical}>
                      {userData.preferredLanguage || "English"}
                    </Text>
                    <View style={styles.editIconWrapper}>
                      <Ionicons name="create-outline" size={18} color="#999" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.editSection}>
                <View style={styles.editHeader}>
                  <Text style={styles.editSectionTitle}>
                    {t(userData.preferredLanguage || 'English', 'personal.buttons.selectLanguage')}
                  </Text>
                </View>
                <View style={styles.languageOptionsGrid}>
                  {languageOptions.map((language) => (
                    <TouchableOpacity
                      key={language}
                      style={[
                        styles.languageOptionCard,
                        tempLanguage === language && styles.selectedLanguageOptionCard
                      ]}
                      onPress={() => setTempLanguage(language)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.languageOptionText,
                        tempLanguage === language && styles.selectedLanguageOptionText
                      ]}>
                        {language}
                      </Text>
                      {tempLanguage === language && (
                        <View style={styles.checkmarkCircle}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.saveActionButton,
                      isChangingLanguage && styles.disabledActionButton
                    ]}
                    onPress={saveLanguageChanges}
                    activeOpacity={0.7}
                    disabled={isChangingLanguage}
                  >
                    {isChangingLanguage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                    <Text style={styles.saveActionButtonText}>
                      {isChangingLanguage 
                        ? t(userData.preferredLanguage || 'English', 'personal.buttons.changing') 
                        : t(userData.preferredLanguage || 'English', 'personal.buttons.save')
                      }
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.cancelActionButton,
                      isChangingLanguage && styles.disabledActionButton
                    ]}
                    onPress={cancelLanguageEditing}
                    activeOpacity={0.7}
                    disabled={isChangingLanguage}
                  >
                    <Text style={styles.cancelActionButtonText}>
                      {t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

          {/* Additional Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.cardTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
                {t(userData.preferredLanguage || 'English', 'personal.cards.accountStatus.title')}
              </Text>
            </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="checkmark-circle" size={18} color="#27ae60" />
                </View>
                <Text style={styles.labelText}>
                  {t(userData.preferredLanguage || 'English', 'personal.fields.status')}
                </Text>
              </View>
              <View style={[styles.badgeContainer, { backgroundColor: "rgba(39, 174, 96, 0.1)" }]}>
                <Text style={[styles.badgeValueText, { color: "#27ae60" }]}>
                  {t(userData.preferredLanguage || 'English', 'personal.values.active')}
                </Text>
              </View>
            </View>

            <View style={styles.infoRowVertical}>
              <View style={styles.infoLabelVertical}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="calendar" size={18} color={Colors.redTheme.background} />
                </View>
                <Text style={styles.labelTextVertical}>
                  {t(userData.preferredLanguage || 'English', 'personal.fields.memberSince')}
                </Text>
              </View>
              <Text style={styles.valueTextVertical}>
                {userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : t(userData.preferredLanguage || 'English', 'personal.values.notAvailable')}
              </Text>
            </View>
          </View>
        </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              try {
                await auth.signOut();
                router.replace("/welcome");
              } catch (error) {
                console.error("Error logging out:", error);
                showModal({
                  title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
                  message: "Failed to log out. Please try again.",
                  type: "error",
                  confirmText: "OK",
                });
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>
              {t(userData.preferredLanguage || 'English', 'personal.buttons.logout') || 'Log Out'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Modal for copy confirmation */}
      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={hideModal}
      />

      {/* Loading overlay for language change */}
      {isChangingLanguage && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.newYearTheme.text} />
            <Text style={styles.loadingText}>
              {t(userData.preferredLanguage || 'English', 'personal.loading.text')}
            </Text>
          </View>
        </View>
      )}

      {/* Business Requirements Modal */}
      <Modal
        visible={showBusinessRequirementsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelBusinessRequirements}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.businessModalContainer}>
            <View style={styles.businessModalHeader}>
              <Text style={[styles.businessModalTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
                Business Requirements
              </Text>
              <TouchableOpacity onPress={cancelBusinessRequirements}>
                <Ionicons name="close" size={24} color={Colors.redTheme.background} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.businessModalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.businessModalDescription, getRTLStyles(userData.preferredLanguage || 'English')]}>
                Please upload the following business documents in PDF format:
              </Text>

              {/* Commercial Register */}
              <View style={styles.businessDocumentSection}>
                <Text style={[styles.businessDocumentLabel, getRTLStyles(userData.preferredLanguage || 'English')]}>
                  Commercial Register *
                </Text>
                {commercialRegister ? (
                  <View style={styles.selectedFileContainer}>
                    <View style={styles.selectedFileInfo}>
                      <Ionicons name="document-text" size={24} color={Colors.redTheme.background} />
                      <Text style={styles.selectedFileName} numberOfLines={1} ellipsizeMode="middle">
                        {commercialRegister.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => removePDFDocument('commercialRegister')}
                    >
                      <Ionicons name="close-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectFileButton}
                    onPress={() => pickPDFDocument('commercialRegister')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-attach" size={24} color={Colors.redTheme.background} />
                    <Text style={styles.selectFileButtonText}>Select PDF File</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Bank Statement */}
              <View style={styles.businessDocumentSection}>
                <Text style={[styles.businessDocumentLabel, getRTLStyles(userData.preferredLanguage || 'English')]}>
                  Bank Statement *
                </Text>
                {bankStatement ? (
                  <View style={styles.selectedFileContainer}>
                    <View style={styles.selectedFileInfo}>
                      <Ionicons name="document-text" size={24} color={Colors.redTheme.background} />
                      <Text style={styles.selectedFileName} numberOfLines={1} ellipsizeMode="middle">
                        {bankStatement.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => removePDFDocument('bankStatement')}
                    >
                      <Ionicons name="close-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectFileButton}
                    onPress={() => pickPDFDocument('bankStatement')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-attach" size={24} color={Colors.redTheme.background} />
                    <Text style={styles.selectFileButtonText}>Select PDF File</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Proof of Billing */}
              <View style={styles.businessDocumentSection}>
                <Text style={[styles.businessDocumentLabel, getRTLStyles(userData.preferredLanguage || 'English')]}>
                  Proof of Billing *
                </Text>
                {proofOfBilling ? (
                  <View style={styles.selectedFileContainer}>
                    <View style={styles.selectedFileInfo}>
                      <Ionicons name="document-text" size={24} color={Colors.redTheme.background} />
                      <Text style={styles.selectedFileName} numberOfLines={1} ellipsizeMode="middle">
                        {proofOfBilling.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => removePDFDocument('proofOfBilling')}
                    >
                      <Ionicons name="close-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectFileButton}
                    onPress={() => pickPDFDocument('proofOfBilling')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-attach" size={24} color={Colors.redTheme.background} />
                    <Text style={styles.selectFileButtonText}>Select PDF File</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.businessModalActions}>
              <TouchableOpacity
                style={[styles.businessModalButton, styles.cancelBusinessButton]}
                onPress={cancelBusinessRequirements}
                disabled={uploadingBusinessDocuments}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBusinessButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.businessModalButton,
                  styles.saveBusinessButton,
                  uploadingBusinessDocuments && styles.disabledBusinessButton
                ]}
                onPress={saveBusinessDocuments}
                disabled={uploadingBusinessDocuments || !commercialRegister || !bankStatement || !proofOfBilling}
                activeOpacity={0.7}
              >
                {uploadingBusinessDocuments ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveBusinessButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Country picker modal */}
      <Modal
        transparent
        animationType="fade"
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={styles.countryModalContainer}>
            <Text style={styles.countryModalTitle}>Select Country</Text>
            {COUNTRY_OPTIONS.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={styles.countryOptionRow}
                onPress={() => {
                  setSelectedCountryCode(country.code);
                  const combined =
                    country.code +
                    (localContactNumber ? " " + localContactNumber : "");
                  setTempContactNumber(combined);
                  setIsCountryModalVisible(false);
                }}
              >
                <View style={styles.countryOptionContent}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryOptionName}>{country.label}</Text>
                </View>
                <Text style={styles.countryOptionCode}>{country.code}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.countryModalCancelButton}
              onPress={() => setIsCountryModalVisible(false)}
            >
              <Text style={styles.countryModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  placeholder: {
    width: 44,
  },

  // Hero Profile Section
  heroCard: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 20,
    padding: 28,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  profileIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  profileIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
    textAlign: "center",
  },
  profileBadges: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.redTheme.background,
  },

  // Cards
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: "#f5f5f5",
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    letterSpacing: 0.2,
  },
  infoContainer: {
    gap: 0,
  },
  infoRowTouchable: {
    borderRadius: 12,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  infoRowVertical: {
    flexDirection: "column",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 8,
  },
  infoLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    maxWidth: "50%",
  },
  infoLabelVertical: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(254, 125, 72, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  labelText: {
    fontSize: 15,
    color: "#555",
    fontWeight: "500",
    flex: 1,
  },
  labelTextVertical: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    gap: 8,
  },
  valueContainerVertical: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    paddingLeft: 42,
  },
  valueText: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },
  valueTextVertical: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
    flex: 1,
    lineHeight: 22,
  },
  editIconWrapper: {
    padding: 4,
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  badgeValueText: {
    fontSize: 13,
    fontWeight: "700",
  },
  accountLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  accountLevelContainerVertical: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingLeft: 42,
  },
  copyButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(254, 125, 72, 0.08)",
  },
  editSection: {
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
  },
  editHeader: {
    marginBottom: 16,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.2,
  },
  inputGroup: {
    gap: 14,
    marginBottom: 18,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginLeft: 2,
  },
  modernInput: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1a1a1a",
    backgroundColor: "white",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  saveActionButton: {
    backgroundColor: Colors.redTheme.background,
  },
  saveActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelActionButton: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  cancelActionButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  upgradeButton: {
    backgroundColor: "#f39c12",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#f39c12",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#d68910",
    minWidth: 85,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  referrerContainer: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  referrerContainerVertical: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
    paddingLeft: 42,
  },
  consultantBadge: {
    backgroundColor: "#3498db",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  consultantBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  noteText: {
    fontSize: 11,
    color: "#1976d2",
    flex: 1,
    lineHeight: 16,
  },
  languageOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  languageOptionCard: {
    backgroundColor: "white",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  languageOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  selectedLanguageOptionCard: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
    shadowColor: Colors.redTheme.background,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLanguageOptionText: {
    color: "#fff",
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "500",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },

  // Logout Button
  logoutButton: {
    backgroundColor: "#e74c3c",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Business Requirements Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  businessModalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  businessModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  businessModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  businessModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  businessModalDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  businessDocumentSection: {
    marginBottom: 20,
  },
  businessDocumentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  selectFileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    borderStyle: "dashed",
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    gap: 10,
  },
  selectFileButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  selectedFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  selectedFileName: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
    flex: 1,
  },
  removeFileButton: {
    padding: 4,
  },
  businessModalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  businessModalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  cancelBusinessButton: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  cancelBusinessButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
  saveBusinessButton: {
    backgroundColor: Colors.redTheme.background,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBusinessButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  disabledBusinessButton: {
    opacity: 0.5,
  },
  
  // Country selector styles
  phoneInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  countrySelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  countrySelectorFlag: {
    fontSize: 20,
    marginRight: 6,
  },
  countrySelectorText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
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

  // Country picker modal styles
  countryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  countryModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  countryModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  countryOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  countryOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryOptionName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  countryOptionCode: {
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  countryModalCancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  countryModalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
});
