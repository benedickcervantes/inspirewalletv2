import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
  Modal,
  Animated,
  useRef,
} from "react-native";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { ScrollView } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Colors } from "../../constants/Colors";
import InspireCardsLoadingScreen from "../../components/InspireCardsLoadingScreen";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({ firstName: "", lastName: "", timeDepositAmount: 0 });
  const [emailAddress, setEmailAddress] = useState();
  const [address, setAddress] = useState();
  const [loading, setLoading] = useState(true); // Set initial loading to true
  const [userLanguage, setUserLanguage] = useState('English');
  const [currentStep, setCurrentStep] = useState(1); // Step-by-step flow
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'inspireCards.navigation.headerTitle'),
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

  useEffect(() => {
    // This will trigger a re-render when userLanguage changes
  }, [userLanguage]);

  const checkAccessAndFetchData = async () => {
    setLoading(true);
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        showModal({
          title: t(userLanguage, 'inspireCards.titles.accessRestricted'),
          message: t(userLanguage, 'inspireCards.messages.accessRestricted').replace('{accountType}', userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            navigation.goBack();
          }
        });
        setLoading(false);
        return;
      }
      
      await fetchUserData();
    } catch (error) {
      console.error("Error checking account access:", error);
      setLoading(false);
      showModal({
        title: t(userLanguage, 'inspireCards.titles.error'),
        message: t(userLanguage, 'inspireCards.messages.unableToVerify'),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        }
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const timeDepositAmount = parseFloat(data.timeDepositAmount || 0);
          
          setUserData({
            firstName: data.firstName,
            lastName: data.lastName,
            timeDepositAmount: timeDepositAmount
          });
          
          // Set user language preference
          setUserLanguage(data.preferredLanguage || 'English');

          // If timeDepositAmount is 0, show warning and redirect
          if (timeDepositAmount === 0) {
            showModal({
              title: t(userLanguage, 'inspireCards.titles.accessRestricted'),
              message: t(userLanguage, 'inspireCards.messages.timeDepositRequired'),
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
        title: t(userLanguage, 'inspireCards.titles.error'),
        message: t(userLanguage, 'inspireCards.messages.fetchDataFailed'),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        }
      });
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!emailAddress) {
        showModal({
          title: t(userLanguage, 'inspireCards.titles.missingInformation'),
          message: t(userLanguage, 'inspireCards.messages.emailRequired'),
          type: "warning",
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!address) {
        showModal({
          title: t(userLanguage, 'inspireCards.titles.missingInformation'),
          message: t(userLanguage, 'inspireCards.messages.addressRequired'),
          type: "warning",
        });
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async () => {
    if (!emailAddress || !address) {
      showModal({
        title: t(userLanguage, 'inspireCards.titles.missingInformation'),
        message: t(userLanguage, 'inspireCards.messages.missingInformation'),
        type: "warning",
      });
      return; // Stop execution if any field is empty
    }

    setLoading(true); // Start loading
    try {
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          email: emailAddress,
          message: `First Name: ${userData.firstName}\nLast Name: ${userData.lastName}\nEmail Address: ${emailAddress}\nType of Request: Help Concern\nReason: ${address}`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      console.log("SUCCESS!");
      showModal({
        title: t(userLanguage, 'inspireCards.titles.requestSubmitted'),
        message: t(userLanguage, 'inspireCards.messages.requestSubmitted'),
        type: "success",
        onConfirm: () => {
          // Reset form after successful submission
          setEmailAddress('');
          setAddress('');
          setCurrentStep(1);
          // Navigate back to previous screen
          navigation.goBack();
        }
      });
    } catch (err) {
      if (err instanceof EmailJSResponseStatus) {
        console.log("EmailJS Request Failed...", err);
      }

      console.log("ERROR", err);
      showModal({
        title: t(userLanguage, 'inspireCards.titles.submissionFailed'),
        message: t(userLanguage, 'inspireCards.messages.submissionFailed'),
        type: "error",
      });
    } finally {
      setLoading(false); // Stop loading
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t(userLanguage, 'inspireCards.header.supportTitle'),
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

  if (loading) {
    return <InspireCardsLoadingScreen message="Loading Inspire Cards..." />;
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepIndicatorWrapper}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            currentStep > step && styles.stepCircleCompleted
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive
              ]}>{step}</Text>
            )}
          </View>
          {step < 3 && (
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
                <Ionicons name="mail-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step1.title') || 'Contact Information'}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step1.description') || 'Please provide your email address so we can reach you'}
              </Text>
            </View>

            {/* Email Input Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="mail" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'inspireCards.form.emailLabel')}
                </Text>
              </View>
              <TextInput
                style={styles.modernInput}
                placeholder={t(userLanguage, 'inspireCards.form.emailPlaceholder')}
                placeholderTextColor="#999"
                keyboardType="email-address"
                value={emailAddress}
                onChangeText={(value) => setEmailAddress(value)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step1.info') || 'We\'ll use this email to send you updates about your card request'}
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
                <Ionicons name="location-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step2.title') || 'Delivery Address'}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step2.description') || 'Where should we send your Inspire Card?'}
              </Text>
            </View>

            {/* Address Input Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputLabelRow}>
                <Ionicons name="location" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'inspireCards.form.addressLabel')}
                </Text>
              </View>
              <TextInput
                style={styles.modernTextArea}
                placeholder={t(userLanguage, 'inspireCards.form.addressPlaceholder')}
                placeholderTextColor="#999"
                keyboardType="default"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={address}
                onChangeText={(value) => setAddress(value)}
              />
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.redTheme.background} />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step2.info') || 'Please provide your complete address including street, city, and postal code'}
              </Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={32} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.stepTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step3.title') || 'Review & Submit'}
              </Text>
              <Text style={[styles.stepDescription, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.steps.step3.description') || 'Please review your information before submitting'}
              </Text>
            </View>

            {/* Review Card */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="person-outline" size={20} color={Colors.redTheme.background} />
                  <Text style={[styles.reviewSectionTitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'inspireCards.review.personalInfo') || 'Personal Information'}
                  </Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, 'inspireCards.review.name') || 'Name'}</Text>
                  <Text style={styles.reviewValue}>{userData.firstName} {userData.lastName}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{t(userLanguage, 'inspireCards.form.emailLabel')}</Text>
                  <Text style={styles.reviewValue}>{emailAddress}</Text>
                </View>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="location-outline" size={20} color={Colors.redTheme.background} />
                  <Text style={[styles.reviewSectionTitle, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'inspireCards.review.deliveryAddress') || 'Delivery Address'}
                  </Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewValue}>{address}</Text>
                </View>
              </View>
            </View>

            {/* Disclaimer Card */}
            <View style={styles.disclaimerCard}>
              <View style={styles.disclaimerHeader}>
                <Ionicons name="time-outline" size={20} color={Colors.redTheme.background} />
                <Text style={[styles.disclaimerTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'inspireCards.disclaimer.title')}
                </Text>
              </View>
              <Text style={[styles.disclaimerText, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'inspireCards.disclaimer.text')}
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
              <Ionicons name="card" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'inspireCards.header.supportTitle')}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'inspireCards.header.subtitle')}
            </Text>
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
                  {t(userLanguage, 'inspireCards.buttons.back') || 'Back'}
                </Text>
              </TouchableOpacity>
            )}

            {currentStep < 3 ? (
              <TouchableOpacity
                style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
                onPress={handleNextStep}
              >
                <Text style={styles.nextButtonText}>
                  {t(userLanguage, 'inspireCards.buttons.next') || 'Next'}
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
                    <Ionicons name="checkmark-circle" size={20} color="white" style={styles.submitIcon} />
                    <Text style={styles.submitButtonText}>
                      {t(userLanguage, 'inspireCards.buttons.submit')}
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
    width: 60,
    height: 3,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
