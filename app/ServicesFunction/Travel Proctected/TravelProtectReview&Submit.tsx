import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

const THEME_COLOR = "#E15816";

export interface TravelProtectReviewSubmitProps {
  emailAddress: string;
  mobileDialCode: string;
  mobileNumber: string;
  landlineNumber: string;
  homeAddress: string;
  gender: string;
  dateOfBirthText: string;
  civilStatus: string;
  citizenship: string;
  sourceOfFund: string;
  grossMonthlyIncome: string;
  grossMonthlyIncomeCurrency: string;
  cashOnHand: string;
  destinationAddress: string;
  checkInDateText: string;
  duration: string;
  departureTimeText: string;
  arrivalTimeText: string;
  passportNumber: string;
  purposeOfTravel: string;
  governmentIdType: string;
  governmentIdNumber: string;
}

export default function TravelProtectReviewSubmit({
  emailAddress,
  mobileDialCode,
  mobileNumber,
  landlineNumber,
  homeAddress,
  gender,
  dateOfBirthText,
  civilStatus,
  citizenship,
  sourceOfFund,
  grossMonthlyIncome,
  grossMonthlyIncomeCurrency,
  cashOnHand,
  destinationAddress,
  checkInDateText,
  duration,
  departureTimeText,
  arrivalTimeText,
  passportNumber,
  purposeOfTravel,
  governmentIdType,
  governmentIdNumber,
}: TravelProtectReviewSubmitProps) {
  const { t } = useLanguage();
  const valueOrNA = (value?: string) =>
    value && value.trim().length > 0 ? value : (t("travel.na") || "N/A");

  return (
    <View style={styles.formCard} pointerEvents="box-none">
      <View style={styles.formHeader} pointerEvents="box-none">
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="clipboard-check"
            size={24}
            color={THEME_COLOR}
          />
        </View>
        <View style={styles.formHeaderTextContainer} pointerEvents="box-none">
          <Text style={styles.formTitle}>{t("travel.reviewSubmit")}</Text>
          <Text style={styles.formSubtitle}>{t("travel.reviewSubtitle")}</Text>
        </View>
      </View>

      {/* Contact Information Summary */}
      <View style={styles.reviewSection} pointerEvents="box-none">
        <View style={styles.reviewSectionHeader} pointerEvents="box-none">
          <MaterialCommunityIcons
            name="home-account"
            size={18}
            color={THEME_COLOR}
          />
          <Text style={styles.reviewSectionTitle}>
            {t("travel.reviewContactInfo")}
          </Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>{t("travel.labelEmail")}</Text>
          <Text style={styles.reviewValue}>{emailAddress}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>{t("travel.labelMobile")}</Text>
          <Text style={styles.reviewValue}>
            {valueOrNA(`${mobileDialCode}${mobileNumber}`)}
          </Text>
        </View>
        {landlineNumber && (
          <View style={styles.reviewItem} pointerEvents="box-none">
            <Text style={styles.reviewLabel}>{t("travel.labelLandline")}</Text>
            <Text style={styles.reviewValue}>{landlineNumber}</Text>
          </View>
        )}
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>{t("travel.labelHomeAddress")}</Text>
          <Text style={styles.reviewValue}>{homeAddress}</Text>
        </View>
      </View>

      {/* Personal Details Summary */}
      <View style={styles.reviewSection} pointerEvents="box-none">
        <View style={styles.reviewSectionHeader} pointerEvents="box-none">
          <MaterialCommunityIcons name="account-details" size={18} color={THEME_COLOR} />
          <Text style={styles.reviewSectionTitle}>Personal Details</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Gender</Text>
          <Text style={styles.reviewValue}>{valueOrNA(gender)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Date of Birth</Text>
          <Text style={styles.reviewValue}>{valueOrNA(dateOfBirthText)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Civil Status</Text>
          <Text style={styles.reviewValue}>{valueOrNA(civilStatus)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Citizenship</Text>
          <Text style={styles.reviewValue}>{valueOrNA(citizenship)}</Text>
        </View>
      </View>

      {/* Financial Details Summary */}
      <View style={styles.reviewSection} pointerEvents="box-none">
        <View style={styles.reviewSectionHeader} pointerEvents="box-none">
          <MaterialCommunityIcons name="wallet-outline" size={18} color={THEME_COLOR} />
          <Text style={styles.reviewSectionTitle}>Financial Details</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Source of Fund</Text>
          <Text style={styles.reviewValue}>{valueOrNA(sourceOfFund)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Gross Monthly Income</Text>
          <Text style={styles.reviewValue}>
            {valueOrNA(`${grossMonthlyIncome} ${grossMonthlyIncomeCurrency}`)}
          </Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Cash on Hand</Text>
          <Text style={styles.reviewValue}>{valueOrNA(cashOnHand)}</Text>
        </View>
      </View>

      {/* Travel Details Summary */}
      <View style={styles.reviewSection} pointerEvents="box-none">
        <View style={styles.reviewSectionHeader} pointerEvents="box-none">
          <MaterialCommunityIcons
            name="airplane-takeoff"
            size={18}
            color={THEME_COLOR}
          />
          <Text style={styles.reviewSectionTitle}>
            {t("travel.reviewTravelDetails")}
          </Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>{t("travel.labelDestination")}</Text>
          <Text style={styles.reviewValue}>{valueOrNA(destinationAddress)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Check-in Date</Text>
          <Text style={styles.reviewValue}>{valueOrNA(checkInDateText)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Duration</Text>
          <Text style={styles.reviewValue}>{valueOrNA(duration)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Departure Time</Text>
          <Text style={styles.reviewValue}>{valueOrNA(departureTimeText)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Arrival Time</Text>
          <Text style={styles.reviewValue}>{valueOrNA(arrivalTimeText)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>{t("travel.labelPassport")}</Text>
          <Text style={styles.reviewValue}>{valueOrNA(passportNumber)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Purpose of Travel</Text>
          <Text style={styles.reviewValue}>{valueOrNA(purposeOfTravel)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Government ID Type</Text>
          <Text style={styles.reviewValue}>{valueOrNA(governmentIdType)}</Text>
        </View>
        <View style={styles.reviewItem} pointerEvents="box-none">
          <Text style={styles.reviewLabel}>Government ID Number</Text>
          <Text style={styles.reviewValue}>{valueOrNA(governmentIdNumber)}</Text>
        </View>
      </View>

      {/* Terms & Conditions */}
      <View style={styles.termsBox} pointerEvents="box-none">
        <Text style={styles.termsText}>{t("travel.termsText")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  formHeaderTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
    flexShrink: 1,
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    flexShrink: 1,
  },
  termsBox: {
    backgroundColor: "rgba(255, 235, 205, 0.4)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: THEME_COLOR,
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});
