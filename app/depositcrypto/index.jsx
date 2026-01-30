import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  SafeAreaView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Clipboard,
} from "react-native";
import { useNavigation } from "expo-router";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import * as ImagePicker from "expo-image-picker";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "../../configs/firebase";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

const FOREX_API_BASE_URL = process.env.EXPO_PUBLIC_INSPIRE_FOREX_BASE_URL;
const FOREX_API_KEY = process.env.EXPO_PUBLIC_INSPIRE_FOREX_API_KEY;

// Calculate Crypto Deposit
const calculateCryptoDeposit = async (crypto, amount) => {
  try {
    console.log("Calculating crypto deposit:", { crypto, amount });
    console.log("API URL:", `${FOREX_API_BASE_URL}/crypto-calculate-deposit`);

    const response = await fetch(
      `${FOREX_API_BASE_URL}/crypto-calculate-deposit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": FOREX_API_KEY,
        },
        body: JSON.stringify({ crypto, amount }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Crypto calculation result:", result);
    return result;
  } catch (error) {
    console.error("Error calculating crypto deposit:", error);
    throw error;
  }
};

export default function Index() {
  const db = getFirestore();
  const auth = getAuth();
  const navigation = useNavigation();
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [phpEquivalent, setPhpEquivalent] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [userLanguage, setUserLanguage] = useState('English');

  // Get wallet address based on selected crypto
  const getWalletAddress = (crypto) => {
    switch (crypto) {
      case "BTC":
        return "bc1qk7z05r68h0alw9n9mr0uumas7s30t43nuq5rc5";
      case "ETH":
      case "USDT":
        return "0xFEb2FeF956e1D035DD3A0bE8242f98333994e2B7";
      default:
        return "0xFEb2FeF956e1D035DD3A0bE8242f98333994e2B7";
    }
  };

  // Copy wallet address to clipboard
  const copyWalletAddress = async () => {
    try {
      const address = getWalletAddress(selectedCrypto);
      await Clipboard.setString(address);
      showModal({
        title: t(userLanguage, 'depositCrypto.content.instructions.walletAddressCopied'),
        message: t(userLanguage, 'depositCrypto.content.instructions.walletAddressCopiedMessage'),
        type: "success",
      });
    } catch (error) {
      console.error("Error copying wallet address:", error);
      showModal({
        title: t(userLanguage, 'depositCrypto.modals.copyError.title'),
        message: t(userLanguage, 'depositCrypto.modals.copyError.message'),
        type: "error",
      });
    }
  };

  // Function to send email notification
  const sendEmailNotification = async (depositData) => {
    try {
      // Check if email address is provided
      if (!depositData.emailAddress || depositData.emailAddress.trim() === '') {
        throw new Error("Email address is required for sending notification");
      }

      // Debug EmailJS configuration
      console.log("EmailJS Service ID:", process.env.EXPO_PUBLIC_SERVICE_ID);
      console.log("EmailJS Template ID:", process.env.EXPO_PUBLIC_CRYPTO_DEPOSIT_TEMPLATE_ID);
      console.log("EmailJS Public Key:", process.env.EXPO_PUBLIC_API_KEY ? "Set" : "Not Set");

      const templateParams = {
        to_email: depositData.emailAddress, // Add recipient email address
        user_email: depositData.emailAddress, // Alternative field name
        email: depositData.emailAddress, // Another common field name
        name: `${userData.firstName} ${userData.lastName}`,
        crypto_type: depositData.crypto,
        crypto_amount: depositData.amount,
        php_amount: depositData.phpAmount,
        email_address: depositData.emailAddress,
        exchange_rate: conversionRate,
        deposit_id: depositData.depositId,
        request_id: depositData.depositId,
        request_date: depositData.date,
        request_time: depositData.time,
        status: "pending",
        status_text: "PENDING",
        status_message: "Your crypto deposit request has been submitted and is currently under review. We will notify you once the transaction is verified and processed.",
        current_date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      };

      console.log("Sending email with template params:", JSON.stringify(templateParams, null, 2));
      console.log("Recipient email address:", depositData.emailAddress);

      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_CRYPTO_DEPOSIT_TEMPLATE_ID,
        templateParams,
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      console.log("Email notification sent successfully");
    } catch (error) {
      console.error("Error sending email notification:", error);
      if (error instanceof EmailJSResponseStatus) {
        console.log("EmailJS Request Failed...", error);
      }
      throw error; // Re-throw to be caught by the calling function
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'depositCrypto.header.title'),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
      // No headerLeft needed - React Navigation provides default back button that works on both iOS and Android
    });
  }, [userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserData({
              firstName: data.firstName,
              lastName: data.lastName,
            });
            // Get email from user data or auth
            const email = data.email || data.emailAddress || user.email || "";
            setUserEmail(email);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  // Calculate PHP equivalent when amount or selectedCrypto changes
  useEffect(() => {
    let cancelled = false;
    const fetchPhpEquivalent = async () => {
      if (!amount || isNaN(parseFloat(amount)) || !selectedCrypto) {
        setPhpEquivalent("");
        setConversionRate("");
        return;
      }
      setPriceLoading(true);
      setPriceError("");
      try {
        const result = await calculateCryptoDeposit(
          selectedCrypto,
          parseFloat(amount)
        );
        if (!cancelled) {
          setPhpEquivalent(
            result.convertedAmount
              ? `≈ ₱${Number(result.convertedAmount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : ""
          );
          setConversionRate(
            result.rateUsed
              ? `Rate: 1 ${selectedCrypto} = ₱${result.rateUsed.toFixed(4)}`
              : ""
          );
        }
      } catch (err) {
        if (!cancelled) {
          setPriceError("Failed to calculate PHP equivalent");
        }
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    };
    fetchPhpEquivalent();
    return () => {
      cancelled = true;
    };
  }, [amount, selectedCrypto]);

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
      showModal({
        title: t(userLanguage, 'depositCrypto.modals.imagePickerError.title'),
        message: error.message || t(userLanguage, 'depositCrypto.modals.imagePickerError.message'),
        type: "error",
      });
    }
  };

  const onSubmit = async () => {
    if (!amount || !userEmail || !selectedCrypto || !imageUri) {
      showModal({
        title: t(userLanguage, 'depositCrypto.modals.missingInformation.title'),
        message: t(userLanguage, 'depositCrypto.modals.missingInformation.message'),
        type: "warning",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      // Upload image to Firebase Storage
      setUploading(true);
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const depositId = `cryptoDeposit_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const storageRef = ref(
        storage,
        `cryptoReceipts/${user.uid}/${depositId}.jpg`
      );
      await uploadBytes(storageRef, blob);
      const receiptUrl = await getDownloadURL(storageRef);
      setUploading(false);
      // Prepare deposit data
      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0];

      // Use the calculated PHP amount from the API
      let phpAmount = "";
      if (phpEquivalent) {
        phpAmount = phpEquivalent.replace(/[≈₱, ]/g, "");
      }
      const depositData = {
        date,
        time,
        isApproved: false,
        depositId,
        emailAddress: userEmail,
        amount,
        crypto: selectedCrypto,
        phpAmount: phpAmount,
        receiptUrl,
        Name: `${userData.firstName} ${userData.lastName}`,
      };
      // Save to Firestore
      const depositRef = doc(db, "users", user.uid, "depositCrypto", depositId);
      await setDoc(depositRef, depositData);

      // Add transaction to user's transaction history
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        amount: phpAmount,
        date: new Date(),
        type: "Crypto Deposit",
        crypto: selectedCrypto,
        description: `Deposited ${amount} ${selectedCrypto} (≈ ₱${phpAmount})`,
        receiptUrl,
        depositId,
      });

      // Send email notification
      try {
        await sendEmailNotification(depositData);
        showModal({
          title: t(userLanguage, 'depositCrypto.modals.requestSubmitted.title'),
          message: t(userLanguage, 'depositCrypto.modals.requestSubmitted.message'),
          type: "success",
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Still show success modal even if email fails
        showModal({
          title: t(userLanguage, 'depositCrypto.modals.requestSubmitted.title'),
          message: t(userLanguage, 'depositCrypto.modals.requestSubmitted.messageWithEmailDelay'),
          type: "success",
        });
      }
      // Reset form
      setAmount("");
      setImageUri(null);
      setSelectedCrypto("BTC");
    } catch (err) {
      setUploading(false);
      let errorMessage = "Failed to submit request. Please try again.";
      if (err.text) errorMessage = `Error: ${err.text}`;
      else if (err.message) errorMessage = `Error: ${err.message}`;
      showModal({
        title: t(userLanguage, 'depositCrypto.modals.submissionFailed.title'),
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea} />
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.headerCard}>
                <View style={styles.headerContent}>
                  <Ionicons
                    name="trending-up"
                    size={32}
                    color={Colors.redTheme.background}
                    style={styles.headerIcon}
                  />
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, 'depositCrypto.content.headerTitle')}
                    </Text>
                    <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, 'depositCrypto.content.headerSubtitle')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* User Information */}
              <View style={styles.userInfoCard}>
                <Ionicons
                  name="person"
                  size={20}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.userInfoText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'depositCrypto.content.accountHolder')} {userData.firstName} {userData.lastName}
                </Text>
              </View>
              
              {/* User Email */}
              <View style={styles.userInfoCard}>
                <Ionicons name="mail" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.userInfoText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'depositCrypto.content.email')} {userEmail}
                </Text>
              </View>

              {/* Instructions Card */}
              <View style={styles.instructionCard}>
                <View style={styles.instructionHeader}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                  <Text style={[styles.instructionTitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'depositCrypto.content.instructions.title')}
                  </Text>
                </View>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  1. {t(userLanguage, 'depositCrypto.content.instructions.step1').replace('{crypto}', selectedCrypto)}
                </Text>
                <View style={styles.walletAddressContainer}>
                  <Text style={[styles.walletAddressLabel, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'depositCrypto.content.instructions.walletAddressLabel')}
                  </Text>
                  <TouchableOpacity
                    style={styles.walletAddressBox}
                    onPress={copyWalletAddress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.walletAddress}>
                      {getWalletAddress(selectedCrypto)}
                    </Text>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={Colors.redTheme.background}
                    />
                  </TouchableOpacity>
                </View>
                {selectedCrypto === "BTC" && (
                  <Text style={[styles.instructionNote, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'depositCrypto.content.instructions.btcNote')}
                  </Text>
                )}
                {(selectedCrypto === "ETH" || selectedCrypto === "USDT") && (
                  <Text style={[styles.instructionNote, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'depositCrypto.content.instructions.ethNote')}
                  </Text>
                )}
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  2. {t(userLanguage, 'depositCrypto.content.instructions.step2')}
                </Text>
                <Text style={[styles.instructionNote, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'depositCrypto.content.instructions.note')}
                </Text>
              </View>

              {/* Modern Crypto Selector */}
              <View style={styles.formSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons name="logo-bitcoin" size={16} color={Colors.redTheme.background} /> {t(userLanguage, 'depositCrypto.content.form.selectCrypto')}
                </Text>
                <View style={styles.modernCryptoSelector}>
                  {["BTC", "ETH", "USDT"].map((crypto) => (
                    <TouchableOpacity
                      key={crypto}
                      style={[
                        styles.modernCryptoButton,
                        selectedCrypto === crypto && styles.modernCryptoButtonSelected,
                      ]}
                      onPress={() => setSelectedCrypto(crypto)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.cryptoIconContainer,
                        selectedCrypto === crypto && styles.cryptoIconContainerSelected
                      ]}>
                        <Ionicons 
                          name={crypto === "BTC" ? "logo-bitcoin" : crypto === "ETH" ? "diamond-outline" : "cash-outline"} 
                          size={24} 
                          color={selectedCrypto === crypto ? "white" : Colors.redTheme.background}
                        />
                      </View>
                      <Text
                        style={[
                          styles.modernCryptoButtonText,
                          selectedCrypto === crypto && styles.modernCryptoButtonTextSelected,
                        ]}
                      >
                        {crypto}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Modern Amount Input */}
              <View style={styles.formSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  <Ionicons name="cash-outline" size={16} color={Colors.redTheme.background} /> {t(userLanguage, 'depositCrypto.content.form.amount')}
                </Text>
                <View style={styles.modernAmountContainer}>
                  <Text style={styles.cryptoSymbol}>{selectedCrypto}</Text>
                  <TextInput
                    style={[styles.modernAmountInput, getRTLStyles(userLanguage)]}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    onChangeText={setAmount}
                    value={amount}
                  />
                </View>
                {priceLoading ? (
                  <View style={styles.modernLoadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={Colors.redTheme.background}
                    />
                    <Text style={[styles.loadingText, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, 'depositCrypto.content.loading.fetchingRates')}
                    </Text>
                  </View>
                ) : priceError ? (
                  <Text style={styles.errorText}>
                    {priceError}
                  </Text>
                ) : (
                  phpEquivalent && (
                    <View style={styles.modernConversionCard}>
                      <View style={styles.conversionHeader}>
                        <Ionicons
                          name="swap-horizontal"
                          size={20}
                          color={Colors.redTheme.background}
                        />
                        <Text style={styles.conversionLabel}>PHP Equivalent</Text>
                      </View>
                      <Text style={styles.modernConversionAmount}>
                        {phpEquivalent}
                      </Text>
                      <Text style={styles.modernConversionRate}>
                        {conversionRate ? conversionRate : ""}
                      </Text>
                    </View>
                  )
                )}
              </View>



              {/* Receipt Upload */}
              <View style={styles.formSection}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'depositCrypto.content.form.uploadReceipt')}
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={selectImage}
                  activeOpacity={0.7}
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
                      <Text style={[styles.uploadText, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, 'depositCrypto.content.form.uploadReceiptText')}
                      </Text>
                      <Text style={[styles.uploadSubtext, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, 'depositCrypto.content.form.uploadReceiptSubtext')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {uploading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={Colors.redTheme.background}
                    />
                    <Text style={[styles.loadingText, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, 'depositCrypto.content.loading.uploading')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={isSubmitting || uploading}
              >
                <View style={styles.submitButtonContent}>
                  {isSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={styles.loadingIcon}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="white"
                      style={styles.submitIcon}
                    />
                  )}
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? t(userLanguage, 'depositCrypto.content.submitButton.submitting') : t(userLanguage, 'depositCrypto.content.submitButton.submit')}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>

        <ProfessionalModal
          visible={modalVisible}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onClose={hideModal}
          onConfirm={modalConfig.onConfirm}
        />
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
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
  userInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(204, 33, 53, 0.1)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  userInfoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.redTheme.background,
  },
  formSection: {
    marginBottom: 24,
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
  // Modern Crypto Selector
  modernCryptoSelector: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modernCryptoButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
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
  modernCryptoButtonSelected: {
    borderColor: Colors.redTheme.background,
    borderWidth: 3,
    backgroundColor: "white",
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cryptoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redTheme.background + '12',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cryptoIconContainerSelected: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background + '30',
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
  modernCryptoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  modernCryptoButtonTextSelected: {
    color: Colors.redTheme.background,
    fontWeight: "700",
  },

  // Modern Amount Input
  modernAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
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
  cryptoSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginRight: 8,
  },
  modernAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingVertical: 16,
  },
  modernLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
  },
  modernConversionCard: {
    marginTop: 12,
    backgroundColor: Colors.redTheme.background + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.redTheme.background + '30',
  },
  conversionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  conversionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  modernConversionAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.redTheme.background,
    marginBottom: 4,
  },
  modernConversionRate: {
    fontSize: 12,
    color: "#666",
  },
  errorText: {
    color: "#FF6B6B",
    marginTop: 8,
    fontSize: 13,
  },

  // Old styles (keep for compatibility)
  cryptoSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
  },
  cryptoButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  selectedCryptoButton: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  cryptoButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  selectedCryptoButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  uploadButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    marginTop: 4,
  },
  uploadContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    resizeMode: "cover",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "600",
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
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
  bottomSpacing: {
    height: 40,
  },
  phpEstimateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.2)",
  },
  phpEstimateText: {
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    marginLeft: 8,
  },
  phpEstimateRate: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginLeft: 8,
  },
  conversionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginTop: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.10)",
  },
  conversionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  conversionAmount: {
    fontSize: 22,
    color: Colors.redTheme.background,
    fontWeight: "bold",
    textAlign: "center",
  },
  conversionRate: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },
  instructionCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    marginBottom: 8,
  },
  walletAddressContainer: {
    marginVertical: 12,
  },
  walletAddressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  walletAddressBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.3)",
  },
  walletAddress: {
    fontSize: 13,
    color: "#333",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    flex: 1,
    marginRight: 8,
  },
  instructionNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 16,
  },
});
