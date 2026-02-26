import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getMe } from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import type { RootStackParamList } from "../../types/navigation";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_UPLOADED = "#10B981";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const NATIONALITY_OPTIONS = ["Filipino", "Dual Citizen", "Foreign National", "Other"];
const SOURCE_OF_INCOME_OPTIONS = ["Employment", "Business", "Investments", "Other"];
const MONTH_KEYS = [
  "banking.january", "banking.february", "banking.march", "banking.april", "banking.may", "banking.june",
  "banking.july", "banking.august", "banking.september", "banking.october", "banking.november", "banking.december",
];
const GENDER_KEY: Record<string, string> = { Male: "banking.genderMale", Female: "banking.genderFemale", Other: "banking.genderOther" };
const NATIONALITY_KEY: Record<string, string> = {
  Filipino: "banking.filipino",
  "Dual Citizen": "banking.dualCitizen",
  "Foreign National": "banking.foreignNational",
  Other: "kyc.other",
};
const SOURCE_KEY: Record<string, string> = {
  Employment: "kyc.sourceEmployment",
  Business: "kyc.sourceBusiness",
  Investments: "kyc.sourceInvestments",
  Other: "kyc.other",
};
const COUNTRY_OPTIONS = ["Philippines", "Japan", "South Korea", "Saudi Arabia", "Other"];
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const YEARS = Array.from({ length: 71 }, (_, i) => (2010 - i).toString());

const REFERENCE_WIDTH = 375;

