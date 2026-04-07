import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/LanguageContext";
import type { NavProp } from "../../../types/navigation";

const ORANGE_GRADIENT: readonly [string, string] = ["#E25A17", "#F28934"];

function Rule() {
  return <View style={styles.rule} />;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletBlock}>
      {items.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

export default function RewardsTermsCon() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={ORANGE_GRADIENT}
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("rewardPoints.termsScreenTitle")}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <View style={styles.heroCard}>
          <Text style={styles.mainTitle}>{t("rewardPoints.terms.mainTitle")}</Text>
          <Text style={styles.subtitle}>{t("rewardPoints.terms.subtitle")}</Text>
          <View style={styles.noticePill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#C2410C" />
            <Text style={styles.noticePillText}>{t("rewardPoints.terms.notice")}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section1.title")}</Text>
          <Text style={styles.body}>
            {t("rewardPoints.terms.section1.body1")}
          </Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section1.body2")}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section2.title")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section2.item1"),
              t("rewardPoints.terms.section2.item2"),
              t("rewardPoints.terms.section2.item3"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section3.title")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section3.item1"),
              t("rewardPoints.terms.section3.item2"),
              t("rewardPoints.terms.section3.item3"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section4.title")}</Text>
          <Rule />
          <Text style={styles.subHeading}>{t("rewardPoints.terms.section4.eligibilityTitle")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section4.eligibilityItem1"),
              t("rewardPoints.terms.section4.eligibilityItem2"),
              t("rewardPoints.terms.section4.eligibilityItem3"),
            ]}
          />
          <Text style={styles.subHeading}>{t("rewardPoints.terms.section4.restrictionsTitle")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section4.restrictionsItem1"),
              t("rewardPoints.terms.section4.restrictionsItem2"),
              t("rewardPoints.terms.section4.restrictionsItem3"),
            ]}
          />
          <Text style={styles.subHeading}>{t("rewardPoints.terms.section4.adjustmentTitle")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section4.adjustmentBody")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section4.adjustmentItem1"),
              t("rewardPoints.terms.section4.adjustmentItem2"),
              t("rewardPoints.terms.section4.adjustmentItem3"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section5.title")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section5.item1"),
              t("rewardPoints.terms.section5.item2"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section6.title")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section6.item1"),
              t("rewardPoints.terms.section6.item2"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section7.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section7.body1")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section7.item1"),
              t("rewardPoints.terms.section7.item2"),
              t("rewardPoints.terms.section7.item3"),
            ]}
          />
          <Text style={styles.body}>{t("rewardPoints.terms.section7.body2")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section7.item4"),
              t("rewardPoints.terms.section7.item5"),
              t("rewardPoints.terms.section7.item6"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section8.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section8.body1")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section8.item1"),
              t("rewardPoints.terms.section8.item2"),
              t("rewardPoints.terms.section8.item3"),
            ]}
          />
          <Text style={styles.body}>{t("rewardPoints.terms.section8.body2")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section8.item4"),
              t("rewardPoints.terms.section8.item5"),
              t("rewardPoints.terms.section8.item6"),
              t("rewardPoints.terms.section8.item7"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section9.title")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section9.item1"),
              t("rewardPoints.terms.section9.item2"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section10.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section10.body1")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section10.item1"),
              t("rewardPoints.terms.section10.item2"),
              t("rewardPoints.terms.section10.item3"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section11.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section11.body1")}</Text>
          <Bullets
            items={[
              t("rewardPoints.terms.section11.item1"),
              t("rewardPoints.terms.section11.item2"),
              t("rewardPoints.terms.section11.item3"),
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section12.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section12.body1")}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section13.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section13.body1")}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("rewardPoints.terms.section14.title")}</Text>
          <Text style={styles.body}>{t("rewardPoints.terms.section14.body1")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  header: { paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 10 },
  heroCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    padding: 14,
  },
  mainTitle: { fontSize: 18, fontWeight: "800", color: "#9A3412", marginBottom: 4 },
  subtitle: { fontSize: 13, fontWeight: "600", color: "#9A3412", marginBottom: 10 },
  noticePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
  },
  noticePillText: { fontSize: 11, color: "#7C2D12", fontWeight: "600", flex: 1 },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1F2937", marginBottom: 8 },
  subHeading: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 8, marginBottom: 4 },
  body: { fontSize: 13, color: "#4B5563", lineHeight: 20, marginBottom: 8 },
  rule: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  bulletBlock: { marginBottom: 2 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5, paddingRight: 8 },
  bulletMark: { fontSize: 13, color: "#6B7280", marginRight: 8, lineHeight: 20, width: 12 },
  bulletText: { flex: 1, fontSize: 13, color: "#4B5563", lineHeight: 20 },
});
