import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";

export interface TravelProtectReviewSubmitProps {
  emailAddress: string;
  mobileNumber: string;
  landlineNumber: string;
  homeAddress: string;
  destinationAddress: string;
  airline: string;
  passportNumber: string;
}

export default function TravelProtectReviewSubmit({
  emailAddress,
  mobileNumber,
  landlineNumber,
  homeAddress,
  destinationAddress,
  airline,
  passportNumber,
}: TravelProtectReviewSubmitProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <View style={styles.formIconContainer}>
          <MaterialCommunityIcons
            name="clipboard-check"
            size={24}
            color="#E25A17"
          />
        </View>
        <View>
          <Text style={styles.formTitle}>{t("travel.reviewSubmit")}</Text>
          <Text style={styles.formSubtitle}>
            {t("travel.reviewSubtitle")}
          </Text>
        </View>
      </View>

      {/* Contact Information Summary */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <MaterialCommunityIcons
            name="home-account"
            size={18}
            color="#E25A17"
          />
          <Text style={styles.reviewSectionTitle}>
            {t("travel.reviewContactInfo")}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>{t("travel.labelEmail")}</Text>
          <Text style={styles.reviewValue}>{emailAddress}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>{t("travel.labelMobile")}</Text>
          <Text style={styles.reviewValue}>{mobileNumber}</Text>
        </View>
        {landlineNumber && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>{t("travel.labelLandline")}</Text>
            <Text style={styles.reviewValue}>{landlineNumber}</Text>
          </View>
        )}
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>{t("travel.labelHomeAddress")}</Text>
          <Text style={styles.reviewValue}>{homeAddress}</Text>
        </View>
      </View>

      {/* Travel Details Summary */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <MaterialCommunityIcons
            name="airplane-takeoff"
            size={18}
            color="#E25A17"
          />
          <Text style={styles.reviewSectionTitle}>
            {t("travel.reviewTravelDetails")}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>
            {t("travel.labelDestination")}
          </Text>
          <Text style={styles.reviewValue}>
            {destinationAddress || t("travel.na")}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>{t("travel.labelAirline")}</Text>
          <Text style={styles.reviewValue}>{airline || t("travel.na")}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>{t("travel.labelPassport")}</Text>
          <Text style={styles.reviewValue}>
            {passportNumber || t("travel.na")}
          </Text>
        </View>
      </View>

      {/* Terms & Conditions */}
      <View style={styles.termsBox}>
        <Text style={styles.termsText}>
          {t("travel.termsText")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#999",
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
    color: "#E25A17",
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
  },
  termsBox: {
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E25A17",
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});