export default function KYCVerification() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "KYCVerification">>();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallDevice = width < 375;
  const scale = Math.min(width / REFERENCE_WIDTH, 1.25);
  const horizontalPadding = isSmallDevice ? 16 : 20;
  const contentPadding = isSmallDevice ? 16 : 24;
  const safePaddingTop = Platform.OS === "android" ? Math.max(insets.top, StatusBar.currentHeight ?? 0, 12) : Math.max(insets.top, 12);
  const safePaddingBottom = Math.max(insets.bottom, 16);
  const footerPaddingBottom = Platform.OS === "ios" ? Math.max(insets.bottom, 20) : 20;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [sourceOfIncome, setSourceOfIncome] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");

  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showNationalityModal, setShowNationalityModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [tempDate, setTempDate] = useState({ month: 0, day: 1, year: 2000 });

  const [currentStep, setCurrentStep] = useState(1);
  const [country, setCountry] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showCountryModal, setShowCountryModal] = useState(false);

  const [idFrontUri, setIdFrontUri] = useState<string | null>(null);
  const [idBackUri, setIdBackUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        const result = await getMe(accessToken);
        if (result.success && result.user) {
          const u = result.user as Record<string, unknown>;
          if (u.firstName) setFirstName(String(u.firstName));
          if (u.lastName) setLastName(String(u.lastName));
          if (u.dateOfBirth) {
            const d = new Date(String(u.dateOfBirth));
            if (!isNaN(d.getTime())) {
              setBirthday(d);
              setTempDate({
                month: d.getMonth(),
                day: d.getDate(),
                year: d.getFullYear(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const formatDate = (d: Date | null) => {
    if (!d) return "";
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const handleDateConfirm = () => {
    const d = new Date(tempDate.year, tempDate.month, tempDate.day);
    setBirthday(d);
    setShowBirthdayModal(false);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  const pickImage = async (
    setUri: (uri: string | null) => void,
    _label: string
  ) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("kyc.permissionRequired"),
          t("kyc.allowPhotos")
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("kyc.error"), t("kyc.failedToPickImage"));
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!firstName.trim()) return;
      if (!lastName.trim()) return;
      if (!birthday) return;
      if (!gender.trim()) return;
      if (!nationality.trim()) return;
      if (!sourceOfIncome.trim()) return;
      if (!monthlyIncome.trim()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!country.trim()) return;
      if (!fullAddress.trim()) return;
      if (!postalCode.trim()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!idFrontUri) return;
      if (!idBackUri) return;
      if (!selfieUri) return;
      setCurrentStep(4);
    }
  };

  const handleConfirmSubmit = () => {
    if (!confirmAccuracy) return;
    // Future: submit KYC to backend
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, { paddingTop: Platform.OS === "android" ? safePaddingTop : undefined }]}
        edges={["top"]}
      >
        {/* Header: Back arrow + Title */}
        <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: 12, paddingBottom: 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: Math.min(18 * scale, 18) }]} numberOfLines={1}>{t("kyc.title")}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress: 4 horizontal lines (active = current step, completed = steps before) */}
        <View style={[styles.progressContainer, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressLine,
                  step <= currentStep && styles.progressLineActive,
                ]}
              />
            ))}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: 24 + safePaddingBottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 1 && (
            <>
            {/* Personal Details Card */}
            <View style={[styles.contentCard, { padding: contentPadding }]}>
              <View style={styles.stepIconWrapper}>
                <Ionicons name="person-outline" size={28} color={THEME_COLOR} />
              </View>
              <Text style={[styles.contentTitle, { fontSize: 18 * scale }]}>{t("kyc.personalDetails")}</Text>
              <Text style={styles.contentDescription}>
                {t("kyc.personalDetailsDesc")}
              </Text>

              {/* First Name | Last Name (2-column) */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>
                    {t("kyc.firstName")} <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t("kyc.placeholderFirstName")}
                    placeholderTextColor="#9E9E9E"
                    autoCapitalize="words"
                  />
                </View>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>
                    {t("kyc.lastName")} <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={t("kyc.placeholderLastName")}
                    placeholderTextColor="#9E9E9E"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Birthday */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.birthday")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    if (birthday) {
                      setTempDate({
                        month: birthday.getMonth(),
                        day: birthday.getDate(),
                        year: birthday.getFullYear(),
                      });
                    }
                    setShowBirthdayModal(true);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !birthday && styles.dropdownPlaceholder,
                    ]}
                  >
                    {birthday ? formatDate(birthday) : t("kyc.placeholderBirthday")}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.gender")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowGenderModal(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !gender && styles.dropdownPlaceholder,
                    ]}
                  >
                    {gender ? t(GENDER_KEY[gender]) : t("kyc.placeholderGender")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Nationality */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.nationality")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowNationalityModal(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !nationality && styles.dropdownPlaceholder,
                    ]}
                  >
                    {nationality ? t(NATIONALITY_KEY[nationality] ?? nationality) : t("kyc.placeholderNationality")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Source of Income */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.sourceOfIncome")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowSourceModal(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !sourceOfIncome && styles.dropdownPlaceholder,
                    ]}
                  >
                    {sourceOfIncome ? t(SOURCE_KEY[sourceOfIncome] ?? sourceOfIncome) : t("kyc.placeholderSourceOfIncome")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Monthly Income */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.monthlyIncome")} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={monthlyIncome}
                  onChangeText={(text) => setMonthlyIncome(text.replace(/[^0-9]/g, ""))}
                  placeholder={t("kyc.placeholderMonthlyIncome")}
                  placeholderTextColor="#9E9E9E"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.bottomSpacing} />
            </>
            )}

            {currentStep === 2 && (
            <>
            {/* Address Information Card */}
            <View style={[styles.contentCard, { padding: contentPadding }]}>
              <View style={styles.stepIconWrapper}>
                <Ionicons name="location-outline" size={28} color={THEME_COLOR} />
              </View>
              <Text style={[styles.contentTitle, { fontSize: 18 * scale }]}>{t("kyc.addressInformation")}</Text>
              <Text style={styles.contentDescription}>
                {t("kyc.addressDetailsDesc")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.country")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !country && styles.dropdownPlaceholder,
                    ]}
                  >
                    {country || t("kyc.placeholderCountry")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.fullAddress")} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={fullAddress}
                  onChangeText={setFullAddress}
                  placeholder={t("kyc.placeholderFullAddress")}
                  placeholderTextColor="#9E9E9E"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.postalCode")} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder={t("kyc.placeholderPostalCode")}
                  placeholderTextColor="#9E9E9E"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.bottomSpacing} />
            </>
            )}

            {currentStep === 3 && (
            <>
            {/* Personal Documents Card */}
            <View style={[styles.contentCard, { padding: contentPadding }]}>
              <View style={styles.stepIconWrapper}>
                <Ionicons name="document-text-outline" size={28} color={THEME_COLOR} />
              </View>
              <Text style={[styles.contentTitle, { fontSize: 18 * scale }]}>{t("kyc.personalDocuments")}</Text>
              <Text style={styles.contentDescription}>
                {t("kyc.personalDocumentsDesc")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.govIdFront")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={() => pickImage(setIdFrontUri, "idFront")}
                  activeOpacity={0.8}
                >
                  {idFrontUri ? (
                    <View style={styles.uploadPreviewRow}>
                      <TouchableOpacity
                        onPress={() => setViewingImageUri(idFrontUri)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: idFrontUri }}
                          style={styles.uploadThumbnailLeft}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <View style={styles.uploadedRight}>
                        <Text style={styles.uploadLabel}>{t("kyc.uploadGovernmentId")}</Text>
                        <Text style={styles.uploadHint}>{t("kyc.uploadGovIdFrontHint")}</Text>
                        <View style={styles.uploadedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={GREEN_UPLOADED} />
                          <Text style={styles.uploadedBadgeText}>{t("kyc.uploaded")}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="person" size={40} color={THEME_COLOR} style={styles.uploadIcon} />
                      <Text style={styles.uploadLabel}>{t("kyc.uploadGovernmentId")}</Text>
                      <Text style={styles.uploadHint}>{t("kyc.uploadGovIdFrontHint")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.govIdBack")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={() => pickImage(setIdBackUri, "idBack")}
                  activeOpacity={0.8}
                >
                  {idBackUri ? (
                    <View style={styles.uploadPreviewRow}>
                      <TouchableOpacity
                        onPress={() => setViewingImageUri(idBackUri)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: idBackUri }}
                          style={styles.uploadThumbnailLeft}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <View style={styles.uploadedRight}>
                        <Text style={styles.uploadLabel}>{t("kyc.uploadGovernmentId")}</Text>
                        <Text style={styles.uploadHint}>{t("kyc.uploadGovIdBackHint")}</Text>
                        <View style={styles.uploadedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={GREEN_UPLOADED} />
                          <Text style={styles.uploadedBadgeText}>{t("kyc.uploaded")}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="person" size={40} color={THEME_COLOR} style={styles.uploadIcon} />
                      <Text style={styles.uploadLabel}>{t("kyc.uploadGovernmentId")}</Text>
                      <Text style={styles.uploadHint}>{t("kyc.uploadGovIdBackHint")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("kyc.selfiePhoto")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={() => pickImage(setSelfieUri, "selfie")}
                  activeOpacity={0.8}
                >
                  {selfieUri ? (
                    <View style={styles.uploadPreviewRow}>
                      <TouchableOpacity
                        onPress={() => setViewingImageUri(selfieUri)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: selfieUri }}
                          style={styles.uploadThumbnailLeft}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <View style={styles.uploadedRight}>
                        <Text style={styles.uploadLabel}>{t("kyc.uploadSelfiePhoto")}</Text>
                        <Text style={styles.uploadHint}>{t("kyc.uploadSelfieHint")}</Text>
                        <View style={styles.uploadedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={GREEN_UPLOADED} />
                          <Text style={styles.uploadedBadgeText}>{t("kyc.uploaded")}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="camera" size={40} color={THEME_COLOR} style={styles.uploadIcon} />
                      <Text style={styles.uploadLabel}>{t("kyc.uploadSelfiePhoto")}</Text>
                      <Text style={styles.uploadHint}>{t("kyc.uploadSelfieHint")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomSpacing} />
            </>
            )}

            {currentStep === 4 && (
            <>
            {/* Review & Submit */}
            <Text style={[styles.reviewTitle, { fontSize: 18 * scale }]}>{t("kyc.reviewSubmit")}</Text>
            <Text style={styles.reviewSubtitle}>{t("kyc.reviewSubmitDesc")}</Text>

            {/* Personal Details Summary Card */}
            <View style={[styles.reviewCard, { padding: contentPadding }]}>
              <View style={styles.reviewCardHeader}>
                <View style={styles.reviewCardTitleRow}>
                  <Ionicons name="person-outline" size={22} color={THEME_COLOR} />
                  <Text style={styles.reviewCardTitle}>{t("kyc.personalDetails")}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButtonRow}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color={THEME_COLOR} />
                  <Text style={styles.editButtonText}>{t("kyc.edit")}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.reviewFullName")}</Text>
                <Text style={styles.reviewValue}>{[firstName, lastName].filter(Boolean).join(" ") || "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.reviewDateOfBirth")}</Text>
                <Text style={styles.reviewValue}>{birthday ? formatDate(birthday) : "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.gender")}</Text>
                <Text style={styles.reviewValue}>{gender ? t(GENDER_KEY[gender]) : "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.nationality")}</Text>
                <Text style={styles.reviewValue}>{nationality ? t(NATIONALITY_KEY[nationality] ?? nationality) : "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.sourceOfIncome")}</Text>
                <Text style={styles.reviewValue}>{sourceOfIncome ? t(SOURCE_KEY[sourceOfIncome] ?? sourceOfIncome) : "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.monthlyIncome")}</Text>
                <Text style={styles.reviewValue}>{monthlyIncome || "—"}</Text>
              </View>
            </View>

            {/* Address Information Summary Card */}
            <View style={[styles.reviewCard, { padding: contentPadding }]}>
              <View style={styles.reviewCardHeader}>
                <View style={styles.reviewCardTitleRow}>
                  <Ionicons name="location-outline" size={22} color={THEME_COLOR} />
                  <Text style={styles.reviewCardTitle}>{t("kyc.addressInformation")}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButtonRow}
                  onPress={() => setCurrentStep(2)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color={THEME_COLOR} />
                  <Text style={styles.editButtonText}>{t("kyc.edit")}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.country")}</Text>
                <Text style={styles.reviewValue}>{country || "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.reviewAddress")}</Text>
                <Text style={styles.reviewValue} numberOfLines={2}>{fullAddress || "—"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t("kyc.postalCode")}</Text>
                <Text style={styles.reviewValue}>{postalCode || "—"}</Text>
              </View>
            </View>

            {/* Personal Documents Summary Card */}
            <View style={[styles.reviewCard, { padding: contentPadding }]}>
              <View style={styles.reviewCardHeader}>
                <View style={styles.reviewCardTitleRow}>
                  <Ionicons name="document-text-outline" size={22} color={THEME_COLOR} />
                  <Text style={styles.reviewCardTitle}>{t("kyc.personalDocuments")}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButtonRow}
                  onPress={() => setCurrentStep(3)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color={THEME_COLOR} />
                  <Text style={styles.editButtonText}>{t("kyc.edit")}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.reviewDocRow}>
                {idFrontUri ? (
                  <TouchableOpacity
                    onPress={() => setViewingImageUri(idFrontUri)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: idFrontUri }}
                      style={styles.reviewDocThumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reviewDocThumbnailPlaceholder}>
                    <Ionicons name="document-outline" size={24} color="#999" />
                  </View>
                )}
                <View style={styles.reviewDocTextWrap}>
                  <Text style={styles.reviewDocTitle}>{t("kyc.reviewIdFront")}</Text>
                  <Text style={styles.reviewDocSubtitle}>{t("kyc.reviewGovId")}</Text>
                </View>
                {idFrontUri ? (
                  <View style={styles.reviewUploadedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={GREEN_UPLOADED} />
                    <Text style={styles.reviewUploadedText}>{t("kyc.uploaded")}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.reviewDocRow}>
                {idBackUri ? (
                  <TouchableOpacity
                    onPress={() => setViewingImageUri(idBackUri)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: idBackUri }}
                      style={styles.reviewDocThumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reviewDocThumbnailPlaceholder}>
                    <Ionicons name="document-outline" size={24} color="#999" />
                  </View>
                )}
                <View style={styles.reviewDocTextWrap}>
                  <Text style={styles.reviewDocTitle}>{t("kyc.reviewIdBack")}</Text>
                  <Text style={styles.reviewDocSubtitle}>{t("kyc.reviewGovId")}</Text>
                </View>
                {idBackUri ? (
                  <View style={styles.reviewUploadedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={GREEN_UPLOADED} />
                    <Text style={styles.reviewUploadedText}>{t("kyc.uploaded")}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.reviewDocRow}>
                {selfieUri ? (
                  <TouchableOpacity
                    onPress={() => setViewingImageUri(selfieUri)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: selfieUri }}
                      style={styles.reviewDocThumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reviewDocThumbnailPlaceholder}>
                    <Ionicons name="person-outline" size={24} color="#999" />
                  </View>
                )}
                <View style={styles.reviewDocTextWrap}>
                  <Text style={styles.reviewDocTitle}>{t("kyc.selfiePhoto")}</Text>
                  <Text style={styles.reviewDocSubtitle}>{t("kyc.reviewBiometrics")}</Text>
                </View>
                {selfieUri ? (
                  <View style={styles.reviewUploadedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={GREEN_UPLOADED} />
                    <Text style={styles.reviewUploadedText}>{t("kyc.uploaded")}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Confirmation Checkbox */}
            <TouchableOpacity
              style={styles.confirmCheckboxRow}
              onPress={() => setConfirmAccuracy((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, confirmAccuracy && styles.checkboxChecked]}>
                {confirmAccuracy && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.confirmCheckboxLabel}>{t("kyc.confirmAccuracy")}</Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
            </>
            )}
          </ScrollView>

          {/* Footer: step 1 = Next; steps 2–3 = Back + Next; step 4 = Confirm and Submit */}
          <View style={[styles.footer, { paddingHorizontal: horizontalPadding, paddingBottom: footerPaddingBottom }]}>
            {currentStep === 4 ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleConfirmSubmit}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={ORANGE_GRADIENT}
                  style={styles.nextGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextButtonText}>{t("kyc.confirmAndSubmit")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (currentStep === 2 || currentStep === 3) ? (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.backButtonFooter}
                  onPress={handleBack}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backButtonText}>{t("kyc.back")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nextButtonFlex}
                  onPress={handleNext}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={ORANGE_GRADIENT}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.nextButtonText}>{t("kyc.next")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={ORANGE_GRADIENT}
                  style={styles.nextGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextButtonText}>{t("kyc.next")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectGender")}</Text>
              <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, gender === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setGender(opt);
                    setShowGenderModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(GENDER_KEY[opt])}</Text>
                  {gender === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Birthday Modal */}
      <Modal
        visible={showBirthdayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBirthdayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.dateModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectBirthdate")}</Text>
              <TouchableOpacity onPress={() => setShowBirthdayModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.month")}</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {MONTH_KEYS.map((key, i) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.dateOption, tempDate.month === i && styles.dateOptionSelected]}
                      onPress={() => setTempDate((p) => ({ ...p, month: i }))}
                    >
                      <Text style={styles.dateOptionText}>{t(key)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.day")}</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dateOption, tempDate.day === parseInt(d, 10) && styles.dateOptionSelected]}
                      onPress={() => setTempDate((p) => ({ ...p, day: parseInt(d, 10) }))}
                    >
                      <Text style={styles.dateOptionText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>{t("banking.year")}</Text>
                <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.dateOption, tempDate.year === parseInt(y, 10) && styles.dateOptionSelected]}
                      onPress={() => setTempDate((p) => ({ ...p, year: parseInt(y, 10) }))}
                    >
                      <Text style={styles.dateOptionText}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity style={styles.dateConfirmButton} onPress={handleDateConfirm}>
              <Text style={styles.dateConfirmText}>{t("banking.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nationality Modal */}
      <Modal
        visible={showNationalityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNationalityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectCitizenship")}</Text>
              <TouchableOpacity onPress={() => setShowNationalityModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {NATIONALITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, nationality === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setNationality(opt);
                    setShowNationalityModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(NATIONALITY_KEY[opt] ?? opt)}</Text>
                  {nationality === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Source of Income Modal */}
      <Modal
        visible={showSourceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("kyc.modalSelectSourceOfIncome")}</Text>
              <TouchableOpacity onPress={() => setShowSourceModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {SOURCE_OF_INCOME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, sourceOfIncome === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setSourceOfIncome(opt);
                    setShowSourceModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(SOURCE_KEY[opt])}</Text>
                  {sourceOfIncome === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Country Modal */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("kyc.modalSelectCountry")}</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {COUNTRY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, country === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setCountry(opt);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {country === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image viewer modal - tap ID/selfie thumbnail to view full image */}
      <Modal
        visible={!!viewingImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImageUri(null)}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setViewingImageUri(null)}
        >
          <View style={styles.imageViewerContent} onStartShouldSetResponder={() => true}>
            {viewingImageUri ? (
              <Image
                source={{ uri: viewingImageUri }}
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={[styles.imageViewerClose, { top: safePaddingTop + 8, right: horizontalPadding }]}
              onPress={() => setViewingImageUri(null)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  headerSpacer: {
    width: 36,
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  progressLine: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
  },
  progressLineActive: {
    flex: 1.5,
    backgroundColor: THEME_COLOR,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stepIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  contentDescription: {
    fontSize: 14,
    color: "#9E9E9E",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  required: {
    color: THEME_COLOR,
  },
  textInput: {
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  uploadArea: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 2,
    borderColor: "rgba(225, 88, 22, 0.25)",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  uploadIcon: {
    marginBottom: 8,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME_COLOR,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 13,
    color: "#9E9E9E",
    textAlign: "center",
  },
  uploadPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  uploadPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 16,
  },
  uploadThumbnail: {
    width: "100%",
    height: "100%",
  },
  uploadThumbnailLeft: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  uploadedRight: {
    flex: 1,
    justifyContent: "center",
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  uploadedBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN_UPLOADED,
  },
  uploadedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  reviewSubtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    marginBottom: 20,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reviewCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  editButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  reviewRow: {
    marginBottom: 10,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9E9E9E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000000",
  },
  reviewDocRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  },
  reviewDocThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
  },
  reviewDocThumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewDocTextWrap: {
    flex: 1,
  },
  reviewDocTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  reviewDocSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 2,
  },
  reviewUploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewUploadedText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN_UPLOADED,
  },
  confirmCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.2)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  confirmCheckboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#FFFFFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonFooter: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  nextButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  nextButtonFlex: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
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
    maxHeight: "60%",
  },
  dateModalContainer: {
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
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  optionRowSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  datePickerRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  datePickerColumn: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  dateScroll: {
    maxHeight: 180,
  },
  dateOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  dateOptionSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  dateOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dateConfirmButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  dateConfirmText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "80%",
    maxWidth: 400,
  },
  imageViewerClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    right: 20,
  },
});
