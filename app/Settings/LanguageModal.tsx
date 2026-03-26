import { Ionicons } from "@expo/vector-icons";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useIdleTimeout } from "../../context/IdleTimeoutContext";
import { useLanguage } from "../../context/LanguageContext";
import { useLanguageModal } from "../../context/LanguageModalContext";

const SUPPORTED_LANGUAGES = [
  { label: "English", flag: "🇺🇸" },
  { label: "Arabic", flag: "🇸🇦" },
  { label: "Japanese", flag: "🇯🇵" },
  { label: "Korean", flag: "🇰🇷" },
];

export default function LanguageModal() {
  const { t, language, setLanguage } = useLanguage();
  const { languageModalVisible, closeLanguageModal } = useLanguageModal();
  const { registerActivity, getActivityProps } = useIdleTimeout();
  const activityProps = getActivityProps();

  return (
    <Modal
      visible={languageModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeLanguageModal}
    >
      <TouchableOpacity
        style={styles.languageModalOverlay}
        activeOpacity={1}
        onPress={() => {
          registerActivity();
          closeLanguageModal();
        }}
        {...activityProps}
      >
        <View
          style={styles.languageModalContentOuter}
          onStartShouldSetResponder={() => true}
          {...activityProps}
        >
          <View style={styles.languageModalHeader}>
            <View style={styles.languageMapGlobe}>
              <Ionicons name="globe-outline" size={50} color="#DE5212" />
            </View>
            <Text style={styles.languageModalTitle}>
              {t("profile.selectLanguage")}
            </Text>
            <Text style={styles.languageModalSubtitle}>
              {t("profile.defaultIsEnglish")}
            </Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.languageOption,
                  language === label && styles.languageOptionSelected,
                ]}
                onPress={() => {
                  registerActivity();
                  setLanguage(label);
                  closeLanguageModal();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.languageOptionFlag}>{flag}</Text>
                <Text
                  style={[
                    styles.languageOptionText,
                    language === label && styles.languageOptionTextSelected,
                  ]}
                >
                  {label}
                </Text>
                {language === label ? (
                  <Ionicons name="checkmark-circle" size={22} color="#DE5212" />
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.languageModalCancel}
            onPress={() => {
              registerActivity();
              closeLanguageModal();
            }}
          >
            <Text style={styles.languageModalCancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.46)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  languageModalContentOuter: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#DE5212",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  languageModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  languageMapGlobe: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: "rgba(222, 82, 18, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
    marginTop: 12,
    textAlign: "center",
  },
  languageModalSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "transparent",
  },
  languageOptionSelected: {
    backgroundColor: "#FFF0E8",
    borderWidth: 2,
    borderColor: "#DE5212",
  },
  languageOptionFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  languageOptionTextSelected: {
    fontWeight: "600",
    color: "#DE5212",
  },
  languageModalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  languageModalCancelText: {
    color: "#666",
    fontSize: 16,
  },
});
