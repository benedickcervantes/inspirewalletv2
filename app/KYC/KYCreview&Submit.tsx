import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../../context/LanguageContext";
import type { RootStackParamList } from "../../types/navigation";

import ActivityModal from '../components/ActivityModal';
const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const GREEN_UPLOADED = "#10B981";

const GENDER_KEY: Record<string, string> = { 
  Male: "banking.genderMale", 
  Female: "banking.genderFemale", 
  Other: "banking.genderOther" 
};

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

interface ReviewSubmitProps {
  firstName: string;
  lastName: string;
  birthday: Date | null;
  gender: string;
  nationality: string;
  sourceOfIncome: string;
  monthlyIncome: string;
  country: string;
  fullAddress: string;
  postalCode: string;
  idFrontUri: string | null;
  idBackUri: string | null;
  selfieUri: string | null;
  onEditStep: (step: number) => void;
  onBack: () => void;
  contentPadding: number;
  scale: number;
  horizontalPadding: number;
  safePaddingTop: number;
}

export default function KYCReviewSubmit({
  firstName,
  lastName,
  birthday,
  gender,
  nationality,
  sourceOfIncome,
  monthlyIncome,
  country,
  fullAddress,
  postalCode,
  idFrontUri,
  idBackUri,
  selfieUri,
  onEditStep,
  onBack,
  contentPadding,
  scale,
  horizontalPadding,
  safePaddingTop,
}: ReviewSubmitProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "KYCVerification">>();
  const { t } = useLanguage();

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmRequiredModal, setShowConfirmRequiredModal] = useState(false);

  const formatDate = (d: Date | null) => {
    if (!d) return "";
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const handleConfirmSubmit = () => {
    if (!confirmAccuracy) {
      setShowConfirmRequiredModal(true);
      return;
    }
    // Future: submit KYC to backend
    setShowSuccessModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <>
      {/* Review & Submit */}
      <Text style={[styles.reviewTitle, { fontSize: Math.round(18 * scale) }]}>
        {t("kyc.reviewSubmit")}
      </Text>
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
            onPress={() => onEditStep(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={THEME_COLOR} />
            <Text style={styles.editButtonText}>{t("kyc.edit")}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t("kyc.reviewFullName")}</Text>
          <Text style={styles.reviewValue}>
            {[firstName, lastName].filter(Boolean).join(" ") || "—"}
          </Text>
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
          <Text style={styles.reviewValue}>
            {nationality ? t(NATIONALITY_KEY[nationality] ?? nationality) : "—"}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t("kyc.sourceOfIncome")}</Text>
          <Text style={styles.reviewValue}>
            {sourceOfIncome ? t(SOURCE_KEY[sourceOfIncome] ?? sourceOfIncome) : "—"}
          </Text>
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
            onPress={() => onEditStep(2)}
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
          <Text style={styles.reviewValue} numberOfLines={2}>
            {fullAddress || "—"}
          </Text>
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
            onPress={() => onEditStep(3)}
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

      {/* Footer Button */}
      <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>
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
      </View>

      {/* Image viewer modal */}
      <ActivityModal
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
              style={[
                styles.imageViewerClose,
                { top: safePaddingTop + 8, right: horizontalPadding },
              ]}
              onPress={() => setViewingImageUri(null)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ActivityModal>

      {/* Success confirmation modal */}
      <ActivityModal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color={GREEN_UPLOADED} />
            </View>
            <Text style={styles.successModalTitle}>{t("kyc.submissionSuccess")}</Text>
            <Text style={styles.successModalMessage}>
              {t("kyc.submissionSuccessMessage")}
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={handleSuccessModalClose}
              activeOpacity={0.9}
            >
              <Text style={styles.successModalButtonText}>{t("kyc.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ActivityModal>

      {/* Confirm required modal */}
      <ActivityModal
        visible={showConfirmRequiredModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmRequiredModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIconContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={THEME_COLOR} />
            </View>
            <Text style={styles.successModalTitle}>{t("kyc.confirmRequiredTitle")}</Text>
            <Text style={styles.successModalMessage}>
              {t("kyc.confirmRequiredMessage")}
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowConfirmRequiredModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.successModalButtonText}>{t("kyc.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ActivityModal>
    </>
  );
}

const styles = StyleSheet.create({
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
  nextButton: {
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
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  successModalIconContainer: {
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  successModalMessage: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  successModalButton: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
