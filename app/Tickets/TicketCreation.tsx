import { TICKET_CATEGORIES } from "@/constants/ticketCategories";
import { createTicket, type CreateTicketDto } from "@/lib/tickets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../context/LanguageContext";

interface TicketCreationProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (ticketId: string) => void;
  accessToken: string;
}

const PRIORITY_CONFIG = {
  LOW: { color: "#22C55E", bgColor: "rgba(34, 197, 94, 0.12)" },
  MEDIUM: { color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.12)" },
  HIGH: { color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.12)" },
} as const;

export default function TicketCreation({
  open,
  onClose,
  onSuccess,
  accessToken,
}: TicketCreationProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 380;
  const [formValue, setFormValue] = useState<CreateTicketDto>({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [loading, setLoading] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async () => {
    const title = formValue.title.trim();
    const description = formValue.description.trim();

    if (!title) {
      Alert.alert(t("common.error"), t("tickets.validationTitle"));
      return;
    }
    if (title.length < 5) {
      Alert.alert(t("common.error"), t("tickets.validationTitleMin"));
      return;
    }

    if (!description) {
      Alert.alert(t("common.error"), t("tickets.validationDescription"));
      return;
    }
    if (description.length < 10) {
      Alert.alert(t("common.error"), t("tickets.validationDescriptionMin"));
      return;
    }

    if (!formValue.category) {
      Alert.alert(t("common.error"), t("tickets.validationCategory"));
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const payload: CreateTicketDto = {
        ...formValue,
        title,
        description,
      };
      if (formValue.category?.trim()) {
        payload.category = formValue.category.trim();
      } else {
        delete payload.category;
      }
      const result = await createTicket(accessToken, payload);
      Alert.alert(t("common.success"), t("tickets.createdSuccess"));
      setFormValue({ title: "", description: "", priority: "MEDIUM", category: undefined });
      onSuccess?.(result.id);
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("tickets.createFailed");
      Alert.alert(t("common.error"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={[styles.header, isSmallScreen && styles.headerSmall]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons
              name="ticket-outline"
              size={isSmallScreen ? 18 : 22}
              color="#FFFFFF"
            />
            <Text style={[styles.headerTitle, isSmallScreen && styles.headerTitleSmall]}>
              {t("tickets.create")}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              isSmallScreen && styles.scrollContentSmall,
              { paddingBottom: insets.bottom + (isSmallScreen ? 16 : 24) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, isSmallScreen && styles.cardSmall]}>
              <Text style={[styles.cardTitle, isSmallScreen && styles.cardTitleSmall]}>
                {t("tickets.createTitle")}
              </Text>
              <Text style={[styles.cardSubtitle, isSmallScreen && styles.cardSubtitleSmall]}>
                {t("tickets.createSubtitle")}
              </Text>

              {/* Title */}
              <View style={[styles.field, isSmallScreen && styles.fieldSmall]}>
                <Text style={styles.label}>
                  {t("tickets.titleLabel")} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, isSmallScreen && styles.inputSmall]}
                  placeholder={t("tickets.titlePlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  value={formValue.title}
                  onChangeText={(v) => setFormValue({ ...formValue, title: v })}
                  editable={!loading}
                />
              </View>

              {/* Description */}
              <View style={[styles.field, isSmallScreen && styles.fieldSmall]}>
                <Text style={styles.label}>
                  {t("tickets.descriptionLabel")} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t("tickets.descriptionPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  value={formValue.description}
                  onChangeText={(v) => setFormValue({ ...formValue, description: v })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              {/* Priority */}
              <View style={[styles.field, isSmallScreen && styles.fieldSmall]}>
                <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
                  {t("tickets.priorityLabel")}
                </Text>
                <View style={[styles.priorityRow, isSmallScreen && styles.priorityRowSmall]}>
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => {
                    const config = PRIORITY_CONFIG[p];
                    const isActive = formValue.priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityChip,
                          { backgroundColor: isActive ? config.bgColor : "#F3F4F6" },
                          isActive && { borderColor: config.color, borderWidth: 2 },
                        ]}
                        onPress={() => setFormValue({ ...formValue, priority: p })}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name="flag"
                          size={isSmallScreen ? 12 : 14}
                          color={isActive ? config.color : "#9CA3AF"}
                        />
                        <Text
                          style={[
                            styles.priorityLabel,
                            isSmallScreen && styles.priorityLabelSmall,
                            isActive && { color: config.color, fontWeight: "700" },
                          ]}
                        >
                          {t(`tickets.priority.${p}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Category (Optional) - Responsive dropdown */}
              <View style={[styles.field, isSmallScreen && styles.fieldSmall]}>
                <Text style={styles.label}>{t("tickets.categoryLabel")}</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    styles.categoryInput,
                    isSmallScreen && styles.inputSmall,
                    categoryDropdownOpen && styles.dropdownTriggerOpen,
                  ]}
                  onPress={() => setCategoryDropdownOpen(true)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !formValue.category && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {formValue.category
                      ? TICKET_CATEGORIES.find((c) => c.value === formValue.category)
                        ? t(
                            TICKET_CATEGORIES.find((c) => c.value === formValue.category)!
                              .labelKey,
                          )
                        : formValue.category
                      : t("tickets.categorySelectPlaceholder")}
                  </Text>
                  <Ionicons
                    name={categoryDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                <Modal
                  visible={categoryDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setCategoryDropdownOpen(false)}
                >
                  <TouchableOpacity
                    style={styles.dropdownBackdrop}
                    activeOpacity={1}
                    onPress={() => setCategoryDropdownOpen(false)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dropdownSheet,
                        isSmallScreen && styles.dropdownSheetSmall,
                        {
                          maxHeight: Math.min(height * 0.7, 420),
                          paddingBottom: insets.bottom + (isSmallScreen ? 12 : 20),
                        },
                      ]}
                      activeOpacity={1}
                      onPress={() => {}}
                    >
                      <View style={styles.dropdownSheetHeader}>
                        <Text style={[styles.dropdownSheetTitle, isSmallScreen && styles.dropdownSheetTitleSmall]}>
                          {t("tickets.categoryLabel")}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setCategoryDropdownOpen(false)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView
                        style={styles.dropdownScroll}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {TICKET_CATEGORIES.map((cat) => {
                          const isSelected = formValue.category === cat.value;
                          return (
                            <TouchableOpacity
                              key={cat.value}
                              style={[
                                styles.dropdownOption,
                                isSmallScreen && styles.dropdownOptionSmall,
                                isSelected && styles.dropdownOptionSelected,
                              ]}
                              onPress={() => {
                                setFormValue({ ...formValue, category: cat.value });
                                setCategoryDropdownOpen(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  isSelected && styles.dropdownOptionTextSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {t(cat.labelKey)}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={22} color="#E15816" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isSmallScreen && styles.submitBtnSmall,
                  loading && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#E25A17", "#F28934"]}
                  style={[styles.submitBtnGradient, isSmallScreen && styles.submitBtnSmallGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="send"
                        size={isSmallScreen ? 18 : 20}
                        color="#FFFFFF"
                      />
                      <Text style={[styles.submitText, isSmallScreen && styles.submitTextSmall]}>
                        {t("tickets.create")}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "#E15816",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerBack: {
    padding: 8,
    marginLeft: 4,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  headerSmall: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  headerTitleSmall: {
    fontSize: 15,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  scrollContentSmall: {
    padding: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSmall: {
    padding: 16,
    borderRadius: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardTitleSmall: {
    fontSize: 16,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
  },
  cardSubtitleSmall: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  field: {
    marginBottom: 20,
  },
  fieldSmall: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  labelSmall: {
    fontSize: 13,
    marginBottom: 6,
  },
  required: {
    color: "#E15816",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputSmall: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    borderRadius: 10,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  textAreaSmall: {
    minHeight: 90,
    paddingTop: 12,
  },
  categoryInput: {
    minHeight: 48,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  dropdownTriggerOpen: {
    borderColor: "#E15816",
    borderWidth: 2,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  dropdownSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: "85%",
  },
  dropdownSheetSmall: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
  },
  dropdownSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dropdownSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  dropdownSheetTitleSmall: {
    fontSize: 15,
  },
  dropdownScroll: {
    maxHeight: 340,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  dropdownOptionSmall: {
    paddingVertical: 12,
  },
  dropdownOptionSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  dropdownOptionTextSelected: {
    color: "#E15816",
    fontWeight: "600",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 10,
  },
  priorityRowSmall: {
    gap: 6,
  },
  priorityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  priorityChipSmall: {
    paddingVertical: 10,
    gap: 4,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  priorityLabelSmall: {
    fontSize: 11,
  },
  submitBtn: {
    borderRadius: 14,
    marginTop: 28,
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitBtnSmall: {
    marginTop: 20,
  },
  submitBtnSmallGradient: {
    paddingVertical: 14,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  submitTextSmall: {
    fontSize: 15,
  },
});
