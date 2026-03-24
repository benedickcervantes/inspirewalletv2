import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
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
import { useLanguage } from "../../context/LanguageContext";
import type { RootStackParamList } from "../../types/navigation";

const THEME_COLOR = "#E15816";
const ORANGE_GRADIENT = ["#E25A17", "#F28934"] as const;
const COUNTRY_OPTIONS = ["Philippines", "Japan", "South Korea", "Saudi Arabia", "Other"];
const REFERENCE_WIDTH = 375;
const FOOTER_BUTTON_HEIGHT = 54;

export default function KYCAddressInformation() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "KYCAddressInformation">>();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scale = Math.min(width / REFERENCE_WIDTH, 1.25);
  const horizontalPadding = Math.max(12, Math.min(22, Math.round(width * 0.045)));
  const contentPadding = Math.max(12, Math.min(24, Math.round(width * 0.048)));
  const safePaddingTop = Platform.OS === "android"
    ? (StatusBar.currentHeight ?? 0)
    : insets.top;
  const safePaddingBottom = Math.max(insets.bottom, 16);
  const footerPaddingBottom = Platform.OS === "ios" ? Math.max(insets.bottom, 20) : 20;
  const labelFontSize = Math.round(14 * scale);
  const inputFontSize = Math.round(16 * scale);
  const descriptionFontSize = Math.round(14 * scale);

  const [country, setCountry] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    if (!country.trim()) return;
    if (!fullAddress.trim()) return;
    if (!postalCode.trim()) return;
    // Navigate to next step or save data
    // navigation.navigate("NextScreen");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        {/* Header */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: safePaddingTop }]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{t("kyc.addressInformation")}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          enabled={Platform.OS === "ios"}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: 20,
                paddingBottom: 24 + safePaddingBottom + footerHeight,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Address Information Card */}
            <View style={[styles.contentCard, { padding: contentPadding }]}>
              <View style={styles.stepIconWrapper}>
                <Ionicons name="location-outline" size={28} color={THEME_COLOR} />
              </View>
              <Text style={[styles.contentTitle, { fontSize: Math.round(18 * scale) }]}>{t("kyc.addressInformation")}</Text>
              <Text style={[styles.contentDescription, { fontSize: descriptionFontSize }]}>
                {t("kyc.addressDetailsDesc")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
                  {t("kyc.country")} <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      { fontSize: inputFontSize },
                      !country && styles.dropdownPlaceholder,
                    ]}
                  >
                    {country || t("kyc.placeholderCountry")}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
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
                <Text style={[styles.inputLabel, { fontSize: labelFontSize }]}>
                  {t("kyc.postalCode")} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, { fontSize: inputFontSize }]}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder={t("kyc.placeholderPostalCode")}
                  placeholderTextColor="#9E9E9E"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Footer */}
          <View
            style={[styles.footer, { paddingHorizontal: horizontalPadding, paddingBottom: footerPaddingBottom }]}
            onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          >
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
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
  bottomSpacing: {
    height: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  backButtonFooter: {
    flex: 1,
    height: FOOTER_BUTTON_HEIGHT,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  nextButtonFlex: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    height: FOOTER_BUTTON_HEIGHT,
  },
  nextGradient: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 16,
    lineHeight: 20,
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
});
