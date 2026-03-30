import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useIdleTimeout } from "../../context/IdleTimeoutContext";
import { useLanguage } from "../../context/LanguageContext";
import type { NavProp } from "../../types/navigation";

const SECTIONS = [
  { headingKey: "terms.h1", bodyKey: "terms.b1" },
  { headingKey: "terms.h2", bodyKey: "terms.b2" },
  {
    headingKey: "terms.h3",
    introKey: "terms.i3",
    bulletKeys: ["terms.b3_1", "terms.b3_2", "terms.b3_3"],
  },
  { headingKey: "terms.h4", bodyKey: "terms.b4" },
  { headingKey: "terms.h5", bodyKey: "terms.b5" },
  { headingKey: "terms.h6", bodyKey: "terms.b6" },
  { headingKey: "terms.h7", bodyKey: "terms.b7" },
  { headingKey: "terms.h8", bodyKey: "terms.b8" },
  { headingKey: "terms.h9", bodyKey: "terms.b9" },
  {
    headingKey: "terms.h10",
    introKey: "terms.i10",
    contactTextKey: "terms.contactText",
    contactUrl: "https://inspire-alliance.com",
  },
];

const TermsConditions = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { stopIdleSession, startIdleSession } = useIdleTimeout();

  const handleOpenLink = async (url: string) => {
    // Stop idle session to prevent logout while browser is open
    await stopIdleSession();
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      // ignore errors
    } finally {
      // Restart idle session when returning
      await startIdleSession();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#DE5212", "#F38B35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.01, 1]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => (navigation as unknown as NavProp).goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("terms.title")}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {SECTIONS.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <View style={styles.headingRow}>
                <View style={styles.headingAccent} />
                <Text style={styles.heading}>{t(section.headingKey)}</Text>
              </View>
              {"introKey" in section && section.introKey ? (
                <Text style={styles.intro}>{t(section.introKey)}</Text>
              ) : null}
              {"bodyKey" in section && section.bodyKey ? (
                <Text style={styles.body}>{t(section.bodyKey)}</Text>
              ) : null}
              {"bulletKeys" in section && section.bulletKeys ? (
                <View style={styles.bulletList}>
                  {section.bulletKeys.map((key, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{t(key)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {"contactTextKey" in section &&
              section.contactTextKey &&
              "contactUrl" in section ? (
                <View style={styles.contactSection}>
                  <Text style={styles.contactIntro}>
                    {t(section.introKey!)}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      section.contactUrl && handleOpenLink(section.contactUrl)
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.contactLink}>
                      {t(section.contactTextKey)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headingAccent: {
    width: 4,
    borderRadius: 2,
    backgroundColor: "#F38B35",
    marginRight: 12,
    alignSelf: "stretch",
  },
  heading: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#F38B35",
  },
  intro: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 22,
    marginTop: 8,
  },
  body: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 22,
    marginTop: 8,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F38B35",
    marginRight: 10,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#333333",
    lineHeight: 22,
  },
  contactSection: {
    marginTop: 8,
  },
  contactIntro: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 22,
    fontStyle: "italic",
  },
  contactLink: {
    fontSize: 14,
    color: "#F38B35",
    fontWeight: "700",
    fontStyle: "italic",
    marginTop: 4,
  },
  bottomPadding: {
    height: 32,
  },
});

export default TermsConditions;
