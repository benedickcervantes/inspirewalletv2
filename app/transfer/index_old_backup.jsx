import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  Modal,
  Share,
} from "react-native";
import React, { useState, useRef } from "react";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ImageBackground,
  SafeAreaView,
  Platform,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import TransferLoadingScreen from "../../components/TransferLoadingScreen";
import axios from "axios";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { playTransferSound } from "../../utils/soundUtils";
import contactsService from "../../services/contactsService";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;
const isLargeDevice = width >= 414;

export default function Transfer() {
  const navigation = useNavigation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // Step tracker
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [agentWalletBalance, setAgentWalletBalance] = useState(0);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [currentUserAccountNumber, setCurrentUserAccountNumber] = useState("");
  const [userData, setUserData] = useState(null);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [accountNumberError, setAccountNumberError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const qrCodeRef = useRef();

  const formatCurrency = (amount) => {
    return amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    checkAccessAndInitialize();
  }, []);

  useEffect(() => {
    // This will trigger a re-render when userData.preferredLanguage changes
  }, [userData?.preferredLanguage]);

  // Load contacts when user is authenticated
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      loadContacts();
      
      // Subscribe to real-time contacts updates
      const unsubscribe = contactsService.subscribeToContacts(
        currentUser.uid,
        (updatedContacts) => {
          setContacts(updatedContacts);
        }
      );

      return () => unsubscribe();
    }
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoadingContacts(true);
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userContacts = await contactsService.getContacts(currentUser.uid);
        setContacts(userContacts);
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const checkAccessAndInitialize = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess(
        "Premium"
      );

      if (!hasAccess) {
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "transfer.titles.accessRestricted"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "transfer.messages.accessRestricted"
          ).replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            router.push("/main");
          },
        });
        return;
      }

      navigation.setOptions({
        headerShown: true,
        headerTransparent: true,
        headerTitle: t(
          userData?.preferredLanguage || "English",
          "transfer.header.title"
        ),
        headerTintColor: Colors.redTheme.background,
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
      });

      // Load user balances initially
      loadUserBalances();

      // Load user data including language preference
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        const userData = userDoc.data();
        setUserData(userData);

        // Set up real-time listener for balance updates
        const userDocRef = doc(firestore, "users", currentUser.uid);

        const unsubscribe = onSnapshot(
          userDocRef,
          (doc) => {
            if (doc.exists()) {
              const userData = doc.data();
              setAvailableBalance(userData.availBalanceAmount || 0);
              setAgentWalletBalance(userData.agentWalletAmount || 0);
            }
          },
          (error) => {
            console.error("Error listening to balance updates:", error);
          }
        );

        // Cleanup listener on component unmount
        return () => unsubscribe();
      }
    } catch (error) {
      console.error("Error checking account access:", error);
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.error"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.unableToVerify"
        ),
        type: "error",
        onConfirm: () => {
          router.push("/main");
        },
      });
    }
  };

  const loadUserBalances = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        const userData = userDoc.data();
        setAvailableBalance(userData.availBalanceAmount || 0);
        setAgentWalletBalance(userData.agentWalletAmount || 0);
        setCurrentUserAccountNumber(userData.accountNumber || "");
      }
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  };

  // Validate account number format
  const validateAccountNumber = (accountNumber) => {
    // Account number should be numeric and at least 6 digits
    const accountNumberRegex = /^\d{6,}$/;
    return accountNumberRegex.test(accountNumber);
  };

  // Check if user exists by account number
  const checkUserExists = async (accountNumber) => {
    if (!validateAccountNumber(accountNumber)) {
      return null;
    }

    // Check if the account number is the same as the current user's account number
    if (accountNumber === currentUserAccountNumber) {
      return null; // Return null to indicate "user not found" for self-transfer
    }

    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("accountNumber", "==", accountNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return {
          id: querySnapshot.docs[0].id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          emailAddress: userData.emailAddress,
          accountNumber: userData.accountNumber,
          availBalanceAmount: userData.availBalanceAmount,
          agentWalletAmount: userData.agentWalletAmount,
        };
      }
      return null;
    } catch (error) {
      console.error("Error checking user:", error);
      return null;
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser || !amount) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.missingInformation"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.missingInformation"
        ),
        type: "warning",
      });
      return;
    }

    if (!selectedBalance) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.selectBalanceType"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.selectBalanceType"
        ),
        type: "warning",
      });
      return;
    }

    // Check if user is trying to transfer to themselves (by user ID)
    const currentUser = auth.currentUser;
    if (currentUser && selectedUser.id === currentUser.uid) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.invalidTransfer"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.invalidTransfer"
        ),
        type: "warning",
      });
      return;
    }

    // Check if user is trying to transfer to themselves (by account number)
    if (
      selectedUser &&
      selectedUser.accountNumber === currentUserAccountNumber
    ) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.invalidTransfer"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.invalidTransfer"
        ),
        type: "warning",
      });
      return;
    }

    const transferAmount = parseFloat(amount);
    const currentBalance =
      selectedBalance === "available" ? availableBalance : agentWalletBalance;

    // Check if balance is 0 or negative
    if (currentBalance <= 0) {
      const balanceTypeText =
        selectedBalance === "available"
          ? t(
              userData?.preferredLanguage || "English",
              "transfer.balanceTypes.available"
            )
          : t(
              userData?.preferredLanguage || "English",
              "transfer.balanceTypes.agent"
            );
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.insufficientBalance"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.insufficientBalance"
        ).replace("{balanceType}", balanceTypeText),
        type: "warning",
      });
      return;
    }

    // Check if transfer amount is greater than available balance
    if (transferAmount > currentBalance) {
      const balanceTypeText =
        selectedBalance === "available"
          ? t(
              userData?.preferredLanguage || "English",
              "transfer.balanceTypes.available"
            )
          : t(
              userData?.preferredLanguage || "English",
              "transfer.balanceTypes.agent"
            );
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.insufficientBalance"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.insufficientFunds"
        )
          .replace("{balanceType}", balanceTypeText)
          .replace("{currentBalance}", formatCurrency(currentBalance))
          .replace("{transferAmount}", formatCurrency(transferAmount)),
        type: "warning",
      });
      return;
    }

    // Check if transfer amount is 0 or negative
    if (transferAmount <= 0) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.invalidAmount"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.invalidAmount"
        ),
        type: "warning",
      });
      return;
    }

    // Show confirmation modal instead of directly processing
    setShowConfirmModal(true);
  };

  const selectBalanceType = (balanceType) => {
    setSelectedBalance(balanceType);
    setBalanceModalVisible(false);
  };

  const openBalanceModal = () => {
    setBalanceModalVisible(true);
  };

  const isInsufficientBalance = () => {
    if (!selectedBalance || !amount) return false;

    // Check if user is trying to transfer to themselves (by user ID)
    const currentUser = auth.currentUser;
    if (currentUser && selectedUser && selectedUser.id === currentUser.uid) {
      return true;
    }

    // Check if user is trying to transfer to themselves (by account number)
    if (
      selectedUser &&
      selectedUser.accountNumber === currentUserAccountNumber
    ) {
      return true;
    }

    const transferAmount = parseFloat(amount);
    const currentBalance =
      selectedBalance === "available" ? availableBalance : agentWalletBalance;

    return (
      currentBalance <= 0 ||
      transferAmount <= 0 ||
      transferAmount > currentBalance
    );
  };

  const getTransferButtonText = () => {
    if (!selectedUser)
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.selectRecipient"
      );
    if (!amount)
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.enterAmount"
      );
    if (!selectedBalance)
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.selectBalanceType"
      );

    // Check if user is trying to transfer to themselves (by user ID)
    const currentUser = auth.currentUser;
    if (currentUser && selectedUser.id === currentUser.uid) {
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.cannotTransferToSelf"
      );
    }

    // Check if user is trying to transfer to themselves (by account number)
    if (
      selectedUser &&
      selectedUser.accountNumber === currentUserAccountNumber
    ) {
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.cannotTransferToSelf"
      );
    }

    const transferAmount = parseFloat(amount);
    const currentBalance =
      selectedBalance === "available" ? availableBalance : agentWalletBalance;

    if (currentBalance <= 0) {
      return selectedBalance === "available"
        ? t(
            userData?.preferredLanguage || "English",
            "transfer.buttons.insufficientAvailableBalance"
          )
        : t(
            userData?.preferredLanguage || "English",
            "transfer.buttons.insufficientAgentWallet"
          );
    }

    if (transferAmount <= 0) {
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.enterValidAmount"
      );
    }

    if (transferAmount > currentBalance) {
      return t(
        userData?.preferredLanguage || "English",
        "transfer.buttons.insufficientFunds"
      );
    }

    return t(
      userData?.preferredLanguage || "English",
      "transfer.buttons.sendTransfer"
    );
  };

  const sendTransferEmail = async (
    senderEmail,
    recipientEmail,
    amount,
    balanceType
  ) => {
    try {
      const senderDoc = await getDoc(
        doc(firestore, "users", auth.currentUser.uid)
      );
      const senderData = senderDoc.data();
      const senderName = `${senderData.firstName} ${senderData.lastName}`;

      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("emailAddress", "==", recipientEmail));
      const querySnapshot = await getDocs(q);
      const recipientData = querySnapshot.docs[0].data();
      const recipientName = `${recipientData.firstName} ${recipientData.lastName}`;

      const formattedBalanceType =
        balanceType === "available"
          ? "Available Balance Amount"
          : "Agent Wallet Amount";

      const emailParams = {
        from_email: senderEmail,
        to_email: recipientEmail,
        transfer_type: formattedBalanceType,
        date: new Date().toLocaleString(),
        amount: `${formatCurrency(parseFloat(amount))}`,
        sender_name: senderName,
        recipient_name: recipientName,
        sender_first_name: senderData.firstName,
        sender_last_name: senderData.lastName,
        recipient_first_name: recipientData.firstName,
        recipient_last_name: recipientData.lastName,
      };

      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TRANSFER_TEMPLATE_ID,
        emailParams,
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );
    } catch (error) {
      throw error;
    }
  };

  // Step navigation functions
  const goToNextStep = async () => {
    if (currentStep === 1) {
      if (!selectedBalance) {
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "transfer.titles.missingInformation"
          ),
          message: t(userData?.preferredLanguage || "English", "transfer.errors.selectBalanceType"),
          type: "warning",
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate account number and amount
      if (!searchQuery.trim()) {
        setAccountNumberError(t(userData?.preferredLanguage || "English", "transfer.errors.enterAccountNumber"));
        return;
      }

      if (!validateAccountNumber(searchQuery.trim())) {
        setAccountNumberError(t(userData?.preferredLanguage || "English", "transfer.errors.invalidAccountNumberFormat"));
        return;
      }

      if (searchQuery.trim() === currentUserAccountNumber) {
        setAccountNumberError(t(userData?.preferredLanguage || "English", "transfer.errors.cannotTransferToSelf"));
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setAmountError(t(userData?.preferredLanguage || "English", "transfer.errors.enterValidAmount"));
        return;
      }

      const transferAmount = parseFloat(amount);
      const currentBalance =
        selectedBalance === "available" ? availableBalance : agentWalletBalance;

      if (transferAmount > currentBalance) {
        setAmountError(
          t(userData?.preferredLanguage || "English", "transfer.errors.insufficientBalanceAvailable").replace("{amount}", formatCurrency(currentBalance))
        );
        return;
      }

      // Check if user exists
      const user = await checkUserExists(searchQuery.trim());
      if (!user) {
        setAccountNumberError(t(userData?.preferredLanguage || "English", "transfer.errors.accountNotFound"));
        return;
      }

      setSelectedUser(user);
      setAccountNumberError("");
      setAmountError("");
      
      // Update or save contact
      await saveOrUpdateContact(user);
      
      setCurrentStep(3);
    }
  };

  const saveOrUpdateContact = async (user) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Check if contact already exists
      const existingContact = await contactsService.getContactByAccountNumber(
        currentUser.uid,
        user.accountNumber
      );

      if (existingContact) {
        // Update last used timestamp
        await contactsService.updateLastUsed(currentUser.uid, existingContact.id);
      } else {
        // Save new contact
        await contactsService.addContact(currentUser.uid, {
          accountNumber: user.accountNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddress: user.emailAddress,
        });
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      // Don't block transfer if contact save fails
    }
  };

  const handleContactSelect = async (contact) => {
    try {
      setSearchQuery(contact.accountNumber);
      setAccountNumberError("");
      setShowContacts(false);
      setShowContactsModal(false);
      
      // Check if user still exists
      const user = await checkUserExists(contact.accountNumber);
      if (user) {
        setSelectedUser(user);
        // Update last used timestamp
        await contactsService.updateLastUsed(
          auth.currentUser.uid,
          contact.id
        );
      } else {
        setAccountNumberError(t(userData?.preferredLanguage || "English", "transfer.errors.contactAccountNotFound"));
      }
    } catch (error) {
      console.error("Error selecting contact:", error);
      setAccountNumberError(t(userData?.preferredLanguage || "English", "transfer.errors.errorLoadingContact"));
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await contactsService.deleteContact(currentUser.uid, contactId);
      // Contacts will update automatically via subscription
    } catch (error) {
      console.error("Error deleting contact:", error);
      showModal({
        title: t(userData?.preferredLanguage || "English", "transfer.titles.error"),
        message: t(userData?.preferredLanguage || "English", "transfer.contacts.deleteError"),
        type: "error",
      });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSearchQuery("");
    setSelectedUser(null);
    setAmount("");
    setSelectedBalance(null);
    setDescription("");
    setAccountNumberError("");
    setAmountError("");
  };

  const generateQRData = () => {
    if (!currentUserAccountNumber || !userData) {
      return null;
    }

    return JSON.stringify({
      type: "inspire_transfer",
      accountNumber: currentUserAccountNumber,
      name: `${userData.firstName} ${userData.lastName}`,
      timestamp: new Date().toISOString(),
    });
  };

  const handleShareQR = async () => {
    try {
      // Capture the QR code as an image
      const uri = await qrCodeRef.current.capture();

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share QR Code",
          UTI: "public.png",
        });
      } else {
        showModal({
          title: t(userData?.preferredLanguage || "English", "transfer.errors.sharingNotAvailable"),
          message: t(userData?.preferredLanguage || "English", "transfer.errors.sharingNotAvailableMessage"),
          type: "warning",
        });
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      showModal({
        title: t(userData?.preferredLanguage || "English", "transfer.errors.shareFailed"),
        message: t(userData?.preferredLanguage || "English", "transfer.errors.shareFailedMessage"),
        type: "error",
      });
    }
  };

  const handleScanQR = () => {
    router.push("/qrscanner");
  };

  const processTransfer = async (balanceType) => {
    try {
      setIsLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "transfer.titles.authenticationError"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "transfer.messages.authenticationError"
          ),
          type: "error",
        });
        return;
      }
      const recipientId = selectedUser.id;
      const recipientData = selectedUser;
      const usersRef = collection(firestore, "users");
      const senderDoc = await getDoc(doc(usersRef, currentUser.uid));
      const senderData = senderDoc.data();
      const transferAmount = parseFloat(amount);
      const balanceField =
        balanceType === "available"
          ? "availBalanceAmount"
          : "agentWalletAmount";
      if (senderData[balanceField] < transferAmount) {
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "transfer.titles.insufficientBalance"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "transfer.messages.insufficientBalanceSelected"
          ),
          type: "warning",
        });
        return;
      }
      // Start a batch write to ensure atomicity
      const batch = writeBatch(firestore);
      // Update sender's balance
      const senderRef = doc(usersRef, currentUser.uid);
      batch.update(senderRef, {
        [balanceField]: senderData[balanceField] - transferAmount,
      });
      // Update recipient's balance
      const recipientRef = doc(usersRef, recipientId);
      batch.update(recipientRef, {
        availBalanceAmount:
          (recipientData.availBalanceAmount || 0) + transferAmount,
      });
      // Add transaction records
      const transactionData = {
        senderId: currentUser.uid,
        recipientId: recipientId,
        recipientEmail: recipientData.emailAddress,
        amount: transferAmount,
        balanceType: balanceType,
        timestamp: new Date(),
        userId: currentUser.uid,
      };
      // Add transaction to sender's history
      const senderTransactionRef = doc(
        collection(firestore, `users/${currentUser.uid}/transactions`)
      );
      batch.set(senderTransactionRef, {
        amount: transferAmount,
        date: new Date(),
        type: "Transfer Money",
        status: "Completed",
        recipientEmail: recipientData.emailAddress,
        recipientName: `${recipientData.firstName} ${recipientData.lastName}`,
        description: `Transferred to ${recipientData.firstName} ${recipientData.lastName}`,
      });
      // Add transaction to recipient's history
      const recipientTransactionRef = doc(
        collection(firestore, `users/${recipientId}/transactions`)
      );
      batch.set(recipientTransactionRef, {
        amount: transferAmount,
        date: new Date(),
        type: "Transfer Received",
        senderEmail: senderData.emailAddress,
        senderName: `${senderData.firstName} ${senderData.lastName}`,
        status: "Completed",
        description: `Received from ${senderData.firstName} ${senderData.lastName}`,
      });
      // Add to main transactions collection
      const mainTransactionRef = doc(collection(firestore, "transactions"));
      batch.set(mainTransactionRef, transactionData);
      // Commit the batch
      await batch.commit();
      
      // Save or update contact after successful transfer
      await saveOrUpdateContact(selectedUser);
      
      try {
        // Send email notification
        await sendTransferEmail(
          senderData.emailAddress,
          recipientData.emailAddress,
          transferAmount,
          balanceType
        );
        // Send push notifications
        await Promise.all([
          axios.post("https://app.nativenotify.com/api/indie/notification", {
            subID: currentUser.uid,
            appId: 28259,
            appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
            title: "Transfer Successful",
            message: `You have successfully transferred PHP ${formatCurrency(
              transferAmount
            )} to ${recipientData.firstName} ${recipientData.lastName}`,
            description: `Transferred to ${recipientData.firstName} ${recipientData.lastName}`,
          }),
          axios.post("https://app.nativenotify.com/api/indie/notification", {
            subID: recipientId,
            appId: 28259,
            appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
            title: "Money Received",
            message: `You have received PHP ${formatCurrency(
              transferAmount
            )} from ${senderData.firstName} ${senderData.lastName}`,
          }),
        ]);
        // Play success sound
        playTransferSound();
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "transfer.titles.transferSuccessful"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "transfer.messages.transferSuccessful"
          ),
          type: "success",
          onConfirm: () => {
            hideModal();
            router.back();
          },
        });
      } catch (notificationError) {
        // Play success sound even if notification fails
        playTransferSound();
        showModal({
          title: t(
            userData?.preferredLanguage || "English",
            "transfer.titles.transferSuccessful"
          ),
          message: t(
            userData?.preferredLanguage || "English",
            "transfer.messages.transferSuccessfulDelayed"
          ),
          type: "success",
          onConfirm: () => {
            hideModal();
            router.back();
          },
        });
      }
    } catch (error) {
      showModal({
        title: t(
          userData?.preferredLanguage || "English",
          "transfer.titles.transferFailed"
        ),
        message: t(
          userData?.preferredLanguage || "English",
          "transfer.messages.transferFailed"
        ),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <TransferLoadingScreen message={t(userData?.preferredLanguage || "English", "loadingScreens.transfer.status")} />;
  }

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Select Balance Type
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="wallet" size={32} color="white" />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.steps.step1.title")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.steps.step1.subtitle")}
              </Text>
            </View>

            <View style={styles.balanceOptionsContainer}>
              {/* Available Balance Option */}
              <TouchableOpacity
                style={[
                  styles.balanceOption,
                  selectedBalance === "available" &&
                    styles.balanceOptionSelected,
                ]}
                onPress={() => setSelectedBalance("available")}
                activeOpacity={0.7}
              >
                <View style={styles.balanceOptionContent}>
                  <View style={styles.balanceOptionLeft}>
                    <View
                      style={[
                        styles.balanceOptionIconContainer,
                        selectedBalance === "available" &&
                          styles.balanceOptionIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name="wallet"
                        size={28}
                        color={
                          selectedBalance === "available"
                            ? "white"
                            : Colors.redTheme.background
                        }
                      />
                    </View>
                    <View style={styles.balanceOptionInfo}>
                      <Text
                        style={[
                          styles.balanceOptionTitle,
                          selectedBalance === "available" &&
                            styles.balanceOptionTitleSelected,
                          getRTLStyles(userData?.preferredLanguage || "English")
                        ]}
                      >
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.available.title")}
                      </Text>
                      <Text style={[styles.balanceOptionSubtitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.available.subtitle")}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedBalance === "available" &&
                        styles.radioButtonSelected,
                    ]}
                  >
                    {selectedBalance === "available" && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.balanceAmountContainer,
                    selectedBalance === "available" &&
                      styles.balanceAmountContainerSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.balanceOptionAmount,
                      selectedBalance === "available" &&
                        styles.balanceOptionAmountSelected,
                    ]}
                  >
                    PHP {formatCurrency(availableBalance)}
                  </Text>
                  {availableBalance > 0 ? (
                    <View style={styles.availableBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.availableBadgeText}>
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.availableBadge")}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.insufficientBadge}>
                      <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                      <Text style={styles.insufficientBadgeText}>
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.insufficientBadge")}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Agent Wallet Option */}
              <TouchableOpacity
                style={[
                  styles.balanceOption,
                  selectedBalance === "agent" && styles.balanceOptionSelected,
                ]}
                onPress={() => setSelectedBalance("agent")}
                activeOpacity={0.7}
              >
                <View style={styles.balanceOptionContent}>
                  <View style={styles.balanceOptionLeft}>
                    <View
                      style={[
                        styles.balanceOptionIconContainer,
                        selectedBalance === "agent" &&
                          styles.balanceOptionIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name="briefcase"
                        size={28}
                        color={
                          selectedBalance === "agent"
                            ? "white"
                            : Colors.redTheme.background
                        }
                      />
                    </View>
                    <View style={styles.balanceOptionInfo}>
                      <Text
                        style={[
                          styles.balanceOptionTitle,
                          selectedBalance === "agent" &&
                            styles.balanceOptionTitleSelected,
                          getRTLStyles(userData?.preferredLanguage || "English")
                        ]}
                      >
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.agent.title")}
                      </Text>
                      <Text style={[styles.balanceOptionSubtitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.agent.subtitle")}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedBalance === "agent" && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedBalance === "agent" && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.balanceAmountContainer,
                    selectedBalance === "agent" &&
                      styles.balanceAmountContainerSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.balanceOptionAmount,
                      selectedBalance === "agent" &&
                        styles.balanceOptionAmountSelected,
                    ]}
                  >
                    PHP {formatCurrency(agentWalletBalance)}
                  </Text>
                  {agentWalletBalance > 0 ? (
                    <View style={styles.availableBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.availableBadgeText}>
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.availableBadge")}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.insufficientBadge}>
                      <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                      <Text style={styles.insufficientBadgeText}>
                        {t(userData?.preferredLanguage || "English", "transfer.balanceOptions.insufficientBadge")}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        // Step 2: Enter Account Number & Amount
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons
                name="send"
                size={48}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.steps.step2.title")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.steps.step2.subtitle")}
              </Text>
            </View>

            {/* Account Number Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={Colors.redTheme.background}
                  />{" "}
                  {t(userData?.preferredLanguage || "English", "transfer.inputs.recipientAccountNumber")}
                </Text>
                {contacts.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowContacts(!showContacts)}
                    style={styles.contactsToggleButton}
                  >
                    <Ionicons
                      name={showContacts ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.redTheme.background}
                    />
                    <Text style={[styles.contactsToggleText, getRTLStyles(userData?.preferredLanguage || "English")]}>
                      {showContacts 
                        ? t(userData?.preferredLanguage || "English", "transfer.contacts.hideContacts")
                        : t(userData?.preferredLanguage || "English", "transfer.contacts.showContacts")} ({contacts.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Saved Contacts List */}
              {showContacts && contacts.length > 0 && (
                <View style={styles.contactsContainer}>
                  {isLoadingContacts ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.redTheme.background}
                      style={styles.contactsLoading}
                    />
                  ) : (
                    <ScrollView
                      style={styles.contactsScrollView}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      {contacts.map((contact) => (
                        <TouchableOpacity
                          key={contact.id}
                          style={styles.contactItem}
                          onPress={() => handleContactSelect(contact)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.contactAvatar}>
                            <Text style={styles.contactAvatarText}>
                              {contact.firstName?.[0] || ""}
                              {contact.lastName?.[0] || ""}
                            </Text>
                          </View>
                          <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>
                              {contact.nickname ||
                                `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
                                "Unknown"}
                            </Text>
                            <Text style={styles.contactAccountNumber}>
                              {contact.accountNumber}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#999"
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              <View
                style={[
                  styles.inputContainer,
                  accountNumberError && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={20}
                  color="#999"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder={t(userData?.preferredLanguage || "English", "transfer.inputs.accountNumberPlaceholder")}
                  style={[styles.input, getRTLStyles(userData?.preferredLanguage || "English")]}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setAccountNumberError("");
                    setShowContacts(false);
                  }}
                  onFocus={() => {
                    if (contacts.length > 0) {
                      setShowContacts(true);
                    }
                  }}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>
              {accountNumberError ? (
                <Text style={styles.errorText}>{accountNumberError}</Text>
              ) : null}
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={Colors.redTheme.background}
                />{" "}
                {t(userData?.preferredLanguage || "English", "transfer.inputs.amount")}
              </Text>
              <View
                style={[
                  styles.amountContainer,
                  amountError && styles.inputContainerError,
                ]}
              >
                <Text style={styles.currencySymbol}>PHP</Text>
                <TextInput
                  placeholder="0.00"
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setAmountError("");
                  }}
                  placeholderTextColor="#999"
                />
              </View>
              {amountError ? (
                <Text style={styles.errorText}>{amountError}</Text>
              ) : null}
              <Text style={[styles.balanceInfo, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.inputs.availableBalance").replace("{amount}", formatCurrency(
                  selectedBalance === "available"
                    ? availableBalance
                    : agentWalletBalance
                ))}
              </Text>
            </View>

            {/* Description (Optional) */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={Colors.redTheme.background}
                />{" "}
                {t(userData?.preferredLanguage || "English", "transfer.inputs.description")}
              </Text>
              <TextInput
                placeholder={t(userData?.preferredLanguage || "English", "transfer.inputs.descriptionPlaceholder")}
                style={[styles.descriptionInput, getRTLStyles(userData?.preferredLanguage || "English")]}
                value={description}
                onChangeText={setDescription}
                maxLength={100}
                multiline
                placeholderTextColor="#999"
              />
              <Text style={styles.characterCount}>
                {description.length}/100
              </Text>
            </View>
          </View>
        );

      case 3:
        // Step 3: Confirmation
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.steps.step3.title")}
              </Text>
              <Text style={[styles.stepSubtitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.steps.step3.subtitle")}
              </Text>
            </View>

            <View style={styles.confirmationContainer}>
              {/* Recipient Card */}
              <View style={styles.confirmCard}>
                <Text style={[styles.confirmLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                  {t(userData?.preferredLanguage || "English", "transfer.confirmation.to")}
                </Text>
                <View style={styles.confirmRecipientRow}>
                  <View style={styles.confirmAvatar}>
                    <Text style={styles.confirmAvatarText}>
                      {selectedUser?.firstName?.[0]}
                      {selectedUser?.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={styles.confirmRecipientDetails}>
                    <Text style={styles.confirmRecipientName}>
                      {selectedUser?.firstName} {selectedUser?.lastName}
                    </Text>
                    <Text style={styles.confirmRecipientAccount}>
                      {selectedUser?.accountNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Amount Card */}
              <View style={styles.confirmAmountCard}>
                <Text style={[styles.confirmAmountLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                  {t(userData?.preferredLanguage || "English", "transfer.confirmation.amountToTransfer")}
                </Text>
                <Text style={styles.confirmAmountValue}>
                  PHP {formatCurrency(parseFloat(amount || 0))}
                </Text>
              </View>

              {/* Details Card */}
              <View style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={[styles.confirmLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                    {t(userData?.preferredLanguage || "English", "transfer.confirmation.from")}
                  </Text>
                  <Text style={[styles.confirmValue, getRTLStyles(userData?.preferredLanguage || "English")]}>
                    {selectedBalance === "available"
                      ? t(userData?.preferredLanguage || "English", "transfer.balanceTypes.available")
                      : t(userData?.preferredLanguage || "English", "transfer.balanceTypes.agent")}
                  </Text>
                </View>
                {description && (
                  <View style={styles.confirmRow}>
                    <Text style={[styles.confirmLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                      {t(userData?.preferredLanguage || "English", "transfer.inputs.description")}
                    </Text>
                    <Text style={[styles.confirmValue, getRTLStyles(userData?.preferredLanguage || "English")]}>{description}</Text>
                  </View>
                )}
              </View>

              {/* Summary Card */}
              <View style={styles.confirmSummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                    {t(userData?.preferredLanguage || "English", "transfer.confirmation.currentBalance")}
                  </Text>
                  <Text style={styles.summaryValue}>
                    PHP{" "}
                    {formatCurrency(
                      selectedBalance === "available"
                        ? availableBalance
                        : agentWalletBalance
                    )}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || "English")]}>
                    {t(userData?.preferredLanguage || "English", "transfer.confirmation.transferAmount")}
                  </Text>
                  <Text style={[styles.summaryValue, styles.summaryDebit, getRTLStyles(userData?.preferredLanguage || "English")]}>
                    - PHP {formatCurrency(parseFloat(amount || 0))}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelBold, getRTLStyles(userData?.preferredLanguage || "English")]}>
                    {t(userData?.preferredLanguage || "English", "transfer.confirmation.newBalance")}
                  </Text>
                  <Text style={styles.summaryValueBold}>
                    PHP{" "}
                    {formatCurrency(
                      (selectedBalance === "available"
                        ? availableBalance
                        : agentWalletBalance) - parseFloat(amount || 0)
                    )}
                  </Text>
                </View>
              </View>
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
      <SafeAreaView style={styles.androidSafeArea} />

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setShowQRModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.quickActionIconContainer}>
            <Ionicons
              name="qr-code"
              size={20}
              color={Colors.redTheme.background}
            />
          </View>
          <Text style={[styles.quickActionText, getRTLStyles(userData?.preferredLanguage || "English")]}>
            {t(userData?.preferredLanguage || "English", "transfer.quickActions.myQR")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleScanQR}
          activeOpacity={0.7}
        >
          <View style={styles.quickActionIconContainer}>
            <Ionicons
              name="scan"
              size={20}
              color={Colors.redTheme.background}
            />
          </View>
          <Text style={[styles.quickActionText, getRTLStyles(userData?.preferredLanguage || "English")]}>
            {t(userData?.preferredLanguage || "English", "transfer.quickActions.scanQR")}
          </Text>
        </TouchableOpacity>

        {contacts.length > 0 && (
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowContactsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons
                name="people"
                size={20}
                color={Colors.redTheme.background}
              />
            </View>
            <Text style={[styles.quickActionText, getRTLStyles(userData?.preferredLanguage || "English")]}>
              {t(userData?.preferredLanguage || "English", "transfer.quickActions.contacts")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / 3) * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressText, getRTLStyles(userData?.preferredLanguage || "English")]}>
          {t(userData?.preferredLanguage || "English", "transfer.steps.progress").replace("{current}", currentStep.toString())}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainContainer}>{renderStepContent()}</View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToPreviousStep}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={Colors.redTheme.background}
            />
            <Text style={[styles.backButtonText, getRTLStyles(userData?.preferredLanguage || "English")]}>
              {t(userData?.preferredLanguage || "English", "transfer.navigation.back")}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
          onPress={
            currentStep === 3
              ? () => processTransfer(selectedBalance)
              : goToNextStep
          }
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, getRTLStyles(userData?.preferredLanguage || "English")]}>
            {currentStep === 3 
              ? t(userData?.preferredLanguage || "English", "transfer.navigation.confirmAndSend")
              : t(userData?.preferredLanguage || "English", "transfer.navigation.continue")}
          </Text>
          <Ionicons
            name={currentStep === 3 ? "checkmark-circle" : "arrow-forward"}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
        onCancel={modalConfig.onCancel}
      />

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.qrModal.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.qrModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.qrModalSubtitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
              {t(userData?.preferredLanguage || "English", "transfer.qrModal.subtitle")}
            </Text>

            <ViewShot
              ref={qrCodeRef}
              options={{ format: "png", quality: 1.0 }}
              style={styles.qrCodeContainer}
            >
              <View style={styles.qrCodeWrapper}>
                {userData && currentUserAccountNumber && (
                  <>
                    <View style={styles.qrCodeHeader}>
                      <Text style={styles.qrCodeName}>
                        {userData.firstName} {userData.lastName}
                      </Text>
                      <Text style={styles.qrCodeAccount}>
                        {currentUserAccountNumber}
                      </Text>
                    </View>

                    <View style={styles.qrCodeInner}>
                      <QRCode
                        value={generateQRData()}
                        size={220}
                        backgroundColor="white"
                        color={Colors.redTheme.background}
                        logo={require("../../assets/images/applogo.png")}
                        logoSize={50}
                        logoBackgroundColor="white"
                      />
                    </View>

                    <View style={styles.qrCodeFooter}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={[styles.qrCodeFooterText, getRTLStyles(userData?.preferredLanguage || "English")]}>
                        {t(userData?.preferredLanguage || "English", "transfer.qrModal.secureTransferCode")}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </ViewShot>

            <View style={styles.qrModalActions}>
              <TouchableOpacity
                style={styles.qrActionButton}
                onPress={handleShareQR}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social" size={20} color="white" />
                <Text style={[styles.qrActionButtonText, getRTLStyles(userData?.preferredLanguage || "English")]}>
                  {t(userData?.preferredLanguage || "English", "transfer.qrModal.shareButton")}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.qrModalNote, getRTLStyles(userData?.preferredLanguage || "English")]}>
              <Ionicons name="information-circle" size={14} color="#666" /> {t(userData?.preferredLanguage || "English", "transfer.qrModal.note")}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Contacts Management Modal */}
      <Modal
        visible={showContactsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactsModal(false)}
      >
        <View style={styles.contactsModalOverlay}>
          <View style={styles.contactsModalContent}>
            <View style={styles.contactsModalHeader}>
              <Text style={[styles.contactsModalTitle, getRTLStyles(userData?.preferredLanguage || "English")]}>
                {t(userData?.preferredLanguage || "English", "transfer.contacts.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowContactsModal(false)}
                style={styles.contactsModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {contacts.length === 0 ? (
              <View style={styles.emptyContactsContainer}>
                <Ionicons
                  name="people-outline"
                  size={64}
                  color="#CCC"
                  style={styles.emptyContactsIcon}
                />
                <Text style={[styles.emptyContactsText, getRTLStyles(userData?.preferredLanguage || "English")]}>
                  {t(userData?.preferredLanguage || "English", "transfer.contacts.noContacts")}
                </Text>
                <Text style={[styles.emptyContactsSubtext, getRTLStyles(userData?.preferredLanguage || "English")]}>
                  {t(userData?.preferredLanguage || "English", "transfer.contacts.noContactsSubtext")}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.contactsModalScrollView}
                showsVerticalScrollIndicator={false}
              >
                {contacts.map((contact) => (
                  <View key={contact.id} style={styles.contactsModalItem}>
                    <TouchableOpacity
                      style={styles.contactsModalItemContent}
                      onPress={() => handleContactSelect(contact)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>
                          {contact.firstName?.[0] || ""}
                          {contact.lastName?.[0] || ""}
                        </Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          {contact.nickname ||
                            `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
                            "Unknown"}
                        </Text>
                        <Text style={styles.contactAccountNumber}>
                          {contact.accountNumber}
                        </Text>
                        {contact.emailAddress && (
                          <Text style={styles.contactEmail}>
                            {contact.emailAddress}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteContactButton}
                      onPress={() => {
                        showModal({
                          title: t(userData?.preferredLanguage || "English", "transfer.contacts.deleteContact"),
                          message: t(userData?.preferredLanguage || "English", "transfer.contacts.deleteConfirm").replace("{name}", contact.nickname || contact.firstName || "this contact"),
                          type: "warning",
                          showCancelButton: true,
                          onConfirm: () => {
                            handleDeleteContact(contact.id);
                            hideModal();
                          },
                          onCancel: hideModal,
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.redTheme.background + "30",
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.redTheme.background + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionText: {
    fontSize: isSmallDevice ? 12 : 13,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginLeft: 2,
  },

  // Progress Indicator
  progressContainer: {
    paddingHorizontal: width * 0.05,
    paddingTop: Platform.OS === "ios" ? 10 : 15,
    paddingBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "600",
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: 20,
  },

  // Step Container
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  stepIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.redTheme.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  stepTitle: {
    fontSize: isSmallDevice ? 22 : 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: Colors.light.icon,
    textAlign: "center",
  },

  // Balance Options (Step 1)
  balanceOptionsContainer: {
    gap: 16,
  },
  balanceOption: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  balanceOptionSelected: {
    borderColor: Colors.redTheme.background,
    borderWidth: 3,
    backgroundColor: "white",
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  balanceOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  balanceOptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.redTheme.background + "12",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  balanceOptionIconContainerSelected: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background + "30",
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  balanceOptionInfo: {
    flex: 1,
  },
  balanceOptionTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  balanceOptionTitleSelected: {
    color: Colors.redTheme.background,
    fontWeight: "700",
  },
  balanceOptionSubtitle: {
    fontSize: isSmallDevice ? 12 : 13,
    color: Colors.light.icon,
  },
  radioButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  radioButtonSelected: {
    borderColor: Colors.redTheme.background,
    backgroundColor: Colors.redTheme.background,
  },
  balanceAmountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  balanceAmountContainerSelected: {
    borderTopColor: Colors.redTheme.background + "30",
    borderTopWidth: 2,
  },
  balanceOptionAmount: {
    fontSize: isSmallDevice ? 22 : 26,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  balanceOptionAmountSelected: {
    color: Colors.redTheme.background,
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981" + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availableBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  insufficientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF6B6B" + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  insufficientBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF6B6B",
  },

  // Input Section (Step 2)
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputContainerError: {
    borderColor: "#FF6B6B",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: isSmallDevice ? 15 : 16,
    color: "#1A1A1A",
    paddingVertical: 16,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currencySymbol: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingVertical: 16,
  },
  descriptionInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    fontSize: isSmallDevice ? 14 : 15,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 6,
    marginLeft: 4,
  },
  balanceInfo: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 6,
    marginLeft: 4,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 6,
    textAlign: "right",
  },

  // Confirmation (Step 3)
  confirmationContainer: {
    gap: 16,
  },
  confirmCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  confirmLabel: {
    fontSize: 13,
    color: Colors.light.icon,
    marginBottom: 8,
    fontWeight: "500",
  },
  confirmRecipientRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  confirmAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redTheme.background + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  confirmAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  confirmRecipientDetails: {
    flex: 1,
  },
  confirmRecipientName: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  confirmRecipientAccount: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  confirmAmountCard: {
    backgroundColor: Colors.redTheme.background + "10",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.redTheme.background + "30",
  },
  confirmAmountLabel: {
    fontSize: isSmallDevice ? 12 : 13,
    color: Colors.redTheme.background,
    fontWeight: "500",
    marginBottom: 8,
  },
  confirmAmountValue: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  confirmValue: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  confirmSummaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: isSmallDevice ? 13 : 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: isSmallDevice ? 13 : 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  summaryDebit: {
    color: Colors.redTheme.background,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  summaryLabelBold: {
    fontSize: isSmallDevice ? 14 : 15,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  summaryValueBold: {
    fontSize: isSmallDevice ? 14 : 15,
    color: "#1A1A1A",
    fontWeight: "700",
  },

  // Navigation Buttons
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  backButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  nextButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  nextButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: "600",
    color: "white",
  },

  // QR Code Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  qrModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qrModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  qrModalCloseButton: {
    padding: 4,
  },
  qrModalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    lineHeight: 20,
  },
  qrCodeContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 4,
  },
  qrCodeWrapper: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.redTheme.background + "20",
  },
  qrCodeHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrCodeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  qrCodeAccount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  qrCodeInner: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  qrCodeFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 6,
  },
  qrCodeFooterText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  qrModalActions: {
    marginTop: 24,
    gap: 12,
  },
  qrActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  qrActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  qrModalNote: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },

  // Contacts Styles
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  contactsToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contactsToggleText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  contactsContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactsScrollView: {
    maxHeight: 200,
  },
  contactsLoading: {
    padding: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.redTheme.background + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  contactAccountNumber: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  contactEmail: {
    fontSize: 11,
    color: Colors.light.icon,
    marginTop: 2,
  },

  // Contacts Modal Styles
  contactsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  contactsModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  contactsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  contactsModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  contactsModalCloseButton: {
    padding: 4,
  },
  contactsModalScrollView: {
    maxHeight: height * 0.7,
  },
  contactsModalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  contactsModalItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deleteContactButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContactsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    minHeight: 200,
  },
  emptyContactsIcon: {
    marginBottom: 16,
  },
  emptyContactsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyContactsSubtext: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: "center",
  },
});
