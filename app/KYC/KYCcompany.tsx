import { getCompanyKycStatus, submitCompanyKyc } from "@/configs/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Alert,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLanguage } from "../../context/LanguageContext";

const REFERENCE_WIDTH = 393;

const THEME_COLOR = "#E15816";

export default function KYCcompany() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scale = Math.min(width / REFERENCE_WIDTH, 1.2);
  const headerPaddingTop =
    Platform.OS === "ios"
      ? Math.max(insets.top, 12)
      : Math.max(StatusBar.currentHeight ?? 0, insets.top, 12);
  const headerPaddingBottom = Math.round(14 * scale);
  const headerPaddingHorizontal = Math.max(16, Math.min(24, Math.round(width * 0.052)));
  const headerTitleFontSize = Math.round(18 * scale + 2);
  const headerBackButtonSize = Math.round(40 * scale);
  const headerBackIconSize = Math.round(22 * scale + 2);
  const statusBadgeMarginTop = Math.round(8 * scale + 2);
  const statusBadgeFontSize = Math.round(12 * scale);
  const statusBadgeIconSize = Math.round(14 * scale);

  const [companyName, setCompanyName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [commercialRegister, setCommercialRegister] = useState<string | null>(null);
  const [commercialRegisterMime, setCommercialRegisterMime] = useState<string | null>(null);
  const [commercialRegisterName, setCommercialRegisterName] = useState<string | null>(null);
  const [bankStatement, setBankStatement] = useState<string | null>(null);
  const [bankStatementMime, setBankStatementMime] = useState<string | null>(null);
  const [bankStatementName, setBankStatementName] = useState<string | null>(null);
  const [proofOfBilling, setProofOfBilling] = useState<string | null>(null);
  const [proofOfBillingMime, setProofOfBillingMime] = useState<string | null>(null);
  const [proofOfBillingName, setProofOfBillingName] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyKycStatus, setCompanyKycStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) return;
        const result = await getCompanyKycStatus(token);
        if (result.success && result.data) {
          const data = result.data;
          const status = String(data.status ?? "").toUpperCase();
          setCompanyKycStatus(status || null);
          const name = data.companyName;
          if (typeof name === "string") {
            setCompanyName((prev) => prev || name);
          }
        }
      } catch (e) {
        console.error("[Company KYC] Failed to load status", e);
      }
    };
    fetchStatus();
  }, []);

  const pickDocument = async (
    setUri: (uri: string | null) => void,
    setName: (name: string | null) => void,
    setMime: (mime: string | null) => void,
    label: string,
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? "";
        const fileName = asset.name ?? asset.uri.split("/").pop() ?? "";
        const lower = fileName.toLowerCase();
        const isSupported =
          mimeType === "application/pdf" ||
          mimeType === "application/msword" ||
          mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx");
        if (!isSupported) {
          Alert.alert("Invalid File", `Only PDF or Word documents are accepted for ${label}.`);
          return;
        }
        setUri(asset.uri);
        setName(fileName);
        setMime(mimeType || null);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const toFileDataUrl = async (uri: string, mimeType: string): Promise<string> => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const safeMime = mimeType && typeof mimeType === "string" ? mimeType : "application/octet-stream";
    return `data:${safeMime};base64,${base64}`;
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert("Validation", "Please enter your company name.");
      return;
    }
    if (!commercialRegister || !bankStatement || !proofOfBilling) {
      Alert.alert("Validation", "Please upload all required documents.");
      return;
    }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        Alert.alert("Error", "You must be logged in to submit company KYC.");
        return;
      }
      const [crData, bsData, pbData] = await Promise.all([
        toFileDataUrl(commercialRegister, commercialRegisterMime || "application/pdf"),
        toFileDataUrl(bankStatement, bankStatementMime || "application/pdf"),
        toFileDataUrl(proofOfBilling, proofOfBillingMime || "application/pdf"),
      ]);
      const { success, error } = await submitCompanyKyc(token, {
        companyName: companyName.trim(),
        documents: {
          commercialRegister: crData,
          bankStatement: bsData,
          proofOfBilling: pbData,
        },
      });
      if (!success) {
        Alert.alert("Error", error || "Failed to submit company KYC.");
        return;
      }
      setCompanyKycStatus("PENDING");
      setShowSuccessModal(true);
    } catch (e: unknown) {
      console.error("Error submitting company KYC:", e);
      Alert.alert("Error", (e as Error)?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const isFormComplete =
    companyName.trim().length > 0 &&
    !!commercialRegister &&
    !!bankStatement &&
    !!proofOfBilling;

  const isApproved = companyKycStatus === "APPROVED";
  const isPending = companyKycStatus === "PENDING";
  const isRejected = companyKycStatus === "REJECTED";
  const isLocked = isApproved || isPending;
  const showStatusBadge = !!companyKycStatus;

  const docs = [
    {
      label: "Commercial Register",
      uri: commercialRegister,
      name: commercialRegisterName,
      setUri: setCommercialRegister,
      setName: setCommercialRegisterName,
      setMime: setCommercialRegisterMime,
    },
    {
      label: "Bank Statement",
      uri: bankStatement,
      name: bankStatementName,
      setUri: setBankStatement,
      setName: setBankStatementName,
      setMime: setBankStatementMime,
    },
    {
      label: "Proof of Billing",
      uri: proofOfBilling,
      name: proofOfBillingName,
      setUri: setProofOfBilling,
      setName: setProofOfBillingName,
      setMime: setProofOfBillingMime,
    },
  ];

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Gradient header — back left, title centered, status badge */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradientHeader,
            {
              paddingTop: headerPaddingTop,
              paddingBottom: headerPaddingBottom,
              paddingHorizontal: headerPaddingHorizontal,
            },
          ]}
        >
          <View style={styles.gradientHeaderRow}>
            <TouchableOpacity
              style={[styles.headerBackButton, { width: headerBackButtonSize, height: headerBackButtonSize }]}
              onPress={handleCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={headerBackIconSize} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleBlock}>
              <Text style={[styles.headerTitle, { fontSize: headerTitleFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
                Company Verification
              </Text>
            </View>
            <View style={[styles.headerRightSpacer, { width: headerBackButtonSize, height: headerBackButtonSize }]} />
          </View>
          {showStatusBadge && (
            <View style={[styles.statusBadgeRow, { marginTop: statusBadgeMarginTop }]}>
              <View
                style={[
                  styles.statusBadge,
                  isApproved && styles.statusBadgeApproved,
                  isPending && styles.statusBadgePending,
                  isRejected && styles.statusBadgeRejected,
                ]}
              >
                <Ionicons
                  name={isApproved ? "checkmark-circle" : isRejected ? "close-circle" : "time-outline"}
                  size={statusBadgeIconSize}
                  color="#FFFFFF"
                />
                <Text style={[styles.statusBadgeText, { fontSize: statusBadgeFontSize }]}>
                  {isApproved ? "Verified" : isRejected ? "Rejected" : "Unverified"}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1 — Company Name */}
          <View style={styles.contentCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBadge}>
                <Ionicons
                  name="business-outline"
                  size={22}
                  color={THEME_COLOR}
                />
              </View>
              <Text style={styles.cardTitle}>
                Company Name <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <TextInput
              style={[styles.textInput, isLocked && styles.readonlyInput]}
              placeholder="Sample Company"
              placeholderTextColor="#BDBDBD"
              value={companyName}
              onChangeText={isLocked ? undefined : setCompanyName}
              editable={!isLocked}
            />
          </View>

          {/* Card 2 — Business Requirements */}
          <View style={[styles.contentCard, styles.contentCardSpacing]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBadge}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={THEME_COLOR}
                />
              </View>
              <Text style={[styles.cardTitle, { flex: 1 }]}>
                Business Requirements
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isEditing ? "checkmark-outline" : "create-outline"}
                  size={16}
                  color={THEME_COLOR}
                />
                <Text style={styles.editButtonText}>
                  {isEditing ? "Done" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Document rows */}
            {docs.map((doc, index) => (
              <View key={doc.label}>
                {index > 0 && <View style={styles.docRowDivider} />}
                <TouchableOpacity
                  style={styles.docRow}
                  onPress={isLocked ? undefined : () => pickDocument(doc.setUri, doc.setName, doc.setMime, doc.label)}
                  activeOpacity={isLocked ? 1 : 0.7}
                  disabled={isLocked}
                >
                  <View
                    style={[
                      styles.docIconCircle,
                      doc.uri && styles.docIconCircleUploaded,
                    ]}
                  >
                    <Ionicons
                      name={doc.uri ? "document" : "document-outline"}
                      size={20}
                      color={doc.uri ? "#10B981" : "#9E9E9E"}
                    />
                  </View>
                  <View style={styles.docRowInfo}>
                    <Text style={styles.docRowText}>
                      {doc.label} <Text style={styles.required}>*</Text>
                    </Text>
                    <Text style={styles.docRowSubtitle} numberOfLines={1}>
                      {doc.name ?? "Select PDF file"}
                    </Text>
                  </View>
                  {doc.uri && (
                    <View style={styles.uploadedRowBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.uploadedRowBadgeText}>Uploaded</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButtonWrapper,
              (!isFormComplete || submitting || isLocked) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={isFormComplete && !submitting && !isLocked ? 0.9 : 1}
            disabled={!isFormComplete || submitting || isLocked}
          >
            <LinearGradient
              colors={
                isFormComplete && !isLocked ? ["#E15816", "#F48F38"] : ["#BDBDBD", "#BDBDBD"]
              }
              style={styles.saveButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>{submitting ? "Submitting..." : "Save"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={["#E15816", "#F48F38"]}
                style={styles.successIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark" size={48} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Success</Text>
            <Text style={styles.successMessage}>
              Business documents uploaded successfully!
            </Text>
            <TouchableOpacity
              style={styles.successButtonWrapper}
              onPress={handleSuccessClose}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#E15816", "#F48F38"]}
                style={styles.successButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.successButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  gradientHeader: {},
  gradientHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBackButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerRightSpacer: {},
  statusBadgeRow: {},
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#9CA3AF",
    gap: 6,
  },
  statusBadgeApproved: { backgroundColor: "#10B981" },
  statusBadgePending: { backgroundColor: "#F59E0B" },
  statusBadgeRejected: { backgroundColor: "#EF4444" },
  statusBadgeText: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  readonlyInput: {
    backgroundColor: "#E5E7EB",
  },
  // ─────────────────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // ── White card ────────────────────────────────────────────────────────────
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  contentCardSpacing: {
    marginTop: 16,
  },
  // ── Card header row (icon badge + title + optional action) ────────────────
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  required: {
    color: THEME_COLOR,
  },
  // ── Company name input ────────────────────────────────────────────────────
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111111",
    backgroundColor: "#FAFAFA",
  },
  // ── Edit button ───────────────────────────────────────────────────────────
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(225, 88, 22, 0.1)",
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME_COLOR,
  },
  // ── Document rows ─────────────────────────────────────────────────────────
  docRowDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 4,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  docIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  docIconCircleUploaded: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  docRowInfo: {
    flex: 1,
  },
  docRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 3,
  },
  docRowSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  uploadedRowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 20,
  },
  uploadedRowBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  // ─────────────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  saveButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // ── Success modal ─────────────────────────────────────────────────────────
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
    padding: 32,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  successButtonWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  successButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
