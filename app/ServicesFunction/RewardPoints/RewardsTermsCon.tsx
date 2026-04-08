import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NavProp } from "../../../types/navigation";

const ORANGE_GRADIENT: readonly [string, string] = ["#DE5212", "#E15816"];

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
          <Text style={styles.headerTitle}>TERMS AND CONDITIONS</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <View style={styles.heroCard}>
          <Text style={styles.mainTitle}>Wallet Service & Campaign Policy</Text>
          <Text style={styles.subtitle}>Please review these terms before using the service.</Text>
          <View style={styles.noticePill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#E15816" />
            <Text style={styles.noticePillText}>{t("rewardPoints.terms.notice")}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.body}>
            These Terms and Conditions ("Terms") govern your use of the Wallet Service ("Service") provided by
            Inspire Holdings Inc. ("Company").
          </Text>
          <Text style={styles.body}>By using this Service, you agree to comply with all terms stated herein.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Bullets
            items={[
              "Users must complete identity verification (KYC)",
              "Users must provide accurate and valid information",
              "The Company reserves the right to reject or suspend any account",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Wallet Usage</Text>
          <Bullets
            items={[
              "Users may send, receive, and manage funds within the wallet",
              "All transactions must comply with applicable laws and regulations",
              "The Company may impose limits, restrictions, or monitoring at any time",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Campaign Rewards</Text>
          <Rule />
          <Text style={styles.subHeading}>4.1 Eligibility Rules</Text>
          <Bullets
            items={[
              "Rewards are granted only for legitimate transactions",
              "Only one transaction per day per user pair is eligible",
              "Repeated transactions with the same user will not earn rewards",
            ]}
          />
          <Text style={styles.subHeading}>4.2 Restrictions</Text>
          <Bullets
            items={[
              "Circular transactions (A -> B -> A) are prohibited",
              "Use of multiple or related accounts is prohibited",
              "Any artificial manipulation of rewards is prohibited",
            ]}
          />
          <Text style={styles.subHeading}>4.3 Reward Adjustment</Text>
          <Text style={styles.body}>The Company reserves the right to:</Text>
          <Bullets
            items={[
              "Cancel rewards",
              "Adjust reward amounts",
              "Modify or terminate campaigns at any time",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Maintenance Balance Requirement</Text>
          <Bullets
            items={[
              "Users must maintain a minimum balance of PHP 1,000",
              "Accounts below this threshold may not be eligible for rewards",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Transaction Limits</Text>
          <Bullets
            items={[
              "Daily eligible transaction limit: PHP 10,000",
              "Additional limits may be applied without prior notice",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7. Monitoring and Compliance</Text>
          <Text style={styles.body}>The Company reserves the right to monitor all activities including:</Text>
          <Bullets
            items={[
              "Transaction patterns",
              "Suspicious or unusual behavior",
              "KYC duplication (name, ID, device, IP, phone number)",
            ]}
          />
          <Text style={styles.body}>Accounts suspected of violating these Terms may be:</Text>
          <Bullets
            items={[
              "Restricted",
              "Suspended",
              "Permanently terminated",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>8. Notifications</Text>
          <Text style={styles.body}>Users will receive notifications via:</Text>
          <Bullets
            items={[
              "In-app messages",
              "Email",
              "SMS (for important alerts)",
            ]}
          />
          <Text style={styles.body}>Notifications may include:</Text>
          <Bullets
            items={[
              "Transaction confirmation",
              "Reward status",
              "Reasons for ineligibility",
              "Warnings or account notices",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>9. Fees</Text>
          <Bullets
            items={[
              "Certain transactions may be subject to fees (e.g., withdrawal fees)",
              "All applicable fees will be disclosed within the Service",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>10. Risk Disclosure</Text>
          <Text style={styles.body}>Users acknowledge that:</Text>
          <Bullets
            items={[
              "Service availability may be affected by system maintenance or external factors",
              "Delays or interruptions may occur",
              "The Company is not liable for losses caused by system issues beyond reasonable control",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.body}>The Company shall not be liable for:</Text>
          <Bullets
            items={[
              "User misuse or violation of Terms",
              "Unauthorized access due to user negligence",
              "External system failures or force majeure events",
            ]}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>12. Amendments</Text>
          <Text style={styles.body}>The Company reserves the right to update or modify these Terms at any time.</Text>
          <Text style={styles.body}>Continued use of the Service constitutes acceptance of updated Terms.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.body}>These Terms shall be governed by the laws applicable in the Philippines.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>14. Contact</Text>
          <Text style={styles.body}>For inquiries, please contact customer support.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 },
  heroCard: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#FFE4D6",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  mainTitle: { fontSize: 18, fontWeight: "800", color: "#E15816", marginBottom: 4 },
  subtitle: { fontSize: 13, fontWeight: "600", color: "#666666", marginBottom: 10 },
  noticePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FFE4D6",
  },
  noticePillText: { fontSize: 11, color: "#666666", fontWeight: "600", flex: 1 },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#333333", marginBottom: 8 },
  subHeading: { fontSize: 13, fontWeight: "700", color: "#E15816", marginTop: 8, marginBottom: 4 },
  body: { fontSize: 13, color: "#666666", lineHeight: 20, marginBottom: 8 },
  rule: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 8,
  },
  bulletBlock: { marginBottom: 2 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5, paddingRight: 8 },
  bulletMark: { fontSize: 13, color: "#E15816", marginRight: 8, lineHeight: 20, width: 12 },
  bulletText: { flex: 1, fontSize: 13, color: "#666666", lineHeight: 20 },
});
