import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { submitBankingApplication } from "../../../configs/api";
import CustomLoader from "../../Loader/CustomLoader";
import { useLanguage } from "../../../context/LanguageContext";
import type { RootStackParamList } from "../../../types/navigation";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_COMPLETE = "#10B981";

const ID_TYPE_OPTIONS = ["Passport", "Driver License", "National ID", "None of these"] as const;
type IdType = (typeof ID_TYPE_OPTIONS)[number];
const ID_TYPE_KEY: Record<IdType, string> = {
  Passport: "banking.idPassport",
  "Driver License": "banking.idDriverLicense",
  "National ID": "banking.idNationalId",
  "None of these": "banking.idNone",
};

/** Convert a local file URI to base64 data URL for API submission */
async function uriToBase64DataUrl(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime =
    ext === "png" ? "image/png" :
    ext === "gif" ? "image/gif" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export default function BankingRequiredInfo() {
  const { t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "BankingRequiredInfo">>();
  const route = useRoute<RouteProp<RootStackParamList, "BankingRequiredInfo">>();
  const selectedBank = route.params?.selectedBank ?? "UnionBank";
  const applicationData = route.params?.applicationData ?? {};

  const [idType, setIdType] = useState<IdType | "">("");
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = 6;

  const pickPassportPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          t("banking.permissionRequired"),
          t("banking.allowPhotos")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPassportPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking passport photo:", error);
      Alert.alert(t("banking.error"), t("banking.failedToPickImage"));
    }
  };

  const pickIdImage = async (
    setter: (uri: string) => void
  ) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          t("banking.permissionRequired"),
          t("banking.allowPhotos")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setter(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("banking.error"), t("banking.failedToPickImage"));
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const canSubmit = () => {
    if (!idType) return false;
    if (idType === "None of these") return false;
    if (idType === "Passport") return !!passportPhoto;
    if (idType === "Driver License" || idType === "National ID") return !!(idFront && idBack);
    return false;
  };

  const handleSubmit = async () => {
    if (!idType) {
      Alert.alert(t("banking.required"), t("banking.selectIdType"));
      return;
    }
    if (idType === "None of these") return; // button disabled, no-op
    if (idType === "Passport" && !passportPhoto) {
      Alert.alert(t("banking.required"), t("banking.uploadPassportRequired"));
      return;
    }
    if ((idType === "Driver License" || idType === "National ID") && (!idFront || !idBack)) {
      Alert.alert(t("banking.required"), t("banking.uploadGovIdRequired"));
      return;
    }
    const { contactInfo, personalInfo, addressInfo, financialInfo } = applicationData;
    if (!contactInfo || !personalInfo || !addressInfo || !financialInfo) {
      Alert.alert(t("banking.error"), t("banking.submitFailed"));
      navigation.navigate("Main");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        Alert.alert(t("banking.error"), t("banking.submitFailed"));
        setIsSubmitting(false);
        return;
      }
      let user: { firstName?: string; lastName?: string; fullName?: string } = {};
      try {
        const userJson = await AsyncStorage.getItem("user");
        if (userJson) user = JSON.parse(userJson);
      } catch {
        /* ignore */
      }
      let passportPhotoBase64: string | undefined;
      let idFrontBase64: string | undefined;
      let idBackBase64: string | undefined;
      if (idType === "Passport" && passportPhoto) {
        passportPhotoBase64 = await uriToBase64DataUrl(passportPhoto);
      } else if ((idType === "Driver License" || idType === "National ID") && idFront && idBack) {
        idFrontBase64 = await uriToBase64DataUrl(idFront);
        idBackBase64 = await uriToBase64DataUrl(idBack);
      }
      const payload: Record<string, unknown> = {
        applicationType: "BANKING",
        bank: selectedBank,
        sourceOfFund: financialInfo.sourceOfFund,
        grossMonthlyIncome: financialInfo.grossMonthlyIncome,
        grossMonthlyIncomeCurrency: financialInfo.grossMonthlyIncomeCurrency,
        idType,
        personalInfo: {
          firstName: user.firstName ?? user.fullName ?? "",
          lastName: user.lastName ?? "",
          middleName: "",
          gender: personalInfo.gender,
          dateOfBirth: personalInfo.dateOfBirth,
          civilStatus: personalInfo.civilStatus,
          citizenship: personalInfo.citizenship,
        },
        contactInfo: {
          phone: contactInfo.mobileNumber,
          email: contactInfo.email,
        },
        addressInfo: {
          completeAddress: addressInfo.completeAddress,
        },
        ...(passportPhotoBase64 && { passportPhoto: passportPhotoBase64 }),
        ...(idFrontBase64 && { idFront: idFrontBase64 }),
        ...(idBackBase64 && { idBack: idBackBase64 }),
      };
      const result = await submitBankingApplication(accessToken, payload);
      if (result.success) {
        Alert.alert("Success", t("banking.submitSuccess"), () => {
          navigation.navigate("Main");
        });
      } else {
        Alert.alert(t("banking.error"), result.error ?? t("banking.submitFailed"));
      }
    } catch (error) {
      console.error("Error submitting banking application:", error);
      Alert.alert(t("banking.error"), t("banking.submitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToMessage = () => {
    navigation.navigate("Message");
  };

  return (
    <View style={styles.container}>
      {/* Full-screen loading overlay only when user confirms and clicks Submit */}
      <Modal visible={isSubmitting} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <CustomLoader text={t("banking.submitting")} />
        </View>
      </Modal>
      <SafeAreaView style={styles.safeArea}>
        {/* Top: Back arrow + Header card */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={28} color={THEME_COLOR} />
          </TouchableOpacity>

          <View style={styles.headerCard}>
            <LinearGradient
              colors={ORANGE_GRADIENT}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <MaterialCommunityIcons
                name="bank"
                size={40}
                color="#FFFFFF"
                style={styles.headerIcon}
              />
              <Text style={styles.headerTitle}>{t("banking.headerTitle")}</Text>
              <Text style={styles.headerSubtitle}>{t("banking.headerSubtitle")}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Progress Stepper - Steps 1–5 complete (green), Step 6 active (orange outline) */}
        <View style={styles.progressContainer}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.stepCircle,
                    step < currentStep && styles.stepCircleComplete,
                    step === currentStep && styles.stepCircleActive,
                  ]}
                >
                  {step < currentStep ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        step === currentStep && styles.stepNumberActive,
                      ]}
                    >
                      {step}
                    </Text>
                  )}
                </View>
                {step < 6 && (
                  <View
                    style={[
                      styles.stepLine,
                      step < currentStep && styles.stepLineComplete,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Content Card - Required Documents */}
          <View style={styles.contentCard}>
            <View style={styles.stepIconWrapper}>
              <Ionicons name="document-text" size={28} color={THEME_COLOR} />
            </View>
            <Text style={styles.contentTitle}>{t("banking.requiredDocs")}</Text>
            <Text style={styles.contentDescription}>
              {t("banking.requiredDocsDesc")}
            </Text>

            {/* ID Type Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("banking.idType")}<Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowIdTypeModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !idType && styles.dropdownPlaceholder,
                  ]}
                >
                  {idType ? t(ID_TYPE_KEY[idType]) : t("banking.selectIdType")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Passport: 1 image only */}
            {idType === "Passport" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("banking.passportPhoto")}<Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={pickPassportPhoto}
                  activeOpacity={0.8}
                >
                  {passportPhoto ? (
                    <View style={styles.uploadPreview}>
                      <Image
                        source={{ uri: passportPhoto }}
                        style={styles.uploadThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.uploadedOverlay}>
                        <Ionicons name="checkmark-circle" size={32} color={GREEN_COMPLETE} />
                        <Text style={styles.uploadedText}>{t("banking.uploaded")}</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="camera" size={40} color={THEME_COLOR} style={styles.uploadIcon} />
                      <Text style={styles.uploadLabel}>{t("banking.uploadPassport")}</Text>
                      <Text style={styles.uploadHint}>{t("banking.tapToSelectImage")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Driver License / National ID: Front + Back */}
            {(idType === "Driver License" || idType === "National ID") && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("banking.uploadIdFront")}<Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadArea}
                    onPress={() => pickIdImage(setIdFront)}
                    activeOpacity={0.8}
                  >
                    {idFront ? (
                      <View style={styles.uploadPreview}>
                        <Image
                          source={{ uri: idFront }}
                          style={styles.uploadThumbnail}
                          resizeMode="cover"
                        />
                        <View style={styles.uploadedOverlay}>
                          <Ionicons name="checkmark-circle" size={32} color={GREEN_COMPLETE} />
                          <Text style={styles.uploadedText}>{t("banking.uploaded")}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="card-account-details"
                          size={40}
                          color={THEME_COLOR}
                          style={styles.uploadIcon}
                        />
                        <Text style={styles.uploadLabel}>{t("banking.uploadIdFront")}</Text>
                        <Text style={styles.uploadHint}>{t("banking.tapToSelectImage")}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("banking.uploadIdBack")}<Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadArea}
                    onPress={() => pickIdImage(setIdBack)}
                    activeOpacity={0.8}
                  >
                    {idBack ? (
                      <View style={styles.uploadPreview}>
                        <Image
                          source={{ uri: idBack }}
                          style={styles.uploadThumbnail}
                          resizeMode="cover"
                        />
                        <View style={styles.uploadedOverlay}>
                          <Ionicons name="checkmark-circle" size={32} color={GREEN_COMPLETE} />
                          <Text style={styles.uploadedText}>{t("banking.uploaded")}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="card-account-details"
                          size={40}
                          color={THEME_COLOR}
                          style={styles.uploadIcon}
                        />
                        <Text style={styles.uploadLabel}>{t("banking.uploadIdBack")}</Text>
                        <Text style={styles.uploadHint}>{t("banking.tapToSelectImage")}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* None of these: message with link to Message */}
            {idType === "None of these" && (
              <View style={styles.idNoneBox}>
                <Text style={styles.idNoneText}>
                  {t("banking.idNoneMessage")}{" "}
                  <Text style={styles.messageLink} onPress={goToMessage}>
                    {t("banking.messageUnderServices")}
                  </Text>
                  .
                </Text>
              </View>
            )}
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <Text style={styles.infoText}>
              {t("banking.infoNote")}
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Back & Submit Buttons */}
        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButtonFooter}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>{t("banking.back")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, (!canSubmit() || isSubmitting) && styles.nextButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={!canSubmit() || isSubmitting}
            >
              <LinearGradient
                colors={canSubmit() ? ORANGE_GRADIENT : ["#BDBDBD", "#9E9E9E"]}
                style={styles.nextGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.nextButtonText}>
                  {isSubmitting ? t("banking.submitting") : t("banking.submit")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ID Type Modal */}
      <Modal
        visible={showIdTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIdTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("banking.modalSelectIdType")}</Text>
              <TouchableOpacity onPress={() => setShowIdTypeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {ID_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    idType === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setIdType(opt);
                    setShowIdTypeModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(ID_TYPE_KEY[opt])}</Text>
                  {idType === opt && (
                    <Ionicons name="checkmark-circle" size={22} color={THEME_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    marginBottom: 12,
    padding: 4,
  },
  headerCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
    borderWidth: 2,
    borderColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleComplete: {
    backgroundColor: GREEN_COMPLETE,
    borderColor: GREEN_COMPLETE,
  },
  stepCircleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: THEME_COLOR,
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9E9E9E",
  },
  stepNumberActive: {
    color: THEME_COLOR,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  stepLineComplete: {
    backgroundColor: GREEN_COMPLETE,
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
  inputGroup: {
    marginBottom: 20,
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
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
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
  idNoneBox: {
    backgroundColor: "rgba(255, 235, 205, 0.9)",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.35)",
  },
  idNoneText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 22,
  },
  messageLink: {
    color: THEME_COLOR,
    fontWeight: "700",
    textDecorationLine: "underline",
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
  uploadArea: {
    backgroundColor: "rgba(255, 250, 245, 0.9)",
    borderWidth: 2,
    borderColor: "rgba(225, 88, 22, 0.4)",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  uploadIcon: {
    marginBottom: 8,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME_COLOR,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  uploadPreview: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  uploadThumbnail: {
    width: "100%",
    height: "100%",
  },
  uploadedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 235, 205, 0.9)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.35)",
  },
  infoIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#333333",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
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
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  nextButtonDisabled: {
    opacity: 0.8,
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
});
